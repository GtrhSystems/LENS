module.exports = {
  apps: [
    {
      name: 'lens-api',
      script: './src/server.ts',
      interpreter: 'node',
      interpreter_args: '--loader ts-node/esm',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    },
    {
      name: 'lens-scanner',
      script: './src/workers/scanner.ts',
      interpreter: 'node',
      interpreter_args: '--loader ts-node/esm',
      instances: 1,
      watch: false,
      cron_restart: '0 */6 * * *', // Restart every 6 hours
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/scanner-error.log',
      out_file: './logs/scanner-out.log',
      log_file: './logs/scanner-combined.log',
      time: true
    }
  ]
};