import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL as string });
const prisma = new PrismaClient({ adapter });

async function main() {
    const count = await prisma.resultado.count();
    console.log('TOTAL_RESULTADOS:', count);
    const results = await prisma.resultado.findMany({
        select: { title: true, businessId: true, showInLanding: true, published: true }
    });
    console.log('DETALLES:', JSON.stringify(results, null, 2));
    
    const negocios = await prisma.negocio.findMany({ select: { id: true, slug: true } });
    console.log('NEGOCIOS:', JSON.stringify(negocios, null, 2));
}

main().finally(() => prisma.$disconnect());
