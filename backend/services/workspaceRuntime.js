// workspaceRuntime.js - runs long process
const { spawn, spawnSync } = require("child_process");

function containerExists(name) {
  const res = spawnSync("docker", ["inspect", name], { stdio: "ignore" });
  console.log('container exists: ', res.status === 0);
  return res.status === 0;
}

async function ensureWorkspaceContainer({ userId, projectId, image }) {
  const name = `workspace-${userId}-${projectId}`;

  if (containerExists(name)) return;

  const workspacePath = `/workspaces/${userId}/${projectId}`;

  spawn("docker", [
    "run",
    "-d",
    "--name", name,
    "--memory=2g",
    "--cpus=2",
    "--pids-limit=256",
    "--network=bridge",
    "-v", `${workspacePath}:/workspace`,
    "-w", "/workspace",
    image,
    "sleep", "infinity"
  ]);
}

module.exports = { ensureWorkspaceContainer };
