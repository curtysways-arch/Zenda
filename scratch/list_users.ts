import prisma from '../src/lib/prisma';

async function main() {
    try {
        const users = await prisma.usuario.findMany({
            take: 20
        });
        console.log('--- ALL USERS ---');
        console.log(JSON.stringify(users.map(u => ({ id: u.id, email: u.email, role: u.role, nombre: u.nombre })), null, 2));
    } catch (e) {
        console.error('Error running script:', e);
    }
}

main().finally(() => process.exit(0));
