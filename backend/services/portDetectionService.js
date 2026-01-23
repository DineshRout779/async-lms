// services/portDetectionService.js

// Matches:
// http://localhost:5173
// http://0.0.0.0:5173/
// http://172.17.0.2:5173
// localhost:3000
const PORT_REGEX =
  /(?:https?:\/\/)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0|[\d.]+):(\d{2,5})/g;

function extractPortsFromOutput(output) {
  console.log('output:', output);
  const ports = new Set();
  let match;

  while ((match = PORT_REGEX.exec(output))) {
    const port = Number(match[1]);
    if (port >= 1024 && port <= 65535) {
      ports.add(port);
    }
  }

  return [...ports].map((port) => ({ port }));
}

module.exports = { extractPortsFromOutput };
