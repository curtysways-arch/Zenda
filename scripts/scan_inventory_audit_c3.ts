import fs from 'fs';
import path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const f of list) {
    const file = path.join(dir, f);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      results.push(file);
    }
  }
  return results;
}

const files = walk('src');

const findings: Array<{
  file: string;
  line: number;
  pattern: string;
  code: string;
  classification: 'AUTHORIZED' | 'BYPASS' | 'FALSE_POSITIVE' | 'LEGACY';
  details: string;
}> = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();

    // 1. Buscando prisma.producto.update con mutación de stock
    if (
      trimmed.includes('.producto.update') || trimmed.includes('.producto.updateMany') || trimmed.includes('.producto.upsert')
    ) {
      const idx = content.indexOf(lineText);
      const chunk = content.substring(idx, idx + 400);
      const mutatesStock = /\bstock\s*:/i.test(chunk);
      if (mutatesStock) {
        const isInventoryEngine = file.includes('InventoryEngine.ts');
        findings.push({
          file,
          line: lineNum,
          pattern: 'prisma.producto.update(stock)',
          code: trimmed,
          classification: isInventoryEngine ? 'AUTHORIZED' : 'BYPASS',
          details: isInventoryEngine ? 'Actualización centralizada autorizada' : 'Modificación directa de Producto.stock fuera de InventoryEngine'
        });
      }
    }

    // 2. Buscando prisma.warehouseStock
    if (trimmed.includes('warehouseStock.') || trimmed.includes('WarehouseStock')) {
      if (trimmed.includes('.update') || trimmed.includes('.create') || trimmed.includes('.upsert') || trimmed.includes('.delete')) {
        const isInventoryEngine = file.includes('InventoryEngine.ts');
        findings.push({
          file,
          line: lineNum,
          pattern: 'warehouseStock mutation',
          code: trimmed,
          classification: isInventoryEngine ? 'AUTHORIZED' : 'BYPASS',
          details: isInventoryEngine ? 'Actualización autorizada de bodega' : 'Mutación directa de WarehouseStock fuera de InventoryEngine'
        });
      }
    }

    // 3. Buscando prisma.branchInventory
    if (trimmed.includes('branchInventory.') || trimmed.includes('BranchInventory')) {
      if (trimmed.includes('.update') || trimmed.includes('.create') || trimmed.includes('.upsert') || trimmed.includes('.delete')) {
        const isInventoryEngine = file.includes('InventoryEngine.ts');
        findings.push({
          file,
          line: lineNum,
          pattern: 'branchInventory mutation',
          code: trimmed,
          classification: isInventoryEngine ? 'AUTHORIZED' : 'BYPASS',
          details: isInventoryEngine ? 'Actualización autorizada de sucursal' : 'Mutación directa de BranchInventory fuera de InventoryEngine'
        });
      }
    }

    // 4. SQL directos
    if (trimmed.includes('UPDATE Producto') || trimmed.includes('UPDATE WarehouseStock') || trimmed.includes('UPDATE BranchInventory')) {
      const isInventoryEngine = file.includes('InventoryEngine.ts');
      findings.push({
        file,
        line: lineNum,
        pattern: 'Raw SQL UPDATE',
        code: trimmed,
        classification: isInventoryEngine ? 'AUTHORIZED' : 'BYPASS',
        details: isInventoryEngine ? 'Raw SQL optimizado en InventoryEngine' : 'Raw SQL de inventario fuera de InventoryEngine'
      });
    }
  });
}

console.log('--- RESUMEN DE HALLAZGOS DE ESCRITURA EN INVENTARIO ---');
console.log(`Total hallazgos: ${findings.length}`);
console.log('Clasificación:');
const byClass: Record<string, number> = {};
for (const f of findings) {
  byClass[f.classification] = (byClass[f.classification] || 0) + 1;
}
console.log(byClass);

console.log('\n--- DETALLE DE BYPASSES DETECTADOS ---');
for (const f of findings.filter(x => x.classification === 'BYPASS')) {
  console.log(`[${f.classification}] ${f.file}:${f.line} -> ${f.pattern}`);
  console.log(`    Code: ${f.code}`);
  console.log(`    Info: ${f.details}\n`);
}

fs.writeFileSync('audit_c3_inventory_mutations.json', JSON.stringify(findings, null, 2), 'utf8');
console.log('Resultados exportados a audit_c3_inventory_mutations.json');
