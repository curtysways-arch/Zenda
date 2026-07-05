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
    CreditCard,
    Gift,
    ArrowRight
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

            {/* Cabecera / Banner de Bienvenida Premium */}
            <div className="bg-white border border-slate-100/80 rounded-[2.5rem] p-6 shadow-sm flex items-center justify-between relative overflow-hidden">
                <div className="space-y-1 z-10">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-pink-500 italic block">
                        Centro Pro Dashboard
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                        ¡BUEN DÍA, ADMIN!
                    </h1>
                    <p className="text-slate-400 text-[11px] font-semibold block">
                        Tu negocio en tiempo real.
                    </p>
                </div>
                <div className="w-24 sm:w-32 shrink-0 relative flex items-center justify-end z-0">
                    <img 
                        src="/images/spa/dashboard_spa_banner.png" 
                        className="w-full h-auto max-h-20 object-contain translate-x-2"
                        alt="Spa Decor"
                    />
                </div>
            </div>

            {/* Quick Stats Grid de 3 Columnas */}
            <div className="grid grid-cols-3 gap-2.5">
                <QuickStat 
                    label="Citas Hoy" 
                    value={stats.citasHoy} 
                    subtext={stats.citasHoy === 0 ? "Sin citas programadas" : `${stats.citasHoy} citas programadas`}
                    icon={<Calendar size={16} />} 
                    color="#ec4899" 
                    bg="#fdf2f8"
                />
                <Link href="/admin/recaudado">
                    <QuickStat 
                        label="Recaudado" 
                        value={`$${stats.ingresosMes}`} 
                        subtext="Hoy"
                        icon={<DollarSign size={16} />} 
                        color="#6366f1" 
                        bg="#f5f3ff"
                    />
                </Link>
                <QuickStat 
                    label="Clientes" 
                    value={stats.totalClientes} 
                    subtext="Total registrados"
                    icon={<Users size={16} />} 
                    color="#8b5cf6" 
                    bg="#faf5ff"
                />
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Operativo - Nueva Cita */}
                <Link 
                    href="/admin/citas/nueva"
                    className="flex flex-col justify-between p-5 bg-[#131f37] text-white rounded-[2rem] shadow-md hover:shadow-lg active:scale-95 transition-all min-h-[145px] relative overflow-hidden group text-left"
                >
                    <div className="absolute -right-4 -top-4 size-20 rounded-full bg-white/5 blur-xl group-hover:scale-150 transition-transform" />
                    
                    <div className="size-10 rounded-full flex items-center justify-center bg-white/10 text-white border border-white/10">
                        <Plus size={20} strokeWidth={2.5} />
                    </div>
                    
                    <div className="mt-4 flex items-end justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Operativo</p>
                            <p className="text-sm font-black tracking-tight leading-none text-white">Nueva cita</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-1 leading-tight">Agenda una cita rápidamente</p>
                        </div>
                        <div className="size-7 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 ml-2">
                            <ArrowRight size={14} />
                        </div>
                    </div>
                </Link>

                {/* Catálogo - Servicios */}
                <Link 
                    href="/admin/servicios"
                    className="flex flex-col justify-between p-5 bg-white border border-slate-100/80 rounded-[2rem] shadow-sm hover:shadow-md active:scale-95 transition-all min-h-[145px] group text-left"
                >
                    <div className="size-10 rounded-full flex items-center justify-center bg-purple-50 text-purple-500 border border-purple-100/30">
                        <Scissors size={18} />
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Catálogo</p>
                            <p className="text-sm font-black tracking-tight leading-none text-slate-900">Servicios</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-1 leading-tight">Gestiona tus servicios</p>
                        </div>
                        <div className="size-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-800 shrink-0 ml-2 transition-colors">
                            <ArrowRight size={14} />
                        </div>
                    </div>
                </Link>

                {/* Equipo - Staff */}
                <Link 
                    href="/admin/staff"
                    className="flex flex-col justify-between p-5 bg-white border border-slate-100/80 rounded-[2rem] shadow-sm hover:shadow-md active:scale-95 transition-all min-h-[145px] group text-left"
                >
                    <div className="size-10 rounded-full flex items-center justify-center bg-purple-50 text-purple-500 border border-purple-100/30">
                        <Users size={18} />
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Equipo</p>
                            <p className="text-sm font-black tracking-tight leading-none text-slate-900">Staff</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-1 leading-tight">Administra tu equipo</p>
                        </div>
                        <div className="size-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-800 shrink-0 ml-2 transition-colors">
                            <ArrowRight size={14} />
                        </div>
                    </div>
                </Link>

                {/* Ventas - Promos */}
                <Link 
                    href="/admin/promociones"
                    className="flex flex-col justify-between p-5 bg-white border border-slate-100/80 rounded-[2rem] shadow-sm hover:shadow-md active:scale-95 transition-all min-h-[145px] group text-left"
                >
                    <div className="size-10 rounded-full flex items-center justify-center bg-purple-50 text-purple-500 border border-purple-100/30">
                        <Sparkles size={18} />
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Ventas</p>
                            <p className="text-sm font-black tracking-tight leading-none text-slate-900">Promos</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-1 leading-tight">Crea y gestiona promociones</p>
                        </div>
                        <div className="size-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-800 shrink-0 ml-2 transition-colors">
                            <ArrowRight size={14} />
                        </div>
                    </div>
                </Link>

                {/* Formación - Cursos */}
                <Link 
                    href="/admin/cursos"
                    className="flex flex-col justify-between p-5 bg-white border border-slate-100/80 rounded-[2rem] shadow-sm hover:shadow-md active:scale-95 transition-all min-h-[145px] group text-left"
                >
                    <div className="size-10 rounded-full flex items-center justify-center bg-purple-50 text-purple-500 border border-purple-100/30">
                        <TrendingUp size={18} />
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Formación</p>
                            <p className="text-sm font-black tracking-tight leading-none text-slate-900">Cursos</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-1 leading-tight">Gestiona tus cursos</p>
                        </div>
                        <div className="size-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-800 shrink-0 ml-2 transition-colors">
                            <ArrowRight size={14} />
                        </div>
                    </div>
                </Link>

                {/* Horarios - Bloqueos */}
                <Link 
                    href="/admin/bloqueos"
                    className="flex flex-col justify-between p-5 bg-white border border-slate-100/80 rounded-[2rem] shadow-sm hover:shadow-md active:scale-95 transition-all min-h-[145px] group text-left"
                >
                    <div className="size-10 rounded-full flex items-center justify-center bg-purple-50 text-purple-500 border border-purple-100/30">
                        <Lock size={18} />
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Horarios</p>
                            <p className="text-sm font-black tracking-tight leading-none text-slate-900">Bloqueos</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-1 leading-tight">Bloquea horarios</p>
                        </div>
                        <div className="size-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-800 shrink-0 ml-2 transition-colors">
                            <ArrowRight size={14} />
                        </div>
                    </div>
                </Link>

                {/* Contenido - Páginas */}
                <Link 
                    href="/admin/paginas"
                    className="flex flex-col justify-between p-5 bg-white border border-slate-100/80 rounded-[2rem] shadow-sm hover:shadow-md active:scale-95 transition-all min-h-[145px] group text-left"
                >
                    <div className="size-10 rounded-full flex items-center justify-center bg-purple-50 text-purple-500 border border-purple-100/30">
                        <LayoutTemplate size={18} />
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Contenido</p>
                            <p className="text-sm font-black tracking-tight leading-none text-slate-900">Contenido</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-1 leading-tight">Gestiona el contenido</p>
                        </div>
                        <div className="size-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-800 shrink-0 ml-2 transition-colors">
                            <ArrowRight size={14} />
                        </div>
                    </div>
                </Link>

                {/* Suscripción - Mi Plan */}
                <Link 
                    href="/admin/plan"
                    className="flex flex-col justify-between p-5 bg-white border border-slate-100/80 rounded-[2rem] shadow-sm hover:shadow-md active:scale-95 transition-all min-h-[145px] group text-left"
                >
                    <div className="size-10 rounded-full flex items-center justify-center bg-purple-50 text-purple-500 border border-purple-100/30">
                        <CreditCard size={18} />
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Suscripción</p>
                            <p className="text-sm font-black tracking-tight leading-none text-slate-900">Suscripción</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-1 leading-tight">Planes y suscripción</p>
                        </div>
                        <div className="size-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-800 shrink-0 ml-2 transition-colors">
                            <ArrowRight size={14} />
                        </div>
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

function QuickStat({ label, value, subtext, icon, color, bg }: any) {
    return (
        <div className="flex-1 p-4 bg-white border border-slate-100/80 rounded-[2rem] shadow-sm flex flex-col gap-3 group active:scale-[0.97] transition-all text-left">
            <div 
                className="size-9 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ backgroundColor: bg, color: color }}
            >
                {icon}
            </div>
            <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none">{label}</p>
                <p className="text-xl font-black text-slate-900 tracking-tighter italic leading-none mt-1">{value}</p>
                <p className="text-[8px] text-gray-400 font-semibold leading-normal mt-1 leading-tight truncate">{subtext}</p>
            </div>
        </div>
    );
}
