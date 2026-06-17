const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function testRegister() {
    try {
        const nombre = "Negocio Prueba";
        const email = "nego@gmail.com";
        const password = "password123";
        const negocioNombre = "Negocio Prueba";
        const ciudad = "Quito";
        const telefono = "986360071";

        const baseSlug = negocioNombre
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/^-+|-+$/g, '');

        let slug = baseSlug;
        let counter = 1;
        let slugExists = await prisma.negocio.findUnique({ where: { slug } });

        while (slugExists) {
            slug = `${baseSlug}-${counter}`;
            slugExists = await prisma.negocio.findUnique({ where: { slug } });
            counter++;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        console.log("Running prisma transaction...");
        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear el Negocio
            const nuevoNegocio = await tx.negocio.create({
                data: {
                    id: crypto.randomUUID(),
                    nombre: negocioNombre,
                    slug: slug,
                    ciudad: ciudad,
                    whatsapp: telefono || null,
                    horarioApertura: "08:00",
                    horarioCierre: "22:00",
                    precioHora: 0,
                    estado: 'ACTIVO',
                    colorPrimario: '#1dc95c',
                    colorSecundario: '#112117',
                    updatedAt: new Date()
                }
            });

            // 2. Crear el Usuario
            const nuevoUsuario = await tx.usuario.create({
                data: {
                    id: crypto.randomUUID(),
                    nombre: nombre,
                    email: email,
                    password: hashedPassword,
                    role: 'ADMIN',
                    negocioId: nuevoNegocio.id,
                    updatedAt: new Date()
                }
            });

            return { nuevoNegocio, nuevoUsuario };
        });

        console.log("Transaction result:", result);
    } catch (e) {
        console.error("❌ Test Register Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

testRegister();
