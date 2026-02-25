// socketService.js

const path = require('path');
const { ensureWorkspaceContainer, stopWorkspaceContainer } = require('./workspaceRuntime');
const { createTerminal } = require('./terminalService');
const { watchWorkspace, stopWatchWorkspace } = require('./workspaceWatcher');
const { extractPortsFromOutput } = require('./portDetectionService');
const { getWorkspaceQuota, touchWorkspace } = require('./fileSystemService');

const terminals = new Map();
const activePorts = new Map();   // key `${userId}:${projectId}` → Set<number>
const outputBuffers = new Map(); // key → last 8 KB of terminal output

// ---------- Container TTL tracking ----------
// Tracks the last user activity (terminal:input or workspace:start) per workspace.
// Containers idle longer than CONTAINER_TTL_MS are stopped automatically.
const lastActivity = new Map(); // key → Date.now()

const CONTAINER_TTL_MS      = 30 * 60 * 1000; // 30 minutes of inactivity
const CLEANUP_INTERVAL_MS   =  5 * 60 * 1000; // check every 5 minutes

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of lastActivity.entries()) {
    if (now - ts > CONTAINER_TTL_MS) {
      const [userId, projectId] = key.split(':');
      console.log(`[ttl] Workspace ${key} idle >${CONTAINER_TTL_MS / 60000} min — stopping container`);
      stopWorkspaceContainer(userId, projectId)
        .then(() => lastActivity.delete(key))
        .catch((err) => console.error(`[ttl] cleanup failed for ${key}:`, err.message));
    }
  }
}, CLEANUP_INTERVAL_MS);

// Don't keep the process alive just for the cleanup timer
cleanupTimer.unref();

// ---------- Socket handler ----------
module.exports = function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.workspace = null;

    socket.on('workspace:start', async ({ userId, projectId, image }) => {
      try {
        // Quota check before spinning up the container
        const quota = getWorkspaceQuota(userId, projectId);
        if (quota.overQuota) {
          socket.emit('workspace:error', `Disk quota exceeded: ${quota.usedMB} MB used (limit: ${quota.limitMB} MB). Please delete files to continue.`);
          return;
        }

        socket.workspace = { userId, projectId };

        await ensureWorkspaceContainer({ userId, projectId, image });

        const workspacePath = path.join(
          __dirname,
          '..',
          'workspaces',
          String(userId),
          String(projectId)
        );

        watchWorkspace({ userId, projectId, workspacePath, socket });

        const key = `${userId}:${projectId}`;
        activePorts.set(key, new Set());
        lastActivity.set(key, Date.now()); // record startup as activity

        // Touch the accessed marker so the cleanup job won't remove this workspace
        touchWorkspace(userId, projectId);

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

        const prev = outputBuffers.get(key) || '';
        const combined = prev + data;

        // Keep buffer bounded
        outputBuffers.set(key, combined.slice(-8000));

        const found = extractPortsFromOutput(combined);
        if (!found.length) return;

        const known = activePorts.get(key);
        if (!known) return;

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
            [...known].map((port) => ({ port, process: 'user-app' }))
          );
        }
      });
    });

    socket.on('terminal:input', (data) => {
      const term = terminals.get(socket.id);
      if (term) term.write(data);

      // Treat any user input as activity (resets TTL clock)
      if (socket.workspace) {
        const key = `${socket.workspace.userId}:${socket.workspace.projectId}`;
        lastActivity.set(key, Date.now());
      }
    });

    socket.on('disconnect', () => {
      // 1. Kill the pty terminal
      const term = terminals.get(socket.id);
      if (term) term.kill();
      terminals.delete(socket.id);

      if (socket.workspace) {
        const { userId, projectId } = socket.workspace;
        const key = `${userId}:${projectId}`;

        // 2. Stop the file-system watcher
        stopWatchWorkspace(userId, projectId);

        // 3. Clean up in-memory maps
        activePorts.delete(key);
        outputBuffers.delete(key);
        lastActivity.delete(key);

        // 4. Stop and remove the Docker container (non-blocking)
        stopWorkspaceContainer(userId, projectId).catch((err) =>
          console.error(`[disconnect] container cleanup failed for ${key}:`, err.message)
        );
      }
    });
  });
};
