// s3SyncService.js
// Pulls workspace files from S3 on container start (cold start recovery),
// and pushes them back on container stop (durable persistence).
//
// Enabled only when S3_WORKSPACE_BUCKET is set in the environment.
// Degrades gracefully (no-op) when not configured — local dev continues to work.

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const BUCKET = process.env.S3_WORKSPACE_BUCKET;
const WORKSPACE_ROOT = path.join(__dirname, '..', 'workspaces');

const enabled = !!BUCKET;

const s3 = enabled
  ? new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })
  : null;

// Directories to skip when collecting files for upload
const IGNORED = new Set([
  'node_modules', '.git', 'dist', 'build', '__pycache__',
  '.next', '.nuxt', '.venv', 'venv', '.tox', 'target', 'out',
  '.parcel-cache', '.turbo', '.cache', 'coverage',
]);

// ---------- Helpers ----------

function getLocalRoot(userId, projectId) {
  return path.join(WORKSPACE_ROOT, String(userId), String(projectId));
}

function s3Prefix(userId, projectId) {
  return `workspaces/${userId}/${projectId}/`;
}

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/** Recursively collect all non-ignored files under dir. */
function collectFiles(dir, base = '') {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (IGNORED.has(entry.name) || entry.name === '.ws-accessed') continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, rel));
    } else {
      results.push({ rel, full });
    }
  }
  return results;
}

// ---------- Public API ----------

/**
 * Pull workspace from S3 to local disk.
 * Skips if:
 *   - Bucket not configured (local dev)
 *   - Local workspace already has files (container re-attach / warm reconnect)
 */
async function pullWorkspace(userId, projectId) {
  if (!enabled) return;

  const localRoot = getLocalRoot(userId, projectId);

  // Skip if local files already exist — container is being re-attached
  if (fs.existsSync(localRoot)) {
    const entries = fs.readdirSync(localRoot).filter((f) => f !== '.ws-accessed');
    if (entries.length > 0) return;
  }

  try {
    const prefix = s3Prefix(userId, projectId);
    const list = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix })
    );

    if (!list.Contents?.length) return; // nothing in S3 yet — fresh workspace

    for (const obj of list.Contents) {
      const relKey = obj.Key.slice(prefix.length);
      if (!relKey) continue;

      const localPath = path.join(localRoot, relKey);
      fs.mkdirSync(path.dirname(localPath), { recursive: true });

      const data = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key }));
      const buf = await streamToBuffer(data.Body);
      fs.writeFileSync(localPath, buf);
    }

    console.log(
      `[s3-sync] Pulled ${userId}:${projectId} — ${list.Contents.length} file(s)`
    );
  } catch (err) {
    console.error(`[s3-sync] Pull failed for ${userId}:${projectId}:`, err.message);
  }
}

/**
 * Push workspace to S3.
 * Called just before the container is stopped (TTL cleanup or explicit stop).
 * No-op if bucket not configured.
 */
async function pushWorkspace(userId, projectId) {
  if (!enabled) return;

  const localRoot = getLocalRoot(userId, projectId);
  if (!fs.existsSync(localRoot)) return;

  const files = collectFiles(localRoot);
  if (!files.length) return;

  const prefix = s3Prefix(userId, projectId);

  try {
    await Promise.all(
      files.map(({ rel, full }) =>
        s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: `${prefix}${rel}`,
            Body: fs.readFileSync(full),
          })
        )
      )
    );
    console.log(
      `[s3-sync] Pushed ${userId}:${projectId} — ${files.length} file(s)`
    );
  } catch (err) {
    console.error(`[s3-sync] Push failed for ${userId}:${projectId}:`, err.message);
  }
}

module.exports = { pullWorkspace, pushWorkspace, enabled };
