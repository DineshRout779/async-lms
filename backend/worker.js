// worker.js — Standalone worker node entry point.
// Deploy this on separate EC2 instances (worker nodes).
// It runs Docker containers, PTY terminals, file API, and preview proxy.
// On startup it registers with the API server (orchestrator).
//
// Required env vars:
//   WORKER_PORT        — port to listen on (default: 4000)
//   WORKER_ID          — unique name for this node (default: hostname)
//   WORKER_URL         — publicly reachable URL of this worker, e.g. http://worker1.yourdomain.com:4000
//   WORKER_CAPACITY    — max concurrent workspaces (default: 20)
//   ORCHESTRATOR_URL   — base URL of the API server, e.g. http://api.yourdomain.com:3001
//   JWT_SECRET         — same secret as API server (for token verification)

require('dotenv').config();
const express = require('express');
const http = require('http');
const net = require('net');
const cors = require('cors');
const compression = require('compression');
const { Server } = require('socket.io');
const axios = require('axios');
const os = require('os');

const setupSocket = require('./services/socketService');
const { getContainerIP } = require('./services/dockerService');
const { startProxy } = require('./services/previewProxyService');

const WORKER_PORT     = parseInt(process.env.WORKER_PORT || '4000', 10);
const WORKER_ID       = process.env.WORKER_ID || os.hostname();
const WORKER_URL      = process.env.WORKER_URL;
const WORKER_CAPACITY = parseInt(process.env.WORKER_CAPACITY || '20', 10);
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL;

// ── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.use(compression());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()}: ${req.method} ${req.originalUrl}`);
  next();
});

// Health check — used by orchestrator to verify liveness
app.get('/health', (req, res) =>
  res.json({ status: 'ok', id: WORKER_ID, capacity: WORKER_CAPACITY })
);

// Workspace file API — all operations scoped to this worker's local disk
app.use('/api/v1/workspace', require('./routes/workspace.route'));

// Preview proxy — path-based HTTP proxy for iframe preview
app.use('/api/v1/preview', require('./routes/preview.routes'));

app.use((req, res) =>
  res.status(404).json({ message: `Route ${req.originalUrl} not found` })
);

// ── Socket.io ────────────────────────────────────────────────────────────────

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
});

setupSocket(io);

// ── WebSocket proxy for Vite HMR (identical to API server index.js) ──────────

const PREVIEW_WS_RE = /^\/api\/v1\/preview\/([^/]+)\/([^/]+)\/(\d+)(.*)/;

server.on('upgrade', async (req, socket, head) => {
  const match = req.url.match(PREVIEW_WS_RE);
  if (!match) return;

  const [, userId, projectId, portStr, rest] = match;
  const port = parseInt(portStr, 10);
  const subPath = rest || '/';
  const containerName = `workspace-${userId}-${projectId}`;

  function doTunnel(host) {
    const upstream = net.connect(port, host);
    upstream.once('connect', () => {
      const hdrs = Object.entries({ ...req.headers, host: `localhost:${port}` })
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n');
      upstream.write(`GET ${subPath} HTTP/1.1\r\n${hdrs}\r\n\r\n`);
      if (head?.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    upstream.on('error', () => { if (!socket.destroyed) socket.destroy(); });
    socket.on('error', () => { if (!upstream.destroyed) upstream.destroy(); });
  }

  const local = net.connect(port, '127.0.0.1');
  let settled = false;

  local.once('connect', () => {
    settled = true;
    const hdrs = Object.entries({ ...req.headers, host: `localhost:${port}` })
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');
    local.write(`GET ${subPath} HTTP/1.1\r\n${hdrs}\r\n\r\n`);
    if (head?.length) local.write(head);
    local.pipe(socket);
    socket.pipe(local);
    socket.on('error', () => { if (!local.destroyed) local.destroy(); });
  });

  local.once('error', async () => {
    if (settled || socket.destroyed) return;
    settled = true;
    const ip = await getContainerIP(containerName).catch(() => null);
    if (!ip) { socket.destroy(); return; }
    doTunnel(ip);
  });

  local.setTimeout(1000, () => {
    if (!settled) {
      settled = true;
      local.destroy();
      getContainerIP(containerName)
        .then((ip) => { if (ip && !socket.destroyed) doTunnel(ip); else if (!socket.destroyed) socket.destroy(); })
        .catch(() => { if (!socket.destroyed) socket.destroy(); });
    }
  });
});

// ── Start + orchestrator registration ────────────────────────────────────────

server.listen(WORKER_PORT, () => {
  console.log(`[worker] ${WORKER_ID} listening on port ${WORKER_PORT}`);
  
  // Start the dynamic preview proxy (Task 3)
  startProxy();

  if (ORCHESTRATOR_URL && WORKER_URL) {
    registerWithOrchestrator();
  } else {
    console.log('[worker] ORCHESTRATOR_URL/WORKER_URL not set — standalone mode (no registration)');
  }

  // Warm up exercise runner pool after worker binds to port.
  // This shifts all pre-warmed pool containers to the Compute Instances.
  const { initPools } = require('./services/runnerService');
  initPools().catch(err => console.error('[pool] Failed to initialize runner pools:', err));
});

async function registerWithOrchestrator(retries = 0) {
  try {
    await axios.post(`${ORCHESTRATOR_URL}/api/v1/internal/workers/register`, {
      id: WORKER_ID,
      url: WORKER_URL,
      capacity: WORKER_CAPACITY,
    });
    console.log(`[worker] Registered with orchestrator at ${ORCHESTRATOR_URL}`);

    // Heartbeat every 30 s to stay in the registry
    setInterval(async () => {
      try {
        await axios.post(`${ORCHESTRATOR_URL}/api/v1/internal/workers/heartbeat`, {
          id: WORKER_ID,
          freeMemory: Math.round(os.freemem() / 1024 / 1024),
          totalMemory: Math.round(os.totalmem() / 1024 / 1024),
        });
      } catch { /* orchestrator temporarily unreachable — will retry next tick */ }
    }, 30_000);
  } catch (err) {
    const delay = Math.min(10_000 * (retries + 1), 60_000);
    console.error(`[worker] Registration failed (attempt ${retries + 1}): ${err.message} — retrying in ${delay / 1000}s`);
    setTimeout(() => registerWithOrchestrator(retries + 1), delay);
  }
}
