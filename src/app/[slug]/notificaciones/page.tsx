'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    ChevronLeft, Calendar, Gift, Trophy, Tag, MessageSquare, AlertTriangle, 
    Trash2, Search, Sparkles, Loader2, X, Info, CheckCircle2, SlidersHorizontal,
    Bell, Megaphone, Inbox
} from 'lucide-react';

export default function CentroActividadPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const [negocio, setNegocio] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    
    // Filtros y búsquedas
    const [selectedCategory, setSelectedCategory] = useState('TODAS');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Paginación y scroll
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    

    // Diseño HSL
    const [primaryColor, setPrimaryColor] = useState('#db2777');

    // 1. Obtener detalles del negocio
    useEffect(() => {
        const fetchNegocio = async () => {
            try {
                const res = await fetch(`/api/public/negocio/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setNegocio(data);
                    setPrimaryColor(data.colorPrimario || '#db2777');
                }
            } catch (err) {
                console.error("Error fetching negocio:", err);
            }
        };
        fetchNegocio();
    }, [slug]);

    // 2. Obtener notificaciones
    const fetchNotifications = async (targetPage: number, append = false) => {
        if (targetPage === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            let url = `/api/public/${slug}/notifications?page=${targetPage}&limit=10`;
            if (selectedCategory !== 'TODAS') {
                url += `&categoria=${selectedCategory}`;
            }
            if (searchQuery) {
                url += `&search=${encodeURIComponent(searchQuery)}`;
            }

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (append) {
                    setNotifications(prev => [...prev, ...(data.items || [])]);
                } else {
                    setNotifications(data.items || []);
                }
                setTotalPages(data.pagination?.totalPages || 1);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (err) {
            console.error("Error fetching notifications:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        setPage(1);
        fetchNotifications(1, false);
    }, [selectedCategory, searchQuery]);

    // Escuchar notificaciones en tiempo real vía eventos de JS
    useEffect(() => {
        const handleNewNotification = () => {
            setPage(1);
            fetchNotifications(1, false);
        };

        window.addEventListener('new_notification', handleNewNotification);
        return () => {
            window.removeEventListener('new_notification', handleNewNotification);
        };
    }, [selectedCategory, searchQuery]);

    // 3. Acciones de Gestión
    const handleMarkAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await fetch(`/api/public/${slug}/notifications`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
        } catch (err) {
            console.error("Error marking as read:", err);
        }
    };

    const handleMarkAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
        setUnreadCount(0);

        try {
            await fetch(`/api/public/${slug}/notifications`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAll: true })
            });
        } catch (err) {
            console.error("Error marking all as read:", err);
        }
    };

    const handleDelete = async (id: string) => {
        const target = notifications.find(n => n.id === id);
        if (target && !target.leida) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setNotifications(prev => prev.filter(n => n.id !== id));

        try {
            await fetch(`/api/public/${slug}/notifications?id=${id}`, {
                method: 'DELETE'
            });
        } catch (err) {
            console.error("Error deleting notification:", err);
        }
    };

    // Ejecutar redirección basada en la acción
    const handleActionClick = async (notification: any) => {
        try {
            await fetch(`/api/public/${slug}/notifications`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: notification.id, trackClick: true })
            });
        } catch {}

        if (!notification.leida) {
            handleMarkAsRead(notification.id);
        }

        let payload: any = {};
        try {
            if (notification.actionPayload) {
                payload = JSON.parse(notification.actionPayload);
            }
        } catch {}

        if (notification.actionType === 'VER_RESERVA' || payload.screen === 'appointment') {
            router.push(`/${slug}/mis-reservas`);
        } else if (notification.actionType === 'VER_CAMPANA' || payload.screen === 'campaign') {
            router.push(`/${slug}/referidos`);
        } else if (notification.actionType === 'VER_PREMIO' || payload.screen === 'reward') {
            router.push(`/${slug}/referidos`);
        } else if (notification.actionType === 'VER_PROMO' || payload.screen === 'promo') {
            if (payload.promotionId) {
                router.push(`/${slug}/promo/${payload.promotionId}`);
            } else {
                router.push(`/${slug}/servicios`);
            }
        } else if (notification.actionType === 'VER_PERFIL' || payload.screen === 'profile') {
            router.push(`/${slug}/perfil`);
        } else if (notification.actionType === 'ABRIR_URL' || payload.url) {
            const url = payload.url || '';
            if (url) {
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    window.open(url, '_blank');
                } else {
                    const cleanPath = url.startsWith('/') ? url : `/${url}`;
                    if (cleanPath.startsWith(`/${slug}/`) || cleanPath === `/${slug}`) {
                        router.push(cleanPath);
                    } else {
                        router.push(`/${slug}${cleanPath}`);
                    }
                }
            } else {
                router.push(`/${slug}`);
            }
        } else {
            router.push(`/${slug}`);
        }
    };

    // Agrupar notificaciones por fechas
    const groupNotificationsByDate = (items: any[]) => {
        const groups: Record<string, any[]> = {
            'Hoy': [],
            'Ayer': [],
            'Esta Semana': [],
            'Más antiguas': []
        };

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        ayer.setHours(0, 0, 0, 0);

        const unaSemanaAgo = new Date();
        unaSemanaAgo.setDate(unaSemanaAgo.getDate() - 7);
        unaSemanaAgo.setHours(0, 0, 0, 0);

        items.forEach(item => {
            const date = new Date(item.createdAt);
            date.setHours(0, 0, 0, 0);

            if (date.getTime() === hoy.getTime()) {
                groups['Hoy'].push(item);
            } else if (date.getTime() === ayer.getTime()) {
                groups['Ayer'].push(item);
            } else if (date.getTime() >= unaSemanaAgo.getTime()) {
                groups['Esta Semana'].push(item);
            } else {
                groups['Más antiguas'].push(item);
            }
        });

        return Object.entries(groups).filter(([_, val]) => val.length > 0);
    };

    // Formatear fecha y hora para el cliente
    const getFormattedTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        
        const isToday = date.toDateString() === now.toDateString();
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        if (isToday) {
            return `Hoy, ${timeStr}`;
        } else if (isYesterday) {
            return `Ayer, ${timeStr}`;
        } else {
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
            return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${timeStr}`;
        }
    };

    // Obtener iconos e información de estilos por Categoría (Copia exacta del diseño de colores pastel)
    const getCategoryStyles = (category: string) => {
        switch (category) {
            case 'RESERVAS': 
                return {
                    icon: <Calendar size={18} className="text-amber-500" />,
                    bg: 'bg-amber-50',
                    textColor: 'text-amber-600',
                    label: 'RESERVA'
                };
            case 'PROMOCIONES': 
                return {
                    icon: <Tag size={18} className="text-purple-500" />,
                    bg: 'bg-purple-50',
                    textColor: 'text-purple-600',
                    label: 'PROMOCIÓN'
                };
            case 'CAMPANAS': 
                return {
                    icon: <Megaphone size={18} className="text-rose-500" />,
                    bg: 'bg-rose-50',
                    textColor: 'text-rose-600',
                    label: 'CAMPAÑA'
                };
            case 'PREMIOS': 
                return {
                    icon: <Gift size={18} className="text-emerald-500" />,
                    bg: 'bg-emerald-50',
                    textColor: 'text-emerald-600',
                    label: 'PREMIO'
                };
            case 'NOTICIAS': 
            case 'NOTICIA':
                return {
                    icon: <MessageSquare size={18} className="text-pink-500" />,
                    bg: 'bg-pink-50',
                    textColor: 'text-pink-600',
                    label: 'NOTICIA'
                };
            default: 
                return {
                    icon: <Info size={18} className="text-blue-500" />,
                    bg: 'bg-blue-50',
                    textColor: 'text-blue-600',
                    label: 'SISTEMA'
                };
        }
    };

    const categories = [
        { key: 'TODAS', label: 'Todas', icon: <Inbox size={11} /> },
        { key: 'RESERVAS', label: 'Reservas', icon: <Calendar size={11} /> },
        { key: 'PROMOCIONES', label: 'Promociones', icon: <Tag size={11} /> },
        { key: 'PREMIOS', label: 'Premios', icon: <Gift size={11} /> },
        { key: 'CAMPANAS', label: 'Campañas', icon: <Trophy size={11} /> }
    ];

    const getActionBtnText = (actionType: string) => {
        switch (actionType) {
            case 'VER_RESERVA': return 'Ver Reserva';
            case 'VER_CAMPANA': return 'Ver Detalles';
            case 'VER_PREMIO': return 'Ver Premios';
            case 'VER_PROMO': return 'Ver Promo';
            case 'VER_PERFIL': return 'Ver Perfil';
            case 'ABRIR_URL': return 'Ir ahora';
            default: return 'Ver más';
        }
    };

    const groupedList = groupNotificationsByDate(notifications);

    return (
        <div className="min-h-screen bg-slate-50/60 pb-28">
            {/* Cabecera Premium en Degradado Magenta/Rosa de Marca */}
            <header 
                className="sticky top-0 z-30 px-6 pt-5 pb-6 flex flex-col gap-4 text-white shadow-md rounded-b-[2rem]"
                style={{ 
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)` 
                }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <button 
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all active:scale-95 shadow-sm"
                        >
                            <ChevronLeft size={20} strokeWidth={2.5} />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-[13px] font-black uppercase tracking-[0.2em] leading-none text-white">Centro de Actividad</h1>
                            <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest mt-1 block">Fidelización & Comunicaciones</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleMarkAllAsRead}
                        className="text-[9px] font-black uppercase tracking-widest px-3.5 py-2 bg-white text-slate-800 rounded-xl transition-all active:scale-95 shadow-sm flex items-center gap-1.5"
                    >
                        <CheckCircle2 size={12} className="text-pink-500" style={{ color: primaryColor }} />
                        Marcar leídas
                    </button>
                </div>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-5">
                {/* Buscador de Actividad */}
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Buscar en actividad..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-100 rounded-[1.8rem] text-xs focus:outline-none focus:border-pink-300 shadow-[0_4px_25px_rgba(0,0,0,0.015)] placeholder-slate-400 font-semibold text-slate-700 transition-all"
                    />
                    <Search className="absolute left-4.5 top-4.5 text-slate-400" size={14} />
                    
                    {searchQuery ? (
                        <button 
                            onClick={() => setSearchQuery('')} 
                            className="absolute right-4.5 top-4.5 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    ) : (
                        <div className="absolute right-4 top-3.5 w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                            <SlidersHorizontal size={12} />
                        </div>
                    )}
                </div>

                {/* Filtros de Categorías con Indicador de Punto flotante */}
                <div className="flex gap-2.5 overflow-x-auto pb-2 custom-scrollbar -mx-4 px-4 hide-scrollbar">
                    {categories.map((cat) => {
                        const isSelected = selectedCategory === cat.key;
                        return (
                            <div key={cat.key} className="flex flex-col items-center shrink-0">
                                <button
                                    onClick={() => setSelectedCategory(cat.key)}
                                    className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-full border transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                                    style={isSelected ? {
                                        backgroundColor: primaryColor,
                                        color: '#ffffff',
                                        borderColor: primaryColor
                                    } : {
                                        backgroundColor: '#ffffff',
                                        color: '#475569',
                                        borderColor: '#f1f5f9'
                                    }}
                                >
                                    {cat.icon}
                                    {cat.label}
                                </button>
                                {/* Punto indicador flotante */}
                                {isSelected && (
                                    <div 
                                        className="size-1.5 rounded-full mt-1.5 animate-pulse" 
                                        style={{ backgroundColor: primaryColor }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Listado de Notificaciones */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="animate-spin text-slate-400" size={24} style={{ color: primaryColor }} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cargando actividad...</span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100/60 text-center shadow-sm flex flex-col items-center justify-center py-16">
                        <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
                            <Bell size={24} />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Todo al día</h4>
                        <p className="text-[10px] text-slate-450 font-semibold mt-1.5 max-w-[200px] mx-auto leading-normal">
                            No se han registrado nuevas alertas o novedades en esta categoría.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groupedList.map(([title, groupItems]) => (
                            <div key={title} className="space-y-3.5">
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pl-2">
                                    {title}
                                </h3>

                                <div className="space-y-4">
                                    {groupItems.map((n) => {
                                        const themeConfig = getCategoryStyles(n.categoria);
                                        return (
                                            <div 
                                                key={n.id} 
                                                className={`bg-white rounded-[2rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all flex flex-col gap-4 relative overflow-hidden border ${
                                                    n.leida ? 'border-slate-100/60 opacity-80' : 'border-slate-100 ring-2 ring-slate-100/5'
                                                }`}
                                            >
                                                {/* Cuerpo de la alerta */}
                                                <div className="flex gap-4">
                                                    {/* Icono Redondo de Categoría Pastel */}
                                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm ${themeConfig.bg}`}>
                                                        {themeConfig.icon}
                                                    </div>

                                                    {/* Textos y contenido */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`text-[8px] font-black uppercase tracking-wider ${themeConfig.textColor}`}>
                                                                    {themeConfig.label}
                                                                </span>
                                                                <span className="text-[8px] text-slate-400 font-bold">
                                                                    • {getFormattedTime(n.createdAt)}
                                                                </span>
                                                            </div>
                                                            
                                                            {/* Badges de Estado */}
                                                            <div className="flex items-center gap-1.5">
                                                                {!n.leida && (
                                                                    <span 
                                                                        className="px-2 py-0.5 rounded-full text-[7px] font-black tracking-wider uppercase"
                                                                        style={{ 
                                                                            backgroundColor: `${primaryColor}15`, 
                                                                            color: primaryColor 
                                                                        }}
                                                                    >
                                                                        NUEVO
                                                                    </span>
                                                                )}
                                                                
                                                                {/* Indicador de lectura (Dot) */}
                                                                <div 
                                                                    className={`size-2.5 rounded-full transition-colors ${
                                                                        n.leida 
                                                                            ? 'border-2 border-slate-200 bg-transparent' 
                                                                            : 'bg-[var(--primary)]'
                                                                    }`}
                                                                    style={!n.leida ? { backgroundColor: primaryColor } : undefined}
                                                                />
                                                            </div>
                                                        </div>
                                                        
                                                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-snug mt-1.5">
                                                            {n.titulo}
                                                        </h4>
                                                        
                                                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-1">
                                                            {n.descripcion}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Imagen Adjunta */}
                                                {n.imagenUrl && (
                                                    <div className="w-full h-32 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100/60">
                                                        <img src={n.imagenUrl} className="w-full h-full object-cover" alt="Detalle" />
                                                    </div>
                                                )}

                                                {/* Fila de Acción */}
                                                <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                                                    {/* Botón Archivar/Borrar */}
                                                    <button 
                                                        onClick={() => handleDelete(n.id)}
                                                        className="p-2 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-50 transition-all active:scale-95"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>

                                                    <div className="flex items-center gap-2">
                                                        {!n.leida && (
                                                            <button 
                                                                onClick={() => handleMarkAsRead(n.id)}
                                                                className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors"
                                                            >
                                                                Entendido
                                                            </button>
                                                        )}

                                                        {n.actionType && (
                                                            <button 
                                                                onClick={() => handleActionClick(n)}
                                                                className="text-[8px] font-black uppercase tracking-widest px-4.5 py-1.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1"
                                                                style={{ 
                                                                    borderColor: `${primaryColor}40`, 
                                                                    color: primaryColor 
                                                                }}
                                                            >
                                                                {getActionBtnText(n.actionType)} →
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Paginación */}
                        {page < totalPages && (
                            <button
                                onClick={() => {
                                    setPage(prev => prev + 1);
                                    fetchNotifications(page + 1, true);
                                }}
                                disabled={loadingMore}
                                className="w-full py-3.5 bg-white border border-slate-250/50 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 className="animate-spin" size={14} style={{ color: primaryColor }} />
                                        Cargando más...
                                    </>
                                ) : 'Cargar más actividades'}
                            </button>
                        )}
                    </div>
            </main>
        </div>
    );
}
