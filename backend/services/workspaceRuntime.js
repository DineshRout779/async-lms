const { spawnSync, spawn } = require('child_process');
const path = require('path');

// Resource limits per profile
// const PROFILE_LIMITS = {
//   mern: { memory: '512m', cpus: '0.5' },
//   javascript: { memory: '192m', cpus: '0.2' },
//   python: { memory: '192m', cpus: '0.2' },
//   java: { memory: '512m', cpus: '0.5' },
//   sql: { memory: '192m', cpus: '0.2' },
//   default: { memory: '192m', cpus: '0.2' },
// };

const PROFILE_LIMITS = {
  mern: { memory: '256m', swap: '768m', cpus: '0.5' },
  javascript: { memory: '128m', cpus: '0.2' },
  python: { memory: '128m', cpus: '0.2', env: ['PYTHONDONTWRITEBYTECODE=1'] }, 
  java: { memory: '256m', cpus: '0.5', env: ['_JAVA_OPTIONS=-Xmx128m -Xms64m'] }, 
  sql: { memory: '128m', cpus: '0.2' },
  default: { memory: '128m', cpus: '0.2' },
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
    const fs = require('fs');
    const workspacePath = path.resolve(
      __dirname,
      '..',
      'workspaces',
      String(userId),
      String(projectId),
    );
    
    // CRITICAL: Create the directory as the ubuntu user BEFORE Docker tries to mount it.
    // If we let Docker mount a non-existent host path, Docker creates it as root,
    // which prevents the playground container user from writing to it!
    fs.mkdirSync(workspacePath, { recursive: true });

    const limits = PROFILE_LIMITS[profile] ?? PROFILE_LIMITS.default;
    const swap = limits.swap || limits.memory;

    console.log(
      `Starting container ${name} [${profile ?? 'default'}] memory=${limits.memory} swap=${swap} cpus=${limits.cpus}`,
    );

    const dockerArgs = [
      'run',
      '-d',
      '--name',
      name,
      `--memory=${limits.memory}`,
      `--memory-swap=${swap}`,
      `--cpus=${limits.cpus}`,
      '--pids-limit=256',
      '--network=bridge',
    ];

    if (limits.env) {
      limits.env.forEach(e => dockerArgs.push('-e', e));
    }

    dockerArgs.push(
      '-v',
      `${workspacePath}:/workspace`,
      '-w',
      '/workspace',
      image,
      'sleep',
      'infinity'
    );

    await runDockerAsync(dockerArgs);
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

function getProfileMemoryLimit(profile) {
  const limits = PROFILE_LIMITS[profile] ?? PROFILE_LIMITS.default;
  // Parse '256m' or '128m' into 256 or 128
  return parseInt(limits.memory, 10);
}

module.exports = { 
  ensureWorkspaceContainer, 
  stopWorkspaceContainer, 
  getProfileMemoryLimit,
  PROFILE_LIMITS 
};
