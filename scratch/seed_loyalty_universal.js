const path = require('path');
const fs = require('fs');

let envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  envPath = path.join(process.cwd(), '.env');
}
if (!fs.existsSync(envPath)) {
  envPath = path.join(__dirname, '.env');
}
require('dotenv').config({ path: envPath });
console.log(`📝 .env cargado desde: ${envPath}`);

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
console.log(`🔗 Conectando a la base de datos: ${dbUrl}`);

// Configurar Prisma adaptativo según la base de datos
let prisma;

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
} else {
    const { createClient } = require('@libsql/client');
    const { PrismaLibSql } = require('@prisma/adapter-libsql');
    
    // Convertir ruta relativa a absoluta para SQLite si es necesario
    let finalUrl = dbUrl;
    if (dbUrl.startsWith('file:')) {
        const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
        const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
        const absPath = isAbsolute ? rawPath : `${process.cwd()}/${rawPath}`;
        const normalized = absPath.split(/[/\\]/).join('/');
        const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
        finalUrl = `file://${prefix}${normalized}`;
    }
    console.log(`Resolved URL: ${finalUrl}`);
    const client = createClient({ url: finalUrl });
    const adapter = new PrismaLibSql(client);
    prisma = new PrismaClient({ adapter });
}

const DEFAULT_LEVELS = [
  { nombre: "🥉 Bronce", puntosRequeridos: 0, icono: "Shield", beneficios: '["Acceso a misiones básicas", "Multiplicador de diamantes 1.0x"]' },
  { nombre: "🥈 Plata", puntosRequeridos: 300, icono: "Zap", beneficios: '["10% de descuento en tratamientos seleccionados", "Multiplicador de diamantes 1.1x"]' },
  { nombre: "🥇 Oro", puntosRequeridos: 800, icono: "Crown", beneficios: '["Bebida de cortesía en cada cita", "Multiplicador de diamantes 1.2x"]' },
  { nombre: "💎 Platino", puntosRequeridos: 1500, icono: "Gem", beneficios: '["Acceso anticipado a promociones", "15% de descuento en el mes de tu cumpleaños", "Multiplicador de diamantes 1.3x"]' },
  { nombre: "👑 Diamante", puntosRequeridos: 3000, icono: "Trophy", beneficios: '["Regalo exclusivo por fin de temporada", "Prioridad de reserva en horas pico", "Multiplicador de diamantes 1.5x"]' }
];

async function main() {
  await prisma.$connect();
  console.log("📡 Conexión establecida. Buscando negocios...");
  
  const negocios = await prisma.negocio.findMany({
    select: { id: true, nombre: true }
  });

  console.log(`💼 Se encontraron ${negocios.length} negocios.`);

  for (const neg of negocios) {
    console.log(`\n────────────────────────────────────────`);
    console.log(`📦 Procesando negocio: ${neg.nombre} (ID: ${neg.id})`);

    // 1. Crear LevelTiers si no existen
    const existingTiers = await prisma.levelTier.findMany({
      where: { negocioId: neg.id }
    });

    if (existingTiers.length === 0) {
      console.log(`  + Creando niveles de lealtad por defecto...`);
      for (const level of DEFAULT_LEVELS) {
        await prisma.levelTier.create({
          data: {
            id: crypto.randomUUID(),
            negocioId: neg.id,
            nombre: level.nombre,
            puntosRequeridos: level.puntosRequeridos,
            icono: level.icono,
            beneficios: level.beneficios
          }
        });
        console.log(`    └─ Nivel creado: ${level.nombre} (${level.puntosRequeridos} diamantes)`);
      }
    } else {
      console.log(`  - El negocio ya cuenta con ${existingTiers.length} niveles configurados.`);
    }

    // 2. Crear Temporada inicial si no existe ninguna activa
    const activeSeason = await prisma.loyaltySeason.findFirst({
      where: { negocioId: neg.id, activa: true }
    });

    if (!activeSeason) {
      console.log(`  + Creando temporada inicial de lealtad (Fidelidad)...`);
      const fechaInicio = new Date();
      const fechaFin = new Date(fechaInicio);
      fechaFin.setMonth(fechaFin.getMonth() + 3); // 3 meses duración estándar

      const season = await prisma.loyaltySeason.create({
        data: {
          id: crypto.randomUUID(),
          negocioId: neg.id,
          fechaInicio,
          fechaFin,
          duracionMeses: 3,
          descuentoDiamantes: 100,
          activa: true,
          procesada: false
        }
      });
      console.log(`    └─ Temporada activa inicial creada: ID ${season.id} (Termina: ${fechaFin.toLocaleDateString()})`);
    } else {
      console.log(`  - El negocio ya cuenta con una temporada activa (ID: ${activeSeason.id}).`);
    }
  }

  console.log("\n✅ Seed completado con éxito.");
}

main()
  .catch(e => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
