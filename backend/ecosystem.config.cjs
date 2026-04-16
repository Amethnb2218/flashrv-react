module.exports = {
  apps: [
    {
      name: 'jolofera-backend',
      script: 'src/server.js',
      cwd: __dirname,
      exec_mode: 'cluster',
      instances: process.env.PM2_INSTANCES || 'max',
      watch: false,
      autorestart: true,
      max_memory_restart: process.env.PM2_MAX_MEMORY || '512M',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: process.env.PORT || 4000,
      },
    },
  ],
}
