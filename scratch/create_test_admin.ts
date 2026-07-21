import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Singleton lazy loader para test
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
let prisma: any;

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
} else {
    const { PrismaLibSql } = require('@prisma/adapter-libsql');
    const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
    const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
    const absPath = isAbsolute ? rawPath : `${process.cwd()}/${rawPath}`;
    const normalized = absPath.split(/[/\\]/).join('/');
    const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
    const resolvedUrl = `file://${prefix}${normalized}`;
    
    const adapter = new PrismaLibSql({ url: resolvedUrl });
    prisma = new PrismaClient({ adapter });
}

async function createAdmin() {
    console.log("🔑 Creando usuario administrador de prueba...");
    const email = "admin@pinchos.com";
    const password = "admin123";
    const businessId = "pinchos-test-id";

    try {
        // Borrar si existe
        await prisma.usuario.delete({ where: { email } }).catch(() => {});

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.usuario.create({
            data: {
                id: "admin-pinchos-id",
                nombre: "Administrador Pinchos",
                email,
                password: hashedPassword,
                role: "ADMIN_NEGOCIO",
                status: "verified",
                negocioId: businessId,
                updatedAt: new Date()
            }
        });
        console.log(`✅ Usuario administrador creado:`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Contraseña: ${password}`);
        console.log(`   - Negocio ID: ${user.negocioId}`);
    } catch (e) {
        console.error("❌ Error creando administrador:", e);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
