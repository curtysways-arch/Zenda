'use client';

import { 
    Calendar, 
    DollarSign, 
    Users, 
    TrendingUp, 
    Plus, 
    Clock, 
    ChevronRight,
    Scissors,
    Lock,
    Sparkles,
    ArrowUpRight,
    Shield,
    LayoutTemplate,
    Zap,
    CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatUTCDate } from '@/lib/utils';
import WaitingRoomWidget from '@/components/admin/WaitingRoomWidget';

interface MobileDashboardProps {
    stats: {
        citasHoy: number;
        ingresosMes: number;
        totalClientes: number;
        citasMes: number;
    };
    proximasCitas: any[];
    primaryColor: string;
    slug: string;
    isTrial?: boolean;
    daysLeft?: number;
}

export default function MobileDashboard({ 
    stats, 
    proximasCitas, 
    primaryColor, 
    slug,
    isTrial,
    daysLeft
}: MobileDashboardProps) {
    return (
        <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Trial Banner */}
            {isTrial && (
                <div 
                    className="p-5 rounded-[2rem] border flex items-center justify-between gap-4 transition-all bg-white"
                    style={{ borderColor: `${primaryColor}22` }}
                >
                    <div className="flex items-center gap-3">
                        <div className="size-9 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center shadow-sm">
                            <Zap size={18} className="text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white leading-none mb-1">Período de Prueba</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Te quedan {daysLeft} días</p>
                        </div>
                    </div>
                    <Link 
                        href="/admin/planes"
                        className="text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl text-white transition-all shrink-0 bg-slate-900 hover:bg-slate-800"
                    >
                        Activar
                    </Link>
                </div>
            )}

            {/* Cabecera Mobile */}
            <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] italic" style={{ color: primaryColor }}>Centro Pro Dashboard</p>
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none transition-all">Buen día,</h1>
                <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase italic">Tu negocio en tiempo real.</p>
            </div>

            {/* Quick Stats Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-5 px-5">
                <QuickStat 
                    label="Citas Hoy" 
                    value={stats.citasHoy} 
                    icon={<Calendar size={18} />} 
                    color={primaryColor} 
                />
                <Link href="/admin/recaudado">
                    <QuickStat 
                        label="Recaudado" 
                        value={`$${stats.ingresosMes}`} 
                        icon={<DollarSign size={18} />} 
                        color="#4f46e5" 
                    />
                </Link>
                <QuickStat 
                    label="Clientes" 
                    value={stats.totalClientes} 
                    icon={<Users size={18} />} 
                    color="#9333ea" 
                />
                <QuickStat 
                    label="Citas Mes" 
                    value={stats.citasMes} 
                    icon={<TrendingUp size={18} />} 
                    color="#ea580c" 
                />
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <Link 
                    href="/admin/citas/nueva"
                    className="flex flex-col gap-4 p-6 bg-slate-900 text-white rounded-[2.5rem] shadow-xl active:scale-95 transition-all relative overflow-hidden group"
                >
                    <div className="absolute -right-4 -top-4 size-20 rounded-full bg-white/10 blur-xl group-hover:scale-150 transition-transform" />
                    <div className="size-10 rounded-2xl flex items-center justify-center bg-white/10 text-white">
                        <Plus size={24} strokeWidth={3} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Operativo</p>
                        <p className="text-sm font-black uppercase italic leading-none">Nueva Cita</p>
                    </div>
                </Link>

                <Link 
                    href="/admin/servicios"
                    className="flex flex-col gap-4 p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm active:scale-95 transition-all group"
                >
                    <div className="size-10 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                        <Scissors size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Catálogo</p>
                        <p className="text-sm font-black uppercase italic leading-none text-slate-900">Servicios</p>
                    </div>
                </Link>

                <Link 
                    href="/admin/staff"
                    className="flex flex-col gap-4 p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm active:scale-95 transition-all group"
                >
                    <div className="size-10 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        <Users size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Equipo</p>
                        <p className="text-sm font-black uppercase italic leading-none text-slate-900">Staff</p>
                    </div>
                </Link>

                <Link 
                    href="/admin/promociones"
                    className="flex flex-col gap-4 p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm active:scale-95 transition-all group"
                >
                    <div className="size-10 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-500 transition-colors">
                        <Sparkles size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ventas</p>
                        <p className="text-sm font-black uppercase italic leading-none text-slate-900">Promos</p>
                    </div>
                </Link>

                <Link 
                    href="/admin/cursos"
                    className="flex flex-col gap-4 p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm active:scale-95 transition-all group"
                >
                    <div className="size-10 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                        <TrendingUp size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Formación</p>
                        <p className="text-sm font-black uppercase italic leading-none text-slate-900">Cursos</p>
                    </div>
                </Link>

                <Link 
                    href="/admin/bloqueos"
                    className="flex flex-col gap-4 p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm active:scale-95 transition-all group"
                >
                    <div className="size-10 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors">
                        <Lock size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Horarios</p>
                        <p className="text-sm font-black uppercase italic leading-none text-slate-900">Bloqueos</p>
                    </div>
                </Link>

                <Link 
                    href="/admin/paginas"
                    className="flex flex-col gap-4 p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm active:scale-95 transition-all group"
                >
                    <div className="size-10 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-500 transition-colors">
                        <LayoutTemplate size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Contenido</p>
                        <p className="text-sm font-black uppercase italic leading-none text-slate-900">Páginas</p>
                    </div>
                </Link>

                <Link 
                    href="/admin/plan"
                    className="flex flex-col gap-4 p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm active:scale-95 transition-all group"
                >
                    <div className="size-10 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                        <CreditCard size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Suscripción</p>
                        <p className="text-sm font-black uppercase italic leading-none text-slate-900">Mi Plan</p>
                    </div>
                </Link>
            </div>

            {/* 🚶 Sala de Espera — Check-In Inteligente */}
            <WaitingRoomWidget primaryColor={primaryColor} />

            {/* Próximas Citas - Card List */}
            <section className="space-y-5">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="h-4 w-1 rounded-full" style={{ backgroundColor: primaryColor }} />
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 italic">Próximas Citas</h2>
                    </div>
                    <Link href="/admin/citas" className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        Ver todo <ChevronRight size={12} />
                    </Link>
                </div>

                <div className="space-y-3">
                    {proximasCitas.length > 0 ? proximasCitas.map(cita => {
                        const isCheckedIn = cita.estado === 'client_checked_in';
                        const isInProgress = cita.estado === 'in_progress';
                        return (
                            <Link
                                key={cita.id}
                                href={`/admin/citas/${cita.id}`}
                                className={cn(
                                    "flex items-center justify-between p-5 bg-white border rounded-[2rem] shadow-sm active:scale-[0.98] transition-all group",
                                    isCheckedIn ? 'border-amber-200 bg-amber-50' : isInProgress ? 'border-purple-200 bg-purple-50' : 'border-slate-100'
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={cn(
                                            "size-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all",
                                            isCheckedIn ? 'bg-amber-100 text-amber-700' : isInProgress ? 'bg-purple-100 text-purple-700' : 'bg-slate-50 border border-slate-100 text-slate-400'
                                        )}
                                    >
                                        {isCheckedIn ? '🚶' : isInProgress ? '✨' : cita.cliente.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 uppercase italic leading-none mb-1">{cita.cliente.nombre}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-bold uppercase" style={{ color: primaryColor }}>{cita.service.nombre}</p>
                                            <div className="size-1 rounded-full bg-slate-200" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase italic">
                                                {formatUTCDate(cita.fecha)}
                                            </span>
                                            <div className="size-1 rounded-full bg-slate-200" />
                                            <span className="text-[10px] font-black text-slate-300 uppercase italic">{cita.horaInicio} hs</span>
                                        </div>
                                        {isCheckedIn && (
                                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-wide">● Ha llegado — esperando</span>
                                        )}
                                    </div>
                                </div>
                                <div className="size-10 rounded-xl flex items-center justify-center text-slate-200 group-hover:text-slate-900 transition-colors">
                                    <ArrowUpRight size={20} />
                                </div>
                            </Link>
                        );
                    }) : (
                        <div className="p-10 bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin citas pendientes</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Tip of the Day Card */}
            <Link 
                href="/admin/resultados"
                className="block p-8 rounded-[3rem] bg-indigo-600 text-white shadow-xl relative overflow-hidden group active:scale-[0.98] transition-all"
            >
                <div className="absolute -right-6 -bottom-6 size-32 rounded-full bg-white/10 blur-2xl group-hover:scale-150 transition-transform" />
                <Sparkles size={24} className="mb-4 text-indigo-200" />
                <h3 className="text-xl font-black uppercase italic leading-tight tracking-tighter mb-2">Haz crecer tu negocio</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100 leading-relaxed">Publica tus resultados en el portafolio para atraer más clientes hoy mismo.</p>
            </Link>
        </div>
    );
}

function QuickStat({ label, value, icon, color }: any) {
    return (
        <div className="min-w-[130px] sm:min-w-[160px] p-5 sm:p-6 bg-white border border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm flex flex-col gap-4 group active:scale-95 transition-all">
            <div 
                className="size-8 sm:size-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${color}15`, color: color }}
            >
                {icon}
            </div>
            <div>
                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter italic leading-none">{value}</p>
            </div>
        </div>
    );
}
