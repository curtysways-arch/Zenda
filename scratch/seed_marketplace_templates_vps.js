const { Pool } = require('pg');

const pgUrl = 'postgresql://zenda_user:Zenda2026Segura!@localhost:5432/zenda_db?schema=public';
const pool = new Pool({ connectionString: pgUrl });

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
  console.log('🌱 Conectando con la base de datos del VPS PostgreSQL de producción...');
  const client = await pool.connect();

  try {
    console.log('🌱 Iniciando la siembra de plantillas del Marketplace en producción...');

    for (const t of TEMPLATES) {
      console.log(`➡️ Procesando plantilla: ${t.nombre} (${t.id})...`);
      
      // 1. Eliminar versiones previas de la misión de plantilla
      await client.query('DELETE FROM "QuestTemplateMission" WHERE "templateId" = $1', [t.id]);

      // 2. Eliminar versión previa de la plantilla principal
      await client.query('DELETE FROM "QuestTemplate" WHERE id = $1', [t.id]);

      // 3. Crear plantilla principal
      const queryTpl = `
        INSERT INTO "QuestTemplate" (
          id, nombre, descripcion, icono, color, categorias, tags, 
          coupons, rewards,
          "versionSemantica", estado, "origenTipo", "esPredeterminada", featured, 
          "coverImage", thumbnail, banner, autor, empresa, licencia, gratuito, precio, moneda,
          "installCount", "activeBusinesses", "usuariosActivos", "completionRate",
          "porcentajeAbandono", "averageCompletionDays", rating, "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 
          $8, $9,
          '1.0.0', 'PUBLICADA', 'BIBLIOTECA_OFICIAL', false, true, 
          null, null, null, 'Citiox', 'Citiox', 'Comercial', true, 0.0, 'USD',
          0, 0, 0, 0.0, 
          0.0, 0.0, 5.0, NOW(), NOW()
        )
      `;
      await client.query(queryTpl, [
        t.id, 
        t.nombre, 
        t.descripcion, 
        t.icono, 
        t.color, 
        JSON.stringify(t.categorias || ['SPA', 'BELLEZA']), 
        JSON.stringify(t.tags || ['Fidelización', 'Bienestar']),
        t.coupons ? JSON.stringify(t.coupons) : null,
        t.rewards ? JSON.stringify(t.rewards) : null
      ]);

      // 4. Crear misión plantilla asociada
      const missionId = `mission-${t.id}`;
      const queryMission = `
        INSERT INTO "QuestTemplateMission" (
          id, "templateId", nombre, descripcion, "imagenUrl", icono, color, visible, 
          repetible, "limiteUsuario", "limiteGlobal", activa, "parentQuestId", segmentacion, "validacionTipo", 
          difficulty, xp, "estimatedMinutes", "estimatedDays", "triggerEvent", 
          "servicioId", "montoMinimo", "cantidadMeta", "condicionesExtra", acciones, "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, null, $5, $6, true, 
          false, 1, null, true, null, null, $7, 
          $8, 0, 0, 0, $9, 
          null, null, $10, $11, $12, NOW(), NOW()
        )
      `;
      await client.query(queryMission, [
        missionId,
        t.id,
        t.nombre,
        t.descripcion,
        t.icono,
        t.color,
        t.validacionTipo,
        t.difficulty,
        t.triggerEvent,
        t.cantidadMeta,
        t.condicionesExtra ? JSON.stringify(t.condicionesExtra) : null,
        JSON.stringify(t.acciones)
      ]);

      console.log(`✅ Plantilla ${t.nombre} sembrada en producción.`);
    }

    console.log('🌿 ¡Siembra de plantillas finalizada con éxito en el VPS!');
  } catch (err) {
    console.error('❌ Error durante la siembra en el VPS:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
