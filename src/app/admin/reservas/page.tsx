'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    Calendar, 
    Phone, 
    Clock, 
    Check, 
    X, 
    Loader2, 
    Search, 
    TrendingUp, 
    Zap, 
    MapPin, 
    DollarSign, 
    LayoutGrid, 
    List, 
    ChevronRight, 
    SearchX, 
    Trophy, 
    Gamepad2 
} from 'lucide-react';
import { clsx } from 'clsx';

export default function ReservasAdminPage() {
    const router = useRouter();
    const [reservas, setReservas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

    const fetchReservas = async () => {
        try {
            const res = await fetch('/api/appointments');
            const data = await res.json();
            if (Array.isArray(data)) {
                setReservas(data.map((r: any) => ({
                    id: r.id,
                    cliente: { nombre: r.clientName || 'Cliente', telefono: r.clientPhone || '' },
                    cancha: { nombre: r.serviceName || 'Cancha 1' },
                    fecha: r.date || r.createdAt,
                    horaInicio: r.time || '08:00',
                    horaFin: '09:30',
                    total: r.price || 25000,
                    estado: r.status || 'confirmed',
                    pagoEstado: 'PAGADO',
                })));
            } else if (data.appointments && Array.isArray(data.appointments)) {
                setReservas(data.appointments.map((r: any) => ({
                    id: r.id,
                    cliente: { nombre: r.clientName || 'Cliente', telefono: r.clientPhone || '' },
                    cancha: { nombre: r.serviceName || 'Cancha 1' },
                    fecha: r.date || r.createdAt,
                    horaInicio: r.time || '08:00',
                    horaFin: '09:30',
                    total: r.price || 25000,
                    estado: r.status || 'confirmed',
                    pagoEstado: 'PAGADO',
                })));
            }
        } catch (error) {
            console.error('Error fetching reservas:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReservas(); }, []);

    const filteredReservas = reservas.filter(res => {
        const matchesSearch = res.cliente?.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             res.cliente?.telefono?.includes(searchQuery);
        const matchesFilter = filterStatus === 'all' ? true : 
                            filterStatus === 'pending' ? res.estado === 'pending' :
                            filterStatus === 'confirmed' ? (res.estado === 'confirmed' || res.estado === 'approved') : true;
        return matchesSearch && matchesFilter;
    });

    const StatCard = ({ label, value, icon: Icon, color, trend }: any) => (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 group relative overflow-hidden transition-all hover:border-emerald-500/20 shadow-sm hover:shadow-xl">
            <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-4">
                    <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110",
                        color === 'emerald' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        color === 'blue' ? "bg-blue-50 text-blue-600 border-blue-100" :
                        color === 'amber' ? "bg-amber-50 text-amber-600 border-amber-100" :
                        "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                        <Icon size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">{label}</p>
                        <h4 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">{value}</h4>
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full w-fit border border-slate-100">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{trend}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
            <p className="mt-8 text-slate-400 font-black uppercase tracking-[0.5em] text-[10px] italic">Accediendo a la base...</p>
        </div>
    );

    return (
        <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans">
            <div className="relative">
                <div className="relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-10">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full">
                            <Zap size={12} className="text-emerald-600 animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-[0.2em]">Caja Operativa</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase italic leading-[0.9]">
                            Central <br /> <span className="text-emerald-600">Reservas</span>
                        </h1>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-all" size={20} />
                            <input 
                                type="text"
                                placeholder="CLIENTE O TELÉFONO..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-white border border-slate-200 text-slate-900 text-base py-4 pl-14 pr-8 w-full sm:w-80 rounded-3xl focus:outline-none focus:border-emerald-500 transition-all shadow-sm placeholder:text-slate-300 italic font-black uppercase"
                            />
                        </div>
                        <div className="flex bg-white p-2 rounded-3xl border border-slate-200 shadow-sm gap-1">
                            {['all', 'pending', 'confirmed'].map((id) => (
                                <button key={id} onClick={() => setFilterStatus(id)}
                                    className={clsx("px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all",
                                        filterStatus === id ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50")}>
                                    {id === 'all' ? 'Ver Todo' : id === 'pending' ? 'Pendientes' : 'Aprobadas'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Facturado Hoy" value={`$${filteredReservas.reduce((acc, r) => acc + (r.total || 0), 0).toLocaleString()}`} icon={TrendingUp} color="emerald" trend="Ventas totales" />
                <StatCard label="Caja Real" value={`$${filteredReservas.reduce((acc, r) => acc + (r.total || 0), 0).toLocaleString()}`} icon={Zap} color="blue" trend="Efectivo/Ref" />
                <StatCard label="Aprobadas" value={filteredReservas.filter(r => r.estado === 'confirmed' || r.estado === 'approved').length} icon={Check} color="emerald" trend="En agenda" />
                <StatCard label="Pendientes" value={filteredReservas.filter(r => r.estado === 'pending').length} icon={Clock} color="amber" trend="Por gestionar" />
            </div>

            <div className="flex items-center justify-between mx-2">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">{filteredReservas.length} Reservas listadas</span>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 gap-1 shadow-sm">
                    <button onClick={() => setViewMode('table')} className={clsx("p-2.5 rounded-xl transition-all", viewMode === 'table' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-300 hover:text-slate-600 hover:bg-slate-50")}>
                        <List size={20} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => setViewMode('cards')} className={clsx("p-2.5 rounded-xl transition-all", viewMode === 'cards' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-300 hover:text-slate-600 hover:bg-slate-50")}>
                        <LayoutGrid size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {filteredReservas.length > 0 ? (
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="border-b border-slate-100 pb-4">
                                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Identidad</th>
                                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Cancha & Horario</th>
                                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Monto</th>
                                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredReservas.map((reserva) => (
                                    <tr key={reserva.id} className="hover:bg-slate-50 transition-all">
                                        <td className="py-5 font-black text-slate-900 uppercase italic">
                                            {reserva.cliente.nombre}
                                            <span className="block text-[10px] font-bold text-slate-400">{reserva.cliente.telefono}</span>
                                        </td>
                                        <td className="py-5">
                                            <div className="font-bold text-xs text-slate-800 uppercase">{reserva.cancha.nombre}</div>
                                            <div className="text-[10px] font-black text-emerald-600">{reserva.horaInicio} - {reserva.horaFin}</div>
                                        </td>
                                        <td className="py-5 font-black text-slate-900 text-lg">
                                            ${reserva.total.toLocaleString()}
                                        </td>
                                        <td className="py-5">
                                            <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                Confirmada
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="py-35 bg-white border border-slate-200 border-dashed rounded-[3rem] flex flex-col items-center justify-center text-center p-8">
                    <SearchX size={44} className="text-slate-300 mb-4" />
                    <h3 className="text-xl font-black text-slate-400 uppercase italic">Sin reservas registradas</h3>
                </div>
            )}
        </div>
    );
}
