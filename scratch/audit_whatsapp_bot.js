const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('✅ Conectado por SSH a VPS (157.173.203.174)...');
    
    // 1. Ver PM2 status y logs del bot
    conn.exec('pm2 status && pm2 logs zenda-bot --lines 60 --nostream', (err, stream) => {
        if (err) {
            console.error('Error:', err);
            conn.end();
            return;
        }
        let out = '';
        stream.on('data', d => { process.stdout.write(d.toString()); out += d.toString(); });
        stream.stderr.on('data', d => { process.stderr.write(d.toString()); out += d.toString(); });
        stream.on('close', () => {
            console.log('\n--- VERIFICANDO PROCESO Y CARPETAS DEL BOT DE WHATSAPP ---');
            conn.exec('ls -la /opt/Zenda && ls -la /opt/Zenda/bot || true && ls -la /opt/Zenda/whatsapp_session || true && ls -la /opt/Zenda/auth_info_baileys || true', (err2, stream2) => {
                stream2.on('data', d => process.stdout.write(d.toString()));
                stream2.stderr.on('data', d => process.stderr.write(d.toString()));
                stream2.on('close', () => {
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
