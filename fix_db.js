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

function fixEncoding(str) {
    if (!str) return str;
    let fixed = str;
    const replacements = {
        'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
        'Ã±': 'ñ', 'Ã ': 'à', 'Ã¨': 'è', 'Ã¬': 'ì', 'Ã²': 'ò', 'Ã¹': 'ù',
        'Ã¼': 'ü', 'Ã‘': 'Ñ'
    };
    for (const [bad, good] of Object.entries(replacements)) {
        fixed = fixed.split(bad).join(good);
    }
    
    // Also try to fix generic ISO-8859-1 strings
    if (fixed.includes('tensiÃ³n')) fixed = fixed.replace(/tensiÃ³n/g, 'tensión');
    if (fixed.includes('energÃ­a')) fixed = fixed.replace(/energÃ­a/g, 'energía');
    if (fixed.includes('Ã')) fixed = fixed.replace(/Ã³/g, 'ó').replace(/Ã­/g, 'í');
    
    return fixed;
}

async function main() {
    await prisma.$connect();
    
    const servicios = await prisma.service.findMany();
    for (const s of servicios) {
        let needsUpdate = false;
        
        let desc = s.descripcion;
        if (desc && desc.includes('tensiÃ³n') || desc && desc.includes('Ã')) {
            desc = fixEncoding(desc);
            needsUpdate = true;
        }

        let nombre = s.nombre;
        if (nombre && nombre.includes('Ã')) {
            nombre = fixEncoding(nombre);
            needsUpdate = true;
        }

        if (needsUpdate) {
            console.log(`Fixing: ${s.nombre} -> ${nombre} | desc -> ${desc}`);
            await prisma.service.update({
                where: { id: s.id },
                data: { 
                    nombre: nombre,
                    descripcion: desc 
                }
            });
        }
    }

    console.log("Done fixing DB.");
}

main().finally(() => prisma.$disconnect());
