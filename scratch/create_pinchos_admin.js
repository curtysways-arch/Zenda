const { Client } = require('d:\\Documentos\\antigravity\\spa\\Spa\\node_modules\\ssh2');
const crypto = require('crypto');

const conn = new Client();
const newUserId = crypto.randomUUID();
const PINCHOS_ID = '23037986-1391-4a5e-a77c-4b20a93ba695';
const HASH = '$2b$10$u962Bz1kC08.o7E35dluOO54jUjg01MawiCK2Rjok2RT/ophpfDBm';

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
        const now = new Date().toISOString().replace('T', ' ').replace('Z', '');

        const sql = `
-- Crear usuario admin para Pinchos
INSERT INTO "Usuario" (
    id, nombre, email, password, role, status,
    auth_method, created_by, "negocioId",
    whatsapp_notifications, "createdAt", "updatedAt"
) VALUES (
    '${newUserId}',
    'Admin Pinchos',
    'admin@pinchos.com',
    '${HASH}',
    'ADMIN',
    'ACTIVE',
    'EMAIL',
    'system',
    '${PINCHOS_ID}',
    false,
    '${now}',
    '${now}'
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    "negocioId" = EXCLUDED."negocioId",
    role = EXCLUDED.role,
    "updatedAt" = EXCLUDED."updatedAt";

-- Verificar el usuario creado
SELECT id, nombre, email, role, "negocioId" FROM "Usuario" WHERE email = 'admin@pinchos.com';

-- Actualizar propietario del negocio Pinchos al nuevo admin
UPDATE "Negocio" SET propietario = (SELECT id FROM "Usuario" WHERE email = 'admin@pinchos.com' LIMIT 1), "updatedAt" = '${now}' WHERE slug = 'pinchos';

SELECT id, nombre, slug, propietario FROM "Negocio" WHERE slug = 'pinchos';
`;

        await uploadFile(conn, sql, '/opt/Zenda/_create_pinchos_admin.sql');
        console.log('--- Creando usuario admin@pinchos.com ---');
        await exec(conn, `sudo -u postgres psql -d zenda_db -f /opt/Zenda/_create_pinchos_admin.sql`);
        await exec(conn, 'rm /opt/Zenda/_create_pinchos_admin.sql');

    } catch (e) {
        console.error('❌ Error:', e.message || e);
    }
    conn.end();
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });

conn.on('error', e => {
    console.error('Error SSH:', e.message);
    process.exit(1);
});
