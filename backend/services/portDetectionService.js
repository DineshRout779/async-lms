// services/portDetectionService.js

// Matches:
// http://localhost:5173
// http://0.0.0.0:5173/
// http://172.17.0.2:5173
// localhost:3000
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;

function extractPortsFromOutput(output) {
  // Strip ANSI escape codes so they don't fragment URL matches
  const clean = output.replace(ANSI_REGEX, '');

  // Create a fresh regex each call to avoid stale lastIndex (global flag)
  const PORT_REGEX =
    /(?:https?:\/\/)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0|[\d.]+):(\d{2,5})/g;

  const ports = new Set();
  let match;

  while ((match = PORT_REGEX.exec(clean))) {
    const port = Number(match[1]);
    if (port >= 1024 && port <= 65535) {
      ports.add(port);
    }
  }

  return [...ports].map((port) => ({ port }));
}

module.exports = { extractPortsFromOutput };
