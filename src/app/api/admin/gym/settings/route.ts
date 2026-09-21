import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true, nombre: true, slug: true, configuracion: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    let cfg: any = {};
    if (typeof negocio.configuracion === 'string') {
      try { cfg = JSON.parse(negocio.configuracion); } catch { cfg = {}; }
    } else {
      cfg = negocio.configuracion || {};
    }

    const gymLanding = cfg.gymLandingConfig || {
      // Hero Section
      heroBannerUrl: cfg.heroBannerUrl || cfg.bannerUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1920&auto=format&fit=crop',
      heroBadge: 'Gimnasio & Centro Fitness Oficial',
      heroTitulo: cfg.heroTitulo || 'TU MEJOR VERSIÓN COMIENZA AQUÍ',
      heroSubtitulo: cfg.heroSubtitulo || 'Entrena con los mejores equipos, clases exclusivas y acceso inteligente por QR.',
      heroStats: [
        { value: '24/7', label: 'Acceso Inteligente' },
        { value: '+50', label: 'Máquinas Pro' },
        { value: '100%', label: 'Sin Contratos Ocultos' }
      ],
      heroCtaPrimary: 'Ver Membresías',
      heroCtaSecondary: 'Conocer el Gimnasio',

      // Instalaciones & Rendimiento
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

      // Horarios & Contacto
      horarioSemana: 'Lunes a Viernes: 06:00 - 22:00',
      horarioFinSemana: 'Sábados y Domingos: 08:00 - 18:00'
    };

    return NextResponse.json({
      success: true,
      gymLanding,
      negocio: {
        id: negocio.id,
        nombre: negocio.nombre,
        slug: negocio.slug,
        colorPrimario: cfg.colorPrimario || '#10b981'
      }
    });
  } catch (err: any) {
    console.error('Error fetching gym settings:', err);
    return NextResponse.json({ error: 'Error al obtener la configuración' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { gymLanding } = body;

    if (!gymLanding) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true, configuracion: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    let cfg: any = {};
    if (typeof negocio.configuracion === 'string') {
      try { cfg = JSON.parse(negocio.configuracion); } catch { cfg = {}; }
    } else {
      cfg = negocio.configuracion || {};
    }

    // Actualizar configuración
    cfg.gymLandingConfig = {
      ...cfg.gymLandingConfig,
      ...gymLanding
    };

    // Actualizar también campos de retrocompatibilidad si aplican
    if (gymLanding.heroTitulo) cfg.heroTitulo = gymLanding.heroTitulo;
    if (gymLanding.heroSubtitulo) cfg.heroSubtitulo = gymLanding.heroSubtitulo;
    if (gymLanding.heroBannerUrl) {
      cfg.heroBannerUrl = gymLanding.heroBannerUrl;
      cfg.bannerUrl = gymLanding.heroBannerUrl;
    }

    const updated = await prisma.negocio.update({
      where: { id: negocioId },
      data: {
        configuracion: cfg
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración de landing guardada con éxito',
      gymLanding: cfg.gymLandingConfig
    });
  } catch (err: any) {
    console.error('Error saving gym settings:', err);
    return NextResponse.json({ error: 'Error al guardar la configuración' }, { status: 500 });
  }
}