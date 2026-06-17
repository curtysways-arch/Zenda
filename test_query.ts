import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const res = await prisma.appointment.findMany({
            take: 1,
            include: {
                Service: {
                    include: {
                        Imagen: {
                            take: 3
                        }
                    }
                },
                Staff: true
            }
        });
        console.log("Success!", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
