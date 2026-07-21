// runnerService.js — Container pool for exercise code execution (Hybrid Mode)
//
// Supports two execution modes via EXECUTION_MODE environment variable:
// 'docker' (default): Pre-warms a fixed pool of containers. Low latency, requires host Docker daemon.
// 'api': Uses the Piston execution API. Higher latency, zero infrastructure required (works on Render).
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

// ── API Execution Mode (Piston API) ───────────────────────────────────────────

async function executeWithAPI(workspaceDir, language, isTest = false) {
  try {
    const filesInDir = await fs.readdir(workspaceDir);
    const files = [];
    
    for (const file of filesInDir) {
       const stat = await fs.stat(path.join(workspaceDir, file));
       if (stat.isFile()) {
           const content = await fs.readFile(path.join(workspaceDir, file), 'utf-8');
           files.push({ name: file, content });
       }
    }
    
    const langMap = {
      javascript: 'javascript',
      python: 'python',
      java: 'java',
      sql: 'sqlite3'
    };
    const pistonLang = langMap[language] || 'javascript';

    // Figure out the main file to run for piston
    let mainFile = '';
    if (isTest) {
      if (language === 'javascript') mainFile = '__tests__.js';
      if (language === 'python') mainFile = '__tests__.py';
      if (language === 'java') mainFile = '__Tests__.java';
    } else {
      if (language === 'javascript') mainFile = 'index.js';
      if (language === 'python') mainFile = 'main.py';
      if (language === 'java') mainFile = 'Main.java';
      if (language === 'sql') mainFile = 'solution.sql';
    }

    // Move the main file to the front of the array for Piston
    const mainFileIdx = files.findIndex(f => f.name === mainFile);
    if (mainFileIdx > 0) {
      const temp = files[0];
      files[0] = files[mainFileIdx];
      files[mainFileIdx] = temp;
    }

    const payload = {
      language: pistonLang,
      version: '*',
      files: files
    };

    // Note: Node 18+ has built-in global fetch
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (result.message) {
      return { output: `API Error: ${result.message}`, exitCode: -1 };
    }

    return {
      output: result.run.output || '',
      exitCode: result.run.code
    };
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
  if (EXECUTION_MODE === 'api') {
    console.log('[pool] Running in API Mode. Skipping Docker container pool initialization.');
    return;
  }

  try {
    // Check if docker is available to prevent infinite hang on render if ENV is misconfigured
    await spawnAsync('docker', ['--version']);
  } catch (e) {
    console.error('[pool] FATAL: Docker is not available on this host. If you are on Render, set EXECUTION_MODE=api in your Environment Variables.');
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
  if (EXECUTION_MODE === 'api') {
    return executeWithAPI(workspaceDir, language, false);
  }

  const pool = pools[language] ?? pools.javascript;
  if (!pool) return Promise.resolve({ output: 'Code execution is unavailable (runner not initialised).', exitCode: -1 });
  const profile = LANGUAGE_PROFILES[language] ?? LANGUAGE_PROFILES.javascript;
  return pool.run(workspaceDir, profile.cmd, 15000);
}

function executeTests(workspaceDir, language) {
  if (EXECUTION_MODE === 'api') {
    return executeWithAPI(workspaceDir, language, true);
  }

  const cmd = TEST_CMDS[language];
  if (!cmd) return null;
  const pool = pools[language] ?? pools.javascript;
  if (!pool) return Promise.resolve({ output: 'Test execution is unavailable (runner not initialised).', exitCode: -1 });
  return pool.run(workspaceDir, cmd, 20000);
}

module.exports = { initPools, execute, executeTests };
