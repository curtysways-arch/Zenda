import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function calculateHash(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const fileStream = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    fileStream.on('data', (chunk) => hash.update(chunk));
    fileStream.on('end', () => resolve(hash.digest('hex').toUpperCase()));
    fileStream.on('error', (err) => reject(err));
  });
}

async function main() {
  const rootDir = process.cwd();
  const devDbPath = path.join(rootDir, 'dev.db');
  const testDbPath = path.join(rootDir, 'test_c1.db');
  const baseline = JSON.parse(fs.readFileSync(path.join(rootDir, 'test_c1_baseline.json'), 'utf8'));

  const devHash = await calculateHash(devDbPath);
  const testHash = await calculateHash(testDbPath);

  console.log('=== VERIFICACIÓN FINAL DE INTEGRIDAD DE BASES DE DATOS ===');
  console.log(`dev.db Hash Original Baseline: ${baseline.devDb.sha256}`);
  console.log(`dev.db Hash Actual:            ${devHash}`);
  console.log(`¿dev.db Intacta?:              ${devHash === baseline.devDb.sha256 ? '✅ SÍ (100% INTACTA)' : '❌ NO'}`);
  console.log(`test_c1.db Hash Final C1:      ${testHash}`);
}

main().catch(console.error);
