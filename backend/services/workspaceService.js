// workspaceService.js
const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.join(__dirname, '..', 'workspaces');
const TEMPLATE_ROOT = path.join(__dirname, '..', 'templates');

exports.provisionWorkspace = (userId, projectId, profile) => {
  const workspacePath = path.join(
    WORKSPACE_ROOT,
    String(userId),
    String(projectId)
  );

  const templatePath = path.join(TEMPLATE_ROOT, profile);

  console.log('Provisioning workspace:', workspacePath);
  console.log('Using template:', templatePath);

  // create workspace folder
  fs.mkdirSync(workspacePath, { recursive: true });

  // copy template only if workspace is empty
  const existingFiles = fs.readdirSync(workspacePath);

  if (existingFiles.length === 0) {
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    copyRecursive(templatePath, workspacePath);
  }

  return workspacePath;
};

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  for (const file of fs.readdirSync(src)) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    if (fs.statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
