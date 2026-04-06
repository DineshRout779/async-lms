// workspaceService.js
const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.join(__dirname, '..', 'workspaces');
const TEMPLATE_ROOT = path.join(__dirname, '..', 'templates');

exports.provisionWorkspace = (userId, projectId, profile) => {
  try {
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

    // Config files that should always be in sync with the template
    const CONFIG_FILES = ['vite.config.js', 'vite.config.ts'];

    const existingFiles = fs.readdirSync(workspacePath);

    if (existingFiles.length === 0) {
      // First open: seed the entire template
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
      }
      copyRecursive(templatePath, workspacePath);
    } else if (fs.existsSync(templatePath)) {
      // Returning visit: overwrite config files so they stay up-to-date
      for (const cfgFile of CONFIG_FILES) {
        const src = path.join(templatePath, cfgFile);
        const dst = path.join(workspacePath, cfgFile);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
        }
      }
    }

    return workspacePath;
  } catch (error) {
    console.log('error:', error);
    throw new Error(error.message);
  }
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
