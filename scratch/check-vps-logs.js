const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
    console.log('✅ Conectado al VPS');
    conn.exec('pm2 logs zenda-app --lines 100 --raw', (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('data', d => { out += d.toString(); });
        stream.stderr.on('data', d => { console.error('STDERR:', d.toString()); });
        stream.on('close', () => {
            console.log('PM2 LOGS FROM VPS:');
            console.log(out);
            conn.end();
        });
    });
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });
