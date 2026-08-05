import prisma from '../src/lib/prisma';

async function seedShoeCareFull() {
  const negocioId = 'sneaker-wash-id';

  // 1. Actualizar/Crear Negocio
  const negocio = await prisma.negocio.upsert({
    where: { id: negocioId },
    update: {
      nombre: 'Sneaker Wash Premium',
      slug: 'lavado',
      whatsapp: '0991234567',
      direccion: 'Av. Amazonas 123 y Colón',
      logoUrl: '/images/bubblewash/hero_sneakers.jpg',
      colorPrimario: '#7C3AED',
      colorSecundario: '#6366F1',
      heroTitulo: 'Tus zapatos como nuevos.',
      heroSubtitulo: 'Lavamos, desinfectamos y restauramos tus zapatos con procesos profesionales.',
      horarioApertura: '09:00',
      horarioCierre: '19:00',
      tipoNegocio: 'SHOE_CARE',
      precioHora: 0,
      updatedAt: new Date()
    },
    create: {
      id: negocioId,
      nombre: 'Sneaker Wash Premium',
      slug: 'lavado',
      whatsapp: '0991234567',
      direccion: 'Av. Amazonas 123 y Colón',
      logoUrl: '/images/bubblewash/hero_sneakers.jpg',
      colorPrimario: '#7C3AED',
      colorSecundario: '#6366F1',
      heroTitulo: 'Tus zapatos como nuevos.',
      heroSubtitulo: 'Lavamos, desinfectamos y restauramos tus zapatos con procesos profesionales.',
      horarioApertura: '09:00',
      horarioCierre: '19:00',
      tipoNegocio: 'SHOE_CARE',
      precioHora: 0,
      updatedAt: new Date()
    }
  });

  console.log('✅ Negocio seeded:', negocio.nombre);

  // 2. Crear los 6 servicios oficiales de Lavado de Zapatos
  const servicios = [
    {
      id: 'srv-shoe-1',
      nombre: 'Lavado Básico',
      precio: 4.00,
      duracion: 60,
      descripcion: 'Ideal para zapatos con poco suciedad.',
      imagenUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80',
      negocioId
    },
    {
      id: 'srv-shoe-2',
      nombre: 'Lavado Completo',
      precio: 6.00,
      duracion: 60,
      descripcion: 'Limpieza profunda interior y exterior.',
      imagenUrl: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&q=80',
      negocioId
    },
    {
      id: 'srv-shoe-3',
      nombre: 'Sneakers Premium',
      precio: 8.00,
      duracion: 90,
      descripcion: 'Materiales delicados y premium.',
      imagenUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=400&q=80',
      negocioId
    },
    {
      id: 'srv-shoe-4',
      nombre: 'Blancos',
      precio: 7.00,
      duracion: 60,
      descripcion: 'Recuperación de color.',
      imagenUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80',
      negocioId
    },
    {
      id: 'srv-shoe-5',
      nombre: 'Gamuza',
      precio: 9.00,
      duracion: 90,
      descripcion: 'Proceso especializado.',
      imagenUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=400&q=80',
      negocioId
    },
    {
      id: 'srv-shoe-6',
      nombre: 'Restauración',
      precio: 15.00,
      duracion: 120,
      descripcion: 'Limpieza + recuperación.',
      imagenUrl: 'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=400&q=80',
      negocioId
    }
  ];

  for (const srv of servicios) {
    await prisma.service.upsert({
      where: { id: srv.id },
      update: {
        nombre: srv.nombre,
        precio: srv.precio,
        duracion: srv.duracion,
        extraInfo: { descripcion: srv.descripcion, imagenUrl: srv.imagenUrl },
        negocioId: srv.negocioId,
        updatedAt: new Date()
      },
      create: {
        id: srv.id,
        nombre: srv.nombre,
        precio: srv.precio,
        duracion: srv.duracion,
        extraInfo: { descripcion: srv.descripcion, imagenUrl: srv.imagenUrl },
        negocioId: srv.negocioId,
        updatedAt: new Date()
      }
    });
  }

  console.log(`✅ ${servicios.length} servicios registrados correctamente para ${negocioId}.`);
}

seedShoeCareFull()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
