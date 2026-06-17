
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('DATABASE_URL not found');
    process.exit(1);
}

let finalUrl = dbUrl;
if (dbUrl.startsWith('file:')) {
    const relativePath = dbUrl.replace('file:', '');
    const absolutePath = path.resolve(process.cwd(), relativePath).replace(/\\/g, '/');
    if (absolutePath.match(/^[a-zA-Z]:/)) {
        finalUrl = `file:///${absolutePath}`;
    } else {
        finalUrl = `file://${absolutePath}`;
    }
}

const adapter = new PrismaLibSql({ url: finalUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
    const resultados = await prisma.resultado.findMany({
        include: {
            negocio: { select: { nombre: true, slug: true } }
        }
    });
    console.log(JSON.stringify(resultados, null, 2));
}

main().finally(() => prisma.$disconnect());
