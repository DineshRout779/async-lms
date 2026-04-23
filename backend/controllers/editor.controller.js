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

    // Provision workspace on disk (copies template if first time, no-op otherwise).
    // Done for all engines so files are always persisted server-side.
    const workspacePath = provisionWorkspace(userId, projectId, profile);
    
    // Sync initial template to S3 so remote worker instances can pull the code on boot
    await pushWorkspace(userId, projectId);

    // WebContainer runs entirely in the browser — no Docker worker needed.
    if (config.engine === 'webcontainer') {
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
      workspacePath,
      engine: 'docker',
      profile: config,
      workerUrl,
    });
  } catch (err) {
    console.error('Editor start error:', err);
    res.status(500).json({ error: err.message });
  }
};
