const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('🔍 Consultando estado de zenda-bot en VPS...');
    const cmd = 'curl -s http://127.0.0.1:3001/qr-json && echo "\n--- PM2 LOGS ---" && pm2 logs zenda-bot --lines 20 --nostream';
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
            conn.end();
        });
    });
}).connect({ 
    host: '157.173.203.174', 
    port: 22, 
    username: 'root', 
    password: 'Elmassuelto005624'
});
