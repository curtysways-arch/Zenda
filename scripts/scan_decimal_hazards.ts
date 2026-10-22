import * as fs from 'fs';
import * as path from 'path';

export interface HazardFinding {
  file: string;
  line: number;
  pattern: string;
  severity: 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'INFO';
  snippet: string;
  context: string;
  ruleDescription: string;
}

const INVENTORY_COST_IDENTIFIERS = [
  'stock',
  'cantidad',
  'costo',
  'costoPromedio',
  'costoUnitario',
  'costoTotal',
  'unitCost',
  'totalCost',
  'actualQuantity',
  'plannedQuantity',
  'targetQuantity',
  'wasteQuantity',
  'pmp',
  'merma'
];

function isInventoryContext(line: string): boolean {
  const lower = line.toLowerCase();
  return INVENTORY_COST_IDENTIFIERS.some(id => lower.includes(id.toLowerCase()));
}

function scanFile(filePath: string): HazardFinding[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const findings: HazardFinding[] = [];

  // Excluir archivos matemáticos o de tests que por definición manejan o prueban primitivos
  const relPath = filePath.replace(/\\/g, '/');
  if (
    relPath.includes('src/lib/math/decimal.ts') ||
    relPath.includes('src/lib/math/money.ts') ||
    relPath.includes('.test.') ||
    relPath.includes('.spec.')
  ) {
    return [];
  }

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Ignorar comentarios
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return;
    }

    if (!isInventoryContext(line)) {
      return;
    }

    // 1. Math.round / Math.floor / Math.ceil sobre stock o costos
    const mathMatch = line.match(/Math\.(round|floor|ceil)\s*\([^)]*(stock|cantidad|costo|pmp)[^)]*\)/i);
    if (mathMatch) {
      findings.push({
        file: relPath,
        line: lineNum,
        pattern: mathMatch[0],
        severity: 'ALTO',
        snippet: trimmed,
        context: 'Truncamiento matemático de coma flotante en inventario/costo',
        ruleDescription: 'Usar roundQty(d) o roundCost(d) en lugar de Math.round/floor/ceil'
      });
    }

    // 2. parseInt sobre cantidad o stock (peligro fraccionario: trunca 0.4500 a 0)
    const parseIntMatch = line.match(/parseInt\s*\([^)]*(cantidad|stock|quantity)[^)]*\)/i);
    if (parseIntMatch) {
      findings.push({
        file: relPath,
        line: lineNum,
        pattern: parseIntMatch[0],
        severity: 'ALTO',
        snippet: trimmed,
        context: 'parseInt trunca cantidades fraccionarias a enteros',
        ruleDescription: 'Reemplazar por roundQty(d)'
      });
    }

    // 3. Comparación de igualdad estricta con número primitivo: stock === 0 (Decimal === 0 siempre es false)
    const strictZeroMatch = line.match(/(stock|cantidad|costo)\s*===\s*0\b/i);
    if (strictZeroMatch) {
      findings.push({
        file: relPath,
        line: lineNum,
        pattern: strictZeroMatch[0],
        severity: 'CRÍTICO',
        snippet: trimmed,
        context: 'Comparación estricta === 0 con posible Prisma.Decimal fallará en runtime',
        ruleDescription: 'Usar decimalIsZero(d) o d.isZero()'
      });
    }

    // 4. Operaciones aritméticas nativas entre variables de inventario: stock - cantidad, costo / cantidad
    const arithmeticMatch = line.match(/(stock|cantidad|costo|precio)\s*([+\-*/])\s*(cantidad|stock|precio|costo)/i);
    if (arithmeticMatch) {
      findings.push({
        file: relPath,
        line: lineNum,
        pattern: arithmeticMatch[0],
        severity: 'CRÍTICO',
        snippet: trimmed,
        context: `Operador aritmético nativo "${arithmeticMatch[2]}" entre campos de inventario`,
        ruleDescription: 'Usar decimalAdd, decimalSub, decimalMul, decimalDiv'
      });
    }

    // 5. Comparaciones directas d > 0 o d < 0 cuando la variable es stock/cantidad de inventario en servicios de backend
    if (relPath.includes('/core/') || relPath.includes('/api/')) {
      const cmpMatch = line.match(/(item|prod|p|ing)\.stock\s*([><]=?)\s*0\b/i);
      if (cmpMatch) {
        findings.push({
          file: relPath,
          line: lineNum,
          pattern: cmpMatch[0],
          severity: 'CRÍTICO',
          snippet: trimmed,
          context: `Comparación binaria "${cmpMatch[2]}" sobre stock directo de base de datos`,
          ruleDescription: 'Usar decimalGt(stock, 0) o decimalGte(stock, 0)'
        });
      }
    }
  });

  return findings;
}

function walkDir(dir: string): string[] {
  let files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        files = files.concat(walkDir(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
  return files;
}

export function runDecimalHazardScanner() {
  const root = path.join(process.cwd(), 'src');
  const files = walkDir(root);
  const allFindings: HazardFinding[] = [];

  for (const file of files) {
    const f = scanFile(file);
    allFindings.push(...f);
  }

  console.log('================================================================================');
  console.log('   CITIOX - ESCÁNER DE PELIGROS DECIMALES EN INVENTARIO Y COSTOS (B1)');
  console.log('================================================================================\n');

  console.log(`Archivos escaneados: ${files.length}`);
  console.log(`Peligros detectados: ${allFindings.length}`);

  const bySev = { CRÍTICO: 0, ALTO: 0, MEDIO: 0, INFO: 0 };
  for (const item of allFindings) {
    bySev[item.severity] = (bySev[item.severity] || 0) + 1;
  }

  console.log('\nDesglose por severidad:');
  console.log(`  🔴 CRÍTICOS: ${bySev.CRÍTICO}`);
  console.log(`  🟠 ALTOS:    ${bySev.ALTO}`);
  console.log(`  🟡 MEDIOS:   ${bySev.MEDIO}`);
  console.log(`  ℹ️  INFO:     ${bySev.INFO}\n`);

  if (allFindings.length > 0) {
    console.log('Hallazgos en servicios y APIs críticas:');
    for (const h of allFindings.slice(0, 20)) {
      console.log(`  [${h.severity}] ${h.file}:${h.line} -> ${h.snippet.substring(0, 80)}`);
      console.log(`      Contexto: ${h.context} | Solución: ${h.ruleDescription}`);
    }
  }

  return { total: allFindings.length, bySev, findings: allFindings };
}

runDecimalHazardScanner();
