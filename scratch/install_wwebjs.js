const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('📦 Instalando whatsapp-web.js y puppeteer-core en VPS...');
    const cmd = 'cd /opt/Zenda/bot/whatsapp-bot && npm install whatsapp-web.js puppeteer-core qrcode';
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
            console.log('✅ Instalación de whatsapp-web.js finalizada.');
            conn.end();
        });
    });
}).connect({ 
    host: '157.173.203.174', 
    port: 22, 
    username: 'root', 
    password: 'Elmassuelto005624'
});
