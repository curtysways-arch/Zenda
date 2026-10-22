import prisma from '../src/lib/prisma';

async function main() {
  console.log('================================================================================');
  console.log('   CITIOX - FASE A: CLASIFICACIÓN CONCEPTUAL DE PRODUCTOS SIN_BODEGA');
  console.log('================================================================================\n');

  const prods = await (prisma as any).producto.findMany({
    select: {
      id: true,
      nombre: true,
      sku: true,
      tipoProducto: true,
      unidadMedida: true,
      stock: true,
      precio: true,
      negocio: { select: { id: true, nombre: true } }
    },
    orderBy: { nombre: 'asc' }
  });

  const sinBodegaItems: any[] = [];

  for (const p of prods) {
    const whCount = await (prisma as any).warehouseStock.count({ where: { productId: p.id } });
    const stockVal = p.stock !== null ? Number(p.stock) : 0;
    if (whCount === 0 && stockVal > 0) {
      sinBodegaItems.push({
        id: p.id,
        nombre: p.nombre,
        sku: p.sku || 'N/A',
        tipo: p.tipoProducto || 'VENTA',
        stock: stockVal,
        uom: p.unidadMedida || 'UNIDAD',
        negocio: p.negocio.nombre
      });
    }
  }

  console.log(`Total de productos en estado SIN_BODEGA encontrados: ${sinBodegaItems.length}\n`);
  console.table(sinBodegaItems);

  await prisma.$disconnect();
}

main().catch(console.error);
