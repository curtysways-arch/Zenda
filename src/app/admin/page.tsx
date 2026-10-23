import prisma from '@/lib/prisma';
import { Plus, Users, Calendar, DollarSign, TrendingUp, Clock, AlertTriangle, ChevronRight, Gift, Lock, ExternalLink, MessageCircle, CalendarX2, Scissors, Tags, MessageSquare, Trophy, Palette } from 'lucide-react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { startOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
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
import CitioxMissionWidget from '@/components/admin/CitioxMissionWidget';
import MyPageCard from '@/components/admin/MyPageCard';
import { getLandingDesign, readLandingState } from '@/lib/landingDesigns';
import { formatUTCDate } from '@/lib/utils';
import RealtimeDashboardReloader from '@/components/admin/RealtimeDashboardReloader';
import ProductsDashboard from '@/components/admin/ProductsDashboard';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';

export default async function AdminDashboard() {
    const session = await getEffectiveAdminSession();

    if (!session) return null;
    const negocioId = (session.user as any).negocioId;
    const role = (session.user as any).role;
    const staffId = (session.user as any).staffId;
    const tipoNegocio = (session.user as any).tipoNegocio || 'RESERVA';

    if (!negocioId) {
        return null;
    }

    const negocioObj = await prisma.negocio.findUnique({
        where: { id: negocioId },
        select: { 
            id: true, 
            nombre: true, 
            slug: true, 
            colorPrimario: true, 
            tipoNegocio: true, 
            configuracion: true,
            Service: {
                select: {
                    id: true,
                    nombre: true,
                    precio: true,
                    duracion: true,
                    extraInfo: true
                }
            }
        }
    });

    const { 
        normalizeBusinessConfig,
        isLaundryOrShoeCareBusiness,
        isRestaurantBusiness,
        isStoreBusiness,
        isSportsCourtsBusiness,
        isDentalBusiness,
        isGymBusiness
    } = await import('@/lib/businessTypeHelper');

    const cleanConfig = normalizeBusinessConfig(negocioObj?.configuracion);
    const resolvedNegocio = negocioObj ? { ...negocioObj, configuracion: cleanConfig } : null;

    // Misión de Citiox más cercana (solo para dueños/administradores)
    const canSeeMissions = !(role === 'STAFF' || role === 'PROFESIONAL');
    const withMission = (node: React.ReactNode) => canSeeMissions ? (
        <>
            <CitioxMissionWidget variant="strip" className="mb-4" />
            {node}
        </>
    ) : node;

    if (isLaundryOrShoeCareBusiness(resolvedNegocio)) {
        const { default: LaundryOperationsBoard } = await import('@/modules/shoe-care/components/LaundryOperationsBoard');
        const n: any = negocioObj || {};
        return withMission(
            <LaundryOperationsBoard
                negocio={{
                    id: n.id,
                    nombre: n.nombre,
                    slug: n.slug,
                    logoUrl: n.logoUrl || null,
                    colorPrimario: n.colorPrimario || null,
                    tipoNegocio: n.tipoNegocio || null,
                    configuracion: JSON.parse(JSON.stringify(cleanConfig || {})),
                }}
            />
        );
    }

    if (isRestaurantBusiness(resolvedNegocio)) {
        const { default: RestaurantDashboard } = await import('@/components/admin/RestaurantDashboard');
        return withMission(<RestaurantDashboard negocioId={negocioId} role={role} />);
    }

    if (isStoreBusiness(resolvedNegocio)) {
        const rawType = (negocioObj?.tipoNegocio || tipoNegocio || '').toUpperCase().trim();
        if (rawType === 'PRODUCTOS') {
            return withMission(<ProductsDashboard negocioId={negocioId} role={role} />);
        }
        const { default: StoreDashboard } = await import('@/modules/store/components/StoreDashboard');
        return withMission(<StoreDashboard negocioId={negocioId} role={role} />);
    }

    if (isSportsCourtsBusiness(resolvedNegocio)) {
        const { default: CanchaAdminDashboard } = await import('@/modules/sports-courts/components/CanchaAdminDashboard');
        return withMission(<CanchaAdminDashboard negocio={resolvedNegocio} />);
    }

    if (isDentalBusiness(resolvedNegocio)) {
        const { default: DentalAdminDashboard } = await import('@/modules/dental/components/admin/DentalAdminDashboard');
        return withMission(
            <DentalAdminDashboard 
                negocioNombre={negocioObj?.nombre} 
                primaryColor={negocioObj?.colorPrimario || '#0284c7'} 
            />
        );
    }

    if (isGymBusiness(resolvedNegocio)) {
        const { default: GymAdminDashboard } = await import('@/modules/gym/components/GymAdminDashboard');
        return withMission(<GymAdminDashboard businessSlug={negocioObj?.slug} negocioNombre={negocioObj?.nombre} />);
    }

    const isStaff = role === 'STAFF' || role === 'PROFESIONAL';

    const now = new Date();
    // Las citas se guardan con la fecha local del negocio a medianoche UTC.
    // "Hoy" debe calcularse con la zona horaria del negocio, no con UTC
    // (si no, después de las 19:00 en Ecuador el panel mostraba las citas de mañana como "hoy").
    const bizTimeZone = (cleanConfig as any)?.timeZone || (cleanConfig as any)?.timezone || 'America/Guayaquil';
    const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: bizTimeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const startToday = new Date(`${todayKey}T00:00:00.000Z`);
    const endToday = new Date(`${todayKey}T23:59:59.999Z`);
    const startMonth = startOfMonth(now);

    const inicioSemana = startOfWeek(now, { weekStartsOn: 1 });
    const finSemana = endOfWeek(now, { weekStartsOn: 1 });

    const commonFilter = {
        negocioId,
        ...(isStaff && staffId ? { staffId } : {})
    };

    const [citasHoy, citasMes, ingresosMes, totalClientes, negocioData, servicesResult, planFeatures, loyaltyPendingCount, referralPendingCount, staffCount] = await Promise.all([
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
                estado: { in: ['completed', 'finalizada', 'finalizado'] },
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
                heroTitulo: true,
                configuracion: true,
                slug: true,
                colorPrimario: true,
                tipoNegocio: true,
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
        featureService.getAllFeatures(negocioId),
        prisma.loyaltyRedemption.count({
            where: {
                negocioId,
                estado: { in: ['PENDIENTE_ENTREGA', 'SOLICITADO', 'LISTO_PARA_RETIRAR'] }
            }
        }),
        prisma.referralReward.count({
            where: {
                negocioId,
                estado: { in: ['PENDIENTE_ENTREGA', 'SOLICITADO', 'LISTO_PARA_RETIRAR'] }
            }
        }),
        (prisma as any).staff ? (prisma as any).staff.count({ where: { businessId: negocioId } }).catch(() => 0) : Promise.resolve(0)
    ]);

    const pendingDeliveriesCount = (loyaltyPendingCount || 0) + (referralPendingCount || 0);

    // Comparación honesta: mismo tramo del mes anterior (del día 1 a hoy)
    const startPrevMonth = startOfMonth(subMonths(now, 1));
    const samePointPrevMonth = subMonths(now, 1);
    const [citasMesAnterior, ingresosMesAnterior, clientesNuevosMes] = await Promise.all([
        prisma.appointment.count({
            where: {
                ...commonFilter,
                fecha: { gte: startPrevMonth, lte: samePointPrevMonth },
                estado: { in: ['confirmed', 'completed', 'finalizada', 'finalizado'] }
            }
        }),
        prisma.appointment.aggregate({
            where: {
                ...commonFilter,
                estado: { in: ['completed', 'finalizada', 'finalizado'] },
                fecha: { gte: startPrevMonth, lte: samePointPrevMonth }
            },
            _sum: { total: true }
        }),
        prisma.cliente.count({ where: { negocioId, createdAt: { gte: startMonth } } })
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
            service: true,
            staff: { select: { id: true, name: true } }
        },
        take: 30,
        orderBy: [
            { fecha: 'asc' },
            { horaInicio: 'asc' }
        ]
    });

    const timeZone = (() => {
        let tz = bizTimeZone;
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

    const proximasCitas = validProximas.slice(0, 8);

    // Citas que ya terminaron pero siguen abiertas (para recordar cerrarlas en la agenda)
    const citasSinCerrarAntes = await prisma.appointment.count({
        where: {
            ...commonFilter,
            fecha: { gte: new Date(startToday.getTime() - 60 * 24 * 60 * 60 * 1000), lt: startToday },
            estado: { in: ['pending', 'confirmed', 'approved', 'client_checked_in', 'in_progress'] }
        }
    }).catch(() => 0);
    const citasSinCerrar = citasSinCerrarAntes + (rawProximasCitas.length - validProximas.length);

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
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-center px-6">
                <AlertTriangle className="text-amber-500 mb-4" size={40} />
                <h2 className="text-xl font-semibold text-slate-900">No pudimos cargar tu negocio</h2>
                <p className="text-slate-500 mt-2">Recarga la página. Si el problema sigue, escríbenos a soporte.</p>
            </div>
        );
    }


    const ingresosMesTotal = Number(ingresosMes?._sum?.total || 0);
    const ingresosPrevTotal = Number(ingresosMesAnterior?._sum?.total || 0);
    const firstName = (session?.user?.name || '').split(' ')[0] || '';
    const todayLabel = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long', timeZone }).format(new Date());
    const citasDeHoy = proximasCitas.filter(r => isSameUTCDay(r.fecha, nowTime));
    const designName = getLandingDesign(readLandingState(negocioData?.configuracion).activo)?.nombre || 'Clásico';

    const shortcuts = [
        { href: '/admin/servicios', label: 'Servicios', icon: <Scissors size={18} /> },
        { href: '/admin/bloqueos', label: 'Bloquear horario', icon: <Lock size={18} /> },
        { href: '/admin/promociones', label: 'Promociones', icon: <Tags size={18} /> },
        { href: '/admin/comunicacion', label: 'Mensajes', icon: <MessageSquare size={18} /> },
        { href: '/admin/misiones', label: 'Club', icon: <Trophy size={18} /> },
        { href: '/admin/diseno', label: 'Diseño de página', icon: <Palette size={18} /> },
    ];

    return (
        <>
            {/* VISTA MÓVIL */}
            <div className="md:hidden">
                {!isStaff && <CitioxMissionWidget variant="strip" className="mx-4 mt-4" />}
                <MobileDashboard
                    stats={{
                        citasHoy,
                        citasMes,
                        ingresosMes: ingresosMesTotal,
                        totalClientes
                    }}
                    proximasCitas={proximasCitas}
                    isTrial={isTrial}
                    daysLeft={daysLeft}
                    primaryColor={primaryColor}
                    slug={negocioData?.slug || ''}
                    negocioNombre={negocioData?.nombre}
                    usuarioNombre={session?.user?.name || ''}
                    pendingDeliveriesCount={pendingDeliveriesCount}
                    onboarding={!isStaff ? onboarding : undefined}
                    isStaff={isStaff}
                    designName={designName}
                    shortcuts={!isStaff ? shortcuts.map(({ href, label }) => ({ href, label })) : []}
                    todayLabel={todayLabel}
                    sinCerrar={citasSinCerrar}
                />
            </div>

            {/* VISTA ESCRITORIO */}
            <div className="hidden md:block space-y-5 max-w-7xl">
                {isTrial && !isStaff && (
                    <UpgradeBanner type="trial_expiring" daysLeft={daysLeft > 0 ? daysLeft : 0} />
                )}
                {isDowngraded && !isStaff && (
                    <UpgradeBanner type="downgraded" />
                )}

                {pendingDeliveriesCount > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                <Gift size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    {pendingDeliveriesCount === 1 ? 'Tienes 1 premio por entregar' : `Tienes ${pendingDeliveriesCount} premios por entregar`}
                                </p>
                                <p className="text-sm text-slate-600">Clientes que canjearon recompensas y esperan en recepción.</p>
                            </div>
                        </div>
                        <Link
                            href="/admin/misiones?tab=rewards"
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shrink-0"
                        >
                            Ver premios
                        </Link>
                    </div>
                )}

                {/* Encabezado */}
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm text-slate-500 first-letter:uppercase">{todayLabel}</p>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                            {firstName ? `Hola, ${firstName}` : (isStaff ? 'Mi agenda' : 'Inicio')}
                        </h1>
                        <p className="text-slate-600 mt-1">
                            {citasHoy === 0
                                ? 'No tienes citas para hoy.'
                                : `Hoy tienes ${citasHoy} ${citasHoy === 1 ? 'cita' : 'citas'}.`}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/admin/bloqueos"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            <Lock size={16} />
                            Bloquear horario
                        </Link>
                        <Link
                            href="/admin/citas/nueva"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-white hover:brightness-110"
                            style={{ backgroundColor: 'var(--primary-color)' }}
                        >
                            <Plus size={16} />
                            Nueva cita
                        </Link>
                    </div>
                </header>

                {/* Números del negocio (todos reales) */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                    <StatCard
                        title={isStaff ? 'Mis citas hoy' : 'Citas hoy'}
                        value={String(citasHoy)}
                        icon={<Calendar size={18} />}
                        detail={citasDeHoy.length > 0 ? `Próxima a las ${citasDeHoy[0].horaInicio}` : 'Agenda libre'}
                        href="/admin/citas"
                    />
                    <StatCard
                        title={isStaff ? 'Mis servicios cobrados (mes)' : 'Cobrado este mes'}
                        value={formatMoney(ingresosMesTotal)}
                        icon={<DollarSign size={18} />}
                        change={percentChange(ingresosMesTotal, ingresosPrevTotal)}
                        detail="vs. mismo periodo del mes pasado"
                        href="/admin/recaudado"
                    />
                    <StatCard
                        title="Citas confirmadas (mes)"
                        value={String(citasMes)}
                        icon={<TrendingUp size={18} />}
                        change={percentChange(citasMes, citasMesAnterior)}
                        detail="vs. mismo periodo del mes pasado"
                        href="/admin/reportes"
                    />
                    <StatCard
                        title="Clientes"
                        value={String(totalClientes)}
                        icon={<Users size={18} />}
                        detail={clientesNuevosMes > 0 ? `${clientesNuevosMes} nuevos este mes` : 'Sin clientes nuevos este mes'}
                        href="/admin/clientes"
                    />
                </div>

                {/* Atajos: lo que el dueño hace seguido, a un clic */}
                {!isStaff && (
                    <nav aria-label="Atajos" className="grid grid-cols-3 xl:grid-cols-6 gap-3">
                        {shortcuts.map((sc) => (
                            <Link
                                key={sc.href}
                                href={sc.href}
                                className="group flex items-center gap-2.5 px-3 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition"
                            >
                                <span className="size-7 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 text-slate-600 group-hover:text-white transition-colors group-hover:[background-color:var(--primary-color)]">
                                    {sc.icon}
                                </span>
                                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 leading-tight">{sc.label}</span>
                            </Link>
                        ))}
                    </nav>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                    {/* Columna principal */}
                    <div className="lg:col-span-2 space-y-5">
                        <section className="bg-white border border-slate-200 rounded-2xl">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <h2 className="text-base font-semibold text-slate-900">Próximas citas</h2>
                                <Link href="/admin/citas" className="text-sm font-medium text-slate-500 hover:text-slate-900">
                                    Ver agenda completa
                                </Link>
                            </div>

                            {proximasCitas.length > 0 ? (
                                <ul className="divide-y divide-slate-100">
                                    {proximasCitas.map(r => {
                                        const status = appointmentStatus(r.estado);
                                        return (
                                            <li key={r.id}>
                                                <Link href={`/admin/citas/${r.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 group">
                                                    <div className="w-16 shrink-0 text-center">
                                                        <p className="text-base font-semibold text-slate-900 leading-tight">{r.horaInicio}</p>
                                                        <p className="text-xs text-slate-500">{dayLabel(r.fecha, nowTime)}</p>
                                                    </div>
                                                    <div className="size-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold shrink-0">
                                                        {r.cliente.nombre.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-slate-900 truncate">{r.cliente.nombre}</p>
                                                        <p className="text-sm text-slate-500 truncate">{r.service.nombre}</p>
                                                    </div>
                                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${status.className}`}>
                                                        {status.label}
                                                    </span>
                                                    <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-600 shrink-0" />
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="px-6 py-12 text-center">
                                    <div className="size-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                                        <CalendarX2 size={22} />
                                    </div>
                                    <p className="font-semibold text-slate-900">No tienes citas próximas</p>
                                    <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                                        Comparte tu página para que tus clientes reserven, o agenda una cita tú mismo.
                                    </p>
                                    <div className="flex justify-center gap-2 mt-4">
                                        <Link
                                            href="/admin/citas/nueva"
                                            className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                                            style={{ backgroundColor: 'var(--primary-color)' }}
                                        >
                                            Nueva cita
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </section>

                        <WaitingRoomWidget primaryColor={primaryColor} />
                    </div>

                    {/* Columna lateral */}
                    <aside className="space-y-4">
                        {!isStaff && negocioData?.slug && (
                            <MyPageCard slug={negocioData.slug} designName={designName} primaryColor={primaryColor} />
                        )}

                        {!isStaff && <CitioxMissionWidget />}

                        {!isStaff && onboarding.percentage < 100 && (
                            <OnboardingChecklist
                                percentage={onboarding.percentage}
                                checks={onboarding.checks}
                                primaryColor={primaryColor}
                            />
                        )}

                        {!isStaff && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
                                <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${negocioData?.whatsapp ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                    <MessageCircle size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {negocioData?.whatsapp ? 'WhatsApp registrado' : 'Falta tu WhatsApp'}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {negocioData?.whatsapp ? negocioData.whatsapp : 'Agrégalo para recibir y confirmar reservas.'}
                                    </p>
                                </div>
                                <Link href="/admin/perfil" className="text-sm font-medium text-slate-500 hover:text-slate-900 shrink-0">
                                    {negocioData?.whatsapp ? 'Cambiar' : 'Agregar'}
                                </Link>
                            </div>
                        )}

                        {negocioData?.slug && !isStaff && <ShareWidget url={shareUrl} negocio={negocioData} />}

                        {!isStaff && (
                            <PlanStatusCard
                                planName={planName}
                                estado={planEstado}
                                daysLeft={daysLeft}
                                features={featuresData as any}
                                usage={{
                                    appointmentsMonthly: citasMes,
                                    professionals: staffCount || 1
                                }}
                                tipoNegocio={negocioData?.tipoNegocio || 'RESERVA'}
                            />
                        )}
                    </aside>
                </div>

                {/* Semana */}
                <section>
                    <WeeklyCalendar
                        reservas={citasFormateadas}
                        canchas={servicesData}
                    />
                </section>
            </div>
            <RealtimeDashboardReloader />
        </>
    );
}

// ── Helpers de presentación ─────────────────────────────────────────

function formatMoney(value: number): string {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
}

/** Variación porcentual real. Devuelve null si no hay base de comparación. */
function percentChange(current: number, previous: number): number | null {
    if (!previous || previous <= 0) return null;
    return Math.round(((current - previous) / previous) * 100);
}

function toUTCDateKey(d: Date | string): string {
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().split('T')[0];
}

function isSameUTCDay(fecha: Date | string, localNow: Date): boolean {
    const nowKey = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
    return toUTCDateKey(fecha) === nowKey;
}

function dayLabel(fecha: Date | string, localNow: Date): string {
    if (isSameUTCDay(fecha, localNow)) return 'Hoy';
    const tomorrow = new Date(localNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (isSameUTCDay(fecha, tomorrow)) return 'Mañana';
    return formatUTCDate(fecha as any);
}

function appointmentStatus(estado: string): { label: string; className: string } {
    switch (estado) {
        case 'pending':
            return { label: 'Por confirmar', className: 'bg-amber-50 text-amber-700' };
        case 'confirmed':
            return { label: 'Confirmada', className: 'bg-emerald-50 text-emerald-700' };
        case 'client_checked_in':
            return { label: 'Ya llegó', className: 'bg-sky-50 text-sky-700' };
        case 'in_progress':
            return { label: 'En atención', className: 'bg-violet-50 text-violet-700' };
        default:
            return { label: estado, className: 'bg-slate-100 text-slate-600' };
    }
}

function StatCard({ title, value, icon, change, detail, href }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    change?: number | null;
    detail?: string;
    href?: string;
}) {
    const content = (
        <div className="bg-white border border-slate-200 rounded-xl p-4 h-full hover:border-slate-300 hover:shadow-sm transition">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-600">{title}</p>
                <span className="size-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}>
                    {icon}
                </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
                <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
                {typeof change === 'number' && (
                    <span className={`text-sm font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {change >= 0 ? '+' : ''}{change}%
                    </span>
                )}
            </div>
            {detail && <p className="text-xs text-slate-500 mt-1">{detail}</p>}
        </div>
    );

    if (href) {
        return <Link href={href} className="block">{content}</Link>;
    }
    return content;
}

