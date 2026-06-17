import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("🛠️ Recreando Negocio 'demo-spa'...");
    
    try {
        const negocio = await prisma.negocio.upsert({
            where: { slug: 'demo-spa' },
            update: {},
            create: {
                nombre: 'Demo Spa & Bienestar',
                slug: 'demo-spa',
                propietario: 'Admin Demo',
                whatsapp: '5215500000000',
                direccion: 'Calle Ficticia 123',
                ciudad: 'Ciudad de México',
                precioHora: 50,
                horarioApertura: '08:00',
                horarioCierre: '20:00'
            }
        });
        console.log(`✅ Negocio creado: ${negocio.nombre} (${negocio.id})`);

        const cat = await prisma.category.create({
            data: {
                nombre: 'Masajes',
                businessId: negocio.id
            }
        });

        const service = await prisma.service.create({
            data: {
                nombre: 'Corte de cabello',
                descripcion: 'Corte profesional con estilo',
                precio: 8,
                duracion: 50,
                businessId: negocio.id,
                categoryId: cat.id
            }
        });
        console.log(`✅ Servicio creado: ${service.nombre}`);

        const staff = await prisma.staff.create({
            data: {
                name: 'Ana García',
                role: 'Estilista',
                businessId: negocio.id,
                active: true,
                workingHours: JSON.stringify({
                    monday: { start: '08:00', end: '20:00' },
                    tuesday: { start: '08:00', end: '20:00' },
                    wednesday: { start: '08:00', end: '20:00' },
                    thursday: { start: '08:00', end: '20:00' },
                    friday: { start: '08:00', end: '20:00' }
                }),
                services: {
                    connect: { id: service.id }
                }
            }
        });
        console.log(`✅ Staff creado: ${staff.name}`);

    } catch (e) {
        console.error("❌ Error al recrear datos:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
