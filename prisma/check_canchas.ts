import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import prisma from '../src/lib/prisma';

async function main() {
    const negocios = await prisma.negocio.findMany({
        where: { tipoNegocio: 'SPORTS_COURTS' },
        select: { id: true, slug: true, nombre: true, tipoNegocio: true, estado: true }
    });
    console.log('NEGOCIOS SPORTS_COURTS:', JSON.stringify(negocios, null, 2));

    const demoCanchas = await prisma.negocio.findUnique({
        where: { slug: 'demo-canchas' },
        select: { id: true, slug: true, nombre: true, tipoNegocio: true, estado: true }
    });
    console.log('BUSQUEDA POR SLUG demo-canchas:', JSON.stringify(demoCanchas, null, 2));
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
