const fsService = require('../services/fileSystemService');

exports.getTree = (req, res) => {
  const { userId, projectId } = req.query;
  res.json(fsService.getTree(userId, projectId));
};

exports.readFile = (req, res) => {
  const { userId, projectId, filePath } = req.query;
  res.json({ content: fsService.readFile(userId, projectId, filePath) });
};

exports.writeFile = (req, res) => {
  const { userId, projectId, filePath, content } = req.body;
  fsService.writeFile(userId, projectId, filePath, content);
  res.json({ status: 'saved' });
};

exports.create = (req, res) => {
  const { userId, projectId, path, type } = req.body;

  if (type === 'file') fsService.createFile(userId, projectId, path);
  else fsService.createFolder(userId, projectId, path);

  res.json({ status: 'created' });
};

exports.delete = (req, res) => {
  const { userId, projectId, path } = req.body;
  fsService.deletePath(userId, projectId, path);
  res.json({ status: 'deleted' });
};

exports.rename = (req, res) => {
  const { userId, projectId, oldPath, newPath } = req.body;
  fsService.renamePath(userId, projectId, oldPath, newPath);
  res.json({ status: 'renamed' });
};
