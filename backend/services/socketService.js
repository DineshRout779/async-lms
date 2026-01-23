// socketService.js

const path = require('path');
const { ensureWorkspaceContainer } = require('./workspaceRuntime');
const { createTerminal } = require('./terminalService');
const { watchWorkspace, stopWatchWorkspace } = require('./workspaceWatcher');
const { extractPortsFromOutput } = require('./portDetectionService');

const terminals = new Map();
const activePorts = new Map(); // userId:projectId -> Set
const outputBuffers = new Map();

module.exports = function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.workspace = null;

    socket.on('workspace:start', async ({ userId, projectId, image }) => {
      try {
        socket.workspace = { userId, projectId };

        await ensureWorkspaceContainer({ userId, projectId, image });

        const workspacePath = path.join(
          __dirname,
          '..',
          'workspaces',
          String(userId),
          String(projectId)
        );

        watchWorkspace({
          userId,
          projectId,
          workspacePath,
          socket,
        });

        activePorts.set(`${userId}:${projectId}`, new Set());

        socket.emit('workspace:ready');
      } catch (error) {
        console.error(error);
        socket.emit('workspace:error', error.message);
      }
    });

    socket.on('terminal:start', () => {
      if (!socket.workspace) return;

      const { userId, projectId } = socket.workspace;
      const key = `${userId}:${projectId}`;

      const term = createTerminal({ userId, projectId });
      terminals.set(socket.id, term);

      term.onData((data) => {
        socket.emit('terminal:output', data);

        const key = `${userId}:${projectId}`;

        const prev = outputBuffers.get(key) || '';
        const combined = prev + data;

        // Keep buffer bounded (avoid memory leak)
        outputBuffers.set(key, combined.slice(-8000));

        const found = extractPortsFromOutput(combined);
        if (!found.length) return;

        const known = activePorts.get(key);
        let changed = false;

        for (const p of found) {
          if (!known.has(p.port)) {
            known.add(p.port);
            changed = true;
          }
        }

        if (changed) {
          socket.emit(
            'workspace:ports:update',
            [...known].map((port) => ({
              port,
              process: 'user-app',
            }))
          );
        }
      });
    });

    socket.on('terminal:input', (data) => {
      const term = terminals.get(socket.id);
      if (term) term.write(data);
    });

    socket.on('disconnect', () => {
      const term = terminals.get(socket.id);
      if (term) term.kill();

      terminals.delete(socket.id);

      if (socket.workspace) {
        stopWatchWorkspace(socket.workspace.userId, socket.workspace.projectId);
        activePorts.delete(
          `${socket.workspace.userId}:${socket.workspace.projectId}`
        );
      }
    });
  });
};
