const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.join(__dirname, '..', 'workspaces');

// ---------- Quota config ----------
const MAX_WORKSPACE_MB    = 500;
const MAX_WORKSPACE_BYTES = MAX_WORKSPACE_MB * 1024 * 1024;

// ---------- Stale cleanup config ----------
const STALE_AFTER_DAYS = 7;
const STALE_AFTER_MS   = STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL  = 24 * 60 * 60 * 1000; // run once per day

// Name of the per-workspace marker file touched on every connect
const ACCESSED_MARKER = '.ws-accessed';

// ---------- Directories to skip during tree traversal / quota calculation ----------
const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.svelte-kit',
  '__pycache__', '.cache', 'coverage', '.nyc_output', 'vendor', '.venv', 'venv',
  '.tox', 'target', 'out', '.parcel-cache', '.turbo',
]);

// ---------- Internal helpers ----------

function getWorkspaceRoot(userId, projectId) {
  return path.join(WORKSPACE_ROOT, String(userId), String(projectId));
}

function resolvePath(userId, projectId, targetPath) {
  const root = getWorkspaceRoot(userId, projectId);
  const full = path.join(root, targetPath);
  if (!full.startsWith(root)) throw new Error('Invalid path');
  return full;
}

/**
 * Recursively sum directory size.
 * Aborts early the moment `limit` bytes are exceeded to keep this fast
 * when a workspace is already well over quota.
 */
function getDirSizeSync(dir, limit = Infinity) {
  let total = 0;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (total >= limit) break; // early abort — already over limit
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += getDirSizeSync(full, limit - total);
    } else {
      try {
        total += fs.statSync(full).size;
      } catch { /* skip inaccessible files */ }
    }
  }
  return total;
}

function buildTree(dir, base = '') {
  const items = [];

  for (const entry of fs.readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const fullPath = path.join(dir, entry);
    const relPath  = path.join(base, entry).replace(/\\/g, '/');
    const stat     = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      items.push({
        type: 'folder',
        name: entry,
        path: relPath,
        children: buildTree(fullPath, relPath),
      });
    } else {
      items.push({
        type: 'file',
        name: entry,
        path: relPath,
      });
    }
  }

  return items;
}

// ---------- Public API ----------

exports.getTree = (userId, projectId) => {
  const root = getWorkspaceRoot(userId, projectId);
  return buildTree(root);
};

exports.readFile = (userId, projectId, filePath) => {
  const full = resolvePath(userId, projectId, filePath);
  return fs.readFileSync(full, 'utf8');
};

exports.writeFile = (userId, projectId, filePath, content) => {
  const full = resolvePath(userId, projectId, filePath);
  fs.writeFileSync(full, content, 'utf8');
};

exports.createFile = (userId, projectId, filePath) => {
  const full = resolvePath(userId, projectId, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, '');
};

exports.createFolder = (userId, projectId, folderPath) => {
  const full = resolvePath(userId, projectId, folderPath);
  fs.mkdirSync(full, { recursive: true });
};

exports.deletePath = (userId, projectId, targetPath) => {
  const full = resolvePath(userId, projectId, targetPath);
  fs.rmSync(full, { recursive: true, force: true });
};

exports.renamePath = (userId, projectId, oldPath, newPath) => {
  const oldFull = resolvePath(userId, projectId, oldPath);
  const newFull = resolvePath(userId, projectId, newPath);
  fs.renameSync(oldFull, newFull);
};

/**
 * Returns the total disk usage (in bytes) for a workspace.
 * Aborts early at MAX_WORKSPACE_BYTES + 1 to keep the call fast.
 */
exports.getWorkspaceSizeBytes = (userId, projectId) => {
  const root = getWorkspaceRoot(userId, projectId);
  if (!fs.existsSync(root)) return 0;
  return getDirSizeSync(root, MAX_WORKSPACE_BYTES + 1);
};

/**
 * Returns { used, limit, overQuota } in human-readable form.
 */
exports.getWorkspaceQuota = (userId, projectId) => {
  const used = exports.getWorkspaceSizeBytes(userId, projectId);
  return {
    usedBytes: used,
    usedMB: parseFloat((used / 1024 / 1024).toFixed(2)),
    limitMB: MAX_WORKSPACE_MB,
    overQuota: used > MAX_WORKSPACE_BYTES,
  };
};

/**
 * Touch the .ws-accessed marker file so the cleanup job knows this workspace
 * was recently active. Call this whenever a user connects to their workspace.
 */
exports.touchWorkspace = (userId, projectId) => {
  const root   = getWorkspaceRoot(userId, projectId);
  const marker = path.join(root, ACCESSED_MARKER);
  try {
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(marker, String(Date.now()));
  } catch (err) {
    console.error(`[ws-touch] Failed to touch ${marker}:`, err.message);
  }
};

/**
 * Remove workspace directories that haven't been accessed in STALE_AFTER_DAYS.
 * Checks the .ws-accessed marker file; falls back to directory mtime.
 */
function cleanupStaleWorkspaces() {
  if (!fs.existsSync(WORKSPACE_ROOT)) return;

  const now = Date.now();
  let removed = 0;

  let userDirs;
  try {
    userDirs = fs.readdirSync(WORKSPACE_ROOT, { withFileTypes: true });
  } catch {
    return;
  }

  for (const userEntry of userDirs) {
    if (!userEntry.isDirectory()) continue;
    const userPath = path.join(WORKSPACE_ROOT, userEntry.name);

    let projectDirs;
    try {
      projectDirs = fs.readdirSync(userPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const projectEntry of projectDirs) {
      if (!projectEntry.isDirectory()) continue;
      const wsPath = path.join(userPath, projectEntry.name);
      const marker = path.join(wsPath, ACCESSED_MARKER);

      // Determine last-access time
      let lastAccess;
      try {
        const raw = fs.readFileSync(marker, 'utf8').trim();
        lastAccess = parseInt(raw, 10);
        if (isNaN(lastAccess)) throw new Error('bad value');
      } catch {
        // Fall back to directory mtime
        try {
          lastAccess = fs.statSync(wsPath).mtimeMs;
        } catch {
          continue;
        }
      }

      if (now - lastAccess > STALE_AFTER_MS) {
        try {
          fs.rmSync(wsPath, { recursive: true, force: true });
          console.log(`[ws-cleanup] Removed stale workspace: ${userEntry.name}/${projectEntry.name} (${Math.round((now - lastAccess) / 86400000)} days old)`);
          removed++;
        } catch (err) {
          console.error(`[ws-cleanup] Failed to remove ${wsPath}:`, err.message);
        }
      }
    }

    // Remove empty user directories
    try {
      if (fs.readdirSync(userPath).length === 0) {
        fs.rmSync(userPath, { recursive: true, force: true });
      }
    } catch { /* ignore */ }
  }

  if (removed > 0) {
    console.log(`[ws-cleanup] Cleaned up ${removed} stale workspace(s)`);
  }
}

exports.cleanupStaleWorkspaces = cleanupStaleWorkspaces;

// ---------- Schedule daily cleanup ----------
const cleanupTimer = setInterval(cleanupStaleWorkspaces, CLEANUP_INTERVAL);
cleanupTimer.unref(); // don't prevent clean process exit

// Run once on startup (after a short delay to not block the boot path)
setTimeout(cleanupStaleWorkspaces, 10_000).unref();
