const { spawn, spawnSync } = require('child_process');

function containerExists(name) {
  const res = spawnSync('docker', ['inspect', name], { stdio: 'ignore' });
  return res.status === 0;
}

function waitForContainer(name) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (containerExists(name)) {
        clearInterval(interval);
        resolve();
      }
    }, 500);
  });
}

async function ensureWorkspaceContainer({ userId, projectId, image }) {
  const name = `workspace-${userId}-${projectId}`;

  if (!containerExists(name)) {
    const workspacePath = `/workspaces/${userId}/${projectId}`;

    spawn('docker', [
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
    ]);
  }

  await waitForContainer(name);
}

module.exports = { ensureWorkspaceContainer };
