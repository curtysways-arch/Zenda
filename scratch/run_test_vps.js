const { Client } = require('d:\\Documentos\\antigravity\\spa\\Spa\\node_modules\\ssh2');

const conn = new Client();

function exec(conn, cmd) {
    return new Promise((resolve, reject) => {
        conn.exec(cmd, { pty: false }, (err, stream) => {
            if (err) return reject(err);
            let out = '';
            stream.on('data', d => { process.stdout.write(d.toString()); out += d.toString(); });
            stream.stderr.on('data', d => { process.stderr.write(d.toString()); out += d.toString(); });
            stream.on('close', code => resolve({ code, out }));
        });
    });
}

function uploadFile(conn, localPath, remotePath) {
    return new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
            if (err) return reject(err);
            sftp.fastPut(localPath, remotePath, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    });
}

conn.on('ready', async () => {
    console.log('✅ Conectado al VPS...\n');
    try {
        console.log('📤 Subiendo test_payments_flow.ts al VPS...');
        await uploadFile(conn, 'd:/Documentos/antigravity/spa/Spa/scratch/test_payments_flow.ts', '/opt/Zenda/scratch/test_payments_flow.ts');

        console.log('\n▶ Ejecutando test en el VPS con PostgreSQL...\n');
        await exec(conn, 'cd /opt/Zenda && npx tsx scratch/test_payments_flow.ts');

        await exec(conn, 'rm /opt/Zenda/scratch/test_payments_flow.ts');
    } catch (e) {
        console.error('❌ Error en test VPS:', e);
    }
    conn.end();
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });

conn.on('error', e => {
    console.error('Error SSH:', e.message);
    process.exit(1);
});
