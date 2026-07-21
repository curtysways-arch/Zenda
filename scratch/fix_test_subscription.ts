import { PrismaClient } from '@prisma/client';

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

async function fixSubscription() {
    console.log("🛠️ Inicializando fix de suscripción para negocio de prueba...");
    const businessId = "pinchos-test-id";
    const planId = "plan-test-id";

    try {
        // 1. Crear Plan si no existe
        const planExistente = await prisma.plan.findUnique({ where: { id: planId } });
        if (!planExistente) {
            console.log("📄 Creando Plan de Prueba...");
            await prisma.plan.create({
                data: {
                    id: planId,
                    name: "Plan Premium Pro",
                    description: "Acceso total para pruebas de desarrollo",
                    price: 0.0,
                    updated_at: new Date()
                }
            });
            console.log("✅ Plan de Prueba creado.");
        }

        // 2. Crear Suscripción si no existe
        const subExistente = await prisma.suscripcion.findUnique({ where: { negocioId: businessId } });
        if (!subExistente) {
            console.log("💳 Creando Suscripción de Prueba...");
            const unAnioFuturo = new Date();
            unAnioFuturo.setFullYear(unAnioFuturo.getFullYear() + 1);

            await prisma.suscripcion.create({
                data: {
                    id: "sub-test-id",
                    negocioId: businessId,
                    planId: planId,
                    estado: "trial",
                    fechaFin: unAnioFuturo,
                    trial_fin: unAnioFuturo,
                    updatedAt: new Date()
                }
            });
            console.log("✅ Suscripción de prueba creada exitosamente.");
        } else {
            console.log("💳 Actualizando Suscripción de Prueba existente...");
            const unAnioFuturo = new Date();
            unAnioFuturo.setFullYear(unAnioFuturo.getFullYear() + 1);

            await prisma.suscripcion.update({
                where: { negocioId: businessId },
                data: {
                    estado: "trial",
                    fechaFin: unAnioFuturo,
                    trial_fin: unAnioFuturo,
                    updatedAt: new Date()
                }
            });
            console.log("✅ Suscripción de prueba actualizada.");
        }

        console.log("🚀 ¡Suscripción de prueba activa! Ya puedes acceder a /admin sin redirecciones.");

    } catch (e) {
        console.error("❌ Error aplicando fix de suscripción:", e);
    } finally {
        await prisma.$disconnect();
    }
}

fixSubscription();
