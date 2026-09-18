import prisma from '../lib/prisma';

async function main() {
  const vortex = await prisma.negocio.findUnique({
    where: { slug: 'vortex-fitness' },
    select: { id: true, configuracion: true }
  });

  if (!vortex) return;

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
    data: { configuracion: cfg }
  });

  const plans = await (prisma as any).membershipPlan.findMany({
    where: { businessId: vortex.id, active: true },
    orderBy: { displayOrder: 'asc' }
  });

  console.log(`Configuración guardada. Planes activos encontrados: ${plans.length}`);
  for (const pl of plans) {
    console.log(`- ${pl.name}: $${pl.price} (${pl.durationDays} días) [featured: ${pl.featured}]`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
