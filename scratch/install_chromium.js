const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('📦 Instalando chromium-browser y dependencias para headless browser en VPS...');
    const cmd = 'apt-get update && apt-get install -y chromium-browser chromium-chromedriver libatk-bridge2.0-0 libgtk-3-0';
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
            console.log('✅ Instalación de Chromium completa.');
            conn.end();
        });
    });
}).connect({ 
    host: '157.173.203.174', 
    port: 22, 
    username: 'root', 
    password: 'Elmassuelto005624'
});
