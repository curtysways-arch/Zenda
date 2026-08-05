const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('ls -la /opt/Zenda/bot/whatsapp-bot && echo "=== BOT.JS ===" && cat /opt/Zenda/bot/whatsapp-bot/bot.js', (err, stream) => {
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
