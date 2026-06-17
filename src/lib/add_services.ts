import prisma from './prisma';
import { v4 as uuidv4 } from 'uuid';

async function main() {
    const negocio = await prisma.negocio.findUnique({
        where: { slug: 'demo-spa' }
    });

    if (!negocio) {
        console.log('Negocio demo-spa no encontrado');
        return;
    }

    const s1 = await prisma.service.create({
        data: {
            id: uuidv4(),
            nombre: 'Masaje Piedras Calientes',
            duracion: 60,
            precio: 45.0,
            estaActivo: true,
            negocioId: negocio.id,
            extraInfo: JSON.parse('{"descripcion": "Terapia relajante que combina piedras volcánicas calientes con masajes."}'),
            updatedAt: new Date()
        }
    });

    const s2 = await prisma.service.create({
        data: {
            id: uuidv4(),
            nombre: 'Exfoliación Corporal',
            duracion: 45,
            precio: 30.0,
            estaActivo: true,
            negocioId: negocio.id,
            extraInfo: JSON.parse('{"descripcion": "Eliminación de células muertas para una piel suave y radiante."}'),
            updatedAt: new Date()
        }
    });

    console.log('Servicios creados:', s1.nombre, s2.nombre);
}

main().finally(() => prisma.$disconnect());
