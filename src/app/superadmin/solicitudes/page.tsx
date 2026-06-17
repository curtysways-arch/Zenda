import prisma from "@/lib/prisma";
import { Bell, FileCheck } from "lucide-react";
import SolicitudesClient from "@/components/superadmin/SolicitudesClient";

export default async function SolicitudesPage() {
    // Obtener solicitudes con pago pendiente
    const solicitudes = await (prisma.suscripcion as any).findMany({
        where: { pagoPendiente: true },
        include: {
            Negocio: {
                select: {
                    id: true,
                    nombre: true,
                    slug: true,
                }
            },
            Plan: true,
        },
        orderBy: { updatedAt: 'desc' }
    });

    // Enriquecer con el plan solicitado
    const enriched = await Promise.all(
        solicitudes.map(async (sol: any) => {
            let planSolicitado = null;
            if (sol.solicitudPlanId) {
                planSolicitado = await prisma.plan.findUnique({
                    where: { id: sol.solicitudPlanId }
                });
            }
            return {
                ...sol,
                negocio: sol.Negocio,
                plan: sol.Plan,
                planSolicitado,
            };
        })
    );

    const serialized = JSON.parse(JSON.stringify(enriched));

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            Solicitudes de Plan
                        </h2>
                        {serialized.length > 0 && (
                            <div className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-black animate-pulse">
                                {serialized.length}
                            </div>
                        )}
                    </div>
                    <p className="text-slate-500">
                        Revisa y valida las solicitudes de activación de planes de los negocios.
                    </p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[2rem] p-6 md:p-8 text-white shadow-xl shadow-indigo-600/20 flex items-start gap-5">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shrink-0">
                    <FileCheck size={28} />
                </div>
                <div>
                    <h4 className="font-black text-lg tracking-tight mb-1">Flujo de Verificación</h4>
                    <p className="text-indigo-100 font-medium text-sm leading-relaxed">
                        Cuando un negocio solicita un plan, su estado pasa a <b>"pendiente"</b>. 
                        Revisa el método de pago indicado, valida el comprobante (transferencia) o el cargo (tarjeta), 
                        y luego aprueba la solicitud. El plan se activa inmediatamente y el negocio recibe una notificación push.
                    </p>
                </div>
            </div>

            <SolicitudesClient solicitudes={serialized} />
        </div>
    );
}
