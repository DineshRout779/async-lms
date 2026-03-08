require('dotenv').config();
const express = require('express');
const http = require('http');
const net = require('net');
const cors = require('cors');
const { Server } = require('socket.io');
const setupSocket = require('./services/socketService');
const path = require('path');
const { getContainerIP } = require('./services/dockerService');
require('./config/pg');

const compression = require('compression');

const app = express();
app.use(compression());
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()}: ${req.method} - ${req.originalUrl}`,
  );
  next();
});

app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/users', require('./routes/user.routes'));
app.use('/api/v1/students', require('./routes/student.routes'));
app.use('/api/v1/editor', require('./routes/editor.routes'));
app.use('/api/v1/workspace', require('./routes/workspace.route'));
app.use('/api/v1/preview', require('./routes/preview.routes'));
app.use('/api/v1/onboarding', require('./routes/onboarding.routes'));
app.use('/api/v1/colleges', require('./routes/college.routes'));
app.use('/api/v1/subjects', require('./routes/subject.routes'));
app.use('/api/v1/admin', require('./routes/admin.routes'));
app.use('/api/v1/facilitator', require('./routes/facilitator.routes'));
app.use('/api/v1/assistant', require('./routes/assistant.routes'));
app.use('/api/v1/college-assignments', require('./routes/collegeAssignment.routes'));
app.use('/content', express.static(path.join(__dirname, 'data', 'content')));

//  404 Catch-all (Place this at the very bottom)
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

const io = new Server(server, {
  cors: { origin: '*' },
});

setupSocket(io);

// ── WebSocket proxy for preview HMR (Vite hot-reload) ──────────────────────
// Intercept WS upgrades for the path-based preview proxy and tunnel them to
// the running dev server inside the Docker container.
//
// Priority:
//   1. 127.0.0.1:PORT — portProxyService listens here; works instantly on
//      both Windows and Linux as long as the port was detected.
//   2. Bridge IP:PORT  — fallback for Linux where bridge IPs are reachable
//      and the portProxy wasn't started (e.g. port conflict on host).
//
// Previously the code always tried the bridge IP first and only fell back to
// 127.0.0.1 when getContainerIP returned null — but it always returns the
// bridge IP on Windows, making the fallback unreachable.
const PREVIEW_WS_RE = /^\/api\/v1\/preview\/([^/]+)\/([^/]+)\/(\d+)(.*)/;

server.on('upgrade', async (req, socket, head) => {
  const match = req.url.match(PREVIEW_WS_RE);
  if (!match) return; // not a preview WS — let socket.io handle it

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
    return upstream;
  }

  // 1. Try portProxy on localhost first (connects instantly when running)
  const local = net.connect(port, '127.0.0.1');
  let settled = false;

  local.once('connect', () => {
    settled = true;
    // Reuse the connected socket as the tunnel upstream
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
    // 2. Fall back to container bridge IP (Linux / direct network access)
    const ip = await getContainerIP(containerName).catch(() => null);
    if (!ip) { socket.destroy(); return; }
    doTunnel(ip);
  });

  // Short timeout so Windows doesn't hang if portProxy isn't up yet
  local.setTimeout(1000, () => {
    if (!settled) {
      settled = true;
      local.destroy();
      getContainerIP(containerName).then((ip) => {
        if (ip && !socket.destroyed) doTunnel(ip);
        else if (!socket.destroyed) socket.destroy();
      }).catch(() => { if (!socket.destroyed) socket.destroy(); });
    }
  });
});

server.listen(3001, () => {
  const ct = new Date().toLocaleTimeString();
  console.log('Backend running on http://localhost:3001', ct);
});
