const { spawnSync, spawn } = require('child_process');
const path = require('path');

// Async wrapper for one-shot docker commands (stop, rm, etc.)
function runDockerAsync(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('docker', args, { stdio: 'ignore' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`docker ${args[0]} exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

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

/**
 * Gracefully stop and remove a workspace container.
 * Safe to call even if the container doesn't exist.
 */
async function stopWorkspaceContainer(userId, projectId) {
  const name = `workspace-${userId}-${projectId}`;
  if (!containerExists(name)) return;

  try {
    // Give the container 5 s to stop cleanly, then SIGKILL
    await runDockerAsync(['stop', '--time=5', name]);
  } catch (err) {
    console.error(`[cleanup] docker stop ${name} failed:`, err.message);
  }

  try {
    await runDockerAsync(['rm', name]);
    console.log(`[cleanup] Container ${name} stopped and removed`);
  } catch (err) {
    console.error(`[cleanup] docker rm ${name} failed:`, err.message);
  }
}

module.exports = { ensureWorkspaceContainer, stopWorkspaceContainer };
