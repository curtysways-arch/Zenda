import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('================================================================================');
  console.log('   CITIOX - FASE 2F: AUDITORÍA TÉCNICA PREVIA (ETAPA 1)');
  console.log('================================================================================\n');

  // 1. Columnas físicas de SQLite en dev.db
  const tables = ['Producto', 'BranchInventory', 'WarehouseStock', 'InventoryMovement', 'PedidoItem'];
  const physicalSchema: Record<string, any[]> = {};

  for (const t of tables) {
    const cols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("${t}")`);
    physicalSchema[t] = cols;
    console.log(`--- TABLA FÍSICA dev.db: ${t} ---`);
    for (const c of cols) {
      if (['stock', 'quantity', 'costoPromedio', 'densidadGPerMl', 'negativeStockAdjustment', 'cantidad', 'precioUnitario', 'subtotal', 'total'].some(k => c.name.toLowerCase().includes(k.toLowerCase())) || ['unidadMedidaBase', 'uomStatus', 'costStatus', 'costSource'].includes(c.name)) {
        console.log(`  - ${c.name.padEnd(25)} | tipo SQLite: ${c.type.padEnd(16)} | notnull: ${c.notnull} | dflt: ${c.dflt_value}`);
      }
    }
  }

  // 2. Revisión de schema.prisma
  console.log('\n--- DECLARACIÓN EN prisma/schema.prisma ---');
  const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  for (const t of tables) {
    console.log(`\nModel ${t}:`);
    const regex = new RegExp(`model\\s+${t}\\s+\\{([^}]+)\\}`, 'm');
    const match = schemaContent.match(regex);
    if (match) {
      const lines = match[1].split('\n');
      for (const l of lines) {
        const trimmed = l.trim();
        if (['stock', 'quantity', 'costo', 'densidad', 'negativestock', 'cantidad', 'unidadmedidabase', 'uomstatus', 'coststatus', 'costsource'].some(k => trimmed.toLowerCase().includes(k))) {
          console.log(`  ${trimmed}`);
        }
      }
    }
  }

  // 3. Revisión de los tipos generados en el cliente Prisma
  console.log('\n--- TIPOS GENERADOS EN @prisma/client (runtime d.ts) ---');
  const dtsPath = path.resolve(process.cwd(), 'node_modules/.prisma/client/index.d.ts');
  if (fs.existsSync(dtsPath)) {
    console.log('index.d.ts encontrado.');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
