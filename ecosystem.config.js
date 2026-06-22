// ecosystem.config.js – Configuración PM2 para Zenda
// Uso: pm2 start ecosystem.config.js
// Ver logs: pm2 logs zenda-app
// Ver status: pm2 status

module.exports = {
  apps: [
    // ─────────────────────────────────────────────────────────────────────────
    // Proceso 1: Next.js (servidor principal)
    // ─────────────────────────────────────────────────────────────────────────
    {
      name: 'zenda-app',
      script: 'npm',
      args: 'run start:next',
      cwd: './',
      instances: 1,             // Aumentar a 'max' si hay múltiples CPUs y sin bot WA
      exec_mode: 'fork',        // 'cluster' si instances > 1 y sin estado de sesión WA
      watch: false,
      max_memory_restart: '1G',

      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Log rotation
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/zenda-app-error.log',
      out_file: '/var/log/pm2/zenda-app-out.log',
      merge_logs: true,

      // Restart automático en fallos
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Proceso 2: Bot WhatsApp (Baileys – servidor HTTP interno)
    // ─────────────────────────────────────────────────────────────────────────
    {
      name: 'zenda-bot',
      script: 'bot/whatsapp-bot/bot.js',
      cwd: './',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',        // SIEMPRE fork para el bot WA (mantiene estado de sesión)
      watch: false,
      max_memory_restart: '512M',

      env: {
        NODE_ENV: 'production',
        BOT_PORT: 3001,
      },

      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/zenda-bot-error.log',
      out_file: '/var/log/pm2/zenda-bot-out.log',
      merge_logs: true,

      autorestart: true,
      restart_delay: 5000,       // Más tiempo para reconectar WA
      max_restarts: 20,
      min_uptime: '30s',
    },
  ],
};
