const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env') });

const dbUrl = process.env.DATABASE_URL;
let finalUrl = dbUrl;
if (dbUrl?.startsWith('file:')) {
    const relativePath = dbUrl.replace('file:', '');
    const absolutePath = path.resolve(process.cwd(), relativePath);
    finalUrl = `file:${absolutePath}`;
}

const adapter = new PrismaLibSql({ url: finalUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
    await prisma.$connect();
    
    const servicios = await prisma.service.findMany({
        where: {
            nombre: 'Profilaxis'
        }
    });
    console.log(servicios.map(s => s.descripcion));

    // Fix forcefully
    for (const s of servicios) {
        if (s.descripcion.includes('tensiÃ³n') || s.descripcion.includes('energÃ')) {
            await prisma.service.update({
                where: { id: s.id },
                data: {
                    descripcion: 'Libera tensión y recupera tu energía vital.'
                }
            });
            console.log("Fixed Profilaxis manually!");
        }
    }
}

main().finally(() => prisma.$disconnect());
