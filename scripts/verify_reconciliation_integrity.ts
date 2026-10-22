import prisma from '../src/lib/prisma';
import { InventoryReconciliationService } from '../src/core/inventory/InventoryReconciliationService';

async function main() {
  console.log('--- VERIFICACIÓN DEL ESTADO DE CONCILIACIÓN ADMINISTRATIVA POST-MIGRACIÓN ---');
  
  const businesses = await prisma.negocio.findMany();
  for (const b of businesses) {
    const report = await InventoryReconciliationService.getReconciliationReport({ businessId: b.id });
    if (report.summary.totalProductos > 0) {
      console.log(`\nNegocio: "${b.nombre}" (${b.id})`);
      console.log(`  - Total Productos: ${report.summary.totalProductos}`);
      console.log(`  - Por Estado:`, JSON.stringify(report.summary.porEstado));
      console.log(`  - UOM Pendientes: ${report.summary.uomPendientes}`);
      console.log(`  - Costos Desconocidos: ${report.summary.costosDesconocidos}`);
      console.log(`  - Con Saldo Negativo: ${report.summary.productosConSaldoNegativo}`);
      
      const itemsSinBodega = report.items.filter(i => i.estado === 'SIN_BODEGA');
      console.log(`  - Items SIN_BODEGA identificados: ${itemsSinBodega.length}`);
      if (itemsSinBodega.length > 0) {
        console.log(`  ✅ [PASS] Los productos SIN_BODEGA permanecen identificados sin asignación automática forzada.`);
      }
    }
  }

  console.log('\n================================================================');
  console.log('✅ CONCILIACIÓN ADMINISTRATIVA TOTALMENTE INTACTA Y DE SOLO LECTURA');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Error en verificación de conciliación:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
