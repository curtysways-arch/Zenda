import fs from 'fs';
import path from 'path';

interface AuditFinding {
  file: string;
  line: number;
  category: 'MATH_OP' | 'COMPARISON' | 'NUMBER_CAST' | 'SERIALIZATION' | 'API_INPUT' | 'UI_INPUT';
  severity: 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO';
  snippet: string;
  field: string;
  description: string;
  proposedFix: string;
}

const TARGET_FIELDS = [
  'stock',
  'quantity',
  'cantidad',
  'costo',
  'costoPromedio',
  'costoUnitario',
  'precioUnitario',
  'totalCost',
  'costoTotal',
  'densidadGPerMl',
  'rendimiento',
  'yield',
  'merma',
  'extraCost',
  'actualCost',
  'unitCost',
  'unitCostReal',
  'dispatchedQty',
  'receivedQty',
  'lossQty',
  'precio',
  'subtotal',
  'total'
];

const findings: AuditFinding[] = [];

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Ignorar comentarios y console.logs
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    for (const field of TARGET_FIELDS) {
      // 1. Comparaciones directas peligrosas: if (x.stock > 0), if (cantidad <= disponible), if (costo === 0)
      const compRegex = new RegExp(`(\\b${field}\\b|\\.${field})\\s*(===|==|!==|!=|>|<|>=|<=)\\s*(\\d+|[a-zA-Z0-9_.]+)`, 'i');
      if (compRegex.test(trimmed) && !trimmed.includes('.equals(') && !trimmed.includes('.greaterThan(')) {
        // Excluir si ya tiene Number(...) alrededor
        if (!trimmed.includes(`Number(`) && !trimmed.includes(`parseInt(`) && !trimmed.includes(`parseFloat(`)) {
          findings.push({
            file: relPath,
            line: lineNum,
            category: 'COMPARISON',
            severity: 'CRÍTICO',
            snippet: trimmed.slice(0, 80),
            field,
            description: `Comparación directa de objeto Decimal con operador binario JS (falla o compara referencia)`,
            proposedFix: `Utilizar métodos de Decimal (ej: d.greaterThan(0), d.isZero()) o Number() en capa de presentación`
          });
        }
      }

      // 2. Operaciones matemáticas directas: a.stock + b, a.cantidad - b, etc.
      const mathRegex = new RegExp(`(\\b${field}\\b|\\.${field})\\s*(\\+|-|\\*|\\/)\\s*(\\d+|[a-zA-Z0-9_.]+)`, 'i');
      if (mathRegex.test(trimmed) && !trimmed.includes('.add(') && !trimmed.includes('.sub(') && !trimmed.includes('.mul(')) {
        if (!trimmed.includes(`Number(`) && !trimmed.includes(`parseInt(`) && !trimmed.includes(`parseFloat(`)) {
          findings.push({
            file: relPath,
            line: lineNum,
            category: 'MATH_OP',
            severity: 'CRÍTICO',
            snippet: trimmed.slice(0, 80),
            field,
            description: `Operación aritmética (+, -, *, /) directa sobre posible Prisma.Decimal`,
            proposedFix: `Utilizar métodos aritméticos de Decimal (d.add, d.sub, d.mul, d.div) o money.ts`
          });
        }
      }

      // 3. Conversiones implícitas Number(x) o Math.floor/round que pueden truncar decimales
      if ((trimmed.includes(`Math.floor`) || trimmed.includes(`Math.round`) || trimmed.includes(`parseInt`)) && trimmed.includes(field)) {
        findings.push({
          file: relPath,
          line: lineNum,
          category: 'NUMBER_CAST',
          severity: 'ALTO',
          snippet: trimmed.slice(0, 80),
          field,
          description: `Uso de Math.floor, Math.round o parseInt que trunca cantidades fraccionarias a enteros`,
          proposedFix: `Reemplazar por roundQty(d) o roundCost(d) con HALF_UP de 4 o 6 decimales`
        });
      }
    }

    // 4. Input types de HTML que forzan type="number"
    if (trimmed.includes('<input') && trimmed.includes('type="number"') && TARGET_FIELDS.some(f => trimmed.toLowerCase().includes(f.toLowerCase()))) {
      findings.push({
        file: relPath,
        line: lineNum,
        category: 'UI_INPUT',
        severity: 'MEDIO',
        snippet: trimmed.slice(0, 80),
        field: 'input_number',
        description: `Input type="number" puede truncar o rechazar valores si no tiene step="any" o step="0.0001"`,
        proposedFix: `Añadir step="any" o step="0.0001" y manejar valor como string antes de convertir a Decimal`
      });
    }
  });
}

function walkDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        walkDir(full);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      scanFile(full);
    }
  }
}

async function main() {
  console.log('================================================================================');
  console.log('   CITIOX - FASE B0: AUDITORÍA ESTÁTICA DE IMPACTO DE TIPOS (ETAPAS 1-4)');
  console.log('================================================================================\n');

  walkDir(path.resolve(process.cwd(), 'src'));

  console.log(`Total de hallazgos detectados en src/: ${findings.length}`);

  const bySeverity = {
    CRÍTICO: findings.filter(f => f.severity === 'CRÍTICO').length,
    ALTO: findings.filter(f => f.severity === 'ALTO').length,
    MEDIO: findings.filter(f => f.severity === 'MEDIO').length,
    BAJO: findings.filter(f => f.severity === 'BAJO').length,
  };
  console.log('Distribución por severidad:', bySeverity);

  // Agrupar por archivo
  const byFile: Record<string, number> = {};
  findings.forEach(f => {
    byFile[f.file] = (byFile[f.file] || 0) + 1;
  });

  console.log('\nTop archivos con mayor impacto de migración:');
  Object.entries(byFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([f, count]) => console.log(`  - ${f.padEnd(55)}: ${count} puntos de impacto`));

  // Guardar detalle en scratch/preflight_findings.json
  const scratchDir = path.resolve(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir);
  fs.writeFileSync(path.join(scratchDir, 'preflight_findings.json'), JSON.stringify(findings, null, 2), 'utf8');
  console.log(`\n📄 Reporte detallado guardado en scratch/preflight_findings.json`);
}

main().catch(console.error);
