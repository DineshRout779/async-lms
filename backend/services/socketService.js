// socketService.js

const path = require('path');
const axios = require('axios');
const os = require('os');
const { pullWorkspace, pushWorkspace } = require('./s3SyncService');
const { ensureWorkspaceContainer, stopWorkspaceContainer, getProfileMemoryLimit } = require('./workspaceRuntime');
const { createTerminal } = require('./terminalService');
const { watchWorkspace, stopWatchWorkspace } = require('./workspaceWatcher');
const { extractPortsFromOutput } = require('./portDetectionService');
const { getWorkspaceQuota, touchWorkspace } = require('./fileSystemService');
const { getContainerIP, clearContainerIP } = require('./dockerService');
const { ENABLED: nginxEnabled, addPreviewRoute, removePreviewRoutes, getPreviewUrl } = require('./nginxPreviewService');
const { createPortProxy, destroyPortProxies } = require('./portProxyService');
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

// ---------- Redis & BullMQ Queue ----------
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  // Added for production stability
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

const workspaceQueue = new Queue('workspace-queue', { connection: redisConnection });

const terminals = new Map();          // socketId → PTY
const activePorts = new Map();        // `${userId}:${projectId}` → Set<number>
const outputBuffers = new Map();      // key → last 8 KB of terminal output

let _io = null; // set once setupSocket is called, used by TTL timer

// ---------- Container TTL tracking ----------
// Containers idle for CONTAINER_TTL_MS are stopped automatically.
// On disconnect we do NOT stop the container — the TTL handles it.
// This allows the browser to refresh / reconnect without losing the session.
const lastActivity = new Map();       // key → Date.now()

const CONTAINER_TTL_MS    =  5 * 60 * 1000; // 5 minutes of inactivity
const CLEANUP_INTERVAL_MS =  5 * 60 * 1000; // check every 5 minutes

// ---------- Capacity & queue ----------
const SAFETY_BUFFER_MB = 512; 

function hasCapacity(profile) {
  const freeMB = os.freemem() / (1024 * 1024);
  const requiredMB = getProfileMemoryLimit(profile);
  
  const canFit = (freeMB - requiredMB) > SAFETY_BUFFER_MB;
  
  if (!canFit) {
    console.log(`[capacity] Rejecting ${profile}: Free=${Math.round(freeMB)}MB, Req=${requiredMB}MB, Buffer=${SAFETY_BUFFER_MB}MB`);
  }
  
  return canFit;
}

// Map to track active sockets for queued jobs (transient)
const activeSockets = new Map(); // socketId -> socket

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of lastActivity.entries()) {
    if (now - ts > CONTAINER_TTL_MS) {
      const [userId, projectId] = key.split(':');
      console.log(`[ttl] Workspace ${key} idle >${CONTAINER_TTL_MS / 60000} min — stopping`);
      const cname = `workspace-${userId}-${projectId}`;

      // Notify any connected sockets for this workspace
      if (_io) _io.to(`ws:${key}`).emit('workspace:stopped');

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
    
    // Synchronously occupy the slot to prevent concurrency race conditions
    lastActivity.set(key, Date.now());
    
    socket.join(`ws:${key}`);

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
    
    // Free the slot if startup failed so it doesn't leak capacity
    const key = `${userId}:${projectId}`;
    lastActivity.delete(key);
    
    // Release the slot so the queue can advance
    promoteFromQueue();
  }
}

async function promoteFromQueue() {
  // BullMQ handles the "next" item logic automatically.
  // We just need to check if there are jobs waiting.
  const waitingCount = await workspaceQueue.getWaitingCount();
  if (waitingCount > 0) {
    console.log(`[queue] ${waitingCount} jobs waiting in Redis`);
  }
}

// ---------- BullMQ Worker ----------
// Processes jobs when capacity is available
const queueWorker = new Worker('workspace-queue', async (job) => {
  const { userId, projectId, image, profile, socketId } = job.data;
  const key = `${userId}:${projectId}`;

  console.log(`[queue:worker] Processing ${key} (Job: ${job.id})`);

  // Wait for capacity to be available
  while (!hasCapacity(profile)) {
    // Wait 5 seconds before checking again
    await new Promise(r => setTimeout(r, 5000));
  }

  // Find an active socket to associate with this start
  const socket = activeSockets.get(socketId);
  
  if (!socket || socket.disconnected) {
    console.log(`[queue:worker] Socket ${socketId} disconnected, skipping job ${job.id}`);
    return;
  }

  // Double check if container is already running (e.g. user reconnected and bypasssed queue)
  if (lastActivity.has(key)) {
    console.log(`[queue:worker] Workspace ${key} already active, skipping job ${job.id}`);
    return;
  }

  await startWorkspace(socket, { userId, projectId, image, profile });
}, { 
  connection: redisConnection,
  concurrency: 1, // Start one at a time to avoid RAM spikes
});

queueWorker.on('failed', (job, err) => {
  console.error(`[queue:worker] Job ${job?.id} failed:`, err.message);
});

// ---------- Socket handler ----------
module.exports = function setupSocket(io) {
  _io = io;
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.workspace = null;

    // Client emits this immediately after connecting so the server can
    // push real-time notifications to them via their personal room.
    socket.on('notification:subscribe', ({ userId }) => {
      if (userId) socket.join(`user:${userId}`);
    });

    activeSockets.set(socket.id, socket);

    socket.on('workspace:start', async ({ userId, projectId, image, profile }) => {
      try {
        // Quota check before anything else
        const quota = getWorkspaceQuota(userId, projectId);
        if (quota.overQuota) {
          socket.emit('workspace:error', `Disk quota exceeded: ${quota.usedMB} MB used (limit: ${quota.limitMB} MB). Please delete files to continue.`);
          return;
        }

        const key = `${userId}:${projectId}`;

        // Reconnecting users already have a running container — skip the queue
        const isReconnect = lastActivity.has(key);

        if (!isReconnect && !hasCapacity(profile)) {
          // Server at capacity — enqueue using BullMQ
          const job = await workspaceQueue.add(`start:${key}`, {
            userId,
            projectId,
            image,
            profile,
            socketId: socket.id
          }, {
            jobId: key, // Deduplicate: only one queued job per workspace
            removeOnComplete: true,
            removeOnFail: true
          });

          // Join the room so the worker can find them later
          socket.join(`ws:${key}`);
          
          const waitingCount = await workspaceQueue.getWaitingCount();
          socket.emit('workspace:queued', { position: waitingCount, total: waitingCount });
          console.log(`[queue] ${key} added to Redis queue (Position: ${waitingCount})`);
          return;
        }

        await startWorkspace(socket, { userId, projectId, image, profile });
      } catch (err) {
        console.error('[workspace:start] unhandled error:', err);
        socket.emit('workspace:error', err?.message ?? 'Failed to start workspace');
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
      activeSockets.delete(socket.id);
      
      // 1. Kill the PTY
      const term = terminals.get(socket.id);
      if (term) { try { term.kill(); } catch (_) {} }
      terminals.delete(socket.id);

      // BullMQ jobs stay in Redis even if the socket disconnects.
      // The Worker will check if the socket is still alive when it pulls the job.
      
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
