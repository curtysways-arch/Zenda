'use client';

import { useState } from 'react';
import { Search, Phone, MessageCircle, Calendar, DollarSign, ChevronRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface MobileClientsProps {
    clientes: any[];
    primaryColor: string;
    onVerHistorial: (cliente: any) => void;
}

export default function MobileClients({ clientes, primaryColor, onVerHistorial }: MobileClientsProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filtered = clientes.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telefono.includes(searchTerm)
    );

    return (
        <div className="flex flex-col bg-slate-50 min-h-screen animate-in fade-in duration-500 pb-20">
            {/* Header / Search */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-100 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
                        Nuestros <span style={{ color: primaryColor }}>Clientes</span>
                    </h2>
                    <div className="size-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400">{clientes.length}</span>
                    </div>
                </div>
                
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-all group-focus-within:text-slate-900 group-focus-within:scale-110" size={20} />
                    <input 
                        type="text"
                        placeholder="BUSCAR POR NOMBRE O TELÉFONO..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 text-slate-900 text-sm py-4 pl-12 pr-6 rounded-2xl focus:outline-none transition-all placeholder:text-slate-300 italic font-bold uppercase shadow-inner"
                    />
                </div>
            </div>

            {/* List */}
            <div className="p-5 space-y-4">
                {filtered.map((c) => (
                    <div 
                        key={c.id}
                        className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] transition-all group"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="size-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 font-black text-xl border border-slate-100 group-active:bg-[var(--primary-color)] group-active:text-white transition-colors"
                                     style={ { '--primary-color': primaryColor } as any }>
                                    {c.nombre.charAt(0)}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-black text-slate-900 uppercase italic leading-none">{c.nombre}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.telefono}</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <a 
                                    href={`tel:${c.telefono}`}
                                    className="size-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm"
                                >
                                    <Phone size={16} />
                                </a>
                                <a 
                                    href={`https://wa.me/${c.telefono.replace(/\+/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="size-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm"
                                >
                                    <MessageCircle size={16} />
                                </a>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar size={12} style={{ color: primaryColor }} />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Citas</span>
                                </div>
                                <p className="text-lg font-black text-slate-900 leading-none">{c.totalReservas || 0}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <DollarSign size={12} className="text-purple-500" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                                </div>
                                <p className="text-lg font-black text-slate-900 leading-none">${c.totalSpent || c.totalGastado || 0}</p>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                                MIEMBRO DESDE {format(new Date(c.createdAt), 'MMM yyyy', { locale: es })}
                            </span>
                            <button 
                                type="button"
                                onClick={() => onVerHistorial(c)}
                                className="flex items-center gap-1 text-[9px] font-black uppercase italic active:scale-95 transition-transform outline-none" 
                                style={{ color: primaryColor }}
                            >
                                Ver Historial <ChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                        <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <User size={32} className="text-slate-300" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No se encontraron resultados</p>
                    </div>
                )}
            </div>
        </div>
    );
}
