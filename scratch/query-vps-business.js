const { Client } = require('ssh2');
const conn = new Client();
const PROJECT_DIR = '/opt/Zenda';

const vpsScriptContent = `
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
const envPath = '/opt/Zenda/.env';
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
    const absPath = path.resolve('/opt/Zenda', rawPath);
    const normalized = absPath.split(/[\\\\/]/).join('/');
    const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
    const resolvedUrl = \`file://\${prefix}\${normalized}\`;
    const adapter = new PrismaLibSql({ url: resolvedUrl });
    prisma = new PrismaClient({ adapter });
}

async function main() {
    try {
        const negocio = await prisma.negocio.findFirst({
            where: { id: "bceea0c8-e464-4a9e-b944-dd8bcef8f179" }
        });
        console.log("BUSINESS_SPECIFIC:");
        console.log(JSON.stringify(negocio, null, 2));
    } catch (e) {
        console.error("DB Query error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
`;

conn.on('ready', () => {
    conn.exec(`cat << 'EOF' > ${PROJECT_DIR}/scratch/query-business.js\n${vpsScriptContent}\nEOF`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            conn.exec(`node ${PROJECT_DIR}/scratch/query-business.js`, (err2, stream2) => {
                if (err2) throw err2;
                let out = '';
                stream2.on('data', d => { out += d.toString(); });
                stream2.stderr.on('data', d => { console.error('STDERR:', d.toString()); });
                stream2.on('close', () => {
                    console.log('OUTPUT FROM VPS:');
                    console.log(out);
                    conn.end();
                });
            });
        });
        stream.on('data', () => {});
    });
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });
