const { runProgram } = require('./docker');

const EXECUTION_TIMEOUT_MS = 5000;
const MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB

module.exports = function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    let currentProcess = null;
    let timeoutHandle = null;
    let startTime = 0;
    let outputBytes = 0;

    const clearExecution = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      currentProcess = null;
      startTime = 0;
      outputBytes = 0;
    };

    const handleOutput = (type, data) => {
      if (!currentProcess) return;

      outputBytes += Buffer.byteLength(data);

      if (outputBytes > MAX_OUTPUT_BYTES) {
        currentProcess.kill('SIGKILL');

        socket.emit(
          'program:stderr',
          '\n[error] Output limit exceeded (64 KB). Execution stopped.\n'
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

    socket.on('program:run', async ({ language, files }) => {
      try {
        if (currentProcess) {
          currentProcess.kill('SIGKILL');
          clearExecution();
        }

        startTime = Date.now();
        outputBytes = 0;

        socket.emit('program:status', 'running');

        const proc = await runProgram(language, files);
        currentProcess = proc;

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
        }, EXECUTION_TIMEOUT_MS);

        proc.stdout.on('data', (data) => {
          handleOutput('program:stdout', data.toString());
        });

        proc.stderr.on('data', (data) => {
          handleOutput('program:stderr', data.toString());
        });

        proc.on('close', () => {
          socket.emit('program:meta', {
            durationMs: Date.now() - startTime,
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

    socket.on('disconnect', () => {
      if (currentProcess) {
        currentProcess.kill('SIGKILL');
        clearExecution();
      }
    });
  });
};
