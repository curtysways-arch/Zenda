'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, Phone, MessageCircle, Calendar, DollarSign, Gem, 
    Wallet, Award, Tag, Trophy, Gift, Scissors, User, Sparkles, 
    Loader2, CheckCircle2, Clock, Users, ExternalLink
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

export default function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [cliente, setCliente] = useState<any>(null);
    const [citas, setCitas] = useState<Cita[]>([]);
    const [loyalty, setLoyalty] = useState<any>({
        points: 0,
        cashback: 0,
        level: 'Bronce',
        cupones: [],
        misiones: [],
        regalos: []
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fidelidad' | 'citas' | 'cupones' | 'misiones' | 'regalos'>('citas');
    const [error, setError] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');

    useEffect(() => {
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (color) setPrimaryColor(color);

        const loadHistorial = async () => {
            setLoading(true);
            setError('');
            try {
                // 1. Obtener detalles del cliente y fidelidad
                const detailRes = await fetch(`/api/clientes/${id}/detalles`);
                if (!detailRes.ok) {
                    if (detailRes.status === 404) {
                        setError('Cliente no encontrado');
                        return;
                    }
                    throw new Error('Error al cargar cliente');
                }
                const detailData = await detailRes.json();
                setCliente(detailData.cliente);
                if (detailData.loyalty) {
                    setLoyalty(detailData.loyalty);
                }

                // 2. Obtener historial de citas
                const res = await fetch('/api/appointments/list');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        const clientCitas = data.filter((c: any) => c.clienteId === id);
                        setCitas(clientCitas);
                    }
                }
            } catch (err) {
                console.error(err);
                setError('No se pudo cargar la información del cliente.');
            } finally {
                setLoading(false);
            }
        };

        loadHistorial();
    }, [id]);

    const getStatusBadge = (estado: string) => {
        const est = estado.toLowerCase();
        switch (est) {
            case 'confirmed':
            case 'confirmada':
                return { bg: 'bg-emerald-50 text-emerald-600 border border-emerald-200', label: 'Confirmada' };
            case 'pending':
            case 'pendiente':
                return { bg: 'bg-amber-50 text-amber-600 border border-amber-200', label: 'Pendiente' };
            case 'completed':
            case 'finalizada':
                return { bg: 'bg-slate-100 text-slate-600 border border-slate-200', label: 'Finalizada' };
            case 'in_progress':
            case 'llego':
                return { bg: 'bg-sky-50 text-sky-600 border border-sky-200', label: 'Llegó' };
            case 'client_checked_in':
                return { bg: 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse', label: 'Llegó (Por Confirmar)' };
            case 'cancelled':
            case 'cancelada':
                return { bg: 'bg-rose-50 text-rose-600 border border-rose-200', label: 'Cancelada' };
            default:
                return { bg: 'bg-slate-50 text-slate-600 border border-slate-200', label: estado };
        }
    };

    const getLevelStyle = (level: string) => {
        const lvl = level?.toLowerCase() || '';
        if (lvl.includes('diamante')) {
            return { bg: 'from-cyan-500/20 via-blue-500/20 to-indigo-500/20 border-cyan-300/30', text: 'text-cyan-600', label: 'Diamante VIP', iconColor: '#06b6d4' };
        }
        if (lvl.includes('oro') || lvl.includes('gold')) {
            return { bg: 'from-amber-400/20 via-yellow-500/15 to-amber-600/20 border-amber-300/30', text: 'text-amber-600', label: 'Socio Oro', iconColor: '#f59e0b' };
        }
        if (lvl.includes('plata') || lvl.includes('silver')) {
            return { bg: 'from-slate-300/20 via-slate-400/15 to-slate-500/20 border-slate-300/30', text: 'text-slate-500', label: 'Socio Plata', iconColor: '#94a3b8' };
        }
        return { bg: 'from-emerald-500/10 via-teal-500/10 to-emerald-600/10 border-emerald-500/20', text: 'text-emerald-600', label: 'Socio Bronce', iconColor: '#10b981' };
    };

    if (loading) {
        return (
            <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-indigo-600" size={36} />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando Ficha del Cliente...</p>
            </div>
        );
    }

    if (error || !cliente) {
        return (
            <div className="max-w-xl mx-auto py-16 px-6 text-center space-y-6">
                <div className="p-8 bg-rose-50 border border-rose-100 rounded-3xl text-rose-600 font-bold text-sm">
                    {error || 'Cliente no encontrado'}
                </div>
                <Link
                    href="/admin/clientes"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                    <ArrowLeft size={16} /> Volver a Lista de Clientes
                </Link>
            </div>
        );
    }

    const totalInversion = citas
        .filter(c => c.estado === 'completed' || c.estado === 'finalizada' || c.estado === 'COMPLETED' || c.estado === 'FINALIZADA')
        .reduce((acc, c: any) => {
            if (c.pagoReserva && c.pagoReserva.length > 0) {
                const sumaPagos = c.pagoReserva.reduce((sum: number, p: any) => sum + Number(p.monto), 0);
                return acc + sumaPagos;
            }
            return acc + Number(c.total || 0);
        }, 0);

    const levelStyle = getLevelStyle(loyalty.level);

    return (
        <div className="space-y-8 pb-20 max-w-6xl mx-auto animate-in fade-in duration-300">
            {/* Botón de Regreso */}
            <div className="flex items-center justify-between">
                <Link
                    href="/admin/clientes"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                >
                    <ArrowLeft size={16} /> Volver a Clientes
                </Link>
                <Link 
                    href={`/admin/usuarios/nuevo?phone=${cliente.telefono}&name=${encodeURIComponent(cliente.nombre)}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                >
                    <Users size={14} /> Promover a Personal / Administrador
                </Link>
            </div>

            {/* Banner de Cabecera del Cliente */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div 
                            className="size-20 rounded-3xl bg-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-indigo-600/30 uppercase shrink-0"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {cliente.nombre.charAt(0)}
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
                                {cliente.nombre}
                            </h1>
                            <p className="text-xs text-slate-500 font-bold flex items-center gap-2">
                                <Phone size={14} className="text-indigo-600" />
                                {cliente.telefono}
                            </p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest pt-1">
                                Miembro desde: {format(new Date(cliente.createdAt), "dd 'de' MMMM, yyyy", { locale: es })}
                            </p>
                        </div>
                    </div>

                    {/* Acciones Rápidas */}
                    <div className="flex items-center gap-3">
                        <a
                            href={`https://wa.me/${cliente.telefono.replace(/\+/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-5 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                            <MessageCircle size={16} /> WhatsApp
                        </a>
                        <a
                            href={`tel:${cliente.telefono}`}
                            className="px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 transition-all"
                        >
                            <Phone size={16} /> Llamar
                        </a>
                    </div>
                </div>

                {/* Grid KPI de Estadísticas del Cliente */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Citas Totales</span>
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-indigo-600" />
                            <span className="text-2xl font-black text-slate-900">{citas.length}</span>
                        </div>
                    </div>
                    <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
                        <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest block mb-1">Inversión Total</span>
                        <div className="flex items-center gap-2">
                            <DollarSign size={16} className="text-purple-600" />
                            <span className="text-2xl font-black text-purple-900">${totalInversion.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="p-4 bg-cyan-50/60 rounded-2xl border border-cyan-100">
                        <span className="text-[9px] font-black text-cyan-600 uppercase tracking-widest block mb-1">Diamantes / Puntos</span>
                        <div className="flex items-center gap-2">
                            <Gem size={16} className="text-cyan-600" />
                            <span className="text-2xl font-black text-cyan-900">{loyalty.points || 0}</span>
                        </div>
                    </div>
                    <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Saldo Cashback</span>
                        <div className="flex items-center gap-2">
                            <Wallet size={16} className="text-emerald-600" />
                            <span className="text-2xl font-black text-emerald-900">${parseFloat(loyalty.cashback || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pestañas de Navegación del Panel Completo */}
            <div className="bg-white rounded-3xl border border-slate-100 p-2 shadow-sm flex flex-wrap gap-2">
                {[
                    { id: 'citas', label: 'Historial de Citas', icon: Calendar, count: citas.length },
                    { id: 'fidelidad', label: 'Nivel y Puntos', icon: Gem },
                    { id: 'cupones', label: 'Cupones Asignados', icon: Tag, count: loyalty.cupones?.length },
                    { id: 'misiones', label: 'Misiones Activas', icon: Trophy, count: loyalty.misiones?.length },
                    { id: 'regalos', label: 'Premios & Canjes', icon: Gift, count: loyalty.regalos?.length }
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={clsx(
                                "flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95",
                                isActive
                                    ? "bg-slate-900 text-white shadow-md"
                                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                            )}
                        >
                            <Icon size={16} />
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={clsx(
                                    "px-2 py-0.5 rounded-full text-[10px] font-black",
                                    isActive ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-700"
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Contenido de la Pestaña Activa */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm min-h-[350px]">
                {/* 1. CITAS */}
                {activeTab === 'citas' && (
                    <div className="space-y-4">
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                            <Calendar size={18} className="text-indigo-600" />
                            Historial Completo de Citas ({citas.length})
                        </h3>
                        {citas.length === 0 ? (
                            <div className="py-20 text-center space-y-3 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <Calendar size={40} className="mx-auto text-slate-300" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Este cliente no ha registrado citas aún</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {citas.map((cita) => {
                                    const badge = getStatusBadge(cita.estado);
                                    const fechaCita = new Date(cita.fecha);
                                    const fechaLegible = isNaN(fechaCita.getTime())
                                        ? cita.fecha
                                        : format(fechaCita, "EEEE d 'de' MMMM, yyyy", { locale: es });

                                    return (
                                        <div
                                            key={cita.id}
                                            className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4 hover:border-slate-200 transition-all"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-12 bg-white rounded-2xl flex items-center justify-center text-slate-600 shadow-sm border border-slate-100">
                                                        <Scissors size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-900 uppercase text-sm leading-tight">
                                                            {cita.service?.nombre || 'Servicio'}
                                                        </h4>
                                                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1">
                                                            <User size={12} className="text-indigo-600" />
                                                            {cita.staff?.name || 'Profesional'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={clsx("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", badge.bg)}>
                                                    {badge.label}
                                                </span>
                                            </div>

                                            <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-600">
                                                <span className="capitalize">{fechaLegible}</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} className="text-slate-400" />
                                                    {cita.horaInicio} - {cita.horaFin}
                                                </span>
                                            </div>

                                            {cita.total > 0 && (
                                                <div className="pt-2 flex justify-end">
                                                    <span className="text-sm font-black text-slate-900">
                                                        Total: ${cita.total.toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. FIDELIDAD */}
                {activeTab === 'fidelidad' && (
                    <div className="space-y-6">
                        <div className={clsx("p-8 rounded-[2.5rem] bg-gradient-to-br border flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm", levelStyle.bg)}>
                            <div className="flex items-center gap-5">
                                <div className="p-4 rounded-3xl bg-white shadow-md">
                                    <Award size={36} style={{ color: levelStyle.iconColor }} />
                                </div>
                                <div>
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1">Nivel de Fidelidad</span>
                                    <h3 className="text-3xl font-black uppercase italic tracking-tight text-slate-900">{levelStyle.label}</h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="px-6 py-3 bg-white rounded-2xl shadow-sm text-center border border-slate-100">
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Puntos Acumulados</span>
                                    <span className="text-xl font-black text-slate-900">{loyalty.points} Pts</span>
                                </div>
                                <div className="px-6 py-3 bg-white rounded-2xl shadow-sm text-center border border-slate-100">
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Saldo Cashback</span>
                                    <span className="text-xl font-black text-emerald-600">${parseFloat(loyalty.cashback || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-xs font-semibold text-slate-600 leading-relaxed">
                            <p>💡 El programa de fidelización le permite al cliente canjear sus puntos acumulados por descuentos en servicios, premios exclusivos y saldo de cashback en futuras reservas.</p>
                        </div>
                    </div>
                )}

                {/* 3. CUPONES */}
                {activeTab === 'cupones' && (
                    <div className="space-y-4">
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                            <Tag size={18} className="text-pink-600" />
                            Cupones de Descuento
                        </h3>
                        {loyalty.cupones?.length === 0 ? (
                            <div className="py-20 text-center space-y-3 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <Tag size={40} className="mx-auto text-slate-300" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No tiene cupones asignados</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {loyalty.cupones.map((cc: any) => (
                                    <div key={cc.id} className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 flex justify-between items-center">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-black text-slate-900 text-sm uppercase">{cc.nombre || 'Cupón Especial'}</h4>
                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-700">
                                                    {cc.estado}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium">{cc.descripcion || 'Sin descripción.'}</p>
                                            <p className="text-xs font-black text-slate-800">CÓDIGO: <span className="bg-white px-2 py-1 rounded-lg border border-slate-200">{cc.codigo}</span></p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-pink-600">
                                                {cc.tipo === 'PORCENTAJE' ? `${cc.descuento}%` : `$${cc.descuento}`}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase block">Descuento</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 4. MISIONES */}
                {activeTab === 'misiones' && (
                    <div className="space-y-4">
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                            <Trophy size={18} className="text-amber-500" />
                            Misiones y Desafíos de Lealtad
                        </h3>
                        {loyalty.misiones?.length === 0 ? (
                            <div className="py-20 text-center space-y-3 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <Trophy size={40} className="mx-auto text-slate-300" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No está participando en misiones actualmente</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {loyalty.misiones.map((mp: any) => {
                                    const meta = mp.progresoRequerido || mp.Quest?.cantidadMeta || 1;
                                    const actual = mp.progresoActual || 0;
                                    const pct = Math.min(100, Math.floor((actual / meta) * 100));
                                    const completada = mp.estado === 'COMPLETADA' || mp.estado === 'RECLAMADA' || actual >= meta;

                                    return (
                                        <div key={mp.id} className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 space-y-3">
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <h4 className="font-black text-slate-900 text-sm uppercase">{mp.Quest?.nombre || 'Misión'}</h4>
                                                    <p className="text-xs text-slate-500 font-medium">{mp.Quest?.descripcion}</p>
                                                </div>
                                                {completada && (
                                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                                                        <CheckCircle2 size={12} /> Completada
                                                    </span>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                                    <span>Progreso</span>
                                                    <span>{actual} / {meta}</span>
                                                </div>
                                                <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* 5. REGALOS */}
                {activeTab === 'regalos' && (
                    <div className="space-y-4">
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                            <Gift size={18} className="text-emerald-600" />
                            Premios & Canjes Realizados
                        </h3>
                        {loyalty.regalos?.length === 0 ? (
                            <div className="py-20 text-center space-y-3 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <Gift size={40} className="mx-auto text-slate-300" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No ha realizado canjes de premios aún</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {loyalty.regalos.map((red: any) => {
                                    const entregado = red.entregado || red.estado === 'ENTREGADO';
                                    return (
                                        <div key={red.id} className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 flex justify-between items-center">
                                            <div>
                                                <h4 className="font-black text-slate-900 text-sm uppercase">{red.Reward?.nombre || 'Premio'}</h4>
                                                <p className="text-xs text-slate-400 font-bold mt-1">Canjeado el {format(new Date(red.createdAt), "dd MMM yyyy", { locale: es })}</p>
                                                <span className={clsx("inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase mt-2", entregado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                                                    {entregado ? 'Entregado' : 'Pendiente de Entrega'}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-black text-slate-400 uppercase block">Costo</span>
                                                <span className="text-lg font-black text-slate-900">{red.Reward?.costoPuntos || 0} Pts</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
