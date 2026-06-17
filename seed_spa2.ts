import prisma from './src/lib/prisma';

async function seedSpaDataUnsafe() {
    try {
        console.log("Fetching demo-spa business...");
        const negocio = await prisma.negocio.findUnique({ where: { slug: 'demo-spa' } });
        
        if (!negocio) return;
        
        const services = await prisma.service.findMany({ where: { negocioId: negocio.id } });
        console.log("Found services: ", services.length);

        console.log("Updating Negocio");
        await prisma.negocio.update({
            where: { id: negocio.id },
            data: {
                nombre: 'Aura Wellness Spa',
                colorPrimario: '#0d9488', // Teal 600 - Premium Spa color
                colorSecundario: '#042f2e', // Teal 950 - Dark contrast
                heroTitulo: 'Tu Refugio de Bienestar y Belleza',
                heroSubtitulo: 'Reserva tu cita online con nuestros especialistas.',
            }
        });

        // We will just rename existing services and categories
        const defaultNames = [
            { nombre: 'Masaje Descontracturante', duracion: 60, precio: 65 },
            { nombre: 'Facial Hidratación', duracion: 45, precio: 50 },
            { nombre: 'Manicura Spa Gold', duracion: 90, precio: 30 },
            { nombre: 'Pedicura Spa', duracion: 60, precio: 35 },
            { nombre: 'Corte de Cabello Premium', duracion: 45, precio: 25 },
            { nombre: 'Masaje Piedras Calientes', duracion: 90, precio: 90 },
        ];

        for (let i = 0; i < services.length; i++) {
            const data = defaultNames[i % defaultNames.length];
            await prisma.service.update({
                where: { id: services[i].id },
                data: {
                    nombre: data.nombre,
                    duracion: data.duracion,
                    precio: data.precio,
                    extraInfo: JSON.stringify({ description: "Servicio premium de bienestar." })
                }
            });
        }
        
        // Also add Staff if missing
        const staffList = await prisma.$queryRawUnsafe(`SELECT * FROM Staff WHERE businessId = '${negocio.id}'`);
        if ((staffList as any).length === 0) {
             const staffD = [
                { id: "st1", name: "Valeria", role: "Masajista" },
                { id: "st2", name: "Lucía", role: "Cosmetóloga" }
            ];
            for (const st of staffD) {
                await prisma.$executeRawUnsafe(`INSERT INTO Staff (id, businessId, name, role, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, st.id, negocio.id, st.name, st.role);
            }
        }
        
        // If there are less than 3 services, create more
        if (services.length < 3) {
            for (let i = services.length; i < 3; i++) {
                const data = defaultNames[i];
                await prisma.service.create({
                    data: {
                        nombre: data.nombre,
                        duracion: data.duracion,
                        precio: data.precio,
                        negocioId: negocio.id,
                        estaActivo: true,
                        extraInfo: JSON.stringify({ description: "Servicio premium de bienestar." })
                    }
                });
            }
        }

        console.log("Spa data transformation completed securely.");

    } catch(e) { 
        console.log("Error:", e.message);
    }
}

seedSpaDataUnsafe().finally(() => process.exit(0));
