const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.join(__dirname, '..', 'workspaces');

function getWorkspaceRoot(userId, projectId) {
  return path.join(WORKSPACE_ROOT, String(userId), String(projectId));
}

function resolvePath(userId, projectId, targetPath) {
  const root = getWorkspaceRoot(userId, projectId);
  const full = path.join(root, targetPath);
  if (!full.startsWith(root)) throw new Error('Invalid path');
  return full;
}

function buildTree(dir, base = '') {
  const items = [];

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const relPath = path.join(base, entry).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);

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
