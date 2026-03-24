// editorController.js
const { provisionWorkspace } = require('../services/workspaceService');
const { assignWorker } = require('../services/workerRegistry');
const editorProfiles = require('../config/editorProfiles.json');

exports.startEditor = (req, res) => {
  try {
    const { profile, projectId } = req.body;
    const userId = req.user.id;

    const config = editorProfiles[profile];
    if (!config) return res.status(400).json({ error: 'Invalid profile' });

    const workspacePath = provisionWorkspace(userId, projectId, profile);

    // Assign to a worker node. Returns null in local/single-machine mode —
    // the frontend falls back to VITE_API_URL when workerUrl is null.
    const workerUrl = assignWorker(userId, projectId);

    res.json({
      projectId,
      workspacePath,
      profile: config,
      workerUrl,
    });
  } catch (err) {
    console.error('Editor start error:', err);
    res.status(500).json({ error: err.message });
  }
};
