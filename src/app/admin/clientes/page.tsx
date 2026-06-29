'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Phone, Calendar, DollarSign, Loader2, ExternalLink, Filter, Star } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import MobileClients from '@/components/admin/mobile/MobileClients';

export default function ClientesPage() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');

    useEffect(() => {
        async function fetchClientes() {
            try {
                const res = await fetch('/api/clientes');
                if (res.ok) {
                    const data = await res.json();
                    setClientes(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        fetchClientes();

        // Obtener color primario
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (color) setPrimaryColor(color);
    }, []);

    const filteredClientes = clientes.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telefono.includes(searchTerm)
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin mb-4" size={32} style={{ color: 'var(--primary-color)' }} />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando Clientes...</p>
            </div>
        );
    }

    return (
        <>
            {/* VISTA MÓVIL */}
            <div className="md:hidden -mx-5 -mt-5">
                <MobileClients 
                    clientes={clientes}
                    primaryColor={primaryColor}
                />
            </div>

            {/* VISTA ESCRITORIO */}
            <div className="hidden md:block space-y-8 animate-in fade-in duration-500">

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestión de Clientes</h1>
                        <p className="text-gray-600 text-sm font-medium">Visualiza el historial y comportamiento de tus clientes.</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2"
                             style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)', borderColor: 'color-mix(in srgb, var(--primary-color), transparent 80%)' }}>
                            <Users size={14} />
                            {clientes.length} Clientes Totales
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--primary-color)] transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o teléfono..."
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl outline-none transition-all text-sm font-medium text-gray-900 shadow-sm"
                            style={{ '--focus-ring': 'color-mix(in srgb, var(--primary-color), transparent 95%)' } as any}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                e.currentTarget.style.boxShadow = '0 0 0 4px var(--focus-ring)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgb(243, 244, 246)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="px-6 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:bg-gray-50 transition flex items-center gap-2 font-bold text-sm shadow-sm">
                        <Filter size={18} />
                        Filtros
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClientes.map((cliente) => (
                        <div key={cliente.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden hover:scale-[1.02] transition-transform group">
                            <div className="p-8 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 font-black text-xl transition shadow-inner group-hover:text-white"
                                             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-color)'}
                                             onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(249, 250, 251)'}>
                                            {cliente.nombre.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 text-lg leading-tight uppercase tracking-tight">{cliente.nombre}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
                                                    <Phone size={12} style={{ color: 'var(--primary-color)' }} />
                                                    {cliente.telefono}
                                                </p>
                                                {cliente.totalReviews > 0 && (
                                                    <div className="flex items-center gap-1 text-amber-500 font-black text-[10px]">
                                                        <Star size={10} fill="currentColor" />
                                                        <span>{cliente.ratingPromedio.toFixed(1)}</span>
                                                        <span className="text-gray-300 font-medium text-[9px]">({cliente.totalReviews})</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Link 
                                        href={`/admin/citas?search=${cliente.telefono}`}
                                        className="p-2 text-gray-300 transition hover:text-[var(--primary-color)] active:scale-95"
                                        title="Ver historial de citas"
                                    >
                                        <ExternalLink size={18} />
                                    </Link>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl space-y-1"
                                         style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)', borderColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', borderStyle: 'solid', borderWidth: '1px' }}>
                                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--primary-color)' }}>Citas</p>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} style={{ color: 'var(--primary-color)' }} />
                                            <p className="font-black text-gray-900 text-xl">{cliente.totalReservas}</p>
                                        </div>
                                    </div>
                                    <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-50 space-y-1">
                                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Inversión</p>
                                        <div className="flex items-center gap-2">
                                            <DollarSign size={14} className="text-purple-500" />
                                            <p className="font-black text-gray-900 text-xl">${cliente.totalSpent || cliente.totalGastado}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Miembro desde</p>
                                        <p className="text-xs font-bold text-gray-700 whitespace-nowrap">{format(new Date(cliente.createdAt), "MMM yyyy", { locale: es })}</p>
                                    </div>
                                    <Link 
                                        href={`/admin/usuarios?phone=${cliente.telefono}&name=${cliente.nombre}`}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--primary-color)';
                                            e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgb(248, 250, 252)';
                                            e.currentTarget.style.color = 'rgb(71, 85, 105)';
                                        }}
                                    >
                                        <Users size={12} />
                                        Gestionar Rol
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredClientes.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                        <Users size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No se encontraron clientes</p>
                    </div>
                )}
            </div>
        </>
    );
}
