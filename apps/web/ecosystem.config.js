// ============================================================
// Path: apps/web/ecosystem.config.js
// ============================================================

module.exports = {
  apps: [
    {
      name: 'study-buddy-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3007',
      cwd: '/var/www/study-buddy/apps/web',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '500M',
      error_file: '/var/log/study-buddy/web-error.log',
      out_file: '/var/log/study-buddy/web-out.log',
      time: true,
      autorestart: true,
      watch: false,
    },
  ],
};