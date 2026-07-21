const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

// 1. Verificar Local SQLite
async function checkLocal() {
  console.log("--- CHEQUEANDO LOCAL (SQLite) ---");
  try {
    const url = 'file://' + __dirname.replace(/\\/g, '/') + '/../dev.db';
    const adapter = new PrismaLibSql({ url });
    const prisma = new PrismaClient({ adapter });

    const negociosCount = await prisma.negocio.count();
    const levelsCount = await prisma.levelTier.count();
    const seasonsCount = await prisma.loyaltySeason.count();
    console.log(`Negocios: ${negociosCount}`);
    console.log(`Niveles (LevelTier): ${levelsCount}`);
    console.log(`Temporadas (LoyaltySeason): ${seasonsCount}`);
    
    if (levelsCount > 0) {
      const levels = await prisma.levelTier.findMany({ select: { nombre: true, negocioId: true } });
      console.log("Niveles existentes:", levels.slice(0, 10));
    }
    if (seasonsCount > 0) {
      const seasons = await prisma.loyaltySeason.findMany({ select: { id: true, negocioId: true, activa: true } });
      console.log("Temporadas existentes:", seasons.slice(0, 10));
    }
    await prisma.$disconnect();
  } catch (e) {
    console.error("Error local SQLite:", e.message);
  }
}

// 2. Verificar VPS PostgreSQL
async function checkVPS() {
  console.log("\n--- CHEQUEANDO VPS (PostgreSQL) ---");
  const pgUrl = 'postgresql://root:Elmassuelto005624@157.173.203.174:5432/Zenda?schema=public';
  try {
    const pool = new Pool({ connectionString: pgUrl });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const negociosCount = await prisma.negocio.count();
    const levelsCount = await prisma.levelTier.count();
    const seasonsCount = await prisma.loyaltySeason.count();
    console.log(`Negocios: ${negociosCount}`);
    console.log(`Niveles (LevelTier): ${levelsCount}`);
    console.log(`Temporadas (LoyaltySeason): ${seasonsCount}`);
    
    if (levelsCount > 0) {
      const levels = await prisma.levelTier.findMany({ select: { nombre: true, negocioId: true } });
      console.log("Niveles existentes:", levels.slice(0, 10));
    }
    if (seasonsCount > 0) {
      const seasons = await prisma.loyaltySeason.findMany({ select: { id: true, negocioId: true, activa: true } });
      console.log("Temporadas existentes:", seasons.slice(0, 10));
    }
    await prisma.$disconnect();
    await pool.end();
  } catch (e) {
    console.error("Error VPS PostgreSQL:", e.message);
  }
}

async function run() {
  await checkLocal();
  await checkVPS();
}

run();
