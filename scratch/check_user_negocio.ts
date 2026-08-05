import prisma from '../src/lib/prisma';

async function checkUser() {
  const user = await prisma.user.findFirst({
    where: { email: 'admin@lavado.com' },
    include: { negocio: true }
  });

  console.log('User admin@lavado.com:', JSON.stringify(user, null, 2));

  const shoeCareNegocio = await prisma.negocio.findFirst({
    where: { tipoNegocio: 'SHOE_CARE' }
  });

  console.log('ShoeCare Negocio:', JSON.stringify(shoeCareNegocio, null, 2));
}

checkUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
