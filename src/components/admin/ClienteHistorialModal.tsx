'use client';

import { useState, useEffect } from 'react';
import { 
    X, Calendar, Clock, Scissors, User, Sparkles, DollarSign, 
    Loader2, Gem, Wallet, Tag, Trophy, Gift, Award, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';

interface Cita {
    id: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    estado: string;
    total: number;
    clienteId: string;
    service?: {
        nombre: string;
    };
    staff?: {
        name: string;
    };
    pagoReserva?: any[];
}

interface ClienteHistorialModalProps {
    isOpen: boolean;
    onClose: () => void;
    cliente: {
        id: string;
        nombre: string;
        telefono: string;
    } | null;
}

export default function ClienteHistorialModal({ 
    isOpen, 
    onClose, 
    cliente 
}: ClienteHistorialModalProps) {
    const [citas, setCitas] = useState<Cita[]>([]);
    const [loyalty, setLoyalty] = useState<any>({
        points: 0,
        cashback: 0,
        level: 'Bronce',
        cupones: [],
        misiones: [],
        regalos: []
    });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'fidelidad' | 'citas' | 'cupones' | 'misiones' | 'regalos'>('fidelidad');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen || !cliente) return;

        const loadHistorial = async () => {
            setLoading(true);
            setError('');
            try {
                // 1. Obtener detalles extendidos de fidelidad
                const detailRes = await fetch(`/api/clientes/${cliente.id}/detalles`);
                if (detailRes.ok) {
                    const detailData = await detailRes.json();
                    if (detailData.loyalty) {
                        setLoyalty(detailData.loyalty);
                    }
                }

                // 2. Obtener historial de citas
                const res = await fetch('/api/appointments/list');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        // Filtrar citas del cliente actual
                        const clientCitas = data.filter((c: any) => c.clienteId === cliente.id);
                        setCitas(clientCitas);
                    }
                }
            } catch (err) {
                setError('Error de conexión con el servidor.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadHistorial();
        setActiveTab('fidelidad'); // Reset tab on open
    }, [isOpen, cliente]);

    if (!isOpen || !cliente) return null;

    // Colores estéticos para los badges de estado de citas
    const getStatusBadge = (estado: string) => {
        const est = estado.toLowerCase();
        switch (est) {
            case 'confirmed':
            case 'confirmada':
                return { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20', label: 'Confirmada' };
            case 'pending':
            case 'pendiente':
                return { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20', label: 'Pendiente' };
            case 'completed':
            case 'finalizada':
                return { bg: 'bg-slate-50 dark:bg-white/5', text: 'text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/5', label: 'Finalizada' };
            case 'in_progress':
            case 'llego':
                return { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20', label: 'Llegó' };
            case 'client_checked_in':
                return { bg: 'bg-rose-50 dark:bg-rose-500/10 animate-pulse', text: 'text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20', label: 'Llegó (Por Confirmar)' };
            case 'cancelled':
            case 'cancelada':
                return { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20', label: 'Cancelada' };
            default:
                return { bg: 'bg-slate-50 dark:bg-white/5', text: 'text-slate-600 dark:text-slate-400 border border-slate-100', label: estado };
        }
    };

    // Estilo premium para el Nivel
    const getLevelStyle = (level: string) => {
        const lvl = level?.toLowerCase() || '';
        if (lvl.includes('diamante')) {
            return {
                bg: 'from-cyan-500/20 via-blue-500/20 to-indigo-500/20 border-cyan-300/30',
                text: 'text-cyan-500',
                label: 'Diamante VIP',
                iconColor: '#06b6d4'
            };
        }
        if (lvl.includes('oro') || lvl.includes('gold')) {
            return {
                bg: 'from-amber-400/20 via-yellow-500/15 to-amber-600/20 border-amber-300/30',
                text: 'text-amber-500',
                label: 'Socio Oro',
                iconColor: '#f59e0b'
            };
        }
        if (lvl.includes('plata') || lvl.includes('silver')) {
            return {
                bg: 'from-slate-300/20 via-slate-400/15 to-slate-500/20 border-slate-300/30',
                text: 'text-slate-400',
                label: 'Socio Plata',
                iconColor: '#94a3b8'
            };
        }
        return {
            bg: 'from-emerald-500/10 via-teal-500/10 to-emerald-600/10 border-emerald-500/20',
            text: 'text-emerald-500',
            label: 'Socio Bronce',
            iconColor: '#10b981'
        };
    };

    const levelStyle = getLevelStyle(loyalty.level);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Backdrop con blur */}
            <div 
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500" 
                onClick={onClose} 
            />
            
            {/* Contenedor del Modal */}
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-slate-100 dark:border-white/5 max-h-[85vh] flex flex-col">
                
                {/* Cabecera decorativa */}
                <div className="h-2 w-full bg-gradient-to-r from-[var(--primary-color,#0ea5e9)] via-pink-500 to-purple-600" />
                
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all rounded-full hover:bg-slate-100 dark:hover:bg-white/5 active:scale-90 z-20"
                >
                    <X size={20} />
                </button>

                {/* Header Info */}
                <div className="p-8 pb-4 space-y-2 shrink-0">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic leading-none">
                        Ficha de <span className="text-[var(--primary-color,#0ea5e9)]">Cliente</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider italic">
                        <span>Nombre:</span> 
                        <span className="text-slate-800 dark:text-slate-200">{cliente.nombre}</span> 
                        <span className="text-slate-300 dark:text-slate-700">|</span> 
                        <span>Tel:</span> 
                        <span className="text-slate-800 dark:text-slate-200">{cliente.telefono}</span>
                    </div>
                </div>

                {/* TABS DE NAVEGACIÓN - PREMIUM BAR */}
                <div className="px-8 border-b border-slate-100 dark:border-white/5 overflow-x-auto shrink-0 flex gap-2 pb-2 scrollbar-none">
                    {[
                        { id: 'fidelidad', label: 'Fidelidad', icon: Gem },
                        { id: 'citas', label: 'Citas', icon: Calendar },
                        { id: 'cupones', label: 'Cupones', icon: Tag, badge: loyalty.cupones?.length },
                        { id: 'misiones', label: 'Misiones', icon: Trophy, badge: loyalty.misiones?.length },
                        { id: 'regalos', label: 'Regalos', icon: Gift, badge: loyalty.regalos?.length }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 active:scale-95 active:duration-75",
                                    isActive 
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md"
                                        : "bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10"
                                )}
                            >
                                <Icon size={12} />
                                {tab.label}
                                {tab.badge !== undefined && tab.badge > 0 && (
                                    <span className={clsx(
                                        "px-1.5 py-0.5 rounded-lg text-[8px] font-black",
                                        isActive ? "bg-pink-500 text-white" : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                                    )}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* CONTENIDO PRINCIPAL (Scrollable) */}
                <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/20">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="animate-spin text-[var(--primary-color,#0ea5e9)] mb-4" size={32} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando detalles...</p>
                        </div>
                    ) : error ? (
                        <div className="p-6 bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10 rounded-[2rem] text-center">
                            <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest">{error}</p>
                        </div>
                    ) : (
                        <>
                            {/* TAB: FIDELIDAD */}
                            {activeTab === 'fidelidad' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {/* Nivel Card */}
                                    <div className={clsx("relative overflow-hidden p-6 rounded-[2.5rem] bg-gradient-to-br border shadow-lg flex items-center justify-between", levelStyle.bg)}>
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 shadow-md">
                                                <Award size={28} style={{ color: levelStyle.iconColor }} />
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Nivel de Lealtad</span>
                                                <h3 className="text-xl font-black uppercase italic tracking-tight">{levelStyle.label}</h3>
                                            </div>
                                        </div>
                                        <Sparkles size={40} className="absolute right-6 opacity-10 animate-pulse" />
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-500 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-500/20">
                                                <Gem size={20} />
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Diamantes</span>
                                                <p className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{loyalty.points}</p>
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                                                <Wallet size={20} />
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saldo Cashback</span>
                                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">${parseFloat(loyalty.cashback || 0).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Breve explicación */}
                                    <p className="text-[10px] font-semibold text-slate-400 text-center italic mt-2">
                                        El cliente acumula diamantes por cada cita completada y reseñas enviadas. El cashback puede usarse como saldo a favor en futuras citas.
                                    </p>
                                </div>
                            )}

                            {/* TAB: CITAS */}
                            {activeTab === 'citas' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    {citas.length === 0 ? (
                                        <div className="py-16 text-center space-y-4">
                                            <Calendar size={32} className="mx-auto text-slate-300" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No registra citas aún</p>
                                        </div>
                                    ) : (
                                        citas.map((cita) => {
                                            const badge = getStatusBadge(cita.estado);
                                            const fechaCita = new Date(cita.fecha);
                                            const fechaLegible = isNaN(fechaCita.getTime()) 
                                                ? cita.fecha 
                                                : format(fechaCita, "EEEE d 'de' MMMM, yyyy", { locale: es });

                                            return (
                                                <div 
                                                    key={cita.id}
                                                    className="bg-white dark:bg-slate-900/60 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex gap-4 items-center">
                                                            <div className="size-10 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                                                                <Scissors size={18} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs leading-tight">
                                                                    {cita.service?.nombre || 'Servicio'}
                                                                </h4>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                                                    <User size={10} className="text-[var(--primary-color,#0ea5e9)]" />
                                                                    {cita.staff?.name || 'Profesional'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className={clsx("px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest", badge.bg, badge.text)}>
                                                            {badge.label}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50 dark:border-white/5 text-[11px] text-slate-500 font-bold">
                                                        <span className="capitalize">{fechaLegible}</span>
                                                        <span className="text-right">{cita.horaInicio} - {cita.horaFin}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {/* TAB: CUPONES */}
                            {activeTab === 'cupones' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    {loyalty.cupones?.length === 0 ? (
                                        <div className="py-16 text-center space-y-4">
                                            <Tag size={32} className="mx-auto text-slate-300" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No tiene cupones asignados</p>
                                        </div>
                                    ) : (
                                        loyalty.cupones.map((cc: any) => {
                                            const statusColors = 
                                                cc.estado === 'DISPONIBLE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                cc.estado === 'USADO' ? 'bg-slate-50 text-slate-400 border-slate-100' :
                                                'bg-rose-50 text-rose-500 border-rose-100';

                                            return (
                                                <div 
                                                    key={cc.id}
                                                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2rem] p-5 shadow-sm flex items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="size-11 bg-pink-50 text-pink-500 dark:bg-pink-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-pink-100/50">
                                                            <Tag size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs leading-none">{cc.nombre || 'Cupón Especial'}</h4>
                                                                <span className={clsx("px-2 py-0.5 rounded text-[8px] font-black border", statusColors)}>
                                                                    {cc.estado}
                                                                </span>
                                                            </div>
                                                            <p className="text-[9px] font-bold text-slate-400 mt-1">{cc.descripcion || 'Sin descripción adicional.'}</p>
                                                            <div className="flex items-center gap-3 mt-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                                <span>CÓDIGO: <strong className="text-slate-800 dark:text-white bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-slate-150/40">{cc.codigo}</strong></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="text-2xl font-black italic tracking-tighter text-pink-500">
                                                            {cc.tipo === 'PORCENTAJE' ? `${cc.descuento}%` : `$${cc.descuento}`}
                                                        </span>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Desc.</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {/* TAB: MISIONES */}
                            {activeTab === 'misiones' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    {loyalty.misiones?.length === 0 ? (
                                        <div className="py-16 text-center space-y-4">
                                            <Trophy size={32} className="mx-auto text-slate-300" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No está participando en misiones</p>
                                        </div>
                                    ) : (
                                        loyalty.misiones.map((mp: any) => {
                                            const meta = mp.progresoRequerido || mp.Quest?.cantidadMeta || 1;
                                            const actual = mp.progresoActual || 0;
                                            const pct = Math.min(100, Math.floor((actual / meta) * 100));
                                            const completada = mp.estado === 'COMPLETADA' || mp.estado === 'RECLAMADA' || actual >= meta;

                                            return (
                                                <div 
                                                    key={mp.id}
                                                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2rem] p-5 shadow-sm space-y-4"
                                                >
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={clsx("size-10 rounded-2xl flex items-center justify-center shrink-0 border", 
                                                                completada ? "bg-amber-50 text-amber-500 border-amber-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                                            )}>
                                                                <Trophy size={18} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs leading-none">{mp.Quest?.nombre || 'Misión'}</h4>
                                                                <p className="text-[9px] font-bold text-slate-400 mt-1">{mp.Quest?.descripcion}</p>
                                                            </div>
                                                        </div>
                                                        {completada && (
                                                            <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                                                <CheckCircle2 size={10} /> Completada
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Barra de Progreso */}
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                                            <span>Progreso</span>
                                                            <span className="text-slate-700 dark:text-slate-300">{actual} / {meta}</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-pink-500 rounded-full transition-all duration-500" 
                                                                style={{ width: `${pct}%` }} 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {/* TAB: REGALOS */}
                            {activeTab === 'regalos' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    {loyalty.regalos?.length === 0 ? (
                                        <div className="py-16 text-center space-y-4">
                                            <Gift size={32} className="mx-auto text-slate-300" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No ha reclamado regalos todavía</p>
                                        </div>
                                    ) : (
                                        loyalty.regalos.map((red: any) => {
                                            const entregado = red.entregado || red.estado === 'ENTREGADO';
                                            return (
                                                <div 
                                                    key={red.id}
                                                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2rem] p-5 shadow-sm flex items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-11 bg-amber-50 text-amber-500 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100/50">
                                                            <Gift size={18} />
                                                        </div>
                                                                                        <div>
                                                            <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs leading-none">{red.Reward?.nombre || 'Premio'}</h4>
                                                            <p className="text-[9px] font-bold text-slate-400 mt-1">Canjeado el {format(new Date(red.createdAt), "dd MMM yyyy", { locale: es })}</p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span className={clsx("px-2 py-0.5 rounded text-[8px] font-black border", 
                                                                    entregado ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                                                )}>
                                                                    {entregado ? 'Entregado' : 'Pendiente de Entrega'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Costo</span>
                                                        <span className="text-sm font-black text-slate-700 dark:text-slate-300">{red.Reward?.costoPuntos || 0} Pts</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-50 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-slate-900/60 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-95 transition-all active:scale-95 shadow-lg active:duration-75"
                    >
                        Cerrar Ficha
                    </button>
                </div>
            </div>
        </div>
    );
}
