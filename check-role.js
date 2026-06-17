const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbUrl = process.env.DATABASE_URL;
if (dbUrl && dbUrl.startsWith('file:')) {
    const relativePath = dbUrl.replace('file:', '');
    const absolutePath = path.resolve(__dirname, relativePath);
    process.env.DATABASE_URL = `file:${absolutePath}`;
}

const prisma = new PrismaClient();

async function check() {
    try {
        const user = await prisma.usuario.findUnique({
            where: { email: 'superadmin@cancha.com' }
        });
        console.log('User found:', JSON.stringify(user, null, 2));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
