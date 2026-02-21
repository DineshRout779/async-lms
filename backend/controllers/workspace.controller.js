const fsService = require('../services/fileSystemService');

// Helper: returns 403 if the requesting user is not the workspace owner
function assertOwner(req, res, userId) {
  if (String(req.user.id) !== String(userId)) {
    res.status(403).json({ message: 'Access denied: you do not own this workspace' });
    return false;
  }
  return true;
}

exports.getTree = (req, res) => {
  const { userId, projectId } = req.query;
  try {
    res.json(fsService.getTree(userId, projectId));
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

exports.readFile = (req, res) => {
  const { userId, projectId, filePath } = req.query;
  try {
    res.json({ content: fsService.readFile(userId, projectId, filePath) });
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

exports.writeFile = (req, res) => {
  const { userId, projectId, filePath, content } = req.body;
  if (!assertOwner(req, res, userId)) return;
  fsService.writeFile(userId, projectId, filePath, content);
  res.json({ status: 'saved' });
};

exports.create = (req, res) => {
  const { userId, projectId, path, type } = req.body;
  if (!assertOwner(req, res, userId)) return;

  if (type === 'file') fsService.createFile(userId, projectId, path);
  else fsService.createFolder(userId, projectId, path);

  res.json({ status: 'created' });
};

exports.delete = (req, res) => {
  const { userId, projectId, path } = req.body;
  if (!assertOwner(req, res, userId)) return;
  fsService.deletePath(userId, projectId, path);
  res.json({ status: 'deleted' });
};

exports.rename = (req, res) => {
  const { userId, projectId, oldPath, newPath } = req.body;
  if (!assertOwner(req, res, userId)) return;
  fsService.renamePath(userId, projectId, oldPath, newPath);
  res.json({ status: 'renamed' });
};
