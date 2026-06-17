import prisma from './src/lib/prisma';
import { startOfMonth, startOfWeek, endOfWeek, startOfToday, endOfToday } from 'date-fns';

async function test() {
    try {
        const now = new Date();
        const startToday = startOfToday();
        const endToday = endOfToday();
        const startMonth = startOfMonth(now);
        const inicioSemana = startOfWeek(now, { weekStartsOn: 1 });
        const finSemana = endOfWeek(now, { weekStartsOn: 1 });

        const commonFilter = {
            negocioId: "test",
        };

        console.log("Running appointment.findMany...");
        const citasSemana = await prisma.appointment.findMany({
            where: {
                ...commonFilter,
                fecha: {
                    gte: inicioSemana,
                    lt: finSemana
                },
                estado: { not: 'cancelled' }
            },
        });
        console.log("Success! Count:", citasSemana.length);
    } catch (e) {
        console.error("Prisma Error:", e);
    }
}
test();
