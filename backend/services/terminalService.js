const pty = require('node-pty');

function createTerminal({ userId, projectId }) {
  const shell = process.platform === 'win32' ? 'bash' : 'bash';

  const term = pty.spawn(
    'docker',
    ['exec', '-it', `workspace-${userId}-${projectId}`, shell],
    {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: '/',
      env: process.env,
    }
  );

  return term;
}

module.exports = { createTerminal };
