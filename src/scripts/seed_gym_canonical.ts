import prisma from '../lib/prisma';
import crypto from 'crypto';

export async function seedGymCanonical() {
  console.log('--- [SEED CANONICAL GIMNASIO] Iniciando configuración del vertical Gimnasio ---');

  // 1. Crear o recuperar PlanFamily GIMNASIO
  let planFamily = await (prisma as any).planFamily.findFirst({
    where: { OR: [{ code: 'GIMNASIO' }, { slug: 'gimnasios' }] }
  });

  if (!planFamily) {
    planFamily = await (prisma as any).planFamily.create({
      data: {
        id: crypto.randomUUID(),
        code: 'GIMNASIO',
        name: 'Gimnasios & Fitness',
        slug: 'gimnasios',
        description: 'Suscripciones recurrentes, control de accesos por torniquete/QR y fidelización para gimnasios',
        icon: 'Dumbbell',
        active: true,
        displayOrder: 7
      }
    });
    console.log(`[PlanFamily] Creada familia GIMNASIO con ID: ${planFamily.id}`);
  } else {
    console.log(`[PlanFamily] Reutilizando familia GIMNASIO ID: ${planFamily.id}`);
  }

  // 2. Crear o recuperar BusinessType GIMNASIO
  let businessType = await (prisma as any).businessType.findFirst({
    where: { OR: [{ slug: 'gimnasio' }, { name: 'Gimnasio & Centro Fitness' }] }
  });

  if (!businessType) {
    businessType = await (prisma as any).businessType.create({
      data: {
        id: crypto.randomUUID(),
        slug: 'gimnasio',
        name: 'Gimnasio & Centro Fitness',
        description: 'Gestión integral de membresías, accesos QR, asistencias y fidelización deportiva.',
        icon: 'Dumbbell',
        color: '#EA580C',
        resourceType: 'INFRASTRUCTURE',
        active: true,
        sortOrder: 7,
        landingThemeId: 'gym-dark',
        adminThemeId: 'gym-admin',
        planFamilyId: planFamily.id,
        uiLabels: {
          recurso: 'Área / Máquina',
          reserva: 'Acceso / Membresía',
          cliente: 'Socio',
          agenda: 'Control de Accesos'
        },
        initialConfig: {
          blueprintId: 'GYM',
          tipoNegocio: 'GIMNASIO',
          allowFreezing: true,
          duplicateScanWindowSeconds: 60
        }
      }
    });
    console.log(`[BusinessType] Creado BusinessType GIMNASIO con ID: ${businessType.id}`);
  } else {
    // Asegurar que tenga planFamilyId
    if (!businessType.planFamilyId) {
      await (prisma as any).businessType.update({
        where: { id: businessType.id },
        data: { planFamilyId: planFamily.id }
      });
    }
    console.log(`[BusinessType] Reutilizando BusinessType GIMNASIO ID: ${businessType.id}`);
  }

  // 3. Crear Planes SaaS de suscripción de la familia GIMNASIO si no existen
  const saasPlansData = [
    {
      id: 'plan_gym_inicio',
      slug: 'gym-inicio',
      name: 'Gimnasio Inicio',
      price: 19.99,
      description: 'Ideal para gimnasios de barrio o boxes independientes con hasta 200 socios activos.',
      maxMembers: 200,
      maxStaff: 2,
      displayOrder: 1,
      featured: false
    },
    {
      id: 'plan_gym_crecimiento',
      slug: 'gym-crecimiento',
      name: 'Gimnasio Crecimiento',
      price: 39.99,
      description: 'Control de accesos QR automatizado, hasta 1,000 socios, clases grupales y fidelización.',
      maxMembers: 1000,
      maxStaff: 10,
      displayOrder: 2,
      featured: true
    },
    {
      id: 'plan_gym_pro',
      slug: 'gym-pro',
      name: 'Gimnasio Pro',
      price: 79.99,
      description: 'Multisucursal, socios ilimitados, analítica de retención e integración de torniquetes.',
      maxMembers: -1,
      maxStaff: 50,
      displayOrder: 3,
      featured: false
    }
  ];

  for (const sp of saasPlansData) {
    const existingPlan = await (prisma as any).plan.findUnique({ where: { id: sp.id } });
    if (!existingPlan) {
      await (prisma as any).plan.create({
        data: {
          id: sp.id,
          name: sp.name,
          slug: sp.slug,
          description: sp.description,
          price: sp.price,
          familyId: planFamily.id,
          active: true,
          activo: true,
          isPublic: true,
          displayOrder: sp.displayOrder,
          featured: sp.featured,
          maxStaff: sp.maxStaff,
          updated_at: new Date()
        }
      });
      // Límites universales
      await (prisma as any).planLimit.upsert({
        where: { planId_limitKey: { planId: sp.id, limitKey: 'MAX_MEMBERS' } },
        update: { limitValue: sp.maxMembers },
        create: { planId: sp.id, limitKey: 'MAX_MEMBERS', limitValue: sp.maxMembers }
      });
      console.log(`[Plan SaaS] Creado plan ${sp.name} con límite ${sp.maxMembers} socios.`);
    }
  }

  // 4. Configurar y migrar Negocio Demo "vortex-fitness"
  const vortex = await prisma.negocio.findUnique({
    where: { slug: 'vortex-fitness' }
  });

  if (vortex) {
    let currentConfig: any = {};
    if (typeof vortex.configuracion === 'string') {
      try { currentConfig = JSON.parse(vortex.configuracion); } catch { currentConfig = {}; }
    } else {
      currentConfig = vortex.configuracion || {};
    }

    const updatedConfig = {
      ...currentConfig,
      blueprintId: 'GYM',
      tipoNegocio: 'GIMNASIO',
      colorBottomNav: '#0f172a',
      heroTitulo: 'TU MEJOR VERSIÓN COMIENZA AQUÍ',
      heroSubtitulo: 'Equipamiento de alto nivel, entrenadores certificados y planes a tu medida.',
      gymDescription: 'El centro fitness definitivo diseñado para transformar tu rendimiento físico con tecnología de vanguardia y comunidad apasionada.',
      beneficios: [
        'Acceso 24/7 con código QR digital',
        'Área completa de peso libre y fuerza',
        'Zona cardiovascular de última generación',
        'Vestidores premium con duchas y lockers',
        'Clases grupales de alta intensidad y yoga',
        'Asesoría y seguimiento físico trimestral'
      ]
    };

    await prisma.negocio.update({
      where: { id: vortex.id },
      data: {
        tipoNegocio: 'GIMNASIO',
        businessTypeId: businessType.id,
        colorPrimario: '#ea580c',
        colorSecundario: '#0f172a',
        heroTitulo: 'TU MEJOR VERSIÓN COMIENZA AQUÍ',
        heroSubtitulo: 'Entrena con los mejores equipos, clases exclusivas y acceso inteligente por QR.',
        configuracion: updatedConfig as any
      }
    });
    console.log(`[Negocio vortex-fitness] Actualizado al vertical canónico GIMNASIO.`);

    // 5. Crear Planes Comerciales de Demostración para vortex-fitness
    const commercialPlans = [
      {
        name: 'Mensual',
        description: 'Acceso completo al gimnasio, uso de máquinas y área de pesas.',
        price: 30.00,
        currency: 'USD',
        durationDays: 30,
        displayOrder: 1,
        featured: false,
        benefits: [
          'Acceso ilimitado al gimnasio',
          'Uso de máquinas y peso libre',
          'Área de cardio y vestidores',
          'Mi QR de acceso en tu móvil'
        ]
      },
      {
        name: 'Trimestral',
        description: 'Acceso ilimitado, área de pesas, clases incluidas y evaluación.',
        price: 80.00,
        currency: 'USD',
        durationDays: 90,
        displayOrder: 2,
        featured: true,
        benefits: [
          'Acceso total a todas las áreas',
          'Clases grupales incluidas',
          'Evaluación física inicial',
          'Descuento 10% en tienda de suplementos',
          'Mi QR de acceso en tu móvil'
        ]
      },
      {
        name: 'Anual',
        description: 'Acceso ilimitado todo el año con congelamiento y beneficios VIP.',
        price: 280.00,
        currency: 'USD',
        durationDays: 365,
        displayOrder: 3,
        featured: false,
        benefits: [
          'Acceso VIP los 365 días del año',
          'Todas las clases grupales sin costo adicional',
          'Hasta 30 días de congelamiento por vacaciones',
          '2 pases de invitado por mes',
          'Asesoría nutricional mensual'
        ]
      }
    ];

    const existingPlans = await (prisma as any).membershipPlan.findMany({
      where: { businessId: vortex.id }
    });

    if (existingPlans.length === 0) {
      for (const cp of commercialPlans) {
        await (prisma as any).membershipPlan.create({
          data: {
            businessId: vortex.id,
            name: cp.name,
            description: cp.description,
            price: cp.price,
            currency: cp.currency,
            durationDays: cp.durationDays,
            displayOrder: cp.displayOrder,
            featured: cp.featured,
            benefits: cp.benefits,
            active: true
          }
        });
        console.log(`[Commercial Plan] Creado plan comercial ${cp.name} ($${cp.price}) para vortex-fitness.`);
      }
    }

    // 6. Crear o asegurar socios de demostración
    const demoPlanTrimestral = await (prisma as any).membershipPlan.findFirst({
      where: { businessId: vortex.id, name: 'Trimestral' }
    });

    if (demoPlanTrimestral) {
      // Socio Activo
      let socioActivo = await prisma.cliente.findFirst({
        where: { negocioId: vortex.id, email: 'socio.activo@vortexfit.demo' }
      });

      if (!socioActivo) {
        socioActivo = await prisma.cliente.create({
          data: {
            id: crypto.randomUUID(),
            negocioId: vortex.id,
            nombre: 'Juan Carlos Mendoza',
            telefono: '+51988112233',
            email: 'socio.activo@vortexfit.demo',
            updatedAt: new Date()
          }
        });
      }

      // Membresía Activa para socioActivo
      const existingActiveMembership = await (prisma as any).membership.findFirst({
        where: { customerId: socioActivo.id, status: 'ACTIVE' }
      });

      if (!existingActiveMembership) {
        const startAt = new Date();
        const endAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 días restantes
        await (prisma as any).membership.create({
          data: {
            businessId: vortex.id,
            customerId: socioActivo.id,
            membershipPlanId: demoPlanTrimestral.id,
            status: 'ACTIVE',
            startAt,
            endAt,
            price: demoPlanTrimestral.price,
            currency: 'USD',
            paymentStatus: 'PAID',
            paymentMethod: 'TARJETA_CREDITO',
            paymentReference: 'TX-VORTEX-DEMO-001'
          }
        });
        console.log(`[Demo Member] Membresía activa creada para Juan Carlos Mendoza.`);
      }

      // Socio Vencido para pruebas de rechazo de acceso
      let socioVencido = await prisma.cliente.findFirst({
        where: { negocioId: vortex.id, email: 'socio.vencido@vortexfit.demo' }
      });

      if (!socioVencido) {
        socioVencido = await prisma.cliente.create({
          data: {
            id: crypto.randomUUID(),
            negocioId: vortex.id,
            nombre: 'Andrea Rivas',
            telefono: '+51988990011',
            email: 'socio.vencido@vortexfit.demo',
            updatedAt: new Date()
          }
        });

        const startPast = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const endPast = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // Venció hace 5 días
        await (prisma as any).membership.create({
          data: {
            businessId: vortex.id,
            customerId: socioVencido.id,
            membershipPlanId: demoPlanTrimestral.id,
            status: 'EXPIRED',
            startAt: startPast,
            endAt: endPast,
            price: demoPlanTrimestral.price,
            currency: 'USD',
            paymentStatus: 'PAID',
            paymentMethod: 'EFECTIVO',
            paymentReference: 'TX-EXPIRED-DEMO'
          }
        });
        console.log(`[Demo Member] Socio con membresía vencida creado: Andrea Rivas.`);
      }
    }

    // 7. Crear Clases Canónicas para vortex-fitness
    const demoClasses = [
      {
        name: 'CrossFit WOD & Potencia',
        coach: 'Alex Ríos',
        category: 'Fuerza',
        room: 'Box Principal',
        daysOfWeek: 'LUN,MIE,VIE',
        startTime: '18:30',
        durationMinutes: 60,
        capacity: 20,
        color: '#f97316',
        description: 'Entrenamiento de alta intensidad enfocado en levantamiento, resistencia cardiovascular y fuerza funcional.'
      },
      {
        name: 'Spinning Interval Extreme',
        coach: 'Paola Morales',
        category: 'Cardio',
        room: 'Sala Ciclo Indoor',
        daysOfWeek: 'LUN,MAR,MIE,JUE,VIE',
        startTime: '19:45',
        durationMinutes: 45,
        capacity: 25,
        color: '#10b981',
        description: 'Cadencias intensas sobre bicicleta con música motivacional y medición de potencia.'
      },
      {
        name: 'Funcional HIIT & Core',
        coach: 'Javier Ramos',
        category: 'Funcional',
        room: 'Zona Funcional Box',
        daysOfWeek: 'MAR,JUE,SAB',
        startTime: '20:45',
        durationMinutes: 50,
        capacity: 18,
        color: '#06b6d4',
        description: 'Circuitos dinámicos metabólicos para quema calórica, agilidad y fortalecimiento del core.'
      },
      {
        name: 'Yoga Power & Movilidad',
        coach: 'Elena Castro',
        category: 'Mente & Cuerpo',
        room: 'Estudio Zen',
        daysOfWeek: 'LUN,MIE,VIE',
        startTime: '07:30',
        durationMinutes: 55,
        capacity: 15,
        color: '#a855f7',
        description: 'Fluidez postural, respiración consciente, elongación profunda y prevención de lesiones.'
      }
    ];

    for (const dc of demoClasses) {
      const existingClass = await (prisma as any).gymClass.findFirst({
        where: { businessId: vortex.id, name: dc.name }
      });
      if (!existingClass) {
        await (prisma as any).gymClass.create({
          data: {
            businessId: vortex.id,
            name: dc.name,
            coach: dc.coach,
            category: dc.category,
            room: dc.room,
            daysOfWeek: dc.daysOfWeek,
            startTime: dc.startTime,
            durationMinutes: dc.durationMinutes,
            capacity: dc.capacity,
            color: dc.color,
            description: dc.description,
            active: true
          }
        });
        console.log(`[Demo GymClass] Creada clase ${dc.name} para vortex-fitness.`);
      }
    }
  }

  console.log('--- [SEED CANONICAL GIMNASIO] Finalizado con éxito ---');
}

if (require.main === module) {
  seedGymCanonical()
    .catch((err) => {
      console.error('Error en seedGymCanonical:', err);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}
