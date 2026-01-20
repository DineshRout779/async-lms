// workspaceService.js
const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = '/workspaces';

exports.createWorkspace = (userId, projectId) => {
  const userStr = String(userId);
  const projectStr = String(projectId);

  const workspacePath = path.join(WORKSPACE_ROOT, userStr, projectStr);

  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }

  return workspacePath;
};

exports.copyTemplate = (workspacePath, templatesPath) => {
  if (!fs.existsSync(templatesPath)) return;

  fs.readdirSync(templatesPath).forEach((file) => {
    const src = path.join(templatesPath, file);
    const dest = path.join(workspacePath, file);

    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
  });
};
