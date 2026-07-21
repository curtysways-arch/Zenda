'use client';

import { useState } from 'react';
import { Share2, Clock, CheckCircle2, Copy, Calendar, Navigation2, ChevronLeft, ShieldCheck, Tag, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PromoShareClient({
    promotion,
    negocio,
    shareUrl,
    slug,
    primaryColor = 'var(--primary)',
    tertiaryColor = '#14B8A6',
    textColor = '#000000',
    neutralColor = '#FFD1EE'
}: {
    promotion: any,
    negocio: any,
    shareUrl: string,
    slug: string,
    primaryColor?: string,
    tertiaryColor?: string,
    textColor?: string,
    neutralColor?: string
}) {
    const [copied, setCopied] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const router = useRouter();

    const handleShareWhatsApp = async () => {
        setIsSharing(true);
        
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const diasStr = promotion.diasValidos 
            ? promotion.diasValidos.split(',').map((d: string) => days[parseInt(d)]).join(', ') 
            : 'Todos los días';
            
        const horarioStr = promotion.horaInicioValida && promotion.horaFinValida 
            ? `${promotion.horaInicioValida} - ${promotion.horaFinValida}` 
            : (negocio.horarioApertura && negocio.horarioCierre 
                ? `${negocio.horarioApertura} - ${negocio.horarioCierre}` 
                : 'Horario de atención');

        const serviciosStr = promotion.services && promotion.services.length > 0
            ? promotion.services.map((s: any) => `• ${s.nombre}`).join('\n')
            : '';

        const mensaje = `🔥 *PROMOCIÓN ESPECIAL* 🔥 ${negocio.nombre}\n\n*${promotion.titulo}*\n${promotion.precioAnterior ? `Antes: ~${promotion.precioAnterior}~ \n` : ''}Ahora: *$${promotion.precioPromo}*\n\n${serviciosStr ? `💆‍♂️ *Servicios incluidos:*\n${serviciosStr}\n\n` : ''}📅 *Días disponibles:* ${diasStr}\n⏰ *Horario:* ${horarioStr}\n\nReserva aquí: ${shareUrl}`;

        try {
            await fetch(`/api/promotions/${promotion.id}/share`, { method: 'POST' });
            const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
            window.open(waUrl, '_blank');
        } catch (error) {
            console.error('Error al compartir:', error);
            const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
            window.open(waUrl, '_blank');
        } finally {
            setIsSharing(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isExpirada = promotion.estado === 'caducada' || new Date(promotion.fechaFin) < new Date();

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header Flotante - ULTRA GLASS */}
            <header className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-2xl border-b border-black/5 h-20 flex items-center bg-white/80">
                <div className="max-w-5xl mx-auto w-full px-6 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <Link
                            href={`/${slug}#promociones`}
                            className="size-12 rounded-2xl bg-black/5 hover:bg-black/10 text-slate-900 flex items-center justify-center transition-all border border-black/10 hover:border-black/20 active:scale-90"
                        >
                            <ChevronLeft size={24} strokeWidth={2.5} />
                        </Link>
                        <div className="space-y-0.5">
                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] leading-none">{negocio.nombre}</p>
                            <h1 className="text-slate-900 font-black text-xl tracking-tighter uppercase leading-none truncate max-w-[180px] md:max-w-xs" style={{ color: negocio.colorTexto || '#ffffff' }}>{promotion.titulo}</h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {negocio.logoUrl && (
                            <img src={negocio.logoUrl} alt={negocio.nombre} className="h-10 w-10 rounded-xl object-contain border border-black/10 shadow-lg" />
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 pt-20 pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    
                    {/* Columna Izquierda: Imagen */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="relative w-[calc(100%+3rem)] -mx-6 sm:mx-0 sm:w-full bg-slate-100">
                            <img
                                src={promotion.imagenUrl}
                                alt={promotion.titulo}
                                className={`w-full h-auto block object-contain ${isExpirada ? 'grayscale opacity-80' : ''}`}
                            />
                            
                            <div className="absolute top-8 left-8 flex flex-col gap-3">
                                {isExpirada ? (
                                    <span className="bg-black/80 backdrop-blur-md text-white text-[10px] font-black px-5 py-2.5 rounded-full uppercase tracking-widest shadow-xl">
                                        Promoción Finalizada
                                    </span>
                                ) : (
                                    <span className="text-white text-[10px] font-black px-5 py-2.5 rounded-full uppercase tracking-widest shadow-xl flex items-center gap-2" style={{ backgroundColor: primaryColor }}>
                                        <Clock size={14} className="animate-pulse" /> Oferta por Tiempo Limitado
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Detalles */}
                    <div className="lg:col-span-5 flex flex-col">
                        <div className="sticky top-32 space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2" style={{ color: negocio.colorSubTexto || '#475569' }}>
                                    <Tag size={20} />
                                    <span className="text-xs font-black uppercase tracking-[0.3em]">Oportunidad Única</span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-[0.9] italic uppercase" style={{ color: negocio.colorTexto || '#ffffff' }}>
                                    {promotion.titulo}
                                </h1>
                            </div>

                            {/* DESCRIPCIÓN DE LA PROMO */}
                            {promotion.descripcion && (
                                <p className="text-sm font-semibold text-slate-600 leading-relaxed">
                                    {promotion.descripcion}
                                </p>
                            )}

                            {/* SERVICIO PRINCIPAL DE LA PROMOCIÓN */}

                            {promotion.services && promotion.services.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicio Principal a Aplicar</p>
                                    <div className="space-y-3">
                                        {promotion.services.map((service: any) => (
                                            <Link 
                                                key={service.id} 
                                                href={`/${slug}/servicio/${service.id}`}
                                                className="relative overflow-hidden p-6 rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-800 hover:border-pink-500/50 shadow-2xl flex items-center justify-between gap-4 group cursor-pointer transition-all duration-300 block hover:-translate-y-0.5 active:scale-95"
                                            >
                                                {/* Brillo dinámico de fondo */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full -translate-y-12 translate-x-12 blur-2xl group-hover:scale-150 transition-all duration-1000" />
                                                
                                                <div className="flex items-start gap-4 relative z-10">
                                                    <div className="p-3 bg-pink-500/10 text-pink-500 rounded-2xl border border-pink-500/20 shrink-0">
                                                        <Sparkles size={20} className="animate-pulse" />
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] font-black text-pink-400 uppercase tracking-widest block mb-1">Servicio Incluido</span>
                                                        <h4 className="text-base font-black text-white uppercase tracking-tight leading-snug">
                                                            {service.nombre}
                                                        </h4>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1">Duración: {service.duracion || 60} minutos</p>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 relative z-10 flex flex-col items-end">
                                                    <span className="px-3.5 py-1.5 bg-pink-500 text-white text-[8px] font-black uppercase rounded-lg shadow-lg tracking-widest">
                                                        Activo
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Card de Precio */}
                            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-8">
                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Precio de Oferta</p>
                                        <div className="flex items-end gap-3">
                                            <span className="text-6xl font-black tracking-tighter italic leading-none" style={{ color: primaryColor }}>${parseFloat(promotion.precioPromo).toFixed(0)}</span>
                                            {promotion.precioAnterior && (
                                                <div className="mb-1 flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Normal</span>
                                                    <span className="text-2xl font-bold text-slate-400 line-through leading-none decoration-black/40">${parseFloat(promotion.precioAnterior).toFixed(0)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vence el</p>
                                        <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                                            <p className="text-sm font-black text-slate-900 italic">{new Date(promotion.fechaFin).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Nueva sección de horario específico */}
                                {(promotion.diasValidos || (promotion.horaInicioValida && promotion.horaFinValida)) && (
                                    <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 flex flex-col gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-600">
                                                <Calendar size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Días Disponibles</p>
                                                <p className="text-xs font-bold text-slate-700 uppercase">
                                                    {promotion.diasValidos ? 
                                                        promotion.diasValidos.split(',').map((d: string) => {
                                                            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                                                            return days[parseInt(d)];
                                                        }).join(', ') 
                                                        : 'Todos los días'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-600">
                                                <Clock size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Horario Especial</p>
                                                <p className="text-xs font-bold text-slate-700">
                                                    {promotion.horaInicioValida && promotion.horaFinValida ? 
                                                        `${promotion.horaInicioValida} - ${promotion.horaFinValida}` 
                                                        : 'Cualquier hora'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}


                                 <div className="space-y-4 pt-6 border-t border-slate-50">
                                    {!isExpirada && (
                                        <Link
                                            href={promotion.services && promotion.services.length > 0
                                                ? `/${slug}/servicio/${promotion.services[0].id}`
                                                : `/${slug}#servicios`}
                                            className="w-full text-white font-black text-sm uppercase tracking-widest py-5 rounded-3xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 group"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <Navigation2 size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                            Reservar Ahora
                                        </Link>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={handleShareWhatsApp}
                                            disabled={isSharing}
                                            className="bg-[#25D366] hover:bg-[#1ebd5a] text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#25D366]/20"
                                        >
                                            <Share2 size={16} />
                                            WhatsApp
                                        </button>
                                        <button
                                            onClick={handleCopy}
                                            className="bg-white border-2 border-slate-100 hover:border-slate-300 text-slate-600 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
                                        >
                                            {copied ? <><CheckCircle2 size={16} className="text-emerald-500" /> Copiado</> : <><Copy size={16} /> Link</>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Trust Section */}
                            <div className="bg-slate-900 p-8 rounded-[2.5rem] flex items-center gap-5 border border-white/5 shadow-2xl">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6" style={{ backgroundColor: tertiaryColor }}>
                                    <ShieldCheck size={28} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-black uppercase tracking-widest leading-none mb-1" style={{ color: primaryColor }}>Reserva Protegida</p>
                                    <p className="text-[10px] font-bold text-slate-400 italic leading-snug">Promoción exclusiva gestionada a través de la plataforma oficial de {negocio.nombre}.</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Sección descripción extendida */}
                <div className="mt-20">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-3">
                        <div className="w-2 h-8 rounded-full" style={{ backgroundColor: primaryColor }} />
                        Detalles de la Promoción
                    </h2>
                    <div className="bg-white p-10 md:p-14 rounded-[4rem] border border-slate-100 text-slate-600 font-medium text-lg leading-relaxed shadow-inner italic">
                         {promotion.descripcion}
                         <br /><br />
                          Esta oferta es por tiempo limitado y está sujeta a la disponibilidad de los servicios del centro {negocio.nombre}. No acumulable con otras promociones ni con cupones de servicio gratis (se debe elegir solo un beneficio por reserva).
                    </div>
                </div>
            </main>
        </div>
    );
}
