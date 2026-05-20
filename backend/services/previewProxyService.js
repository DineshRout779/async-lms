// services/previewProxyService.js
//
// A high-performance, in-memory dynamic reverse proxy that replaces Nginx.
// Routes requests like `workspace-123-5173.preview.com` -> `172.17.0.5:5173`.
// No disk I/O, no Nginx reloads, zero latency.

const express = require('express');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PROXY_PORT = process.env.PROXY_PORT || 8080;
const DOMAIN = process.env.PREVIEW_DOMAIN || 'lvh.me';

// hostname -> { ip, port, containerName }
const routes = new Map();

const app = express();

const proxy = createProxyMiddleware({
  target: 'http://localhost', // dummy, overridden by router
  router: (req) => {
    const host = req.headers.host?.split(':')[0]; // remove port if present
    const target = routes.get(host);
    if (target) {
      console.log(`[proxy] Routing ${host} -> http://${target.ip}:${target.port}`);
      return `http://${target.ip}:${target.port}`;
    }
    return null;
  },
  ws: true,
  changeOrigin: true,
  logger: console,
  onProxyRes: (proxyRes, req, res) => {
    // Allow the preview to be embedded in your main site's iframe
    delete proxyRes.headers['x-frame-options'];
    delete proxyRes.headers['content-security-policy'];
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
  onError: (err, req, res) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    res.end('Bad Gateway: Workspace might still be starting or port is incorrect.');
  }
});

app.use(proxy);

const server = http.createServer(app);

// Handle WebSocket upgrades for HMR (Vite/Webpack)
server.on('upgrade', (req, socket, head) => {
  proxy.upgrade(req, socket, head);
});

/**
 * Register a new dynamic route.
 * @param {string} containerName - e.g. workspace-user1-proj1
 * @param {number} port - e.g. 5173
 * @param {string} ip - Docker bridge IP
 */
function registerRoute(containerName, ip, targetPort, urlPort = targetPort) {
  // Shorten the hostname if it's a long workspace name to stay under 63-char DNS limit
  let shortName = containerName;
  if (containerName.startsWith('workspace-')) {
    const parts = containerName.split('-');
    if (parts.length >= 3) {
      // workspace-id1-id2 -> workspace-id1(8)-id2(8)
      shortName = `workspace-${parts[1].substring(0, 8)}-${parts[2].substring(0, 8)}`;
    }
  }

  const hostname = `${shortName}-${urlPort}.${DOMAIN}`;
  routes.set(hostname, { ip, port: targetPort, containerName });
  console.log(`[proxy] Registered: ${hostname} -> ${ip}:${targetPort}`);
  return hostname;
}


/**
 * Unregister all routes for a container (called on stop/TTL).
 */
function unregisterRoutes(containerName) {
  let count = 0;
  for (const [hostname, target] of routes.entries()) {
    if (target.containerName === containerName) {
      routes.delete(hostname);
      count++;
    }
  }
  if (count > 0) console.log(`[proxy] Unregistered ${count} routes for ${containerName}`);
}

function startProxy() {
  server.listen(PROXY_PORT, () => {
    console.log(`[proxy] Dynamic Proxy listening on port ${PROXY_PORT} (Domain: *.${DOMAIN})`);
  });
}

function getPreviewUrl(containerName, port) {
  let shortName = containerName;
  if (containerName.startsWith('workspace-')) {
    const parts = containerName.split('-');
    if (parts.length >= 3) {
      shortName = `workspace-${parts[1].substring(0, 8)}-${parts[2].substring(0, 8)}`;
    }
  }
  const scheme = process.env.PROXY_SSL === 'true' ? 'https' : 'http';
  const portSuffix = (PROXY_PORT === '80' || PROXY_PORT === '443') ? '' : `:${PROXY_PORT}`;
  return `${scheme}://${shortName}-${port}.${DOMAIN}${portSuffix}`;
}

module.exports = {
  registerRoute,
  unregisterRoutes,
  startProxy,
  getPreviewUrl
};
