const pty = require('node-pty');
const { spawnSync } = require('child_process');
const fs = require('fs');

const DOCKER_PATH = fs.existsSync('/usr/local/bin/docker')
  ? '/usr/local/bin/docker'
  : fs.existsSync('/opt/homebrew/bin/docker')
  ? '/opt/homebrew/bin/docker'
  : 'docker';

function containerExists(name) {
  const res = spawnSync('docker', ['inspect', name], { stdio: 'ignore' });
  return res.status === 0;
}

function createTerminal({ userId, projectId, cols = 80, rows = 24 }) {
  const name = `workspace-${userId}-${projectId}`;

  if (!containerExists(name)) {
    throw new Error(`Workspace container not running`);
  }

  const shell = pty.spawn(
    DOCKER_PATH,
    [
      'exec',
      '-it',
      '-u',
      'playground',
      '-w',
      '/workspace',
      name,
      'bash',
      '--login',
    ],
    {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: '/',
      env: {
        ...process.env,
        TERM: 'xterm-256color',
      },
    }
  );

  return shell;
}

module.exports = { createTerminal };
