const { spawnSync, spawn } = require('child_process');
const path = require('path');

// Resource limits per profile
const PROFILE_LIMITS = {
  mern: { memory: '512m', cpus: '0.5' },
  javascript: { memory: '192m', cpus: '0.2' },
  python: { memory: '192m', cpus: '0.2' },
  java: { memory: '512m', cpus: '0.5' },
  sql: { memory: '192m', cpus: '0.2' },
  default: { memory: '192m', cpus: '0.2' },
};

// Async wrapper for one-shot docker commands (stop, rm, etc.)
// timeoutMs: if > 0, kills the process and rejects after that many ms.
function runDockerAsync(args, timeoutMs = 0) {
  return new Promise((resolve, reject) => {
    const proc = spawn('docker', args, { stdio: 'ignore' });
    let settled = false;

    const done = (err) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      err ? reject(err) : resolve();
    };

    const timer = timeoutMs > 0
      ? setTimeout(() => {
          try { proc.kill(); } catch (_) {}
          done(new Error(`docker ${args[0]} timed out after ${timeoutMs / 1000}s`));
        }, timeoutMs)
      : null;

    proc.on('close', (code) => {
      if (code === 0) done(null);
      else done(new Error(`docker ${args[0]} exited with code ${code}`));
    });
    proc.on('error', (err) => done(err));
  });
}

// Async container existence check — does not block the event loop
function containerExistsAsync(name) {
  return new Promise((resolve) => {
    const proc = spawn(
      'docker',
      ['inspect', '--format', '{{.State.Status}}', name],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );
    let out = '';
    proc.stdout.on('data', (d) => {
      out += d;
    });
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
    const interval = setInterval(async () => {
      if (await containerExistsAsync(name)) {
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
      String(projectId),
    );

    const limits = PROFILE_LIMITS[profile] ?? PROFILE_LIMITS.default;
    console.log(
      `Starting container ${name} [${profile ?? 'default'}] memory=${limits.memory} cpus=${limits.cpus}`,
    );

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
    ], 30_000); // 30s timeout — catches missing image, slow Docker Desktop, etc.
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
