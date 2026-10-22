'use client';

/**
 * Club de beneficios del cliente: el corazón de Citiox.
 *
 * Una sola pantalla con una idea central: el "camino de premios". El cliente ve dónde está
 * (sus puntos), qué premio viene después y cuánto le falta. Todo lo demás (misiones, premios,
 * mis premios e invitar amigos) son maneras de avanzar en ese camino.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import MisPremiosPanel, { type MineData } from './MisPremiosPanel';
import {
    Award, Calendar, CalendarRange, Cake, Check, CheckCircle2, ChevronDown, ChevronLeft, Clock, Copy,
    Crown, Flame, Gem, Gift, History, Instagram, Loader2, Lock, MessageCircle, QrCode, Share2, Shield,
    Sparkles, Star, Target, Ticket, Trophy, Users, Wallet, X, Zap,
} from 'lucide-react';

type Tab = 'misiones' | 'premios' | 'mis-premios' | 'invitar';

interface Quest {
    id: string;
    nombre: string;
    descripcion: string;
    icono: string;
    color: string;
    validacionTipo: string;
    progresoActual: number;
    progresoRequerido: number;
    unit?: string;
    estado: 'EN_PROGRESO' | 'PENDIENTE_APROBACION' | 'COMPLETADA' | 'RECLAMADA';
    recompensas: string[];
    fechaFin?: string;
}

interface Reward {
    id: string;
    nombre: string;
    descripcion?: string;
    costoPuntos: number;
    imagenUrl?: string | null;
    tipo?: string;
    cantidadDisponible?: number | null;
    Service?: any;
}

interface Level {
    id: string;
    nombre: string;
    color?: string;
    icono?: string;
    orden?: number;
    diamantesRequeridos?: number;
    beneficios?: string[] | null;
}

const ICONS: Record<string, any> = {
    Sparkles, CalendarRange, Calendar: CalendarRange, Clock, Instagram, Users, Cake, Crown, Award, Gift,
    Star, Target, Zap, Flame, Trophy, Gem, Shield,
};

const TABS: { id: Tab; label: string }[] = [
    { id: 'misiones', label: 'Misiones' },
    { id: 'premios', label: 'Premios' },
    { id: 'mis-premios', label: 'Mis premios' },
    { id: 'invitar', label: 'Invitar' },
];

const GOLD = '#F2B33D';
const INK = '#1E1B2E';

const fmt = (n: number) => Math.round(n).toLocaleString('es-EC');
const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

function rewardImage(r: Reward): string | null {
    if (r.imagenUrl) return r.imagenUrl;
    const s = r.Service;
    if (!s) return null;
    if (s.imageMedia?.key) return `/api/media/${s.imageMedia.key}`;
    return s.imageMedia?.url || s.Imagen?.[0]?.url || null;
}

export default function ClubHub({
    slug,
    primaryColor,
    negocioNombre,
    initialTab = 'misiones',
    focusQuestId = null,
}: {
    slug: string;
    primaryColor: string;
    textColor?: string;
    negocioNombre: string;
    initialTab?: Tab;
    focusQuestId?: string | null;
}) {
    const router = useRouter();
    const brand = primaryColor || '#ec4899';

    const [loading, setLoading] = useState(true);
    const [quests, setQuests] = useState<Quest[]>([]);
    const [gami, setGami] = useState<any>(null);
    const [me, setMe] = useState<any>(null); // null = sin sesión
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [mine, setMine] = useState<MineData | null>(null);
    const [history, setHistory] = useState<any[] | null>(null);
    const [tab, setTab] = useState<Tab>(initialTab);

    const [redeemTarget, setRedeemTarget] = useState<Reward | null>(null);
    const [redeemState, setRedeemState] = useState<'idle' | 'loading' | 'done'>('idle');
    const [redeemError, setRedeemError] = useState<string | null>(null);
    const [showLevels, setShowLevels] = useState(false);
    const [levelUp, setLevelUp] = useState<Level | null>(null);
    const [season, setSeason] = useState<any>(null);
    const [toast, setToast] = useState<string | null>(null);
    const tabsRef = useRef<HTMLDivElement>(null);

    const say = (msg: string) => {
        setToast(msg);
        window.setTimeout(() => setToast(null), 2800);
    };

    const loadMine = useCallback(async (): Promise<MineData | null> => {
        try {
            const r = await fetch(`/api/public/${slug}/loyalty/my-rewards`);
            if (r.ok) {
                const d = await r.json();
                setMine(d);
                return d;
            }
        } catch { /* sin conexión: se reintenta al cambiar de pestaña */ }
        return null;
    }, [slug]);

    const loadAll = useCallback(async () => {
        try {
            const [qRes, meRes, rRes] = await Promise.all([
                fetch(`/api/public/${slug}/misiones`).catch(() => null),
                fetch(`/api/${slug}/referrals/me?t=${Date.now()}`).catch(() => null),
                fetch(`/api/public/${slug}/loyalty/rewards`).catch(() => null),
            ]);
            if (qRes?.ok) {
                const q = await qRes.json();
                setQuests(q.todas || []);
                setGami(q.gamification || null);
            }
            if (meRes?.ok) {
                setMe(await meRes.json());
                loadMine();
            } else {
                setMe(null);
            }
            if (rRes?.ok) {
                const r = await rRes.json();
                setRewards(Array.isArray(r) ? r.filter((x: Reward) => Number(x.costoPuntos) >= 0) : []);
            }
        } finally {
            setLoading(false);
        }
    }, [slug, loadMine]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const loyalty = gami?.loyaltyStatus;
    const loggedIn = !!me;
    const puntos: number = loggedIn ? Number(loyalty?.diamantes ?? me?.puntos ?? 0) : 0;
    const cashback: number = Number(loyalty?.cashback ?? me?.cashback ?? 0);
    const streak: number = Number(gami?.streak || 0);
    const levels: Level[] = (loyalty?.todosLosNiveles || []) as Level[];
    const level: Level | null = loyalty?.nivelActual || null;
    const nextLevel = loyalty?.siguienteNivel || null;
    const nombre = me?.nombreCliente && me.nombreCliente !== 'Cliente' ? String(me.nombreCliente).split(' ')[0] : null;

    // Animaciones pendientes: subida de nivel real (no el nivel inicial) o temporada nueva
    useEffect(() => {
        if (!loggedIn || !loyalty) return;
        const lowest = levels.length ? Math.min(...levels.map((l) => Number(l.orden ?? 0))) : 0;
        if (loyalty.mostrarAnimacionNivel && loyalty.nivelActual) {
            if (Number(loyalty.nivelActual.orden ?? 0) > lowest) setLevelUp(loyalty.nivelActual);
            else fetch(`/api/public/${slug}/loyalty/ver-nivel`, { method: 'POST' }).catch(() => {});
        } else if (loyalty.mostrarModalTemporada && loyalty.temporadaActiva) {
            setSeason(loyalty.temporadaActiva);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loggedIn, loyalty?.mostrarAnimacionNivel, loyalty?.mostrarModalTemporada]);

    useEffect(() => {
        if (tab === 'mis-premios' && loggedIn && history === null) {
            fetch(`/api/public/${slug}/loyalty/history`)
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => setHistory(d?.history || []))
                .catch(() => setHistory([]));
        }
    }, [tab, loggedIn, history, slug]);

    // ---------- Camino de premios ----------
    const sortedRewards = useMemo(() => [...rewards].sort((a, b) => a.costoPuntos - b.costoPuntos), [rewards]);
    const trackStops = sortedRewards.slice(0, 5);
    const nextGoal = sortedRewards.find((r) => r.costoPuntos > puntos) || null;
    const affordable = sortedRewards.filter((r) => r.costoPuntos <= puntos);
    const prevCost = nextGoal ? (sortedRewards.filter((r) => r.costoPuntos < nextGoal.costoPuntos).pop()?.costoPuntos ?? 0) : 0;

    const markerPct = useMemo(() => {
        const n = trackStops.length;
        if (!n) return 0;
        let prev = 0;
        for (let i = 0; i < n; i++) {
            const c = trackStops[i].costoPuntos;
            if (puntos < c) {
                const frac = c > prev ? (puntos - prev) / (c - prev) : 0;
                return ((i + Math.max(0, frac)) / n) * 100;
            }
            prev = c;
        }
        return 100;
    }, [trackStops, puntos]);

    // ---------- Misiones ----------
    const pct = (q: Quest) => Math.min(100, (Number(q.progresoActual || 0) / Math.max(1, Number(q.progresoRequerido || 1))) * 100);
    const activas = quests
        .filter((q) => q.estado === 'EN_PROGRESO' || q.estado === 'PENDIENTE_APROBACION')
        .sort((a, b) => pct(b) - pct(a));
    const logradas = quests.filter((q) => q.estado === 'COMPLETADA' || q.estado === 'RECLAMADA');
    const misPremiosCount = (mine?.disponibles.length || 0) + (mine?.pendientesEntrega.length || 0);

    const goTab = (t: Tab) => {
        setTab(t);
        requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };

    const login = () => router.push(`/${slug}/perfil`);

    const confirmQuest = async (q: Quest) => {
        if (!loggedIn) return login();
        const r = await fetch(`/api/public/${slug}/misiones/${q.id}/confirmar`, { method: 'POST' }).catch(() => null);
        const d = r ? await r.json().catch(() => ({})) : {};
        if (r?.ok && d.success !== false) {
            say('Listo. El local revisará tu misión.');
            loadAll();
        } else {
            say(d.error || 'No pudimos enviar tu misión. Intenta otra vez.');
        }
    };

    const redeem = async () => {
        if (!redeemTarget) return;
        setRedeemState('loading');
        setRedeemError(null);
        try {
            const r = await fetch(`/api/public/${slug}/loyalty/rewards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rewardId: redeemTarget.id }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) {
                setRedeemError(d.error || 'No se pudo canjear este premio.');
                setRedeemState('idle');
                return;
            }
            setRedeemState('done');
            loadAll();
        } catch {
            setRedeemError('Sin conexión. Revisa tu internet e intenta otra vez.');
            setRedeemState('idle');
        }
    };

    const closeRedeem = () => {
        setRedeemTarget(null);
        setRedeemState('idle');
        setRedeemError(null);
    };

    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center" style={{ color: brand }}>
                <Loader2 className="w-7 h-7 animate-spin" />
            </div>
        );
    }

    const LevelIcon = level?.icono && ICONS[level.icono] ? ICONS[level.icono] : Award;
    const clubVacio = rewards.length === 0 && quests.length === 0;

    return (
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-28 md:pt-[104px] text-slate-900" style={{ ['--brand' as any]: brand }}>
            {/* Encabezado */}
            <div className="flex items-center gap-2 mb-3">
                <button
                    onClick={() => router.push(`/${slug}`)}
                    aria-label="Volver"
                    className="w-9 h-9 rounded-full bg-white ring-1 ring-slate-200 flex items-center justify-center text-slate-700 md:hidden"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold tracking-tight flex-1 truncate">Club {negocioNombre}</h1>
                {loggedIn && (
                    <button
                        onClick={() => goTab('mis-premios')}
                        aria-label="Ver mis premios y movimientos"
                        className="flex items-center gap-1.5 text-sm font-medium text-slate-600 w-9 h-9 sm:w-auto sm:px-3 justify-center rounded-full bg-white ring-1 ring-slate-200"
                    >
                        <History className="w-4 h-4" /> <span className="hidden sm:inline">Movimientos</span>
                    </button>
                )}
            </div>

            {/* ===== Tarjeta del club con el camino de premios ===== */}
            <section
                className="relative overflow-hidden rounded-[28px] text-white p-5 pb-6"
                style={{ background: `radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, ${brand} 70%, transparent) 0%, transparent 60%), ${INK}` }}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-white/70 text-sm">{loggedIn ? (nombre ? `Hola, ${nombre}` : 'Hola') : `Únete al club de ${negocioNombre}`}</p>
                        <p className="mt-1 flex items-baseline gap-2">
                            <span className={`text-5xl font-extrabold tracking-tight tabular-nums ${loggedIn ? '' : 'text-white/40'}`}>{fmt(puntos)}</span>
                            <span className="text-white/70 font-medium">puntos</span>
                        </p>
                    </div>
                    {loggedIn && level && (
                        <button
                            onClick={() => setShowLevels(true)}
                            className="shrink-0 flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/15"
                        >
                            <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: level.color || GOLD }}>
                                <LevelIcon className="w-4 h-4 text-white" />
                            </span>
                            <span className="text-sm font-semibold">{level.nombre}</span>
                        </button>
                    )}
                </div>

                {(streak > 0 || cashback > 0) && loggedIn && (
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        {streak > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10">
                                <Flame className="w-4 h-4 text-orange-300" /> Racha de {streak}
                            </span>
                        )}
                        {cashback > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10">
                                <Wallet className="w-4 h-4 text-emerald-300" /> {money(cashback)} de saldo
                            </span>
                        )}
                    </div>
                )}

                {/* Camino */}
                {trackStops.length > 0 && (
                    <div className="mt-6" aria-label="Camino de premios">
                        <div className="relative h-11 mx-3">
                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/15" />
                            <div
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full transition-[width] duration-1000 ease-out"
                                style={{ width: `${markerPct}%`, background: `linear-gradient(90deg, ${brand}, ${GOLD})` }}
                            />
                            {trackStops.map((r, i) => {
                                const reached = loggedIn && puntos >= r.costoPuntos;
                                const isNext = nextGoal?.id === r.id;
                                return (
                                    <button
                                        key={r.id}
                                        onClick={() => goTab('premios')}
                                        title={r.nombre}
                                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                                        style={{ left: `${((i + 1) / trackStops.length) * 100}%` }}
                                    >
                                        <span
                                            className={`flex items-center justify-center rounded-full transition ${isNext ? 'w-10 h-10 ring-4 ring-white/15' : 'w-8 h-8'}`}
                                            style={reached ? { backgroundColor: GOLD, color: INK } : { backgroundColor: INK, color: isNext ? GOLD : 'rgba(255,255,255,.55)', boxShadow: `inset 0 0 0 2px ${isNext ? GOLD : 'rgba(255,255,255,.25)'}` }}
                                        >
                                            {reached ? <Check className="w-4 h-4" strokeWidth={3} /> : <Gift className={isNext ? 'w-5 h-5' : 'w-4 h-4'} />}
                                        </span>
                                    </button>
                                );
                            })}
                            {loggedIn && markerPct < 100 && (
                                <span
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,.18)] transition-[left] duration-1000 ease-out"
                                    style={{ left: `${markerPct}%` }}
                                    aria-label={`Tú: ${puntos} puntos`}
                                />
                            )}
                        </div>
                        <div className="relative h-5 mx-3 text-xs text-white/60 tabular-nums">
                            <span className="absolute left-0 -translate-x-1/2">0</span>
                            {trackStops.map((r, i) => (
                                <span key={r.id} className="absolute -translate-x-1/2" style={{ left: `${((i + 1) / trackStops.length) * 100}%` }}>
                                    {fmt(r.costoPuntos)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mensaje de meta */}
                <div className="mt-4">
                    {!loggedIn ? (
                        <>
                            <p className="text-[15px] leading-snug text-white/85">
                                Gana puntos cada vez que vienes y cámbialos por premios. Es gratis y solo necesitas tu número de WhatsApp.
                            </p>
                            <button onClick={login} className="mt-4 w-full py-3.5 rounded-2xl font-semibold" style={{ backgroundColor: GOLD, color: INK }}>
                                Unirme gratis
                            </button>
                        </>
                    ) : affordable.length > 0 ? (
                        <>
                            <p className="text-[15px] leading-snug text-white/85">
                                {affordable.length === 1
                                    ? <>Ya te alcanza para <b className="text-white">{affordable[0].nombre}</b>.</>
                                    : <>Ya te alcanza para <b className="text-white">{affordable.length} premios</b>.</>}
                                {nextGoal && <> Si sigues, en {fmt(nextGoal.costoPuntos - puntos)} puntos llegas a {nextGoal.nombre}.</>}
                            </p>
                            <button onClick={() => goTab('premios')} className="mt-4 w-full py-3.5 rounded-2xl font-semibold" style={{ backgroundColor: GOLD, color: INK }}>
                                Canjear ahora
                            </button>
                        </>
                    ) : nextGoal ? (
                        <>
                            <p className="text-[15px] leading-snug text-white/85">
                                Te faltan <b className="text-white tabular-nums">{fmt(nextGoal.costoPuntos - puntos)} puntos</b> para <b className="text-white">{nextGoal.nombre}</b>.
                            </p>
                            <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.max(4, ((puntos - prevCost) / Math.max(1, nextGoal.costoPuntos - prevCost)) * 100)}%`, backgroundColor: GOLD }} />
                            </div>
                            <button onClick={() => goTab('misiones')} className="mt-4 w-full py-3.5 rounded-2xl font-semibold bg-white text-slate-900">
                                Cómo ganar puntos
                            </button>
                        </>
                    ) : (
                        <p className="text-[15px] leading-snug text-white/85">
                            {clubVacio ? 'El club está por abrir. Muy pronto verás aquí tus premios.' : 'Sigue sumando puntos: el local publicará nuevos premios.'}
                        </p>
                    )}
                </div>
            </section>

            {/* ===== Nivel ===== */}
            {loggedIn && level && (
                <button onClick={() => setShowLevels(true)} className="mt-3 w-full text-left bg-white rounded-2xl ring-1 ring-slate-200 px-4 py-3.5 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${level.color || GOLD} 18%, white)`, color: level.color || GOLD }}>
                        <LevelIcon className="w-5 h-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold">
                            {nextLevel?.level ? <>Nivel {level.nombre} · faltan {fmt(nextLevel.diamondsNeeded)} para {nextLevel.level.nombre}</> : <>Nivel {level.nombre}: el más alto</>}
                        </span>
                        {nextLevel?.level && (
                            <span className="mt-1.5 block h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <span className="block h-full rounded-full" style={{ width: `${Math.max(3, Number(nextLevel.progressPercent || 0))}%`, backgroundColor: nextLevel.level.color || brand }} />
                            </span>
                        )}
                    </span>
                    <span className="text-sm font-medium" style={{ color: brand }}>Beneficios</span>
                </button>
            )}

            {/* ===== Pestañas ===== */}
            <div ref={tabsRef} className="sticky top-0 md:top-[88px] z-30 -mx-4 px-4 pt-4 pb-2 bg-slate-50/95 backdrop-blur scroll-mt-0">
                <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-200/60" role="tablist">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            role="tab"
                            aria-selected={tab === t.id}
                            onClick={() => setTab(t.id)}
                            className={`relative py-2 rounded-xl text-[13px] font-semibold transition ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                        >
                            {t.label}
                            {t.id === 'mis-premios' && misPremiosCount > 0 && (
                                <span className="absolute -top-1 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] leading-[18px] text-white" style={{ backgroundColor: brand }}>
                                    {misPremiosCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-2">
                {tab === 'misiones' && (
                    <MisionesTab
                        activas={activas}
                        logradas={logradas}
                        loggedIn={loggedIn}
                        brand={brand}
                        pct={pct}
                        onConfirm={confirmQuest}
                        onLogin={login}
                        onInvite={() => setTab('invitar')}
                    />
                )}
                {tab === 'premios' && (
                    <PremiosTab rewards={sortedRewards} puntos={puntos} loggedIn={loggedIn} brand={brand} onRedeem={setRedeemTarget} onLogin={login} />
                )}
                {tab === 'mis-premios' && (
                    loggedIn ? (
                        <MisPremiosPanel
                            slug={slug}
                            brand={brand}
                            mine={mine}
                            history={history}
                            cashback={cashback}
                            focusQuestId={focusQuestId}
                            onChanged={loadMine}
                            onGoPremios={() => setTab('premios')}
                        />
                    ) : (
                        <Empty icon={Ticket} title="Tus premios aparecen aquí" text="Únete al club para guardar los premios que ganes." action={<button onClick={login} className="px-5 py-2.5 rounded-xl text-white font-semibold" style={{ backgroundColor: brand }}>Unirme gratis</button>} />
                    )
                )}
                {tab === 'invitar' && (
                    <InvitarTab me={me} loggedIn={loggedIn} brand={brand} slug={slug} negocioNombre={negocioNombre} onLogin={login} onDone={(m) => { say(m); loadAll(); }} />
                )}
            </div>

            {/* ===== Hoja: canjear ===== */}
            {redeemTarget && (
                <Sheet onClose={closeRedeem}>
                    {redeemState === 'done' ? (
                        <div className="text-center py-2">
                            <span className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: GOLD, color: INK }}>
                                <Gift className="w-8 h-8" />
                            </span>
                            <h3 className="mt-4 text-xl font-bold">¡Es tuyo!</h3>
                            <p className="mt-1 text-slate-600">{redeemTarget.nombre} ya está en Mis premios. Muéstralo en el local para usarlo.</p>
                            <button
                                onClick={() => { closeRedeem(); setTab('mis-premios'); }}
                                className="mt-5 w-full py-3.5 rounded-2xl text-white font-semibold"
                                style={{ backgroundColor: brand }}
                            >
                                Ver mis premios
                            </button>
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-lg font-bold pr-8">{redeemTarget.nombre}</h3>
                            {redeemTarget.descripcion && <p className="mt-1 text-slate-600">{redeemTarget.descripcion}</p>}
                            <div className="mt-4 rounded-2xl bg-slate-50 p-4 space-y-2 text-sm tabular-nums">
                                <div className="flex justify-between"><span className="text-slate-500">Tus puntos</span><span className="font-semibold">{fmt(puntos)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Este premio</span><span className="font-semibold">−{fmt(redeemTarget.costoPuntos)}</span></div>
                                <div className="flex justify-between border-t border-slate-200 pt-2"><span className="text-slate-500">Te quedan</span><span className="font-bold">{fmt(puntos - redeemTarget.costoPuntos)}</span></div>
                            </div>
                            <p className="mt-3 text-xs text-slate-500">Canjear no baja tu nivel: el nivel cuenta todos los puntos que has ganado.</p>
                            {redeemError && <p className="mt-3 text-sm text-rose-600">{redeemError}</p>}
                            <button
                                onClick={redeem}
                                disabled={redeemState === 'loading'}
                                className="mt-4 w-full py-3.5 rounded-2xl text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                                style={{ backgroundColor: brand }}
                            >
                                {redeemState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                                Canjear por {fmt(redeemTarget.costoPuntos)} puntos
                            </button>
                        </div>
                    )}
                </Sheet>
            )}

            {/* ===== Hoja: niveles ===== */}
            {showLevels && (
                <Sheet onClose={() => setShowLevels(false)}>
                    <h3 className="text-lg font-bold">Niveles del club</h3>
                    <p className="mt-1 text-sm text-slate-600">Subes de nivel con todos los puntos que ganas. Canjear premios no te baja de nivel.</p>
                    <ol className="mt-4 space-y-2">
                        {levels.map((l) => {
                            const Ico = l.icono && ICONS[l.icono] ? ICONS[l.icono] : Award;
                            const current = level?.id === l.id;
                            const reached = Number(loyalty?.experiencia || 0) >= Number(l.diamantesRequeridos || 0);
                            const beneficios = Array.isArray(l.beneficios) ? l.beneficios.filter(Boolean) : [];
                            return (
                                <li key={l.id} className={`rounded-2xl p-3.5 flex gap-3 ${current ? 'ring-2' : 'ring-1 ring-slate-200'}`} style={current ? { ['--tw-ring-color' as any]: l.color || brand } : undefined}>
                                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${reached ? 'text-white' : 'text-slate-400 bg-slate-100'}`} style={reached ? { backgroundColor: l.color || brand } : undefined}>
                                        {reached ? <Ico className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="font-semibold">
                                            {l.nombre}
                                            <span className="ml-2 text-xs font-normal text-slate-500 tabular-nums">desde {fmt(Number(l.diamantesRequeridos || 0))} pts</span>
                                            {current && <span className="ml-2 text-xs font-semibold" style={{ color: l.color || brand }}>Estás aquí</span>}
                                        </p>
                                        {beneficios.length > 0 ? (
                                            <ul className="mt-1 text-sm text-slate-600 space-y-0.5">
                                                {beneficios.map((b, i) => <li key={i}>{b}</li>)}
                                            </ul>
                                        ) : (
                                            <p className="mt-1 text-sm text-slate-500">Acumulas puntos en cada visita.</p>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </Sheet>
            )}

            {/* ===== Celebración: subiste de nivel ===== */}
            {levelUp && (
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(15,12,30,.82)' }}>
                    <div className="w-full max-w-sm rounded-[28px] p-6 text-center text-white" style={{ background: `radial-gradient(100% 70% at 50% 0%, ${levelUp.color || brand} 0%, ${INK} 70%)` }}>
                        <span className="mx-auto w-20 h-20 rounded-full flex items-center justify-center ring-8 ring-white/10 motion-safe:animate-[club-pop_.6s_ease-out]" style={{ backgroundColor: levelUp.color || GOLD }}>
                            {(() => { const I = levelUp.icono && ICONS[levelUp.icono] ? ICONS[levelUp.icono] : Crown; return <I className="w-10 h-10" />; })()}
                        </span>
                        <p className="mt-5 text-white/70">Subiste de nivel</p>
                        <h3 className="text-3xl font-extrabold tracking-tight">{levelUp.nombre}</h3>
                        {Array.isArray(levelUp.beneficios) && levelUp.beneficios.length > 0 && (
                            <ul className="mt-4 text-left text-sm space-y-1.5 bg-white/10 rounded-2xl p-4">
                                {levelUp.beneficios.map((b, i) => (
                                    <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: GOLD }} />{b}</li>
                                ))}
                            </ul>
                        )}
                        <button
                            onClick={() => { setLevelUp(null); fetch(`/api/public/${slug}/loyalty/ver-nivel`, { method: 'POST' }).catch(() => {}); }}
                            className="mt-6 w-full py-3.5 rounded-2xl font-semibold"
                            style={{ backgroundColor: GOLD, color: INK }}
                        >
                            Seguir sumando
                        </button>
                    </div>
                    <style>{`@keyframes club-pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}`}</style>
                </div>
            )}

            {/* ===== Temporada nueva ===== */}
            {season && !levelUp && (
                <Sheet onClose={() => { setSeason(null); fetch(`/api/public/${slug}/loyalty/ver-temporada`, { method: 'POST' }).catch(() => {}); }}>
                    <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: brand }}>
                        <Calendar className="w-6 h-6" />
                    </span>
                    <h3 className="mt-3 text-lg font-bold">Empezó {season.nombre || 'una nueva temporada'}</h3>
                    <p className="mt-1 text-slate-600">{season.descripcion || 'Hay nuevas metas para ganar puntos. Tus puntos para canjear se mantienen.'}</p>
                    <button
                        onClick={() => { setSeason(null); fetch(`/api/public/${slug}/loyalty/ver-temporada`, { method: 'POST' }).catch(() => {}); }}
                        className="mt-5 w-full py-3.5 rounded-2xl text-white font-semibold"
                        style={{ backgroundColor: brand }}
                    >
                        Entendido
                    </button>
                </Sheet>
            )}

            {toast && (
                <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-[10002] px-4 py-3 rounded-2xl text-sm text-white shadow-lg max-w-[90vw]" style={{ backgroundColor: INK }}>
                    {toast}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-[10000] bg-black/45 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                className="relative w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] p-5 pb-8 max-h-[88vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <X className="w-4 h-4" />
                </button>
                {children}
            </div>
        </div>
    );
}

function Empty({ icon: Icon, title, text, action }: { icon: any; title: string; text: string; action?: React.ReactNode }) {
    return (
        <div className="text-center py-10 px-6">
            <span className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center"><Icon className="w-6 h-6" /></span>
            <p className="mt-3 font-semibold">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

function MisionesTab({
    activas, logradas, loggedIn, brand, pct, onConfirm, onLogin, onInvite,
}: {
    activas: Quest[]; logradas: Quest[]; loggedIn: boolean; brand: string; pct: (q: Quest) => number;
    onConfirm: (q: Quest) => void; onLogin: () => void; onInvite: () => void;
}) {
    const [showDone, setShowDone] = useState(false);
    if (!activas.length && !logradas.length) {
        return <Empty icon={Target} title="Aún no hay misiones" text="Cuando el local publique misiones, aquí verás cómo ganar más puntos." />;
    }
    return (
        <div className="space-y-2.5">
            {!loggedIn && (
                <button onClick={onLogin} className="w-full rounded-2xl p-3.5 text-left text-sm bg-white ring-1 ring-slate-200 flex items-center gap-3">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="flex-1">Únete al club para que tus visitas empiecen a contar.</span>
                    <span className="font-semibold" style={{ color: brand }}>Unirme</span>
                </button>
            )}
            {activas.map((q) => {
                const Ico = ICONS[q.icono] || Award;
                const p = pct(q);
                const falta = Math.max(0, Number(q.progresoRequerido) - Number(q.progresoActual));
                const revision = q.estado === 'PENDIENTE_APROBACION';
                const manual = q.validacionTipo === 'MANUAL';
                const isReferral = /amig|recomend|invit|refer/i.test(`${q.nombre} ${q.descripcion}`);
                return (
                    <article key={q.id} className="bg-white rounded-2xl ring-1 ring-slate-200 p-4">
                        <div className="flex gap-3">
                            <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${q.color || brand} 14%, white)`, color: q.color || brand }}>
                                <Ico className="w-5 h-5" />
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-semibold leading-snug">{q.nombre}</h3>
                                    <span className="shrink-0 text-sm font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: '#FEF3D7', color: '#8A5A00' }}>
                                        {q.recompensas[0]?.replace(/ puntos$/, ' pts')}
                                    </span>
                                </div>
                                {q.descripcion && <p className="mt-0.5 text-sm text-slate-500 leading-snug">{q.descripcion}</p>}
                            </div>
                        </div>
                        {Number(q.progresoRequerido) > 1 && (
                            <div className="mt-3 flex items-center gap-3">
                                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${Math.max(p, 3)}%`, backgroundColor: q.color || brand }} />
                                </div>
                                <span className="text-xs text-slate-500 tabular-nums">{q.unit === '$' ? `$${q.progresoActual} de $${q.progresoRequerido}` : `${q.progresoActual} de ${q.progresoRequerido}`}</span>
                            </div>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                            {revision ? (
                                <span className="inline-flex items-center gap-1.5 text-amber-700"><Clock className="w-4 h-4" /> El local está revisando</span>
                            ) : p > 0 && falta > 0 ? (
                                <span className="text-slate-600">{falta === 1 ? '¡Te falta solo 1!' : `Te faltan ${falta}`}</span>
                            ) : (
                                <span className="text-slate-500">{(q.recompensas.slice(1).join(' · ')) || 'Se suma sola cuando la cumples'}</span>
                            )}
                            {!revision && manual && (
                                <button onClick={() => onConfirm(q)} className="shrink-0 px-3.5 py-2 rounded-xl font-semibold text-white" style={{ backgroundColor: brand }}>
                                    Ya lo hice
                                </button>
                            )}
                            {!revision && !manual && isReferral && loggedIn && (
                                <button onClick={onInvite} className="shrink-0 px-3.5 py-2 rounded-xl font-semibold ring-1 ring-slate-200">Invitar</button>
                            )}
                        </div>
                    </article>
                );
            })}

            {logradas.length > 0 && (
                <div className="pt-2">
                    <button onClick={() => setShowDone((v) => !v)} className="w-full flex items-center justify-between py-2 text-sm font-semibold text-slate-600">
                        <span className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Misiones logradas ({logradas.length})</span>
                        <ChevronDown className={`w-4 h-4 transition ${showDone ? 'rotate-180' : ''}`} />
                    </button>
                    {showDone && (
                        <ul className="space-y-1.5">
                            {logradas.map((q) => (
                                <li key={q.id} className="flex items-center gap-3 bg-white rounded-xl ring-1 ring-slate-200 px-3.5 py-2.5 text-sm">
                                    <Check className="w-4 h-4 text-emerald-600" />
                                    <span className="flex-1">{q.nombre}</span>
                                    <span className="text-slate-500">{q.recompensas[0]}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

function PremiosTab({
    rewards, puntos, loggedIn, brand, onRedeem, onLogin,
}: {
    rewards: Reward[]; puntos: number; loggedIn: boolean; brand: string; onRedeem: (r: Reward) => void; onLogin: () => void;
}) {
    if (!rewards.length) {
        return <Empty icon={Gift} title="Todavía no hay premios" text="El local aún no publica premios. Tus puntos se guardan para cuando lleguen." />;
    }
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {rewards.map((r) => {
                const img = rewardImage(r);
                const can = loggedIn && puntos >= r.costoPuntos;
                const falta = Math.max(0, r.costoPuntos - puntos);
                const agotado = typeof r.cantidadDisponible === 'number' && r.cantidadDisponible <= 0;
                const pctR = r.costoPuntos > 0 ? Math.min(100, (puntos / r.costoPuntos) * 100) : 100;
                return (
                    <article key={r.id} className={`bg-white rounded-2xl ring-1 overflow-hidden flex flex-col ${can && !agotado ? 'ring-2' : 'ring-slate-200'}`} style={can && !agotado ? { ['--tw-ring-color' as any]: GOLD } : undefined}>
                        <div className="relative aspect-[4/3] flex items-center justify-center" style={{ background: img ? undefined : `linear-gradient(135deg, color-mix(in srgb, ${brand} 16%, white), #FEF3D7)` }}>
                            {img
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                : <Gift className="w-9 h-9" style={{ color: brand }} />}
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-xs font-bold tabular-nums" style={{ backgroundColor: INK, color: GOLD }}>
                                {fmt(r.costoPuntos)} pts
                            </span>
                        </div>
                        <div className="p-3 flex-1 flex flex-col">
                            <h3 className="text-sm font-semibold leading-snug">{r.nombre}</h3>
                            {typeof r.cantidadDisponible === 'number' && r.cantidadDisponible > 0 && r.cantidadDisponible <= 10 && (
                                <p className="text-xs text-rose-600 mt-0.5">Quedan {r.cantidadDisponible}</p>
                            )}
                            <div className="mt-auto pt-3">
                                {agotado ? (
                                    <p className="text-xs text-slate-500">Agotado</p>
                                ) : !loggedIn ? (
                                    <button onClick={onLogin} className="w-full py-2 rounded-xl text-sm font-semibold ring-1 ring-slate-200">Unirme</button>
                                ) : can ? (
                                    <button onClick={() => onRedeem(r)} className="w-full py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: GOLD, color: INK }}>Canjear</button>
                                ) : (
                                    <>
                                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${Math.max(pctR, 3)}%`, backgroundColor: brand }} />
                                        </div>
                                        <p className="mt-1.5 text-xs text-slate-500 tabular-nums">Faltan {fmt(falta)} pts</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

function InvitarTab({
    me, loggedIn, brand, slug, negocioNombre, onLogin, onDone,
}: {
    me: any; loggedIn: boolean; brand: string; slug: string; negocioNombre: string; onLogin: () => void; onDone: (msg: string) => void;
}) {
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [code, setCode] = useState('');
    const [sending, setSending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    if (!loggedIn) {
        return <Empty icon={Users} title="Invita y ganen los dos" text="Únete al club para tener tu código de invitación." action={<button onClick={onLogin} className="px-5 py-2.5 rounded-xl text-white font-semibold" style={{ backgroundColor: brand }}>Unirme gratis</button>} />;
    }

    const url = typeof window !== 'undefined' && me?.codigo ? `${window.location.origin}/r/${me.codigo}` : '';
    const msg = `Te invito a ${negocioNombre}. Usa mi código ${me?.codigo} y gana puntos desde tu primera visita: ${url}`;
    const campañas: any[] = Array.isArray(me?.progresoCampañas) ? me.progresoCampañas : [];

    const copy = () => {
        navigator.clipboard?.writeText(url).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };
    const share = async () => {
        if ((navigator as any).share) {
            try { await (navigator as any).share({ title: negocioNombre, text: msg, url }); return; } catch { /* cancelado */ }
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        setSending(true);
        setErr(null);
        try {
            const r = await fetch(`/api/${slug}/referrals/code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigoReferido: code.trim() }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) { setErr(d.error || 'Ese código no es válido.'); return; }
            setCode('');
            onDone(`Listo. Te invitó ${d.referidoPor || 'tu amigo'}.`);
        } catch {
            setErr('Sin conexión. Intenta otra vez.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-3">
            <section className="rounded-[24px] p-5 text-white" style={{ backgroundColor: brand }}>
                <p className="text-white/80 text-sm">Tu código</p>
                <p className="text-3xl font-extrabold tracking-[0.08em] font-mono">{me?.codigo}</p>
                <p className="mt-2 text-[15px] leading-snug text-white/90">
                    Cuando tu amigo haga su primera visita, ganan los dos.
                    {Number(me?.totalReferidosValidos) > 0 && <> Ya invitaste a {me.totalReferidosValidos}.</>}
                </p>
                <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
                    <button onClick={share} className="py-3 rounded-2xl bg-white font-semibold flex items-center justify-center gap-2" style={{ color: INK }}>
                        <MessageCircle className="w-4 h-4" /> Enviar invitación
                    </button>
                    <button onClick={copy} aria-label="Copiar enlace" className="w-12 rounded-2xl bg-white/15 flex items-center justify-center">
                        {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setShowQr((v) => !v)} aria-label="Mostrar código QR" className="w-12 rounded-2xl bg-white/15 flex items-center justify-center">
                        <QrCode className="w-5 h-5" />
                    </button>
                </div>
                {showQr && url && (
                    <div className="mt-4 bg-white rounded-2xl p-4 flex flex-col items-center">
                        <QRCodeSVG value={url} size={180} fgColor={INK} />
                        <p className="mt-2 text-xs text-slate-500">Tu amigo lo escanea con la cámara</p>
                    </div>
                )}
            </section>

            {campañas.length > 0 && (
                <section className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 space-y-3">
                    {campañas.slice(0, 3).map((c: any, i: number) => {
                        const meta = Number(c.referidosRequeridos || 0);
                        const act = Number(c.progreso || 0);
                        return (
                            <div key={c.campaignId || i}>
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">{c.nombre || 'Invita amigos'}</span>
                                    {meta > 0 && <span className="text-slate-500 tabular-nums">{act} de {meta}</span>}
                                </div>
                                {meta > 0 && (
                                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (act / meta) * 100)}%`, backgroundColor: brand }} />
                                    </div>
                                )}
                                {c.valorRecompensa && <p className="mt-1 text-xs text-slate-500">Premio: {c.valorRecompensa}</p>}
                            </div>
                        );
                    })}
                </section>
            )}

            {!me?.referidoPorNombre ? (
                <form onSubmit={submit} className="bg-white rounded-2xl ring-1 ring-slate-200 p-4">
                    <label htmlFor="ref-code" className="text-sm font-semibold">¿Te invitó alguien?</label>
                    <p className="text-sm text-slate-500">Escribe su código y los dos suman puntos.</p>
                    <div className="mt-3 flex gap-2">
                        <input
                            id="ref-code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="Ej. ANA123"
                            className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono uppercase"
                        />
                        <button disabled={sending || !code.trim()} className="px-4 rounded-xl text-white font-semibold disabled:opacity-50" style={{ backgroundColor: brand }}>
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Usar'}
                        </button>
                    </div>
                    {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
                </form>
            ) : (
                <p className="text-sm text-slate-500 px-1">Te invitó {me.referidoPorNombre}.</p>
            )}
        </div>
    );
}

