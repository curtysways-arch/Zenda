import prisma from '@/lib/prisma';
import { Plus, Users, Target, Activity, Calendar, DollarSign, TrendingUp, Clock, Rocket, AlertTriangle, ChevronRight, Scissors } from 'lucide-react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { startOfMonth, startOfToday, endOfToday, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { clsx } from 'clsx';
import Link from 'next/link';
import { headers } from 'next/headers';
import { ShareWidget } from './ShareWidget';
import { WeeklyCalendar } from '@/components/admin/WeeklyCalendar';
import MobileDashboard from '@/components/admin/mobile/MobileDashboard';
import WaitingRoomWidget from '@/components/admin/WaitingRoomWidget';
import UpgradeBanner from '@/components/ui/UpgradeBanner';
import PlanStatusCard from '@/components/ui/PlanStatusCard';
import { featureService } from '@/lib/services/featureService';
import { calculateOnboardingProgress } from '@/lib/onboarding';
import OnboardingChecklist from '@/components/admin/OnboardingChecklist';
import { formatUTCDate } from '@/lib/utils';
import RealtimeDashboardReloader from '@/components/admin/RealtimeDashboardReloader';

export default async function AdminDashboard() {
    const session = await getServerSession(authOptions);

    if (!session) return null;
    const negocioId = (session.user as any).negocioId;
    const role = (session.user as any).role;
    const staffId = (session.user as any).staffId;

    const isStaff = role === 'STAFF' || role === 'PROFESIONAL';

    const now = new Date();
    // Ajuste para que coincida con el almacenamiento UTC de la DB
    const startToday = new Date(new Date().setUTCHours(0, 0, 0, 0));
    const endToday = new Date(new Date().setUTCHours(23, 59, 59, 999));
    const startMonth = startOfMonth(now);

    const inicioSemana = startOfWeek(now, { weekStartsOn: 1 });
    const finSemana = endOfWeek(now, { weekStartsOn: 1 });

    const commonFilter = {
        negocioId,
        ...(isStaff && staffId ? { staffId } : {})
    };

    const [citasHoy, citasMes, ingresosMes, totalClientes, negocioData, servicesResult, planFeatures] = await Promise.all([
        prisma.appointment.count({
            where: {
                ...commonFilter,
                fecha: { gte: startToday, lte: endToday },
                estado: { not: 'cancelled' }
            }
        }),
        prisma.appointment.count({
            where: {
                ...commonFilter,
                fecha: { gte: startMonth },
                estado: { in: ['confirmed', 'completed', 'finalizada', 'finalizado'] }
            }
        }),
        prisma.appointment.aggregate({
            where: {
                ...commonFilter,
                estado: { in: ['confirmed', 'completed', 'finalizada', 'finalizado'] },
                fecha: { gte: startMonth }
            },
            _sum: { total: true }
        }),
        prisma.cliente.count({ where: { negocioId } }),
        prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                nombre: true,
                logoUrl: true,
                whatsapp: true,
                estado: true,
                horarioApertura: true,
                horarioCierre: true,
                configuracion: true,
                slug: true,
                colorPrimario: true,
                Suscripcion: {
                    select: {
                        estado: true,
                        fechaFin: true,
                        Plan: true
                    }
                }
            }
        }),
        prisma.service.findMany({
            where: { negocioId },
            select: { id: true, nombre: true }
        }),
        featureService.getAllFeatures(negocioId)
    ]);

    const servicesData = servicesResult.map(c => ({ id: c.id, nombre: c.nombre }));

    const citasSemana = await prisma.appointment.findMany({
        where: {
            ...commonFilter,
            fecha: {
                gte: inicioSemana,
                lt: finSemana
            },
            estado: { not: 'cancelled' }
        },
        include: {
            cliente: { select: { nombre: true } },
            service: { select: { nombre: true } }
        }
    });

    const citasFormateadas = citasSemana.map(r => ({
        id: r.id,
        fecha: r.fecha,
        horaInicio: r.horaInicio,
        duracion: r.duracion,
        clienteId: r.clienteId,
        clienteNombre: r.cliente.nombre,
        canchaId: r.serviceId,
        canchaNombre: r.service.nombre,
        estado: r.estado
    }));

    const rawProximasCitas = await prisma.appointment.findMany({
        where: {
            ...commonFilter,
            fecha: { gte: startToday },
            estado: { in: ['pending', 'confirmed', 'client_checked_in', 'in_progress'] }
        },
        include: {
            cliente: true,
            service: true
        },
        take: 30,
        orderBy: [
            { fecha: 'asc' },
            { horaInicio: 'asc' }
        ]
    });

    const timeZone = (() => {
        let tz = 'America/Bogota';
        if (negocioData?.configuracion) {
            try {
                const config = typeof negocioData.configuracion === 'string'
                    ? JSON.parse(negocioData.configuracion)
                    : negocioData.configuracion;
                if (config.timeZone) {
                    tz = config.timeZone;
                }
            } catch (_) {}
        }
        return tz;
    })();

    const nowTime = new Date(new Date().toLocaleString("en-US", { timeZone }));
    const validProximas = rawProximasCitas.filter((app: any) => {
        const dateStr = app.fecha instanceof Date ? app.fecha.toISOString().split('T')[0] : String(app.fecha).split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const [h, m] = app.horaFin ? app.horaFin.split(':').map(Number) : (app.horaInicio || '23:59').split(':').map(Number);
        const endTime = new Date(year, month - 1, day, h, m, 0);
        // Tolerancia de 30 minutos después de la hora de fin
        return endTime.getTime() > nowTime.getTime() - (30 * 60 * 1000);
    });

    const proximasCitas = validProximas.slice(0, 5);

    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const shareUrl = `${protocol}://${host}/${negocioData?.slug}`;

    const sub = negocioData?.Suscripcion;
    const isTrial = sub?.estado === 'trial';
    const isDowngraded = sub?.estado === 'downgraded';
    const planName = sub?.Plan?.name || 'BEGIN';
    const planEstado = sub?.estado || 'unknown';
    const daysLeft = sub?.fechaFin ? Math.ceil((new Date(sub.fechaFin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const primaryColor = negocioData?.colorPrimario || '#0ea5e9';
    const featuresData = planFeatures || {};

    const onboarding = calculateOnboardingProgress(negocioData || {}, servicesResult.length);

    if (!negocioData) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                <AlertTriangle className="text-amber-500 mb-6" size={48} />
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Información no disponible</h2>
                <p className="text-slate-500 font-medium mt-2">No se pudo cargar la configuración de tu negocio. Por favor, contacta al soporte.</p>
            </div>
        );
    }

    return (
        <>
            {/* VISTA MÓVIL */}
            <div className="md:hidden">
                <MobileDashboard 
                    stats={{ 
                        citasHoy, 
                        citasMes, 
                        ingresosMes: ingresosMes?._sum?.total || 0, 
                        totalClientes 
                    }}
                    proximasCitas={proximasCitas}
                    isTrial={isTrial}
                    daysLeft={daysLeft}
                    primaryColor={primaryColor}
                    slug={negocioData?.slug || ''}
                />
            </div>

            {/* VISTA ESCRITORIO */}
            <div className="hidden md:block space-y-12 animate-in fade-in duration-500">
                {/* Banner Premium Light */}
                {isTrial && !isStaff && (
                    <UpgradeBanner type="trial_expiring" daysLeft={daysLeft > 0 ? daysLeft : 0} />
                )}

                {/* Banner de Downgrade */}
                {isDowngraded && !isStaff && (
                    <UpgradeBanner type="downgraded" />
                )}

                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 px-4">
                    <div className="space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.4em] block italic" style={{ color: 'var(--primary-color)' }}>{isStaff ? 'MODO PROFESIONAL' : 'VISTA ESTRATÉGICA'}</span>
                        <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">{isStaff ? 'Mi Agenda' : 'Dashboard'}</h1>
                        <p className="text-slate-400 text-base font-bold uppercase italic flex items-center gap-3">
                            <Activity size={20} style={{ color: 'var(--primary-color)' }} />
                            {isStaff ? 'Gestiona tus citas y disponibilidad personal.' : 'Tráfico de red optimizado. Datos en tiempo real.'}
                        </p>
                    </div>
                    {!isStaff && (
                        <div className="flex bg-white p-2 rounded-3xl border border-slate-200 shadow-md">
                            <div className="py-3 px-6 flex items-center gap-4">
                                <div className="relative">
                                    <div className="size-3 rounded-full animate-ping absolute inset-0" style={{ backgroundColor: 'var(--primary-color)' }} />
                                    <div className="size-3 rounded-full relative" style={{ backgroundColor: 'var(--primary-color)' }} />
                                </div>
                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none italic">WhatsApp Activo</span>
                            </div>
                        </div>
                    )}
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    <StatCard 
                        title={isStaff ? "MIS CITAS HOY" : "HOY"} 
                        value={citasHoy} 
                        icon={<Calendar size={28} />} 
                        color="blue"
                        change="+12%" 
                        detail={isStaff ? "Tu carga de trabajo" : "Citas Agendadas"} 
                        href="/admin/citas"
                    />
                    <StatCard 
                        title={isStaff ? "PRODUCCIÓN MES" : "RECAUDADO"} 
                        value={`$${ingresosMes._sum.total?.toString() || '0'}`} 
                        icon={<DollarSign size={28} />} 
                        color="primary"
                        change="+8.5%" 
                        detail={isStaff ? "Tus servicios facturados" : "Cerrado este mes"} 
                        href="/admin/recaudado"
                    />
                    <StatCard 
                        title="CLIENTES" 
                        value={totalClientes} 
                        icon={<Users size={28} />} 
                        color="violet"
                        change="+20%" 
                        detail="Fichas Activas" 
                        href="/admin/clientes"
                    />
                    <StatCard 
                        title="RENDIMIENTO" 
                        value={`${citasMes}`} 
                        icon={<TrendingUp size={28} />} 
                        color="orange"
                        change="+15%" 
                        detail="Confirmadas" 
                        href="/admin/reportes"
                    />
                </div>

                <div className="px-2">
                    <WeeklyCalendar 
                        reservas={citasFormateadas} 
                        canchas={servicesData} 
                    />
                </div>

                <div className="px-2">
                    <WaitingRoomWidget primaryColor={primaryColor} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-10">
                        <div className="flex justify-between items-center px-6">
                            <div className="flex items-center gap-4">
                                <div className="h-8 w-1.5 rounded-full" style={{ backgroundColor: 'var(--primary-color)' }} />
                                <h3 className="font-black text-slate-800 uppercase tracking-[0.2em] text-[13px] italic">CITAS ENTRANTES</h3>
                            </div>
                            <Link href="/admin/citas" className="px-6 py-3 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Ver Historial</Link>
                        </div>

                        <div className="space-y-6">
                            {proximasCitas.length > 0 ? proximasCitas.map(r => (
                                <div key={r.id} className="bg-white border border-slate-200 p-8 rounded-[3rem] flex flex-col sm:flex-row items-center justify-between gap-8 hover:border-emerald-500/30 group transition-all duration-500 shadow-sm hover:shadow-xl">
                                    <div className="flex items-center gap-6">
                                        <div className="size-16 rounded-[1.5rem] bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center font-black text-2xl group-hover:text-white transition-all transform group-hover:rotate-6"
                                             style={ { '--hover-bg': 'var(--primary-color)' } as any }>
                                            {r.cliente.nombre.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="font-black text-xl text-slate-800 uppercase leading-none italic">{r.cliente.nombre}</p>
                                            <div className="flex items-center gap-4">
                                                <p className="text-[11px] font-black uppercase tracking-widest italic" style={{ color: 'var(--primary-color)' }}>{r.service.nombre}</p>
                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                                                    {formatUTCDate(r.fecha)}
                                                </span>
                                                <span className="text-[11px] font-black text-slate-300 uppercase tracking-tighter flex items-center gap-2">
                                                    <Clock size={14} className="text-slate-200" />
                                                    {r.horaInicio} HS
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">ID CITA</p>
                                            <p className="text-sm font-black text-slate-400 tracking-tighter uppercase italic">#{r.id.slice(-6)}</p>
                                        </div>
                                        <Link 
                                            href={`/admin/citas/${r.id}`}
                                            className="px-8 py-5 bg-slate-900 text-white hover:bg-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center gap-3"
                                        >
                                            GESTIONAR
                                            <ChevronRight size={16} />
                                        </Link>
                                    </div>
                                </div>
                            )) : (
                                <div className="bg-white border-2 border-dashed border-slate-200 p-32 rounded-[4rem] text-center">
                                    <div className="size-24 rounded-[2.5rem] bg-slate-50 mx-auto flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
                                        <Activity size={48} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Sin Pendientes</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-4 italic">El centro está operando al 100%.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <aside className="space-y-10 lg:sticky lg:top-24 h-fit">
                        {!isStaff && onboarding.percentage < 100 && (
                            <OnboardingChecklist 
                                percentage={onboarding.percentage}
                                checks={onboarding.checks}
                                primaryColor={primaryColor}
                            />
                        )}

                        {!isStaff && (
                            <PlanStatusCard 
                                planName={planName}
                                estado={planEstado}
                                daysLeft={daysLeft}
                                features={featuresData as any}
                            />
                        )}
                        <div className="relative rounded-[3.5rem] p-10 bg-slate-900 text-white shadow-2xl overflow-hidden group">
                            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000"
                                 style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)' }} />
                            <div className="relative space-y-10">
                                <div className="space-y-2">
                                    <span className="text-[11px] font-black uppercase tracking-[0.4em] italic leading-none" style={{ color: 'color-mix(in srgb, var(--primary-color), transparent 40%)' }}>GESTOR RÁPIDO</span>
                                    <h3 className="text-4xl font-black uppercase tracking-tighter leading-none italic">ACCIONES</h3>
                                </div>
                                <div className="relative grid gap-5">
                                    <Link
                                        href={negocioData ? `/${(negocioData as any)?.slug || ''}` : "/"}
                                        target="_blank"
                                        className="group/btn w-full flex items-center justify-between p-6 text-white rounded-[2rem] transition-all font-black shadow-2xl active:scale-95 hover:brightness-110"
                                        style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 20px 25px -5px color-mix(in srgb, var(--primary-color), transparent 60%)' }}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-xs uppercase tracking-[0.1em] italic">Panel Público</span>
                                            <span className="text-[10px] font-medium" style={{ color: 'color-mix(in srgb, var(--primary-color), white 80%)' }}>Crear Reserva</span>
                                        </div>
                                        <Plus size={24} strokeWidth={3} className="group-hover/btn:rotate-90 transition-transform" />
                                    </Link>
                                    <Link
                                        href="/admin/bloqueos"
                                        className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all font-black text-white/50 active:scale-95"
                                    >
                                        <span className="text-xs uppercase tracking-widest italic">Bloquear Horario</span>
                                        <Scissors size={24} className="opacity-40" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {negocioData?.slug && <ShareWidget url={shareUrl} />}

                        <div className="p-10 bg-white border border-slate-200 rounded-[3.5rem] relative overflow-hidden group shadow-sm hover:shadow-xl transition-all">
                            <div className="absolute -right-8 -bottom-8 group-hover:scale-110 transition-transform duration-1000" style={{ color: 'color-mix(in srgb, var(--primary-color), transparent 95%)' }}>
                                <TrendingUp size={160} strokeWidth={3} />
                            </div>
                            <div className="size-12 rounded-[1.25rem] flex items-center justify-center mb-6 border"
                                 style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)', color: 'var(--primary-color)', borderColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)' }}>
                                <Activity size={24} strokeWidth={3} />
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-3 italic" style={{ color: 'var(--primary-color)' }}>Tip de Gestión</p>
                            <p className="text-lg font-black leading-tight text-slate-800 uppercase tracking-tighter italic">Optimiza tu caja registrando cada anticipo al instante.</p>
                        </div>
                    </aside>
                </div>
            </div>
            <RealtimeDashboardReloader />
        </>
    );
}

function StatCard({ title, value, icon, color, change, detail, href }: any) {
    const colors: any = {
        primary: {
            bg: "color-mix(in srgb, var(--primary-color), transparent 95%)",
            border: "color-mix(in srgb, var(--primary-color), transparent 90%)",
            text: "var(--primary-color)"
        },
        emerald: {
            bg: "bg-emerald-50",
            border: "border-emerald-100",
            text: "text-emerald-600"
        },
        blue: {
            bg: "bg-blue-50",
            border: "border-blue-100",
            text: "text-blue-600"
        },
        violet: {
            bg: "bg-violet-50",
            border: "border-violet-100",
            text: "text-violet-600"
        },
        orange: {
            bg: "bg-orange-50",
            border: "border-orange-100",
            text: "text-orange-600"
        },
    };

    const isPrimary = color === 'primary';
    const colorConfig = colors[color];

    const content = (
        <div className="bg-white border border-slate-200 p-10 rounded-[3rem] space-y-8 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group overflow-hidden relative shadow-sm hover:shadow-2xl">
            <div className={`absolute -right-6 -top-6 size-32 rounded-full blur-[60px] opacity-20 transition-all duration-700 group-hover:scale-150`}
                 style={{ backgroundColor: isPrimary ? colorConfig.bg : undefined }} />
            
            <div className="flex justify-between items-start relative z-10">
                <div className={clsx(
                    "p-5 rounded-[1.5rem] border shadow-inner transition-all duration-500 group-hover:scale-110",
                    !isPrimary && `${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}`
                )} style={isPrimary ? { backgroundColor: colorConfig.bg, borderColor: colorConfig.border, color: colorConfig.text } : {}}>
                    {icon}
                </div>
                <div className={clsx(
                    "text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border shadow-sm",
                    change.startsWith('+') ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                )} style={change.startsWith('+') ? { backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)', color: 'var(--primary-color)', borderColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)' } : {}}>
                    {change}
                </div>
            </div>
            
            <div className="relative z-10 space-y-2">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1 italic leading-none">{title}</p>
                <div className="flex items-baseline gap-3">
                    <p className="text-5xl font-black text-slate-900 tracking-tighter leading-none italic uppercase">{value}</p>
                    <div className="h-2 w-2 rounded-full bg-slate-100" />
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none italic">{detail.split(' ')[0]}</p>
                </div>
                <p className="text-[10px] text-slate-300 font-black uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0 italic">{detail}</p>
            </div>
        </div>
    );

    if (href) {
        return <Link href={href} className="block">{content}</Link>;
    }
    return content;
}
