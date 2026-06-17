
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
    // For Windows absolute paths, we need 3 slashes
    if (absolutePath.match(/^[a-zA-Z]:/)) {
        finalUrl = `file:///${absolutePath}`;
    } else {
        finalUrl = `file://${absolutePath}`;
    }
}

console.log(`Final URL: ${finalUrl}`);

const adapter = new PrismaLibSql({ url: finalUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
    const negocios = await prisma.negocio.findMany({ take: 1 });
    if (negocios.length === 0) {
        console.log('No businesses found');
        return;
    }
    const businessId = negocios[0].id;
    const services = await prisma.service.findMany({ where: { negocioId: businessId }, take: 2 });
    const staff = await prisma.staff.findMany({ where: { businessId }, take: 2 });

    console.log(JSON.stringify({ businessId, services, staff }, null, 2));
}

main().finally(() => prisma.$disconnect());
