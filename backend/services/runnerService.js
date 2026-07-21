// runnerService.js — Container pool for exercise code execution (Hybrid Mode)
//
// Supports two execution modes via EXECUTION_MODE environment variable:
// 'docker' (default): Pre-warms a fixed pool of containers. Low latency, requires host Docker daemon.
// 'native': Executes code directly on the host machine using child_process. Less secure, but works on Render.
'use strict';

const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');

const EXECUTION_MODE = process.env.EXECUTION_MODE || 'docker';

const POOL_SIZE     = parseInt(process.env.RUNNER_POOL_SIZE      || '20', 10);
const POOL_SIZE_JVM = parseInt(process.env.RUNNER_POOL_SIZE_JAVA || '5',  10);
const POOL_SIZE_SQL = parseInt(process.env.RUNNER_POOL_SIZE_SQL  || '5',  10);

const LANGUAGE_PROFILES = {
  javascript: { image: 'workspace-node',   cmd: ['node',    'index.js'],   poolSize: POOL_SIZE     },
  python:     { image: 'workspace-python', cmd: ['python3', 'main.py'],    poolSize: POOL_SIZE     },
  java:       { image: 'workspace-java',   cmd: ['sh', '-c', 'cd /workspace && javac Main.java 2>&1 && java -cp /workspace Main'], poolSize: POOL_SIZE_JVM },
  sql:        { image: 'workspace-sql',    cmd: ['sh', '-c', 'sqlite3 -column -header :memory: < /workspace/solution.sql'],        poolSize: POOL_SIZE_SQL },
};

const TEST_CMDS = {
  javascript: ['node',    '__tests__.js'],
  python:     ['python3', '__tests__.py'],
  java:       ['sh', '-c', 'cd /workspace && javac Main.java __Tests__.java 2>&1 && java -cp /workspace __Tests__'],
  // SQL test execution is not supported — exercises should use run-only mode
};

// ── Low-level helpers ─────────────────────────────────────────────────────────

function spawnAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    let errOut = '';
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    if (p.stderr) p.stderr.on('data', d => { errOut += d.toString(); });
    p.on('close', code => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args[0]} exited ${code}. Error: ${errOut.trim()}`))));
    p.on('error', reject);
  });
}

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

// ── Native Execution Mode (Staging Fallback) ──────────────────────────────────

async function executeNative(workspaceDir, language, isTest = false) {
  try {
    let cmd = [];
    if (language === 'javascript') {
      cmd = ['node', isTest ? '__tests__.js' : 'index.js'];
    } else if (language === 'python') {
      // Use python3 if available, otherwise just python
      cmd = ['python3', isTest ? '__tests__.py' : 'main.py'];
    } else if (language === 'java') {
      if (isTest) {
        cmd = ['sh', '-c', `javac Main.java __Tests__.java 2>&1 && java -cp . __Tests__`];
      } else {
        cmd = ['sh', '-c', `javac Main.java 2>&1 && java -cp . Main`];
      }
    } else if (language === 'sql') {
      cmd = ['sh', '-c', `sqlite3 -column -header :memory: < solution.sql`];
    } else {
      return { output: `Unsupported language for native execution: ${language}`, exitCode: -1 };
    }

    return new Promise((resolve) => {
      const p = spawn(cmd[0], cmd.slice(1), { cwd: workspaceDir });
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
      }, 15000);

      p.stdout.on('data', d => { out += d; });
      p.stderr.on('data', d => { out += d; });
      p.on('close', code => finish(out, code ?? -1));
      
      // Fallback for missing commands (like python3 or javac)
      p.on('error', err => {
        if (err.code === 'ENOENT') {
           finish(`Command not found: ${cmd[0]}. Please ensure ${cmd[0]} is installed on this host environment.`, -1);
        } else {
           finish(err.message, -1);
        }
      });
    });
  } catch (error) {
    return { output: `Execution Engine Error: ${error.message}`, exitCode: -1 };
  }
}

// ── ContainerPool (Docker Mode) ───────────────────────────────────────────────

class ContainerPool {
  constructor(image, size) {
    this.image = image;
    this.size  = size;
    this.available = [];
    this.queue     = [];
  }

  async init() {
    await Promise.all(
      Array.from({ length: this.size }, (_, i) =>
        this._startContainer(`runner-${this.image}-${i}`)
      )
    );
    console.log(`[pool] ${this.image}: ${this.size} warm containers ready`);
  }

  async _startContainer(name) {
    await spawnAsync('docker', ['rm', '-f', name]).catch(() => {});
    const dockerArgs = [
      'run', '-d', '--name', name,
      '--memory=256m', '--cpus=0.5',
      '--network=none'
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
    return new Promise(resolve => this.queue.push(resolve));
  }

  _release(name) {
    const next = this.queue.shift();
    if (next) next(name); else this.available.push(name);
  }

  async run(workspaceDir, command, timeoutMs) {
    const container = await this._acquire();
    let result;
    try {
      await spawnAsync('docker', ['cp', `${workspaceDir}/.`, `${container}:/workspace/`]);
      result = await execCapture(container, command, timeoutMs);
    } catch (err) {
      result = { output: err.message, exitCode: -1 };
    } finally {
      spawnAsync('docker', ['exec', container, 'sh', '-c', 'rm -rf /workspace && mkdir /workspace'])
        .catch(() => {})
        .finally(() => this._release(container));
    }
    return result;
  }
}

// ── Pool registry ─────────────────────────────────────────────────────────────

const pools = {};

async function initPools() {
  if (EXECUTION_MODE === 'api' || EXECUTION_MODE === 'native') {
    console.log(`[pool] Running in ${EXECUTION_MODE.toUpperCase()} Mode. Skipping Docker container pool initialization.`);
    return;
  }

  try {
    // Check if docker is available to prevent infinite hang on render if ENV is misconfigured
    await spawnAsync('docker', ['--version']);
  } catch (e) {
    console.error('[pool] FATAL: Docker is not available on this host. If you are on Render, set EXECUTION_MODE=native in your Environment Variables.');
    return;
  }

  await Promise.all(
    Object.entries(LANGUAGE_PROFILES).map(([lang, { image, poolSize }]) => {
      pools[lang] = new ContainerPool(image, poolSize);
      return pools[lang].init();
    })
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

function execute(workspaceDir, language) {
  if (EXECUTION_MODE === 'api' || EXECUTION_MODE === 'native') {
    return executeNative(workspaceDir, language, false);
  }

  const pool = pools[language] ?? pools.javascript;
  if (!pool) return Promise.resolve({ output: 'Code execution is unavailable (runner not initialised).', exitCode: -1 });
  const profile = LANGUAGE_PROFILES[language] ?? LANGUAGE_PROFILES.javascript;
  return pool.run(workspaceDir, profile.cmd, 15000);
}

function executeTests(workspaceDir, language) {
  if (EXECUTION_MODE === 'api' || EXECUTION_MODE === 'native') {
    return executeNative(workspaceDir, language, true);
  }

  const cmd = TEST_CMDS[language];
  if (!cmd) return null;
  const pool = pools[language] ?? pools.javascript;
  if (!pool) return Promise.resolve({ output: 'Test execution is unavailable (runner not initialised).', exitCode: -1 });
  return pool.run(workspaceDir, cmd, 20000);
}

module.exports = { initPools, execute, executeTests };
