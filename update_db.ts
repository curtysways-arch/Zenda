import prisma from './src/lib/prisma';

async function updateDb() {
  await prisma.negocio.update({
    where: { slug: 'complejo-test' },
    data: { 
      slug: 'demo-spa',
      nombre: 'Spa & Wellness Center'
    }
  });
  console.log("Business updated successfully to demo-spa.");
}

updateDb().finally(() => process.exit(0));
