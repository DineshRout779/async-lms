// runnerService.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const WORKSPACE_ROOT = path.join(__dirname, '..', 'workspaces');

const PROFILE_CONFIG = {
  javascript: {
    image: 'playground-workspace-node',
    command: ['node', 'index.js'],
  },
  python: {
    image: 'playground-workspace-python',
    command: ['python', 'main.py'],
  },
};

function runProgram({ userId, projectId, profile, files }) {
  if (!userId || !projectId) {
    throw new Error('userId and projectId are required');
  }

  const config = PROFILE_CONFIG[profile];
  if (!config) {
    throw new Error(`Unsupported profile: ${profile}`);
  }

  const workspace = path.join(
    WORKSPACE_ROOT,
    String(userId),
    String(projectId)
  );
  fs.mkdirSync(workspace, { recursive: true });

  for (const file of files) {
    const filePath = path.join(workspace, file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, 'utf-8');
  }

  console.log('Running with workspace:', workspace);
  console.log('Workspace files:', fs.readdirSync(workspace));

  return spawn('docker', [
    'run',
    '--rm',
    '--memory=256m',
    '--cpus=0.5',
    '--network=none',
    '--pids-limit=64',
    '--read-only',
    '--tmpfs',
    '/tmp',
    '-v',
    `${workspace}:/workspace`,
    '-w',
    '/workspace',
    config.image,
    ...config.command,
  ]);
}

module.exports = { runProgram };
