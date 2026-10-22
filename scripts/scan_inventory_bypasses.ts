import fs from 'fs';
import path from 'path';

interface BypassHit {
  file: string;
  line: number;
  snippet: string;
  pattern: string;
  category: string;
}

const SRC_DIR = path.resolve(process.cwd(), 'src');

const PATTERNS = [
  { pattern: /stock\s*:\s*\{\s*(increment|decrement)/i, category: 'Stock Increment/Decrement bypass' },
  { pattern: /data\s*:\s*\{[^}]*stock\s*:/i, category: 'Direct stock update in data payload' },
  { pattern: /branchInventory\.(update|create|upsert)/i, category: 'Direct BranchInventory write' },
  { pattern: /warehouseStock\.(update|create|upsert)/i, category: 'Direct WarehouseStock write' }
];

function scanDirectory(dir: string, hits: BypassHit[]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDirectory(fullPath, hits);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      // Excluir el propio InventoryEngine donde es legítimo mutar la base de datos
      if (fullPath.includes('InventoryEngine.ts')) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        for (const p of PATTERNS) {
          if (p.pattern.test(line)) {
            hits.push({
              file: path.relative(process.cwd(), fullPath).replace(/\\/g, '/'),
              line: idx + 1,
              snippet: line.trim(),
              pattern: p.pattern.toString(),
              category: p.category
            });
          }
        }
      });
    }
  }
}

async function main() {
  console.log('='.repeat(95));
  console.log('   SCAN EXHAUSTIVO DE BYPASSES DE INVENTARIO EN src/');
  console.log('='.repeat(95));

  const hits: BypassHit[] = [];
  scanDirectory(SRC_DIR, hits);

  console.log(`Total de ocurrencias detectadas fuera de InventoryEngine: ${hits.length}\n`);

  console.table(
    hits.map(h => ({
      Archivo: `${h.file}:${h.line}`,
      Categoría: h.category,
      Snippet: h.snippet.slice(0, 50)
    }))
  );

  console.log('\n' + '='.repeat(95));
  console.log('RESUMEN DE BYPASSES HISTÓRICOS IDENTIFICADOS PARA LA FASE 2E:');
  console.log('='.repeat(95));
  const uniqueFiles = Array.from(new Set(hits.map(h => h.file)));
  uniqueFiles.forEach((f, idx) => {
    console.log(`${idx + 1}. ${f}`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
