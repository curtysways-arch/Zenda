import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function DemoPage() {
    // Intentar buscar el primer negocio disponible para la demo
    // O usar uno específico si existe (ej: 'viva-spa')
    const negocio = await (prisma.negocio as any).findFirst({
        where: { estado: 'ACTIVO' },
        orderBy: { createdAt: 'asc' }
    });

    if (negocio) {
        redirect(`/${negocio.slug}`);
    }

    // Si no hay negocios, redirigir al inicio
    redirect("/");
}
