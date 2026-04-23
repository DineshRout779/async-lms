// runnerService.js — Container pool for exercise code execution
//
// Instead of spawning a new `docker run --rm` container per execution (3-8s cold
// start, unbounded concurrency), this module pre-warms a fixed pool of containers
// per language.  Each run:  acquire → docker cp files in → docker exec → cleanup → release.
// Cold start cost is paid once at server startup, not per student click.
'use strict';

const { spawn } = require('child_process');

const POOL_SIZE = parseInt(process.env.RUNNER_POOL_SIZE || '20', 10);

const LANGUAGE_PROFILES = {
  javascript: { image: 'workspace-node',   cmd: ['node',    'index.js']   },
  python:     { image: 'workspace-python', cmd: ['python3', 'main.py']    },
};

const TEST_CMDS = {
  javascript: ['node',    '__tests__.js'],
  python:     ['python3', '__tests__.py'],
};

// ── Low-level helpers ─────────────────────────────────────────────────────────

function spawnAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'ignore' });
    p.on('close', code => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args[0]} exited ${code}`))));
    p.on('error', reject);
  });
}

// Run a command inside a container and capture all output.
// Always resolves — never rejects — so the pool finally block always runs.
function execCapture(container, command, timeoutMs) {
  return new Promise((resolve) => {
    const p = spawn('docker', ['exec', container, ...command]);
    let out = '';
    let done = false;

    const finish = (output, exitCode) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ output, exitCode });
    };

    const timer = setTimeout(() => {
      p.kill();
      finish(out + '\n[Timed out]', -1);
    }, timeoutMs);

    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('close', code => finish(out, code ?? -1));
    p.on('error', err => finish(err.message, -1));
  });
}

// ── ContainerPool ─────────────────────────────────────────────────────────────

class ContainerPool {
  constructor(image, size) {
    this.image = image;
    this.size  = size;
    this.available = [];
    this.queue     = [];
  }

  // Pre-warm all containers in parallel at startup.
  async init() {
    await Promise.all(
      Array.from({ length: this.size }, (_, i) =>
        this._startContainer(`runner-${this.image}-${i}`)
      )
    );
    console.log(`[pool] ${this.image}: ${this.size} warm containers ready`);
  }

  async _startContainer(name) {
    // Remove stale container from a previous run, if any.
    await spawnAsync('docker', ['rm', '-f', name]).catch(() => {});
    const dockerArgs = [
      'run', '-d', '--name', name,
      '--memory=128m', '--memory-swap=128m', '--cpus=0.5',
      '--network=none', '--pids-limit=64'
    ];

    if (this.image === 'workspace-python') {
      dockerArgs.push('-e', 'PYTHONDONTWRITEBYTECODE=1');
    } else if (this.image === 'workspace-java') {
      dockerArgs.push('-e', '_JAVA_OPTIONS=-Xmx128m -Xms64m');
    }

    dockerArgs.push(this.image, 'sleep', 'infinity');

    await spawnAsync('docker', dockerArgs);
    await spawnAsync('docker', ['exec', name, 'mkdir', '-p', '/workspace']);
    this.available.push(name);
  }

  _acquire() {
    if (this.available.length > 0) return Promise.resolve(this.available.pop());
    // No free container — queue the caller until one is released.
    return new Promise(resolve => this.queue.push(resolve));
  }

  _release(name) {
    const next = this.queue.shift();
    if (next) next(name); else this.available.push(name);
  }

  // Copy workspaceDir files into the container, exec the command, then reset.
  // The container is returned to the pool only after the workspace is cleaned,
  // so the next caller always gets a fresh environment.
  async run(workspaceDir, command, timeoutMs) {
    const container = await this._acquire();
    let result;
    try {
      // Copy user files into container's /workspace
      await spawnAsync('docker', ['cp', `${workspaceDir}/.`, `${container}:/workspace/`]);
      result = await execCapture(container, command, timeoutMs);
    } catch (err) {
      result = { output: err.message, exitCode: -1 };
    } finally {
      // Reset workspace in background; release container only after cleanup.
      spawnAsync('docker', ['exec', container, 'sh', '-c', 'rm -rf /workspace && mkdir /workspace'])
        .catch(() => {})
        .finally(() => this._release(container));
    }
    return result;
  }
}

// ── Pool registry — one pool per language, created at server startup ──────────

const pools = {};

async function initPools() {
  await Promise.all(
    Object.entries(LANGUAGE_PROFILES).map(([lang, { image }]) => {
      pools[lang] = new ContainerPool(image, POOL_SIZE);
      return pools[lang].init();
    })
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

// Run the student's main file and return { output, exitCode }.
function execute(workspaceDir, language) {
  const profile = LANGUAGE_PROFILES[language] ?? LANGUAGE_PROFILES.javascript;
  const pool    = pools[language]             ?? pools.javascript;
  return pool.run(workspaceDir, profile.cmd, 10000);
}

// Run the pre-written test file and return raw { output, exitCode }.
// Caller is responsible for writing __tests__.js / __tests__.py first.
function executeTests(workspaceDir, language) {
  const pool = pools[language] ?? pools.javascript;
  const cmd  = TEST_CMDS[language] ?? TEST_CMDS.javascript;
  return pool.run(workspaceDir, cmd, 15000);
}

module.exports = { initPools, execute, executeTests };
