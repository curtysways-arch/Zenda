const { Client } = require('ssh2');
const conn = new Client();
const PROJECT_DIR = '/opt/Zenda';

conn.on('ready', async () => {
    console.log('✅ Conectado al VPS\n');
    conn.exec(`cd ${PROJECT_DIR} && npx ts-node -e "import prisma from './src/lib/prisma'; prisma.campaign.findMany({ include: { Quests: true } }).then(c => console.log(JSON.stringify(c, null, 2)))"`, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('data', d => { out += d.toString(); });
        stream.stderr.on('data', d => { console.error(d.toString()); });
        stream.on('close', code => {
            console.log("OUTPUT FROM VPS:");
            console.log(out);
            conn.end();
        });
    });
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });
