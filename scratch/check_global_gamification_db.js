const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const path = require('path');
const fs = require('fs');

let envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  envPath = path.join(process.cwd(), '.env');
}
require('dotenv').config({ path: envPath });

const dbUrl = process.env.DATABASE_URL;
console.log(`🔗 Conectando a: ${dbUrl}`);

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.$connect();
  
  const globalLevelsCount = await prisma.globalLevel.count();
  const globalSeasonsCount = await prisma.globalSeason.count();
  
  console.log(`--- GLOBAL GAMIFICATION STATUS ---`);
  console.log(`GlobalLevels: ${globalLevelsCount}`);
  console.log(`GlobalSeasons: ${globalSeasonsCount}`);
  
  if (globalLevelsCount > 0) {
    const levels = await prisma.globalLevel.findMany({
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true, xpRequerida: true, orden: true }
    });
    console.log("Global Levels:", levels);
  }
  
  if (globalSeasonsCount > 0) {
    const seasons = await prisma.globalSeason.findMany({
      select: { id: true, codigo: true, nombre: true, status: true }
    });
    console.log("Global Seasons:", seasons);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
