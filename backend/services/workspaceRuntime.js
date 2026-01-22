const { spawnSync } = require('child_process');
const path = require('path');

function containerExists(name) {
  const res = spawnSync('docker', ['inspect', name], { stdio: 'ignore' });
  return res.status === 0;
}

function waitForContainer(name) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (containerExists(name)) {
        clearInterval(interval);
        resolve();
      }
    }, 500);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Container startup timeout'));
    }, 15000);
  });
}

async function ensureWorkspaceContainer({ userId, projectId, image }) {
  const name = `workspace-${userId}-${projectId}`;

  if (!containerExists(name)) {
    const workspacePath = path.resolve(
      __dirname,
      '..',
      'workspaces',
      String(userId),
      String(projectId)
    );

    console.log('Starting container with workspace:', workspacePath);

    const result = spawnSync(
      'docker',
      [
        'run',
        '-d',
        '--name',
        name,
        '--memory=2g',
        '--cpus=2',
        '--pids-limit=256',
        '--network=bridge',
        '-v',
        `${workspacePath}:/workspace`,
        '-w',
        '/workspace',
        image,
        'sleep',
        'infinity',
      ],
      { stdio: 'inherit' }
    );

    if (result.status !== 0) {
      throw new Error('Docker failed to start container');
    }
  }

  await waitForContainer(name);
}

module.exports = { ensureWorkspaceContainer };
