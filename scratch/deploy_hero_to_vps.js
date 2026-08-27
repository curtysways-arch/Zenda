const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const LOCAL_BASE = 'd:/Documentos/antigravity/spa/Spa';
const VPS_BASE = '/opt/Zenda';
const DB_URL = 'postgresql://zenda_user:CitioxProd2024!@127.0.0.1:5432/zenda_db?schema=public';

const filesToDeploy = [
  'prisma/schema.prisma',
  'src/lib/landingContentResolver.ts',
  'src/app/api/admin/hero-destacados/hero/route.ts',
  'src/app/api/admin/hero-destacados/hero/[id]/route.ts',
  'src/app/api/admin/hero-destacados/highlight/route.ts',
  'src/app/api/admin/hero-destacados/highlight/[id]/route.ts',
  'src/app/api/admin/hero-destacados/reorder/route.ts',
  'src/app/api/admin/hero-destacados/options/route.ts',
  'src/app/api/[slug]/landing-content/route.ts',
  'src/components/admin/AdminSidebar.tsx',
  'src/app/admin/hero-destacados/page.tsx',
  'src/app/[slug]/page.tsx',
  'src/components/public/UniversalHeroCarousel.tsx',
  'src/components/public/ProductsStoreClient.tsx',
  'src/modules/pinchos/components/PinchosStoreModule.tsx',
  'scripts/migrate_banners_to_hero.ts'
];

function execCommand(command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => { out += d.toString(); process.stdout.write(d.toString()); });
      stream.stderr.on('data', d => { out += d.toString(); process.stderr.write(d.toString()); });
      stream.on('close', code => resolve({ code, out }));
    });
  });
}

conn.on('ready', async () => {
  console.log('📡 Conexión SSH establecida con el VPS (157.173.203.174)...');

  try {
    // 1. Crear estructuras de directorio remoto necesarias
    const directories = [
      'src/lib',
      'src/app/api/admin/hero-destacados/hero/[id]',
      'src/app/api/admin/hero-destacados/highlight/[id]',
      'src/app/api/admin/hero-destacados/reorder',
      'src/app/api/admin/hero-destacados/options',
      'src/app/api/[slug]/landing-content',
      'src/components/admin',
      'src/app/admin/hero-destacados',
      'src/components/public',
      'src/modules/pinchos/components',
      'scripts'
    ];

    const mkdirCmd = directories.map(d => `mkdir -p "${VPS_BASE}/${d}"`).join(' && ');
    await execCommand(mkdirCmd);

    // 2. Transferencia de archivos vía SFTP
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);

        let completed = 0;
        filesToDeploy.forEach((relPath) => {
          const localPath = path.join(LOCAL_BASE, relPath);
          const remotePath = `${VPS_BASE}/${relPath.replace(/\\/g, '/')}`;

          if (fs.existsSync(localPath)) {
            sftp.fastPut(localPath, remotePath, (err) => {
              if (err) {
                console.error(`❌ Error SFTP en ${relPath}:`, err.message);
              } else {
                console.log(`📤 Subido a VPS (SFTP): ${relPath}`);
              }
              completed++;
              if (completed === filesToDeploy.length) resolve();
            });
          } else {
            console.warn(`⚠️ Archivo local no encontrado: ${localPath}`);
            completed++;
            if (completed === filesToDeploy.length) resolve();
          }
        });
      });
    });

    console.log('\n🗑️ Eliminando componente legacy BannerGalleryAdmin.tsx en VPS si existe...');
    await execCommand(`rm -f "${VPS_BASE}/src/components/admin/BannerGalleryAdmin.tsx"`);

    console.log('\n⚙️ Ajustando provider=postgresql en schema.prisma del VPS...');
    await execCommand(`sed -i 's/provider = "sqlite"/provider = "postgresql"/g' ${VPS_BASE}/prisma/schema.prisma`);

    console.log('\n⚙️ Sincronizando modelo de Prisma en PostgreSQL VPS...');
    await execCommand(`cd ${VPS_BASE} && DATABASE_URL="${DB_URL}" npx prisma db push --accept-data-loss && DATABASE_URL="${DB_URL}" npx prisma generate`);

    console.log('\n🚀 Ejecutando migración universal de banners en datos reales del VPS...');
    await execCommand(`cd ${VPS_BASE} && DATABASE_URL="${DB_URL}" npx tsx scripts/migrate_banners_to_hero.ts`);

    console.log('\n🏗️ Compilando Next.js app y reiniciando PM2 en VPS...');
    await execCommand(`cd ${VPS_BASE} && rm -rf .next`);
    const result = await execCommand(`cd ${VPS_BASE} && DATABASE_URL="${DB_URL}" npm run build && pm2 restart zenda-app --update-env || pm2 restart all`);

    console.log(`\n✨ ¡Despliegue y migración en VPS finalizados exitosamente! (Exit code: ${result.code})`);
  } catch (e) {
    console.error('❌ Error durante el despliegue:', e);
  } finally {
    conn.end();
  }
}).connect({
  host: '157.173.203.174',
  port: 22,
  username: 'root',
  password: 'Elmassuelto005624',
  keepaliveInterval: 10000
});
