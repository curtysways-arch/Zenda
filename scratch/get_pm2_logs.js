const { Client } = require('d:\\Documentos\\antigravity\\spa\\Spa\\node_modules\\ssh2');
const conn = new Client();

conn.on('ready', () => {
    console.log('✅ Conectado al VPS\n');
    conn.exec('pm2 logs zenda-app --lines 80 --no-color', (err, stream) => {
        if (err) throw err;
        stream.on('data', d => {
            process.stdout.write(d.toString());
        });
        stream.stderr.on('data', d => {
            process.stderr.write(d.toString());
        });
        stream.on('close', () => {
            conn.end();
        });
    });
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });
conn.on('error', e => { console.error('Error SSH:', e.message); process.exit(1); });
