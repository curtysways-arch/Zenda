import prisma from '../lib/prisma';
import crypto from 'crypto';

async function seedShoeCareContent() {
  console.log('--- [SEED SHOE CARE] Verificando e insertando productos y servicios de Bubble Wash ---');

  const negocios = await prisma.negocio.findMany({
    where: {
      OR: [
        { slug: 'lavado' },
        { slug: 'bubble-wash' },
        { nombre: { contains: 'Bubble' } },
        { nombre: { contains: 'bubble' } },
        { nombre: { contains: 'Wash' } },
        { nombre: { contains: 'wash' } },
        { tipoNegocio: 'SHOE_CARE' },
        { tipoNegocio: 'LAVANDERIA' }
      ]
    }
  });

  if (!negocios || negocios.length === 0) {
    console.log('No se encontraron negocios de tipo lavado/bubble-wash.');
    return;
  }

  for (const negocio of negocios) {
    console.log(`Procesando negocio: ${negocio.nombre} (${negocio.slug}) [ID: ${negocio.id}]`);
    const negocioId = negocio.id;

    // 1. Categorias de Productos
    const categoriasDef = ['Limpieza', 'Proteccion', 'Accesorios', 'Estilo'];
    const catMap = new Map<string, string>();

    for (const catName of categoriasDef) {
      let cat = await (prisma as any).categoriaProducto.findFirst({
        where: { negocioId, nombre: catName }
      });
      if (!cat) {
        cat = await (prisma as any).categoriaProducto.create({
          data: {
            negocioId,
            nombre: catName,
            activo: true,
            orden: categoriasDef.indexOf(catName)
          }
        });
        console.log(`  + Creada categoria: ${catName}`);
      }
      catMap.set(catName, cat.id);
    }

    // 2. Productos Canonicos
    const CANONICAL_PRODUCTS = [
      {
        nombre: 'Espuma Limpiadora Bubble Clean (250ml)',
        descripcion: 'Formula activa de limpieza instantanea y secado ultra rapido. Segura en malla, cuero, lona y sinteticos.',
        precio: 12.50,
        categoria: 'Limpieza',
        imagenUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80',
        stock: 25,
        orden: 0
      },
      {
        nombre: 'Impermeabilizante Nano Protector (200ml)',
        descripcion: 'Capa molecular invisible que repele agua, lluvia, cafe, salsas y suciedad extrema hasta por 4 semanas.',
        precio: 14.00,
        categoria: 'Proteccion',
        imagenUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80',
        stock: 18,
        orden: 1
      },
      {
        nombre: 'Cepillo de Cerdas Suaves de Cerdo',
        descripcion: 'Cerdas naturales extra suaves pensadas para limpiar telas premium, gamuza y nobuk sin raspar ni deshilachar.',
        precio: 6.50,
        categoria: 'Accesorios',
        imagenUrl: 'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?w=500&q=80',
        stock: 30,
        orden: 2
      },
      {
        nombre: 'Cordones Premium Reflectivos 3M (Par)',
        descripcion: 'Laces de alta densidad con filamentos reflectivos para maxima visibilidad nocturna y estilo sneakerhead.',
        precio: 5.00,
        categoria: 'Estilo',
        imagenUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&q=80',
        stock: 40,
        orden: 3
      }
    ];

    for (const prod of CANONICAL_PRODUCTS) {
      const existing = await (prisma as any).producto.findFirst({
        where: { negocioId, nombre: prod.nombre }
      });
      if (!existing) {
        await (prisma as any).producto.create({
          data: {
            negocioId,
            nombre: prod.nombre,
            descripcion: prod.descripcion,
            precio: prod.precio,
            stock: prod.stock,
            activo: true,
            imagenUrl: prod.imagenUrl,
            categoriaId: catMap.get(prod.categoria) || null,
            orden: prod.orden,
            updatedAt: new Date()
          }
        });
        console.log(`  + Creado producto: ${prod.nombre}`);
      } else {
        console.log(`  = Producto ya existe: ${prod.nombre}`);
      }
    }

    // 3. Servicios Canonicos
    const CANONICAL_SERVICES = [
      {
        nombre: 'Lavado Basico',
        precio: 4.0,
        duracion: 30,
        descripcion: 'Ideal para zapatos con poco suciedad.',
        imagen: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80'
      },
      {
        nombre: 'Lavado Completo',
        precio: 6.0,
        duracion: 45,
        descripcion: 'Limpieza profunda interior y exterior.',
        imagen: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&q=80'
      },
      {
        nombre: 'Sneakers Premium',
        precio: 8.0,
        duracion: 60,
        descripcion: 'Materiales delicados y premium.',
        imagen: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=400&q=80'
      },
      {
        nombre: 'Blancos',
        precio: 7.0,
        duracion: 45,
        descripcion: 'Recuperacion de color.',
        imagen: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80'
      },
      {
        nombre: 'Gamuza',
        precio: 9.0,
        duracion: 60,
        descripcion: 'Proceso especializado.',
        imagen: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=400&q=80'
      },
      {
        nombre: 'Restauracion',
        precio: 15.0,
        duracion: 90,
        descripcion: 'Limpieza + recuperacion.',
        imagen: 'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=400&q=80'
      }
    ];

    for (const srv of CANONICAL_SERVICES) {
      const existing = await prisma.service.findFirst({
        where: { negocioId, nombre: srv.nombre }
      });
      if (!existing) {
        await prisma.service.create({
          data: {
            id: crypto.randomUUID(),
            negocioId,
            nombre: srv.nombre,
            precio: srv.precio,
            duracion: srv.duracion,
            estaActivo: true,
            extraInfo: {
              descripcion: srv.descripcion,
              imagenUrl: srv.imagen,
              tipo: 'LAVADO'
            },
            updatedAt: new Date()
          }
        });
        console.log(`  + Creado servicio: ${srv.nombre}`);
      } else {
        console.log(`  = Servicio ya existe: ${srv.nombre}`);
      }
    }
  }

  console.log('--- [SEED SHOE CARE] Completado exitosamente ---');
}

seedShoeCareContent()
  .catch((e) => {
    console.error('Error en seedShoeCareContent:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
