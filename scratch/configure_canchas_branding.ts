import prisma from '../src/lib/prisma';

async function configureCanchasBranding() {
  console.log("=== CONFIGURANDO BANNERS, COLORES, PROMOCIONES Y PÁGINAS DE CANCHAS ===");

  const slugs = ['demo-canchas', 'complejo-test'];

  for (const slug of slugs) {
    const negocio = await prisma.negocio.findUnique({
      where: { slug },
    });

    if (negocio) {
      // 1. Actualizar Banners y Colores Deportivos en Negocio
      await prisma.negocio.update({
        where: { id: negocio.id },
        data: {
          colorPrimario: '#059669', // Emerald Verde Deportivo
          colorSecundario: '#0284c7', // Sky Blue Accent
          logoUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=200',
          horarioApertura: '07:00',
          horarioCierre: '23:00',
          precioHora: 25,
          configuracion: {
            tipoNegocio: 'SPORTS_COURTS',
            bannerUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=1200',
            heroTitulo: 'DONDE EL JUEGO SE VIVE AL MÁXIMO',
            heroSubtitulo: 'Instalaciones de alto nivel diseñadas para vivir el deporte al máximo.',
            wizardCompleted: true,
          } as any,
        },
      });

      // 2. Crear o actualizar Promociones Automáticas
      await (prisma as any).promotion.deleteMany({ where: { negocioId: negocio.id } }).catch(() => {});
      await (prisma as any).promotion.createMany({
        data: [
          {
            id: `promo-1-${negocio.id}`,
            negocioId: negocio.id,
            nombre: 'Mañanero Deportivo 20% OFF',
            descripcion: 'Descuento especial de 07:00 a 11:00 hs en canchas sintéticas y pádel.',
            descuentoPorcentaje: 20,
            activo: true,
            updatedAt: new Date(),
          },
          {
            id: `promo-2-${negocio.id}`,
            negocioId: negocio.id,
            nombre: 'Super Pack Fin de Semana',
            descripcion: 'Reserva 2 horas continuas y recibe hidratación sin costo adicional.',
            descuentoPorcentaje: 15,
            activo: true,
            updatedAt: new Date(),
          },
        ]
      }).catch(() => {});

      // 3. Crear o actualizar Páginas Informativas
      await (prisma as any).page.deleteMany({ where: { negocioId: negocio.id } }).catch(() => {});
      await (prisma as any).page.createMany({
        data: [
          {
            id: `page-reglamento-${negocio.id}`,
            negocioId: negocio.id,
            slug: 'reglamento',
            titulo: 'Reglamento Interno del Club',
            contenido: '# Reglamento de Instalaciones\n- Uso obligatorio de calzado deportivo.\n- Cancelaciones con 4 horas de anticipación.',
            publicada: true,
            updatedAt: new Date(),
          },
          {
            id: `page-tarifas-${negocio.id}`,
            negocioId: negocio.id,
            slug: 'tarifas',
            titulo: 'Tarifas y Horarios 2026',
            contenido: '# Tarifas del Escenario\n- Turno Diurno (07:00 - 18:00): $25 USD / 90m\n- Turno Nocturno (18:00 - 23:00): $30 USD / 90m',
            publicada: true,
            updatedAt: new Date(),
          },
        ]
      }).catch(() => {});

      console.log(`✅ Branding, Banners, Promociones y Páginas configurados para ${negocio.slug}`);
    }
  }
}

configureCanchasBranding().catch(console.error).finally(() => process.exit(0));
