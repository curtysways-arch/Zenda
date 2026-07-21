const { Client } = require('d:\\Documentos\\antigravity\\spa\\Spa\\node_modules\\ssh2');
const conn = new Client();

conn.on('ready', () => {
    console.log('✅ Conectado al VPS por SSH');
    conn.exec('cat /opt/Zenda/.env', (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('data', d => out += d.toString());
        stream.stderr.on('data', d => out += d.toString());
        stream.on('close', () => {
            console.log("=== VPS .env FILE ===");
            console.log(out);
            conn.end();
        });
    });
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });
conn.on('error', e => { console.error('Error SSH:', e.message); process.exit(1); });
