/**
 * scripts/crear-demos.cjs — Crea un negocio DEMO de cada tipo en la base de datos LOCAL.
 *
 * Uso (desde la carpeta del proyecto):
 *     node scripts/crear-demos.cjs
 *
 * - Solo para desarrollo/pruebas. NO lo ejecutes contra la base de producción.
 * - Se puede correr varias veces: si un demo ya existe, solo actualiza su usuario admin.
 * - Al terminar imprime la lista de usuarios para entrar al panel de cada demo.
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Credenciales de prueba (solo locales). Todas las cuentas demo usan la misma.
const DEMO_PASSWORD = 'CitioxDemo-2026';
const EMAIL_DOMAIN = 'demo.citiox.test';

// ── Cargar .env ──────────────────────────────────────────────────────
try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
            const m = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
            if (!m) return;
            let val = m[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
            if (!process.env[m[1].trim()]) process.env[m[1].trim()] = val;
        });
    }
} catch (e) { /* sin .env */ }

function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
    if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
        if (!process.argv.includes('--permitir-postgres')) {
            console.error('⛔ DATABASE_URL apunta a PostgreSQL (posible producción). Este script es solo para la base local.');
            console.error('   Si de verdad quieres usarlo ahí, agrega --permitir-postgres');
            process.exit(1);
        }
        const { Pool } = require('pg');
        const { PrismaPg } = require('@prisma/adapter-pg');
        return new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: dbUrl })) });
    }
    const { PrismaLibSql } = require('@prisma/adapter-libsql');
    let resolvedUrl = dbUrl;
    if (!dbUrl.startsWith('file://')) {
        const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
        const isAbs = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
        const abs = (isAbs ? rawPath : `${process.cwd()}/${rawPath}`).split(/[/\\]/).join('/');
        resolvedUrl = `file://${abs.match(/^[a-zA-Z]:/) ? '/' : ''}${abs}`;
    }
    return new PrismaClient({ adapter: new PrismaLibSql({ url: resolvedUrl }) });
}

const prisma = createPrismaClient();
const U = (id, w = 800, h = 600) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=75`;

// ── Datos de los demos ───────────────────────────────────────────────
const CLIENTES = [
    ['Sofía Martínez', '0991112233'], ['Carlos Andrade', '0992223344'], ['Valentina Ruiz', '0993334455'],
    ['Diego Herrera', '0994445566'], ['Camila Torres', '0995556677'], ['Mateo Salazar', '0996667788'],
];
const COMENTARIOS = [
    [5, 'Excelente atención, súper puntuales. ¡Vuelvo seguro!'],
    [5, 'Me encantó el resultado y el trato fue muy amable.'],
    [4, 'Muy buen servicio, el lugar es limpio y cómodo.'],
    [5, 'Reservar desde el celular fue facilísimo.'],
];

const DEMOS = [
    {
        key: 'spa', slug: 'demo-spa', nombre: 'Aura Spa & Bienestar', tipo: 'RESERVA', blueprint: 'SPA_LUXURY_STANDARD', family: 'SERVICIOS', plan: 'plan_servicios_pro',
        color: '#0d9488', color2: '#134e4a', ciudad: 'Quito', propietario: 'Ana Valenzuela',
        hero: ['Tu refugio de calma', 'Masajes, faciales y rituales para desconectarte.'],
        logo: U('1540555700478-4be289fbecef', 200, 200), banner: U('1544161515-4ab6ce6db874', 1400, 700),
        bienvenida: 'Respira, relájate y déjate consentir.',
        servicios: [
            ['Masaje relajante 60 min', 60, 45, U('1544022613-e87ca75a784a')],
            ['Limpieza facial profunda', 60, 40, U('1512290923902-8a9f81dc236c')],
            ['Piedras calientes', 75, 55, U('1600334089648-b0d9d3028eb2')],
            ['Manicure spa', 45, 20, U('1604654894610-df63bc536371')],
        ],
        equipo: [['Ana Valenzuela', 'Cosmiatra', U('1573496359142-b8d87734a5a2', 300, 300)], ['Lucía Méndez', 'Masajista', U('1580489944761-15a19d654956', 300, 300)]],
        promo: ['Relax total', 'Masaje 60 min + facial a precio especial.', 70, 85, U('1515377905703-c4788e51af15')],
        resultado: ['Piel luminosa', 'Antes y después de 3 sesiones de hidratación.', U('1512290923902-8a9f81dc236c', 500, 500), U('1522337360788-8b13dee7a37e', 500, 500)],
    },
    {
        key: 'barberia', slug: 'demo-barberia', nombre: 'Barbería El Clásico', tipo: 'RESERVA', blueprint: 'BARBERSHOP_STANDARD', family: 'SERVICIOS', plan: 'plan_servicios_pro',
        color: '#b45309', color2: '#1c1917', ciudad: 'Guayaquil', propietario: 'Sebastián Castro',
        hero: ['Corte clásico, estilo moderno', 'Reserva tu turno en segundos.'],
        logo: U('1503951914875-452162b0f3f1', 200, 200), banner: U('1585747860715-2ba37e788b70', 1400, 700),
        bienvenida: 'Café de cortesía mientras esperas.',
        servicios: [
            ['Corte de cabello', 30, 12, U('1599351431202-1e0f0137899a')],
            ['Corte + barba', 50, 18, U('1621605815971-fbc98d665033')],
            ['Perfilado de barba', 20, 8, U('1593702295094-aec22597af65')],
        ],
        equipo: [['Sebastián Castro', 'Barbero', U('1500648767791-00dcc994a43e', 300, 300)], ['Mateo Ruiz', 'Barbero', U('1507003211169-0a1dd7228f2d', 300, 300)]],
        promo: ['Jueves de barba', 'Corte + barba con 20% de descuento.', 14, 18, U('1621605815971-fbc98d665033')],
    },
    {
        key: 'dental', slug: 'demo-dental', nombre: 'Clínica Dental Sonríe', tipo: 'ODONTOLOGIA', blueprint: 'DENTAL', family: 'DENTISTA', plan: 'plan_dentistas_pro',
        color: '#0284c7', color2: '#0c4a6e', ciudad: 'Cuenca', propietario: 'Dr. Alejandro Ríos',
        hero: ['Sonrisas sanas y bonitas', 'Odontología general, estética y ortodoncia.'],
        logo: U('1629909613654-28e377c37b09', 200, 200), banner: U('1588776814546-1ffcf47267a5', 1400, 700),
        servicios: [
            ['Consulta general', 30, 20, U('1588776814546-1ffcf47267a5')],
            ['Limpieza dental', 45, 35, U('1629909613654-28e377c37b09')],
            ['Blanqueamiento', 60, 120, U('1606811971618-4486d14f3f99')],
        ],
        equipo: [['Dr. Alejandro Ríos', 'Odontólogo', U('1622253692010-333f2da6031d', 300, 300)], ['Dra. Sofía Vargas', 'Ortodoncista', U('1559839734-2b71ea197ec2', 300, 300)]],
        promo: ['Sonrisa radiante', 'Limpieza + blanqueamiento.', 130, 155, U('1606811971618-4486d14f3f99')],
    },
    {
        key: 'gym', slug: 'demo-gym', nombre: 'Vortex Fitness Club', tipo: 'GIMNASIO', blueprint: 'GYM', family: 'SERVICIOS', plan: 'plan_servicios_pro',
        color: '#ea580c', color2: '#0f172a', ciudad: 'Quito', propietario: 'Martín Silva',
        hero: ['Entrena a tu ritmo', 'Musculación, funcional y clases grupales.'],
        logo: U('1534438327276-14e5300c3a48', 200, 200), banner: U('1517838277536-f5f99be501cd', 1400, 700),
        servicios: [['Entrenamiento personal', 60, 15, U('1571019613454-1cb2f99b2d8b')]],
        equipo: [['Martín Silva', 'Entrenador', U('1568602471122-7832951cc4c5', 300, 300)]],
        membresias: [['Mensual', 30, 35, ['Acceso ilimitado', 'Clases grupales']], ['Trimestral', 90, 90, ['Acceso ilimitado', 'Clases grupales', '1 evaluación']], ['Anual', 365, 300, ['Todo incluido', 'Plan nutricional']]],
        areas: [['Zona de pesas', U('1534438327276-14e5300c3a48', 600, 800)], ['Cardio', U('1576678927484-cc907957088c', 600, 800)], ['Funcional', U('1517836357463-d25dfeac3438', 600, 800)]],
    },
    {
        key: 'canchas', slug: 'demo-canchas', nombre: 'Complejo Deportivo Los Campeones', tipo: 'SPORTS_COURTS', blueprint: 'PADEL_CLUB_STANDARD', family: 'CANCHAS', plan: 'plan_canchas_academia',
        color: '#16a34a', color2: '#14532d', ciudad: 'Quito', propietario: 'Luis Paredes',
        hero: ['Reserva tu cancha', 'Fútbol 5, pádel y más, abierto todos los días.'],
        logo: U('1574629810360-7efbbe195018', 200, 200), banner: U('1529900748604-07564a03e7a6', 1400, 700),
        servicios: [
            ['Cancha sintética fútbol 5', 60, 30, U('1529900748604-07564a03e7a6')],
            ['Cancha de pádel', 90, 25, U('1626224583764-f87db24ac4ea')],
            ['Cancha de tenis', 60, 20, U('1554068865-24cecd4e34b8')],
        ],
    },
    {
        key: 'restaurante', slug: 'demo-restaurante', nombre: 'La Parrilla de Don Julio', tipo: 'RESTAURANT', blueprint: 'RESTAURANT_STANDARD', family: 'RESTAURANTE', plan: 'plan_restaurante_pro',
        color: '#dc2626', color2: '#450a0a', ciudad: 'Guayaquil', propietario: 'Julio Andrade',
        hero: ['Carnes a la parrilla', 'Pide en mesa, para llevar o a domicilio.'],
        logo: U('1555396273-367ea4eb4db5', 200, 200), banner: U('1544025162-d76694265947', 1400, 700),
        menu: {
            'Parrilla': [['Bife de chorizo 400 g', 18.5, U('1558030006-450675393462')], ['Costillas BBQ', 15, U('1544025162-d76694265947')], ['Pollo a la brasa', 11, U('1598103442097-8b74394b95c6')]],
            'Entradas': [['Empanadas (3)', 6, U('1601050690597-df0568f70950')], ['Provoleta', 7, U('1559847844-5315695dadae')]],
            'Bebidas': [['Limonada', 3, U('1621263764928-df1444c5e859')], ['Jugo natural', 3.5, U('1600271886742-f049cd451bba')]],
        },
        mesas: 6,
    },
    {
        key: 'tienda', slug: 'demo-tienda', nombre: 'Boutique Trendy', tipo: 'TIENDA', blueprint: 'STORE_STANDARD', family: 'TIENDA', plan: 'plan_tienda_pro',
        color: '#7c3aed', color2: '#2e1065', ciudad: 'Quito', propietario: 'Paula Jiménez',
        hero: ['Moda que te representa', 'Compra online y recibe en casa.'],
        logo: U('1441986300917-64674bd600d8', 200, 200), banner: U('1441984904996-e0b6ba687e04', 1400, 700),
        menu: {
            'Ropa': [['Blusa de lino', 29, U('1434389677669-e08b4cac3105')], ['Jean mom fit', 39, U('1541099649105-f69ad21f3246')], ['Vestido floral', 45, U('1595777457583-95e059d581b8')]],
            'Accesorios': [['Bolso de cuero', 55, U('1584917865442-de89df76afd3')], ['Gafas de sol', 22, U('1511499767150-a48a237f0083')]],
        },
    },
    {
        key: 'cafeteria', slug: 'demo-cafeteria', nombre: 'Café & Pan La Tradicional', tipo: 'CAFETERIA', blueprint: 'CAFETERIA', family: 'RESTAURANTE', plan: 'plan_restaurante_pro',
        color: '#92400e', color2: '#451a03', ciudad: 'Cuenca', propietario: 'Rosa Cárdenas',
        hero: ['Café recién hecho', 'Pan artesanal todos los días desde las 7:00.'],
        logo: U('1509042239860-f550ce710b93', 200, 200), banner: U('1495474472287-4d71bcdd2085', 1400, 700),
        menu: {
            'Café': [['Capuchino', 2.75, U('1572442388796-11668a67e53d')], ['Americano', 1.75, U('1514432324607-a09d9b4aefdd')]],
            'Panadería': [['Croissant', 1.5, U('1555507036-ab1f4038808a')], ['Pan de yuca (6)', 2.5, U('1509440159596-0249088772ff')]],
            'Postres': [['Cheesecake', 3.5, U('1533134242443-d4fd215305ad')]],
        },
    },
    {
        key: 'lavanderia', slug: 'demo-lavanderia', nombre: 'Bubble Wash Lavandería', tipo: 'LAVANDERIA', blueprint: 'LAVANDERIA', family: 'LAVANDERIA', plan: 'plan_lavanderia_pro',
        color: '#0891b2', color2: '#164e63', ciudad: 'Quito', propietario: 'Andrea Molina',
        hero: ['Tu ropa impecable', 'Lavado, secado y planchado con retiro a domicilio.'],
        logo: U('1545173168-9f1947eebb7f', 200, 200), banner: U('1517677208171-0bc6725a3e60', 1400, 700),
        servicios: [
            ['Lavado y secado por kilo', 60, 1.5, U('1517677208171-0bc6725a3e60')],
            ['Planchado de camisas', 30, 1, U('1489274495757-95c7c837b101')],
            ['Limpieza de zapatos', 120, 8, U('1560769629-975ec94e6a86')],
        ],
    },
];

// ── Utilidades ───────────────────────────────────────────────────────
const now = () => new Date();
// Fecha "local" de Ecuador guardada a medianoche UTC (así guarda la app las citas)
function utcDay(offsetDays) {
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const d = new Date(`${key}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d;
}
function addMin(hhmm, min) {
    const [h, m] = hhmm.split(':').map(Number);
    const t = h * 60 + m + min;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
async function safe(label, fn) {
    try { return await fn(); } catch (e) { console.log(`   ⚠️  ${label}: ${String(e.message || e).split('\n').slice(-1)[0]}`); return null; }
}
async function media(negocioId, id, url, category) {
    return prisma.media.create({ data: { id, businessId: negocioId, url, fileKey: `demo/${id}.jpg`, provider: 'local', mimeType: 'image/jpeg', size: 1024, category } });
}

// Sucursal + bodega física: la caja (POS) las necesita para poder vender.
async function asegurarCaja(negocioId) {
    let branch = await prisma.branch.findFirst({ where: { businessId: negocioId, isMain: true } })
        || await prisma.branch.findFirst({ where: { businessId: negocioId } });
    if (!branch) {
        branch = await prisma.branch.create({
            data: { businessId: negocioId, name: 'Sede principal', slug: 'principal', code: 'PRINCIPAL', address: 'Av. Amazonas N24-03', isMain: true, active: true },
        });
    }
    const bodega = await prisma.warehouse.findFirst({
        where: { businessId: negocioId, branchId: branch.id, active: true, type: { notIn: ['TRANSIT', 'SCRAP_WASTE'] } },
    });
    if (!bodega) {
        await prisma.warehouse.create({
            data: { businessId: negocioId, branchId: branch.id, name: 'Bodega principal', code: 'BOD-01', type: 'PHYSICAL', isDefault: true, active: true },
        });
    }
}

// ── Creación ─────────────────────────────────────────────────────────
async function crearDemo(d, passwordHash) {
    const negocioId = `demo-${d.key}`;
    const email = `${d.key}@${EMAIL_DOMAIN}`;

    const existente = await prisma.negocio.findUnique({ where: { slug: d.slug } });
    if (existente) {
        await prisma.usuario.upsert({
            where: { email },
            update: { password: passwordHash, negocioId: existente.id, role: 'ADMIN' },
            create: { id: `usr-${d.key}`, nombre: d.propietario, email, password: passwordHash, role: 'ADMIN', negocioId: existente.id, updatedAt: now() },
        });
        await safe('caja', () => asegurarCaja(existente.id));
        console.log(`⏭️  ${d.nombre}: ya existía, actualicé su usuario y su caja.`);
        return email;
    }

    console.log(`📦 Creando ${d.nombre}...`);
    const config = {
        wizardCompleted: true, setupCompleted: true, isDemo: true,
        tipoNegocio: d.tipo, blueprintId: d.blueprint, planFamilyCode: d.family,
        bannerUrl: d.banner, bannerUrls: [d.banner], timezone: 'America/Guayaquil', currency: 'USD', language: 'es',
        activeCapabilities: { promotions: true, loyalty: true, communications: true, courses: d.key === 'spa' || d.key === 'canchas' },
    };

    await prisma.negocio.create({
        data: {
            id: negocioId, nombre: d.nombre, slug: d.slug, tipoNegocio: d.tipo,
            whatsapp: '593990000000', propietario: d.propietario, emailContacto: email,
            direccion: 'Av. Amazonas N24-03', ciudad: d.ciudad,
            horarioApertura: '08:00', horarioCierre: '20:00', precioHora: 0,
            logoUrl: d.logo, estado: 'ACTIVO', colorPrimario: d.color, colorSecundario: d.color2,
            heroTitulo: d.hero[0], heroSubtitulo: d.hero[1], mensajeBienvenida: d.bienvenida || null,
            isDemo: true, configuracion: config, updatedAt: now(),
        },
    });

    const ubic = await prisma.ubicacion.create({ data: { id: `loc-${d.key}`, nombre: 'Sede principal', direccion: 'Av. Amazonas N24-03', negocioId, updatedAt: now() } });

    await prisma.usuario.upsert({
        where: { email },
        update: { password: passwordHash, negocioId, role: 'ADMIN' },
        create: { id: `usr-${d.key}`, nombre: d.propietario, email, password: passwordHash, role: 'ADMIN', negocioId, updatedAt: now() },
    });

    await safe('caja', () => asegurarCaja(negocioId));

    const plan = await prisma.plan.findUnique({ where: { id: d.plan } }) || await prisma.plan.findFirst();
    if (plan) {
        await safe('suscripción', () => prisma.suscripcion.create({
            data: { id: `sub-${d.key}`, negocioId, planId: plan.id, estado: 'active', fechaInicio: now(), fechaFin: new Date(Date.now() + 365 * 864e5), isFounder: false, updatedAt: now() },
        }));
    }

    await safe('banner', () => prisma.imagen.create({ data: { id: `img-banner-${d.key}`, url: d.banner, tipo: 'BANNER', esBanner: true, negocioId, createdAt: now() } }));

    // Servicios / canchas
    const serviceIds = [];
    for (const [i, [nombre, dur, precio, img]] of (d.servicios || []).entries()) {
        const mId = `med-srv-${d.key}-${i}`;
        await media(negocioId, mId, img, 'service');
        const s = await prisma.service.create({
            data: { id: `srv-${d.key}-${i}`, nombre, duracion: dur, precio, negocioId, imageMediaId: mId, ubicacionId: ubic.id, extraInfo: { descripcion: `${nombre} con atención personalizada.` }, updatedAt: now() },
        });
        await safe('imagen servicio', () => prisma.imagen.create({ data: { id: `img-srv-${d.key}-${i}`, url: img, negocioId, serviceId: s.id, createdAt: now() } }));
        serviceIds.push({ id: s.id, dur, precio });
    }

    // Equipo
    const staffIds = [];
    for (const [i, [name, role, img]] of (d.equipo || []).entries()) {
        const mId = `med-stf-${d.key}-${i}`;
        await media(negocioId, mId, img, 'staff');
        const st = await prisma.staff.create({
            data: { id: `stf-${d.key}-${i}`, businessId: negocioId, name, role, active: true, imageMediaId: mId, workingHours: {}, updatedAt: now(), Service: { connect: serviceIds.map(s => ({ id: s.id })) } },
        });
        for (let day = 0; day <= 6; day++) {
            await prisma.staffSchedule.create({ data: { id: `sch-${d.key}-${i}-${day}`, staffId: st.id, dayOfWeek: day, startTime: '08:00', endTime: '20:00', active: day !== 0 } });
        }
        staffIds.push(st.id);
    }

    // Productos (restaurante, tienda, cafetería)
    if (d.menu) {
        let orden = 0;
        for (const [cat, items] of Object.entries(d.menu)) {
            const c = await prisma.categoriaProducto.create({ data: { nombre: cat, negocioId, orden: orden++ } });
            for (const [i, [nombre, precio, img]] of items.entries()) {
                await prisma.producto.create({ data: { nombre, precio, imagenUrl: img, negocioId, categoriaId: c.id, orden: i, stock: 50, descripcion: `${nombre}, preparado al momento.` } });
            }
        }
    }
    if (d.mesas) {
        for (let i = 1; i <= d.mesas; i++) {
            await safe('mesa', () => prisma.restaurantTable.create({ data: { negocioId, nombre: `Mesa ${i}`, numero: i } }));
        }
    }

    // Gimnasio
    for (const [i, [name, days, price, benefits]] of (d.membresias || []).entries()) {
        await safe('membresía', () => prisma.membershipPlan.create({ data: { businessId: negocioId, name, price, durationDays: days, benefits, displayOrder: i, featured: i === 1, description: `Plan ${name.toLowerCase()} con acceso completo.` } }));
    }
    for (const [i, [name, img]] of (d.areas || []).entries()) {
        await safe('área gym', () => prisma.gymArea.create({ data: { businessId: negocioId, name, imageUrl: img, order: i, description: `Equipada con máquinas de última generación.` } }));
    }

    // Promoción
    if (d.promo) {
        const [titulo, descripcion, precioPromo, precioAnterior, img] = d.promo;
        const mId = `med-prm-${d.key}`;
        await media(negocioId, mId, img, 'promotion');
        await safe('promoción', () => prisma.promotion.create({
            data: { id: `prm-${d.key}`, businessId: negocioId, titulo, descripcion, precioPromo, precioAnterior, imagenUrl: img, imageMediaId: mId, fechaInicio: now(), fechaFin: new Date(Date.now() + 30 * 864e5), estado: 'publicado', updatedAt: now() },
        }));
    }

    // Resultado antes/después
    if (d.resultado) {
        const [title, description, before, after] = d.resultado;
        await safe('resultado', () => prisma.resultado.create({
            data: { id: `res-${d.key}`, businessId: negocioId, title, description, beforeImage: before, afterImage: after, type: 'BEFORE_AFTER', serviceId: serviceIds[0]?.id || null, staffId: staffIds[0] || null, published: true, createdAt: now(), updatedAt: now() },
        }));
    }

    // Clientes + citas (pasadas completadas, hoy y próximos días) + opiniones
    const clienteIds = [];
    for (const [i, [nombre, tel]] of CLIENTES.entries()) {
        const c = await prisma.cliente.create({ data: { id: `cli-${d.key}-${i}`, nombre, telefono: tel, email: `cliente${i}@${EMAIL_DOMAIN}`, negocioId, updatedAt: now() } });
        clienteIds.push(c.id);
    }
    if (serviceIds.length > 0) {
        const plan = [
            // [díaOffset, hora, estado]
            [-20, '10:00', 'completed'], [-12, '11:00', 'completed'], [-6, '15:00', 'completed'], [-3, '09:00', 'completed'], [-1, '16:00', 'completed'],
            [0, '09:00', 'confirmed'], [0, '11:30', 'pending'], [0, '15:00', 'confirmed'], [0, '17:30', 'pending'],
            [1, '10:00', 'confirmed'], [1, '14:00', 'pending'], [2, '12:00', 'confirmed'], [4, '16:00', 'confirmed'],
        ];
        let ratingIdx = 0;
        for (const [i, [off, hora, estado]] of plan.entries()) {
            const srv = serviceIds[i % serviceIds.length];
            const apt = await prisma.appointment.create({
                data: {
                    id: `apt-${d.key}-${i}`, fecha: utcDay(off), horaInicio: hora, horaFin: addMin(hora, srv.dur), duracion: srv.dur,
                    estado, pagoEstado: estado === 'completed' ? 'PAGADO' : 'PENDIENTE', total: srv.precio || 0,
                    clienteId: clienteIds[i % clienteIds.length], serviceId: srv.id, staffId: staffIds.length ? staffIds[i % staffIds.length] : null,
                    negocioId, updatedAt: now(),
                },
            });
            if (estado === 'completed' && ratingIdx < COMENTARIOS.length) {
                const [stars, comment] = COMENTARIOS[ratingIdx++];
                await safe('opinión', () => prisma.rating.create({ data: { appointmentId: apt.id, raterId: apt.clienteId, ratedId: negocioId, raterRole: 'client', ratedRole: 'professional', stars, comment } }));
            }
        }
    }

    console.log(`   ✅ listo: http://localhost:3000/${d.slug}`);
    return email;
}

async function main() {
    console.log('🚀 Creando negocios demo en la base LOCAL...\n');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const cuentas = [];
    for (const d of DEMOS) {
        try {
            const email = await crearDemo(d, passwordHash);
            cuentas.push([d.nombre, d.slug, email]);
        } catch (e) {
            console.error(`❌ ${d.nombre}: ${e.message}`);
        }
    }
    // Cuenta de superadmin local (solo para probar el panel /superadmin en tu computadora)
    const superEmail = 'superadmin@demo.citiox.test';
    const superOk = await safe('superadmin', () => prisma.usuario.upsert({
        where: { email: superEmail },
        update: { password: passwordHash, role: 'SUPER_ADMIN', negocioId: null },
        create: { id: 'usr-superadmin-demo', nombre: 'Superadmin Demo', email: superEmail, password: passwordHash, role: 'SUPER_ADMIN', updatedAt: now() },
    }));
    if (superOk) cuentas.push(['Superadmin (panel /superadmin)', 'superadmin', superEmail]);

    console.log('\n──────────────────────────────────────────────');
    console.log('Usuarios para entrar al panel (http://localhost:3000/login)');
    console.log(`Contraseña de todos: ${DEMO_PASSWORD}\n`);
    for (const [nombre, slug, email] of cuentas) console.log(`• ${nombre.padEnd(34)} ${email.padEnd(32)} /${slug}`);
    console.log('──────────────────────────────────────────────');
    await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
