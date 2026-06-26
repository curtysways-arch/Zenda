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
        console.log('🔄 Sincronizando maxAppointmentsMonthly con max_reservations_per_month en todos los planes...');
        
        const planes = await prisma.plan.findMany();
        console.log(`Encontrados ${planes.length} planes en la base de datos.`);

        let actualizados = 0;
        for (const plan of planes) {
            const expectedValue = plan.max_reservations_per_month;
            if (plan.maxAppointmentsMonthly !== expectedValue) {
                console.log(`Plan "${plan.name}" (ID: ${plan.id}): actualizando maxAppointmentsMonthly de ${plan.maxAppointmentsMonthly} a ${expectedValue}`);
                await prisma.plan.update({
                    where: { id: plan.id },
                    data: { maxAppointmentsMonthly: expectedValue }
                });
                actualizados++;
            } else {
                console.log(`Plan "${plan.name}" (ID: ${plan.id}): ya está sincronizado (${expectedValue} citas)`);
            }
        }

        console.log(`✅ Sincronización completada. Planes actualizados: ${actualizados}`);

    } catch (e) {
        console.error('❌ Error ejecutando la sincronización de planes:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
