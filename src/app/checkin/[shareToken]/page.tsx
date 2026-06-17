'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import CheckInCard from '@/components/client/CheckInCard';

export default function CheckInPage({ params }: { params: { shareToken: string } }) {
    const { shareToken } = params;
    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/checkin/${shareToken}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setAppointment(data);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [shareToken]);

    const color = appointment?.primaryColor || '#6366f1';

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{ background: `linear-gradient(160deg, ${color}10 0%, #f8fafc 40%)` }}
        >
            {/* Header */}
            <header className="sticky top-0 z-50 px-5 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center gap-3">
                {appointment?.negocioSlug && (
                    <Link href={`/${appointment.negocioSlug}`} className="p-2 -ml-1">
                        <ChevronLeft size={22} style={{ color }} />
                    </Link>
                )}
                {appointment?.logoUrl ? (
                    <img src={appointment.logoUrl} alt={appointment.negocio} className="w-8 h-8 rounded-xl object-cover border border-slate-100" />
                ) : (
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                        <span className="text-[10px] font-black" style={{ color }}>✨</span>
                    </div>
                )}
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color }}>
                    {appointment?.negocio || 'Mi Cita'}
                </span>
            </header>

            <main className="flex-1 flex flex-col items-center px-5 py-8 max-w-md mx-auto w-full">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin" style={{ color }} />
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-4 p-8 bg-white rounded-[2rem] border border-red-100 shadow-xl">
                            <AlertCircle size={40} className="text-red-400 mx-auto" />
                            <p className="font-black text-slate-900 uppercase">Cita no encontrada</p>
                            <p className="text-sm font-bold text-slate-500">{error}</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Saludo */}
                        <div className="px-2">
                            <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color }}>
                                ¡Hola, {appointment.clienteNombre}!
                            </p>
                            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">
                                Tu Cita
                            </h1>
                        </div>

                        {/* Card principal */}
                        <CheckInCard appointment={appointment} />

                        {/* Instrucciones */}
                        <div className="bg-white rounded-[1.5rem] border border-slate-100 p-5 space-y-3 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">¿Cómo funciona?</p>
                            <div className="space-y-2.5">
                                {[
                                    { emoji: '🕐', text: '30 minutos antes aparece el botón "Ya llegué"' },
                                    { emoji: '🚶', text: 'Cuando llegues, presiónalo para avisar al negocio' },
                                    { emoji: '✨', text: 'El equipo recibirá una alerta inmediata' },
                                    { emoji: '💆', text: 'Siéntate y relájate — te atenderán enseguida' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <span className="text-base leading-none mt-0.5">{item.emoji}</span>
                                        <p className="text-[12px] font-bold text-slate-600 leading-tight">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
