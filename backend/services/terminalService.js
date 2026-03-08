const pty = require('node-pty');
const { spawnSync } = require('child_process');

function containerExists(name) {
  const res = spawnSync('docker', ['inspect', name], { stdio: 'ignore' });
  return res.status === 0;
}

function createTerminal({ userId, projectId, cols = 80, rows = 24 }) {
  const name = `workspace-${userId}-${projectId}`;

  if (!containerExists(name)) {
    throw new Error(`Workspace container not running`);
  }

  console.log('Attaching terminal to container:', name);

  const shell = pty.spawn(
    'docker',
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
