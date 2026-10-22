'use client';

import {
    Calendar,
    DollarSign,
    Users,
    Plus,
    ChevronRight,
    Scissors,
    Lock,
    Tags,
    Gift,
    Zap,
    CalendarX2,
    ExternalLink,
    MessageSquare,
    Trophy,
    Palette,
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatUTCDate } from '@/lib/utils';
import WaitingRoomWidget from '@/components/admin/WaitingRoomWidget';
import OnboardingChecklist from '@/components/admin/OnboardingChecklist';
import MyPageCard from '@/components/admin/MyPageCard';

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
    negocioNombre?: string;
    usuarioNombre?: string;
    pendingDeliveriesCount?: number;
    onboarding?: { percentage: number; checks: any[] };
    isStaff?: boolean;
    designName?: string;
    shortcuts?: { href: string; label: string }[];
}

const SHORTCUT_ICONS: Record<string, React.ReactNode> = {
    '/admin/servicios': <Scissors size={18} />,
    '/admin/bloqueos': <Lock size={18} />,
    '/admin/promociones': <Tags size={18} />,
    '/admin/comunicacion': <MessageSquare size={18} />,
    '/admin/misiones': <Trophy size={18} />,
    '/admin/diseno': <Palette size={18} />,
};

const STATUS: Record<string, { label: string; className: string }> = {
    pending: { label: 'Por confirmar', className: 'bg-amber-50 text-amber-700' },
    confirmed: { label: 'Confirmada', className: 'bg-emerald-50 text-emerald-700' },
    client_checked_in: { label: 'Ya llegó', className: 'bg-sky-50 text-sky-700' },
    in_progress: { label: 'En atención', className: 'bg-violet-50 text-violet-700' },
};

function formatMoney(value: number): string {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value || 0);
}

export default function MobileDashboard({
    stats,
    proximasCitas,
    primaryColor,
    slug,
    isTrial,
    daysLeft,
    usuarioNombre,
    pendingDeliveriesCount = 0,
    onboarding,
    isStaff = false,
    designName = 'Clásico',
    shortcuts = [],
}: MobileDashboardProps) {
    const firstName = (usuarioNombre || '').split(' ')[0];

    return (
        <div className="space-y-5 pb-6">
            {/* Prueba gratuita */}
            {isTrial && !isStaff && (
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Zap size={18} className="text-amber-600 shrink-0" />
                        <p className="text-sm text-amber-900">
                            {daysLeft && daysLeft > 0
                                ? `Te quedan ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} de prueba`
                                : 'Tu prueba terminó'}
                        </p>
                    </div>
                    <Link
                        href="/admin/plan"
                        className="text-sm font-semibold px-3 py-2 rounded-xl text-white bg-slate-900 shrink-0"
                    >
                        Activar
                    </Link>
                </div>
            )}

            {/* Saludo + acción principal */}
            <header className="space-y-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {firstName ? `Hola, ${firstName}` : 'Inicio'}
                    </h1>
                    <p className="text-slate-600 mt-0.5">
                        {stats.citasHoy === 0
                            ? 'No tienes citas para hoy.'
                            : `Hoy tienes ${stats.citasHoy} ${stats.citasHoy === 1 ? 'cita' : 'citas'}.`}
                    </p>
                </div>
                <Link
                    href="/admin/citas/nueva"
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white font-semibold active:scale-[0.99] transition"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Plus size={18} />
                    Nueva cita
                </Link>
            </header>

            {/* Premios pendientes */}
            {pendingDeliveriesCount > 0 && (
                <Link
                    href="/admin/misiones?tab=rewards"
                    className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200"
                >
                    <div className="flex items-center gap-3">
                        <Gift size={20} className="text-rose-600 shrink-0" />
                        <p className="text-sm font-medium text-slate-900">
                            {pendingDeliveriesCount === 1 ? '1 premio por entregar' : `${pendingDeliveriesCount} premios por entregar`}
                        </p>
                    </div>
                    <ChevronRight size={18} className="text-rose-400" />
                </Link>
            )}

            {/* Números */}
            <div className="grid grid-cols-3 gap-2.5">
                <QuickStat href="/admin/citas" label="Citas hoy" value={String(stats.citasHoy)} icon={<Calendar size={16} />} color={primaryColor} />
                <QuickStat href="/admin/recaudado" label={isStaff ? 'Mi mes' : 'Cobrado mes'} value={formatMoney(stats.ingresosMes)} icon={<DollarSign size={16} />} color={primaryColor} />
                <QuickStat href="/admin/clientes" label="Clientes" value={String(stats.totalClientes)} icon={<Users size={16} />} color={primaryColor} />
            </div>

            {/* Próximas citas */}
            <section className="bg-white border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h2 className="text-base font-semibold text-slate-900">Próximas citas</h2>
                    <Link href="/admin/citas" className="text-sm font-medium text-slate-500 flex items-center gap-0.5">
                        Ver agenda <ChevronRight size={16} />
                    </Link>
                </div>

                {proximasCitas.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                        {proximasCitas.map(cita => {
                            const status = STATUS[cita.estado] || { label: cita.estado, className: 'bg-slate-100 text-slate-600' };
                            return (
                                <li key={cita.id}>
                                    <Link href={`/admin/citas/${cita.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50">
                                        <div className="w-14 shrink-0">
                                            <p className="text-base font-semibold text-slate-900 leading-tight">{cita.horaInicio}</p>
                                            <p className="text-xs text-slate-500 truncate">{formatUTCDate(cita.fecha)}</p>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{cita.cliente.nombre}</p>
                                            <p className="text-sm text-slate-500 truncate">{cita.service.nombre}</p>
                                        </div>
                                        <span className={cn('text-xs font-medium px-2 py-1 rounded-full shrink-0', status.className)}>
                                            {status.label}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="px-6 py-10 text-center">
                        <CalendarX2 size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-medium text-slate-900">Sin citas próximas</p>
                        <p className="text-sm text-slate-500 mt-1">Comparte tu página para empezar a recibir reservas.</p>
                        {slug && (
                            <a
                                href={`/${slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold"
                                style={{ color: primaryColor }}
                            >
                                Ver mi página <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                )}
            </section>

            <WaitingRoomWidget primaryColor={primaryColor} />

            {/* Puesta en marcha (ahora también en móvil) */}
            {onboarding && onboarding.percentage < 100 && (
                <OnboardingChecklist
                    percentage={onboarding.percentage}
                    checks={onboarding.checks}
                    primaryColor={primaryColor}
                />
            )}

            {/* Atajos: lo que se usa seguido. El resto está en el Menú. */}
            {!isStaff && shortcuts.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold text-slate-500 mb-2 px-1">Atajos</h2>
                    <div className="grid grid-cols-3 gap-2.5">
                        {shortcuts.map((sc) => (
                            <Shortcut key={sc.href} href={sc.href} label={sc.label} icon={SHORTCUT_ICONS[sc.href]} />
                        ))}
                    </div>
                </section>
            )}

            {/* Mi página: ver y cambiar el diseño */}
            {!isStaff && slug && (
                <MyPageCard slug={slug} designName={designName} primaryColor={primaryColor} />
            )}
        </div>
    );
}

function QuickStat({ label, value, icon, color, href }: { label: string; value: string; icon: React.ReactNode; color: string; href: string }) {
    return (
        <Link href={href} className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-col gap-2 active:scale-[0.98] transition">
            <span className="size-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}1A`, color }}>
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900 leading-tight truncate">{value}</p>
                <p className="text-xs text-slate-500 truncate">{label}</p>
            </div>
        </Link>
    );
}

function Shortcut({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
    return (
        <Link href={href} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-2xl text-slate-700 active:bg-slate-50 text-center min-h-[76px]">
            {icon}
            <span className="text-xs font-medium leading-tight">{label}</span>
        </Link>
    );
}
