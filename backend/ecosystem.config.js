module.exports = {
  apps: [
    {
      name: 'orchestrator',
      script: 'index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'worker',
      script: 'worker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
