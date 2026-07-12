'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Gift, Clock, CheckCircle, AlertTriangle, User, Clipboard, Sparkles, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface UnifiedReward {
    id: string;
    tipoOrigen: 'REFERIDO' | 'PUNTOS' | 'CUPON';
    rewardType: string;
    nombre: string;
    descripcion: string;
    claimCode?: string;
    recompensaImagenUrl?: string;
    fechaAsignacion: string;
    fechaEntrega?: string;
    observaciones?: string;
    estado: string;
    isManual?: boolean;
    descuento?: number;
    tipoDescuento?: string;
    codigo?: string;
    serviceId?: string;
}

export default function MisPremiosPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [rewards, setRewards] = useState<{
        disponibles: UnifiedReward[];
        pendientesEntrega: UnifiedReward[];
        entregados: UnifiedReward[];
        vencidos: UnifiedReward[];
    }>({ disponibles: [], pendientesEntrega: [], entregados: [], vencidos: [] });

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'disponibles' | 'pendientes' | 'entregados' | 'vencidos'>('disponibles');
    const [negocio, setNegocio] = useState<any>(null);
    const [hasSession, setHasSession] = useState<boolean | null>(null);
    const [selectedQR, setSelectedQR] = useState<UnifiedReward | null>(null);

    const primaryColor = negocio?.colorPrimario || '#db2777';
    const textColor = negocio?.colorTexto || '#ffffff';

    const checkSession = async () => {
        try {
            const res = await fetch(`/api/${slug}/auth/session`, { credentials: 'include' });
            const data = await res.json();
            setHasSession(data.active === true);
            if (!data.active) {
                router.push(`/${slug}/perfil`);
            }
        } catch {
            setHasSession(false);
            router.push(`/${slug}/perfil`);
        }
    };

    const fetchRewards = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/public/${slug}/loyalty/my-rewards`);
            if (res.ok) {
                const data = await res.json();
                setRewards(data);
            }
        } catch (e) {
            console.error("Error cargando mis premios:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchBusiness = async () => {
        try {
            const res = await fetch(`/api/public/negocio/${slug}`);
            if (res.ok) {
                const data = await res.json();
                setNegocio(data);
            }
        } catch (e) {
            console.error("Error cargando negocio:", e);
        }
    };

    useEffect(() => {
        if (slug) {
            checkSession();
            fetchBusiness();
        }
    }, [slug]);

    useEffect(() => {
        if (hasSession === true) {
            fetchRewards();
        }
    }, [hasSession]);

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        alert(`¡Código "${code}" copiado al portapapeles!`);
    };

    if (hasSession === null || loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-pink-600 animate-spin" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando tus premios...</p>
                </div>
            </div>
        );
    }

    const activeList = 
        activeTab === 'disponibles' ? rewards.disponibles :
        activeTab === 'pendientes' ? rewards.pendientesEntrega :
        activeTab === 'entregados' ? rewards.entregados :
        rewards.vencidos;

    return (
        <div className="min-h-screen bg-slate-50/50 pb-28">
            {/* Header decorativo */}
            <div className="relative overflow-hidden pt-12 pb-20 px-5 text-white" style={{
                background: `linear-gradient(135deg, ${primaryColor}, color-mix(in srgb, ${primaryColor} 80%, black))`
            }}>
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `radial-gradient(circle at 10% 20%, white 1px, transparent 1px), radial-gradient(circle at 90% 80%, white 2px, transparent 2px)`,
                    backgroundSize: '32px 32px'
                }} />
                
                <div className="max-w-md mx-auto relative z-10 flex items-center justify-between">
                    <button 
                        onClick={() => {
                            if (window.history.length > 1) {
                                router.back();
                            } else {
                                router.push(`/${slug}/perfil`);
                            }
                        }} 
                        className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all border-0 cursor-pointer"
                    >
                        <ArrowLeft size={18} style={{ color: textColor }} />
                    </button>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80">CLUB DE FIDELIDAD</span>
                    <div className="w-9 h-9" />
                </div>

                <div className="max-w-md mx-auto relative z-10 mt-8 text-center space-y-2">
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Mis Premios</h1>
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-85 leading-relaxed">
                        Verifica tus premios disponibles, cupones y tus premios pendientes de reclamo físico.
                    </p>
                </div>
            </div>

            {/* Contenedor Principal */}
            <div className="max-w-md mx-auto px-3 -mt-8 space-y-5 relative z-20">
                {/* Selector de Pestañas */}
                <div className="bg-white rounded-3xl p-1.5 shadow-sm border border-slate-100 flex overflow-x-auto scrollbar-none snap-x gap-1">
                    {[
                        { id: 'disponibles', label: 'Disponibles', count: rewards.disponibles.length },
                        { id: 'pendientes', label: 'Por Reclamar 🎁', count: rewards.pendientesEntrega.length },
                        { id: 'entregados', label: 'Recibidos', count: rewards.entregados.length },
                        { id: 'vencidos', label: 'Vencidos', count: rewards.vencidos.length }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 min-w-[90px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-none flex flex-col items-center gap-1 ${
                                activeTab === tab.id
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600 bg-transparent'
                            }`}
                        >
                            <span>{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                    activeTab === tab.id ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Lista de premios */}
                <div className="space-y-4">
                    {activeList.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm">
                            <Gift className="mx-auto text-slate-300 mb-3" size={36} />
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Sin premios aquí</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1.5 max-w-[240px] mx-auto">
                                Explora las misiones o canjea tus puntos para ganar increíbles sorpresas.
                            </p>
                        </div>
                    ) : (
                        activeList.map((reward) => (
                            <div
                                key={reward.id}
                                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                            reward.tipoOrigen === 'CUPON' ? 'bg-pink-50 text-pink-600' :
                                            reward.tipoOrigen === 'PUNTOS' ? 'bg-amber-50 text-amber-600' :
                                            'bg-indigo-50 text-indigo-600'
                                        }`}>
                                            {reward.tipoOrigen === 'CUPON' ? 'CUPÓN' :
                                             reward.tipoOrigen === 'PUNTOS' ? 'CANJE PUNTOS' : 'CAMPAÑA/REFERIDO'}
                                        </span>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mt-1.5">
                                            {reward.nombre}
                                        </h3>
                                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                            {reward.descripcion}
                                        </p>
                                    </div>

                                    {/* Icono decorativo */}
                                    <div className="size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                        <Gift size={16} />
                                    </div>
                                </div>

                                {/* Contenido condicional según el estado y tipo de premio */}
                                {activeTab === 'disponibles' && (
                                    <div className="pt-3 border-t border-slate-50 flex flex-col gap-2">
                                        {reward.rewardType === 'CUPON' && reward.codigo && (
                                            <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">CÓDIGO DE CUPÓN</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-pink-600 font-mono">{reward.codigo}</span>
                                                    <button
                                                        onClick={() => handleCopyCode(reward.codigo!)}
                                                        className="p-1 rounded-lg bg-white border border-slate-100 text-slate-500 hover:text-slate-700 cursor-pointer"
                                                    >
                                                        <Clipboard size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {reward.rewardType === 'SERVICIO_GRATIS' && (
                                            <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl p-3 text-[10px] font-bold uppercase tracking-wide text-center">
                                                ✂️ Este servicio es GRATIS al reservar
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'pendientes' && reward.claimCode && (
                                    <div className="pt-3 border-t border-slate-50 space-y-3">
                                        <div className="bg-rose-50 text-rose-800 border border-rose-100 rounded-2xl p-3 text-[10px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                                            <Sparkles size={12} className="animate-spin text-rose-600" />
                                            Presenta este premio en el negocio para reclamarlo
                                        </div>
                                        
                                        <div className="flex items-center justify-between gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">CÓDIGO DE RECLAMO</span>
                                                <span className="text-lg font-black text-slate-800 font-mono tracking-wider">{reward.claimCode}</span>
                                            </div>
                                            <button
                                                onClick={() => setSelectedQR(reward)}
                                                className="px-3.5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-slate-800 cursor-pointer"
                                            >
                                                <QrCode size={12} />
                                                Ver QR
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'entregados' && (
                                    <div className="pt-3 border-t border-slate-50 space-y-1 text-[10px] font-semibold text-slate-400">
                                        {reward.fechaEntrega && (
                                            <p className="flex items-center gap-1.5 text-emerald-600 font-bold uppercase">
                                                <CheckCircle size={12} />
                                                Entregado el: {new Date(reward.fechaEntrega).toLocaleDateString('es-ES')}
                                            </p>
                                        )}
                                        {reward.observaciones && (
                                            <p className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-slate-500 font-medium">
                                                Observaciones: {reward.observaciones}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'vencidos' && (
                                    <div className="pt-3 border-t border-slate-50">
                                        <p className="flex items-center gap-1.5 text-rose-600 text-[10px] font-bold uppercase">
                                            <AlertTriangle size={12} />
                                            Premio Expirado / Vencido
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal de Código QR */}
            {selectedQR && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-[340px] bg-white rounded-[2.5rem] p-6 shadow-2xl space-y-4 border border-slate-100 text-center animate-in zoom-in-95 duration-300">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                            Código de Reclamo
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-wider text-pink-600 bg-pink-50 px-3 py-1.5 rounded-xl inline-block font-mono">
                            {selectedQR.claimCode}
                        </p>
                        
                        {/* QR Code */}
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-center mx-auto w-fit">
                            <QRCodeSVG 
                                value={selectedQR.claimCode || ''} 
                                size={180}
                                fgColor="#0f172a"
                                level="H"
                            />
                        </div>

                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                            Muestra este código QR al personal del negocio para confirmar tu entrega.
                        </p>

                        <button
                            onClick={() => setSelectedQR(null)}
                            className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
