import prisma from '../src/lib/prisma';

export interface DiscrepancyRow {
  productId: string;
  nombre: string;
  sku: string | null;
  tipoProducto: string;
  unidadMedida: string;
  stockProducto: number | null;
  stockBodegas: number;
  stockSucursales: number;
  saldoKardex: number | null;
  movimientosCount: number;
  difProdBodega: number;
  difBodegaSucursal: number;
  estado: 'OK' | 'DISCREPANCIA' | 'SIN_BODEGA' | 'SIN_KARDEX' | 'PENDIENTE_AUDITORIA';
  observaciones: string[];
}

export async function generateInventoryDiscrepancyReport(): Promise<DiscrepancyRow[]> {
  const productos = await (prisma as any).producto.findMany({
    include: {
      negocio: { select: { id: true, nombre: true } }
    },
    orderBy: { nombre: 'asc' }
  });

  const report: DiscrepancyRow[] = [];

  for (const prod of productos) {
    const rawProdStock = prod.stock ?? null;
    const prodStockNum = prod.stock ?? 0;

    // 1. Suma de WarehouseStock
    const whStocks = await (prisma as any).warehouseStock.findMany({
      where: { productId: prod.id }
    });
    const stockBodegas = whStocks.reduce((acc: number, w: any) => acc + (Number(w.quantity) || 0), 0);

    // 2. Suma de BranchInventory
    const branchInvs = await (prisma as any).branchInventory.findMany({
      where: { productId: prod.id }
    });
    const stockSucursales = branchInvs.reduce((acc: number, b: any) => acc + (Number(b.stock) || 0), 0);

    // 3. Kardex de InventoryMovement
    const movements = await (prisma as any).inventoryMovement.findMany({
      where: { productId: prod.id },
      orderBy: { createdAt: 'asc' }
    });
    const movimientosCount = movements.length;
    const saldoKardex = movimientosCount > 0
      ? movements.reduce((acc: number, m: any) => acc + (Number(m.quantity) || 0), 0)
      : null;

    const difProdBodega = prodStockNum - stockBodegas;
    const difBodegaSucursal = stockBodegas - stockSucursales;

    const observaciones: string[] = [];
    let estado: DiscrepancyRow['estado'] = 'OK';

    if (whStocks.length === 0 && prodStockNum > 0) {
      estado = 'SIN_BODEGA';
      observaciones.push('Tiene stock en Producto pero no existe registro en ninguna bodega.');
    } else if (movimientosCount === 0 && (prodStockNum > 0 || stockBodegas > 0)) {
      estado = 'SIN_KARDEX';
      observaciones.push('Existe saldo físico o global sin historial en InventoryMovement.');
    } else if (prodStockNum < 0 || stockBodegas < 0 || stockSucursales < 0) {
      estado = 'PENDIENTE_AUDITORIA';
      observaciones.push('Saldo negativo detectado en uno o más niveles.');
    } else if (Math.abs(difProdBodega) > 0.0001 || Math.abs(difBodegaSucursal) > 0.0001) {
      estado = 'DISCREPANCIA';
      if (Math.abs(difProdBodega) > 0.0001) {
        observaciones.push(`Descuadre Producto vs Bodegas: dif = ${difProdBodega}`);
      }
      if (Math.abs(difBodegaSucursal) > 0.0001) {
        observaciones.push(`Descuadre Bodegas vs Sucursales: dif = ${difBodegaSucursal}`);
      }
    } else {
      estado = 'OK';
      observaciones.push('Saldos alineados en Producto, Bodegas y Sucursales.');
    }

    report.push({
      productId: prod.id,
      nombre: prod.nombre,
      sku: prod.sku,
      tipoProducto: prod.tipoProducto || 'VENTA',
      unidadMedida: prod.unidadMedida || 'UNIDAD',
      stockProducto: rawProdStock,
      stockBodegas,
      stockSucursales,
      saldoKardex,
      movimientosCount,
      difProdBodega,
      difBodegaSucursal,
      estado,
      observaciones
    });
  }

  return report;
}

async function run() {
  console.log('='.repeat(95));
  console.log('   CITIOX - INVENTORY DISCREPANCY REPORT (SOLO LECTURA - SIN MUTACIONES)');
  console.log('='.repeat(95));

  const report = await generateInventoryDiscrepancyReport();

  console.table(
    report.map(r => ({
      Producto: r.nombre.slice(0, 24),
      Tipo: r.tipoProducto,
      UOM: r.unidadMedida,
      'P.Stock': r.stockProducto,
      'WH.Stock': r.stockBodegas,
      'Br.Stock': r.stockSucursales,
      Kardex: r.saldoKardex !== null ? r.saldoKardex : 'N/A',
      Movs: r.movimientosCount,
      Estado: r.estado
    }))
  );

  const stats = {
    TOTAL: report.length,
    OK: report.filter(r => r.estado === 'OK').length,
    DISCREPANCIA: report.filter(r => r.estado === 'DISCREPANCIA').length,
    SIN_BODEGA: report.filter(r => r.estado === 'SIN_BODEGA').length,
    SIN_KARDEX: report.filter(r => r.estado === 'SIN_KARDEX').length,
    PENDIENTE_AUDITORIA: report.filter(r => r.estado === 'PENDIENTE_AUDITORIA').length
  };

  console.log('\nRESUMEN DE ESTADOS:', stats);
  console.log('='.repeat(95));
}

if (require.main === module) {
  run()
    .catch(err => {
      console.error('Error al generar reporte:', err);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}
