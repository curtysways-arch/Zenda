const { Client } = require('ssh2');
const conn = new Client();
const PROJECT_DIR = '/opt/Zenda';

const vpsScriptContent = `
const fs = require('fs');

const envPath = '${PROJECT_DIR}/.env';
if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\\n');
    envLines.forEach(line => {
        const m = line.trim().match(/^([^#=]+)=(.*)$/);
        if (m) {
            const key = m[1].trim();
            let val = m[2].trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            process.env[key] = val;
        }
    });
}

const { PrismaClient } = require('@prisma/client');
let prisma;

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
console.log("Connecting to DATABASE_URL:", dbUrl);

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
} else {
    const { PrismaLibSql } = require('@prisma/adapter-libsql');
    const rawPath = dbUrl.replace(/^file:(\\.\\/)?/, '');
    const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\\\') || /^[a-zA-Z]:/.test(rawPath);
    const dbPath = isAbsolute ? rawPath : require('path').join(process.cwd(), rawPath);
    const adapter = new PrismaLibSql({ url: 'file:' + dbPath });
    prisma = new PrismaClient({ adapter });
}

async function main() {
    const negocios = await prisma.negocio.findMany({
        where: {
            OR: [
                { slug: { contains: 'pincho' } },
                { nombre: { contains: 'pincho', mode: 'insensitive' } }
            ]
        }
    });

    console.log("Negocios encontrados:", negocios.length);
    for (const n of negocios) {
        console.log("Actualizando negocio:", n.id, n.nombre, n.slug);
        let config = n.configuracion || {};
        if (typeof config === 'string') {
            try { config = JSON.parse(config); } catch (e) { config = {}; }
        }
        config.montoMinimoPedido = 5.00;
        await prisma.negocio.update({
            where: { id: n.id },
            data: { configuracion: config }
        });
        console.log("OK - Monto mínimo establecido a $5.00 para", n.nombre);
    }
}

main()
    .catch(e => console.error("ERR:", e))
    .finally(() => prisma.$disconnect());
`;

conn.on('ready', () => {
    console.log('SSH connection established');
    conn.exec(`cat << 'EOF' > ${PROJECT_DIR}/update_min_order_vps.js\n${vpsScriptContent}\nEOF\ncd ${PROJECT_DIR} && node update_min_order_vps.js`, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log(`Command finished with code ${code}`);
            conn.end();
        }).on('data', (data) => {
            console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
            console.error('STDERR: ' + data);
        });
    });
}).connect({
    host: '157.173.203.174',
    port: 22,
    username: 'root',
    password: 'Elmassuelto005624'
});
