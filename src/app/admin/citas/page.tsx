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
    Eye,
    TrendingUp,
    Zap,
    MapPin,
    DollarSign,
    LayoutGrid,
    List,
    ChevronRight,
    SearchX,
    CheckCircle2,
    Sparkles,
    Scissors,
    UserCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import MobileAgenda from '@/components/admin/mobile/MobileAgenda';
import { useConfirm } from '@/components/admin/ConfirmContext';

export default function CitasAdminPage() {
    const { confirm } = useConfirm();
    const router = useRouter();
    const [citas, setCitas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');
    const [slug, setSlug] = useState('');

    const fetchCitas = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/appointments/list');
            if (res.ok) {
                const data = await res.json();
                setCitas(Array.isArray(data) ? data : []);
            }
            // Fetch slug info
            const resNegocio = await fetch('/api/negocio');
            if (resNegocio.ok) {
                const nData = await resNegocio.json();
                setSlug(nData?.slug || '');
            }
            
            // Trigger auto-expiration in the background (non-blocking) to prevent SQLite db lock
            fetch('/api/appointments/expire')
                .then(r => r.json())
                .then(data => {
                    if (data?.success && data?.expiredCount > 0) {
                        // If any appointments were expired, silently update the UI with the fresh data
                        fetch('/api/appointments/list')
                            .then(r => r.json())
                            .then(freshData => {
                                setCitas(Array.isArray(freshData) ? freshData : []);
                            })
                            .catch(() => {});
                    }
                })
                .catch(err => console.error('Error background expire:', err));
        } catch (error) {
            console.error('Error fetching citas:', error);
            setCitas([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchCitas(); 
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (color) setPrimaryColor(color);

        // 1. Escuchar actualizaciones en tiempo real (FCM push en foreground)
        const handleFcmNotify = () => {
            console.log('[REALTIME] Notificación push recibida en vivo, actualizando citas...');
            fetchCitas();
        };
        window.addEventListener('fcm-notification-received', handleFcmNotify);

        // 2. Polling inteligente de respaldo (cada 30 segundos, solo si la pestaña está activa)
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                console.log('[REALTIME] Polling de respaldo: actualizando citas...');
                fetchCitas();
            }
        }, 30000);

        return () => {
            window.removeEventListener('fcm-notification-received', handleFcmNotify);
            clearInterval(interval);
        };
    }, []);

    const filteredCitas = citas.filter(res => {
        const matchesSearch = res.cliente?.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             res.cliente?.telefono?.includes(searchQuery) ||
                             res.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             res.shareToken?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesFilter = 
            filterStatus === 'all' ? true : 
            filterStatus === 'active' ? (res.estado === 'pending' || res.estado === 'confirmed' || res.estado === 'approved' || res.estado === 'client_checked_in' || res.estado === 'in_progress') :
            filterStatus === 'pending' ? res.estado === 'pending' :
            filterStatus === 'confirmed' ? (res.estado === 'confirmed' || res.estado === 'approved') :
            filterStatus === 'completed' ? res.estado === 'completed' :
            filterStatus === 'cancelled' ? (res.estado === 'cancelled' || res.estado === 'no_show') :
            filterStatus === 'expired' ? res.estado === 'expired' : true;

        return matchesSearch && matchesFilter;
    });

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const handleConfirm = async (id: string) => {
        const isOk = await confirm('¿Confirmar esta cita?', {
            title: 'Confirmar Cita',
            confirmText: 'Confirmar',
            type: 'info'
        });
        if (!isOk) return;
        setIsUpdatingStatus(true);
        try {
            const res = await fetch(`/api/appointments/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ estado: 'confirmed' })
            });
            if (res.ok) await fetchCitas();
        } catch (e) {} finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleCancel = async (id: string) => {
        const isOk = await confirm('¿Cancelar esta cita?', {
            title: 'Cancelar Cita',
            confirmText: 'Sí, Cancelar',
            type: 'danger'
        });
        if (!isOk) return;
        setIsUpdatingStatus(true);
        try {
            const res = await fetch(`/api/appointments/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ estado: 'cancelled' })
            });
            if (res.ok) await fetchCitas();
        } catch (e) {} finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleUpdateStatus = async (id: string, nuevoEstado: string) => {
        let confirmMsg = '¿Actualizar el estado de esta cita?';
        let showMontoInput = false;
        let precioSugerido = 0;

        if (nuevoEstado === 'confirmed') confirmMsg = '¿Confirmar esta cita?';
        else if (nuevoEstado === 'cancelled') confirmMsg = '¿Rechazar/Cancelar esta cita?';
        else if (nuevoEstado === 'client_checked_in') confirmMsg = '¿Confirmar la asistencia del cliente (Llegó)?';
        else if (nuevoEstado === 'in_progress') confirmMsg = '¿Confirmar la llegada del cliente (Llegó)?';
        else if (nuevoEstado === 'completed') {
            confirmMsg = '¿Finalizar esta cita?';
            showMontoInput = true;
            // Buscar la cita para pre-llenar con su total presupuestado
            const cita = citas.find((c: any) => c.id === id);
            precioSugerido = cita?.total || cita?.service?.precio || 0;
        }

        const res = await confirm(confirmMsg, {
            title: nuevoEstado === 'completed' ? 'Finalizar y Cobrar' : 'Actualizar Estado',
            showInput: showMontoInput,
            inputValue: precioSugerido,
            inputLabel: 'Monto Cobrado ($)',
            confirmText: nuevoEstado === 'completed' ? 'Finalizar y Cobrar' : 'Aceptar',
            type: nuevoEstado === 'cancelled' ? 'danger' : 'warning'
        });

        if (!res) return; // canceló o cerró el modal

        // Extraer el monto cobrado si aplica
        const montoCobrado = typeof res === 'object' ? res.value : undefined;

        setIsUpdatingStatus(true);
        try {
            const resFetch = await fetch(`/api/appointments/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ 
                    estado: nuevoEstado,
                    montoCobrado: montoCobrado
                })
            });
            if (resFetch.ok) await fetchCitas();
        } catch (e) {
            console.error('Error updating status:', e);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="w-16 h-16 animate-spin" style={{ color: 'var(--primary-color)' }} />
            <p className="mt-8 text-slate-400 font-black uppercase tracking-[0.5em] text-[10px] italic">Accediendo a la base...</p>
        </div>
    );

    return (
        <>
            {/* VISTA MÓVIL (AGENDA NATIVA) */}
            <div className="md:hidden -mx-5 -mt-5">
                <MobileAgenda 
                    citas={citas} 
                    primaryColor={primaryColor} 
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    onUpdateStatus={handleUpdateStatus}
                    slug={slug}
                />
            </div>

            {/* VISTA ESCRITORIO */}
            <div className="hidden md:block space-y-10 md:space-y-16 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-10">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 border rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', borderColor: 'color-mix(in srgb, var(--primary-color), transparent 80%)' }}>
                                <Zap size={12} className="animate-pulse" style={{ color: 'var(--primary-color)' }} />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--primary-color)' }}>Caja Operativa</span>
                            </div>
                            <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter uppercase italic leading-[0.8]">
                                Central <br /> <span style={{ color: 'var(--primary-color)' }}>Inbox</span>
                            </h1>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                            <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 transition-all" style={{ color: 'var(--primary-color)' }} size={20} />
                                <input 
                                    type="text"
                                    placeholder="CLIENTE, TELÉFONO O ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-white border border-slate-200 text-slate-900 text-base py-5 pl-14 pr-8 w-full sm:w-96 rounded-3xl focus:outline-none transition-all shadow-sm placeholder:text-slate-300 italic font-black uppercase"
                                    style={{ borderColor: 'var(--primary-color)' }}
                                />
                            </div>
                            <div className="flex flex-wrap bg-white p-1.5 rounded-3xl border border-slate-200 shadow-xl gap-1">
                                {[
                                    { id: 'active', label: 'Pendientes y Confirmadas' },
                                    { id: 'pending', label: 'Solo Pendientes' },
                                    { id: 'confirmed', label: 'Solo Confirmadas' },
                                    { id: 'completed', label: 'Finalizadas' },
                                    { id: 'cancelled', label: 'Canceladas' },
                                    { id: 'all', label: 'Ver Todo' }
                                ].map((opt) => (
                                    <button key={opt.id} onClick={() => setFilterStatus(opt.id)}
                                        className={clsx("px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all",
                                            filterStatus === opt.id ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50")}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    <StatCard label="Ingresos Hoy" value={`$${filteredCitas.reduce((acc, r) => acc + (r.total || 0), 0)}`} icon={TrendingUp} color="emerald" trend="Venta bruta" />
                    <StatCard label="Pagado" value={`$${filteredCitas.reduce((acc, r) => acc + (r.pagos?.reduce((pAcc: number, p: any) => pAcc + (p.monto || 0), 0) || 0), 0)}`} icon={Zap} color="blue" trend="Recaudado" />
                    <StatCard label="Aprobadas" value={filteredCitas.filter(r => r.estado === 'confirmed' || r.estado === 'approved').length} icon={Check} color="emerald" trend="Agendadas" />
                    <StatCard label="Pendientes" value={filteredCitas.filter(r => r.estado === 'pending').length} icon={Clock} color="amber" trend="Por confirmar" />
                </div>

                <div className="flex items-center justify-between mx-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">{filteredCitas.length} Servicios en agenda</span>
                    </div>
                    <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 gap-1 shadow-sm">
                        <button onClick={() => setViewMode('table')} className={clsx("p-3 rounded-xl transition-all", viewMode === 'table' ? "text-white shadow-lg" : "text-slate-300 hover:text-slate-600 hover:bg-slate-50")} style={viewMode === 'table' ? { backgroundColor: 'var(--primary-color)' } : {}}>
                            <List size={22} strokeWidth={3} />
                        </button>
                        <button onClick={() => setViewMode('cards')} className={clsx("p-3 rounded-xl transition-all", viewMode === 'cards' ? "text-white shadow-lg" : "text-slate-300 hover:text-slate-600 hover:bg-slate-50")} style={viewMode === 'cards' ? { backgroundColor: 'var(--primary-color)' } : {}}>
                            <LayoutGrid size={22} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                {filteredCitas.length > 0 ? (
                    <div className="relative group/view overflow-x-hidden min-h-[400px]">
                        {viewMode === 'table' && (
                            <div className="animate-in fade-in slide-in-from-left-4 duration-500 bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[900px]">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                <th className="px-10 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Identidad</th>
                                                <th className="px-10 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Bloque</th>
                                                <th className="px-10 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Monto</th>
                                                <th className="px-10 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Status</th>
                                                <th className="px-10 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic text-right">Ver</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredCitas.map((reserva) => (
                                                <tr key={reserva.id} onClick={() => router.push(`/admin/citas/${reserva.id}`)} className="hover:bg-slate-50 transition-all group/row cursor-pointer">
                                                    <td className="px-10 py-10">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 font-black text-lg group-hover/row:text-white transition-all transform group-hover/row:rotate-6" style={ { '--tw-bg-opacity': '1' } as any }>
                                                                    <style jsx>{`
                                                                        .group\/row:hover .w-14 { background-color: var(--primary-color); }
                                                                    `}</style>
                                                                    {reserva.cliente.nombre.charAt(0)}
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <span className="block font-black text-slate-800 text-lg uppercase italic transition-colors leading-none truncate max-w-[180px]" style={ { color: 'inherit' } as any }>
                                                                        <style jsx>{`
                                                                            .group\/row:hover .text-slate-800 { color: var(--primary-color); }
                                                                        `}</style>
                                                                        {reserva.cliente.nombre}
                                                                    </span>
                                                                    <span className="block text-slate-400 text-[9px] font-black uppercase tracking-widest leading-none">{reserva.cliente.telefono}</span>
                                                                </div>
                                                            </div>
                                                            <ServiceInfo reserva={reserva} />
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-10">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-3">
                                                                <Scissors size={14} style={{ color: 'var(--primary-color)' }} />
                                                                <span className="text-xs font-black text-slate-700 italic uppercase">{reserva.service?.nombre || reserva.nombreServicio}</span>
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[10px] font-black uppercase tracking-tighter italic" style={{ color: 'var(--primary-color)' }}>
                                                                    {reserva.horaInicio} - {reserva.horaFin}
                                                                </span>
                                                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest italic group-hover/row:text-slate-900 transition-colors">
                                                                    {format(new Date(reserva.fecha), 'EEE d MMM', { locale: es })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-10">
                                                        <span className="text-2xl font-black text-slate-900 tracking-tighter italic">${reserva.total}</span>
                                                    </td>
                                                    <td className="px-10 py-10">
                                                        {(() => {
                                                            const status = reserva.estado?.toLowerCase() || 'pending';
                                                            const isPending = status === 'pending';
                                                            const isConfirmed = status === 'confirmed' || status === 'approved' || status === 'confirmada';
                                                            const isExpired = status === 'expired';
                                                            const isCheckedIn = status === 'client_checked_in';
                                                            const isInProgress = status === 'in_progress';
                                                            const isCompleted = status === 'completed';
                                                            const isCancelled = status === 'cancelled';
                                                            
                                                            let label = status;
                                                            let classes = "bg-slate-50 text-slate-500 border-slate-100";
                                                            let styles = {};

                                                            if (isPending) {
                                                                label = 'Pendiente';
                                                                classes = "bg-amber-50 text-amber-700 border-amber-100";
                                                            } else if (isConfirmed) {
                                                                label = 'Confirmada';
                                                                classes = "bg-white border-slate-200";
                                                                styles = { color: 'var(--primary-color)', borderColor: 'var(--primary-color)', backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)' };
                                                            } else if (isCheckedIn) {
                                                                label = 'Llegó (Por Confirmar)';
                                                                classes = "bg-indigo-50 text-indigo-700 border-indigo-100 animate-pulse";
                                                            } else if (isInProgress) {
                                                                label = 'Llegó';
                                                                classes = "bg-purple-50 text-purple-700 border-purple-100";
                                                            } else if (isCompleted) {
                                                                label = 'Finalizada';
                                                                classes = "bg-slate-900 text-white border-slate-900";
                                                            } else if (isCancelled) {
                                                                label = 'Cancelada';
                                                                classes = "bg-rose-50 text-rose-700 border-rose-100";
                                                            } else if (isExpired) {
                                                                label = 'Expirada';
                                                                classes = "bg-slate-100 text-slate-400 border-slate-200";
                                                            }
                                                            
                                                            return (
                                                                <span className={clsx("px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border transition-all", classes)} style={styles}>
                                                                    {label}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-10 py-10 text-right">
                                                        <ChevronRight size={24} className="text-slate-200 group-hover/row:text-slate-900 transition-all inline-block" />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {viewMode === 'cards' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                {filteredCitas.map((reserva) => (
                                    <div key={reserva.id} onClick={() => router.push(`/admin/citas/${reserva.id}`)}
                                        className="bg-white border border-slate-200 p-8 rounded-[3rem] space-y-8 hover:border-slate-400 transition-all group/card cursor-pointer relative overflow-hidden shadow-sm hover:shadow-2xl">
                                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] -mr-16 -mt-16" style={{ backgroundColor: 'var(--primary-color)', opacity: 0.05 }} />
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-[1.5rem] flex items-center justify-center text-slate-400 font-black text-xl group-hover/card:text-white transition-all border border-white/5"
                                                     style={ { '--tw-bg-opacity': '1' } as any }>
                                                    <style jsx>{`
                                                        .group\/card:hover .w-16 { background-color: var(--primary-color); }
                                                    `}</style>
                                                    {reserva.cliente.nombre.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 italic tracking-tighter leading-none uppercase truncate max-w-[140px]">{reserva.cliente.nombre}</h3>
                                                    <p className="text-[10px] font-black uppercase tracking-widest mt-2 italic" style={{ color: 'var(--primary-color)' }}>{reserva.cliente.telefono}</p>
                                                    <ServiceInfo reserva={reserva} />
                                                </div>
                                            </div>
                                            <ChevronRight size={24} className="text-slate-200 group-hover/card:text-slate-900 group-hover/card:translate-x-2 transition-all" />
                                        </div>
                                        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Scissors size={16} style={{ color: 'var(--primary-color)' }} />
                                                    <span className="text-xs font-black text-slate-700 italic uppercase">{reserva.service?.nombre || reserva.nombreServicio}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 italic uppercase">{format(new Date(reserva.fecha), 'd MMM', { locale: es })}</span>
                                            </div>
                                            <div className="flex items-end justify-between">
                                                <div className="flex items-center gap-2 px-5 py-2.5 bg-white shadow-sm border border-slate-100 rounded-2xl">
                                                    <Clock size={16} style={{ color: 'var(--primary-color)' }} />
                                                    <span className="text-sm font-black text-slate-800 italic uppercase">{reserva.horaInicio} - {reserva.horaFin}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo</p>
                                                    <p className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">${reserva.total}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between px-2">
                                            {(() => {
                                                const status = reserva.estado?.toLowerCase() || 'pending';
                                                const isPending = status === 'pending';
                                                const isConfirmed = status === 'confirmed' || status === 'approved' || status === 'confirmada';
                                                const isExpired = status === 'expired';
                                                const isCheckedIn = status === 'client_checked_in';
                                                const isInProgress = status === 'in_progress';
                                                const isCompleted = status === 'completed';
                                                const isCancelled = status === 'cancelled';
                                                
                                                let label = status;
                                                let classes = "bg-slate-50 text-slate-500 border-slate-100";
                                                let styles = {};

                                                if (isPending) {
                                                    label = 'Pendiente';
                                                    classes = "bg-amber-50 text-amber-700 border-amber-100";
                                                } else if (isConfirmed) {
                                                    label = 'Confirmada';
                                                    classes = "bg-white border-slate-200";
                                                    styles = { color: 'var(--primary-color)', borderColor: 'var(--primary-color)', backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)' };
                                                } else if (isCheckedIn) {
                                                    label = 'Llegó (Por Confirmar)';
                                                    classes = "bg-indigo-50 text-indigo-700 border-indigo-100 animate-pulse";
                                                } else if (isInProgress) {
                                                    label = 'Llegó';
                                                    classes = "bg-purple-50 text-purple-700 border-purple-100";
                                                } else if (isCompleted) {
                                                    label = 'Finalizada';
                                                    classes = "bg-slate-900 text-white border-slate-900";
                                                } else if (isCancelled) {
                                                    label = 'Cancelada';
                                                    classes = "bg-rose-50 text-rose-700 border-rose-100";
                                                } else if (isExpired) {
                                                    label = 'Expirada';
                                                    classes = "bg-slate-100 text-slate-400 border-slate-200";
                                                }
                                                
                                                return (
                                                    <div className={clsx("px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border", classes)} style={styles}>
                                                        {label}
                                                    </div>
                                                );
                                            })()}
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic leading-none">Status Caja</p>
                                                <p className={clsx("text-[10px] font-black uppercase italic leading-none")} style={reserva.pagoEstado === 'PAGADO' ? { color: 'var(--primary-color)' } : { color: '#d97706' }}>{reserva.pagoEstado || 'PENDIENTE'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative py-40 bg-white border border-slate-200 border-dashed rounded-[4rem] flex flex-col items-center justify-center text-center px-10 shadow-sm">
                        <SearchX size={48} strokeWidth={1} className="text-slate-200 mb-8" />
                        <h3 className="text-2xl font-black text-slate-300 uppercase italic tracking-widest">Sin resultados</h3>
                        <p className="mt-4 text-slate-400 text-[10px] font-black uppercase tracking-widest italic max-w-xs leading-relaxed">No hay reservas que coincidan con los filtros actuales.</p>
                    </div>
                )}
            </div>

            {/* SUPER LOADING OVERLAY */}
            {isUpdatingStatus && (
                <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative flex flex-col items-center">
                        {/* Círculo animado exterior */}
                        <div className="size-24 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                        {/* Círculo animado interior en dirección contraria */}
                        <div className="absolute inset-0 size-24 rounded-full border-4 border-dashed border-emerald-400/10 animate-spin [animation-direction:reverse] [animation-duration:3s]" />
                        
                        <div className="mt-8 space-y-2 text-center">
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter animate-pulse">
                                Actualizando Agenda
                            </h3>
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] leading-none animate-pulse">
                                Por favor espera un momento...
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function StatCard({ label, value, icon: Icon, color, trend }: any) {
    return (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 group relative overflow-hidden transition-all hover:border-emerald-500/20 shadow-sm hover:shadow-xl">
            <div className={`absolute -top-12 -right-12 w-32 h-32 bg-${color}-500/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-${color}-500/10 transition-all`} />
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
}

function ServiceInfo({ reserva }: { reserva: any }) {
    return (
        <div className="mt-4 space-y-2 animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-2">
                <UserCircle size={14} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 italic">
                    {reserva.staff?.nombre || reserva.staff?.name || 'Cualquier profesional'}
                </span>
            </div>
        </div>
    );
}
