// runnerService.js - useful for one time execution (JS, Python, etc)
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/* ============================
   Profile Config
============================ */

const PROFILE_CONFIG = {
  javascript: {
    image: 'playground-node-runner',
    entry: 'index.js',
    command: ['node', 'index.js'],
  },
  python: {
    image: 'playground-python-runner',
    entry: 'main.py',
    command: ['python', 'main.py'],
  },
};

/* ============================
   Runner
============================ */

function runProgram({ userId, projectId, profile, files }) {
  return new Promise((resolve, reject) => {
    if (!userId || !projectId) {
      return reject(new Error('userId and projectId are required'));
    }

    const config = PROFILE_CONFIG[profile];

    if (!config) {
      return reject(new Error(`Unsupported profile: ${profile}`));
    }

    const workspace = `/workspaces/${userId}/${projectId}`;

    /* ============================
       Ensure Workspace Exists
    ============================ */

    fs.mkdirSync(workspace, { recursive: true });

    /* ============================
       Write Project Files
    ============================ */

    for (const file of files) {
      const filePath = path.join(workspace, file.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.content, 'utf-8');
    }

    /* ============================
       Docker Execution
    ============================ */

    const dockerArgs = [
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
    ];

    const docker = spawn('docker', dockerArgs);

    let stdout = '';
    let stderr = '';

    docker.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    docker.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    docker.on('error', (err) => {
      reject(err);
    });

    docker.on('close', (code) => {
      resolve({
        exitCode: code,
        stdout,
        stderr,
      });
    });
  });
}

module.exports = { runProgram };
