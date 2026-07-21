'use client';

import { useState, useEffect } from 'react';
import { 
    Award, 
    Sparkles, 
    CalendarRange, 
    Clock, 
    Instagram, 
    Users, 
    Cake, 
    Crown, 
    CheckCircle2, 
    Loader2,
    ChevronRight,
    Trophy,
    Gift,
    Target,
    Zap,
    Flame,
    Share2,
    Check,
    Percent,
    Scissors,
    ArrowRight,
    ShieldCheck,
    ClipboardList,
    Gem,
    Timer,
    Star
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Quest {
    id: string;
    nombre: string;
    descripcion: string;
    icono: string;
    color: string;
    campaignId: string;
    campañaNombre: string;
    validacionTipo: string;
    progresoActual: number;
    progresoRequerido: number;
    estado: 'EN_PROGRESO' | 'PENDIENTE_APROBACION' | 'COMPLETADA' | 'RECLAMADA';
    recompensas: string[];
    fechaInicio?: string;
    fechaFin?: string;
    imagenUrl?: string;
}

interface QuestDetalleClientProps {
    slug: string;
    id: string;
    primaryColor: string;
    textColor: string;
    negocioNombre: string;
}

const IconMapper: Record<string, any> = {
    Sparkles, CalendarRange, Clock, Instagram, Users, Cake,
    Crown, Award, Gift, Trophy, Target, Zap, Flame
};

export default function QuestDetalleClient({ slug, id, primaryColor, textColor, negocioNombre }: QuestDetalleClientProps) {
    const router = useRouter();
    const [quest, setQuest] = useState<Quest | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [referralCode, setReferralCode] = useState('');

    const fetchQuestDetails = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/public/${slug}/misiones`);
            const data = await res.json();
            if (data.success) {
                const found = (data.todas || []).find((q: any) => q.id === id);
                if (found) setQuest(found);
            }
            const refRes = await fetch(`/api/${slug}/referrals/me`);
            if (refRes.ok) {
                const refData = await refRes.json();
                if (refData?.codigo) setReferralCode(refData.codigo);
            }
        } catch (e) {
            console.error('Error fetching details:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (slug && id) fetchQuestDetails();
    }, [slug, id]);

    const getReferralUrl = () => {
        if (typeof window !== 'undefined' && referralCode) {
            return `${window.location.origin}/r/${referralCode}`;
        }
        return '';
    };

    const handleShare = async () => {
        const url = getReferralUrl();
        if (url) {
            if (navigator.share) {
                await navigator.share({ title: `¡Únete a ${negocioNombre} y gana!`, url });
            } else {
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin" size={24} style={{ color: primaryColor }} />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Cargando detalles...</span>
            </div>
        );
    }

    if (!quest) {
        return (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-sm">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Desafío no encontrado.</p>
            </div>
        );
    }

    const IconComponent = IconMapper[quest.icono] || Award;
    const pct = Math.min(100, (quest.progresoActual / quest.progresoRequerido) * 100);
    const faltanPasos = quest.progresoRequerido - quest.progresoActual;
    const estaCompleto = quest.progresoActual >= quest.progresoRequerido;

    // Días restantes
    let diasRestantesStr = '30 días';
    let fechaFinStr = 'Sin fecha límite';
    if (quest.fechaFin) {
        const diffTime = new Date(quest.fechaFin).getTime() - new Date().getTime();
        const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        diasRestantesStr = diffDays === 0 ? 'Vence hoy' : `${diffDays} día${diffDays !== 1 ? 's' : ''}`;
        const d = new Date(quest.fechaFin);
        fechaFinStr = `Vence el ${d.getDate()} ${d.toLocaleString('es-ES', { month: 'short' })} ${d.getFullYear()}`;
    }

    // Parser de recompensas
    const parseRecompensa = (r: string) => {
        const text = r.toLowerCase();
        let title = r.replace(/^\+\s*/, '').trim();
        let description = 'Beneficio exclusivo para ti';
        let icon = Gift;
        let emoji = '🎁';

        if (text.includes('punto') || text.includes('pts') || text.includes('diamante') || text.includes('gema') || text.includes('💎')) {
            const num = r.match(/\d+/)?.[0] || '100';
            title = `+${num} Diamantes`;
            description = 'Suma diamantes para subir de nivel y canjear más premios.';
            icon = Gem;
            emoji = '💎';
        } else if (text.includes('cupon') || text.includes('cupón') || text.includes('descuento') || text.includes('dto')) {
            const pctMatch = r.match(/(\d+)\s*%/);
            title = pctMatch ? `Cupón de Descuento del ${pctMatch[0]}` : title.charAt(0).toUpperCase() + title.slice(1);
            description = pctMatch
                ? `Cupón exclusivo con un ${pctMatch[0]} de descuento en tus reservas.`
                : 'Cupón con porcentaje de descuento exclusivo en servicios.';
            icon = Percent;
            emoji = '🎟️';
        } else if (text.includes('gratis') || text.includes('masaje') || text.includes('cortesia') || text.includes('corte') || text.includes('servicio')) {
            title = title.charAt(0).toUpperCase() + title.slice(1);
            description = 'Servicio complementario de cortesía sin costo alguno.';
            icon = Scissors;
            emoji = '✂️';
        } else if (text.includes('saldo') || text.includes('$')) {
            const num = r.match(/\d+/)?.[0] || '10';
            title = `+$${num} Saldo Cashback`;
            description = 'Dinero en tu monedero virtual para usar en reservas.';
            icon = Trophy;
            emoji = '💰';
        }

        return { title, description, icon, emoji };
    };

    const steps = [
        {
            num: 1,
            title: 'Realiza las acciones',
            desc: 'Completa el número de visitas, consumos o interacciones indicadas en este desafío.',
            icon: ClipboardList,
        },
        {
            num: 2,
            title: 'Verificación',
            desc: quest.validacionTipo === 'USUARIO'
                ? 'Confirma manualmente presionando el botón "✓ Hacer Desafío" al completar cada acción.'
                : 'El sistema registra tu progreso automáticamente con cada visita o consumo.',
            icon: ShieldCheck,
        },
        {
            num: 3,
            title: '¡Recibe tu premio!',
            desc: 'Al completar todos los pasos, canjea tu recompensa en recepción de forma inmediata.',
            icon: Gift,
        },
    ];

    return (
        <div className="space-y-4 pb-6">

            {/* ══ HERO CARD ══ */}
            <div
                className="rounded-[2rem] overflow-hidden shadow-sm border border-slate-100"
                style={{ background: 'linear-gradient(145deg, #fff 60%, #fdf4f8 100%)' }}
            >
                {/* Franja superior de color */}
                <div className="h-1.5 w-full" style={{ backgroundColor: quest.color }} />

                <div className="p-5 space-y-4">
                    {/* Badge + Título */}
                    <div className="flex items-start gap-4">
                        {/* Ícono grande */}
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2"
                            style={{
                                backgroundColor: `${quest.color}15`,
                                borderColor: `${quest.color}30`,
                                color: quest.color,
                            }}
                        >
                            <IconComponent size={26} className="stroke-[2]" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                            <span
                                className="inline-block text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: quest.color }}
                            >
                                DESAFÍO ACTIVO
                            </span>
                            <h1 className="text-[17px] font-black text-slate-800 leading-tight uppercase tracking-tight">
                                {quest.nombre}
                            </h1>
                            <p className="text-[10.5px] text-slate-500 font-semibold leading-snug">
                                {quest.descripcion}
                            </p>
                        </div>
                    </div>

                    {/* Stats: progreso + tiempo */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div
                            className="rounded-2xl p-3.5 text-left space-y-0.5"
                            style={{ backgroundColor: `${quest.color}0e` }}
                        >
                            <span className="text-[8px] font-black uppercase tracking-widest block" style={{ color: quest.color }}>
                                TU PROGRESO
                            </span>
                            <span className="text-[20px] font-black text-slate-800 leading-none block">
                                {quest.progresoActual}
                                <span className="text-[13px] text-slate-400 font-black"> / {quest.progresoRequerido}</span>
                            </span>
                            <span className="text-[8.5px] text-slate-400 font-bold">
                                {estaCompleto ? '✅ Completado' : `Faltan ${faltanPasos} paso${faltanPasos !== 1 ? 's' : ''}`}
                            </span>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-3.5 text-left space-y-0.5 border border-slate-100">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">
                                TIEMPO RESTANTE
                            </span>
                            <span className="text-[17px] font-black text-slate-800 leading-none block">
                                {diasRestantesStr}
                            </span>
                            <span className="text-[8.5px] text-slate-400 font-bold">{fechaFinStr}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ BARRA DE PROGRESO DETALLADA ══ */}
            <div className="bg-white rounded-[1.8rem] border border-slate-100 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        PROGRESO DEL DESAFÍO
                    </h3>
                    <span
                        className="text-[9px] font-black tabular-nums px-2 py-0.5 rounded-full"
                        style={{ color: quest.color, backgroundColor: `${quest.color}12` }}
                    >
                        {Math.round(pct)}%
                    </span>
                </div>

                {/* Barra gruesa */}
                <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                        style={{ width: `${pct}%`, backgroundColor: quest.color }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]" />
                    </div>
                </div>

                {/* Pasos circulares */}
                <div className="flex items-center justify-between relative pt-1">
                    <div className="absolute left-0 right-0 h-px bg-slate-100 top-[22px] z-0" />
                    {Array.from({ length: Math.min(quest.progresoRequerido, 6) }).map((_, idx) => {
                        const stepNum = idx + 1;
                        const isDone = quest.progresoActual >= stepNum;
                        const isCurrent = quest.progresoActual === idx;
                        return (
                            <div key={idx} className="flex flex-col items-center gap-1 z-10">
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center font-black text-[11px] border-2 transition-all duration-300"
                                    style={{
                                        backgroundColor: isDone ? quest.color : '#fff',
                                        color: isDone ? '#fff' : isCurrent ? quest.color : '#94a3b8',
                                        borderColor: isDone || isCurrent ? quest.color : '#e2e8f0',
                                        boxShadow: isCurrent ? `0 0 0 4px ${quest.color}20` : undefined,
                                    }}
                                >
                                    {isDone ? <Check size={13} strokeWidth={3.5} /> : stepNum}
                                </div>
                                <span className="text-[7px] font-black text-slate-400 uppercase">
                                    {stepNum === quest.progresoRequerido ? 'Meta' : `${stepNum}ª`}
                                </span>
                            </div>
                        );
                    })}
                    {/* Ícono de premio final */}
                    <div className="flex flex-col items-center gap-1 z-10">
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                            style={{
                                backgroundColor: estaCompleto ? quest.color : '#fff',
                                borderColor: estaCompleto ? quest.color : '#e2e8f0',
                                color: estaCompleto ? '#fff' : '#94a3b8',
                            }}
                        >
                            <Gift size={15} />
                        </div>
                        <span className="text-[7px] font-black text-slate-400 uppercase">Premio</span>
                    </div>
                </div>

                {/* Mensaje motivacional */}
                <div
                    className="rounded-xl px-3.5 py-2.5 flex items-center gap-2.5"
                    style={{ backgroundColor: estaCompleto ? `${quest.color}12` : '#f8fafc' }}
                >
                    <span className="text-base leading-none">
                        {estaCompleto ? '🎉' : '⚡'}
                    </span>
                    <p className="text-[10px] font-bold text-slate-600 leading-snug">
                        {estaCompleto
                            ? '¡Completaste todos los pasos! Ya puedes reclamar tu premio.'
                            : `Te faltan ${faltanPasos} paso${faltanPasos !== 1 ? 's' : ''} para ganar tu premio.`}
                    </p>
                </div>
            </div>

            {/* ══ CÓMO FUNCIONA (vertical, sin scroll) ══ */}
            <div className="bg-white rounded-[1.8rem] border border-slate-100 p-5 shadow-sm space-y-3">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    ¿CÓMO FUNCIONA?
                </h3>

                <div className="space-y-0">
                    {steps.map((step, idx) => {
                        const StepIcon = step.icon;
                        const isLast = idx === steps.length - 1;
                        return (
                            <div key={idx} className="flex gap-3">
                                {/* Línea vertical + círculo */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-[11px] text-white z-10"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {step.num}
                                    </div>
                                    {!isLast && (
                                        <div className="w-px flex-1 my-1" style={{ backgroundColor: `${primaryColor}25`, minHeight: 20 }} />
                                    )}
                                </div>

                                {/* Contenido */}
                                <div className={`flex-1 text-left ${!isLast ? 'pb-4' : 'pb-1'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <StepIcon size={13} className="text-slate-400 shrink-0" />
                                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                                            {step.title}
                                        </h4>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-semibold leading-snug">
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ══ PREMIO ══ */}
            <div className="bg-white rounded-[1.8rem] border border-slate-100 p-5 shadow-sm space-y-3">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    TU PREMIO AL COMPLETAR
                </h3>

                <div className="space-y-2">
                    {quest.recompensas.map((recompensa, i) => {
                        const parsed = parseRecompensa(recompensa);
                        const ParsedIcon = parsed.icon;
                        return (
                            <div
                                key={i}
                                className="flex items-center gap-3.5 rounded-2xl p-3.5 border"
                                style={{
                                    backgroundColor: `${primaryColor}08`,
                                    borderColor: `${primaryColor}20`,
                                    borderStyle: 'dashed',
                                }}
                            >
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                                >
                                    <ParsedIcon size={20} className="stroke-[2]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-tight leading-tight">
                                        {parsed.title}
                                    </h4>
                                    <p className="text-[9.5px] text-slate-500 font-semibold leading-snug mt-0.5">
                                        {parsed.description}
                                    </p>
                                </div>
                                <span className="text-xl shrink-0">{parsed.emoji}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Botón de acción */}
                <div className="pt-1">
                    {quest.estado === 'COMPLETADA' || quest.estado === 'RECLAMADA' ? (
                        <button
                            onClick={() => router.push(`/${slug}/mis-premios?questId=${quest.id}`)}
                            className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-white rounded-2xl shadow-md border-0 cursor-pointer active:scale-95 transition-transform flex items-center justify-center gap-2"
                            style={{ backgroundColor: primaryColor }}
                        >
                            🎁 VER MI RECOMPENSA
                            <ArrowRight size={14} className="stroke-[3]" />
                        </button>
                    ) : (
                        <div
                            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 border"
                            style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}20` }}
                        >
                            <span className="text-sm">🔒</span>
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>
                                Completa el desafío para ganar
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ BOTÓN COMPARTIR ══ */}
            {referralCode && (
                <button
                    onClick={handleShare}
                    className="w-full py-4 text-white text-[10px] font-black uppercase tracking-wider shadow-md rounded-[1.75rem] border-0 cursor-pointer active:scale-95 transition-transform flex items-center justify-center gap-2"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Share2 size={16} />
                    {copied ? '¡ENLACE COPIADO! ✓' : 'COMPARTIR MI ENLACE'}
                </button>
            )}
        </div>
    );
}
