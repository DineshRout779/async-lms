// socketService.js

const path = require('path');
const axios = require('axios');
const { pullWorkspace, pushWorkspace } = require('./s3SyncService');
const { ensureWorkspaceContainer, stopWorkspaceContainer } = require('./workspaceRuntime');
const { createTerminal } = require('./terminalService');
const { watchWorkspace, stopWatchWorkspace } = require('./workspaceWatcher');
const { extractPortsFromOutput } = require('./portDetectionService');
const { getWorkspaceQuota, touchWorkspace } = require('./fileSystemService');
const { getContainerIP, clearContainerIP } = require('./dockerService');
const { ENABLED: nginxEnabled, addPreviewRoute, removePreviewRoutes, getPreviewUrl } = require('./nginxPreviewService');
const { createPortProxy, destroyPortProxies } = require('./portProxyService');

const terminals = new Map();          // socketId → PTY
const activePorts = new Map();        // `${userId}:${projectId}` → Set<number>
const outputBuffers = new Map();      // key → last 8 KB of terminal output

// ---------- Container TTL tracking ----------
// Containers idle for CONTAINER_TTL_MS are stopped automatically.
// On disconnect we do NOT stop the container — the TTL handles it.
// This allows the browser to refresh / reconnect without losing the session.
const lastActivity = new Map();       // key → Date.now()

const CONTAINER_TTL_MS    =  5 * 60 * 1000; // 5 minutes of inactivity
const CLEANUP_INTERVAL_MS =  5 * 60 * 1000; // check every 5 minutes

// ---------- Capacity & queue ----------
// Hard cap on concurrent live workspace containers.
// Adjust MAX_WORKSPACES env var to match available RAM on the host.
const MAX_CONCURRENT_WORKSPACES = parseInt(process.env.MAX_WORKSPACES || '10', 10);
// Array of waiting requests: { socketId, socket, userId, projectId, image, profile }
const workspaceQueue = [];

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of lastActivity.entries()) {
    if (now - ts > CONTAINER_TTL_MS) {
      const [userId, projectId] = key.split(':');
      console.log(`[ttl] Workspace ${key} idle >${CONTAINER_TTL_MS / 60000} min — stopping`);
      const cname = `workspace-${userId}-${projectId}`;

      // Full teardown
      clearContainerIP(cname);
      removePreviewRoutes(cname);
      destroyPortProxies(cname);
      activePorts.delete(key);
      outputBuffers.delete(key);
      lastActivity.delete(key);

      // Slot freed — promote next queued user immediately (before async teardown)
      promoteFromQueue();

      // Push files to S3, stop container, then notify orchestrator to release capacity
      pushWorkspace(userId, projectId)
        .catch((err) => console.error(`[ttl] s3 push failed for ${key}:`, err.message))
        .finally(() =>
          stopWorkspaceContainer(userId, projectId)
            .catch((err) => console.error(`[ttl] cleanup failed for ${key}:`, err.message))
            .finally(() => {
              if (process.env.ORCHESTRATOR_URL) {
                axios
                  .post(`${process.env.ORCHESTRATOR_URL}/api/v1/internal/workers/release`, {
                    userId,
                    projectId,
                  })
                  .catch((err) =>
                    console.error(`[ttl] release notify failed for ${key}:`, err.message)
                  );
              }
            })
        );
    }
  }
}, CLEANUP_INTERVAL_MS);

cleanupTimer.unref();

// ---------- Workspace start helper & queue ----------

async function startWorkspace(socket, { userId, projectId, image, profile }) {
  try {
    socket.workspace = { userId, projectId };
    const key = `${userId}:${projectId}`;

    const knownPorts = activePorts.get(key);
    if (knownPorts?.size > 0) {
      socket.emit(
        'workspace:ports:update',
        [...knownPorts].map((port) => ({ port, process: 'user-app', url: null }))
      );
    }

    socket.emit('workspace:status', { message: 'Starting container…' });

    await pullWorkspace(userId, projectId);
    await ensureWorkspaceContainer({ userId, projectId, image, profile });

    const workspacePath = path.join(
      __dirname, '..', 'workspaces', String(userId), String(projectId)
    );

    watchWorkspace({ userId, projectId, workspacePath, socket });

    if (!activePorts.has(key)) activePorts.set(key, new Set());
    lastActivity.set(key, Date.now());
    touchWorkspace(userId, projectId);

    socket.emit('workspace:ready');
  } catch (error) {
    console.error('[workspace:start]', error);
    socket.emit('workspace:error', error.message);
    // Release the slot so the queue can advance
    promoteFromQueue();
  }
}

function promoteFromQueue() {
  // Skip any entries whose socket has already disconnected
  while (workspaceQueue.length) {
    const next = workspaceQueue.shift();
    if (next.socket.disconnected) continue;

    // Notify remaining queue members of their new positions
    workspaceQueue.forEach((item, i) => {
      item.socket.emit('workspace:queued', { position: i + 1, total: workspaceQueue.length });
    });

    console.log(`[queue] Promoting ${next.userId}:${next.projectId} — ${workspaceQueue.length} still waiting`);
    startWorkspace(next.socket, next);
    return;
  }
}

// ---------- Socket handler ----------
module.exports = function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.workspace = null;

    socket.on('workspace:start', async ({ userId, projectId, image, profile }) => {
      // Quota check before anything else
      const quota = getWorkspaceQuota(userId, projectId);
      if (quota.overQuota) {
        socket.emit('workspace:error', `Disk quota exceeded: ${quota.usedMB} MB used (limit: ${quota.limitMB} MB). Please delete files to continue.`);
        return;
      }

      const key = `${userId}:${projectId}`;

      // Reconnecting users already have a running container — skip the queue
      const isReconnect = lastActivity.has(key);

      if (!isReconnect && lastActivity.size >= MAX_CONCURRENT_WORKSPACES) {
        // Server at capacity — enqueue, or update position if already waiting
        let idx = workspaceQueue.findIndex(q => q.userId === userId && q.projectId === projectId);
        if (idx === -1) {
          workspaceQueue.push({ socketId: socket.id, socket, userId, projectId, image, profile });
          idx = workspaceQueue.length - 1;
        } else {
          // Update the socket ref in case user reconnected while queued
          workspaceQueue[idx].socket = socket;
          workspaceQueue[idx].socketId = socket.id;
        }
        socket.emit('workspace:queued', { position: idx + 1, total: workspaceQueue.length });
        console.log(`[queue] ${key} queued at position ${idx + 1}/${workspaceQueue.length} (active: ${lastActivity.size})`);
        return;
      }

      await startWorkspace(socket, { userId, projectId, image, profile });
    });

    socket.on('terminal:start', ({ cols, rows } = {}) => {
      if (!socket.workspace) return;

      const { userId, projectId } = socket.workspace;
      const key = `${userId}:${projectId}`;

      // Kill any stale PTY for this socket
      const stale = terminals.get(socket.id);
      if (stale) {
        try { stale.kill(); } catch (_) {}
        terminals.delete(socket.id);
      }

      let term;
      try {
        term = createTerminal({ userId, projectId, cols, rows });
      } catch (err) {
        console.error(`[terminal:start] ${key}: ${err.message}`);
        socket.emit('terminal:error', err.message);
        return;
      }
      terminals.set(socket.id, term);

      // Keep onData synchronous — node-pty does not support async callbacks.
      term.onData((data) => {
        socket.emit('terminal:output', data);

        const prev = outputBuffers.get(key) || '';
        const combined = prev + data;
        outputBuffers.set(key, combined.slice(-8000));

        const found = extractPortsFromOutput(combined);
        if (!found.length) return;

        const known = activePorts.get(key);
        if (!known) return;

        const newPorts = [];
        for (const p of found) {
          if (!known.has(p.port)) {
            known.add(p.port);
            newPorts.push(p.port);
          }
        }

        if (!newPorts.length) return;

        const containerName = `workspace-${userId}-${projectId}`;

        // Host-side TCP relay for Windows Docker Desktop compatibility
        for (const port of newPorts) createPortProxy(containerName, port);

        // Emit immediately (path-proxy URL) so preview shows right away
        socket.emit(
          'workspace:ports:update',
          [...known].map((port) => ({ port, process: 'user-app', url: null }))
        );

        // Set up nginx routes asynchronously (no-op when nginx is disabled)
        if (!nginxEnabled) return;

        (async () => {
          const ip = await getContainerIP(containerName);
          if (!ip) return;

          const urlMap = new Map();
          await Promise.all(
            newPorts.map(async (port) => {
              const ok = await addPreviewRoute(containerName, ip, port);
              if (ok) urlMap.set(port, getPreviewUrl(containerName, port));
            })
          );

          if (!urlMap.size) return;

          socket.emit(
            'workspace:ports:update',
            [...known].map((port) => ({ port, process: 'user-app', url: urlMap.get(port) ?? null }))
          );
        })().catch((err) => console.error('[nginx] async setup error:', err.message));
      });
    });

    socket.on('terminal:input', (data) => {
      const term = terminals.get(socket.id);
      if (term) term.write(data);

      if (socket.workspace) {
        const key = `${socket.workspace.userId}:${socket.workspace.projectId}`;
        lastActivity.set(key, Date.now());
      }
    });

    socket.on('terminal:resize', ({ cols, rows }) => {
      if (!cols || !rows || cols < 1 || rows < 1) return;
      const term = terminals.get(socket.id);
      if (term) term.resize(cols, rows);
    });

    socket.on('disconnect', () => {
      // 1. Kill the PTY
      const term = terminals.get(socket.id);
      if (term) { try { term.kill(); } catch (_) {} }
      terminals.delete(socket.id);

      // 2. Remove from queue if this socket was waiting
      const qIdx = workspaceQueue.findIndex(q => q.socketId === socket.id);
      if (qIdx !== -1) {
        workspaceQueue.splice(qIdx, 1);
        // Update positions for remaining queue members
        workspaceQueue.forEach((item, i) => {
          item.socket.emit('workspace:queued', { position: i + 1, total: workspaceQueue.length });
        });
      }

      if (socket.workspace) {
        const { userId, projectId } = socket.workspace;

        // 3. Stop the file-system watcher
        stopWatchWorkspace(userId, projectId);

        // Container stays running — TTL cleanup handles full teardown.
        // activePorts / outputBuffers / portProxies stay alive for reconnection.
        // When the user refreshes, workspace:start → ensureWorkspaceContainer
        // (idempotent) restores the session in seconds instead of ~15 s cold start.
        console.log(`[disconnect] ${socket.id} — container kept alive for ${userId}:${projectId}`);
      }
    });
  });
};
