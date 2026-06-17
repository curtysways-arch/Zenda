const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

// Fix path for PrismaLibSql
const dbPath = path.resolve(__dirname, '../prisma/dev.db').replace(/\\/g, '/');
const adapter = new PrismaLibSql({ url: `file:///${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function testNotification() {
    try {
        console.log("Fetching first Negocio...");
        const negocio = await prisma.negocio.findFirst();
        if (!negocio) {
            console.log("No negocio found.");
            return;
        }
        
        console.log("Business found:", negocio.nombre);
        console.log("Business phone:", negocio.whatsapp);

        console.log("Fetching Admins...");
        const admins = await prisma.usuario.findMany({
            where: { negocioId: negocio.id, whatsapp_notifications: true },
            select: { phone: true, email: true }
        });
        console.log("Admins:", admins);

    } catch (e) {
        console.error("Test error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

testNotification();
