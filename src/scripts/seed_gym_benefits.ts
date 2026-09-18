import prisma from '../lib/prisma';
import crypto from 'crypto';

async function seedGymBenefits() {
  console.log('--- [SEED GYM BENEFITS] Configurando Club de Beneficios enfocado a Gimnasio ---');

  const vortex = await prisma.negocio.findUnique({
    where: { slug: 'vortex-fitness' },
    select: { id: true, nombre: true }
  });

  if (!vortex) {
    console.log('Negocio vortex-fitness no encontrado.');
    return;
  }

  // 1. Misiones canónicas para Gimnasio
  const gymMissionsData = [
    {
      nombre: 'Primer Entrenamiento',
      descripcion: 'Asiste a tu primera sesión en el gimnasio y registra tu acceso con el código QR.',
      categoria: 'RESERVAS' as const,
      triggerEvent: 'BOOKING_COMPLETED',
      cantidadMeta: 1,
      requiresBusinessReward: true,
      rewardConfig: {
        rewardType: 'PRODUCT',
        descripcion: 'Shake de Proteína o Botella Shaker de bienvenida'
      }
    },
    {
      nombre: 'Atleta Constante',
      descripcion: 'Completa 5 entrenamientos o asistencias en sala de musculación o clases guiadas.',
      categoria: 'RESERVAS' as const,
      triggerEvent: 'BOOKING_COMPLETED',
      cantidadMeta: 5,
      requiresBusinessReward: true,
      rewardConfig: {
        rewardType: 'COUPON',
        value: 15,
        descripcion: '15% de descuento en tu próxima cuota mensual'
      }
    },
    {
      nombre: 'Desafío Semana de Hierro',
      descripcion: 'Asiste a entrenar al menos 3 días en una misma semana y consolida tu hábito deportivo.',
      categoria: 'RESERVAS' as const,
      triggerEvent: 'BOOKING_COMPLETED',
      cantidadMeta: 3,
      requiresBusinessReward: true,
      rewardConfig: {
        rewardType: 'CASHBACK',
        value: 5,
        descripcion: '5% de cashback en compras de suplementos del gym'
      }
    },
    {
      nombre: 'Trae a tu Gym Bro',
      descripcion: 'Invita a un amigo a entrenar al gimnasio. Obtén recompensas cuando active su membresía.',
      categoria: 'REFERIDOS' as const,
      triggerEvent: 'REFERRAL_COMPLETED',
      cantidadMeta: 1,
      requiresBusinessReward: true,
      rewardConfig: {
        rewardType: 'FREE_SERVICE',
        descripcion: '1 Mes de membresía gratis para ti'
      }
    },
    {
      nombre: 'Califica Tu Gym',
      descripcion: 'Deja tu valoración sobre la limpieza, estado de las máquinas y asesoría de nuestros coaches.',
      categoria: 'REVIEWS' as const,
      triggerEvent: 'REVIEW_CREATED',
      cantidadMeta: 1,
      requiresBusinessReward: true,
      rewardConfig: {
        rewardType: 'PRODUCT',
        descripcion: 'Bebida isotónica o energizante gratis'
      }
    },
    {
      nombre: 'Ficha de Atleta Completa',
      descripcion: 'Registra tus datos de socio, número de WhatsApp y objetivos de entrenamiento.',
      categoria: 'PERFIL' as const,
      triggerEvent: 'PROFILE_COMPLETED',
      cantidadMeta: 1,
      requiresBusinessReward: false,
      rewardConfig: null
    }
  ];

  for (const m of gymMissionsData) {
    let def = await prisma.missionDefinition.findFirst({
      where: { nombre: m.nombre }
    });

    if (!def) {
      def = await prisma.missionDefinition.create({
        data: {
          id: crypto.randomUUID(),
          nombre: m.nombre,
          descripcion: m.descripcion,
          categoria: m.categoria,
          triggerEvent: m.triggerEvent,
          cantidadMeta: m.cantidadMeta,
          status: 'PUBLISHED',
          requiresBusinessReward: m.requiresBusinessReward
        }
      });
      console.log('[MissionDefinition] Creada misión: ' + m.nombre);
    } else {
      await prisma.missionDefinition.update({
        where: { id: def.id },
        data: {
          descripcion: m.descripcion,
          categoria: m.categoria,
          triggerEvent: m.triggerEvent,
          cantidadMeta: m.cantidadMeta,
          status: 'PUBLISHED',
          requiresBusinessReward: m.requiresBusinessReward
        }
      });
      console.log('[MissionDefinition] Actualizada misión: ' + m.nombre);
    }

    // Asegurar instalación para Vortex
    let bm = await prisma.businessMission.findFirst({
      where: { negocioId: vortex.id, missionDefinitionId: def.id }
    });

    if (!bm) {
      await prisma.businessMission.create({
        data: {
          id: crypto.randomUUID(),
          negocioId: vortex.id,
          missionDefinitionId: def.id,
          status: 'ACTIVE',
          publishedAt: new Date(),
          rewardConfiguration: m.rewardConfig || null
        }
      });
      console.log('[BusinessMission] Instalada para Vortex: ' + m.nombre);
    } else {
      await prisma.businessMission.update({
        where: { id: bm.id },
        data: {
          status: 'ACTIVE',
          rewardConfiguration: m.rewardConfig || bm.rewardConfiguration
        }
      });
    }
  }

  // 2. Desvincular misiones genéricas obsoletas de citas en vortex
  const oldDefs = await prisma.missionDefinition.findMany({
    where: {
      nombre: { in: ['Primera Cita', 'Cliente Frecuente'] }
    }
  });

  for (const od of oldDefs) {
    await prisma.businessMission.deleteMany({
      where: { negocioId: vortex.id, missionDefinitionId: od.id }
    });
  }

  console.log('--- [SEED GYM BENEFITS] Finalizado con éxito ---');
}

seedGymBenefits()
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
