import prisma from './src/lib/prisma';

async function seedSpaData() {
    try {
        console.log("Fetching demo-spa business...");
        const negocio = await prisma.negocio.findUnique({ where: { slug: 'demo-spa' } });
        
        if (!negocio) {
            console.log("demo-spa not found.");
            return;
        }

        console.log("Updating Negocio branding settings...");
        await prisma.negocio.update({
            where: { id: negocio.id },
            data: {
                nombre: 'Aura Wellness Spa',
                colorPrimario: '#0d9488', // Teal 600 - Premium Spa color
                colorSecundario: '#042f2e', // Teal 950 - Dark contrast
                heroTitulo: 'Tu Refugio de Bienestar y Belleza',
                heroSubtitulo: 'Reserva tu cita online con nuestros especialistas y vive una experiencia de relajación total.',
                tieneVestidores: true,
                tieneCafeteria: true,
                tieneWifi: true,
                precioHora: 50 // Base fallback price
            }
        });

        console.log("Cleaning constraints...");
        await prisma.$executeRawUnsafe(`DELETE FROM Reserva`);
        await prisma.$executeRawUnsafe(`DELETE FROM CourseSchedule`);
        await prisma.$executeRawUnsafe(`DELETE FROM _PromotionToService`);
        await prisma.$executeRawUnsafe(`DELETE FROM Bloqueo`);
        await prisma.$executeRawUnsafe(`DELETE FROM _StaffServices`);
        

        console.log("Cleaning old Services (Canchas) and Categories...");
        await prisma.service.deleteMany({ where: { negocioId: negocio.id } });
        await prisma.category.deleteMany({ where: { negocioId: negocio.id } });

        console.log("Creating Spa Categories...");
        const catMasajes = await prisma.category.create({ data: { nombre: 'Masajes Terapéuticos', negocioId: negocio.id } });
        const catFaciales = await prisma.category.create({ data: { nombre: 'Cuidado Facial', negocioId: negocio.id } });
        const catManicura = await prisma.category.create({ data: { nombre: 'Manicura & Pedicura', negocioId: negocio.id } });

        console.log("Creating Premium Spa Services...");
        await prisma.service.createMany({
            data: [
                {
                    nombre: 'Masaje Descontracturante Profundo',
                    duracion: 60,
                    precio: 65,
                    categoryId: catMasajes.id,
                    negocioId: negocio.id,
                    estaActivo: true,
                    extraInfo: JSON.stringify({ description: "Ideal para liberar tensión muscular severa y dolor focalizado." })
                },
                {
                    nombre: 'Masaje Reflexología',
                    duracion: 45,
                    precio: 45,
                    categoryId: catMasajes.id,
                    negocioId: negocio.id,
                    estaActivo: true,
                    extraInfo: JSON.stringify({ description: "Terapia de relajación enfocada en puntos vitales de manos y pies." })
                },
                {
                    nombre: 'Facial Hidratación con Ácido Hialurónico',
                    duracion: 60,
                    precio: 85,
                    categoryId: catFaciales.id,
                    negocioId: negocio.id,
                    estaActivo: true,
                    extraInfo: JSON.stringify({ description: "Renueva tu piel con un tratamiento de profunda hidratación y luminosidad." })
                },
                {
                    nombre: 'Manicura Spa Gold',
                    duracion: 90,
                    precio: 50,
                    categoryId: catManicura.id,
                    negocioId: negocio.id,
                    estaActivo: true,
                    extraInfo: JSON.stringify({ description: "Incluye exfoliación, esmaltado semipermanente y masaje de manos." })
                }
            ]
        });

        console.log("Creating Spa Staff...");
        // Ensure Staff exists
        const staffList = [
            { name: "Valeria", role: "Masajista Especialista", businessId: negocio.id },
            { name: "Lucía", role: "Cosmetóloga", businessId: negocio.id },
            { name: "Camila", role: "Nail Artist", businessId: negocio.id }
        ]
        
        for (const st of staffList) {
            await prisma.$executeRawUnsafe(`INSERT INTO Staff (id, businessId, name, role, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, 'st_'+st.name, st.businessId, st.name, st.role);
        }

        console.log("Spa data transformation completed securely.");

    } catch(e) { 
        console.log("Error:", e.message);
    }
}

seedSpaData().finally(() => process.exit(0));
