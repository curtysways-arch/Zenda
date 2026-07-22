const { Client } = require('d:\\Documentos\\antigravity\\spa\\Spa\\node_modules\\ssh2');
const crypto = require('crypto');

const conn = new Client();
const newId = crypto.randomUUID();

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
        // 1. Ver roles disponibles
        console.log('--- Roles disponibles ---');
        await exec(conn, `sudo -u postgres psql -d zenda_db -c 'SELECT DISTINCT role, COUNT(*) FROM "Usuario" GROUP BY role;'`);
        
        // 2. Obtener cualquier usuario válido
        const anyRes = await exec(conn, `sudo -u postgres psql -d zenda_db -t -A -c 'SELECT id FROM "Usuario" LIMIT 1;'`);
        const lines = anyRes.out.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('('));
        const ownerId = lines[0];
        console.log('Propietario ID:', JSON.stringify(ownerId));

        if (!ownerId || ownerId.length < 5) {
            console.error('No se encontró ningún usuario válido. Saliendo.');
            conn.end();
            return;
        }

        // 3. Generar SQL correcto CON precioHora
        const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
        const config = '{"tiempoEntrega":30,"costoEnvioBase":1.00,"costoPorKm":0.25,"latitudNegocio":"-0.180653","longitudNegocio":"-78.467838","horaLimiteMismoDia":"20:00"}';
        
        const sql = `INSERT INTO "Negocio" (
    id, nombre, propietario, slug, whatsapp, direccion, ciudad,
    "colorPrimario", "colorSecundario", "colorTerciario", "colorNeutral", "colorTexto",
    "heroTitulo", "heroSubtitulo", "mensajeBienvenida",
    "horarioApertura", "horarioCierre", "precioHora",
    estado, "isDemo", "mostrarPrecios", "tipoNegocio",
    configuracion, "createdAt", "updatedAt",
    "pagosActivos", "pagoPorcentaje",
    "tieneCafeteria", "tieneParking", "tieneWifi", "tieneVestidores", "tieneTienda", "moduloTorneos",
    "appointmentsUsed", "billingStatus"
) VALUES (
    '${newId}',
    'Pinchos',
    '${ownerId}',
    'pinchos',
    '',
    '',
    '',
    '#ff6b2b',
    '#1a0a00',
    '#ff8c42',
    '#f5f5f5',
    '#1a0a00',
    'Pinchos para Asar',
    'Pedidos rapidos y deliciosos',
    'Bienvenido! Haz tu pedido de pinchos en menos de 60 segundos.',
    '10:00',
    '22:00',
    0,
    'ACTIVO',
    false,
    true,
    'PRODUCTOS',
    '${config}'::jsonb,
    '${now}',
    '${now}',
    false,
    0,
    false, false, false, false, false, false,
    0,
    'ACTIVE'
) ON CONFLICT (slug) DO NOTHING;

SELECT id, nombre, slug, "tipoNegocio" FROM "Negocio" WHERE slug = 'pinchos';
`;
        
        console.log('\n--- SQL generado, subiendo al VPS ---');
        await uploadFile(conn, sql, '/opt/Zenda/_create_pinchos.sql');
        
        console.log('--- Ejecutando INSERT ---');
        await exec(conn, `sudo -u postgres psql -d zenda_db -f /opt/Zenda/_create_pinchos.sql`);
        await exec(conn, 'rm /opt/Zenda/_create_pinchos.sql');

    } catch (e) {
        console.error('❌ Error:', e.message || e);
    }
    conn.end();
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });

conn.on('error', e => {
    console.error('Error SSH:', e.message);
    process.exit(1);
});
