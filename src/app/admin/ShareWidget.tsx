"use client";

import { Copy, Check, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export function ShareWidget({ url }: { url: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const [qrColor, setQrColor] = useState('059669');

    useEffect(() => {
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim().replace('#', '');
        if (color) setQrColor(color);
    }, []);

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&color=${qrColor}`;
    const whatsappMessage = `¡Hola! Reserva tu cancha aquí: ${url}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

    return (
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl relative overflow-hidden flex flex-col items-center">
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px] w-full text-left mb-6">Promociona tu Negocio</h3>

            <div className="bg-gray-50 p-4 rounded-3xl w-full flex justify-center mb-6">
                <img
                    src={qrUrl}
                    alt="Código QR para reservar"
                    className="w-40 h-40 rounded-xl"
                />
            </div>

            <div className="w-full space-y-3">
                <p className="text-xs font-bold text-gray-400 text-center">Enlace de reservas</p>
                <div className="flex items-center gap-2 w-full p-2 bg-gray-50 border border-gray-200 rounded-xl">
                    <input
                        type="text"
                        readOnly
                        value={url}
                        className="bg-transparent text-sm text-gray-600 font-medium w-full outline-none px-2 truncate"
                    />
                    <button
                        onClick={handleCopy}
                        className="p-2 rounded-lg transition-all shrink-0"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.9)'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                        title="Copiar enlace"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <Link
                        href={url}
                        target="_blank"
                        className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors shrink-0"
                        title="Abrir enlace"
                    >
                        <ExternalLink size={16} />
                    </Link>
                </div>

                <Link
                    href={whatsappUrl}
                    target="_blank"
                    className="w-full flex items-center justify-center gap-2 p-3 mt-2 bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] transition-all font-bold shadow-lg shadow-[#25D366]/20"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                    Compartir por WhatsApp
                </Link>
            </div>
        </div>
    );
}
