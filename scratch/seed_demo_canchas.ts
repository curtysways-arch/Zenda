import prisma from '../src/lib/prisma';
import { BusinessProvisioningService } from '../src/core/services/BusinessProvisioningService';

async function seedDemoCanchas() {
  console.log("=== ACTUALIZANDO NEGOCIO DEMO CANCHAS ===");

  const slug = 'demo-canchas';
  const padelBanner = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=1200';

  let negocio = await prisma.negocio.findUnique({
    where: { slug },
  });

  const configJson = {
    bannerUrl: padelBanner,
    tipoNegocio: 'SPORTS_COURTS',
    descripcionCorta: 'Club Deportivo de Pádel & Tenis',
    wizardCompleted: true,
  };

  if (!negocio) {
    negocio = await prisma.negocio.create({
      data: {
        id: 'demo-canchas-id-100',
        nombre: '🏓 Club Pádel & Tenis El Dorado',
        slug,
        whatsapp: '+573001234567',
        direccion: 'Av. Deportiva #45-12',
        ciudad: 'Bogotá',
        precioHora: 25000,
        horarioApertura: '07:00',
        horarioCierre: '23:00',
        colorPrimario: '#059669',
        colorSecundario: '#064e3b',
        heroTitulo: 'Reserva tu Cancha de Pádel en Vivo',
        heroSubtitulo: 'Disfruta de la mejor experiencia deportiva con reserva inmediata de turnos.',
        configuracion: configJson as any,
        estado: 'ACTIVO',
        isDemo: true,
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.negocio.update({
      where: { id: negocio.id },
      data: {
        heroTitulo: 'Reserva tu Cancha de Pádel en Vivo',
        heroSubtitulo: 'Disfruta de la mejor experiencia deportiva con reserva inmediata de turnos.',
        configuracion: configJson as any,
      },
    });
  }

  // 2. Aprovisionar con el template oficial PADEL_CLUB_STANDARD
  await BusinessProvisioningService.provisionTemplate(negocio.id, 'PADEL_CLUB_STANDARD');

  console.log(`\n✅ NEGOCIO DEMO CANCHAS ACTUALIZADO CON ÉXITO!`);
  console.log(`- Slug público: http://localhost:3000/${slug}`);
}

seedDemoCanchas().catch(console.error).finally(() => process.exit(0));
