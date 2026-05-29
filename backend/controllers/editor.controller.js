// editorController.js
const { provisionWorkspace } = require('../services/workspaceService');
const { assignWorker } = require('../services/workerRegistry');
const { pushWorkspace } = require('../services/s3SyncService');
const editorProfiles = require('../config/editorProfiles.json');

exports.startEditor = async (req, res) => {
  try {
    const { profile, projectId } = req.body;
    const userId = req.user.id;

    const config = editorProfiles[profile];
    if (!config) return res.status(400).json({ error: 'Invalid profile' });

    // WebContainer runs entirely in the browser — no Docker worker needed.
    // Provision it locally on the Orchestrator so the frontend can fetch the files.
    if (config.engine === 'webcontainer') {
      const workspacePath = provisionWorkspace(userId, projectId, profile);
      return res.json({
        projectId,
        workspacePath,
        engine: 'webcontainer',
        profile: config,
        workerUrl: null,
      });
    }

    // Docker path — assign to the least-loaded worker node.
    const workerUrl = assignWorker(userId, projectId);
    res.json({
      projectId,
      workspacePath: null, // Docker handles its own workspace path on the Worker node
      engine: 'docker',
      profile: config,
      workerUrl,
    });
  } catch (err) {
    console.error('Editor start error:', err);
    res.status(500).json({ error: err.message });
  }
};
