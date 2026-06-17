import prisma from "@/lib/prisma";
import {
    Building2,
    CreditCard,
    Users,
    TrendingUp,
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
    ArrowUpRight,
    Trophy,
    Zap
} from "lucide-react";
import Link from 'next/link';

export default async function SuperAdminDashboard() {
    // Obtener métricas reales de la DB
    const totalNegocios = await prisma.negocio.count();
    const negociosActivos = await prisma.negocio.count({ where: { estado: 'ACTIVO' } });
    const negociosSuspendidos = await prisma.negocio.count({ where: { estado: 'SUSPENDIDO' } });

    // Negocios en prueba: se detectan por suscripcion.estado = 'trial'
    const negociosPrueba = await (prisma.suscripcion as any).count({
        where: { estado: 'trial' }
    });

    // Suscripciones activas (puede ser 'activa', 'active', o 'ACTIVA' según cómo se guarden)
    const suscripcionesActivas = await (prisma.suscripcion as any).findMany({
        where: { estado: { in: ['activa', 'active', 'ACTIVA'] } },
        include: { Plan: true }
    });

    const ingresosMensuales = suscripcionesActivas.reduce((acc: number, sub: any) => {
        const precio = sub.lockedPrice !== null && sub.lockedPrice !== undefined ? sub.lockedPrice : (sub.Plan?.price || 0);
        return acc + precio;
    }, 0);

    // Fundadores activos
    const fundadoresActivos = await (prisma.suscripcion as any).count({
        where: {
            isFounder: true,
            estado: { in: ['activa', 'active', 'ACTIVA'] }
        }
    });

    const cuposRestantes = Math.max(0, 25 - fundadoresActivos);

    // Lista de fundadores
    const listaFundadores = await (prisma.suscripcion as any).findMany({
        where: { isFounder: true },
        include: { Negocio: true, Plan: true },
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
            estado: { in: ['activa', 'active', 'ACTIVA', 'trial'] }
        },
        include: { Negocio: true }
    });

    const stats = [
        { name: 'Total Negocios', value: totalNegocios, icon: Building2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        { name: 'Activos', value: negociosActivos, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        { name: 'Suspendidos', value: negociosSuspendidos, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
        { name: 'Prueba', value: negociosPrueba, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    ];

    return (
        <div className="space-y-8 lg:space-y-12 pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-1 w-6 bg-emerald-500 rounded-full" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] italic leading-none">Global Insights</span>
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Dashboard</h2>
                    <p className="text-slate-400 font-medium text-sm lg:text-base">Métricas principales de toda la plataforma SaaS.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="hidden lg:flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Hoy es</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid - ULTRA PREMIUM */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
                {stats.map((stat) => (
                    <div key={stat.name} className={`bg-white dark:bg-slate-900 p-5 lg:p-8 rounded-[2.5rem] border ${stat.border} shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-500 group active:scale-95`}>
                        <div className="flex items-center justify-between mb-6">
                            <div className={`${stat.bg} ${stat.color} p-3.5 lg:p-4 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                                <stat.icon size={22} strokeWidth={2.5} />
                            </div>
                            <div className="hidden lg:block text-emerald-500 text-sm font-black italic flex items-center gap-1">
                                <TrendingUp size={14} strokeWidth={3} /> +12%
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stat.value}</span>
                            </div>
                            <span className="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.name}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                {/* Ingresos Card - CINEMATIC EFFECT */}
                <div className="lg:col-span-1 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-[3rem] p-8 lg:p-12 text-white shadow-2xl shadow-emerald-500/30 relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                        <div>
                            <div className="bg-white/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border border-white/10 shadow-inner group-hover:rotate-12 transition-transform duration-700">
                                <CreditCard size={28} />
                            </div>
                            <span className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.3em] italic block mb-2 opacity-60">Ingresos Mensuales</span>
                            <div className="text-5xl lg:text-7xl font-black tracking-tighter italic leading-none">${ingresosMensuales.toLocaleString()}</div>
                        </div>
                        
                        <div className="bg-black/10 backdrop-blur-xl p-5 rounded-[2rem] border border-white/5 flex items-center gap-4 group-hover:bg-black/20 transition-all">
                            <div className="size-10 rounded-xl bg-emerald-400/20 flex items-center justify-center border border-emerald-400/20">
                                <Trophy size={18} className="text-emerald-200" />
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-widest leading-tight text-emerald-50">
                                {suscripcionesActivas.length} SUSCRIPCIONES ACTIVAS EN TOTAL
                            </p>
                        </div>
                    </div>
                    {/* Decorative Blur */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/20 rounded-full blur-[100px] pointer-events-none group-hover:translate-x-10 transition-transform duration-1000" />
                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-black/20 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
                </div>

                {/* Proximos Vencimientos - LIST STYLE */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
                    <div className="px-8 lg:px-12 py-8 border-b border-slate-50 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                <Calendar size={22} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white uppercase italic tracking-tight text-lg">Próximos Vencimientos</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Siguientes 7 días laborales</p>
                            </div>
                        </div>
                        <div className="size-10 rounded-full flex items-center justify-center bg-slate-50 dark:bg-white/5 text-[10px] font-black text-slate-500">
                            {proximosVencimientos.length}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
                        {proximosVencimientos.length > 0 ? proximosVencimientos.map((sub) => (
                            <div key={sub.id} className="p-4 rounded-[2.5rem] bg-slate-50/50 dark:bg-white/[0.02] border border-transparent hover:border-emerald-500/20 hover:bg-white dark:hover:bg-slate-800 transition-all duration-500 flex items-center justify-between group/item active:scale-[0.98]">
                                <div className="flex items-center gap-5">
                                    <div className="size-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-black uppercase text-xl italic shadow-lg shadow-emerald-500/20 group-hover/item:rotate-6 transition-transform">
                                        {sub.Negocio.nombre.charAt(0)}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{sub.Negocio.nombre}</div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Vence el {sub.fechaFin.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="size-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all group-hover/item:scale-105 active:scale-90">
                                    <ArrowUpRight size={20} strokeWidth={2.5} />
                                </button>
                            </div>
                        )) : (
                            <div className="py-20 text-center flex flex-col items-center gap-5 opacity-40">
                                <CheckCircle2 size={40} strokeWidth={1} className="text-slate-400" />
                                <p className="text-sm font-black uppercase tracking-[0.2em] italic">Todo al día por aquí</p>
                            </div>
                        )}
                    </div>
                    
                    <Link href="/superadmin/suscripciones" className="block p-6 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors bg-slate-50/30 dark:bg-white/[0.01]">
                        Ver Historial Completo
                    </Link>
                </div>
            </div>

            {/* SECCIÓN SOCIOS FUNDADORES */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden p-8 lg:p-12 space-y-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-50 dark:border-white/5">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-1 w-6 bg-indigo-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] italic leading-none">Club Exclusivo</span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight leading-none">Socios Fundadores</h3>
                        <p className="text-slate-400 font-medium text-sm">Primeros 25 negocios con tarifa especial de por vida ($15/mes).</p>
                    </div>
                    
                    {/* Visual de Cupos */}
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-500/10 rounded-[2rem] p-6 flex items-center gap-6 lg:min-w-[320px]">
                        <div className="size-16 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                            <Trophy size={28} className="animate-bounce" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none">Cupos Llenos</span>
                                <span className="text-lg font-black text-slate-900 dark:text-white italic leading-none">{fundadoresActivos} / 25</span>
                            </div>
                            <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${(fundadoresActivos / 25) * 100}%` }}
                                />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                                {cuposRestantes > 0 ? `Quedan ${cuposRestantes} cupos disponibles` : '¡Todos los cupos agotados!'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Lista / Tabla de Fundadores */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 dark:border-white/5 pb-4">
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posición</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Negocio</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Base</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Congelado</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {listaFundadores.length > 0 ? listaFundadores.map((sub: any) => (
                                <tr key={sub.id} className="hover:bg-slate-50/20 dark:hover:bg-white/[0.01] transition-all group">
                                    <td className="py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="size-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-sm italic">
                                                #{sub.founderPosition}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black uppercase text-base italic shadow-md shadow-indigo-500/10 group-hover:rotate-3 transition-transform">
                                                {sub.Negocio?.nombre?.charAt(0)}
                                            </div>
                                            <div>
                                                <Link
                                                    href={`/superadmin/negocios/${sub.negocioId}?tab=subscription`}
                                                    className="font-black text-slate-900 dark:text-white uppercase italic tracking-tight hover:text-indigo-500 transition-colors"
                                                >
                                                    {sub.Negocio?.nombre}
                                                </Link>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Desde {new Date(sub.fechaInicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black tracking-widest uppercase inline-flex items-center gap-1">
                                            <Zap size={10} className="text-amber-400 fill-amber-400" />
                                            {sub.Plan?.name || 'Founder'}
                                        </span>
                                    </td>
                                    <td className="py-4">
                                        <span className="text-sm font-black text-slate-900 dark:text-white italic">
                                            ${sub.lockedPrice || 15.0} <span className="text-[9px] font-bold text-slate-400 uppercase">/mes</span>
                                        </span>
                                    </td>
                                    <td className="py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest shadow-sm ${
                                            sub.estado.toLowerCase() === 'active' || sub.estado.toLowerCase() === 'activa'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-500/10'
                                                : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-500/10'
                                        }`}>
                                            {sub.estado}
                                        </span>
                                    </td>
                                    <td className="py-4 text-right">
                                        <Link 
                                            href={`/superadmin/negocios/${sub.negocioId}`} 
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-indigo-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                                        >
                                            Ver Negocio
                                            <ArrowUpRight size={12} strokeWidth={2.5} />
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-600 font-bold uppercase text-xs italic tracking-widest">
                                        No hay negocios fundadores registrados aún
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
