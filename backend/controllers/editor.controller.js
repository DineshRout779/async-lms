// editorController.js
const { provisionWorkspace } = require('../services/workspaceService');
const editorProfiles = require('../config/editorProfiles.json');

exports.startEditor = (req, res) => {
  try {
    const { profile, projectId } = req.body;
    const userId = req.user.id;

    const config = editorProfiles[profile];
    if (!config) return res.status(400).json({ error: 'Invalid profile' });

    const workspacePath = provisionWorkspace(userId, projectId, profile);

    res.json({
      projectId,
      workspacePath,
      profile: config,
    });
  } catch (err) {
    console.error('Editor start error:', err);
    res.status(500).json({ error: err.message });
  }
};
