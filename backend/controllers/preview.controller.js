// preview.controller.js
//
// Fallback HTTP proxy used when nginx preview routing is disabled (local dev).
// In production with NGINX_PREVIEW=true, the browser iframe points directly
// at the nginx-managed subdomain and this controller is never called for
// those workspaces.
//
// Two strategies, tried in order:
//   A) Direct HTTP to Docker bridge IP   — works on Linux / WSL2
//   B) docker exec curl inside container — works everywhere (Windows Git Bash)
//
// URL rewriting is still required here because we are path-based:
// the iframe is at /api/v1/preview/.../port/ so absolute paths like
// /@vite/client would resolve against localhost:3001 without rewriting.

const http = require('http');
const { spawn } = require('child_process');
const { getContainerIP } = require('../services/dockerService');
const { hasPortProxy } = require('../services/portProxyService');

const DROP_HEADERS = new Set(['x-frame-options', 'content-security-policy']);
const TEXT_TYPES   = ['text/html', 'application/javascript', 'text/javascript', 'text/css'];

function rewritePaths(body, proxyBase) {
  return body.replace(/([`"'])(\/)(?!\/)/g, `$1${proxyBase}/`);
}

function sendProxied(res, status, headers, rawBody, shouldRewrite, proxyBase) {
  delete headers['content-length'];
  res.writeHead(status, headers);
  res.end(shouldRewrite ? rewritePaths(rawBody.toString('utf8'), proxyBase) : rawBody);
}

// ─── Strategy A: direct HTTP to Docker bridge IP ────────────────────────────
function proxyDirect(ip, port, req, res, proxyBase) {
  const subPath = req.path || '/';
  const qs = req.url.includes('?') ? `?${req.url.split('?').slice(1).join('?')}` : '';

  return new Promise((resolve, reject) => {
    const upstream = http.request(
      { hostname: ip, port: parseInt(port, 10), path: subPath + qs,
        method: req.method, headers: { ...req.headers, host: `localhost:${port}` } },
      (upstreamRes) => {
        upstream.setTimeout(0); // cancel the connect timeout once we're talking
        const headers = {};
        for (const [k, v] of Object.entries(upstreamRes.headers)) {
          if (!DROP_HEADERS.has(k.toLowerCase())) headers[k] = v;
        }
        const isHtml = (headers['content-type'] || '').includes('text/html');
        const isText = TEXT_TYPES.some((t) => (headers['content-type'] || '').includes(t));

        if (!isText) {
          delete headers['content-length'];
          res.writeHead(upstreamRes.statusCode, headers);
          upstreamRes.pipe(res);
          resolve();
          return;
        }
        const chunks = [];
        upstreamRes.on('data', (c) => chunks.push(c));
        upstreamRes.on('end', () => {
          sendProxied(res, upstreamRes.statusCode, headers, Buffer.concat(chunks), isHtml, proxyBase);
          resolve();
        });
      }
    );
    upstream.on('error', reject);
    // Fail fast on Windows where bridge IP is unreachable (connection just hangs)
    upstream.setTimeout(3000, () => upstream.destroy(new Error('upstream timeout')));
    req.pipe(upstream);
  });
}

// ─── Strategy B: docker exec curl (Windows Docker Desktop fallback) ──────────
function proxyCurl(containerName, port, req, res, proxyBase) {
  // req.url includes query string; req.path does not
  const subPath = req.url || '/';
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [
      'exec', containerName, 'curl', '-s', '-i', '-L', '--max-time', '10',
      `http://localhost:${port}${subPath}`,
    ]);
    const chunks = [];
    child.stdout.on('data', (c) => chunks.push(c));
    child.stdout.on('end', () => {
      const raw = Buffer.concat(chunks).toString('binary');
      let sep = raw.indexOf('\r\n\r\n'), sepLen = 4;
      if (sep === -1) { sep = raw.indexOf('\n\n'); sepLen = 2; }
      if (sep === -1) return reject(new Error('no header separator in curl output'));

      const lines = raw.slice(0, sep).split(/\r?\n/);
      const statusMatch = lines[0].match(/HTTP\/\S+\s+(\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 200;
      const headers = {};
      for (const line of lines.slice(1)) {
        const ci = line.indexOf(': ');
        if (ci === -1) continue;
        const k = line.slice(0, ci).toLowerCase();
        if (!DROP_HEADERS.has(k)) headers[k] = line.slice(ci + 2);
      }
      const isHtml = (headers['content-type'] || '').includes('text/html');
      sendProxied(res, status, headers, Buffer.from(raw.slice(sep + sepLen), 'binary'), isHtml, proxyBase);
      resolve();
    });
    child.on('error', reject);
  });
}

// ─── Controller ──────────────────────────────────────────────────────────────
exports.previewController = async (req, res) => {
  const { userId, projectId, port } = req.params;
  const containerName = `workspace-${userId}-${projectId}`;
  const proxyBase = `/api/v1/preview/${userId}/${projectId}/${port}`;

  // 1. Port proxy running → use localhost (fast, works on Windows + Linux)
  if (hasPortProxy(containerName, parseInt(port, 10))) {
    try {
      await proxyDirect('127.0.0.1', port, req, res, proxyBase);
      return;
    } catch { /* fallthrough */ }
  }

  // 2. Docker bridge IP — works on Linux where bridge network is reachable
  const ip = await getContainerIP(containerName);
  if (ip) {
    try {
      await proxyDirect(ip, port, req, res, proxyBase);
      return;
    } catch { /* fallthrough to curl */ }
  }

  // 3. docker exec curl — last resort (slow but works anywhere)
  try {
    await proxyCurl(containerName, port, req, res, proxyBase);
  } catch {
    if (!res.headersSent) res.status(502).send('Preview not available');
  }
};
