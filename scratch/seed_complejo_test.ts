import prisma from '../src/lib/prisma';

async function seedComplejoTest() {
  console.log("=== CREANDO NEGOCIO 'complejo-test' PARA MATCHEAR LA URL DEL USUARIO ===");

  const slug = 'complejo-test';

  const existing = await prisma.negocio.findUnique({
    where: { slug },
  });

  if (!existing) {
    const negocio = await prisma.negocio.create({
      data: {
        id: 'complejo-test-id-101',
        nombre: 'CANCHA LOS CAMPEONES',
        slug,
        precioHora: 25000,
        horarioApertura: '07:00',
        horarioCierre: '23:00',
        tipoNegocio: 'SPORTS_COURTS',
        colorPrimario: '#059669',
        isDemo: true,
        updatedAt: new Date(),
        configuracion: {
          tipoNegocio: 'SPORTS_COURTS',
          wizardCompleted: true,
          bannerUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=1200',
          heroTitulo: 'DONDE EL JUEGO SE VIVE AL MÁXIMO',
          heroSubtitulo: 'Instalaciones de alto nivel diseñadas para vivir el deporte al máximo.',
        } as any,
      },
    });

    console.log(`✅ Negocio creado: ${negocio.nombre} (${negocio.slug})`);

    // Crear canchas para este negocio
    await (prisma as any).servicio.createMany({
      data: [
        {
          id: 'cancha-comp-1',
          negocioId: negocio.id,
          nombre: 'CANCHA ELITE',
          descripcion: 'Cancha profesional de pádel cristal con iluminación constante.',
          precio: 25000,
          duracionMinutos: 90,
          tipo: 'FÚTBOL 7 / PÁDEL',
          activo: true,
          updatedAt: new Date(),
        },
        {
          id: 'cancha-comp-2',
          negocioId: negocio.id,
          nombre: 'CANCHA PREMIUM',
          descripcion: 'Cancha sintética para partidos de alto rendimiento.',
          precio: 30000,
          duracionMinutos: 90,
          tipo: 'FÚTBOL 7',
          activo: true,
          updatedAt: new Date(),
        },
      ]
    }).catch(() => {});
  } else {
    await prisma.negocio.update({
      where: { slug },
      data: {
        tipoNegocio: 'SPORTS_COURTS',
        configuracion: {
          tipoNegocio: 'SPORTS_COURTS',
          wizardCompleted: true,
        } as any,
      }
    });
    console.log(`✅ Negocio 'complejo-test' actualizado a SPORTS_COURTS`);
  }
}

seedComplejoTest().catch(console.error).finally(() => process.exit(0));
