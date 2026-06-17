import prisma from './src/lib/prisma.ts';
import hasher from 'bcryptjs';

async function main() {
    const business = await prisma.negocio.findFirst({ where: { slug: 'demo-spa' } });
    if (!business) {
        console.log('No hay negocio con slug demo-spa');
        return;
    }

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const email = 'admin@spa.com';
    const password = 'admin123';
    const hashedPassword = await hasher.hash(password, 10);
    
    await prisma.usuario.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            negocioId: business.id,
            role: 'ADMIN_NEGOCIO'
        },
        create: {
            id,
            nombre: 'Admin Spa',
            email,
            password: hashedPassword,
            negocioId: business.id,
            role: 'ADMIN_NEGOCIO',
            updatedAt: new Date()
        }
    });
    
    console.log(`Usuario CREADO/ACTUALIZADO:`);
    console.log(`Email: ${email}`);
    console.log(`Pass: ${password}`);
    console.log(`Negocio: ${business.nombre}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
