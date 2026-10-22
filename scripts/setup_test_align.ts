import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function getFileChecksum(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function main() {
  console.log('================================================================================');
  console.log('   CITIOX - FASE A: PREPARACIÓN DE ENTORNO AISLADO (test_align.db)');
  console.log('================================================================================');

  const devDbPath = path.resolve(process.cwd(), 'dev.db');
  const testAlignDbPath = path.resolve(process.cwd(), 'test_align.db');

  if (!fs.existsSync(devDbPath)) {
    throw new Error('dev.db no encontrada en la raíz.');
  }

  // 1. Obtener hash y tamaño de dev.db original
  const devStats = fs.statSync(devDbPath);
  const devChecksum = getFileChecksum(devDbPath);
  console.log(`📦 dev.db original:`);
  console.log(`   Tamaño:   ${devStats.size} bytes`);
  console.log(`   SHA-256:  ${devChecksum}`);

  // 2. Crear copia bit-a-bit test_align.db
  fs.copyFileSync(devDbPath, testAlignDbPath);
  const copyStats = fs.statSync(testAlignDbPath);
  const copyChecksum = getFileChecksum(testAlignDbPath);
  console.log(`\n📋 test_align.db clonada:`);
  console.log(`   Tamaño:   ${copyStats.size} bytes`);
  console.log(`   SHA-256:  ${copyChecksum}`);

  if (devChecksum === copyChecksum) {
    console.log('\n✅ Copia aislada generada con integridad criptográfica verificada al 100%.');
  } else {
    throw new Error('Discrepancia en checksum al clonar test_align.db.');
  }
}

main().catch(console.error);
