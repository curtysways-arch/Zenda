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
    Check
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
}

interface QuestDetalleClientProps {
    slug: string;
    id: string;
    primaryColor: string;
    textColor: string;
    negocioNombre: string;
}

const IconMapper: Record<string, any> = {
    Sparkles: Sparkles,
    CalendarRange: CalendarRange,
    Clock: Clock,
    Instagram: Instagram,
    Users: Users,
    Cake: Cake,
    Crown: Crown,
    Award: Award,
    Gift: Gift,
    Trophy: Trophy,
    Target: Target,
    Zap: Zap,
    Flame: Flame
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
                if (found) {
                    setQuest(found);
                }
            }
            
            const refRes = await fetch(`/api/${slug}/referrals/me`);
            if (refRes.ok) {
                const refData = await refRes.json();
                if (refData?.codigo) {
                    setReferralCode(refData.codigo);
                }
            }
        } catch (e) {
            console.error('Error fetching details:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestDetails();
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
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                    Desafío no encontrado.
                </p>
            </div>
        );
    }

    const IconComponent = IconMapper[quest.icono] || Award;
    const pct = Math.min(100, (quest.progresoActual / quest.progresoRequerido) * 100);

    // Calcular días restantes de forma segura
    let diasRestantesStr = '30 días';
    let fechaFinStr = 'Hasta completar';
    if (quest.fechaFin) {
        const diffTime = Math.abs(new Date(quest.fechaFin).getTime() - new Date().getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        diasRestantesStr = `${diffDays} días`;
        
        const dateObj = new Date(quest.fechaFin);
        fechaFinStr = `Hasta el ${dateObj.getDate()} ${dateObj.toLocaleString('es-ES', { month: 'short' })} ${dateObj.getFullYear()}`;
    }

    return (
        <div className="space-y-5">
            {/* CARD SUPERIOR DEL DESAFÍO */}
            <div 
                className="rounded-[2.5rem] p-6 text-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 space-y-5 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #fff 0%, #fffafb 100%)' }}
            >
                {/* Decoración de fondo */}
                <div 
                    className="absolute -top-16 -right-16 w-36 h-36 rounded-full opacity-[0.08]"
                    style={{ backgroundColor: primaryColor }}
                />

                <span 
                    className="inline-block text-[8px] font-black uppercase tracking-wider px-3 py-1 rounded-full text-white shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                >
                    DESAFÍO ACTIVO
                </span>

                <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5 flex-1">
                        <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-tight">
                            {quest.nombre}
                        </h1>
                        <p className="text-[10px] text-slate-450 font-bold leading-relaxed">
                            {quest.descripcion}
                        </p>
                    </div>

                    {/* Imagen Ilustrativa del Regalo 3D en la Card Principal */}
                    <div className="w-20 h-20 relative flex items-center justify-center shrink-0">
                        <img 
                            src="/images/3d_gift_box.png" 
                            alt="Regalo" 
                            className="w-full h-full object-contain pointer-events-none drop-shadow-md"
                        />
                        <div 
                            className="absolute top-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm"
                            style={{ backgroundColor: quest.color }}
                        >
                            <IconComponent size={14} />
                        </div>
                    </div>
                </div>

                {/* Grid de progreso y tiempo */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                            <Users size={16} />
                        </div>
                        <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">TU PROGRESO</span>
                            <span className="text-sm font-black text-slate-800 block mt-0.5">{quest.progresoActual} / {quest.progresoRequerido}</span>
                            <span className="text-[8px] font-bold text-slate-400 block">completados</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                            <CalendarRange size={16} />
                        </div>
                        <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">TIEMPO RESTANTE</span>
                            <span className="text-sm font-black text-slate-800 block mt-0.5">{diasRestantesStr}</span>
                            <span className="text-[8px] font-bold text-slate-400 block">{fechaFinStr}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN PROGRESO VISUAL PASO A PASO */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    TU PROGRESO
                </h3>

                {/* Render dinámico de pasos en base a la meta */}
                <div className="flex items-center justify-between relative py-2">
                    {/* Línea horizontal gris de fondo */}
                    <div className="absolute left-4 right-4 h-0.5 bg-slate-100 top-1/2 -translate-y-1/2 z-0" />
                    
                    {/* Línea horizontal de progreso activo */}
                    <div 
                        className="absolute left-4 h-0.5 top-1/2 -translate-y-1/2 z-0 transition-all duration-500"
                        style={{ 
                            backgroundColor: primaryColor, 
                            width: `calc(${Math.min(100, (quest.progresoActual / Math.max(1, quest.progresoRequerido - 1)) * 100)}% - 2rem)`
                        }}
                    />

                    {Array.from({ length: Math.min(5, quest.progresoRequerido) }).map((_, idx) => {
                        const stepNum = idx + 1;
                        const isDone = quest.progresoActual >= stepNum;
                        const isCurrent = quest.progresoActual === idx;
                        
                        return (
                            <div key={idx} className="flex flex-col items-center gap-1 z-10 relative">
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm border-2"
                                    style={{ 
                                        backgroundColor: isDone ? primaryColor : '#fff',
                                        color: isDone ? '#fff' : isCurrent ? primaryColor : '#94a3b8',
                                        borderColor: isDone || isCurrent ? primaryColor : '#e2e8f0'
                                    }}
                                >
                                    {isDone ? <Check size={12} strokeWidth={3} /> : stepNum}
                                </div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">
                                    {stepNum} {quest.progresoRequerido === 1 ? 'meta' : 'visita'}
                                </span>
                            </div>
                        );
                    })}

                    <div className="z-10 relative">
                        <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-400 shadow-sm"
                            style={{ color: quest.progresoActual >= quest.progresoRequerido ? primaryColor : undefined }}
                        >
                            <Gift size={16} />
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight block text-center">Premio</span>
                    </div>
                </div>

                <div 
                    className="rounded-2xl p-4 flex gap-3 items-center"
                    style={{ backgroundColor: `${primaryColor}06` }}
                >
                    <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
                    >
                        <Sparkles size={16} />
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold leading-normal">
                        {quest.progresoActual >= quest.progresoRequerido 
                            ? '🎉 ¡Completaste todos los pasos! Ya puedes reclamar tu premio.' 
                            : `Te faltan ${quest.progresoRequerido - quest.progresoActual} pasos para ganar tu premio.`}
                    </p>
                </div>
            </div>

            {/* SECCIÓN ¿CÓMO FUNCIONA? */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    ¿CÓMO FUNCIONA?
                </h3>

                <div className="space-y-4">
                    <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-450">
                            <Share2 size={14} />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">1. Realiza las acciones solicitadas</h4>
                            <p className="text-[9px] text-slate-400 font-bold leading-snug">Completa el número de visitas, consumos o interacciones especificadas arriba.</p>
                        </div>
                    </div>

                    <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-450">
                            <CheckCircle2 size={14} />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">2. Control y Verificación</h4>
                            <p className="text-[9px] text-slate-400 font-bold leading-snug">
                                {quest.validacionTipo === 'USUARIO' 
                                    ? 'Confirma las acciones manualmente presionando el botón "✓ Hacer Desafío".'
                                    : 'El sistema registrará automáticamente tu progreso tras cada consumo/cita.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-450">
                            <Gift size={14} />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">3. Reclama tu recompensa</h4>
                            <p className="text-[9px] text-slate-400 font-bold leading-snug">Una vez completada, podrás canjear tus premios en recepción de forma inmediata.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN PREMIO */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-4 shadow-sm space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                    PREMIO
                </h3>

                <div className="flex gap-3 items-center">
                    {/* Imagen ilustrativa del premio */}
                    <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center">
                        <img 
                            src={quest.imagenUrl || "/images/3d_gift_box.png"} 
                            alt="Premio" 
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as any).src = "/images/3d_gift_box.png" }}
                        />
                    </div>

                    {/* Texto informativo de la ganancia */}
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <div 
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Gift size={12} />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black uppercase tracking-tight text-slate-800">
                                    {quest.recompensas.join(' + ').toUpperCase()}
                                </h4>
                                <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider">¡DISPONIBLE!</span>
                            </div>
                        </div>
                        <p className="text-[9px] text-slate-400 font-semibold leading-normal pt-1">
                            Disfruta de tus recompensas acumuladas tras completar este desafío.
                        </p>
                    </div>
                </div>
            </div>

            {/* BOTÓN COMPARTIR */}
            {referralCode && (
                <button
                    onClick={handleShare}
                    className="w-full py-4 text-white text-xs font-black uppercase tracking-wider shadow-md rounded-[1.75rem] border-0 cursor-pointer active:scale-95 transition-transform flex items-center justify-center gap-2"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Share2 size={16} />
                    {copied ? '¡ENLACE COPIADO!' : 'COMPARTIR MI ENLACE'}
                </button>
            )}
        </div>
    );
}
