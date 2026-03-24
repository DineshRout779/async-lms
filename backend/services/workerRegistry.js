// workerRegistry.js
// Runs on the API server. Tracks live worker nodes and routes
// workspace sessions to the least-loaded available worker.
//
// Workers register on startup and send heartbeats every 30 s.
// Assignments are in-memory — if the API server restarts, workers
// re-register and clients re-call /editor/start for a fresh assignment.

const workers     = new Map(); // workerId → { url, capacity, activeCount, lastSeen }
const assignments = new Map(); // `${userId}:${projectId}` → workerId

// ---------- Worker lifecycle ----------

function registerWorker(id, url, capacity = 20) {
  const existing = workers.get(id);
  workers.set(id, {
    url,
    capacity,
    activeCount: existing?.activeCount ?? 0,
    lastSeen: Date.now(),
  });
  console.log(`[registry] Worker registered: ${id} @ ${url} (capacity: ${capacity})`);
}

function heartbeat(id) {
  const w = workers.get(id);
  if (w) w.lastSeen = Date.now();
}

function deregisterWorker(id) {
  workers.delete(id);
  console.log(`[registry] Worker deregistered: ${id}`);
}

// ---------- Workspace assignment ----------

/**
 * Assign a workspace to the least-loaded worker.
 * Re-uses an existing assignment if the worker is still alive.
 * Returns the worker URL, or null if no workers are registered
 * (caller falls back to local/self-hosted mode).
 */
function assignWorker(userId, projectId) {
  const key = `${userId}:${projectId}`;

  // Reuse existing assignment if that worker is still alive
  const existingId = assignments.get(key);
  if (existingId && workers.has(existingId)) {
    return workers.get(existingId).url;
  }

  if (workers.size === 0) return null; // local mode

  // Pick the least-loaded worker that still has capacity
  let bestId = null;
  let bestLoad = Infinity;

  for (const [id, w] of workers.entries()) {
    if (w.activeCount >= w.capacity) continue;
    const load = w.activeCount / w.capacity;
    if (load < bestLoad) {
      bestLoad = load;
      bestId = id;
    }
  }

  if (!bestId) return null; // all workers full

  const w = workers.get(bestId);
  w.activeCount++;
  assignments.set(key, bestId);
  console.log(`[registry] Assigned ${key} → ${bestId} (${w.activeCount}/${w.capacity})`);
  return w.url;
}

function getWorkerForWorkspace(userId, projectId) {
  const workerId = assignments.get(`${userId}:${projectId}`);
  if (!workerId) return null;
  return workers.get(workerId)?.url ?? null;
}

/**
 * Decrement the active count for a workspace's assigned worker.
 * Called when a container is stopped (TTL cleanup or explicit stop).
 */
function releaseWorkspace(userId, projectId) {
  const key = `${userId}:${projectId}`;
  const workerId = assignments.get(key);
  if (workerId) {
    const w = workers.get(workerId);
    if (w) w.activeCount = Math.max(0, w.activeCount - 1);
    assignments.delete(key);
    console.log(`[registry] Released ${key} from ${workerId}`);
  }
}

// ---------- Diagnostics ----------

function getStatus() {
  return {
    workers: Object.fromEntries(
      [...workers.entries()].map(([id, w]) => [
        id,
        { url: w.url, active: w.activeCount, capacity: w.capacity },
      ])
    ),
    totalAssignments: assignments.size,
  };
}

// ---------- Stale worker cleanup ----------
// Remove workers that haven't sent a heartbeat in 2 minutes.
setInterval(() => {
  const now = Date.now();
  for (const [id, w] of workers.entries()) {
    if (now - w.lastSeen > 120_000) {
      console.log(`[registry] Worker ${id} timed out — removing`);
      workers.delete(id);
    }
  }
}, 30_000).unref();

module.exports = {
  registerWorker,
  heartbeat,
  deregisterWorker,
  assignWorker,
  getWorkerForWorkspace,
  releaseWorkspace,
  getStatus,
};
