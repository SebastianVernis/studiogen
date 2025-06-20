module.exports = {
  apps: [{
    name: 'studiogen',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/studiogen/app',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 9002,
      HOST: '0.0.0.0'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 9002,
      HOST: '0.0.0.0'
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 9002,
      HOST: '0.0.0.0'
    },
    // Configuración de logs
    error_file: '/var/log/studiogen/error.log',
    out_file: '/var/log/studiogen/out.log',
    log_file: '/var/log/studiogen/combined.log',
    time: true,
    
    // Configuración de memoria y reinicio
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    
    // Configuración de watch (deshabilitado en producción)
    watch: false,
    ignore_watch: [
      'node_modules',
      '.next',
      'logs',
      '.git'
    ],
    
    // Configuración de autorestart
    autorestart: true,
    
    // Variables de entorno específicas
    env_file: '/var/www/studiogen/.env.production',
    
    // Configuración de health check
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true,
    
    // Configuración de cluster
    instance_var: 'INSTANCE_ID',
    
    // Configuración de logs avanzada
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Configuración de kill timeout
    kill_timeout: 5000,
    
    // Configuración de listen timeout
    listen_timeout: 3000,
    
    // Configuración de source map
    source_map_support: true,
    
    // Configuración de interpretador
    interpreter: 'node',
    interpreter_args: '--max-old-space-size=1024',
    
    // Configuración de cron para restart (opcional)
    cron_restart: '0 2 * * *', // Restart diario a las 2 AM
    
    // Configuración de exponential backoff restart
    exp_backoff_restart_delay: 100
  }],

  // Configuración de deployment
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['your-production-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/studiogen.git',
      path: '/var/www/studiogen',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    },
    staging: {
      user: 'ubuntu',
      host: ['your-staging-server-ip'],
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/studiogen.git',
      path: '/var/www/studiogen',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
};
