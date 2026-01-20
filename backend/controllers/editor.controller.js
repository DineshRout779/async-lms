const profiles = require('../config/editorProfiles.json');
const {
  createWorkspace,
  copyTemplate,
} = require('../services/workspaceService');
const path = require('path');

exports.startEditor = async (req, res) => {
  try {
    const { profile, project_id } = req.body;
    const userId = req.user.id;

    console.log('user id: ', userId);

    if (!profiles[profile]) {
      return res.status(400).json({ error: 'Invalid profile' });
    }

    const editorProfile = profiles[profile];

    const workspacePath = createWorkspace(userId, project_id);

    const templatePath = path.join(__dirname, '..', 'templates', profile);
    copyTemplate(workspacePath, templatePath);

    return res.status(200).json({
      message: 'Editor environment setup complete',
      project_id,
      profile: editorProfile,
      workspacePath,
    });
  } catch (error) {
    console.log('Error in startEditor:', error);
    return res.status(500).json({
      message: 'Editor environment setup failed',
      error: error.message,
    });
  }
};

exports.getFiles = async (req, res) => {};
