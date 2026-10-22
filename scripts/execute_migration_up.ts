import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const dbPath = path.join(process.cwd(), 'dev.db');
  const sqlPath = path.join(process.cwd(), 'scripts', 'migration_up.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('--- EJECUTANDO scripts/migration_up.sql sobre dev.db ---');
  const client = createClient({ url: `file:${dbPath}` });

  // Ejecutar sentencias individuales
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    console.log(`Ejecutando: ${stmt.substring(0, 80)}...`);
    await client.execute(stmt);
  }

  console.log('✅ migration_up.sql EJECUTADO EXITOSAMENTE (Exit Code: 0)');
}

runMigration().catch(err => {
  console.error('❌ ERROR ejecutando migration_up.sql:', err);
  process.exit(1);
});
