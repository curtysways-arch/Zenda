import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function getSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

async function validateRollbackProcedure() {
  const rootDir = process.cwd();
  const auditPath = path.resolve(rootDir, 'c2_audit_before.json');
  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

  console.log('================================================================================');
  console.log('   CITIOX FASE C2: ETAPA 12 - VALIDACIÓN DE PROCEDIMIENTO DE ROLLBACK');
  console.log('================================================================================\n');

  const backupFilePath = audit.backupFilePath;
  const targetTestPath = path.resolve(rootDir, 'dev.db.test_rollback_target');

  console.log(`Backup original: ${backupFilePath}`);
  console.log(`SHA-256 esperado: ${audit.sha256Before}`);

  // Simular restauración
  fs.copyFileSync(backupFilePath, targetTestPath);

  const restoredHash = getSha256(targetTestPath);
  console.log(`SHA-256 restaurado: ${restoredHash}`);

  if (restoredHash !== audit.sha256Before) {
    throw new Error('FALLA EN ROLLBACK: El hash restaurado no coincide bit a bit.');
  }

  console.log('✅ Coincidencia 100% bit a bit del archivo restaurado contra SHA256_BEFORE.');

  // Limpiar archivo temporal
  fs.unlinkSync(targetTestPath);
  console.log('Archivo temporal de prueba de rollback eliminado.');

  console.log('\n================================================================================');
  console.log('VEREDICTO ROLLBACK: 🟢 ROLLBACK_PROCEDURE_VERIFIED');
  console.log('================================================================================');
}

validateRollbackProcedure().catch(e => {
  console.error('Error en validación de rollback:', e);
  process.exit(1);
});
