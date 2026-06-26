const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Cargar .env manualmente si existe
try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
            if (match) {
                const key = match[1].trim();
                let val = match[2].trim();
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.substring(1, val.length - 1);
                } else if (val.startsWith("'") && val.endsWith("'")) {
                    val = val.substring(1, val.length - 1);
                }
                process.env[key] = val;
            }
        });
    }
} catch (e) {
    console.error('Error al cargar .env:', e);
}

function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

    if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
        const { Pool } = require('pg');
        const { PrismaPg } = require('@prisma/adapter-pg');
        const pool = new Pool({ connectionString: dbUrl });
        const adapter = new PrismaPg(pool);
        return new PrismaClient({ adapter });
    } else {
        const { createClient } = require('@libsql/client');
        const { PrismaLibSql } = require('@prisma/adapter-libsql');
        
        let resolvedUrl = dbUrl;
        if (!dbUrl.startsWith('file://')) {
            const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
            const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
            const absPath = isAbsolute ? rawPath : `${process.cwd()}/${rawPath}`;
            const normalized = absPath.split(/[/\\]/).join('/');
            const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
            resolvedUrl = `file://${prefix}${normalized}`;
        }
        
        const client = createClient({ url: resolvedUrl });
        const adapter = new PrismaLibSql(client);
        return new PrismaClient({ adapter });
    }
}

const prisma = createPrismaClient();

async function main() {
    try {
        const planes = await prisma.plan.findMany();
        console.log(JSON.stringify(planes, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
