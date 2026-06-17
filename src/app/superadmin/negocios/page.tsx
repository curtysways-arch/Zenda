import prisma from "@/lib/prisma";
import NegociosGrid from "@/components/superadmin/NegociosGrid";

export default async function NegociosPage() {
    const negocios = await (prisma.negocio as any).findMany({
        include: {
            Suscripcion: {
                include: { Plan: true }
            },
            _count: {
                select: { Service: true, Appointment: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const serializedNegocios = JSON.parse(JSON.stringify(negocios));

    return (
        <NegociosGrid initialNegocios={serializedNegocios} />
    );
}
