// File for Dev Environment

const { spawn } = require('child_process');

function startWorkspaceContainer({ userId, projectId, image }) {
  const containerName = `workspace-${userId}-${projectId}`;
  const workspacePath = `/workspaces/${userId}/${projectId}`;

  const args = [
    'run',
    '-d',
    '--name',
    containerName,
    '--memory=2g',
    '--cpus=2',
    '--pids-limit=256',
    '--network=bridge',
    '-v',
    `${workspacePath}:/workspace`,
    '-w',
    '/workspace',
    image,
    'sleep',
    'infinity',
  ];

  return spawn('docker', args);
}

function execInWorkspace({ userId, projectId, cmd }) {
  const containerName = `workspace-${userId}-${projectId}`;

  return spawn('docker', ['exec', '-it', containerName, ...cmd]);
}

function stopWorkspaceContainer({ userId, projectId }) {
  const containerName = `workspace-${userId}-${projectId}`;

  spawn('docker', ['rm', '-f', containerName]);
}

module.exports = {
  startWorkspaceContainer,
  execInWorkspace,
  stopWorkspaceContainer,
};
