module.exports = {
  apps: [
    {
      name: 'longxiang-website',
      script: 'server/app.js',
      cwd: '/home/ubuntu/longxiang-website',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
