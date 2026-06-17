const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const bcrypt = require('bcrypt');
require('dotenv').config();

const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Iniciando seed de prueba...');

    // 1. Crear un Negocio
    const negocio = await prisma.negocio.upsert({
        where: { slug: 'complejo-test' },
        update: {},
        create: {
            nombre: 'Complejo Deportivo Test',
            slug: 'complejo-test',
            whatsapp: '1234567890',
            direccion: 'Av. Siempre Viva 123',
            precioHora: 25.00,
            horarioApertura: '08:00',
            horarioCierre: '23:00',
            pagosActivos: true,
            pagoPorcentaje: 50
        }
    });

    console.log('✅ Negocio creado:', negocio.nombre);

    // 2. Crear una Cancha
    await prisma.cancha.create({
        data: {
            nombre: 'Cancha de Fútbol 5',
            tipo: 'FÚTBOL',
            estaActiva: true,
            negocioId: negocio.id
        }
    });

    console.log('✅ Cancha creada');

    // 3. Crear Usuario Admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.usuario.upsert({
        where: { email: 'admin@test.com' },
        update: { password: hashedPassword },
        create: {
            nombre: 'Admin Test',
            email: 'admin@test.com',
            password: hashedPassword,
            role: 'ADMIN',
            negocioId: negocio.id
        }
    });

    console.log('✅ Usuario Admin creado:');
    console.log('   Email: admin@test.com');
    console.log('   Password: admin123');

    console.log('🚀 Seed completado con éxito.');
}

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
