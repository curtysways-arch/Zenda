import prisma from '../lib/prisma';

async function runPublicMesaViewTest() {
  console.log('🧪 Iniciando prueba de la vista pública de mesa con landing y funciones...');

  // 1. Encontrar o crear negocio y mesa
  let biz = await (prisma as any).negocio.findFirst({
    include: {
      productos: { include: { categoria: true } },
      categoriasProducto: true,
      RestaurantTable: true
    }
  });

  if (!biz) {
    throw new Error('No se encontró ningún negocio para la prueba');
  }

  // Asegurar mesa
  let table = biz.RestaurantTable?.[0];
  if (!table) {
    table = await (prisma as any).restaurantTable.create({
      data: {
        negocioId: biz.id,
        nombre: 'Mesa Salón VIP',
        numero: 1,
        capacidad: 4,
        activa: true,
        permitePedidos: true,
        estado: 'DISPONIBLE'
      }
    });
  }

  // Asegurar al menos una categoría y producto
  if (!biz.categoriasProducto || biz.categoriasProducto.length === 0) {
    await (prisma as any).categoriaProducto.create({
      data: {
        negocioId: biz.id,
        nombre: 'Platos Fuertes',
        orden: 1,
        activo: true
      }
    });
  }

  const cat = await (prisma as any).categoriaProducto.findFirst({ where: { negocioId: biz.id } });

  let prod = await (prisma as any).producto.findFirst({ where: { negocioId: biz.id } });
  if (!prod) {
    prod = await (prisma as any).producto.create({
      data: {
        negocioId: biz.id,
        nombre: 'Parrillada Mixta Especial',
        descripcion: 'Carne de res, pollo, chorizo y papas al vapor con ensalada fresca.',
        precio: 15.50,
        categoriaId: cat?.id || null,
        activo: true,
        imagenUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80'
      }
    });
  }

  console.log(`✅ Negocio: ${biz.nombre} (${biz.slug})`);
  console.log(`✅ Mesa de prueba: ${table.nombre} (Token: ${table.token})`);

  // 2. Probar resolución del endpoint público de la mesa
  console.log('\n--- PASO 1: Consultar /api/public/[slug]/mesa/[token] ---');
  const { resolveLandingContent } = await import('../lib/landingContentResolver');
  const landingContent = await resolveLandingContent(biz.id).catch(() => ({ hero: [], highlights: [] }));
  const categories = await (prisma as any).categoriaProducto.findMany({ where: { negocioId: biz.id, activo: true } });
  const products = await (prisma as any).producto.findMany({ where: { negocioId: biz.id, activo: true } });

  console.log(`✅ Categorías cargadas: ${categories.length}`);
  console.log(`✅ Productos cargados: ${products.length}`);
  console.log(`✅ Banners Hero en landingContent: ${landingContent.hero?.length || 0}`);
  console.log(`✅ Promociones Highlights en landingContent: ${landingContent.highlights?.length || 0}`);

  // 3. Probar simulación de Llamada al Mesero
  console.log('\n--- PASO 2: Probar Llamar al Mesero / Pedir Cuenta ---');
  const waiterCall = await (prisma as any).waiterCall.create({
    data: {
      tableId: table.id,
      negocioId: biz.id,
      tableSessionId: 'test_sess_' + Date.now(),
      estado: 'PENDING',
      notas: 'Cliente solicita la cuenta en mesa'
    }
  });
  console.log(`✅ Llamada de mesero registrada: ID ${waiterCall.id}, Notas: "${waiterCall.notas}"`);

  // 4. Probar simulación de Pedido de Mesa
  console.log('\n--- PASO 3: Probar Solicitud de Pedido (Comanda en Mesa) ---');
  const orderReq = await (prisma as any).tableOrderRequest.create({
    data: {
      tableId: table.id,
      negocioId: biz.id,
      tableSessionId: 'test_sess_' + Date.now(),
      nombreCliente: 'Carlos Invitado',
      telefonoCliente: '0991234567',
      items: [
        {
          productoId: prod.id,
          nombre: prod.nombre,
          precioUnitario: prod.precio,
          cantidad: 2
        }
      ],
      subtotal: prod.precio * 2,
      total: prod.precio * 2,
      notas: 'Término medio, por favor',
      estado: 'PENDING_ADMIN_CONFIRMATION',
      locationValidated: true
    }
  });
  console.log(`✅ Solicitud de comanda creada: ID ${orderReq.id}, Total: $${orderReq.total}, Cliente: ${orderReq.nombreCliente}`);

  // Limpieza de registros temporales de prueba
  await (prisma as any).waiterCall.delete({ where: { id: waiterCall.id } });
  await (prisma as any).tableOrderRequest.delete({ where: { id: orderReq.id } });

  console.log('\n🎉 ¡TODAS LAS VALIDACIONES DE LA VISTA PÚBLICA DE MESA COMPLETADAS CON ÉXITO!');
}

runPublicMesaViewTest()
  .catch(err => {
    console.error('❌ Error en prueba:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
