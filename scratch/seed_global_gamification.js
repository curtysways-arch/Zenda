const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  envPath = path.join(process.cwd(), '.env');
}
if (!fs.existsSync(envPath)) {
  envPath = path.join(__dirname, '.env');
}
require('dotenv').config({ path: envPath });

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
console.log(`🔗 Conectando a la base de datos: ${dbUrl}`);

// Configurar Prisma adaptativo según la base de datos
let prisma;

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
} else {
    const { createClient } = require('@libsql/client');
    const { PrismaLibSql } = require('@prisma/adapter-libsql');
    
    let finalUrl = dbUrl;
    if (dbUrl.startsWith('file:')) {
        const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
        const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
        const absPath = isAbsolute ? rawPath : `${process.cwd()}/${rawPath}`;
        const normalized = absPath.split(/[/\\]/).join('/');
        const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
        finalUrl = `file://${prefix}${normalized}`;
    }
    const client = createClient({ url: finalUrl });
    const adapter = new PrismaLibSql(client);
    prisma = new PrismaClient({ adapter });
}

const DEFAULT_GLOBAL_LEVELS = [
  {
    id: "glevel-bronze",
    nombre: "🥉 Bronce",
    titulo: "Iniciante",
    descripcion: "Tu viaje de bienestar comienza aquí",
    xpRequerida: 0,
    color: "#CD7F32",
    icono: "Shield",
    orden: 1,
    beneficios: ["Acceso a misiones globales", "Wallet Citiox activa"]
  },
  {
    id: "glevel-silver",
    nombre: "🥈 Plata",
    titulo: "Entusiasta",
    descripcion: "Estás ganando impulso",
    xpRequerida: 500,
    color: "#C0C0C0",
    icono: "Zap",
    orden: 2,
    beneficios: ["Multiplicador de XP 1.05x", "Soporte prioritario"]
  },
  {
    id: "glevel-gold",
    nombre: "🥇 Oro",
    titulo: "Vanguardia",
    descripcion: "Un cliente distinguido en el club",
    xpRequerida: 1500,
    color: "#FFD700",
    icono: "Crown",
    orden: 3,
    beneficios: ["Multiplicador de XP 1.1x", "Acceso prioritario a eventos"]
  },
  {
    id: "glevel-platinum",
    nombre: "💎 Platino",
    titulo: "Elite",
    descripcion: "Perteneces al selecto grupo premium",
    xpRequerida: 4000,
    color: "#E5E4E2",
    icono: "Gem",
    orden: 4,
    beneficios: ["Multiplicador de XP 1.15x", "Acceso anticipado a lanzamientos"]
  },
  {
    id: "glevel-diamond",
    nombre: "👑 Diamante",
    titulo: "Soberano",
    descripcion: "Máximo bienestar alcanzado",
    xpRequerida: 10000,
    color: "#B9F2FF",
    icono: "Trophy",
    orden: 5,
    beneficios: ["Multiplicador de XP 1.25x", "Insignia especial en perfil"]
  },
  {
    id: "glevel-legend",
    nombre: "🔥 Leyenda",
    titulo: "Eterno",
    descripcion: "Leyenda viviente de Citiox",
    xpRequerida: 25000,
    color: "#EC4899",
    icono: "Flame",
    orden: 6,
    beneficios: ["Multiplicador de XP 1.4x", "Regalo físico al terminar temporada"]
  }
];

async function main() {
  await prisma.$connect();
  console.log("📡 Conexión establecida. Sembrando niveles globales...");

  // 1. Crear GlobalLevels y GlobalLevelPresentations
  for (const level of DEFAULT_GLOBAL_LEVELS) {
    const existing = await prisma.globalLevel.findUnique({
      where: { xpRequerida: level.xpRequerida }
    });

    if (!existing) {
      await prisma.globalLevel.create({
        data: {
          id: level.id,
          nombre: level.nombre,
          titulo: level.titulo,
          descripcion: level.descripcion,
          xpRequerida: level.xpRequerida,
          orden: level.orden,
          beneficios: level.beneficios
        }
      });
      console.log(`✅ Creado GlobalLevel: ${level.nombre} (XP: ${level.xpRequerida})`);

      // Crear presentación visual asociada
      await prisma.globalLevelPresentation.create({
        data: {
          id: crypto.randomUUID(),
          globalLevelId: level.id,
          icono: level.icono,
          color: level.color,
          tituloUi: level.titulo,
          descripcionUi: level.descripcion,
          metadatos: {}
        }
      });
      console.log(`   └─ Presentación visual creada.`);
    } else {
      console.log(`ℹ️ El GlobalLevel de XP ${level.xpRequerida} ya existe.`);
    }
  }

  // 2. Crear GlobalSeason activa si no existe ninguna
  const activeSeason = await prisma.globalSeason.findFirst({
    where: { status: "ACTIVE" }
  });

  if (!activeSeason) {
    console.log("🌱 Creando primera GlobalSeason activa...");
    const fechaInicio = new Date();
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMonth(fechaFin.getMonth() + 3);

    const season = await prisma.globalSeason.create({
      data: {
        id: crypto.randomUUID(),
        codigo: "TEMPORADA_1",
        nombre: "Temporada de Bienestar Fundadores",
        descripcion: "La primera temporada competitiva oficial de Citiox. ¡Acumula XP reservando en cualquiera de nuestros Spas y reclama premios exclusivos!",
        fechaInicio,
        fechaFin,
        status: "ACTIVE",
        config: {}
      }
    });
    console.log(`✅ GlobalSeason creada: ${season.nombre} (Código: ${season.codigo})`);
  } else {
    console.log(`ℹ️ Ya existe una GlobalSeason activa (ID: ${activeSeason.id}, Nombre: ${activeSeason.nombre}).`);
  }

  console.log("\n✨ Sembrado de Gamificación Global completado con éxito.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
