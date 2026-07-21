'use client';

import { useState, useEffect } from 'react';
import { 
    Bell, 
    Check, 
    Loader2, 
    Megaphone, 
    Sparkles, 
    AlertTriangle, 
    CheckCircle2, 
    Info, 
    ShieldAlert, 
    Mail, 
    Zap, 
    Award, 
    Terminal, 
    Settings,
    ChevronDown,
    ChevronUp,
    CheckSquare,
    Users,
    Calendar,
    Clock,
    DollarSign,
    ExternalLink,
    MessageSquare,
    FileText,
    ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';
import Link from 'next/link';

// Mapeo dinámico para renderizar iconos guardados como string
const ICON_MAP: Record<string, any> = {
    Megaphone,
    Bell,
    Sparkles,
    AlertTriangle,
    CheckCircle2,
    Info,
    ShieldAlert,
    Mail,
    Zap,
    Award,
    Terminal,
    Settings
};

function getIconComponent(iconName: string | null) {
    if (!iconName) return Megaphone;
    const Icon = ICON_MAP[iconName];
    return Icon || Megaphone;
}

export default function NotificacionesPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

    // Estados para carga dinámica de detalles
    const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
    const [detailsData, setDetailsData] = useState<Record<string, any>>({});

    const fetchNotificaciones = async () => {
        try {
            const url = filter === 'all' ? '/api/admin/notificaciones' : `/api/admin/notificaciones?filter=${filter}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setItems(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Error fetching notifications:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotificaciones();
    }, [filter]);

    const handleMarkAsRead = async (recipientId: string) => {
        try {
            const res = await fetch('/api/admin/notificaciones', {
                method: 'PATCH',
                body: JSON.stringify({ recipientId })
            });
            if (res.ok) {
                // Actualizar localmente el estado de leído
                setItems(prev => prev.map(item => 
                    item.id === recipientId 
                        ? { ...item, estado: 'LEIDO', fechaLectura: new Date().toISOString() } 
                        : item
                ));
                // Despachar evento global para actualizar contadores en el Sidebar/TopBar
                window.dispatchEvent(new CustomEvent('notification-marked-read'));
            }
        } catch (e) {
            console.error('Error marking as read:', e);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const res = await fetch('/api/admin/notificaciones', {
                method: 'PATCH',
                body: JSON.stringify({ markAllAsRead: true })
            });
            if (res.ok) {
                setItems(prev => prev.map(item => ({ 
                    ...item, 
                    estado: 'LEIDO', 
                    fechaLectura: new Date().toISOString() 
                })));
                window.dispatchEvent(new CustomEvent('notification-marked-read'));
            }
        } catch (e) {
            console.error('Error marking all as read:', e);
        }
    };

    const toggleExpand = async (item: any) => {
        if (expandedId === item.id) {
            setExpandedId(null);
        } else {
            setExpandedId(item.id);
            if (item.estado === 'ENVIADO') {
                handleMarkAsRead(item.id);
            }

            // Detectar si tiene payload con ID de cita
            let payload: any = null;
            if (item.actionPayload) {
                try {
                    payload = typeof item.actionPayload === 'string' 
                        ? JSON.parse(item.actionPayload) 
                        : item.actionPayload;
                } catch (e) {
                    console.error("Error parsing actionPayload:", e);
                }
            }

            if (payload?.appointmentId && !detailsData[payload.appointmentId]) {
                const appointmentId = payload.appointmentId;
                setLoadingDetails(prev => ({ ...prev, [item.id]: true }));
                try {
                    const res = await fetch(`/api/appointments/${appointmentId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setDetailsData(prev => ({ ...prev, [appointmentId]: data }));
                    }
                } catch (e) {
                    console.error("Error loading appointment details:", e);
                } finally {
                    setLoadingDetails(prev => ({ ...prev, [item.id]: false }));
                }
            }
        }
    };

    // Estadísticas rápidas
    const unreadCount = items.filter(i => i.estado === 'ENVIADO').length;

    return (
        <div className="space-y-10 md:space-y-16 animate-in fade-in duration-700">
            <div className="relative">
                <div className="relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-10">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 border rounded-full bg-cyan-50/50 border-cyan-100/50">
                            <Bell size={12} className="text-cyan-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-500">Inbox del Sistema</span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter uppercase italic leading-[0.8]">
                            Mensajes <br /> <span className="text-cyan-500">Globales</span>
                        </h1>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        {/* Selector de filtros */}
                        <div className="flex bg-white p-1.5 rounded-3xl border border-slate-200 shadow-sm gap-1">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'unread', label: `No leídos (${unreadCount})` },
                                { id: 'read', label: 'Leídos' }
                            ].map((opt) => (
                                <button 
                                    key={opt.id} 
                                    onClick={() => setFilter(opt.id as any)}
                                    className={clsx(
                                        "px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all",
                                        filter === opt.id 
                                            ? "bg-slate-900 text-white shadow-xl" 
                                            : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllAsRead}
                                className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-4 px-6 rounded-3xl shadow-sm text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                <CheckSquare size={14} className="text-emerald-500" />
                                Marcar todo como leído
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40">
                    <Loader2 className="w-16 h-16 animate-spin text-cyan-500" />
                    <p className="mt-8 text-slate-400 font-black uppercase tracking-[0.5em] text-[10px] italic">Buscando comunicados...</p>
                </div>
            ) : items.length > 0 ? (
                <div className="space-y-6 max-w-4xl">
                    {items.map((item) => {
                        const comm = item.communication;
                        const isExpanded = expandedId === item.id;
                        const isUnread = item.estado === 'ENVIADO';
                        const IconComponent = getIconComponent(comm.icono);
                        const accentColor = comm.color || '#0ea5e9';

                        // Prioridades
                        const isHighPriority = comm.prioridad === 'ERROR' || comm.prioridad === 'WARNING';

                        // Procesar actionPayload
                        let actionPayload: any = null;
                        if (item.actionPayload) {
                            try {
                                actionPayload = typeof item.actionPayload === 'string' 
                                    ? JSON.parse(item.actionPayload) 
                                    : item.actionPayload;
                            } catch (e) {
                                // silent fallback
                            }
                        }

                        // URL del link clicable resuelto de manera inteligente
                        let directLink = null;
                        let linkLabel = "Ir al Enlace";

                        if (actionPayload?.appointmentId) {
                            directLink = `/admin/citas/${actionPayload.appointmentId}`;
                            linkLabel = "Ver Detalle de Cita";
                        } else if (actionPayload?.rewardId || item.tipo === 'PREMIO') {
                            directLink = `/admin/misiones?tab=rewards`;
                            linkLabel = "Ver Premios y Canjes";
                        } else if (actionPayload?.campaignId || item.tipo === 'CAMPANA') {
                            directLink = `/admin/misiones?tab=campaigns`;
                            linkLabel = "Ver Retos y Misiones";
                        } else if (actionPayload?.url) {
                            directLink = actionPayload.url;
                            linkLabel = "Ir al Enlace";
                        } else if (comm.videoUrl) {
                            directLink = comm.videoUrl;
                            linkLabel = "Ver Video";
                        }

                        return (
                            <div 
                                key={item.id}
                                className={clsx(
                                    "bg-white rounded-[2.5rem] border transition-all overflow-hidden duration-300 relative shadow-sm hover:shadow-md",
                                    isUnread ? "border-cyan-100 ring-2 ring-cyan-50/30" : "border-slate-200/60"
                                )}
                            >
                                {/* Barra de prioridad en el borde izquierdo */}
                                <div 
                                    className="absolute left-0 top-0 bottom-0 w-2.5" 
                                    style={{ backgroundColor: accentColor }}
                                />

                                {/* Encabezado del Comunicado */}
                                <div 
                                    onClick={() => toggleExpand(item)}
                                    className="p-8 pl-10 cursor-pointer flex items-center justify-between gap-6"
                                >
                                    <div className="flex items-center gap-6 min-w-0 flex-1">
                                        {/* Icono Acento */}
                                        <div 
                                            className="size-14 rounded-2xl flex items-center justify-center shrink-0 border"
                                            style={{ 
                                                backgroundColor: `color-mix(in srgb, ${accentColor}, transparent 92%)`, 
                                                borderColor: `color-mix(in srgb, ${accentColor}, transparent 80%)`,
                                                color: accentColor
                                            }}
                                        >
                                            <IconComponent size={24} className={clsx(isUnread && "animate-bounce")} />
                                        </div>

                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            <div className="flex items-center flex-wrap gap-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">
                                                    {format(new Date(item.createdAt), "d 'de' MMMM, yyyy - HH:mm", { locale: es })}
                                                </span>
                                                {comm.subtitulo && (
                                                    <span className="bg-slate-100 text-slate-600 text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-slate-200/60">
                                                        {comm.subtitulo}
                                                    </span>
                                                )}
                                                {isUnread && (
                                                    <span className="bg-cyan-500 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full animate-pulse shadow-sm shadow-cyan-500/20">
                                                        NUEVO
                                                    </span>
                                                )}
                                                {isHighPriority && (
                                                    <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                                                        IMPORTANTE
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className={clsx(
                                                "text-lg md:text-xl font-black italic uppercase tracking-tight line-clamp-2 leading-tight break-words",
                                                isUnread ? "text-slate-900" : "text-slate-700"
                                            )}>
                                                {comm.titulo}
                                            </h3>
                                            {comm.contenido && (
                                                <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed">
                                                    {comm.contenido.replace(/<[^>]*>?/gm, '')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="shrink-0 size-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors ml-2">
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>

                                {/* Cuerpo del Comunicado (Contenido Completo) */}
                                {isExpanded && (
                                    <div className="px-10 pb-10 border-t border-slate-100 bg-slate-50/50 pt-8 animate-in slide-in-from-top-4 duration-300 space-y-6">
                                        
                                        {/* Descripción/Texto del mensaje */}
                                        <div className="prose prose-slate max-w-none text-slate-700 text-sm font-medium leading-relaxed">
                                            <div 
                                                dangerouslySetInnerHTML={{ __html: comm.contenido }} 
                                                className="rich-text-content"
                                            />
                                        </div>

                                        {/* Detalle Dinámico de la Reserva / Cliente */}
                                        {actionPayload?.appointmentId && (
                                            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                                                        <FileText size={12} className="text-cyan-500" /> Detalles de la Reserva
                                                    </span>
                                                    {detailsData[actionPayload.appointmentId] && (
                                                        <span className={clsx(
                                                            "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full",
                                                            detailsData[actionPayload.appointmentId].estado === 'CONFIRMADA' 
                                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                                : 'bg-amber-50 text-amber-600 border border-amber-100'
                                                        )}>
                                                            {detailsData[actionPayload.appointmentId].estado}
                                                        </span>
                                                    )}
                                                </div>

                                                {loadingDetails[item.id] ? (
                                                    <div className="flex items-center gap-2 justify-center py-6">
                                                        <Loader2 className="animate-spin text-slate-400" size={16} />
                                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando detalles de reserva...</span>
                                                    </div>
                                                ) : detailsData[actionPayload.appointmentId] ? (() => {
                                                    const app = detailsData[actionPayload.appointmentId];
                                                    const client = app.cliente;
                                                    const service = app.service;
                                                    const staff = app.staff;
                                                    
                                                    return (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            {/* Datos del Cliente */}
                                                            <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                                    <Users size={11} /> Información del Cliente
                                                                </p>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="size-11 rounded-xl bg-cyan-500 text-white font-black text-sm flex items-center justify-center shrink-0">
                                                                        {client?.nombre?.charAt(0).toUpperCase() || 'C'}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-xs font-black text-slate-800 truncate uppercase">{client?.nombre || 'Cliente sin nombre'}</p>
                                                                        <p className="text-[10px] text-slate-400 font-medium truncate">{client?.email || 'Sin correo electrónico'}</p>
                                                                    </div>
                                                                </div>
                                                                
                                                                {client?.telefono && (
                                                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50">
                                                                        <a 
                                                                            href={`https://wa.me/${client.telefono.replace(/[^0-9]/g, '')}`}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                                                                        >
                                                                            <MessageSquare size={12} /> WhatsApp
                                                                        </a>
                                                                        <a 
                                                                            href={`tel:${client.telefono}`}
                                                                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                                                                        >
                                                                            Llamar
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Datos del Servicio y Cita */}
                                                            <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                                                <div className="space-y-2">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                                        <Calendar size={11} /> Detalles del Servicio
                                                                    </p>
                                                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight leading-snug">{service?.nombre || 'Servicio'}</p>
                                                                    
                                                                    <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold">
                                                                        <span className="flex items-center gap-1">
                                                                            <Clock size={11} className="text-slate-400" /> {service?.duracion || app.duracion || 60} min
                                                                        </span>
                                                                        <span className="flex items-center gap-1">
                                                                            <DollarSign size={11} className="text-slate-400" /> ${service?.precio || app.precio || '0.00'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="pt-2 border-t border-slate-200/50">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Fecha y Hora</p>
                                                                    <p className="text-[10px] text-slate-700 font-black uppercase tracking-tight mt-0.5">
                                                                        {format(new Date(app.fecha), "eeee d 'de' MMMM", { locale: es })} a las {app.horaInicio}
                                                                    </p>
                                                                    {staff && (
                                                                        <p className="text-[9px] text-slate-400 font-medium mt-1">
                                                                            Atendido por: <span className="font-bold text-slate-500 uppercase">{staff.name}</span>
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })() : (
                                                    <div className="text-center py-4 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                        No se pudo cargar la información de la reserva.
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Imagen adicional */}
                                        {comm.imagenUrl && (
                                            <div className="my-4 max-w-lg rounded-[2rem] overflow-hidden border border-slate-200 shadow-md">
                                                <img src={comm.imagenUrl} className="w-full object-cover" alt={comm.titulo} />
                                            </div>
                                        )}

                                        {/* Video embebido */}
                                        {comm.videoUrl && (
                                            <div className="my-4 max-w-lg rounded-[2rem] overflow-hidden border border-slate-200 shadow-md aspect-video">
                                                <iframe 
                                                    src={comm.videoUrl} 
                                                    className="w-full h-full" 
                                                    allowFullScreen
                                                    title={comm.titulo}
                                                />
                                            </div>
                                        )}

                                        {/* Botones de Acción (Enlaces clicables directos) */}
                                        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100">
                                            {/* Autor / Firma */}
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-black uppercase italic">
                                                    {comm.autor?.nombre?.charAt(0) || 'S'}
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                    {comm.autor?.nombre 
                                                        ? `Enviado por ${comm.autor.nombre} ${comm.autor.apellido || ''} • Soporte Citiox`
                                                        : `Notificación de Sistema • Alerta en Tiempo Real`
                                                    }
                                                </span>
                                            </div>

                                            {/* Enlace directo si está configurado */}
                                            {directLink && (
                                                <Link 
                                                    href={directLink}
                                                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl shadow-md transition-all active:scale-95 shrink-0"
                                                >
                                                    {linkLabel} <ExternalLink size={12} />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-40 bg-white border border-slate-200 border-dashed rounded-[4rem] flex flex-col items-center justify-center text-center px-10 shadow-sm max-w-4xl">
                    <Mail size={48} strokeWidth={1} className="text-slate-200 mb-8 animate-pulse" />
                    <h3 className="text-2xl font-black text-slate-300 uppercase italic tracking-widest">Bandeja Vacía</h3>
                    <p className="mt-4 text-slate-400 text-[10px] font-black uppercase tracking-widest italic max-w-xs leading-relaxed">
                        No hay comunicados del sistema en esta categoría en este momento.
                    </p>
                </div>
            )}
        </div>
    );
}
