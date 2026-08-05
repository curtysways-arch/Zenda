import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function fixStorageAndImages() {
  console.log("=== COPIANDO ARCHIVOS FÍSICOS A COMPLEJO-TEST Y ACTUALIZANDO REGISTROS DE IMAGEN ===");

  const srcDir = path.resolve(process.cwd(), 'storage', 'uploads', 'demo-canchas-id-100', 'banner');
  const destDir = path.resolve(process.cwd(), 'storage', 'uploads', 'complejo-test-id-101', 'banner');

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  if (fs.existsSync(srcDir)) {
    const files = fs.readdirSync(srcDir);
    files.forEach(file => {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      console.log(`✅ Archivo copiado: ${file}`);
    });
  }

  // Borrar imagenes previas de complejo-test-id-101 y recrear las 3
  await (prisma as any).imagen.deleteMany({ where: { negocioId: 'complejo-test-id-101' } });

  const originalFiles = fs.readdirSync(destDir).filter(f => f.endsWith('_original.webp'));
  for (const file of originalFiles) {
    const mediaUrl = `/api/media/complejo-test-id-101/banner/${file}`;
    await (prisma as any).imagen.create({
      data: {
        id: crypto.randomUUID(),
        url: mediaUrl,
        tipo: 'BANNER',
        negocioId: 'complejo-test-id-101',
        esBanner: true,
      }
    });
    console.log(`✅ Registro de Imagen guardado en DB para complejo-test: ${mediaUrl}`);
  }
}

fixStorageAndImages().catch(console.error).finally(() => process.exit(0));
