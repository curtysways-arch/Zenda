"use client";

import { X, Printer, Download, Globe } from "lucide-react";
import { useEffect, useState } from "react";

interface NegocioQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    negocio: any;
}

export default function NegocioQRModal({ isOpen, onClose, negocio }: NegocioQRModalProps) {
    const [baseUrl, setBaseUrl] = useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            setBaseUrl(window.location.origin);
        }
    }, []);

    if (!isOpen || !negocio) return null;

    const businessUrl = `${baseUrl}/${negocio.slug}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(businessUrl)}&qzone=1`;

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = async () => {
        try {
            // Descargar la imagen del QR limpia
            const response = await fetch(qrCodeUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `qr-${negocio.slug}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error al descargar el QR:", error);
            alert("No se pudo descargar el QR automáticamente. Puedes hacer clic derecho sobre la imagen y seleccionar 'Guardar imagen como...'.");
        }
    };

    // Color primario del negocio o fallback emerald de Citiox
    const primaryColor = negocio.colorPrimario || "#10b981";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            {/* Estilo para impresión limpia de la tarjeta QR */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    /* Ocultar todo el sitio */
                    body * {
                        visibility: hidden !important;
                    }
                    /* Mostrar solo la tarjeta QR */
                    #print-qr-card-container, #print-qr-card-container * {
                        visibility: visible !important;
                    }
                    #print-qr-card-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        background: white !important;
                    }
                    #print-qr-card {
                        border: none !important;
                        box-shadow: none !important;
                        transform: scale(1.3) !important;
                    }
                }
            `}} />

            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 border border-slate-100 dark:border-white/5 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-300">
                {/* Botón de cerrar */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 size-10 bg-slate-100 hover:bg-rose-500 hover:text-white dark:bg-white/5 rounded-full flex items-center justify-center transition-all cursor-pointer"
                >
                    <X size={18} />
                </button>

                <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase italic tracking-tighter mb-1 mt-2">
                    Código QR de Reservas
                </h3>
                <p className="text-xs text-slate-400 font-medium mb-6">
                    Imprime o descarga el QR para tus clientes
                </p>

                {/* Contenedor de impresión */}
                <div id="print-qr-card-container" className="py-4">
                    {/* Tarjeta de Diseño Premium */}
                    <div 
                        id="print-qr-card" 
                        className="w-[290px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-[2.2rem] p-5 shadow-lg flex flex-col items-center text-center relative overflow-hidden"
                    >
                        {/* Detalles del negocio */}
                        <div className="flex items-center gap-3 mb-4 w-full justify-center">
                            {negocio.logoUrl ? (
                                <img src={negocio.logoUrl} alt={negocio.nombre} className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-sm" />
                            ) : (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-base shadow-sm" style={{ backgroundColor: primaryColor }}>
                                    {negocio.nombre.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="text-left">
                                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xs leading-none max-w-[180px] truncate">
                                    {negocio.nombre}
                                </h4>
                                <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase">
                                    Reservas Online
                                </span>
                            </div>
                        </div>

                        {/* Código QR */}
                        <div className="bg-white p-4 rounded-[1.8rem] shadow-sm border border-slate-100 mb-5 flex items-center justify-center">
                            <img 
                                src={qrCodeUrl} 
                                alt="Código QR de reservas" 
                                className="w-44 h-44 object-contain"
                            />
                        </div>

                        <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-4">
                            ¡Escanea para agendar!
                        </p>

                        {/* Pie de Página de la Tarjeta */}
                        <div 
                            className="w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 text-left shadow-sm"
                            style={{ 
                                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`
                            }}
                        >
                            <div className="size-8 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                                <Globe size={16} />
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-[8px] font-black text-white/70 uppercase tracking-widest leading-none">
                                    O visítanos en:
                                </div>
                                <div className="text-[11px] font-bold text-white truncate leading-normal">
                                    {baseUrl.replace(/^https?:\/\//, "")}/{negocio.slug}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Acciones */}
                <div className="grid grid-cols-2 gap-3 w-full mt-6">
                    <button
                        onClick={handleDownload}
                        className="flex items-center justify-center gap-2 px-5 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl font-black text-[10px] text-slate-700 dark:text-slate-300 uppercase tracking-widest transition-all cursor-pointer active:scale-95"
                    >
                        <Download size={14} />
                        Descargar
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center justify-center gap-2 px-5 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg cursor-pointer active:scale-95"
                        style={{ 
                            backgroundColor: primaryColor,
                            boxShadow: `0 10px 15px -3px ${primaryColor}33, 0 4px 6px -4px ${primaryColor}33`
                        }}
                    >
                        <Printer size={14} />
                        Imprimir
                    </button>
                </div>
            </div>
        </div>
    );
}
