import prisma from "@/lib/prisma";
import {
    Building2,
    CreditCard,
    AlertCircle,
    Calendar,
    CheckCircle2,
    ArrowUpRight,
    Trophy,
    Zap,
    Banknote
} from "lucide-react";
import Link from 'next/link';
import { getFounderConfig } from "@/lib/services/planService";
import SuperadminFoundersSection from "@/components/superadmin/SuperadminFoundersSection";

export default async function SuperAdminDashboard() {
    // Obtener métricas reales de la DB (excluyendo demos)
    const [totalNegocios, negociosActivos, negociosSuspendidos, pendingPaymentsCount, pendingSolicitudesCount] = await Promise.all([
        prisma.negocio.count({ where: { isDemo: false } }),
        prisma.negocio.count({ where: { estado: 'ACTIVO', isDemo: false } }),
        prisma.negocio.count({ where: { estado: 'SUSPENDIDO', isDemo: false } }),
        (prisma.payment as any).count({ where: { estado_pago: 'pending' } }),
        (prisma.suscripcion as any).count({ where: { pagoPendiente: true } })
    ]);

    // Negocios en prueba: se detectan por suscripcion.estado = 'trial'
    const negociosPrueba = await (prisma.suscripcion as any).count({
        where: { 
            estado: 'trial',
            Negocio: { isDemo: false }
        }
    });

    // Suscripciones activas (puede ser 'activa', 'active', o 'ACTIVA' según cómo se guarden)
    const suscripcionesActivas = await (prisma.suscripcion as any).findMany({
        where: { 
            estado: { in: ['activa', 'active', 'ACTIVA'] },
            Negocio: { isDemo: false }
        },
        include: { Plan: true }
    });

    const ingresosMensuales = suscripcionesActivas.reduce((acc: number, sub: any) => {
        const precio = sub.lockedPrice !== null && sub.lockedPrice !== undefined ? sub.lockedPrice : (sub.Plan?.price || 0);
        return acc + precio;
    }, 0);

    const { founderLockedPrice } = await getFounderConfig();

    // Obtener familias con sus programas de fundadores
    const planFamilies = await (prisma as any).planFamily.findMany({
        include: {
            founderProgram: true
        },
        orderBy: { name: 'asc' }
    });

    // Lista de fundadores con detalle de negocio y plan con familia
    const listaFundadores = await (prisma.suscripcion as any).findMany({
        where: { isFounder: true, Negocio: { isDemo: false } },
        include: {
            Negocio: {
                select: {
                    id: true,
                    nombre: true,
                    slug: true,
                    tipoNegocio: true
                }
            },
            Plan: {
                include: {
                    family: true
                }
            }
        },
        orderBy: { founderPosition: 'asc' }
    });

    // Próximos vencimientos (7 días) — incluye trial y activas
    const hoy = new Date();
    const enSieteDias = new Date();
    enSieteDias.setDate(hoy.getDate() + 7);

    const proximosVencimientos = await (prisma.suscripcion as any).findMany({
        where: {
            fechaFin: {
                lte: enSieteDias,
                gte: hoy
            },
            estado: { in: ['activa', 'active', 'ACTIVA', 'trial'] },
            Negocio: { isDemo: false }
        },
        include: { Negocio: true }
    });

    const tz = 'America/Guayaquil';
    const formatMoney = (n: number) => `$${Number(n || 0).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    const todayLabel = new Intl.DateTimeFormat('es-EC', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(hoy);
    const daysLeft = (d: Date) => Math.max(0, Math.ceil((new Date(d).getTime() - hoy.getTime()) / 86400000));

    const stats = [
        { name: 'Negocios registrados', value: totalNegocios, icon: Building2, tint: 'bg-blue-50 text-blue-600', href: '/superadmin/negocios' },
        { name: 'Activos', value: negociosActivos, icon: CheckCircle2, tint: 'bg-emerald-50 text-emerald-600', href: '/superadmin/negocios' },
        { name: 'En prueba', value: negociosPrueba, icon: Zap, tint: 'bg-amber-50 text-amber-600', href: '/superadmin/suscripciones' },
        { name: 'Suspendidos', value: negociosSuspendidos, icon: AlertCircle, tint: 'bg-rose-50 text-rose-600', href: '/superadmin/negocios' },
    ];

    const hasPending = pendingPaymentsCount > 0 || pendingSolicitudesCount > 0;

    return (
        <div className="space-y-6 lg:space-y-8 pb-10 max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Resumen de la plataforma</h1>
                    <p className="text-slate-500 text-[15px] mt-1">Negocios reales de Citiox. Los negocios demo no se cuentan.</p>
                </div>
                <p className="text-sm text-slate-500 first-letter:uppercase">{todayLabel}</p>
            </div>

            {/* Pendientes */}
            {hasPending ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                            <Banknote size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900">
                                {pendingPaymentsCount > 0 && `${pendingPaymentsCount} pago${pendingPaymentsCount > 1 ? 's' : ''} por verificar`}
                                {pendingPaymentsCount > 0 && pendingSolicitudesCount > 0 && ' y '}
                                {pendingSolicitudesCount > 0 && `${pendingSolicitudesCount} solicitud${pendingSolicitudesCount > 1 ? 'es' : ''} de plan`}
                            </p>
                            <p className="text-sm text-slate-600">Hay negocios esperando que actives o renueves su plan.</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        {pendingPaymentsCount > 0 && (
                            <Link href="/superadmin/pagos" className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold text-center">
                                Revisar pagos
                            </Link>
                        )}
                        {pendingSolicitudesCount > 0 && (
                            <Link href="/superadmin/solicitudes" className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-slate-900 text-sm font-semibold text-center">
                                Ver solicitudes
                            </Link>
                        )}
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-3 text-sm text-emerald-800">
                    <CheckCircle2 size={18} className="shrink-0" />
                    No hay pagos ni solicitudes pendientes.
                </div>
            )}

            {/* Indicadores */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {stats.map((stat) => (
                    <Link key={stat.name} href={stat.href} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                        <div className={`size-10 rounded-xl flex items-center justify-center ${stat.tint}`}>
                            <stat.icon size={19} />
                        </div>
                        <p className="mt-4 text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                        <p className="text-sm text-slate-500">{stat.name}</p>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Ingresos */}
                <div className="rounded-2xl p-6 text-white relative overflow-hidden flex flex-col justify-between gap-8" style={{ background: 'linear-gradient(135deg, #0066FF 0%, #0047B3 100%)' }}>
                    <div className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10 pointer-events-none" />
                    <div className="relative">
                        <div className="size-10 rounded-xl bg-white/15 flex items-center justify-center">
                            <CreditCard size={19} />
                        </div>
                        <p className="mt-5 text-sm text-blue-100">Ingreso mensual estimado</p>
                        <p className="text-4xl font-bold tracking-tight">{formatMoney(ingresosMensuales)}</p>
                        <p className="mt-1 text-xs text-blue-100/80">Suma del precio de cada suscripción activa.</p>
                    </div>
                    <div className="relative flex items-center gap-2 text-sm bg-white/10 rounded-xl px-3 py-2.5">
                        <Trophy size={16} className="text-blue-100" />
                        {suscripcionesActivas.length} suscripcion{suscripcionesActivas.length === 1 ? '' : 'es'} activa{suscripcionesActivas.length === 1 ? '' : 's'}
                    </div>
                </div>

                {/* Próximos vencimientos */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Calendar size={19} />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-900">Planes que vencen pronto</h2>
                                <p className="text-sm text-slate-500">En los próximos 7 días</p>
                            </div>
                        </div>
                        <span className="text-sm font-semibold text-slate-600 bg-slate-100 rounded-full px-2.5 py-0.5">{proximosVencimientos.length}</span>
                    </div>

                    <div className="flex-1 divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                        {proximosVencimientos.length > 0 ? proximosVencimientos.map((sub: any) => {
                            const left = daysLeft(sub.fechaFin);
                            return (
                                <Link
                                    key={sub.id}
                                    href={`/superadmin/negocios/${sub.Negocio.id}`}
                                    className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                                >
                                    <span className="size-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center shrink-0">
                                        {sub.Negocio.nombre.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block font-semibold text-slate-900 truncate">{sub.Negocio.nombre}</span>
                                        <span className="block text-sm text-slate-500">
                                            {sub.estado === 'trial' ? 'Prueba' : 'Plan'} vence el {new Date(sub.fechaFin).toLocaleDateString('es-EC', { timeZone: tz, day: 'numeric', month: 'short' })}
                                        </span>
                                    </span>
                                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${left <= 2 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                        {left === 0 ? 'Hoy' : left === 1 ? 'Mañana' : `En ${left} días`}
                                    </span>
                                    <ArrowUpRight size={17} className="text-slate-400 shrink-0" />
                                </Link>
                            );
                        }) : (
                            <div className="py-14 text-center flex flex-col items-center gap-2 text-slate-500">
                                <CheckCircle2 size={28} className="text-emerald-500" />
                                <p className="text-sm">Ningún plan vence esta semana.</p>
                            </div>
                        )}
                    </div>

                    <Link href="/superadmin/suscripciones" className="block px-5 py-3 text-center text-sm font-semibold text-[#0066FF] hover:bg-blue-50 border-t border-slate-100">
                        Ver todas las suscripciones
                    </Link>
                </div>
            </div>

            {/* Socios fundadores por tipo de negocio */}
            <SuperadminFoundersSection
                families={planFamilies as any}
                founders={listaFundadores as any}
                defaultLockedPrice={founderLockedPrice}
            />
        </div>
    );
}
