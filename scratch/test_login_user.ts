import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function testUser() {
  const user = await prisma.usuario.findFirst({
    where: { email: 'admin@democanchas.com' },
    include: { Negocio: true }
  });

  if (user) {
    console.log("=== USUARIO ADMIN ENCONTRADO EN BASE DE DATOS ===");
    console.log("ID:", user.id);
    console.log("Nombre:", user.nombre);
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("Negocio Nombre:", user.Negocio?.nombre);
    console.log("Negocio Slug:", user.Negocio?.slug);
    console.log("Negocio Tipo:", (user.Negocio?.configuracion as any)?.tipoNegocio);
  } else {
    console.error("❌ Usuario no encontrado");
  }
}

testUser().catch(console.error).finally(() => process.exit(0));
