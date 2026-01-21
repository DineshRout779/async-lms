// runnerService.js - runs one-shot execution code
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PROFILE_CONFIG = {
  javascript: {
    image: "playground-node-runner",
    entry: "index.js",
    command: ["node", "index.js"]
  },
  python: {
    image: "playground-python-runner",
    entry: "main.py",
    command: ["python", "main.py"]
  }
};

function runProgram({ userId, projectId, profile, files }) {
  if (!userId || !projectId) {
    throw new Error("userId and projectId are required");
  }

  if (profile === "mern") {
    throw new Error("MERN must use workspace runtime, not runner");
  }

  const config = PROFILE_CONFIG[profile];
  if (!config) {
    throw new Error(`Unsupported profile: ${profile}`);
  }

  const workspace = `/workspaces/${userId}/${projectId}`;
  fs.mkdirSync(workspace, { recursive: true });

  // write files
  for (const file of files) {
    const filePath = path.join(workspace, file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, "utf-8");
  }

  const docker = spawn("docker", [
    "run",
    "--rm",
    "--memory=256m",
    "--cpus=0.5",
    "--network=none",
    "--pids-limit=64",
    "--read-only",
    "--tmpfs", "/tmp",
    "-v", `${workspace}:/workspace`,
    "-w", "/workspace",
    config.image,
    ...config.command
  ]);

  return docker; // return ChildProcess
}

module.exports = { runProgram };
