const path = require('path');
const fs = require('fs');

let envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  envPath = path.join(process.cwd(), '.env');
}
if (!fs.existsSync(envPath)) {
  envPath = path.join(__dirname, '.env');
}
require('dotenv').config({ path: envPath });

const { PrismaClient } = require('@prisma/client');
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

let prisma;

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
} else {
    const { createClient } = require('@libsql/client');
    const { PrismaLibSql } = require('@prisma/adapter-libsql');
    
    let finalUrl = dbUrl;
    if (dbUrl.startsWith('file:')) {
        const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
        const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
        const absPath = isAbsolute ? rawPath : `${process.cwd()}/${rawPath}`;
        const normalized = absPath.split(/[/\\]/).join('/');
        const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
        finalUrl = `file://${prefix}${normalized}`;
    }
    const client = createClient({ url: finalUrl });
    const adapter = new PrismaLibSql(client);
    prisma = new PrismaClient({ adapter });
}

const TEMPLATES = [
  {
    id: 'tpl-primera-cita',
    nombre: 'Primera Cita de Bienvenida',
    descripcion: 'Incentiva a que los nuevos clientes completen su primer servicio.',
    icono: 'Sparkles',
    color: '#3b82f6',
    difficulty: 'EASY',
    triggerEvent: 'BOOKING_COMPLETED',
    cantidadMeta: 1,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'ADD_POINTS', value: 50 },
      { action: 'SEND_PUSH', value: { title: '🎉 ¡Bienvenido a Citiox!', body: 'Has ganado tus primeros 50 puntos por completar tu primera cita.' } }
    ]
  },
  {
    id: 'tpl-cliente-frecuente',
    nombre: 'Cliente Frecuente (3 reservas)',
    descripcion: 'Fideliza a tus clientes premiándolos al completar 3 reservas.',
    icono: 'CalendarRange',
    color: '#8b5cf6',
    difficulty: 'MEDIUM',
    triggerEvent: 'BOOKING_COMPLETED',
    cantidadMeta: 3,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'ADD_POINTS', value: 150 },
      { action: 'CREATE_COUPON', value: { tipo: 'PORCENTAJE', valor: 15 } }
    ]
  },
  {
    id: 'tpl-cliente-vip',
    nombre: 'Embajador VIP (10 reservas)',
    descripcion: 'Premia a tus clientes más fieles al completar 10 reservas.',
    icono: 'Crown',
    color: '#f59e0b',
    difficulty: 'HARD',
    triggerEvent: 'BOOKING_COMPLETED',
    cantidadMeta: 10,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'ADD_POINTS', value: 500 },
      { action: 'CREATE_COUPON', value: { tipo: 'FIJO', valor: 20 } },
      { action: 'UP_LEVEL', value: 200 }
    ]
  },
  {
    id: 'tpl-happy-hour',
    nombre: 'Reserva en Happy Hour (Lunes-Miércoles)',
    descripcion: 'Impulsa las reservas de servicios en horarios de baja demanda.',
    icono: 'Clock',
    color: '#10b981',
    difficulty: 'MEDIUM',
    triggerEvent: 'BOOKING_COMPLETED',
    cantidadMeta: 1,
    validacionTipo: 'AUTOMATICO',
    condicionesExtra: {
        logic: 'AND',
        rules: [
            { field: 'diaSemana', operator: 'IN', value: [1, 2, 3] },
            { field: 'horaInicio', operator: 'BETWEEN', value: ['10:00', '14:00'] }
        ]
    },
    acciones: [
      { action: 'ADD_POINTS', value: 100 }
    ]
  },
  {
    id: 'tpl-seguir-instagram',
    nombre: 'Seguir en Instagram',
    descripcion: 'Consigue más seguidores en tus redes sociales recompensando a tus clientes.',
    icono: 'Instagram',
    color: '#ec4899',
    difficulty: 'EASY',
    triggerEvent: 'FOLLOW_SOCIAL',
    cantidadMeta: 1,
    validacionTipo: 'USUARIO',
    acciones: [
      { action: 'ADD_POINTS', value: 30 },
      { action: 'SEND_PUSH', value: { title: '📸 ¡Gracias por seguirnos!', body: 'Has recibido 30 puntos por seguir nuestro perfil en Instagram.' } }
    ]
  },
  {
    id: 'tpl-referir-amigos',
    nombre: 'Refiere 3 amigos',
    descripcion: 'Multiplica tu clientela haciendo que tus clientes actuales te recomienden.',
    icono: 'Users',
    color: '#06b6d4',
    difficulty: 'MEDIUM',
    triggerEvent: 'REFERRAL_COMPLETED',
    cantidadMeta: 3,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'CREATE_COUPON', value: { tipo: 'PORCENTAJE', valor: 25 } },
      { action: 'ADD_POINTS', value: 200 }
    ]
  },
  {
    id: 'tpl-cumpleanos',
    nombre: 'Regalo de Cumpleaños',
    descripcion: 'Envía automáticamente un cupón especial de regalo a tus clientes en su cumpleaños.',
    icono: 'Cake',
    color: '#f43f5e',
    difficulty: 'EASY',
    triggerEvent: 'BIRTHDAY',
    cantidadMeta: 1,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'CREATE_COUPON', value: { tipo: 'FIJO', valor: 10 } }
    ]
  },
  {
    id: 'tpl-vip-premium',
    nombre: 'Socio de Honor (15 Reservas)',
    descripcion: 'Consolida la máxima lealtad premiando a tus clientes estrella con un paquete VIP al llegar a 15 visitas.',
    icono: 'Crown',
    color: '#8b5cf6',
    difficulty: 'HARD',
    triggerEvent: 'BOOKING_COMPLETED',
    cantidadMeta: 15,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'ADD_POINTS', value: 1000 },
      { action: 'CREATE_COUPON', value: { tipo: 'FIJO', valor: 30 } },
      { action: 'SEND_PUSH', value: { title: '👑 ¡Eres Socio de Honor!', body: 'Has alcanzado las 15 visitas. Te regalamos 1000 puntos y un cupón de $30 USD de descuento.' } }
    ]
  },
  {
    id: 'tpl-referir-premium',
    nombre: 'Recomendador Estrella (5 Amigos)',
    descripcion: 'Motiva a tus clientes a convertirse en embajadores activos de tu marca trayendo a 5 amigos nuevos.',
    icono: 'Users',
    color: '#ec4899',
    difficulty: 'HARD',
    triggerEvent: 'REFERRAL_COMPLETED',
    cantidadMeta: 5,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'ADD_POINTS', value: 500 },
      { action: 'CREATE_COUPON', value: { tipo: 'PORCENTAJE', valor: 35 } },
      { action: 'SEND_PUSH', value: { title: '⭐ ¡Embajador Estrella!', body: '¡Cinco amigos tuyos se han registrado! Has ganado 500 puntos y un súper cupón del 35% de descuento.' } }
    ]
  },
  {
    id: 'tpl-autocuidado',
    nombre: 'Ritual de Autocuidado Mensual',
    descripcion: 'Fomenta la recurrencia periódica premiando a los clientes que completan 5 visitas en un mes.',
    icono: 'Zap',
    color: '#10b981',
    difficulty: 'MEDIUM',
    triggerEvent: 'BOOKING_COMPLETED',
    cantidadMeta: 5,
    validacionTipo: 'AUTOMATICO',
    acciones: [
      { action: 'ADD_POINTS', value: 300 },
      { action: 'CREATE_COUPON', value: { tipo: 'PORCENTAJE', valor: 20 } },
      { action: 'SEND_PUSH', value: { title: '💆‍♀️ ¡Tu Ritual de Bienestar!', body: 'Completaste tus 5 citas del mes. Tienes 300 nuevos puntos y 20% de descuento para tu siguiente reserva.' } }
    ]
  },
  {
    id: 'tpl-masaje-gratis',
    nombre: 'Reto Masaje de Regalo (5 Reservas)',
    descripcion: 'Fideliza a tus clientes premiándolos con un servicio de Masaje Express gratis tras completar 5 visitas.',
    icono: 'Gift',
    color: '#ec4899',
    difficulty: 'MEDIUM',
    triggerEvent: 'BOOKING_COMPLETED',
    cantidadMeta: 5,
    validacionTipo: 'AUTOMATICO',
    categorias: ['SPA', 'BIENESTAR'],
    tags: ['Fidelización', 'Masaje', 'Regalo'],
    acciones: [
      { action: 'ADD_POINTS', value: 150 },
      { action: 'SERVICE_GIFT', value: { name: 'Masaje Express gratis', serviceId: null, deliveryType: 'AUTOMATICO', vencimientoDias: 30 } },
      { action: 'CREATE_COUPON', value: { tipo: 'PORCENTAJE', valor: 10, vencimientoDias: 30 } },
      { action: 'SEND_PUSH', value: { title: '💆‍♀️ ¡Reto Masajes Completado!', body: '¡Ganaste tu Masaje Express gratis y 150 puntos! Cupón de 10% adicional listo.' } }
    ],
    coupons: [
      { codigo: 'MISION_MASAJE10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento por completar el reto de masajes.' }
    ],
    rewards: [
      { nombre: 'Masaje Express gratis', descripcion: 'Masaje express de 15 minutos en camilla o silla ergonómica.', costoPuntos: 0, tipo: 'SERVICIO_GRATIS', deliveryType: 'AUTOMATICO' }
    ]
  },
  {
    id: 'tpl-facial-vip-compra',
    nombre: 'Tratamiento Facial VIP (3 Compras)',
    descripcion: 'Fomenta la venta cruzada de productos regalando una Limpieza Facial Express gratis.',
    icono: 'Sparkles',
    color: '#06b6d4',
    difficulty: 'MEDIUM',
    triggerEvent: 'PURCHASE_COMPLETED',
    cantidadMeta: 3,
    validacionTipo: 'AUTOMATICO',
    categorias: ['BELLEZA', 'ESTETICA'],
    tags: ['Compras', 'Facial', 'Regalo'],
    acciones: [
      { action: 'SERVICE_GIFT', value: { name: 'Limpieza Facial Express Gratis', serviceId: null, deliveryType: 'MANUAL', vencimientoDias: 45 } },
      { action: 'CREATE_COUPON', value: { tipo: 'FIJO', valor: 15, vencimientoDias: 30 } },
      { action: 'SEND_PUSH', value: { title: '✨ ¡Limpieza Facial de Regalo!', body: 'Ganaste una Limpieza Facial Express Gratis y un cupón de $15 USD de descuento.' } }
    ],
    coupons: [
      { codigo: 'MISION_FACIAL15', tipo: 'FIJO', valor: 15, descripcion: '$15 de descuento por completar el reto facial.' }
    ],
    rewards: [
      { nombre: 'Limpieza Facial Express Gratis', descripcion: 'Limpieza e hidratación express con productos orgánicos.', costoPuntos: 0, tipo: 'SERVICIO_GRATIS', deliveryType: 'MANUAL' }
    ]
  },
  {
    id: 'tpl-embajador-bienestar',
    nombre: 'Embajador de Bienestar (3 Referidos)',
    descripcion: 'Premia las recomendaciones exitosas con un Kit Exfoliante Orgánico gratis para el hogar.',
    icono: 'Users',
    color: '#3b82f6',
    difficulty: 'HARD',
    triggerEvent: 'REFERRAL_COMPLETED',
    cantidadMeta: 3,
    validacionTipo: 'AUTOMATICO',
    categorias: ['RECOMENDACION', 'SPA'],
    tags: ['Referidos', 'Exfoliante', 'Regalo'],
    acciones: [
      { action: 'ADD_POINTS', value: 300 },
      { action: 'PRODUCT_GIFT', value: { name: 'Kit Exfoliante Orgánico gratis', deliveryType: 'MANUAL', vencimientoDias: 60 } },
      { action: 'CREATE_COUPON', value: { tipo: 'PORCENTAJE', valor: 20, vencimientoDias: 30 } },
      { action: 'SEND_PUSH', value: { title: '🏆 ¡Embajador de Bienestar!', body: 'Reclama tu Kit Exfoliante gratis en recepción y usa tu cupón del 20%.' } }
    ],
    coupons: [
      { codigo: 'MISION_EMBAJADOR20', tipo: 'PORCENTAJE', valor: 20, descripcion: '20% de descuento por referir a tus amigos.' }
    ],
    rewards: [
      { nombre: 'Kit Exfoliante Orgánico gratis', descripcion: 'Kit con exfoliante de café y aceite hidratante para uso en casa.', costoPuntos: 0, tipo: 'PRODUCTO', deliveryType: 'MANUAL' }
    ]
  },
  {
    id: 'tpl-cumpleanos-vip',
    nombre: 'Ritual de Cumpleaños VIP (1 Visita)',
    descripcion: 'Ofrece una experiencia de cumpleaños inigualable regalando una Mascarilla de Hidratación gratis.',
    icono: 'Cake',
    color: '#10b981',
    difficulty: 'EASY',
    triggerEvent: 'BIRTHDAY',
    cantidadMeta: 1,
    validacionTipo: 'AUTOMATICO',
    categorias: ['CUMPLEAÑOS', 'BIENESTAR'],
    tags: ['Cumpleaños', 'Mascarilla', 'Regalo'],
    acciones: [
      { action: 'ADD_POINTS', value: 200 },
      { action: 'SERVICE_GIFT', value: { name: 'Mascarilla de Hidratación Gratis', serviceId: null, deliveryType: 'AUTOMATICO', vencimientoDias: 30 } },
      { action: 'CREATE_COUPON', value: { tipo: 'PORCENTAJE', valor: 25, vencimientoDias: 30 } },
      { action: 'SEND_PUSH', value: { title: '🎂 ¡Feliz Cumpleaños VIP!', body: 'Disfruta de una Mascarilla de Hidratación gratis, 200 puntos y 25% de descuento.' } }
    ],
    coupons: [
      { codigo: 'MISION_CUMPLE25', tipo: 'PORCENTAJE', valor: 25, descripcion: '25% de descuento especial por tu cumpleaños.' }
    ],
    rewards: [
      { nombre: 'Mascarilla de Hidratación Gratis', descripcion: 'Mascarilla facial nutritiva y descongestiva de cortesía.', costoPuntos: 0, tipo: 'SERVICIO_GRATIS', deliveryType: 'AUTOMATICO' }
    ]
  }
];

async function main() {
  console.log('🌱 Iniciando la siembra de plantillas del Marketplace...');

  for (const t of TEMPLATES) {
    console.log(`➡️ Procesando plantilla: ${t.nombre} (${t.id})...`);
    
    // 1. Eliminar versiones previas de la misión de plantilla
    await prisma.questTemplateMission.deleteMany({
      where: { templateId: t.id }
    });

    // 2. Eliminar versión previa de la plantilla principal
    await prisma.questTemplate.deleteMany({
      where: { id: t.id }
    });

    // 3. Crear plantilla principal
    const createdTpl = await prisma.questTemplate.create({
      data: {
        id: t.id,
        nombre: t.nombre,
        descripcion: t.descripcion,
        icono: t.icono,
        color: t.color,
        categorias: t.categorias || ['SPA', 'BELLEZA'],
        tags: t.tags || ['Fidelización', 'Bienestar', 'Recurrencia'],
        coupons: t.coupons || null,
        rewards: t.rewards || null,
        estado: 'PUBLICADO',
        origenTipo: 'BIBLIOTECA_OFICIAL',
        gratuito: true,
        autor: 'Citiox',
        empresa: 'Citiox',
        featured: true,
        versionSemantica: '1.0.0'
      }
    });

    // 4. Crear misión plantilla asociada
    await prisma.questTemplateMission.create({
      data: {
        templateId: createdTpl.id,
        nombre: t.nombre,
        descripcion: t.descripcion,
        icono: t.icono,
        color: t.color,
        triggerEvent: t.triggerEvent,
        cantidadMeta: t.cantidadMeta,
        validacionTipo: t.validacionTipo,
        difficulty: t.difficulty,
        condicionesExtra: t.condicionesExtra ? t.condicionesExtra : undefined,
        acciones: t.acciones
      }
    });

    console.log(`✅ Plantilla ${t.nombre} creada con éxito.`);
  }

  console.log('🌿 ¡Siembra finalizada con éxito!');
}

main()
  .catch(e => {
    console.error('❌ Error en el proceso de siembra:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
