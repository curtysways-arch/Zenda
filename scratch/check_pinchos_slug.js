const { Client } = require('d:\\Documentos\\antigravity\\spa\\Spa\\node_modules\\ssh2');
const crypto = require('crypto');

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

function uploadFile(conn, content, remotePath) {
    return new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
            if (err) return reject(err);
            const stream = sftp.createWriteStream(remotePath);
            stream.on('close', resolve);
            stream.on('error', reject);
            stream.write(content);
            stream.end();
        });
    });
}

conn.on('ready', async () => {
    console.log('✅ Conectado al VPS...\n');
    try {
        // Ver qué usuarios ADMIN existen
        console.log('--- Usuarios ADMIN existentes ---');
        await exec(conn, `sudo -u postgres psql -d zenda_db -c 'SELECT id, email, role, nombre FROM "Usuario" WHERE role != \'USER\' LIMIT 10;'`);

        // Ver el schema de la tabla Usuario
        console.log('\n--- Columnas de tabla Usuario ---');
        await exec(conn, `sudo -u postgres psql -d zenda_db -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'Usuario' ORDER BY ordinal_position;"`);

    } catch (e) {
        console.error('❌ Error:', e.message || e);
    }
    conn.end();
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });

conn.on('error', e => {
    console.error('Error SSH:', e.message);
    process.exit(1);
});
