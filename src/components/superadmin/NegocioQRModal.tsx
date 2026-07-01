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
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(businessUrl)}&qzone=2`;

    // Color primario del negocio o fallback emerald de Citiox
    const primaryColor = negocio.colorPrimario || "#10b981";

    // Abrir ventana nueva con la tarjeta y disparar impresión
    const handlePrint = () => {
        const logoSection = negocio.logoUrl
            ? `<img src="${negocio.logoUrl}" alt="${negocio.nombre}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.3);" />`
            : `<div style="width:44px;height:44px;border-radius:50%;background:${primaryColor};color:white;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;font-family:sans-serif;">${negocio.nombre.charAt(0).toUpperCase()}</div>`;

        const urlDisplay = `${baseUrl.replace(/^https?:\/\//, "")}/${negocio.slug}`;

        const printHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QR - ${negocio.nombre}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .card {
            width: 320px;
            background: #f8fafc;
            border: 1.5px solid #e2e8f0;
            border-radius: 32px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.08);
        }
        .header {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            margin-bottom: 20px;
        }
        .name {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            text-align: left;
            line-height: 1.2;
        }
        .subtitle {
            font-size: 9px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            text-align: left;
        }
        .qr-wrapper {
            background: white;
            padding: 16px;
            border-radius: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            border: 1px solid #e2e8f0;
            margin-bottom: 16px;
        }
        .qr-wrapper img {
            width: 200px;
            height: 200px;
            display: block;
        }
        .cta {
            font-size: 10px;
            font-weight: 900;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            margin-bottom: 16px;
        }
        .footer {
            width: 100%;
            padding: 14px 16px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            gap: 12px;
            text-align: left;
            background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd);
        }
        .footer-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            color: white;
            font-size: 14px;
        }
        .footer-label {
            font-size: 8px;
            font-weight: 700;
            color: rgba(255,255,255,0.7);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            line-height: 1;
            margin-bottom: 3px;
        }
        .footer-url {
            font-size: 11px;
            font-weight: 600;
            color: white;
            word-break: break-all;
            line-height: 1.3;
        }
        @media print {
            body { margin: 0; padding: 0; }
            .card { box-shadow: none; border-color: #cbd5e1; }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            ${logoSection}
            <div>
                <div class="name">${negocio.nombre}</div>
                <div class="subtitle">Reservas Online</div>
            </div>
        </div>
        <div class="qr-wrapper">
            <img src="${qrCodeUrl}" alt="Código QR de reservas" />
        </div>
        <p class="cta">¡Escanea para agendar!</p>
        <div class="footer">
            <div class="footer-icon">🌐</div>
            <div>
                <div class="footer-label">O visítanos en:</div>
                <div class="footer-url">${urlDisplay}</div>
            </div>
        </div>
    </div>
    <script>
        // Esperar que el QR cargue antes de imprimir
        var qrImg = document.querySelector('.qr-wrapper img');
        if (qrImg && qrImg.complete) {
            setTimeout(function() { window.print(); window.close(); }, 300);
        } else if (qrImg) {
            qrImg.onload = function() {
                setTimeout(function() { window.print(); window.close(); }, 300);
            };
        }
    </script>
</body>
</html>
        `.trim();

        const printWindow = window.open("", "_blank", "width=500,height=700");
        if (printWindow) {
            printWindow.document.write(printHtml);
            printWindow.document.close();
        }
    };

    const handleDownload = async () => {
        try {
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
            alert("No se pudo descargar el QR automáticamente. Haz clic derecho sobre la imagen del QR y selecciona 'Guardar imagen como...'.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
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
                <p className="text-xs text-slate-400 font-medium mb-6 text-center">
                    Imprime o descarga el QR para tus clientes
                </p>

                {/* Vista previa de la tarjeta */}
                <div className="w-[280px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-[2.2rem] p-5 shadow-lg flex flex-col items-center text-center">
                    <div className="flex items-center gap-3 mb-4 w-full justify-center">
                        {negocio.logoUrl ? (
                            <img src={negocio.logoUrl} alt={negocio.nombre} className="w-10 h-10 rounded-full object-cover shadow-sm" />
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

                    <div className="bg-white p-3 rounded-[1.6rem] shadow-sm border border-slate-100 mb-4">
                        <img
                            src={qrCodeUrl}
                            alt="Código QR de reservas"
                            className="w-40 h-40 object-contain"
                        />
                    </div>

                    <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-4">
                        ¡Escanea para agendar!
                    </p>

                    <div
                        className="w-full py-3 px-4 rounded-2xl flex items-center gap-3 text-left"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
                    >
                        <div className="size-8 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                            <Globe size={14} />
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-[8px] font-black text-white/70 uppercase tracking-widest leading-none">
                                O visítanos en:
                            </div>
                            <div className="text-[10px] font-bold text-white truncate leading-normal">
                                {baseUrl.replace(/^https?:\/\//, "")}/{negocio.slug}
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
                        className="flex items-center justify-center gap-2 px-5 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer active:scale-95"
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
