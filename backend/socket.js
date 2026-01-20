const { runProgram } = require('./services/runnerService');
const {
  startWorkspaceContainer,
  ensureWorkspaceContainer,
} = require('./services/workspaceRuntime');
const { createTerminal } = require('./services/terminalService');

/* ============================
   Profile Execution Rules
============================ */

const PROFILE_RULES = {
  javascript: { timeout: 5000, maxOutput: 64 * 1024 },
  python: { timeout: 5000, maxOutput: 64 * 1024 },
  java: { timeout: 8000, maxOutput: 128 * 1024 },
  sql: { timeout: 5000, maxOutput: 64 * 1024 },
  mern: { timeout: null, maxOutput: 5 * 1024 * 1024 },
};

let terminals = new Map();

module.exports = function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    let currentProcess = null;
    let timeoutHandle = null;
    let startTime = 0;
    let outputBytes = 0;
    let currentProfile = null;

    socket.workspace = null; // bind session to workspace

    /* ============================
       Runner Helpers
    ============================ */

    const clearExecution = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      currentProcess = null;
      startTime = 0;
      outputBytes = 0;
      currentProfile = null;
    };

    const handleOutput = (type, data) => {
      if (!currentProcess) return;

      outputBytes += Buffer.byteLength(data);
      const rules = PROFILE_RULES[currentProfile];

      if (rules.maxOutput && outputBytes > rules.maxOutput) {
        currentProcess.kill('SIGKILL');

        socket.emit(
          'program:stderr',
          '\n[error] Output limit exceeded. Execution stopped.\n'
        );

        socket.emit('program:meta', {
          durationMs: Date.now() - startTime,
          reason: 'output_limit',
        });

        socket.emit('program:status', 'failed');
        clearExecution();
        return;
      }

      socket.emit(type, data);
    };

    /* ============================
       Runner Channel (JS/Python/Java/SQL)
    ============================ */

    socket.on('program:run', async ({ userId, projectId, profile, files }) => {
      try {
        if (!userId || !projectId || !profile) {
          throw new Error('userId, projectId and profile are required');
        }

        if (profile === 'mern') {
          throw new Error(
            'MERN profile must use workspace runtime, not runner'
          );
        }

        if (currentProcess) {
          currentProcess.kill('SIGKILL');
          clearExecution();
        }

        const rules = PROFILE_RULES[profile];
        if (!rules) {
          throw new Error(`Unsupported profile: ${profile}`);
        }

        currentProfile = profile;
        startTime = Date.now();
        outputBytes = 0;

        socket.emit('program:status', 'running');

        const proc = await runProgram({
          userId,
          projectId,
          profile,
          files,
        });

        currentProcess = proc;

        if (rules.timeout) {
          timeoutHandle = setTimeout(() => {
            if (currentProcess) {
              currentProcess.kill('SIGKILL');

              socket.emit('program:stderr', '\n[error] Execution timed out\n');

              socket.emit('program:meta', {
                durationMs: Date.now() - startTime,
                reason: 'timeout',
              });

              socket.emit('program:status', 'failed');
              clearExecution();
            }
          }, rules.timeout);
        }

        proc.stdout.on('data', (data) => {
          handleOutput('program:stdout', data.toString());
        });

        proc.stderr.on('data', (data) => {
          handleOutput('program:stderr', data.toString());
        });

        proc.on('close', (code) => {
          socket.emit('program:meta', {
            durationMs: Date.now() - startTime,
            exitCode: code,
            reason: 'finished',
          });

          socket.emit('program:status', 'finished');
          clearExecution();
        });
      } catch (err) {
        socket.emit('program:stderr', String(err) + '\n');
        socket.emit('program:meta', {
          durationMs: Date.now() - startTime,
          reason: 'failed',
        });
        socket.emit('program:status', 'failed');
        clearExecution();
      }
    });

    /* ============================
       Workspace Runtime (MERN)
    ============================ */

    socket.on('workspace:start', async ({ userId, projectId, profile }) => {
      try {
        if (profile !== 'mern') {
          throw new Error('workspace runtime is only for MERN profile');
        }

        socket.workspace = { userId, projectId };

        // idempotent startup
        await ensureWorkspaceContainer({ userId, projectId });

        socket.emit('workspace:ready');
      } catch (err) {
        socket.emit('workspace:error', String(err));
      }
    });

    socket.on('terminal:start', () => {
      try {
        if (!socket.workspace) {
          throw new Error('Workspace not attached to socket');
        }

        const { userId, projectId } = socket.workspace;

        const term = createTerminal({ userId, projectId });
        terminals.set(socket.id, term);

        term.onData((data) => {
          socket.emit('terminal:output', data);
        });
      } catch (err) {
        socket.emit('terminal:error', String(err));
      }
    });

    socket.on('terminal:input', (data) => {
      const term = terminals.get(socket.id);
      if (term) {
        term.write(data);
      }
    });

    socket.on('disconnect', () => {
      if (currentProcess) {
        currentProcess.kill('SIGKILL');
        clearExecution();
      }

      const term = terminals.get(socket.id);
      if (term) {
        term.kill();
        terminals.delete(socket.id);
      }
    });
  });
};
