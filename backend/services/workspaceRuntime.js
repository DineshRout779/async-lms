const { spawnSync, spawn } = require('child_process');
const path = require('path');

// Resource limits per profile — sized for worker nodes (t3.large)
const PROFILE_LIMITS = {
  mern:       { memory: '1g',   cpus: '1'    },
  javascript: { memory: '512m', cpus: '0.5'  },
  python:     { memory: '512m', cpus: '0.5'  },
  java:       { memory: '768m', cpus: '0.5'  },
  sql:        { memory: '256m', cpus: '0.25' },
  default:    { memory: '512m', cpus: '0.5'  },
};

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

// Async container existence check — does not block the event loop
function containerExistsAsync(name) {
  return new Promise((resolve) => {
    const proc = spawn('docker', ['inspect', '--format', '{{.State.Status}}', name], { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    proc.stdout.on('data', (d) => { out += d; });
    proc.on('close', (code) => resolve(code === 0 && out.trim() === 'running'));
    proc.on('error', () => resolve(false));
  });
}

// Sync version kept only for terminalService (PTY spawn path, already in sync context)
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

async function ensureWorkspaceContainer({ userId, projectId, image, profile }) {
  const name = `workspace-${userId}-${projectId}`;

  if (!(await containerExistsAsync(name))) {
    const workspacePath = path.resolve(
      __dirname,
      '..',
      'workspaces',
      String(userId),
      String(projectId)
    );

    const limits = PROFILE_LIMITS[profile] ?? PROFILE_LIMITS.default;
    console.log(`Starting container ${name} [${profile ?? 'default'}] memory=${limits.memory} cpus=${limits.cpus}`);

    await runDockerAsync([
      'run',
      '-d',
      '--name',
      name,
      `--memory=${limits.memory}`,
      `--cpus=${limits.cpus}`,
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
