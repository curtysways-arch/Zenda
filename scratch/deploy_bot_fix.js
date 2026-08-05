const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const LOCAL_BOT = 'd:/Documentos/antigravity/spa/Spa/bot/whatsapp-bot/bot.js';
const REMOTE_BOT = '/opt/Zenda/bot/whatsapp-bot/bot.js';

conn.on('ready', () => {
    console.log('✅ Conexión SSH a VPS (157.173.203.174)...');
    
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('❌ Error SFTP:', err);
            conn.end();
            return;
        }

        sftp.fastPut(LOCAL_BOT, REMOTE_BOT, (err) => {
            if (err) {
                console.error('❌ Error al subir bot.js:', err);
                conn.end();
                return;
            }
            console.log('📤 bot.js actualizado exitosamente en VPS.');

            // Limpiar auth_v2 corrupto y reiniciar PM2 zenda-bot
            const cmd = 'rm -rf /opt/Zenda/bot/whatsapp-bot/auth_v2 /opt/Zenda/auth_v2 /opt/Zenda/whatsapp_session && pm2 restart zenda-bot --update-env';
            console.log('🔨 Ejecutando limpieza de sesión y reinicio de zenda-bot...');

            conn.exec(cmd, (err, stream) => {
                if (err) {
                    console.error('❌ Error ejecutando reinicio:', err);
                    conn.end();
                    return;
                }
                stream.on('data', d => process.stdout.write(d.toString()));
                stream.stderr.on('data', d => process.stderr.write(d.toString()));
                stream.on('close', () => {
                    console.log('🚀 ¡Bot de WhatsApp reiniciado e instruido a generar QR nuevo!');
                    conn.end();
                });
            });
        });
    });
}).connect({ 
    host: '157.173.203.174', 
    port: 22, 
    username: 'root', 
    password: 'Elmassuelto005624'
});
