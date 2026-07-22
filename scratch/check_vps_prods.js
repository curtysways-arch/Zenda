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
    const prods = await prisma.producto.findMany({});
    console.log("Productos encontrados:", prods.length);
    for (const p of prods) {
        console.log(\`ID: \${p.id} | Nombre: \${p.nombre} | ImagenUrl: '\${p.imagenUrl}'\`);
    }
}

main()
    .catch(e => console.error("ERR:", e))
    .finally(() => prisma.$disconnect());
`;

conn.on('ready', () => {
    conn.exec(`cat << 'EOF' > ${PROJECT_DIR}/check_prods.js\n${vpsScriptContent}\nEOF\ncd ${PROJECT_DIR} && node check_prods.js`, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
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
