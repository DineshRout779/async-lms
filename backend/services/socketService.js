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

const CONTAINER_TTL_MS    = 30 * 60 * 1000; // 30 minutes of inactivity
const CLEANUP_INTERVAL_MS =  5 * 60 * 1000; // check every 5 minutes

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

// ---------- Socket handler ----------
module.exports = function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.workspace = null;

    socket.on('workspace:start', async ({ userId, projectId, image, profile }) => {
      try {
        // Quota check before spinning up the container
        const quota = getWorkspaceQuota(userId, projectId);
        if (quota.overQuota) {
          socket.emit('workspace:error', `Disk quota exceeded: ${quota.usedMB} MB used (limit: ${quota.limitMB} MB). Please delete files to continue.`);
          return;
        }

        socket.workspace = { userId, projectId };
        const key = `${userId}:${projectId}`;

        // If reconnecting and ports are already known, emit them immediately
        // so the frontend can restore the preview without waiting
        const knownPorts = activePorts.get(key);
        if (knownPorts?.size > 0) {
          socket.emit(
            'workspace:ports:update',
            [...knownPorts].map((port) => ({ port, process: 'user-app', url: null }))
          );
        }

        socket.emit('workspace:status', { message: 'Starting container…' });

        // Pull workspace files from S3 (no-op if local files already exist or S3 not configured)
        await pullWorkspace(userId, projectId);

        await ensureWorkspaceContainer({ userId, projectId, image, profile });

        const workspacePath = path.join(
          __dirname,
          '..',
          'workspaces',
          String(userId),
          String(projectId)
        );

        watchWorkspace({ userId, projectId, workspacePath, socket });

        if (!activePorts.has(key)) activePorts.set(key, new Set());
        lastActivity.set(key, Date.now());
        touchWorkspace(userId, projectId);

        socket.emit('workspace:ready');
      } catch (error) {
        console.error('[workspace:start]', error);
        socket.emit('workspace:error', error.message);
      }
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

      if (socket.workspace) {
        const { userId, projectId } = socket.workspace;

        // 2. Stop the file-system watcher
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
