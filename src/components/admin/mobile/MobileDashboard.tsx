'use client';
/**
 * Inicio (celular): lo primero que ve el local al abrir el panel.
 * Arriba lo que toca ahora (la siguiente cita y el resto del día), luego los números
 * del mes y los atajos. Tocar una cita abre su ficha.
 */
import {
    CalendarDays,
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
    AlertTriangle,
    MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import WaitingRoomWidget from '@/components/admin/WaitingRoomWidget';
import OnboardingChecklist from '@/components/admin/OnboardingChecklist';
import MyPageCard from '@/components/admin/MyPageCard';
import {
    estadoOf, dateKey, keyToDate, localKey, hora12, nombreCliente, nombreServicio, telefonoCliente, waLink, inkOn,
} from '@/components/admin/agenda/agendaShared';

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
    todayLabel?: string;
    sinCerrar?: number;
}

const SHORTCUT_ICONS: Record<string, React.ReactNode> = {
    '/admin/servicios': <Scissors size={18} />,
    '/admin/bloqueos': <Lock size={18} />,
    '/admin/promociones': <Tags size={18} />,
    '/admin/comunicacion': <MessageSquare size={18} />,
    '/admin/misiones': <Trophy size={18} />,
    '/admin/diseno': <Palette size={18} />,
};

/** ¿El color es tan claro que como texto sobre blanco no se lee? */
function muyClaro(color: string) {
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color || '')) return false;
    const h = color.slice(1);
    const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4;
}

function formatMoney(value: number): string {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value || 0);
}

function diaCorto(fecha: any) {
    const k = dateKey(fecha);
    const hoy = localKey(new Date());
    const man = new Date(); man.setDate(man.getDate() + 1);
    if (k === hoy) return 'Hoy';
    if (k === localKey(man)) return 'Mañana';
    return new Intl.DateTimeFormat('es-EC', { weekday: 'short', day: 'numeric' }).format(keyToDate(k)).replace('.', '');
}

function enMinutos(c: any) {
    const k = dateKey(c.fecha);
    if (!k) return null;
    const d = keyToDate(k);
    const [h, m] = String(c.horaInicio || '0:0').split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
    return Math.round((d.getTime() - Date.now()) / 60000);
}

function cuandoTexto(c: any) {
    const estado = String(c.estado || '').toLowerCase();
    if (estado === 'in_progress') return 'En atención ahora';
    if (estado === 'client_checked_in') return 'Ya llegó';
    const n = enMinutos(c);
    if (n === null) return '';
    if (n <= 0) return 'Es ahora';
    if (n < 60) return `En ${n} min`;
    if (n < 24 * 60 && dateKey(c.fecha) === localKey(new Date())) {
        const h = Math.floor(n / 60);
        return `En ${h} h${n % 60 >= 10 ? ` ${n % 60} min` : ''}`;
    }
    return diaCorto(c.fecha);
}

export default function MobileDashboard({
    stats,
    proximasCitas,
    primaryColor,
    slug,
    isTrial,
    daysLeft,
    negocioNombre,
    usuarioNombre,
    pendingDeliveriesCount = 0,
    onboarding,
    isStaff = false,
    designName = 'Clásico',
    shortcuts = [],
    todayLabel,
    sinCerrar = 0,
}: MobileDashboardProps) {
    const firstName = (usuarioNombre || '').split(' ')[0];
    const ink = inkOn(primaryColor);
    // Con un color de marca muy claro, el texto y los íconos de acento usan un tono oscuro legible.
    const accent = muyClaro(primaryColor) ? '#334155' : primaryColor;
    const hoyKey = localKey(new Date());
    const [siguiente, ...resto] = proximasCitas;
    const restoHoy = resto.filter((c) => dateKey(c.fecha) === hoyKey);
    const despues = resto.filter((c) => dateKey(c.fecha) !== hoyKey).slice(0, 4);

    const resumenHoy = stats.citasHoy === 0
        ? 'Hoy no tienes citas.'
        : `Hoy tienes ${stats.citasHoy} ${stats.citasHoy === 1 ? 'cita' : 'citas'}.`;

    return (
        <div className="space-y-4 pb-6">
            {/* Saludo */}
            <header className="px-0.5 pt-1">
                {todayLabel && <p className="text-sm font-medium text-slate-500">{todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}</p>}
                <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-900">
                    {firstName ? `Hola, ${firstName}` : negocioNombre || 'Inicio'}
                </h1>
                <p className="mt-0.5 text-[15px] text-slate-600">{resumenHoy}</p>
            </header>

            {/* Prueba gratis */}
            {isTrial && !isStaff && (
                <Link href="/admin/plan" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                    <Zap size={18} className="shrink-0 text-amber-600" />
                    <p className="min-w-0 flex-1 text-sm text-amber-900">
                        {daysLeft && daysLeft > 0
                            ? <>Te quedan <b>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</b> de prueba gratis</>
                            : 'Tu prueba gratis terminó'}
                    </p>
                    <span className="shrink-0 text-sm font-semibold text-amber-800">Activar</span>
                </Link>
            )}

            {/* Citas pasadas que siguen abiertas */}
            {sinCerrar > 0 && (
                <Link href="/admin/citas?sinCerrar=1" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                    <AlertTriangle size={18} className="shrink-0 text-amber-600" />
                    <p className="min-w-0 flex-1 text-sm text-amber-900">
                        <b>{sinCerrar} {sinCerrar === 1 ? 'cita pasada sigue abierta' : 'citas pasadas siguen abiertas'}</b>. Ciérralas para que tus números cuadren.
                    </p>
                    <ChevronRight size={18} className="shrink-0 text-amber-500" />
                </Link>
            )}

            {/* Lo que sigue */}
            <section className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/80">
                {siguiente ? (
                    <>
                        <SiguienteCita cita={siguiente} primaryColor={accent} />
                        {restoHoy.length > 0 && (
                            <div className="border-t border-slate-100">
                                <p className="px-4 pb-1 pt-3 text-[13px] font-semibold text-slate-500">Más tarde hoy</p>
                                <ul>{restoHoy.map((c) => <FilaCita key={c.id} cita={c} />)}</ul>
                            </div>
                        )}
                        {despues.length > 0 && (
                            <div className="border-t border-slate-100">
                                <p className="px-4 pb-1 pt-3 text-[13px] font-semibold text-slate-500">Próximos días</p>
                                <ul>{despues.map((c) => <FilaCita key={c.id} cita={c} conDia />)}</ul>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="px-6 py-9 text-center">
                        <CalendarX2 size={26} className="mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-900">No hay citas por venir</p>
                        <p className="mx-auto mt-1 max-w-[30ch] text-sm text-slate-500">Agenda una tú mismo o comparte tu página para recibir reservas.</p>
                        {slug && (
                            <a href={`/${slug}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: accent }}>
                                Ver mi página <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                )}
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3">
                    <Link href="/admin/citas?nueva=1" className="flex items-center justify-center gap-1.5 rounded-2xl py-3 text-[15px] font-bold transition active:scale-[0.98]" style={{ backgroundColor: primaryColor, color: ink }}>
                        <Plus size={18} strokeWidth={2.5} /> Nueva cita
                    </Link>
                    <Link href="/admin/citas" className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-100 py-3 text-[15px] font-semibold text-slate-800 active:bg-slate-200">
                        <CalendarDays size={18} /> Ver agenda
                    </Link>
                </div>
            </section>

            {/* Premios por entregar */}
            {pendingDeliveriesCount > 0 && (
                <Link href="/admin/misiones?tab=rewards" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3">
                    <Gift size={18} className="shrink-0 text-rose-600" />
                    <p className="min-w-0 flex-1 text-sm font-medium text-slate-900">
                        {pendingDeliveriesCount === 1 ? '1 premio por entregar' : `${pendingDeliveriesCount} premios por entregar`}
                    </p>
                    <ChevronRight size={18} className="shrink-0 text-rose-400" />
                </Link>
            )}

            {/* Números del mes */}
            <section>
                <h2 className="mb-2 px-1 text-[13px] font-semibold text-slate-500">Este mes</h2>
                <div className="grid grid-cols-3 divide-x divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
                    <Numero href="/admin/citas" label="Citas" value={String(stats.citasMes)} icon={<CalendarDays size={14} />} />
                    <Numero href="/admin/recaudado" label={isStaff ? 'Mi cobro' : 'Cobrado'} value={formatMoney(stats.ingresosMes)} icon={<DollarSign size={14} />} />
                    <Numero href="/admin/clientes" label="Clientes" value={String(stats.totalClientes)} icon={<Users size={14} />} />
                </div>
            </section>

            <WaitingRoomWidget primaryColor={primaryColor} />

            {onboarding && onboarding.percentage < 100 && (
                <OnboardingChecklist percentage={onboarding.percentage} checks={onboarding.checks} primaryColor={primaryColor} />
            )}

            {/* Atajos: lo que se usa seguido. El resto está en el Menú. */}
            {!isStaff && shortcuts.length > 0 && (
                <section>
                    <h2 className="mb-2 px-1 text-[13px] font-semibold text-slate-500">Atajos</h2>
                    <div className="grid grid-cols-3 gap-2">
                        {shortcuts.map((sc) => (
                            <Link key={sc.href} href={sc.href} className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-white p-2.5 text-center text-slate-700 ring-1 ring-slate-200/80 active:bg-slate-50">
                                <span style={{ color: accent }}>{SHORTCUT_ICONS[sc.href]}</span>
                                <span className="text-xs font-medium leading-tight">{sc.label}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {!isStaff && slug && <MyPageCard slug={slug} designName={designName} primaryColor={primaryColor} />}
        </div>
    );
}

function SiguienteCita({ cita, primaryColor }: { cita: any; primaryColor: string }) {
    const est = estadoOf(cita.estado);
    const tel = telefonoCliente(cita);
    const wa = waLink(tel, `Hola ${nombreCliente(cita).split(' ')[0]} 👋 Te esperamos ${diaCorto(cita.fecha).toLowerCase() === 'hoy' ? 'hoy' : diaCorto(cita.fecha).toLowerCase()} a las ${hora12(cita.horaInicio)}.`);
    const [h, mer] = hora12(cita.horaInicio).split(' ');
    return (
        <div className="relative p-4">
            <span className="absolute inset-y-4 left-0 w-1 rounded-r-full" style={{ backgroundColor: est.bar }} aria-hidden />
            <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold" style={{ color: primaryColor }}>Siguiente · {cuandoTexto(cita)}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${est.pill}`}>{est.label}</span>
            </div>
            <Link href={`/admin/citas/${cita.id}`} className="mt-2 flex items-start gap-3">
                <span className="shrink-0">
                    <span className="block text-[28px] font-bold leading-none tabular-nums text-slate-900">{h}</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">{mer}{cita.horaFin ? ` – ${hora12(cita.horaFin)}` : ''}</span>
                </span>
                <span className="min-w-0 flex-1 pl-1">
                    <span className="block truncate text-[17px] font-semibold leading-tight text-slate-900">{nombreCliente(cita)}</span>
                    <span className="mt-0.5 block truncate text-sm text-slate-500">
                        {nombreServicio(cita)}{cita.staff?.name ? ` · ${cita.staff.name.split(' ')[0]}` : ''}
                    </span>
                </span>
                <ChevronRight size={20} className="mt-1 shrink-0 text-slate-300" />
            </Link>
            {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 active:bg-slate-50">
                    <MessageCircle size={15} className="text-green-600" /> Recordarle por WhatsApp
                </a>
            )}
        </div>
    );
}

function FilaCita({ cita, conDia }: { cita: any; conDia?: boolean }) {
    const est = estadoOf(cita.estado);
    return (
        <li>
            <Link href={`/admin/citas/${cita.id}`} className="flex items-center gap-3 px-4 py-2.5 active:bg-slate-50">
                <span className="w-[68px] shrink-0">
                    {conDia && <span className="block text-[11px] font-semibold capitalize text-slate-400">{diaCorto(cita.fecha)}</span>}
                    <span className="block whitespace-nowrap text-[15px] font-semibold tabular-nums text-slate-900">
                        {hora12(cita.horaInicio).split(' ')[0]}<span className="ml-0.5 text-[11px] font-semibold text-slate-500">{hora12(cita.horaInicio).split(' ')[1]}</span>
                    </span>
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-slate-900">{nombreCliente(cita)}</span>
                    <span className="block truncate text-[13px] text-slate-500">{nombreServicio(cita)}</span>
                </span>
                <span className={`size-2 shrink-0 rounded-full ${est.dot}`} title={est.label} aria-label={est.label} />
            </Link>
        </li>
    );
}

function Numero({ label, value, icon, href }: { label: string; value: string; icon: React.ReactNode; href: string }) {
    return (
        <Link href={href} className="min-w-0 px-3 py-3 active:bg-slate-50">
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500">{icon}{label}</span>
            <span className="mt-1 block truncate text-lg font-bold tabular-nums leading-tight text-slate-900">{value}</span>
        </Link>
    );
}
