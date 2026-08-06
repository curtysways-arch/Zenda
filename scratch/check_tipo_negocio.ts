import prisma from '../src/lib/prisma';

async function main() {
  const n = await (prisma as any).negocio.findUnique({
    where: { slug: 'parrilla-citiox-demo' },
    select: { id: true, tipoNegocio: true, nombre: true, configuracion: true }
  });
  console.log('tipoNegocio:', n?.tipoNegocio);
  console.log('nombre:', n?.nombre);
  console.log('id:', n?.id);
  const cfg = typeof n?.configuracion === 'string' ? JSON.parse(n.configuracion || '{}') : (n?.configuracion || {});
  console.log('useEnterpriseRuntime:', cfg.useEnterpriseRuntime);
  await prisma.$disconnect();
}
main().catch(console.error);
