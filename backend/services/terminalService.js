// terminalService.js
const pty = require("node-pty");
const { spawnSync } = require("child_process");

function containerExists(name) {
  const res = spawnSync("docker", ["inspect", name], { stdio: "ignore" });
  console.log('container exists: ', res.status === 0);
  return res.status === 0;
}

function createTerminal({ userId, projectId }) {
  const name = `workspace-${userId}-${projectId}`;

  if (!containerExists(name)) {
    throw new Error("Workspace container not running");
  }

  return pty.spawn("docker", ["exec", "-it", name, "bash"], {
    name: "xterm-color",
    cols: 80,
    rows: 24,
    cwd: "/",
    env: process.env
  });
}

module.exports = { createTerminal };
