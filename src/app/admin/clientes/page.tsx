'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Phone, Calendar, DollarSign, Loader2, ExternalLink, Filter, Star, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import MobileClients from '@/components/admin/mobile/MobileClients';
import ClienteHistorialModal from '@/components/admin/ClienteHistorialModal';

// Enmascara un teléfono: +593 *** *** 321
function maskPhone(phone: string): string {
    if (!phone) return '*** *** ****';
    const digits = phone.replace(/\D/g, '');
    const last3 = digits.slice(-3);
    const prefix = phone.startsWith('+') ? '+' + digits.slice(0, 3) : digits.slice(0, 2);
    return `${prefix} *** *** ${last3}`;
}

// Enmascara un nombre: "Juan Pérez" → "J*** P***"
function maskName(name: string): string {
    if (!name) return '***';
    return name.split(' ').map(part => part.charAt(0) + '***').join(' ');
}

export default function ClientesPage() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');
    const [selectedCliente, setSelectedCliente] = useState<any>(null);
    const [isHistorialOpen, setIsHistorialOpen] = useState(false);
    const [isPlanFree, setIsPlanFree] = useState(false);

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

        async function fetchPlan() {
            try {
                const res = await fetch('/api/features');
                if (res.ok) {
                    const data = await res.json();
                    // En plan FREE, communications_module viene false
                    setIsPlanFree(data.communications_module === false);
                }
            } catch {}
        }

        fetchClientes();
        fetchPlan();

        // Obtener color primario
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (color) setPrimaryColor(color);
    }, []);

    const filteredClientes = clientes.filter(c => {
        const nombre = (c?.nombre || '').toLowerCase();
        const telefono = (c?.telefono || '');
        const search = searchTerm.toLowerCase();
        return nombre.includes(search) || telefono.includes(search);
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin mb-4" size={32} style={{ color: 'var(--primary-color)' }} />
                <p className="text-gray-400 font-bold uppercase tracking-wide text-xs">Cargando Clientes...</p>
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
                    onVerHistorial={(cliente) => {
                        setSelectedCliente(cliente);
                        setIsHistorialOpen(true);
                    }}
                />
            </div>

            {/* VISTA ESCRITORIO */}
            <div className="hidden md:block space-y-8 animate-in fade-in duration-500">

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Clientes</h1>
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

                {/* Banner plan FREE */}
                {isPlanFree && (
                    <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm font-semibold">
                        <Lock size={16} className="shrink-0 text-amber-500" />
                        <div>
                            <span className="font-bold">Plan gratuito:</span> La información de contacto de tus clientes está protegida.
                            Actualiza al plan <span className="font-bold">Pro</span> para ver nombres, teléfonos y acceder a fichas completas.
                        </div>
                    </div>
                )}

                <div className="flex gap-4">
                    <div className="relative flex-1 group flex items-center">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--primary-color)] transition-colors pointer-events-none z-10" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o teléfono..."
                            style={{ paddingLeft: '3.2rem' }}
                            className="w-full pr-4 py-4 bg-white border border-gray-100 rounded-2xl outline-none transition-all text-sm font-medium text-gray-900 shadow-sm"
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, var(--primary-color), transparent 95%)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgb(243 244 246)';
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
                    {filteredClientes.map((cliente) => {
                        const displayNombre = isPlanFree ? maskName(cliente?.nombre || '') : (cliente?.nombre || 'Sin Nombre');
                        const displayTelefono = isPlanFree ? maskPhone(cliente?.telefono || '') : (cliente?.telefono || 'Sin teléfono');
                        const initialLetter = (cliente?.nombre || 'C').charAt(0).toUpperCase();
                        const formattedDate = cliente?.createdAt
                            ? (() => {
                                try { return format(new Date(cliente.createdAt), "MMM yyyy", { locale: es }); }
                                catch { return 'Reciente'; }
                              })()
                            : 'Reciente';

                        const cardContent = (
                            <div key={cliente.id} className={`bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden transition-transform group flex flex-col justify-between ${!isPlanFree ? 'hover:scale-[1.02]' : 'cursor-not-allowed'}`}>
                                {isPlanFree && (
                                    <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-100 text-xs font-bold text-amber-700 uppercase tracking-wide">
                                        <Lock size={10} /> Datos protegidos · Plan Pro
                                    </div>
                                )}
                                <div className="p-8 space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 font-bold text-xl shadow-inner">
                                                {isPlanFree ? <Lock size={20} className="text-amber-400" /> : initialLetter}
                                            </div>
                                            <div>
                                                <h3 className={`font-bold text-lg leading-tight tracking-tight ${isPlanFree ? 'text-gray-400 blur-[2px] select-none' : 'text-gray-900'}`}>{displayNombre}</h3>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
                                                        <Phone size={12} style={{ color: 'var(--primary-color)' }} />
                                                        <span className={isPlanFree ? 'blur-[2px] select-none' : ''}>{displayTelefono}</span>
                                                    </p>
                                                    {!isPlanFree && cliente?.totalReviews > 0 && (
                                                        <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                                                            <Star size={10} fill="currentColor" />
                                                            <span>{Number(cliente.ratingPromedio || 0).toFixed(1)}</span>
                                                            <span className="text-gray-300 font-medium text-xs">({cliente.totalReviews})</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {!isPlanFree && (
                                            <span
                                                className="p-2 text-gray-400 rounded-xl"
                                                title="Ver ficha completa del cliente"
                                                aria-hidden="true"
                                            >
                                                <ExternalLink size={18} />
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl space-y-1"
                                             style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)', borderColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', borderStyle: 'solid', borderWidth: '1px' }}>
                                            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--primary-color)' }}>Servicios</p>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} style={{ color: 'var(--primary-color)' }} />
                                                <p className="font-bold text-gray-900 text-xl">{cliente?.totalReservas || 0}</p>
                                            </div>
                                        </div>
                                        <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-50 space-y-1">
                                            <p className="text-xs font-bold text-purple-600 uppercase tracking-wide">Inversión</p>
                                            <div className="flex items-center gap-2">
                                                <DollarSign size={14} className="text-purple-500" />
                                                <p className={`font-bold text-gray-900 text-xl ${isPlanFree ? 'blur-[3px] select-none' : ''}`}>${isPlanFree ? '***' : (cliente?.totalSpent || cliente?.totalGastado || '0.00')}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide leading-none">Miembro desde</p>
                                            <p className="text-xs font-bold text-gray-700 whitespace-nowrap">{formattedDate}</p>
                                        </div>
                                        {isPlanFree ? (
                                            <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold uppercase tracking-wide">
                                                <Lock size={10} /> Plan Pro
                                            </div>
                                        ) : (
                                            <Link
                                                href={`/admin/clientes/${cliente.id}`}
                                                className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white hover:bg-indigo-600 rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-md active:scale-95"
                                            >
                                                Ver Ficha Completa →
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );

                        return isPlanFree ? (
                            <div key={cliente.id}>{cardContent}</div>
                        ) : (
                            <Link key={cliente.id} href={`/admin/clientes/${cliente.id}`} className="block">
                                {cardContent}
                            </Link>
                        );
                    })}
                </div>

                {filteredClientes.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                        <Users size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-gray-400 font-bold uppercase tracking-wide text-sm">No se encontraron clientes</p>
                    </div>
                )}
            </div>

            {/* Modal de Historial de Citas del Cliente */}
            <ClienteHistorialModal 
                isOpen={isHistorialOpen}
                onClose={() => {
                    setIsHistorialOpen(false);
                    setSelectedCliente(null);
                }}
                cliente={selectedCliente}
            />
        </>
    );
}
