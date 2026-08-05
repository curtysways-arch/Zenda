const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('🧹 Limpiando node_modules y reinstalando Baileys estable 6.7.22 en VPS...');
    const cmd = 'cd /opt/Zenda/bot/whatsapp-bot && rm -rf node_modules package-lock.json test_auth_* auth_v2 && npm install';
    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error(err);
            conn.end();
            return;
        }
        let out = '';
        stream.on('data', d => { process.stdout.write(d.toString()); out += d.toString(); });
        stream.stderr.on('data', d => { process.stderr.write(d.toString()); out += d.toString(); });
        stream.on('close', () => {
            console.log('✅ Reinstalación completa de node_modules finalizada.');
            conn.end();
        });
    });
}).connect({ 
    host: '157.173.203.174', 
    port: 22, 
    username: 'root', 
    password: 'Elmassuelto005624'
});
