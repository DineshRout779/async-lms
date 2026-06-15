const chokidar = require('chokidar');

const watchers = new Map();

function watchWorkspace({ userId, projectId, workspacePath, socket }) {
  const key = `${userId}-${projectId}`;

  if (watchers.has(key)) return;

  const watcher = chokidar.watch(workspacePath, {
    ignored: [/node_modules/, /dist/, /build/, /(^|[\/\\])\../], // Use Regex to completely block traversal
    ignoreInitial: true,
    persistent: true,
    depth: 10,
  });

  watcher.on('all', (event, filePath) => {
    console.log('[FS]', event, filePath);
    socket.emit('workspace:fs:update');
  });

  watchers.set(key, watcher);
}

function stopWatchWorkspace(userId, projectId) {
  const key = `${userId}-${projectId}`;
  const watcher = watchers.get(key);
  if (watcher) {
    watcher.close();
    watchers.delete(key);
  }
}

module.exports = {
  watchWorkspace,
  stopWatchWorkspace,
};
