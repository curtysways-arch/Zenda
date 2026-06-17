import prisma from '../src/lib/prisma';

async function main() {
    try {
        const user = await prisma.usuario.findFirst({
            where: { email: 'superadmin@cancha.com' }
        });
        console.log('--- USER DATA ---');
        console.log(JSON.stringify(user, null, 2));
    } catch (e) {
        console.error('Error running script:', e);
    }
}

main().finally(() => process.exit(0));
