import prisma from '@/lib/prisma';

async function main() {
  const negocio = await prisma.negocio.findFirst({ where: { slug: 'demo-spa' } });
  const businessId = negocio?.id || process.env.NEXT_PUBLIC_BUSINESS_ID || 'demo-spa-id';

  // BEFORE_AFTER example 1
  await prisma.resultado.create({
    data: {
      businessId,
      title: 'Tratamiento Facial Rejuvenecedor',
      description: 'Antes y después de un facial revitalizante.',
      type: 'BEFORE_AFTER',
      beforeImage: 'https://images.unsplash.com/photo-1556121126-199736495b0c?auto=format&fit=crop&w=800&q=80',
      afterImage: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80',
      featured: true,
      published: true,
      showInLanding: true,
    },
  });

  // BEFORE_AFTER example 2
  await prisma.resultado.create({
    data: {
      businessId,
      title: 'Diseño de Cejas & Lash Lift',
      description: 'Transformación de cejas y pestañas.',
      type: 'BEFORE_AFTER',
      beforeImage: 'https://images.unsplash.com/photo-1582719478250-3c5e0ed9b4e5?auto=format&fit=crop&w=800&q=80',
      afterImage: 'https://images.unsplash.com/photo-1582719478250-3c5e0ed9b4e5?auto=format&fit=crop&w=800&q=80',
      featured: false,
      published: true,
      showInLanding: true,
    },
  });

  // GALLERY example
  await prisma.resultado.create({
    data: {
      businessId,
      title: 'Galería de Peinados de Primavera',
      description: 'Colección de peinados frescos para la temporada.',
      type: 'GALLERY',
      gallery: [
        'https://images.unsplash.com/photo-1601924582972-3ea48be4b62e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1601924582972-3ea48be4b62e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1601924582972-3ea48be4b62e?auto=format&fit=crop&w=800&q=80',
      ],
      featured: true,
      published: true,
      showInLanding: true,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
