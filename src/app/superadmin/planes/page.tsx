import prisma from "@/lib/prisma";
import CreatePlanButton from "@/components/superadmin/CreatePlanButton";
import PlanesFilterableGrid from "@/components/superadmin/PlanesFilterableGrid";

export const dynamic = "force-dynamic";

export default async function PlanesPage() {
    const planes = await (prisma.plan as any).findMany({
        where: { id: { not: 'founder' } },
        include: {
            _count: {
                select: { Suscripcion: true }
            }
        },
        orderBy: { price: 'asc' }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Planes de Suscripción</h2>
                    <p className="text-slate-500 mt-1">Configura y organiza los planes por Tipo de Negocio y sus módulos.</p>
                </div>
                <CreatePlanButton />
            </div>

            <PlanesFilterableGrid planes={JSON.parse(JSON.stringify(planes))} />
        </div>
    );
}
