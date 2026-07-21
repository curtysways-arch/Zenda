const path = require('path');

// Cargar dotenv si existe localmente
try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (e) {}

const dbUrl = process.env.DATABASE_URL || 'file:../prisma/dev.db';
console.log(`🔗 Conectando a la base de datos: ${dbUrl.split('@')[1] || dbUrl}`);

let prisma;

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    const { PrismaClient } = require('@prisma/client');
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
} else {
    const { PrismaClient } = require('@prisma/client');
    const { PrismaLibSql } = require('@prisma/adapter-libsql');
    
    // Resolver URL absoluta de sqlite
    let resolvedUrl = dbUrl;
    if (dbUrl.startsWith('file:') && !dbUrl.startsWith('file://')) {
        const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
        const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
        const absPath = isAbsolute ? rawPath : path.resolve(__dirname, '..', rawPath);
        const normalized = absPath.split(/[/\\]/).join('/');
        const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
        resolvedUrl = `file://${prefix}${normalized}`;
    }
    
    const adapter = new PrismaLibSql({ url: resolvedUrl });
    prisma = new PrismaClient({ adapter });
}

const templates = [
    {
        nombre: "Fidelización Express: Barbería & Estilo",
        descripcion: "Perfecto para barberías y salones de belleza. Estimula la recurrencia de visitas cortas, reseñas positivas y recomendaciones a nuevos clientes en la zona.",
        icono: "Scissors",
        color: "#f59e0b",
        categorias: ["BARBERIA", "BELLEZA"],
        tags: ["corte", "fidelidad", "reseñas", "estilo"],
        esPredeterminada: true,
        featured: true,
        gratuito: true,
        precio: 0.0,
        Missions: [
            {
                nombre: "El Cliente Habitual",
                descripcion: "Completa 3 reservas de servicios en la barbería.",
                triggerEvent: "BOOKING_COMPLETED",
                difficulty: "MEDIUM",
                xp: 150,
                cantidadMeta: 3,
                acciones: [
                    { type: "GIVE_POINTS", value: 120 },
                    { type: "GIVE_CASHBACK", value: 5.0 }
                ]
            },
            {
                nombre: "Embajador de Estilo",
                descripcion: "Invita a un amigo que complete su primer corte.",
                triggerEvent: "REFERRAL_COMPLETED",
                difficulty: "HARD",
                xp: 300,
                cantidadMeta: 1,
                acciones: [
                    { type: "GIVE_POINTS", value: 250 },
                    { type: "GIVE_COUPON", value: "DCTO20" }
                ]
            },
            {
                nombre: "Tu Opinión Importa",
                descripcion: "Califica y deja una reseña sobre tu última experiencia.",
                triggerEvent: "REVIEW_SUBMITTED",
                difficulty: "EASY",
                xp: 50,
                cantidadMeta: 1,
                acciones: [
                    { type: "GIVE_POINTS", value: 40 }
                ]
            }
        ]
    },
    {
        nombre: "Club de Bienestar: Spa & Relax",
        descripcion: "Diseñado para Spas y centros de terapia. Promueve tratamientos premium, reservas recurrentes en días de baja demanda y perfil de salud completo.",
        icono: "Sparkles",
        color: "#ec4899",
        categorias: ["SPA", "CLINICA"],
        tags: ["relax", "masaje", "salud", "bienestar"],
        esPredeterminada: false,
        featured: true,
        gratuito: true,
        precio: 0.0,
        Missions: [
            {
                nombre: "Primer Paso al Relax",
                descripcion: "Completa tu primera sesión de masaje o terapia corporal.",
                triggerEvent: "FIRST_BOOKING",
                difficulty: "EASY",
                xp: 100,
                cantidadMeta: 1,
                acciones: [
                    { type: "GIVE_POINTS", value: 80 }
                ]
            },
            {
                nombre: "Ritual Completo de Bienestar",
                descripcion: "Realiza 5 tratamientos faciales o masajes corporales en total.",
                triggerEvent: "BOOKING_COMPLETED",
                difficulty: "HARD",
                xp: 400,
                cantidadMeta: 5,
                acciones: [
                    { type: "GIVE_POINTS", value: 350 },
                    { type: "GIVE_COUPON", value: "MASAJE_GRATIS" }
                ]
            },
            {
                nombre: "Perfil de Cuidado Personal",
                descripcion: "Completa la información de tu perfil de usuario.",
                triggerEvent: "PROFILE_COMPLETED",
                difficulty: "EASY",
                xp: 50,
                cantidadMeta: 1,
                acciones: [
                    { type: "GIVE_POINTS", value: 50 }
                ]
            }
        ]
    },
    {
        nombre: "Desafío Fitness: Gimnasios & Centros Deportivos",
        descripcion: "Ideal para centros de entrenamiento y crossfit. Incentiva el check-in constante, compra de pases mensuales y metas de entrenamiento semanales.",
        icono: "Activity",
        color: "#10b981",
        categorias: ["GIMNASIO", "GENERAL"],
        tags: ["fitness", "entrenamiento", "constancia", "salud"],
        esPredeterminada: false,
        featured: false,
        gratuito: true,
        precio: 0.0,
        Missions: [
            {
                nombre: "Constancia de Acero",
                descripcion: "Registra 10 visitas o check-ins al gimnasio.",
                triggerEvent: "CHECK_IN",
                difficulty: "MEDIUM",
                xp: 200,
                cantidadMeta: 10,
                acciones: [
                    { type: "GIVE_POINTS", value: 150 }
                ]
            },
            {
                nombre: "Gasto de Poder",
                descripcion: "Realiza una compra de suplementos o pase mensual de al menos $50.",
                triggerEvent: "PURCHASE",
                difficulty: "MEDIUM",
                xp: 150,
                cantidadMeta: 1,
                acciones: [
                    { type: "GIVE_POINTS", value: 100 },
                    { type: "GIVE_CASHBACK", value: 10.0 }
                ]
            }
        ]
    }
];

async function main() {
    console.log("🌱 Iniciando siembra de plantillas de misiones...");
    
    for (const t of templates) {
        // Verificar si la plantilla ya existe
        const existing = await prisma.questTemplate.findFirst({
            where: { nombre: t.nombre }
        });

        if (existing) {
            console.log(`ℹ️ La plantilla "${t.nombre}" ya existe. Omitiendo.`);
            continue;
        }

        console.log(`▶ Creando plantilla: "${t.nombre}"...`);

        // Crear la plantilla y sus misiones asociadas en una transacción
        await prisma.$transaction(async (tx) => {
            const createdTemplate = await tx.questTemplate.create({
                data: {
                    nombre: t.nombre,
                    descripcion: t.descripcion,
                    icono: t.icono,
                    color: t.color,
                    categorias: t.categorias,
                    tags: t.tags,
                    versionSemantica: "1.0.0",
                    estado: "PUBLICADA",
                    origenTipo: "BIBLIOTECA_OFICIAL",
                    esPredeterminada: t.esPredeterminada,
                    featured: t.featured,
                    gratuito: t.gratuito,
                    precio: t.precio,
                    moneda: "USD"
                }
            });

            for (const m of t.Missions) {
                await tx.questTemplateMission.create({
                    data: {
                        templateId: createdTemplate.id,
                        nombre: m.nombre,
                        descripcion: m.descripcion,
                        triggerEvent: m.triggerEvent,
                        difficulty: m.difficulty,
                        xp: m.xp,
                        cantidadMeta: m.cantidadMeta,
                        acciones: m.acciones,
                        icono: t.icono,
                        color: t.color,
                        activa: true,
                        visible: true,
                        repetible: false,
                        limiteUsuario: 1
                    }
                });
            }
        });

        console.log(`✅ Creada con éxito: "${t.nombre}" con sus misiones.`);
    }

    console.log("✨ Siembra de plantillas terminada.");
}

main()
    .catch(e => {
        console.error("❌ Error en seed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
