import fs from 'fs';
import path from 'path';

const devDbPath = path.resolve(process.cwd(), 'dev.db');
const testDbPath = path.resolve(process.cwd(), 'test_phase2e.db');

try {
  fs.copyFileSync(devDbPath, testDbPath);
  console.log('🔄 Copia limpia de dev.db -> test_phase2e.db completada.');
} catch (e) {
  console.warn('Advertencia copiando base de datos:', e);
}

process.env.DATABASE_URL = 'file:./test_phase2e.db';
