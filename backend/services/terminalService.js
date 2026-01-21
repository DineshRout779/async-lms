const pty = require('node-pty');
const { spawnSync } = require('child_process');

function containerExists(name) {
  const res = spawnSync('docker', ['inspect', name], { stdio: 'ignore' });
  return res.status === 0;
}

function createTerminal({ userId, projectId }) {
  const name = `workspace-${userId}-${projectId}`;

  if (!containerExists(name)) {
    console.log(`workspace container not running: `, name);
    throw new Error(`Workspace container not running`);
  }

  return pty.spawn(
    'docker',
    [
      'exec',
      '-it',
      '-u',
      'playground', // attach as playground user
      '-w',
      '/workspace', // start in workspace
      name,
      'bash',
      '--login', // load .bashrc
    ],
    {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: '/',
      env: process.env,
    }
  );
}

module.exports = { createTerminal };
