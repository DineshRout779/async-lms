// editorController.js
const fs = require('fs');
const path = require('path');
const { provisionWorkspace } = require('../services/workspaceService');

const PROFILE_CONFIG = {
  javascript: {
    name: 'JavaScript',
    language: 'javascript',
    entry: 'index.js',
    run: 'node index.js',
    image: 'playground-node-runner',
    type: 'runner',
  },
  python: {
    name: 'Python',
    language: 'python',
    entry: 'main.py',
    run: 'python main.py',
    image: 'playground-python-runner',
    type: 'runner',
  },
  mern: {
    name: 'MERN',
    language: 'mern',
    entry: 'package.json',
    run: 'npm run dev',
    image: 'playground-mern',
    type: 'workspace',
  },
};

exports.startEditor = (req, res) => {
  try {
    const { profile, projectId } = req.body;
    const userId = req.user.id;

    const config = PROFILE_CONFIG[profile];
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
