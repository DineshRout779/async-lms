const { runProgram } = require('./runnerService');
const { ensureWorkspaceContainer } = require('./workspaceRuntime');
const { createTerminal } = require('./terminalService');

const terminals = new Map();

module.exports = function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.workspace = null;

    socket.on('workspace:start', async ({ userId, projectId, image }) => {
      try {
        console.log('Workspace starting..', userId, projectId, image);

        socket.workspace = { userId, projectId };

        await ensureWorkspaceContainer({ userId, projectId, image });

        socket.emit('workspace:ready');
        console.log('Workspace ready..');
      } catch (error) {
        console.error('Workspace error:', error.message);
        socket.emit('workspace:error', error.message);
      }
    });

    socket.on('terminal:start', () => {
      if (!socket.workspace) {
        socket.emit('terminal:error', 'Workspace not started');
        return;
      }

      const { userId, projectId } = socket.workspace;
      const term = createTerminal({ userId, projectId });

      terminals.set(socket.id, term);

      // Stream output to client
      term.onData((data) => {
        socket.emit('terminal:output', data);
      });
    });

    // Receive keystrokes from client
    socket.on('terminal:input', (data) => {
      const term = terminals.get(socket.id);
      if (term) term.write(data);
    });

    socket.on('disconnect', () => {
      const term = terminals.get(socket.id);
      if (term) term.kill();
      terminals.delete(socket.id);
    });
  });
};
