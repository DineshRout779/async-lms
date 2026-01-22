// editorController.js
const fs = require('fs');
const path = require('path');
const { provisionWorkspace } = require('../services/workspaceService');
const editorProfiles = require('../config/editorProfiles.json');

exports.startEditor = (req, res) => {
  try {
    const { profile, projectId } = req.body;
    const userId = req.user.id;

    const config = editorProfiles[profile];
    if (!config) return res.status(400).json({ error: 'Invalid profile' });

    // provision workspace
    const workspacePath = provisionWorkspace(userId, projectId, profile);

    // load files
    const files = loadFiles(workspacePath);

    res.json({
      projectId,
      workspacePath,
      profile: {
        ...config,
        files,
      },
    });
  } catch (err) {
    console.error('Editor start error:', err);
    res.status(500).json({ error: err.message });
  }
};

function loadFiles(dir, base = dir) {
  let result = [];

  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);

    if (fs.statSync(full).isDirectory()) {
      result.push(...loadFiles(full, base));
    } else {
      result.push({
        path: path.relative(base, full),
        content: fs.readFileSync(full, 'utf-8'),
      });
    }
  }

  return result;
}
