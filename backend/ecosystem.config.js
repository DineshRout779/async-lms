module.exports = {
  apps: [
    {
      name: 'codeguru-lms-prod',
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
