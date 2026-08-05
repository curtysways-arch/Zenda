import prisma from '../src/lib/prisma';

async function getDemoCredentials() {
  console.log("=== CREDENCIALES DE ACCESO EN LA BASE DE DATOS ===");

  const usuarios = await prisma.usuario.findMany({
    include: {
      Negocio: true,
      UserRole: true
    }
  });

  console.log(`Total usuarios: ${usuarios.length}`);
  usuarios.forEach((u: any) => {
    console.log(`--------------------------------------------------`);
    console.log(`Nombre: ${u.nombre}`);
    console.log(`Email: ${u.email}`);
    console.log(`Role: ${u.role}`);
    console.log(`Negocio ID: ${u.negocioId}`);
    console.log(`Negocio Nombre: ${u.Negocio?.nombre} (${u.Negocio?.slug})`);
  });
}

getDemoCredentials().catch(console.error).finally(() => process.exit(0));
