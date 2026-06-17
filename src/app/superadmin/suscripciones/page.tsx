import prisma from "@/lib/prisma";
import {
    CreditCard,
    Calendar,
    AlertTriangle,
    RefreshCw,
    History,
    MoreVertical,
    Clock,
    Zap,
    Building2,
    CalendarCheck2,
    Trophy
} from "lucide-react";
import Link from "next/link";
import SuscripcionActions from "@/components/superadmin/SuscripcionActions";

export default async function SuscripcionesPage() {
    // Obtenemos todos los negocios para asegurar que ninguno quede fuera de la lista
    const [negocios, planes] = await Promise.all([
        (prisma.negocio as any).findMany({
            include: {
                Suscripcion: {
                    include: { Plan: true }
                },
                Payment: {
                    take: 1,
                    orderBy: { fecha_pago: 'desc' }
                }
            },
            orderBy: { nombre: 'asc' }
        }),
        prisma.plan.findMany({
            where: { activo: true, id: { not: 'founder' } },
            orderBy: { price: 'asc' } as any
        })
    ]);

    // Procesamos los datos...
    // [mismo procesamiento que antes o similar]

    // Procesamos los datos para tener una lista unificada de "Estado de Suscripción" por negocio
    const suscripcionesDisplay = negocios.map((negocio: any) => {
        const sub = negocio.Suscripcion;
        const ultimoPago = negocio.Payment?.[0];

        return {
            id: sub?.id || `temp-${negocio.id}`,
            negocioId: negocio.id,
            negocio: {
                id: negocio.id,
                nombre: negocio.nombre,
            },
            planId: sub?.planId || null,
            plan: sub?.Plan || null,
            fechaFin: sub?.fechaFin || null,
            estado: sub?.estado?.toUpperCase() || 'SIN PLAN',
            isFounder: sub?.isFounder || false,
            founderPosition: sub?.founderPosition || null,
            lockedPrice: sub?.lockedPrice || null,
            ultimoPago: ultimoPago ? {
                monto: ultimoPago.monto,
                fecha: ultimoPago.fecha_pago,
                metodo: ultimoPago.metodo_pago
            } : null,
            isPlaceholder: !sub
        };
    });

    const serializedSubs = JSON.parse(JSON.stringify(suscripcionesDisplay));
    const serializedPlanes = JSON.parse(JSON.stringify(planes));

    const getStatusBadge = (estado: string, fechaFinStr?: string) => {
        if (!fechaFinStr) return 'bg-gray-100 text-gray-500 border-gray-200';

        const hoy = new Date();
        const fechaFin = new Date(fechaFinStr);
        const isVencida = fechaFin < hoy;

        if (estado === 'CANCELADA') return 'bg-slate-100 text-slate-500 border-slate-200';
        if (isVencida || estado === 'EXPIRED' || estado === 'VENCIDA') return 'bg-rose-100 text-rose-700 border-rose-200';
        if (estado === 'TRIAL') return 'bg-amber-100 text-amber-700 border-amber-200';
        if (estado === 'ACTIVE' || estado === 'ACTIVA') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const getStatusLabel = (estado: string, fechaFinStr?: string) => {
        if (!fechaFinStr && estado !== 'TRIAL' && estado !== 'PRUEBA') return 'SIN DATOS';

        const hoy = new Date();
        const fechaFin = fechaFinStr ? new Date(fechaFinStr) : null;
        if (fechaFin && fechaFin < hoy) return 'VENCIDA';

        switch (estado) {
            case 'TRIAL':
            case 'PRUEBA': return 'PRUEBA';
            case 'ACTIVE':
            case 'ACTIVA': return 'ACTIVA';
            case 'EXPIRED':
            case 'VENCIDA': return 'VENCIDA';
            case 'SUSPENDIDA':
            case 'SUSPENDIDO': return 'SUSPENDIDA';
            default: return estado || 'S/N';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestión de Suscripciones</h2>
                    <p className="text-slate-500 mt-1">Administra el acceso, planes y fechas de vencimiento de todos los negocios.</p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Negocio</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan & Costo</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimiento</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Último Pago</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {serializedSubs.map((sub: any) => (
                                <tr key={sub.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-white group-hover:shadow-md transition-all">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <Link
                                                    href={`/superadmin/negocios/${sub.negocioId}?tab=subscription`}
                                                    className="font-extrabold text-slate-900 leading-none mb-1 text-base hover:text-indigo-600 transition-colors cursor-pointer"
                                                >
                                                    {sub.negocio?.nombre}
                                                </Link>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ID: {sub.negocioId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <div className="inline-flex items-center gap-1.5 p-1.5 px-3 bg-slate-900 text-white rounded-xl text-[10px] font-black tracking-widest w-fit uppercase">
                                                    <Zap size={12} className="text-amber-400 fill-amber-400" />
                                                    {sub.plan?.name || 'S/N'}
                                                </div>
                                                {sub.isFounder && (
                                                    <div className="inline-flex items-center gap-1 p-1 px-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-955 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-sm">
                                                        <Trophy size={10} className="fill-slate-950 animate-pulse" />
                                                        Fundador #{sub.founderPosition}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-sm font-black text-slate-600 ml-1 tracking-tight flex items-center gap-1.5">
                                                <span>${sub.lockedPrice !== null ? sub.lockedPrice : (sub.plan?.price || 0)}</span>
                                                <span className="text-[10px] text-slate-400 font-bold">/mes</span>
                                                {sub.lockedPrice !== null && (
                                                    <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-bold uppercase tracking-wider">
                                                        Congelado
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${new Date(sub.fechaFin) < new Date() ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                                <CalendarCheck2 size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-black tracking-tight ${new Date(sub.fechaFin) < new Date() ? 'text-rose-600' : 'text-slate-900'}`}>
                                                    {sub.fechaFin ? new Date(sub.fechaFin).toLocaleDateString() : 'Sin fecha'}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Expiración</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        {sub.ultimoPago ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-emerald-600">${sub.ultimoPago.monto}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                    {new Date(sub.ultimoPago.fecha).toLocaleDateString()}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-300 uppercase italic">Sin pagos</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex justify-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${getStatusBadge(sub.estado, sub.fechaFin)} uppercase tracking-widest shadow-sm`}>
                                                {getStatusLabel(sub.estado, sub.fechaFin)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <SuscripcionActions sub={sub} planes={serializedPlanes} />
                                    </td>
                                </tr>
                            ))}

                            {serializedSubs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-24 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="p-6 bg-slate-50 text-slate-200 rounded-[2.5rem] mb-6">
                                                <CreditCard size={64} />
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">No hay negocios registrados</h3>
                                            <p className="text-slate-400 max-w-sm mx-auto mt-2 font-medium">
                                                Parece que aún no has creado negocios en la plataforma para gestionar sus suscripciones.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-600/20 flex items-start gap-6">
                    <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <h4 className="font-black text-xl tracking-tight mb-2 uppercase">Control de Suspensión</h4>
                        <p className="text-indigo-100/90 font-bold text-sm leading-relaxed tracking-tight">
                            El sistema valida los accesos en tiempo real. Si la fecha de vencimiento es superada, el administrador del complejo será bloqueado automáticamente hasta que se renueve su plan.
                        </p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex items-start gap-6 shadow-sm">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                        <History size={32} />
                    </div>
                    <div>
                        <h4 className="font-black text-xl text-slate-900 tracking-tight mb-2 uppercase text-base">Renovación Manual</h4>
                        <p className="text-slate-500 font-bold text-sm leading-relaxed tracking-tight">
                            Usa el botón "+1 Mes" para activar rápidamente un negocio después de confirmar su pago por transferencia o efectivo. La activación es inmediata.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
