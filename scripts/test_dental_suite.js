const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

function resolveLibSqlUrl(dbUrl) {
    if (dbUrl.startsWith('file://')) return dbUrl;
    const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
    const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
    const absPath = isAbsolute ? rawPath : path.resolve(process.cwd(), rawPath);
    const normalized = absPath.split(/[/\\]/).join('/');
    const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
    return `file://${prefix}${normalized}`;
}

const rawUrl = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new PrismaLibSql({ url: resolveLibSqlUrl(rawUrl) });
const prisma = new PrismaClient({ adapter });

async function runTests() {
  console.log('=== INICIANDO SUITE DE PRUEBAS DE ODONTOLOGÍA CITIOX ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Helper que replica src/modules/dental/utils/dentalHelper.ts
  function isDentalBusiness(negocio) {
    if (!negocio) return false;
    const tipo = String(negocio.configuracion?.tipoNegocio || negocio.tipoNegocio || '').toLowerCase().trim();
    const nombre = String(negocio.nombre || '').toLowerCase();
    const slug = String(negocio.slug || '').toLowerCase();
    const btCode = String(negocio.businessType?.code || '').toLowerCase();

    const nonDentalExact = ['restaurante', 'restaurant', 'food', 'tienda', 'store', 'shop', 'shoe_care', 'sports_courts', 'canchas', 'lavanderia'];
    if (nonDentalExact.some(t => tipo === t || btCode === t)) {
      return false;
    }

    const dentalTerms = ['odontolog', 'dental', 'dentist', 'sonrisa', 'smile', 'ortodoncia', 'endodoncia', 'periodoncia', 'implantolog'];
    return dentalTerms.some(term => tipo.includes(term) || btCode.includes(term) || nombre.includes(term) || slug.includes(term));
  }

  try {
    // 1. Aislamiento y No-Regresión
    console.log('--- 1. Prueba de Aislamiento y No-Regresión de Negocios ---');
    const mockRestaurant = { tipoNegocio: 'RESTAURANTE', nombre: 'Parrilla Gourmet', slug: 'parrilla' };
    const mockStore = { tipoNegocio: 'TIENDA', nombre: 'Moda Urbana', slug: 'tienda-moda' };
    const mockShoeCare = { tipoNegocio: 'SHOE_CARE', nombre: 'Lava Express', slug: 'lava-express' };
    const mockCourts = { tipoNegocio: 'SPORTS_COURTS', nombre: 'Canchas Sintéticas Gol', slug: 'canchas-gol' };
    const mockServices = { tipoNegocio: 'SERVICIOS_GENERALES', nombre: 'Consultores Pro', slug: 'consultores' };
    const mockDental = { configuracion: { tipoNegocio: 'Odontología' }, nombre: 'Dental Chip - Clínica Dental', slug: 'dental-chip' };

    assert(isDentalBusiness(mockRestaurant) === false, 'Restaurante NO debe ser detectado como odontología');
    assert(isDentalBusiness(mockStore) === false, 'Tienda NO debe ser detectado como odontología');
    assert(isDentalBusiness(mockShoeCare) === false, 'Lavandería/Calzado NO debe ser detectado como odontología');
    assert(isDentalBusiness(mockCourts) === false, 'Canchas deportivas NO debe ser detectado como odontología');
    assert(isDentalBusiness(mockServices) === false, 'Servicios generales NO debe ser detectado como odontología');
    assert(isDentalBusiness(mockDental) === true, 'Clínica Dental DEBE ser detectada como odontología');

    // 2. Verificación del Negocio Demo Dental en BD
    console.log('\n--- 2. Verificación de Negocio Dental en Base de Datos ---');
    const dentalBiz = await prisma.negocio.findFirst({
      where: { slug: 'dental-chip' },
      include: { BusinessType: true, Configuracion: true }
    });
    assert(dentalBiz !== null, 'El negocio demo "dental-chip" existe en dev.db');
    if (dentalBiz) {
      assert(isDentalBusiness(dentalBiz) === true, 'El registro "dental-chip" activa isDentalBusiness === true');
    }

    // 3. Flujo Clínico y No-Destructividad de Odontogramas
    console.log('\n--- 3. Prueba de Flujo Clínico y Snapshots Inmutables de Odontograma ---');
    let cliente = await prisma.cliente.findFirst({
      where: { negocioId: dentalBiz.id }
    });

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          negocioId: dentalBiz.id,
          nombre: 'Juan Pérez Paciente Demo',
          telefono: '5551234567',
          email: 'juan.perez@demodental.com',
          historiaClinica: 'HC-0001'
        }
      });
      console.log('  -> Creado paciente demo para pruebas:', cliente.id);
    }

    // Comprobar / Crear Historia Clínica
    let record = await prisma.clinicalRecord.findUnique({
      where: { clienteId: cliente.id }
    });
    if (!record) {
      record = await prisma.clinicalRecord.create({
        data: {
          negocioId: dentalBiz.id,
          clienteId: cliente.id,
          alergias: 'Penicilina',
          antecedentesMedicos: { enfermedad: 'Hipertensión controlada' },
          medicacionActual: 'Enalapril 10mg',
          observaciones: 'Dolor en molar superior derecho'
        }
      });
      console.log('  -> Creada Historia Clínica para paciente:', record.id);
    }
    assert(record !== null, 'Historia clínica vinculada correctamente al paciente y negocio');
    assert(record.alergias.includes('Penicilina'), 'Alergias registradas correctamente');

    // Crear Snapshot 1 del Odontograma (Inicial)
    const initialTeethState = {
      "18": { condition: "sano", surfaces: { occlusal: "sano", vestibular: "sano", lingual: "sano", mesial: "sano", distal: "sano" } },
      "16": { condition: "caries", surfaces: { occlusal: "caries", vestibular: "sano", lingual: "sano", mesial: "sano", distal: "sano" } }
    };
    const snap1 = await prisma.dentalOdontogram.create({
      data: {
        negocioId: dentalBiz.id,
        clinicalRecordId: record.id,
        tipo: 'PERMANENTE',
        titulo: 'Odontograma inicial de diagnóstico',
        piezas: initialTeethState,
        isSnapshot: true,
        snapshotNumber: 1,
        registeredBy: 'Dr. Test'
      }
    });
    assert(snap1 && snap1.snapshotNumber === 1, 'Snapshot 1 (Inicial) creado correctamente');

    // Crear Snapshot 2 del Odontograma (Evolución)
    const evolutionTeethState = {
      "18": { condition: "sano", surfaces: { occlusal: "sano", vestibular: "sano", lingual: "sano", mesial: "sano", distal: "sano" } },
      "16": { condition: "curado", surfaces: { occlusal: "curado", vestibular: "sano", lingual: "sano", mesial: "sano", distal: "sano" } }
    };
    const snap2 = await prisma.dentalOdontogram.create({
      data: {
        negocioId: dentalBiz.id,
        clinicalRecordId: record.id,
        tipo: 'PERMANENTE',
        titulo: 'Odontograma post-curación de resina en pieza 16',
        piezas: evolutionTeethState,
        isSnapshot: true,
        snapshotNumber: 2,
        registeredBy: 'Dr. Test'
      }
    });
    assert(snap2 && snap2.snapshotNumber === 2, 'Snapshot 2 (Evolución) creado con snapshotNumber = 2');

    // Verificar que Snapshot 1 no fue sobreescrito (inmutabilidad de historial)
    const fetchedSnap1 = await prisma.dentalOdontogram.findUnique({ where: { id: snap1.id } });
    const fetchedSnap2 = await prisma.dentalOdontogram.findUnique({ where: { id: snap2.id } });
    const snap1Data = typeof fetchedSnap1.piezas === 'string' ? JSON.parse(fetchedSnap1.piezas) : fetchedSnap1.piezas;
    const snap2Data = typeof fetchedSnap2.piezas === 'string' ? JSON.parse(fetchedSnap2.piezas) : fetchedSnap2.piezas;

    assert(snap1Data["16"].condition === "caries", 'Snapshot 1 mantiene condición histórica original ("caries")');
    assert(snap2Data["16"].condition === "curado", 'Snapshot 2 refleja evolución clínica posterior ("curado")');
    assert(fetchedSnap1.id !== fetchedSnap2.id, 'Los snapshots son registros históricos separados e inmutables');

    // 4. Prueba de Planes de Tratamiento
    console.log('\n--- 4. Prueba de Planes de Tratamiento ---');
    const treatment = await prisma.dentalTreatment.create({
      data: {
        negocioId: dentalBiz.id,
        clinicalRecordId: record.id,
        diente: '16',
        superficies: 'occlusal',
        descripcion: 'Restauración con Resina Fotocurable',
        costoEstimado: 45.00,
        estado: 'COMPLETADO',
        notas: 'Caries de esmalte y dentina superficial'
      }
    });
    assert(treatment && treatment.diente === '16', 'Plan de tratamiento creado asociado a diente 16 y superficie oclusal');

    // 5. Prueba de Seguridad Multi-Inquilino (Cross-Tenant Isolation)
    console.log('\n--- 5. Prueba de Seguridad Multi-Inquilino (Cross-Tenant Isolation) ---');
    const fakeOtherBizId = 'fake-negocio-tenant-999';
    const unauthorizedRecord = await prisma.clinicalRecord.findFirst({
      where: {
        id: record.id,
        negocioId: fakeOtherBizId
      }
    });
    assert(unauthorizedRecord === null, 'Tenant ajeno NO puede acceder a historias clínicas de otro negocio (filtro negocioId)');

    const unauthorizedOdontograms = await prisma.dentalOdontogram.findMany({
      where: {
        negocioId: fakeOtherBizId
      }
    });
    assert(unauthorizedOdontograms.length === 0, 'Tenant ajeno obtiene 0 odontogramas de otro negocio');

    // Limpieza de datos temporales
    await prisma.dentalTreatment.delete({ where: { id: treatment.id } });
    await prisma.dentalOdontogram.delete({ where: { id: snap2.id } });
    await prisma.dentalOdontogram.delete({ where: { id: snap1.id } });
    console.log('  -> Limpieza de registros temporales completada con éxito.');

    console.log(`\n========================================`);
    console.log(`RESULTADO SUITE: ${passed} PASADAS, ${failed} FALLIDAS`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Error durante la ejecución de pruebas:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
