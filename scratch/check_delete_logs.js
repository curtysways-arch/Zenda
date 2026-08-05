const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('pm2 logs zenda-app --lines 50 --nostream', (err, stream) => {
        if (err) {
            console.error(err);
            conn.end();
            return;
        }
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
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
