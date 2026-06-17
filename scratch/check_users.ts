import prisma from '../src/lib/prisma';

async function main() {
    console.log("--- LISTA DE USUARIOS Y ROLES ---");
    const usuarios = await prisma.usuario.findMany({
        select: {
            id: true,
            nombre: true,
            email: true,
            role: true,
            negocioId: true
        }
    });
    
    usuarios.forEach(u => {
        console.log(`ID: ${u.id} | Nombre: ${u.nombre} | Email: ${u.email} | Rol: ${u.role} | NegocioID: ${u.negocioId}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
