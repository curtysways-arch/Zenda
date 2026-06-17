'use client';

import { use, useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Share2, Calendar, MapPin, Smartphone } from 'lucide-react';
import Link from 'next/link';
import InstallAppButton from '@/components/InstallAppButton';

export default function PagoExitoPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl shadow-emerald-200/50 p-10 text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                    <CheckCircle2 size={48} />
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">¡Pago Confirmado!</h1>
                    <p className="text-gray-500 font-medium">Hemos recibido tu seña exitosamente.</p>
                </div>

                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 text-left space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600">
                            <Calendar size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Tu Turno</p>
                            <p className="text-sm font-bold text-gray-800">Se ha actualizado el estado de tu reserva.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600">
                            <MapPin size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Siguiente Paso</p>
                            <p className="text-sm font-bold text-gray-800">Preséntate 10 mins antes de tu horario.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <InstallAppButton variant="full" slug={slug} className="mb-4" />
                    
                    <button className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-800 transition shadow-lg">
                        <Share2 size={18} />
                        Compartir con mis amigos
                    </button>
                    <Link
                        href={`/${slug}`}
                        className="w-full py-4 bg-white text-gray-400 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 transition border border-gray-100"
                    >
                        Volver al inicio
                        <ChevronRight size={18} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
