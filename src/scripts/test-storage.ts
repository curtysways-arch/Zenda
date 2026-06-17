import { storageService } from '../lib/storage/storageService';
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function runTest() {
  console.log('🏁 Iniciando verificación del sistema de imágenes...');

  // 1. Obtener o crear un negocio de prueba
  let negocio = await prisma.negocio.findFirst();
  if (!negocio) {
    console.log('ℹ️ No se encontró ningún negocio, creando uno de prueba...');
    negocio = await prisma.negocio.create({
      data: {
        id: 'test-business-id',
        nombre: 'Negocio de Prueba',
        slug: 'negocio-prueba',
        precioHora: 10,
        horarioApertura: '08:00',
        horarioCierre: '22:00',
      },
    });
  }
  console.log(`✅ Negocio de prueba listo: ${negocio.nombre} (${negocio.id})`);

  // 2. Crear un buffer de imagen ficticio (un PNG transparente de 1x1 píxeles)
  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const imageBuffer = Buffer.from(base64Png, 'base64');
  console.log('✅ Buffer de imagen ficticio de 1x1 píxeles creado.');

  // 3. Procesar y subir usando el storageService
  console.log('🚀 Subiendo y procesando imagen con storageService.handleUpload...');
  try {
    const result = await storageService.handleUpload(
      imageBuffer,
      negocio.id,
      'test-category'
    );

    console.log('🎉 Subida y procesamiento exitoso!');
    console.log('📊 Resultados del almacenamiento:');
    console.log(`   - ID del Media: ${result.id}`);
    console.log(`   - URL Original: ${result.url}`);
    console.log(`   - URL Medium:   ${result.mediumUrl}`);
    console.log(`   - URL Thumb:    ${result.thumbUrl}`);

    // 4. Verificar en base de datos
    console.log('🔍 Consultando registro en la base de datos...');
    const mediaRecord = await prisma.media.findUnique({
      where: { id: result.id },
    });
    if (mediaRecord) {
      console.log('✅ Registro en Base de Datos encontrado correctamente:', JSON.stringify(mediaRecord, null, 2));
    } else {
      throw new Error('❌ Error: El registro de Media no fue guardado en Prisma.');
    }

    // 5. Verificar presencia física de los archivos en disco
    console.log('📁 Verificando existencia física de los archivos en disco...');
    const storageDir = path.resolve(process.cwd(), 'storage', 'uploads', negocio.id, 'test-category');
    console.log(`   - Directorio de almacenamiento: ${storageDir}`);

    const files = fs.readdirSync(storageDir);
    console.log('   - Archivos físicos creados:', files);

    const originalFilename = path.basename(result.url);
    const mediumFilename = path.basename(result.mediumUrl);
    const thumbFilename = path.basename(result.thumbUrl);

    const hasOriginal = files.includes(originalFilename);
    const hasMedium = files.includes(mediumFilename);
    const hasThumb = files.includes(thumbFilename);

    if (hasOriginal && hasMedium && hasThumb) {
      console.log('✅ Las 3 variantes (original, medium, thumb) existen físicamente en disco!');
    } else {
      throw new Error('❌ Error: Faltan archivos físicos en disco.');
    }

    // 6. Limpieza: Eliminar registro y archivos creados
    console.log('🧹 Iniciando limpieza de prueba...');
    await storageService.deleteMedia(result.id);

    // Verificar que los archivos físicos se borraron
    const dirExistsAfterCleanup = fs.existsSync(storageDir);
    if (!dirExistsAfterCleanup || fs.readdirSync(storageDir).length === 0) {
      console.log('✅ Los archivos físicos fueron eliminados correctamente del disco!');
    } else {
      console.log('⚠️ Advertencia: Algunos archivos físicos o directorios de prueba no se eliminaron por completo.');
    }

    const recordExistsAfterCleanup = await prisma.media.findUnique({
      where: { id: result.id },
    });
    if (!recordExistsAfterCleanup) {
      console.log('✅ El registro de Media fue eliminado correctamente de la Base de Datos!');
    } else {
      console.log('⚠️ Advertencia: El registro de Media no se eliminó de Prisma.');
    }

    console.log('\n👑 ¡VERIFICACIÓN COMPLETADA CON ÉXITO! Todo el plan de subida de imágenes funciona a la perfección.');
  } catch (error: any) {
    console.error('❌ La verificación falló con el siguiente error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
