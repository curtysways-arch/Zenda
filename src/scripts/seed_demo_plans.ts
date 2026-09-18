import prisma from '../lib/prisma';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('--- Actualizando Planes de Gimnasio con backoff ---');

  const vortex = await prisma.negocio.findUnique({
    where: { slug: 'vortex-fitness' },
    select: { id: true, configuracion: true }
  });

  if (!vortex) {
    console.error('Negocio no encontrado');
    return;
  }

  const plans = [
    {
      name: 'Pase Diario',
      description: 'Acceso por 1 día completo a la sala de musculación, peso libre y área cardiovascular.',
      price: 5.00,
      currency: 'USD',
      durationDays: 1,
      displayOrder: 1,
      featured: false,
      benefits: [
        'Acceso ilimitado por 24 horas',
        'Uso libre de máquinas y mancuernas',
        'Vestidores con duchas y lockers',
        'Código QR de acceso instantáneo'
      ]
    },
    {
      name: 'Pase Mensual Fitness',
      description: 'Tu rutina mensual sin ataduras ni compromisos a largo plazo. Ideal para empezar.',
      price: 30.00,
      currency: 'USD',
      durationDays: 30,
      displayOrder: 2,
      featured: false,
      benefits: [
        'Acceso 24/7 sin límite de visitas',
        'Acceso a toda el área de fuerza y cardio',
        'Vestidores premium y casilleros de uso diario',
        'Evaluación física inicial gratuita',
        'Acceso a la app con carnet QR'
      ]
    },
    {
      name: 'Plan Trimestral Pro',
      description: 'El plan más elegido por los atletas. Desarrolla tu fuerza y consolida tu hábito.',
      price: 80.00,
      currency: 'USD',
      durationDays: 90,
      displayOrder: 3,
      featured: true,
      benefits: [
        'Acceso total durante 3 meses consecutivos',
        'Todas las clases grupales incluidas (HIIT, Funcional, Yoga)',
        '1 sesión de asesoría con entrenador certificado',
        'Congelamiento de hasta 7 días por viaje o salud',
        'Descuento del 10% en cafetería y suplementos'
      ]
    },
    {
      name: 'Plan Semestral Atleta',
      description: '6 meses de rendimiento puro al mejor costo por mes para socios comprometidos.',
      price: 150.00,
      currency: 'USD',
      durationDays: 180,
      displayOrder: 4,
      featured: false,
      benefits: [
        'Acceso ilimitado durante 180 días',
        'Clases grupales premium y talleres de técnica',
        'Hasta 15 días de congelamiento flexible',
        '1 pase de invitado gratis al mes',
        'Rutina personalizada actualizada cada mes'
      ]
    },
    {
      name: 'Membresía Black Anual',
      description: 'La experiencia VIP definitiva. Acceso sin límites durante 365 días con todos los beneficios exclusivos.',
      price: 270.00,
      currency: 'USD',
      durationDays: 365,
      displayOrder: 5,
      featured: true,
      benefits: [
        'Pase VIP los 365 días del año sin restricciones',
        'Casillero privado y servicio de toalla incluido',
        '2 pases de invitado por mes para entrenar con amigos',
        'Congelamiento de hasta 30 días acumulables',
        'Asesoría nutricional y seguimiento antropométrico trimestral',
        'Kit de bienvenida exclusivo Vortex Black'
      ]
    }
  ];

  for (const p of plans) {
    await sleep(400);
    try {
      const existing = await (prisma as any).membershipPlan.findFirst({
        where: { businessId: vortex.id, name: p.name }
      });

      if (existing) {
        await (prisma as any).membershipPlan.update({
          where: { id: existing.id },
          data: {
            description: p.description,
            price: p.price,
            currency: p.currency,
            durationDays: p.durationDays,
            displayOrder: p.displayOrder,
            featured: p.featured,
            benefits: p.benefits,
            active: true
          }
        });
        console.log(`[OK] Actualizado: ${p.name}`);
      } else {
        await (prisma as any).membershipPlan.create({
          data: {
            businessId: vortex.id,
            name: p.name,
            description: p.description,
            price: p.price,
            currency: p.currency,
            durationDays: p.durationDays,
            displayOrder: p.displayOrder,
            featured: p.featured,
            benefits: p.benefits,
            active: true
          }
        });
        console.log(`[OK] Creado: ${p.name}`);
      }
    } catch (err: any) {
      console.warn(`[Reintentando] ${p.name}:`, err.message);
      await sleep(1000);
      const existing = await (prisma as any).membershipPlan.findFirst({
        where: { businessId: vortex.id, name: p.name }
      });
      if (existing) {
        await (prisma as any).membershipPlan.update({
          where: { id: existing.id },
          data: { price: p.price, active: true }
        });
      } else {
        await (prisma as any).membershipPlan.create({
          data: {
            businessId: vortex.id,
            name: p.name,
            description: p.description,
            price: p.price,
            currency: p.currency,
            durationDays: p.durationDays,
            displayOrder: p.displayOrder,
            featured: p.featured,
            benefits: p.benefits,
            active: true
          }
        });
      }
      console.log(`[OK en reintento] ${p.name}`);
    }
  }

  // Actualizar configuracion landing
  await sleep(400);
  let cfg: any = {};
  if (typeof vortex.configuracion === 'string') {
    try { cfg = JSON.parse(vortex.configuracion); } catch { cfg = {}; }
  } else {
    cfg = vortex.configuracion || {};
  }

  cfg.gymLandingConfig = {
    heroBannerUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1920&auto=format&fit=crop',
    heroBadge: 'Gimnasio & Centro Fitness Oficial',
    heroTitulo: 'TU MEJOR VERSIÓN COMIENZA AQUÍ',
    heroSubtitulo: 'Entrena con los mejores equipos, clases exclusivas y acceso inteligente por QR.',
    heroStats: [
      { value: '24/7', label: 'Acceso Inteligente' },
      { value: '+50', label: 'Máquinas Pro' },
      { value: '100%', label: 'Sin Contratos Ocultos' }
    ],
    heroCtaPrimary: 'Ver Membresías',
    heroCtaSecondary: 'Conocer el Gimnasio',
    facilitiesBadge: 'Instalaciones de Primer Nivel',
    facilitiesTitle: 'DISEÑADO PARA TU RENDIMIENTO',
    facilitiesDescription: 'El centro fitness definitivo diseñado para transformar tu rendimiento físico con tecnología de vanguardia y comunidad apasionada.',
    benefits: [
      'Acceso 24/7 con código QR digital',
      'Área completa de peso libre y fuerza',
      'Zona cardiovascular de última generación',
      'Vestidores premium con duchas y lockers',
      'Clases grupales de alta intensidad y yoga',
      'Asesoría y seguimiento físico trimestral'
    ],
    featureCards: [
      {
        id: 'card-1',
        title: 'Acceso con Tu QR',
        description: 'Ingreso automático sin filas ni tarjetas físicas.',
        icon: 'qr'
      },
      {
        id: 'card-2',
        title: 'Club de Beneficios',
        description: 'Gana puntos y premios exclusivos por cada asistencia.',
        icon: 'award'
      },
      {
        id: 'card-3',
        title: 'Zona de Alta Intensidad',
        description: 'Espacios de acondicionamiento físico, fuerza y cardio.',
        icon: 'zap'
      }
    ],
    horarioSemana: 'Lunes a Viernes: 06:00 - 22:00',
    horarioFinSemana: 'Sábados y Domingos: 08:00 - 18:00'
  };

  await prisma.negocio.update({
    where: { id: vortex.id },
    data: {
      configuracion: cfg,
      bannerUrl: cfg.gymLandingConfig.heroBannerUrl
    }
  });

  console.log('--- Finalizado con éxito rotundo ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
