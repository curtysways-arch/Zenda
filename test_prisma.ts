import prisma from './src/lib/prisma';

async function test() {
    try {
        console.log("Keys in prisma:", Object.keys(prisma).filter(k => !k.startsWith('_')));
        console.log("Is prisma.appointment defined?", !!prisma.appointment);
        const count = await prisma.appointment.count();
        console.log("Appointments count:", count);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
