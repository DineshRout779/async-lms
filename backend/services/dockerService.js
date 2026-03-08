// services/dockerService.js
// Shared Docker utilities used by multiple services

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Cache bridge IPs — one docker inspect per container lifetime
const ipCache = new Map();

async function getContainerIP(containerName) {
  if (ipCache.has(containerName)) return ipCache.get(containerName);
  try {
    const { stdout } = await execAsync(
      `docker inspect --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" ${containerName}`
    );
    const ip = stdout.trim();
    if (ip) ipCache.set(containerName, ip);
    return ip || null;
  } catch {
    return null;
  }
}

function clearContainerIP(containerName) {
  ipCache.delete(containerName);
}

module.exports = { getContainerIP, clearContainerIP };
