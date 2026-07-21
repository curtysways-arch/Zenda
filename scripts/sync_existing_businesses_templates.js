const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

// ─── Catálogo completo de cupones y premios por sector (4-5 de cada tipo) ────
const defaultCatalogBySector = {
    BARBERIA: {
        coupons: [
            { codigo: 'CORTE20', tipo: 'PORCENTAJE', valor: 20, descripcion: '20% de descuento en tu próximo corte de cabello.' },
            { codigo: 'BARBA15', tipo: 'PORCENTAJE', valor: 15, descripcion: '15% de descuento en delineado y afeitado de barba premium.' },
            { codigo: 'COMBO10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento en combo corte + barba.' },
            { codigo: 'PRIMERA_VEZ', tipo: 'PORCENTAJE', valor: 25, descripcion: '25% de descuento para nuevos clientes en su primera visita.' },
            { codigo: 'FIEL5K', tipo: 'FIJO', valor: 5, descripcion: '$5 de descuento directo en cualquier servicio.' },
        ],
        rewards: [
            { nombre: 'Corte de Cabello Gratis', descripcion: 'Canjea 400 puntos y obtén un servicio de corte de cabello clásico totalmente gratuito.', costoPuntos: 400, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Afeitado Clásico Gratis', descripcion: 'Canjea 350 puntos por un afeitado con navaja y toalla caliente.', costoPuntos: 350, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Aceite Hidratante para Barba', descripcion: 'Canjea 150 puntos por un aceite hidratante de la barbería.', costoPuntos: 150, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
            { nombre: 'Combo Corte + Barba Gratis', descripcion: 'Canjea 700 puntos por el combo completo de corte y arreglo de barba.', costoPuntos: 700, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Descuento $10 en Próximo Servicio', descripcion: 'Canjea 200 puntos y recibe $10 de descuento en tu próxima visita.', costoPuntos: 200, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
        ]
    },
    SPA: {
        coupons: [
            { codigo: 'RELAX10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento en masajes relajantes y terapias faciales.' },
            { codigo: 'SPA_DAY15', tipo: 'PORCENTAJE', valor: 15, descripcion: '15% de descuento en el circuito de spa hídrico completo.' },
            { codigo: 'FACIAL20', tipo: 'PORCENTAJE', valor: 20, descripcion: '20% de descuento en tratamientos faciales anti-edad.' },
            { codigo: 'PRIMERA_SPA', tipo: 'PORCENTAJE', valor: 25, descripcion: '25% de descuento en tu primera sesión en el spa.' },
            { codigo: 'SPA_FIJO', tipo: 'FIJO', valor: 10, descripcion: '$10 de descuento en cualquier servicio de spa.' },
        ],
        rewards: [
            { nombre: 'Masaje Facial Express', descripcion: 'Canjea 300 puntos por una sesión express de masaje e hidratación facial.', costoPuntos: 300, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Sesión de Spa Completa (60 min)', descripcion: 'Canjea 600 puntos por un circuito corporal hídrico completo gratis.', costoPuntos: 600, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Masaje Relajante (30 min)', descripcion: 'Canjea 250 puntos por media hora de masaje relajante de cuerpo completo.', costoPuntos: 250, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Kit de Aromaterapia', descripcion: 'Canjea 180 puntos por un kit de aromaterapia con aceites esenciales.', costoPuntos: 180, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
            { nombre: 'Descuento $15 en Próxima Sesión', descripcion: 'Canjea 200 puntos y recibe $15 de descuento en tu próxima sesión.', costoPuntos: 200, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
        ]
    },
    BELLEZA: {
        coupons: [
            { codigo: 'NAILS15', tipo: 'PORCENTAJE', valor: 15, descripcion: '15% de descuento en servicio completo de uñas esculpidas o gel.' },
            { codigo: 'LOOK20', tipo: 'PORCENTAJE', valor: 20, descripcion: '20% de descuento en diseño de cejas o extensiones de pestañas.' },
            { codigo: 'BRILLO10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento en tratamientos capilares y keratina.' },
            { codigo: 'PRIMERA_VISITA', tipo: 'PORCENTAJE', valor: 25, descripcion: '25% de descuento para nuevas clientas en su primera visita.' },
            { codigo: 'BELLEZA_FIJO', tipo: 'FIJO', valor: 8, descripcion: '$8 de descuento directo en cualquier servicio de belleza.' },
        ],
        rewards: [
            { nombre: 'Diseño de Cejas Gratis', descripcion: 'Canjea 250 puntos y obtén un perfilado y diseño de cejas gratuito.', costoPuntos: 250, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Manicura Express Gratis', descripcion: 'Canjea 350 puntos por un servicio express de esmaltado y manicura.', costoPuntos: 350, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Extensiones de Pestañas Gratis', descripcion: 'Canjea 500 puntos por la aplicación de extensiones de pestañas clásicas.', costoPuntos: 500, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Tratamiento Capilar Hidratante', descripcion: 'Canjea 300 puntos por un tratamiento de hidratación profunda para el cabello.', costoPuntos: 300, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Kit de Cuidado Personal', descripcion: 'Canjea 200 puntos por un kit de productos de cuidado personal de la marca.', costoPuntos: 200, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
        ]
    },
    GIMNASIO: {
        coupons: [
            { codigo: 'PRO_FIT10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento en compra de proteínas o suplementos.' },
            { codigo: 'MEMBRESIA15', tipo: 'PORCENTAJE', valor: 15, descripcion: '15% de descuento en renovación de membresía mensual.' },
            { codigo: 'CLASE_GRATIS', tipo: 'PORCENTAJE', valor: 100, descripcion: 'Clase grupal gratuita para probar nuestras actividades.' },
            { codigo: 'AMIGO_FIT', tipo: 'PORCENTAJE', valor: 20, descripcion: '20% de descuento al traer a un amigo que se inscriba.' },
            { codigo: 'FIJO_GYM', tipo: 'FIJO', valor: 10, descripcion: '$10 de descuento en cualquier plan de entrenamiento.' },
        ],
        rewards: [
            { nombre: 'Pase Diario para un Amigo', descripcion: 'Canjea 150 puntos por un pase de un día libre para invitar a entrenar a quien quieras.', costoPuntos: 150, tipo: 'REGALO', deliveryType: 'AUTOMATICO' },
            { nombre: 'Shaker Deportivo', descripcion: 'Canjea 200 puntos por un mezclador deportivo en recepción.', costoPuntos: 200, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
            { nombre: 'Sesión de Evaluación Física Gratis', descripcion: 'Canjea 300 puntos por una evaluación física completa con un entrenador.', costoPuntos: 300, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Mes de Membresía Gratis', descripcion: 'Canjea 1000 puntos y obtén un mes de membresía completamente gratuito.', costoPuntos: 1000, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Pack de Proteína', descripcion: 'Canjea 400 puntos por un pack de proteína en polvo de la tienda del gimnasio.', costoPuntos: 400, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
        ]
    },
    CLINICA: {
        coupons: [
            { codigo: 'CONSULTA10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento en consulta médica o de especialidad.' },
            { codigo: 'EXAMEN15', tipo: 'PORCENTAJE', valor: 15, descripcion: '15% de descuento en exámenes de laboratorio o imagen.' },
            { codigo: 'PRIMERA_CITA', tipo: 'PORCENTAJE', valor: 20, descripcion: '20% de descuento en tu primera consulta médica.' },
            { codigo: 'PREVENTION', tipo: 'PORCENTAJE', valor: 12, descripcion: '12% de descuento en chequeos preventivos y medicina general.' },
            { codigo: 'SALUD_FIJO', tipo: 'FIJO', valor: 10, descripcion: '$10 de descuento en cualquier servicio de la clínica.' },
        ],
        rewards: [
            { nombre: 'Consulta de Seguimiento Gratis', descripcion: 'Canjea 400 puntos por una consulta de seguimiento médico sin costo.', costoPuntos: 400, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Examen de Glucosa Gratis', descripcion: 'Canjea 200 puntos por un examen rápido de glucosa en sangre.', costoPuntos: 200, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Kit de Salud Preventiva', descripcion: 'Canjea 300 puntos por un kit de insumos de salud preventiva.', costoPuntos: 300, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
            { nombre: 'Descuento $20 en Próxima Consulta', descripcion: 'Canjea 250 puntos y recibe $20 de descuento en tu próxima visita médica.', costoPuntos: 250, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Limpieza Dental Básica Gratis', descripcion: 'Canjea 500 puntos por una limpieza dental básica en nuestra clínica.', costoPuntos: 500, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
        ]
    },
    GENERAL: {
        coupons: [
            { codigo: 'BIENVENIDA10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento de bienvenida en tu primera compra.' },
            { codigo: 'FIEL15', tipo: 'PORCENTAJE', valor: 15, descripcion: '15% de descuento exclusivo para clientes frecuentes.' },
            { codigo: 'ESPECIAL20', tipo: 'PORCENTAJE', valor: 20, descripcion: '20% de descuento en servicios o productos seleccionados.' },
            { codigo: 'REFERIDO10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento por referir a un amigo.' },
            { codigo: 'GENERAL_FIJO', tipo: 'FIJO', valor: 5, descripcion: '$5 de descuento directo en cualquier servicio.' },
        ],
        rewards: [
            { nombre: 'Servicio Express Gratis', descripcion: 'Canjea 300 puntos por un servicio complementario express de tu elección.', costoPuntos: 300, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Descuento $10 en Próxima Visita', descripcion: 'Canjea 200 puntos y recibe $10 de descuento en tu próxima visita.', costoPuntos: 200, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Regalo Sorpresa', descripcion: 'Canjea 250 puntos y llévate un regalo sorpresa de la casa.', costoPuntos: 250, tipo: 'REGALO', deliveryType: 'MANUAL' },
            { nombre: 'Membresía VIP por 1 Mes', descripcion: 'Canjea 500 puntos y disfruta de un mes con beneficios VIP exclusivos.', costoPuntos: 500, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Producto de la Marca Gratis', descripcion: 'Canjea 180 puntos por un producto de nuestra marca como agradecimiento.', costoPuntos: 180, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
        ]
    }
};

// ─── Mapeo de sector a categoría ─────────────────────────────────────────────
function mapSectorToCategory(tipoNegocio) {
    const sector = (tipoNegocio || '').toLowerCase().trim();
    if (sector.includes('barber')) return 'BARBERIA';
    if (sector.includes('spa') || sector.includes('masaje')) return 'SPA';
    if (sector.includes('estét') || sector.includes('belleza') || sector.includes('estet')) return 'BELLEZA';
    if (sector.includes('clínic') || sector.includes('clinic') || sector.includes('salud')) return 'CLINICA';
    if (sector.includes('gimnasio') || sector.includes('gym') || sector.includes('entrena') || sector.includes('fit') || sector.includes('academia')) return 'GIMNASIO';
    return 'GENERAL';
}

// ─── Instalar catálogo de cupones y premios para un negocio ──────────────────
async function createCatalogForBusiness(negocioId, category) {
    const catalog = defaultCatalogBySector[category] || defaultCatalogBySector['GENERAL'];
    let couponsCreated = 0;
    let rewardsCreated = 0;

    for (const cp of catalog.coupons) {
        const existing = await prisma.coupon.findFirst({ where: { negocioId, codigo: cp.codigo } });
        if (!existing) {
            await prisma.coupon.create({
                data: {
                    id: uuidv4(),
                    negocioId,
                    codigo: cp.codigo,
                    tipo: cp.tipo,
                    valor: cp.valor,
                    descripcion: cp.descripcion,
                    usosActuales: 0,
                    activa: true
                }
            });
            couponsCreated++;
        }
    }

    for (const rw of catalog.rewards) {
        const existing = await prisma.loyaltyReward.findFirst({ where: { negocioId, nombre: rw.nombre } });
        if (!existing) {
            await prisma.loyaltyReward.create({
                data: {
                    id: uuidv4(),
                    negocioId,
                    nombre: rw.nombre,
                    descripcion: rw.descripcion,
                    costoPuntos: rw.costoPuntos,
                    tipo: rw.tipo,
                    deliveryType: rw.deliveryType,
                    activa: true
                }
            });
            rewardsCreated++;
        }
    }

    return { couponsCreated, rewardsCreated };
}

// ─── Instalar plantilla de misiones para un negocio ──────────────────────────
async function installDefaultTemplateForBusiness(negocioId, tipoNegocio) {
    const category = mapSectorToCategory(tipoNegocio);

    // 1. Buscar plantilla predeterminada
    let template = await prisma.questTemplate.findFirst({
        where: {
            esPredeterminada: true,
            categorias: { path: [], array_contains: category }
        },
        include: { Missions: true }
    });

    if (!template) {
        template = await prisma.questTemplate.findFirst({
            where: { esPredeterminada: true },
            include: { Missions: true }
        }) || await prisma.questTemplate.findFirst({
            where: { featured: true },
            include: { Missions: true }
        }) || await prisma.questTemplate.findFirst({
            include: { Missions: true }
        });
    }

    if (!template) {
        console.log(`   ⚠️ No se encontró plantilla disponible para el sector "${tipoNegocio}".`);
        return false;
    }

    console.log(`   ▶ Instalando plantilla "${template.nombre}" (v${template.versionSemantica})...`);

    // 2. Crear Snapshot
    const snapshotData = {
        templateId: template.id,
        nombre: template.nombre,
        versionSemantica: template.versionSemantica,
        Missions: template.Missions.map((m) => ({
            id: m.id,
            nombre: m.nombre,
            triggerEvent: m.triggerEvent,
            acciones: m.acciones,
        })),
        timestamp: new Date().toISOString(),
    };

    await prisma.installedTemplateSnapshot.create({
        data: {
            id: uuidv4(),
            negocioId,
            templateId: template.id,
            versionCopy: template.versionSemantica,
            snapshotData,
        },
    });

    // 3. Buscar o crear campaña
    let campaign = await prisma.campaign.findFirst({
        where: { negocioId, nombre: `Campaña ${template.nombre}` }
    });

    if (!campaign) {
        campaign = await prisma.campaign.create({
            data: {
                negocioId,
                nombre: `Campaña ${template.nombre}`,
                descripcion: template.descripcion,
                activa: true,
            }
        });
    }

    // 4. Limpiar misiones previas de esta plantilla (evitar duplicados)
    await prisma.quest.deleteMany({
        where: { negocioId, templateIdOrigen: template.id },
    });

    // 5. Copiar misiones
    for (const m of template.Missions) {
        await prisma.quest.create({
            data: {
                id: uuidv4(),
                negocioId,
                campaignId: campaign.id,
                nombre: m.nombre,
                descripcion: m.descripcion,
                imagenUrl: m.imagenUrl || null,
                icono: m.icono,
                color: m.color,
                visible: m.visible,
                repetible: m.repetible,
                limiteUsuario: m.limiteUsuario,
                limiteGlobal: m.limiteGlobal,
                fechaInicio: m.fechaInicio,
                fechaFin: m.fechaFin,
                activa: m.activa,
                parentQuestId: m.parentQuestId || null,
                segmentacion: m.segmentacion || null,
                validacionTipo: m.validacionTipo,
                difficulty: m.difficulty,
                xp: m.xp,
                estimatedMinutes: m.estimatedMinutes,
                estimatedDays: m.estimatedDays,
                triggerEvent: m.triggerEvent,
                servicioId: m.servicioId || null,
                montoMinimo: m.montoMinimo || null,
                cantidadMeta: m.cantidadMeta,
                condicionesExtra: m.condicionesExtra || null,
                acciones: m.acciones || [],
                origen: 'PLANTILLA',
                templateIdOrigen: template.id,
                templateVersionOrigen: template.versionSemantica,
                modificadaLocalmente: false,
            },
        });
    }

    // 6. Crear catálogo de cupones y premios
    const { couponsCreated, rewardsCreated } = await createCatalogForBusiness(negocioId, category);
    console.log(`   💎 Cupones creados: ${couponsCreated} | Premios creados: ${rewardsCreated}`);

    // 7. Registrar instalación
    await prisma.installedTemplate.upsert({
        where: {
            negocioId_templateId: { negocioId, templateId: template.id },
        },
        update: {
            versionInstalada: template.versionSemantica,
            estadoActualizacion: 'UP_TO_DATE',
            reinstalledAt: new Date(),
        },
        create: {
            id: uuidv4(),
            negocioId,
            templateId: template.id,
            versionInstalada: template.versionSemantica,
            estadoActualizacion: 'UP_TO_DATE',
        },
    });

    // 8. Incrementar contador
    await prisma.questTemplate.update({
        where: { id: template.id },
        data: { installCount: { increment: 1 } },
    });

    return true;
}

async function main() {
    console.log('🔍 Buscando negocios existentes en el sistema...');

    const negocios = await prisma.negocio.findMany({
        select: { id: true, nombre: true, configuracion: true }
    });

    console.log(`📋 Total de negocios encontrados: ${negocios.length}`);

    let exitosos = 0;
    let fallidos = 0;

    for (const n of negocios) {
        const config = n.configuracion || {};
        const tipoNegocio = config.tipoNegocio || 'General';
        const category = mapSectorToCategory(tipoNegocio);

        console.log(`\n🏢 Procesando: "${n.nombre}" (${n.id}) - Sector: "${tipoNegocio}" → Categoría: "${category}"`);

        try {
            const success = await installDefaultTemplateForBusiness(n.id, tipoNegocio);
            if (success) {
                console.log(`   ✅ Sincronización exitosa.`);
                exitosos++;
            } else {
                console.log(`   ⚠️ Sincronización omitida (sin plantilla disponible).`);
            }
        } catch (err) {
            console.error(`   ❌ Error al sincronizar negocio "${n.nombre}":`, err.message);
            fallidos++;
        }
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`✨ Sincronización finalizada.`);
    console.log(`   ✅ Exitosos: ${exitosos} | ❌ Fallidos: ${fallidos}`);
    console.log(`${'─'.repeat(60)}`);
}

main()
    .catch(e => {
        console.error('❌ Error general:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
