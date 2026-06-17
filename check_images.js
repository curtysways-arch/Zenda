const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env') });

const dbUrl = process.env.DATABASE_URL;

async function check() {
    let prisma;
    if (dbUrl.startsWith('libsql://') || dbUrl.startsWith('file:')) {
        const { createClient } = require('@libsql/client');
        const libsql = createClient({ url: dbUrl, authToken: process.env.DATABASE_AUTH_TOKEN });
        const adapter = new PrismaLibSql(libsql);
        prisma = new PrismaClient({ adapter });
    } else {
        prisma = new PrismaClient();
    }
    
    const negocio = await prisma.negocio.findFirst({
        where: { slug: 'demo-spa' },
        include: { Imagen: true, media: true }
    });
    
    console.log("Negocio configuracion:", negocio.configuracion);
    console.log("Imagenes count:", negocio.Imagen?.length);
    if(negocio.Imagen?.length > 0) {
       console.log("First Imagen:", negocio.Imagen[0]);
    }
    console.log("Media count:", negocio.media?.length);
}

check().catch(console.error).finally(() => process.exit(0));
