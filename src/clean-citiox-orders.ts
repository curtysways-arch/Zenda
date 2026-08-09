import prisma from './lib/prisma';

async function main() {
  console.log('=== BUSCANDO NEGOCIO RESTAURANTE CITIOX ===');

  const negocios = await (prisma as any).negocio.findMany({
    select: { id: true, nombre: true, slug: true }
  });

  console.log('Negocios registrados:', negocios);

  // Filtrar restaurante citiox
  const target = negocios.find((n: any) => 
    n.slug.includes('citiox') || 
    n.slug.includes('parrilla') || 
    n.nombre.toLowerCase().includes('citiox')
  );

  if (!target) {
    console.log('No se encontró un negocio con el slug o nombre Citiox.');
    return;
  }

  console.log(`🎯 Negocio Objetivo: ${target.nombre} (ID: ${target.id}, Slug: ${target.slug})`);

  // Obtener IDs de pedidos
  const pedidos = await (prisma as any).pedido.findMany({
    where: { negocioId: target.id },
    select: { id: true, paymentId: true }
  });

  const pedidoIds = pedidos.map((p: any) => p.id);
  console.log(`Encontrados ${pedidoIds.length} pedidos para eliminar.`);

  if (pedidoIds.length === 0) {
    console.log('No hay pedidos que eliminar.');
    return;
  }

  // 1. DeliveryAssignments
  const delAssignments = await (prisma as any).deliveryAssignment.deleteMany({
    where: { ordenReferenciaId: { in: pedidoIds } }
  }).catch(() => ({ count: 0 }));

  // 2. PedidoItems
  const items = await (prisma as any).pedidoItem.deleteMany({
    where: { pedidoId: { in: pedidoIds } }
  });

  // 3. Payments
  const paymentIds = pedidos.map((p: any) => p.paymentId).filter(Boolean);
  if (paymentIds.length > 0) {
    await (prisma as any).paymentEvidence.deleteMany({
      where: { orderPaymentId: { in: paymentIds } }
    }).catch(() => {});

    await (prisma as any).orderPayment.deleteMany({
      where: { id: { in: paymentIds } }
    }).catch(() => {});
  }

  // 4. Pedidos
  const res = await (prisma as any).pedido.deleteMany({
    where: { id: { in: pedidoIds } }
  });

  console.log(`✅ ¡ÉXITO! Se eliminaron ${res.count} pedidos del restaurante ${target.nombre}.`);
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
