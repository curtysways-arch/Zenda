const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const localBotJs = fs.readFileSync(path.join(__dirname, '..', 'bot', 'whatsapp-bot', 'bot.js'), 'utf8');

conn.on('ready', () => {
    console.log('🚀 Subiendo bot.js actualizado a VPS...');
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('Error sftp:', err);
            conn.end();
            return;
        }
        sftp.writeFile('/opt/Zenda/bot/whatsapp-bot/bot.js', localBotJs, (err) => {
            if (err) {
                console.error('Error guardando bot.js:', err);
                conn.end();
                return;
            }
            console.log('✅ bot.js subido a VPS. Reiniciando zenda-bot en PM2...');
            conn.exec('pm2 restart zenda-bot', (err, stream) => {
                if (err) {
                    console.error('Error pm2 restart:', err);
                    conn.end();
                    return;
                }
                stream.on('data', d => process.stdout.write(d.toString()));
                stream.stderr.on('data', d => process.stderr.write(d.toString()));
                stream.on('close', () => {
                    console.log('🎉 zenda-bot reiniciado exitosamente.');
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
