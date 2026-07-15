module.exports = {
  apps: [
    {
      name: 'movieflex',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start --hostname 0.0.0.0 -p 3060',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      time: true,
    },
  ],
};
