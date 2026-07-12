'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Percent, Share2, Clipboard, Clock, Calendar, CheckCircle, AlertTriangle, User } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientCoupon {
    id: string;
    estado: 'DISPONIBLE' | 'RESERVADO' | 'USADO' | 'VENCIDO' | 'CANCELADO';
    codigo: string;
    codigoOriginal: string;
    nombre: string;
    descripcion: string;
    descuento: number;
    tipo: 'PORCENTAJE' | 'FIJO';
    fechaAsignacion: string;
    fechaExpiracion?: string;
    fechaUso?: string;
    appointmentId?: string;
    sourceType: string;
    sourceId?: string;
}

export default function MisCuponesPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [cupones, setCupones] = useState<ClientCoupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'disponibles' | 'urgentes' | 'usados' | 'vencidos'>('disponibles');
    const [negocio, setNegocio] = useState<any>(null);
    const [hasSession, setHasSession] = useState<boolean | null>(null);

    // Leer colores de marca del negocio
    const primaryColor = negocio?.colorPrimario || '#db2777';
    const textColor = negocio?.colorTexto || '#ffffff';

    const checkSession = async () => {
        try {
            const res = await fetch(`/api/${slug}/auth/session`, { credentials: 'include' });
            const data = await res.json();
            setHasSession(data.active === true);
            if (!data.active) {
                // Redirigir a login en el perfil
                router.push(`/${slug}/perfil`);
            }
        } catch {
            setHasSession(false);
            router.push(`/${slug}/perfil`);
        }
    };

    const fetchCupones = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/public/${slug}/client-coupons`);
            if (res.ok) {
                const data = await res.json();
                setCupones(data || []);
            }
        } catch (e) {
            console.error("Error cargando cupones:", e);
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
            fetchCupones();
        }
    }, [hasSession]);

    // Filtrar cupones por pestañas
    const filteredCupones = useMemo(() => {
        const now = new Date();
        return cupones.filter(c => {
            const expDate = c.fechaExpiracion ? new Date(c.fechaExpiracion) : null;
            const isExpired = expDate ? expDate < now : false;

            if (activeTab === 'disponibles') {
                // Disponibles y vigentes (no próximos a vencer de forma crítica, ej. > 7 días o sin expiración)
                if (c.estado !== 'DISPONIBLE') return false;
                if (isExpired) return false;
                if (expDate) {
                    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays > 7; // Vigentes por más de 7 días
                }
                return true; // Sin fecha de expiración
            }
            if (activeTab === 'urgentes') {
                // Próximos a vencer (expira en <= 7 días)
                if (c.estado !== 'DISPONIBLE') return false;
                if (isExpired) return false;
                if (expDate) {
                    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays <= 7 && diffDays >= 0;
                }
                return false;
            }
            if (activeTab === 'usados') {
                return c.estado === 'USADO' || c.estado === 'RESERVADO';
            }
            if (activeTab === 'vencidos') {
                return c.estado === 'VENCIDO' || isExpired;
            }
            return true;
        });
    }, [cupones, activeTab]);

    const handleShareCoupon = async (coupon: ClientCoupon) => {
        const shareText = `¡Usa mi cupón descuento "${coupon.codigo}" en ${negocio?.nombre || ' CitiOx'} para obtener un beneficio increíble! 🎁✨`;
        if (navigator.share) {
            await navigator.share({
                title: 'Cupón de Descuento',
                text: shareText,
                url: window.location.origin + `/${slug}`
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(`${shareText}\n${window.location.origin}/${slug}`);
            alert('¡Texto del cupón copiado al portapapeles!');
        }
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        alert(`¡Código "${code}" copiado al portapapeles! Úsalo al reservar.`);
    };

    if (hasSession === null || loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-pink-600 animate-spin" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando tus cupones...</p>
                </div>
            </div>
        );
    }

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
                    <button onClick={() => router.back()} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all border-0 cursor-pointer">
                        <ArrowLeft size={18} style={{ color: textColor }} />
                    </button>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80">MIS BENEFICIOS</span>
                    <div className="w-9 h-9" />
                </div>

                <div className="max-w-md mx-auto relative z-10 mt-8 text-center space-y-2">
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Mis Cupones</h1>
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-85 leading-relaxed">
                        Aquí verás todos los cupones que has ganado y puedes usar en tus reservas.
                    </p>
                </div>
            </div>

            {/* Contenedor Principal */}
            <div className="max-w-md mx-auto px-3 -mt-8 space-y-5 relative z-20">
                {/* Selector de Pestañas */}
                <div className="bg-white rounded-3xl p-1.5 shadow-sm border border-slate-100 flex overflow-x-auto scrollbar-none snap-x">
                    {[
                        { id: 'disponibles', label: 'Disponibles', count: cupones.filter(c => c.estado === 'DISPONIBLE' && (!c.fechaExpiracion || new Date(c.fechaExpiracion) > new Date()) && (!c.fechaExpiracion || Math.ceil((new Date(c.fechaExpiracion).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) > 7)).length },
                        { id: 'urgentes', label: 'Urgentes ⏰', count: cupones.filter(c => c.estado === 'DISPONIBLE' && c.fechaExpiracion && Math.ceil((new Date(c.fechaExpiracion).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 7 && Math.ceil((new Date(c.fechaExpiracion).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) >= 0).length },
                        { id: 'usados', label: 'Usados', count: cupones.filter(c => c.estado === 'USADO' || c.estado === 'RESERVADO').length },
                        { id: 'vencidos', label: 'Vencidos', count: cupones.filter(c => c.estado === 'VENCIDO' || (c.fechaExpiracion && new Date(c.fechaExpiracion) < new Date() && c.estado === 'DISPONIBLE')).length }
                    ].map((tab) => {
                        const isTabActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 min-w-[80px] py-3 px-2 rounded-2xl text-[10px] font-black uppercase tracking-wider text-center transition-all border-0 cursor-pointer snap-start ${
                                    isTabActive ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-600 bg-transparent'
                                }`}
                                style={isTabActive ? { backgroundColor: primaryColor } : {}}
                            >
                                {tab.label} {tab.count > 0 && `(${tab.count})`}
                            </button>
                        );
                    })}
                </div>

                {/* Listado de Cupones */}
                <div className="space-y-4">
                    {filteredCupones.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-[2rem] p-12 text-center shadow-sm space-y-4">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto" style={{ color: primaryColor }}>
                                <Percent size={28} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">No hay cupones</h3>
                                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-[240px] mx-auto">
                                    {activeTab === 'disponibles' && 'Aún no tienes cupones disponibles. Completa misiones o canjea tus puntos para obtenerlos.'}
                                    {activeTab === 'urgentes' && '¡Excelente! No tienes cupones a punto de vencer.'}
                                    {activeTab === 'usados' && 'No tienes un historial de cupones usados.'}
                                    {activeTab === 'vencidos' && 'No tienes cupones vencidos.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredCupones.map((coupon) => {
                                const expDateFormatted = coupon.fechaExpiracion 
                                    ? format(new Date(coupon.fechaExpiracion), "d 'de' MMMM, yyyy", { locale: es })
                                    : 'Sin vencimiento';
                                const usageDateFormatted = coupon.fechaUso
                                    ? format(new Date(coupon.fechaUso), "d 'de' MMM, yyyy HH:mm", { locale: es })
                                    : '';

                                return (
                                    <div
                                        key={coupon.id}
                                        className="relative w-full rounded-3xl overflow-hidden flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100 bg-white"
                                    >
                                        {/* Parte superior del ticket */}
                                        <div
                                            className="px-6 py-4 text-white relative overflow-hidden"
                                            style={{ backgroundColor: coupon.estado === 'DISPONIBLE' ? primaryColor : '#64748b' }}
                                        >
                                            {/* Patrón decorativo */}
                                            <div className="absolute inset-0 opacity-10" style={{
                                                backgroundImage: `radial-gradient(circle at 10% 50%, white 1px, transparent 1px), radial-gradient(circle at 90% 10%, white 1px, transparent 1px)`,
                                                backgroundSize: '20px 20px'
                                            }} />
                                            <div className="relative z-10 flex justify-between items-start">
                                                <div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-80 block mb-1">
                                                        🎟️ {coupon.sourceType === 'LOYALTY_REWARD' ? 'Canje de puntos' : 'Beneficio obtenido'}
                                                    </span>
                                                    <h3 className="text-xl font-black uppercase tracking-tight leading-tight">
                                                        {coupon.nombre || 'Cupón Descuento'}
                                                    </h3>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-3xl font-black leading-none tracking-tighter">
                                                        {coupon.tipo === 'PORCENTAJE' ? `${coupon.descuento}%` : `$${coupon.descuento}`}
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-80">OFF</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Separador dentado */}
                                        <div className="relative h-4 bg-white">
                                            <div
                                                className="absolute inset-0"
                                                style={{
                                                    backgroundImage: `radial-gradient(circle at 50% 0%, ${coupon.estado === 'DISPONIBLE' ? primaryColor : '#64748b'} 6px, transparent 6px)`,
                                                    backgroundSize: '16px 12px',
                                                    backgroundPosition: '0 0',
                                                }}
                                            />
                                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-50" />
                                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-50" />
                                        </div>

                                        {/* Parte inferior del ticket */}
                                        <div className="px-6 pb-5 pt-1 space-y-4">
                                            <div className="text-center space-y-1">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Código Único de Cupón</p>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-lg font-black uppercase tracking-widest text-slate-800">
                                                        {coupon.codigo}
                                                    </span>
                                                    {coupon.estado === 'DISPONIBLE' && (
                                                        <button 
                                                            onClick={() => handleCopyCode(coupon.codigo)} 
                                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors border-0 cursor-pointer text-slate-600"
                                                        >
                                                            <Clipboard size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed text-center">
                                                {coupon.descripcion}
                                            </p>

                                            <div className="border-t border-dashed border-slate-100 pt-3 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                {coupon.estado === 'DISPONIBLE' && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock size={11} style={{ color: primaryColor }} /> Vence: {expDateFormatted}
                                                    </span>
                                                )}
                                                {coupon.estado === 'RESERVADO' && (
                                                    <span className="text-amber-500 flex items-center gap-1.5">
                                                        <Clock size={11} /> RESERVA PENDIENTE
                                                    </span>
                                                )}
                                                {coupon.estado === 'USADO' && (
                                                    <span className="text-emerald-600 flex items-center gap-1.5">
                                                        <CheckCircle size={11} /> Usado: {usageDateFormatted}
                                                    </span>
                                                )}
                                                {coupon.estado === 'VENCIDO' && (
                                                    <span className="text-red-500 flex items-center gap-1.5">
                                                        <AlertTriangle size={11} /> VENCIDO
                                                    </span>
                                                )}

                                                {coupon.estado === 'DISPONIBLE' && (
                                                    <button
                                                        onClick={() => handleShareCoupon(coupon)}
                                                        className="px-3 py-1.5 rounded-xl border border-slate-150 hover:bg-slate-50 active:scale-95 transition-all text-[8px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1 cursor-pointer bg-transparent"
                                                    >
                                                        <Share2 size={9} /> Compartir
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
