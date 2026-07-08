'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    ChevronLeft, Share2, Copy, QrCode, Trophy, Gift, Award, 
    Users, Calendar, Sparkles, X, Check, ArrowRight, Info, HelpCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface CampaignDetailClientProps {
    campaign: any;
    slug: string;
    primaryColor: string;
    textColor: string;
    neutralColor: string;
    meData: any; // Datos del cliente logueado (código, progreso de esta campaña, etc.)
}

export default function CampaignDetailClient({
    campaign,
    slug,
    primaryColor,
    textColor,
    neutralColor,
    meData,
}: CampaignDetailClientProps) {
    const [copied, setCopied] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');

    useEffect(() => {
        if (meData?.codigo) {
            // Reconstruir el enlace de referidos
            const host = window.location.origin;
            setShareUrl(`${host}/${slug}?ref=${meData.codigo}`);
        }
    }, [meData, slug]);

    const handleCopy = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Error al copiar enlace:", err);
        }
    };

    const handleShare = async () => {
        if (!shareUrl) return;
        
        const shareText = `¡Hola! Te invito a conocer ${campaign.Negocio?.nombre || 'este negocio'}. Regístrate usando mi enlace y ambos ganaremos premios acumulables: ${shareUrl}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Invitación a ${campaign.Negocio?.nombre || 'Negocio'}`,
                    text: shareText,
                    url: shareUrl,
                });
            } catch (err) {
                console.error("Error al compartir:", err);
            }
        } else {
            // Fallback a WhatsApp Web / Móvil
            const encodedText = encodeURIComponent(shareText);
            window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
        }
    };

    // Calcular progreso
    const userProgress = meData?.progreso || 0;
    const reqReferidos = campaign.referidosRequeridos || 5;
    const pctProgress = Math.min(100, (userProgress / reqReferidos) * 100);
    const isCompleted = userProgress >= reqReferidos;

    // Helper de colores HSL para efectos de fondo transparentes
    const primaryAlpha10 = `${primaryColor}1a`;
    const primaryAlpha05 = `${primaryColor}0d`;

    return (
        <div className="min-h-screen pb-20 relative font-sans" style={{ backgroundColor: neutralColor }}>
            
            {/* Botón flotante para regresar */}
            <div className="fixed top-4 left-4 z-40">
                <Link 
                    href={`/${slug}/referidos`} 
                    className="flex items-center justify-center size-10 rounded-full bg-white/80 backdrop-blur-md border border-slate-100 shadow-lg text-slate-700 active:scale-90 transition-all"
                    style={{ color: primaryColor }}
                >
                    <ChevronLeft size={20} strokeWidth={3} />
                </Link>
            </div>

            {/* Cabecera / Banner principal */}
            <div className="relative w-full h-[260px] md:h-[350px] overflow-hidden">
                {campaign.imagenUrl ? (
                    <>
                        <img 
                            src={campaign.imagenUrl} 
                            alt={campaign.nombre} 
                            className="w-full h-full object-cover"
                        />
                        {/* Overlay oscuro y degradado de color corporativo */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-black/20" />
                    </>
                ) : (
                    // Si no hay imagen, dibujamos un fondo de degradado premium de lujo con destellos de color corporativo
                    <div 
                        className="w-full h-full flex flex-col justify-end p-6 relative overflow-hidden"
                        style={{ 
                            background: `radial-gradient(circle at 80% 20%, ${primaryColor}77 0%, #0f172a 100%)` 
                        }}
                    >
                        {/* Patrón abstracto decorativo */}
                        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                        <div 
                            className="absolute -top-24 -left-24 size-80 rounded-full filter blur-[80px]"
                            style={{ backgroundColor: `${primaryColor}33` }}
                        />
                    </div>
                )}
                
                {/* Textos dentro de la cabecera (en la parte inferior) */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-2">
                    <span 
                        className="inline-flex items-center gap-1 text-[8px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full shadow-sm text-white"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Sparkles size={8} className="animate-pulse" />
                        Campaña Activa
                    </span>
                    <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight leading-tight max-w-xl text-white drop-shadow-md">
                        {campaign.nombre}
                    </h1>
                </div>
            </div>

            {/* Contenido principal */}
            <main className="px-6 -mt-5 relative z-30 space-y-6">
                
                {/* Caja de Descripción principal */}
                <div className="bg-white rounded-[2rem] border border-slate-100/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4">
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <Info size={12} className="text-slate-400" />
                            Detalles del Club
                        </h3>
                        <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                            {campaign.descripcion || "Participa recomendando nuestro negocio a tus amigos. Ambos recibirán increíbles premios acumulables una vez que realicen su primer reserva."}
                        </p>
                    </div>

                    {campaign.fechaFin && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <Calendar size={12} className="text-slate-400" />
                            <span>Válida hasta el: <strong className="text-slate-700">{new Date(campaign.fechaFin).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
                        </div>
                    )}
                </div>

                {/* Lo que Ganas Tú / Gana tu Amigo (Grid Premium) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Caja Ganas Tú */}
                    <div 
                        className="bg-white rounded-[2rem] border border-slate-100/60 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex gap-4 items-start relative overflow-hidden"
                        style={{ borderLeft: `4px solid ${primaryColor}` }}
                    >
                        <div className="size-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: primaryAlpha10, color: primaryColor }}>
                            <Gift size={20} />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block leading-none">Beneficio para Ti</span>
                            <h4 className="text-[13px] font-black text-slate-900 leading-snug uppercase">
                                {campaign.valorRecompensa}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-normal">
                                Lo acumularás en tu cuenta inmediatamente al cumplir la meta.
                            </p>
                        </div>
                    </div>

                    {/* Caja Gana tu Amigo */}
                    <div 
                        className="bg-white rounded-[2rem] border border-slate-100/60 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex gap-4 items-start relative overflow-hidden"
                        style={{ borderLeft: `4px solid #f59e0b` }}
                    >
                        <div className="size-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                            <Award size={20} />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block leading-none">Beneficio para tu Amigo</span>
                            <h4 className="text-[13px] font-black text-slate-900 leading-snug uppercase">
                                {campaign.valorIncentivo || '10% de descuento'}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-normal">
                                Se le aplicará automáticamente al reservar con tu código de embajador.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tarjeta de Progreso del Cliente */}
                {meData ? (
                    <div 
                        className="bg-white rounded-[2rem] border border-slate-100/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden"
                        style={{ 
                            background: `linear-gradient(135deg, #ffffff 0%, ${primaryAlpha05} 100%)` 
                        }}
                    >
                        {/* Brillo de fondo */}
                        <div 
                            className="absolute -right-16 -bottom-16 size-48 rounded-full filter blur-[50px]"
                            style={{ backgroundColor: `${primaryColor}13` }}
                        />

                        <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Tu Progreso de Referidos</span>
                                <h4 className="text-sm font-black text-slate-900 uppercase">
                                    {isCompleted ? '🎉 ¡Campaña Completada!' : 'Meta en camino'}
                                </h4>
                            </div>
                            <div 
                                className="px-3.5 py-1.5 rounded-full text-[10px] font-black text-white shrink-0 shadow-sm"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {userProgress} / {reqReferidos} {
                                    campaign.tipoCampana === 'COMPLETAR_RESERVAS' || campaign.tipoCampana === 'CUALQUIER_RESERVA'
                                        ? 'Reservas'
                                        : 'Referidos'
                                }
                            </div>
                        </div>

                        {/* Barra de progreso de lujo */}
                        <div className="space-y-2">
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/40">
                                <div 
                                    className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                                    style={{ 
                                        width: `${pctProgress}%`,
                                        backgroundColor: primaryColor 
                                    }}
                                >
                                    {/* Destello de movimiento en la barra */}
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] bg-[length:200%_100%] animate-pulse" />
                                </div>
                            </div>
                            <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                <span>Inicio</span>
                                <span>Meta: {reqReferidos}</span>
                            </div>
                        </div>

                        {/* Caja para compartir código embajador (si ya está logueado) */}
                        <div className="mt-6 pt-5 border-t border-slate-100/80 space-y-4">
                            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                                Comparte tu enlace embajador y empieza a ganar
                            </h5>
                            
                            {/* Caja del Código */}
                            <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200/50 rounded-2xl p-3">
                                <div className="min-w-0">
                                    <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Tu Código Único</span>
                                    <span className="text-xs font-black text-slate-800 tracking-wider uppercase truncate block">
                                        {meData.codigo}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Botón QR */}
                                    <button 
                                        onClick={() => setShowQrModal(true)}
                                        className="flex items-center justify-center size-9 bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-sm active:scale-95"
                                        title="Ver Código QR"
                                    >
                                        <QrCode size={16} />
                                    </button>
                                    
                                    {/* Botón Copiar */}
                                    <button 
                                        onClick={handleCopy}
                                        className="flex items-center justify-center h-9 px-3 bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-sm active:scale-95 gap-1.5 font-black text-[9px] uppercase tracking-wider"
                                    >
                                        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                        {copied ? 'Copiado' : 'Copiar'}
                                    </button>
                                </div>
                            </div>

                            {/* Botón Grande Compartir */}
                            <button 
                                onClick={handleShare}
                                className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.99] transition-all"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Share2 size={14} />
                                Compartir mi enlace
                            </button>
                        </div>
                    </div>
                ) : (
                    // Si el cliente no está logueado en la PWA (No hay token)
                    <div className="bg-white rounded-[2rem] border border-slate-100/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] text-center space-y-4">
                        <div className="size-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                            <Users size={22} />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-900 uppercase">¿Quieres empezar a referir?</h4>
                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-xs mx-auto">
                                Únete a nuestro Club de Embajadores. Ingresa tu número de celular para obtener tu código y empezar a ganar premios.
                            </p>
                        </div>
                        <Link 
                            href={`/${slug}/referidos`}
                            className="inline-flex items-center justify-center px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-md gap-1.5 active:scale-95 transition-all"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Unirme al Club
                            <ArrowRight size={12} strokeWidth={3} />
                        </Link>
                    </div>
                )}
            </main>

            {/* MODAL DEL CÓDIGO QR */}
            {showQrModal && meData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-[320px] bg-white rounded-[2.5rem] p-6 shadow-2xl text-center space-y-5 border border-slate-100">
                        {/* Botón cerrar */}
                        <button 
                            onClick={() => setShowQrModal(false)}
                            className="absolute top-4 right-4 size-8 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-full flex items-center justify-center text-slate-500 transition-colors"
                        >
                            <X size={14} strokeWidth={2.5} />
                        </button>

                        <div className="pt-2">
                            <span 
                                className="text-[7.5px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-white"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Tu Código QR
                            </span>
                            <h4 className="text-xs font-black text-slate-900 uppercase mt-2.5 leading-tight">
                                Invita a tus amigos
                            </h4>
                        </div>

                        {/* Contenedor del QR */}
                        <div className="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-200/50">
                            <QRCodeSVG 
                                value={shareUrl} 
                                size={180}
                                fgColor="#0f172a"
                                level="H"
                            />
                        </div>

                        <p className="text-[9px] text-slate-400 font-semibold leading-relaxed px-2">
                            Tus amigos pueden escanear este código directamente desde tu celular para registrarse como tus referidos.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
