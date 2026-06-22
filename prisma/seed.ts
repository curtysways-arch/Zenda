import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import hasher from 'bcryptjs';

// 1. Cargar variables de entorno inmediatamente
dotenv.config({ path: path.join(process.cwd(), '.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL no encontrada en el entorno.');
    process.exit(1);
}

// Asegurarnos de usar ruta absoluta para el archivo db
let finalUrl = dbUrl;
if (dbUrl.startsWith('file:')) {
    const relativePath = dbUrl.replace('file:', '');
    const absolutePath = path.resolve(process.cwd(), relativePath);
    finalUrl = `file:${absolutePath}`;
}

console.log(`🔗 Conectando a: ${finalUrl}`);

// 2. Configurar Prisma adaptativo según la base de datos
let prisma: PrismaClient;

if (finalUrl.startsWith('postgresql://') || finalUrl.startsWith('postgres://')) {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({ connectionString: finalUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
} else {
    const { createClient } = require('@libsql/client');
    const { PrismaLibSql } = require('@prisma/adapter-libsql');
    const client = createClient({ url: finalUrl });
    const adapter = new PrismaLibSql(client);
    prisma = new PrismaClient({ adapter });
}

async function main() {
    console.log('🌱 Iniciando siembra de datos...');

    try {
        await prisma.$connect();
        console.log('📡 Conexión establecida con éxito.');

        const crypto = require('crypto');
        const hashedPassword = await hasher.hash('superadmin123', 10);

        // Crear/Actualizar Super Admin
        const superAdmin = await prisma.usuario.upsert({
            where: { email: 'superadmin@cancha.com' },
            update: {
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                updatedAt: new Date()
            },
            create: {
                id: crypto.randomUUID(),
                nombre: 'Super Admin',
                email: 'superadmin@cancha.com',
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                updatedAt: new Date()
            },
        });

        console.log('✅ Super Admin verificado:', superAdmin.email);

        // Crear Planes
        const planes = [
            { id: crypto.randomUUID(), name: 'Plan Básico', price: 29.99, max_reservations_per_month: 100, max_fields: 2, updated_at: new Date() },
            { id: crypto.randomUUID(), name: 'Plan Pro', price: 59.99, max_reservations_per_month: 500, max_fields: 5, updated_at: new Date() },
            { id: crypto.randomUUID(), name: 'Plan Ilimitado', price: 99.99, max_reservations_per_month: 999999, max_fields: 999999, updated_at: new Date() },
        ];

        for (const p of planes) {
            const existe = await (prisma as any).plan.findFirst({ where: { name: p.name } });
            if (!existe) {
                await (prisma as any).plan.create({ data: p });
                console.log('📦 Plan creado:', p.name);
            } else {
                console.log('ℹ️ Plan existe:', p.name);
            }
        }

        console.log('✨ Seed completado con éxito.');
    } catch (error) {
        console.error('❌ Error durante la ejecución del seed:', error);
        process.exit(1);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
