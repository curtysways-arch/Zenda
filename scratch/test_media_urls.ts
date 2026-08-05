import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function testMedia() {
  console.log("=== COMPROBANDO ARCHIVOS DE MEDIOS EN DISCO Y BASE DE DATOS ===");

  const images = await (prisma as any).imagen.findMany();
  console.log(`Imágenes en DB (${images.length}):`);
  
  images.forEach((img: any) => {
    console.log(`- ID: ${img.id} | negocioId: ${img.negocioId} | URL: ${img.url}`);
    
    // Si la URL es relativa a /api/media/...
    if (img.url.startsWith('/api/media/')) {
      const relativePath = img.url.replace('/api/media/', '');
      const fullDiskPath = path.join(process.cwd(), 'public', 'uploads', relativePath);
      const exists = fs.existsSync(fullDiskPath);
      console.log(`  -> Ruta en disco: ${fullDiskPath}`);
      console.log(`  -> ¿Existe en disco?: ${exists ? 'SI ✅' : 'NO ❌'}`);
    }
  });
}

testMedia().catch(console.error).finally(() => process.exit(0));
