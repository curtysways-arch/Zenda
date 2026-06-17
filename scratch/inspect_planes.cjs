const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const planes = await prisma.plan.findMany();
    console.log('--- PLANES EN LA BASE DE DATOS ---');
    planes.forEach(p => {
      console.log(`ID: ${p.id} | Name: ${p.name} | Price: ${p.price} | Trial Days: ${p.trial_days} | Active: ${p.active || p.activo}`);
      console.log('Features:', JSON.stringify(p.features || p.customFeatures, null, 2));
      console.log('-----------------------------------');
    });
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
