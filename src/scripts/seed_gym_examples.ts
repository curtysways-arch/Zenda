import prisma from '../lib/prisma';
import crypto from 'crypto';

export async function seedGymExamples() {
  console.log('--- [SEED GYM EXAMPLES] Creando ejemplos de áreas y equipamiento para Vortex Fitness ---');

  const vortex = await prisma.negocio.findFirst({
    where: {
      OR: [
        { slug: 'vortex' },
        { slug: 'vortex-fitness' },
        { nombre: { contains: 'Vortex' } },
        { nombre: { contains: 'VORTEX' } },
        { slug: { contains: 'vortex' } },
        { tipoNegocio: 'GIMNASIO' },
        { tipoNegocio: 'GYM' }
      ]
    }
  });

  if (!vortex) {
    console.error('❌ Negocio Vortex Fitness no encontrado.');
    return;
  }

  console.log(`✅ Negocio encontrado: ${vortex.nombre} (${vortex.id})`);

  // 1. Áreas de ejemplo (5 áreas variadas y representativas de gimnasio)
  const areasData = [
    {
      name: 'Área de Musculación y Fuerza',
      description: 'Zona equipada con racks de sentadillas, bancos olímpicos, barras olímpicas y mancuernas de 2kg a 50kg para entrenamiento de hipertrofia y potencia.',
      imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop',
      order: 1,
      active: true
    },
    {
      name: 'Zona Cardiovascular',
      description: 'Más de 20 estaciones de cardio de última generación con pantallas interactivas, conectividad Bluetooth y monitoreo de pulsaciones.',
      imageUrl: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?q=80&w=1200&auto=format&fit=crop',
      order: 2,
      active: true
    },
    {
      name: 'Entrenamiento Funcional & Cross',
      description: 'Césped sintético, trineos de empuje, cajones pliométricos, cuerdas de batalla (battle ropes) y kettlebells para circuitos de alta intensidad.',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop',
      order: 3,
      active: true
    },
    {
      name: 'Sala de Spinning & Indoor Cycling',
      description: 'Estudio insonorizado con bicicletas magnéticas de precisión, luces dinámicas y sistema de sonido envolvente para sesiones motivantes.',
      imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1200&auto=format&fit=crop',
      order: 4,
      active: true
    },
    {
      name: 'Vestidores & Zona de Recuperación',
      description: 'Lockers digitales de seguridad, duchas individuales con agua caliente constante, sauna seco y área de hidratación.',
      imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1200&auto=format&fit=crop',
      order: 5,
      active: true
    }
  ];

  // Insertar o actualizar áreas
  const createdAreas: Record<string, string> = {};

  for (const a of areasData) {
    let area = await (prisma as any).gymArea.findFirst({
      where: { businessId: vortex.id, name: a.name }
    });

    if (!area) {
      area = await (prisma as any).gymArea.create({
        data: {
          id: crypto.randomUUID(),
          businessId: vortex.id,
          name: a.name,
          description: a.description,
          imageUrl: a.imageUrl,
          order: a.order,
          active: a.active,
          updatedAt: new Date()
        }
      });
      console.log(`[GymArea] Creada área: "${a.name}"`);
    } else {
      area = await (prisma as any).gymArea.update({
        where: { id: area.id },
        data: {
          description: a.description,
          imageUrl: a.imageUrl,
          order: a.order,
          active: a.active,
          updatedAt: new Date()
        }
      });
      console.log(`[GymArea] Actualizada área: "${a.name}"`);
    }

    createdAreas[a.name] = area.id;
  }

  // 2. Equipamiento de ejemplo (5 máquinas destacadas asociadas a las áreas creadas)
  const equipmentData = [
    {
      name: 'Jaula Power Rack Pro Olímpica',
      description: 'Estructura maciza con barras de seguridad ajustables, soporte para sentadillas, press militar y dominadas multiagarre.',
      imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=800&auto=format&fit=crop',
      areaName: 'Área de Musculación y Fuerza',
      order: 1,
      active: true
    },
    {
      name: 'Caminadora Curva Sin Motor (Air Runner)',
      description: 'Propulsada 100% por el esfuerzo del atleta, optimiza la quema calórica hasta un 30% más y reduce el impacto articular.',
      imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=800&auto=format&fit=crop',
      areaName: 'Zona Cardiovascular',
      order: 2,
      active: true
    },
    {
      name: 'Trineo de Empuje Heavy Duty con Pista',
      description: 'Trineo con postes desmontables sobre pista sintética para acondicionamiento metabólico y empuje de fuerza explosiva.',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop',
      areaName: 'Entrenamiento Funcional & Cross',
      order: 3,
      active: true
    },
    {
      name: 'Bicicleta Indoor Cycling Stage Pro',
      description: 'Resistencia magnética silenciosa de 24 niveles, consola con medidor de potencia en watts y volante de inercia calibrado.',
      imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop',
      areaName: 'Sala de Spinning & Indoor Cycling',
      order: 4,
      active: true
    },
    {
      name: 'Prensa Inclinada 45 Grados a Disco',
      description: 'Movimiento ergonómico guiado para cuádriceps y glúteos con capacidad de hasta 400kg en discos olímpicos.',
      imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop',
      areaName: 'Área de Musculación y Fuerza',
      order: 5,
      active: true
    }
  ];

  for (const eq of equipmentData) {
    const areaId = createdAreas[eq.areaName] || null;

    let item = await (prisma as any).gymEquipment.findFirst({
      where: { businessId: vortex.id, name: eq.name }
    });

    if (!item) {
      await (prisma as any).gymEquipment.create({
        data: {
          id: crypto.randomUUID(),
          businessId: vortex.id,
          areaId,
          name: eq.name,
          description: eq.description,
          imageUrl: eq.imageUrl,
          order: eq.order,
          active: eq.active,
          updatedAt: new Date()
        }
      });
      console.log(`[GymEquipment] Creado equipo: "${eq.name}"`);
    } else {
      await (prisma as any).gymEquipment.update({
        where: { id: item.id },
        data: {
          areaId,
          description: eq.description,
          imageUrl: eq.imageUrl,
          order: eq.order,
          active: eq.active,
          updatedAt: new Date()
        }
      });
      console.log(`[GymEquipment] Actualizado equipo: "${eq.name}"`);
    }
  }

  // 3. Promociones de Membresía de Ejemplo (5 promociones completas y variadas)
  console.log('--- Creando 5 promociones de membresía ---');
  const plans = await (prisma as any).membershipPlan.findMany({
    where: { businessId: vortex.id },
    orderBy: { displayOrder: 'asc' }
  });

  const planMensual = plans.find((p: any) => p.durationDays === 30 || p.name.toLowerCase().includes('mensual')) || plans[0];
  const planTrimestral = plans.find((p: any) => p.durationDays === 90 || p.name.toLowerCase().includes('trimestral')) || plans[1] || plans[0];
  const planAnual = plans.find((p: any) => p.durationDays === 365 || p.name.toLowerCase().includes('anual')) || plans[2] || plans[0];

  const now = new Date();
  const in30Days = new Date();
  in30Days.setDate(now.getDate() + 30);
  const in60Days = new Date();
  in60Days.setDate(now.getDate() + 60);

  const promosData = [
    {
      titulo: 'Black Fitness: 30% OFF en Plan Anual VIP',
      userDescription: 'Transforma tu estilo de vida todo el año. Acceso total a todas las sedes, clases ilimitadas, casillero privado y toalla.',
      benefitType: 'DESCUENTO_PORCENTAJE',
      discountValue: 30,
      planId: planAnual?.id || null,
      precioAnterior: planAnual?.price || 280,
      precioPromo: planAnual ? Number((planAnual.price * 0.7).toFixed(2)) : 196,
      imagenUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=800&auto=format&fit=crop',
      estado: 'publicado',
      fechaInicio: now,
      fechaFin: in30Days
    },
    {
      titulo: 'Matrícula 100% Gratis en Plan Trimestral',
      userDescription: 'Inscríbete hoy sin costo de activación ni matrícula administrativa en tu membresía trimestral de alto rendimiento.',
      benefitType: 'MATRICULA_GRATIS',
      discountValue: 0,
      planId: planTrimestral?.id || null,
      precioAnterior: planTrimestral ? planTrimestral.price + 25 : 105,
      precioPromo: planTrimestral?.price || 80,
      imagenUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop',
      estado: 'publicado',
      fechaInicio: now,
      fechaFin: in30Days
    },
    {
      titulo: 'Primer Mes a Precio Especial de Apertura',
      userDescription: 'Comienza tu viaje de entrenamiento al precio más accesible. Acceso 24/7 con código QR inteligente y evaluación física incluida.',
      benefitType: 'PRECIO_ESPECIAL',
      discountValue: 19.99,
      planId: planMensual?.id || null,
      precioAnterior: planMensual?.price || 35,
      precioPromo: 19.99,
      imagenUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
      estado: 'publicado',
      fechaInicio: now,
      fechaFin: in60Days
    },
    {
      titulo: 'Inscripción y Carnet Digital de Regalo',
      userDescription: 'Cero costos ocultos en cualquier plan que elijas. Registro inmediato en recepción o desde tu móvil en menos de 2 minutos.',
      benefitType: 'INSCRIPCION_GRATIS',
      discountValue: 0,
      planId: null, // Aplica a todos
      precioAnterior: 20,
      precioPromo: 0,
      imagenUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=800&auto=format&fit=crop',
      estado: 'publicado',
      fechaInicio: now,
      fechaFin: in60Days
    },
    {
      titulo: '$15 USD OFF en Plan Trimestral Pro',
      userDescription: 'Ahorro directo instantáneo para nuevos socios que inicien su plan de acondicionamiento físico de 3 meses.',
      benefitType: 'DESCUENTO_FIJO',
      discountValue: 15,
      planId: planTrimestral?.id || null,
      precioAnterior: planTrimestral?.price || 80,
      precioPromo: planTrimestral ? Math.max(0, planTrimestral.price - 15) : 65,
      imagenUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=800&auto=format&fit=crop',
      estado: 'publicado',
      fechaInicio: now,
      fechaFin: in30Days
    }
  ];

  for (const pr of promosData) {
    const meta = {
      membershipPlanId: pr.planId,
      benefitType: pr.benefitType,
      discountValue: pr.discountValue,
      finalPrice: pr.precioPromo
    };

    const fullDescription = `${pr.userDescription}\n<!-- CITIOX_META:${JSON.stringify(meta)}-->`;

    let existing = await (prisma as any).promotion.findFirst({
      where: { businessId: vortex.id, titulo: pr.titulo }
    });

    if (!existing) {
      await (prisma as any).promotion.create({
        data: {
          id: crypto.randomUUID(),
          businessId: vortex.id,
          titulo: pr.titulo,
          descripcion: fullDescription,
          imagenUrl: pr.imagenUrl,
          estado: pr.estado,
          precioPromo: pr.precioPromo,
          precioAnterior: pr.precioAnterior,
          fechaInicio: pr.fechaInicio,
          fechaFin: pr.fechaFin,
          tipoPromo: pr.benefitType,
          updatedAt: new Date()
        }
      });
      console.log(`[Promotion] Creada promoción: "${pr.titulo}"`);
    } else {
      await (prisma as any).promotion.update({
        where: { id: existing.id },
        data: {
          descripcion: fullDescription,
          imagenUrl: pr.imagenUrl,
          estado: pr.estado,
          precioPromo: pr.precioPromo,
          precioAnterior: pr.precioAnterior,
          fechaInicio: pr.fechaInicio,
          fechaFin: pr.fechaFin,
          tipoPromo: pr.benefitType,
          updatedAt: new Date()
        }
      });
      console.log(`[Promotion] Actualizada promoción: "${pr.titulo}"`);
    }
  }

  console.log('🎉 [SEED GYM EXAMPLES] Finalizado con 5 áreas, 5 equipos y 5 promociones.');
}

if (require.main === module) {
  seedGymExamples()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
