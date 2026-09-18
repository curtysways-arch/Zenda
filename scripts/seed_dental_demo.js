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

async function seedDental() {
  console.log('--- Configurando Datos Demo Especializados para Odontología ---');
  
  const biz = await prisma.negocio.findFirst({
    where: { slug: 'dental-chip' },
    include: { Service: true, Staff: true, Cliente: true }
  });

  if (!biz) {
    console.error('Negocio dental-chip no encontrado');
    return;
  }

  // Actualizar nombre
  await prisma.negocio.update({
    where: { id: biz.id },
    data: {
      nombre: 'Dental Chip - Clínica Dental Especializada'
    }
  });
  console.log('✓ Negocio Dental Chip actualizado');

  // Asegurar Servicios Dentales
  const serviciosDentales = [
    {
      nombre: 'Profilaxis y Limpieza con Ultrasonido',
      descripcion: 'Limpieza dental profunda con ultrasonido y pulido coronario con pasta profiláctica.',
      precio: 80,
      duracion: 45
    },
    {
      nombre: 'Restauración Estética con Resina Nano-Híbrida',
      descripcion: 'Curación estética de caries mediante resina fotopolimerizable del tono natural dental.',
      precio: 120,
      duracion: 45
    },
    {
      nombre: 'Blanqueamiento Dental Láser LED',
      descripcion: 'Aclaramiento dental seguro de 3 a 5 tonos en una sola sesión clínica.',
      precio: 350,
      duracion: 60
    },
    {
      nombre: 'Evaluación y Diagnóstico de Ortodoncia Invisible',
      descripcion: 'Escaneo y planificación computarizada 3D para alineadores invisibles o brackets de zafiro.',
      precio: 100,
      duracion: 30
    }
  ];

  for (const s of serviciosDentales) {
    const existing = await prisma.service.findFirst({
      where: { negocioId: biz.id, nombre: s.nombre }
    });
    if (!existing) {
      await prisma.service.create({
        data: {
          id: require('crypto').randomUUID(),
          negocioId: biz.id,
          nombre: s.nombre,
          extraInfo: { descripcion: s.descripcion },
          precio: s.precio,
          duracion: s.duracion,
          estaActivo: true,
          updatedAt: new Date()
        }
      });
      console.log(`✓ Creado servicio dental: ${s.nombre}`);
    }
  }

  // Asegurar Staff de Especialistas
  const odontologos = [
    {
      name: 'Dra. Sofía Alarcón M.',
      role: 'Especialista en Ortodoncia y Estética Dental',
      email: 'dra.alarcon@dentalchip.com',
      phone: '+51 987 654 321'
    },
    {
      name: 'Dr. Martín Paredes V.',
      role: 'Cirujano Oral e Implantólogo',
      email: 'dr.paredes@dentalchip.com',
      phone: '+51 987 654 322'
    }
  ];

  for (const doc of odontologos) {
    const existingStaff = await prisma.staff.findFirst({
      where: { businessId: biz.id, name: doc.name }
    });
    if (!existingStaff) {
      await prisma.staff.create({
        data: {
          id: require('crypto').randomUUID(),
          businessId: biz.id,
          name: doc.name,
          role: doc.role,
          active: true,
          updatedAt: new Date()
        }
      });
      console.log(`✓ Creado especialista: ${doc.name}`);
    }
  }

  // Asegurar Paciente de Demostración con Historia y Odontograma
  let paciente = await prisma.cliente.findFirst({
    where: { negocioId: biz.id, email: 'paciente.demo@citiox.com' }
  });

  if (!paciente) {
    paciente = await prisma.cliente.create({
      data: {
        id: require('crypto').randomUUID(),
        negocioId: biz.id,
        nombre: 'Valeria Mendoza Castro',
        telefono: '+51 912 345 678',
        email: 'paciente.demo@citiox.com',
        updatedAt: new Date()
      }
    });
    console.log(`✓ Creada paciente demo: ${paciente.nombre} (HC-2026-001)`);
  }

  // Crear o enriquecer Historia Clínica
  let hc = await prisma.clinicalRecord.findUnique({
    where: { clienteId: paciente.id }
  });

  if (!hc) {
    hc = await prisma.clinicalRecord.create({
      data: {
        negocioId: biz.id,
        clienteId: paciente.id,
        numeroHistoria: 'HC-2026-001',
        grupoSanguineo: 'O+',
        alergias: 'Penicilina, Sulfas',
        medicacionActual: 'Antihistamínico ocasional',
        antecedentesMedicos: {
          hipertension: false,
          diabetes: false,
          asma: true,
          observaciones: 'Asma leve en control con inhalador de rescate.'
        },
        habitos: {
          bruxismo: true,
          fuma: false,
          higiene: '3 veces al día, uso de seda dental moderado'
        },
        observaciones: 'Paciente refiere sensibilidad al frío en el cuadrante superior derecho y dolor moderado al masticar alimentos duros.'
      }
    });
    console.log(`✓ Creada historia clínica detallada para paciente`);
  }

  // Odontograma inicial
  const piezasDemo = {
    "18": { condition: "ausente", surfaces: { occlusal: "ausente", vestibular: "ausente", lingual: "ausente", mesial: "ausente", distal: "ausente" } },
    "16": { condition: "caries", surfaces: { occlusal: "caries", vestibular: "sano", lingual: "sano", mesial: "sano", distal: "caries" } },
    "15": { condition: "curado", surfaces: { occlusal: "curado", vestibular: "sano", lingual: "sano", mesial: "sano", distal: "sano" } },
    "26": { condition: "corona", surfaces: { occlusal: "corona", vestibular: "corona", lingual: "corona", mesial: "corona", distal: "corona" } },
    "36": { condition: "endodoncia", surfaces: { occlusal: "endodoncia", vestibular: "sano", lingual: "sano", mesial: "sano", distal: "sano" } },
    "46": { condition: "caries", surfaces: { occlusal: "caries", vestibular: "caries", lingual: "sano", mesial: "sano", distal: "sano" } },
    "48": { condition: "extraccion_indicada", surfaces: { occlusal: "extraccion_indicada", vestibular: "extraccion_indicada", lingual: "extraccion_indicada", mesial: "extraccion_indicada", distal: "extraccion_indicada" } }
  };

  const existingOdonto = await prisma.dentalOdontogram.findFirst({
    where: { clinicalRecordId: hc.id }
  });

  if (!existingOdonto) {
    await prisma.dentalOdontogram.create({
      data: {
        negocioId: biz.id,
        clinicalRecordId: hc.id,
        tipo: 'PERMANENTE',
        titulo: 'Odontograma Inicial de Diagnóstico y Planificación',
        piezas: piezasDemo,
        isSnapshot: true,
        snapshotNumber: 1,
        registeredBy: 'Dra. Sofía Alarcón M.'
      }
    });
    console.log(`✓ Creado odontograma inicial interactivo para la paciente`);
  }

  // Plan de tratamiento
  const existingTratamiento = await prisma.dentalTreatment.findFirst({
    where: { clinicalRecordId: hc.id }
  });

  if (!existingTratamiento) {
    await prisma.dentalTreatment.create({
      data: {
        negocioId: biz.id,
        clinicalRecordId: hc.id,
        diente: '16',
        superficies: 'occlusal,distal',
        descripcion: 'Curación Estética con Resina Nano-Híbrida',
        costoEstimado: 120,
        estado: 'PLANIFICADO',
        prioridad: 'ALTA',
        notas: 'Caries activa que compromete cresta marginal distal'
      }
    });
    await prisma.dentalTreatment.create({
      data: {
        negocioId: biz.id,
        clinicalRecordId: hc.id,
        diente: '48',
        superficies: 'general',
        descripcion: 'Cirugía de Tercera Molar Semi-Incluida',
        costoEstimado: 300,
        estado: 'PLANIFICADO',
        prioridad: 'MEDIA',
        notas: 'Impactación mesioangular con dolor pericoronario'
      }
    });
    console.log(`✓ Creados planes de tratamiento asociados a piezas dentales`);
  }

  // Consulta / Encuentro de evolución
  const existingEncounter = await prisma.clinicalEncounter.findFirst({
    where: { clinicalRecordId: hc.id }
  });

  if (!existingEncounter) {
    await prisma.clinicalEncounter.create({
      data: {
        negocioId: biz.id,
        clinicalRecordId: hc.id,
        motivoConsulta: 'Dolor punzante leve en primer molar superior derecho al masticar.',
        problemaActual: { anamnesis: 'Paciente de 28 años acude a consulta por molestia iniciada hace 2 semanas al consumir bebidas frías y dulces.' },
        diagnostico: 'K02.1 Caries de la dentina en pieza 16 y K01.1 Diente impactado en pieza 48.',
        procedimientoRealizado: '1. Curación con resina compuesta en pieza 16. 2. Exodoncia quirúrgica de pieza 48.',
        signosVitales: {
          presionArterial: '115/75 mmHg',
          frecuenciaCardiaca: 72,
          temperatura: 36.6
        },
        examenFisico: 'Evaluación clínica y radiográfica satisfactoria. Sin contraindicación para anestesia local con epinefrina.',
        codigoCIE: 'K02.1'
      }
    });
    console.log(`✓ Creado encuentro clínico de evolución con signos vitales y diagnóstico`);
  }

  console.log('--- Finalizado seed dental con éxito ---');
}

seedDental()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
