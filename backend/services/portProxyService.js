// services/portProxyService.js
//
// Creates host-side TCP relay servers so the browser (and our own WS upgrade
// handler in index.js) can reach container ports via localhost:PORT.
//
// Why this is needed on Windows Docker Desktop:
//   Container bridge IPs (172.17.x.x) are inside a Hyper-V / WSL2 VM and are
//   NOT reachable from the Windows host.  Without this service, the WS upgrade
//   proxy falls back to 127.0.0.1:PORT where nothing is listening → HMR fails.
//
// How it works:
//   1. When a port is detected (e.g. Vite on 5173), we open a TCP server on
//      127.0.0.1:5173 of the HOST.
//   2. Each inbound TCP connection spawns `docker exec -i <container> node -e
//      "relay"` which forwards stdin ↔ container's localhost:5173.
//   3. The host-side TCP server therefore acts as a transparent tunnel.
//
// This gives us:
//   • HTTP proxy (preview.controller.js) can hit 127.0.0.1:PORT instead of the
//     unreachable bridge IP — no docker exec curl needed per request.
//   • WebSocket / Vite HMR (index.js upgrade handler) can also reach
//     127.0.0.1:PORT → full hot-reload on Windows.
//
// On Linux the bridge IP is directly reachable, so this service provides a
// redundant path.  If a port is already bound on the host (multi-workspace
// conflict) the proxy logs a warning and skips that port gracefully.

const net = require('net');
const { spawn } = require('child_process');

// key: `${containerName}:${port}` → net.Server
const servers = new Map();

/**
 * Start a TCP relay for containerName:port on the host's 127.0.0.1:port.
 * Safe to call multiple times — skips if already running.
 */
function createPortProxy(containerName, port) {
  return new Promise((resolve, reject) => {
    const key = `${containerName}:${port}`;
    if (servers.has(key)) {
      return resolve(servers.get(key).address().port);
    }

    const server = net.createServer((socket) => {
      const relayScript = [
        `const net=require('net');`,
        `const c=net.connect(${port},'127.0.0.1',()=>{`,
        `  process.stdin.pipe(c,{end:false});`,
        `  c.pipe(process.stdout,{end:false});`,
        `});`,
        `c.on('error',()=>process.exit(1));`,
        `c.on('close',()=>process.exit(0));`,
        `process.stdin.on('end',()=>c.destroy());`,
      ].join('');

      const relay = spawn('docker', ['exec', '-i', containerName, 'node', '-e', relayScript]);

      socket.pipe(relay.stdin, { end: false });
      relay.stdout.pipe(socket, { end: false });

      const cleanup = () => {
        try { relay.kill(); } catch (_) {}
        try { socket.destroy(); } catch (_) {}
      };

      socket.on('error', cleanup);
      socket.on('close', cleanup);
      relay.on('exit', () => { try { socket.destroy(); } catch (_) {} });

      relay.stdin.on('error', () => {});
      relay.stdout.on('error', () => {});
      relay.stderr.on('data', () => {});
    });

    server.listen(0, '127.0.0.1', () => {
      const hostPort = server.address().port;
      console.log(`[portProxy] ${containerName} :${port} → localhost:${hostPort}`);
      servers.set(key, server);
      resolve(hostPort);
    });

    server.on('error', (err) => {
      console.warn(`[portProxy] proxy failed to bind: ${err.message}`);
      reject(err);
    });
  });
}


/**
 * Close all relay servers for a container (call on workspace disconnect).
 */
function destroyPortProxies(containerName) {
  for (const [key, server] of servers.entries()) {
    if (key.startsWith(`${containerName}:`)) {
      server.close();
      servers.delete(key);
      console.log(`[portProxy] removed ${key}`);
    }
  }
}

/**
 * Returns true if a relay is running for containerName:port.
 * Used by preview.controller.js to prefer localhost over bridge IP.
 */
function hasPortProxy(containerName, port) {
  return servers.has(`${containerName}:${port}`);
}

module.exports = { createPortProxy, destroyPortProxies, hasPortProxy };
