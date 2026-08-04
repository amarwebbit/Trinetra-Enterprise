module.exports = {
  apps: [
    {
      name: 'exam-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,  // ← Only 1 instance (not 16!)
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/app-error.log',
      out_file: './logs/app-out.log',
    },
    {
      name: 'exam-worker',
      script: './src/workers/bulk-worker.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
    },
  ],
};