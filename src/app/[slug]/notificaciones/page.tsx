'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Bell, ChevronLeft, Calendar, Gift, Trophy, Tag, MessageSquare, AlertTriangle, 
    Check, Trash2, Search, Sparkles, Loader2, Link2, X, Info, CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';

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
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');

    // 1. Obtener detalles del negocio
    useEffect(() => {
        const fetchNegocio = async () => {
            try {
                const res = await fetch(`/api/public/negocio/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setNegocio(data);
                    setPrimaryColor(data.colorPrimario || '#0ea5e9');
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
            // Recargar catálogo desde el inicio
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
        // Optimista
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
        // Optimista
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
        // Trackear clic en métricas
        try {
            await fetch(`/api/public/${slug}/notifications`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: notification.id, trackClick: true })
            });
        } catch {}

        // Marcar como leída de paso
        if (!notification.leida) {
            handleMarkAsRead(notification.id);
        }

        let payload: any = {};
        try {
            if (notification.actionPayload) {
                payload = JSON.parse(notification.actionPayload);
            }
        } catch {}

        // Enrutar dinámicamente
        if (notification.actionType === 'VER_RESERVA' || payload.screen === 'appointment') {
            router.push(`/${slug}/mis-reservas`);
        } else if (notification.actionType === 'VER_CAMPANA' || payload.screen === 'campaign') {
            router.push(`/${slug}/referidos`);
        } else if (notification.actionType === 'VER_PREMIO' || payload.screen === 'reward') {
            router.push(`/${slug}/referidos`); // Pestaña de canje de premios
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

        // Eliminar grupos vacíos
        return Object.entries(groups).filter(([_, val]) => val.length > 0);
    };

    // Obtener iconos
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'RESERVAS': return <Calendar size={15} />;
            case 'PROMOCIONES': return <Tag size={15} />;
            case 'CAMPANAS': return <Trophy size={15} />;
            case 'PREMIOS': return <Gift size={15} />;
            case 'NOTICIAS': return <MessageSquare size={15} />;
            default: return <Info size={15} />;
        }
    };

    // Obtener clases CSS para prioridades
    const getPriorityStyles = (priority: string) => {
        switch (priority) {
            case 'SUCCESS': return 'bg-emerald-50 text-emerald-600 border border-emerald-100/50';
            case 'WARNING': return 'bg-amber-50 text-amber-600 border border-amber-100/50';
            case 'ERROR': return 'bg-rose-50 text-rose-600 border border-rose-100/50';
            default: return 'bg-slate-50 text-slate-500 border border-slate-100';
        }
    };

    const categories = [
        { key: 'TODAS', label: 'Todas' },
        { key: 'RESERVAS', label: 'Reservas' },
        { key: 'PROMOCIONES', label: 'Promociones' },
        { key: 'CAMPANAS', label: 'Campañas' },
        { key: 'PREMIOS', label: 'Premios' },
        { key: 'NOTICIAS', label: 'Noticias' },
        { key: 'SISTEMA', label: 'Sistema' }
    ];

    const groupedList = groupNotificationsByDate(notifications);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Cabecera Premium */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100/80 px-6 py-4 flex items-center justify-between shadow-[0_2px_15px_rgba(0,0,0,0.01)]">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors border border-slate-200/40"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest text-slate-900 leading-none">Centro de Actividad</h1>
                        <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest mt-1 block">Fidelización & Comunicaciones</span>
                    </div>
                </div>

                {unreadCount > 0 && (
                    <button 
                        onClick={handleMarkAllAsRead}
                        className="text-[9px] font-black uppercase tracking-widest px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50 rounded-xl transition-all flex items-center gap-1.5"
                    >
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        Marcar leídas
                    </button>
                )}
            </header>

            <main className="max-w-md mx-auto p-4 space-y-4">
                {/* Buscador & Barra de Búsqueda */}
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Buscar en actividad..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200/80 rounded-[1.8rem] text-xs focus:outline-none focus:border-slate-300 shadow-[0_4px_20px_rgba(0,0,0,0.01)] placeholder-slate-400 font-semibold"
                    />
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={14} />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filtros de Categorías */}
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar -mx-4 px-4">
                    {categories.map((cat) => (
                        <button
                            key={cat.key}
                            onClick={() => setSelectedCategory(cat.key)}
                            className="px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-full border transition-all shrink-0 active:scale-95"
                            style={selectedCategory === cat.key ? {
                                backgroundColor: primaryColor,
                                color: '#ffffff',
                                borderColor: primaryColor
                            } : {
                                backgroundColor: '#ffffff',
                                color: '#64748b',
                                borderColor: '#e2e8f0'
                            }}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Listado de Notificaciones */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="animate-spin text-slate-400" size={24} style={{ color: primaryColor }} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando actividad...</span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 text-center shadow-sm flex flex-col items-center justify-center py-16">
                        <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
                            <Bell size={24} />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Todo al día</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1 max-w-[200px] mx-auto leading-normal">
                            No se han registrado nuevas alertas o novedades en esta categoría.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groupedList.map(([title, groupItems]) => (
                            <div key={title} className="space-y-2.5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2">
                                    {title}
                                </h3>

                                <div className="space-y-3">
                                    {groupItems.map((n) => (
                                        <div 
                                            key={n.id} 
                                            className={`bg-white border rounded-[2rem] p-4 shadow-[0_4px_25px_rgba(0,0,0,0.01)] transition-all flex flex-col gap-3 relative overflow-hidden ${
                                                n.leida ? 'border-slate-100/80 opacity-80' : 'border-slate-200/50 ring-2 ring-slate-100/5'
                                            }`}
                                        >
                                            {/* Badge no leído */}
                                            {!n.leida && (
                                                <div 
                                                    className="absolute top-4 right-4 size-2.5 rounded-full border border-white"
                                                    style={{ backgroundColor: primaryColor }}
                                                />
                                            )}

                                            {/* Cuerpo interactivo de la notificación */}
                                            <div 
                                                onClick={() => handleActionClick(n)}
                                                className="flex flex-col gap-3 cursor-pointer hover:bg-slate-50/30 rounded-2xl p-1.5 -m-1.5 transition-all"
                                            >
                                                <div className="flex gap-3">
                                                    {/* Icono de Categoría */}
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${getPriorityStyles(n.prioridad)}`}>
                                                        {getCategoryIcon(n.categoria)}
                                                    </div>

                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                                {n.categoria}
                                                            </span>
                                                            <span className="text-[8px] text-slate-400 font-bold">
                                                                • {new Date(n.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        
                                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight leading-snug mt-1">
                                                            {n.titulo}
                                                        </h4>
                                                        
                                                        <p className="text-[10px] text-slate-550 font-semibold leading-relaxed mt-1">
                                                            {n.descripcion}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Imagen Adjunta */}
                                                {n.imagenUrl && (
                                                    <div className="w-full h-32 rounded-2xl overflow-hidden mt-1 bg-slate-50 border border-slate-100">
                                                        <img src={n.imagenUrl} className="w-full h-full object-cover" alt="Detalle" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Botones de acción */}
                                            <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                                                <button 
                                                    onClick={() => handleDelete(n.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-50 active:scale-95 transition-all"
                                                    title="Archivar"
                                                >
                                                    <Trash2 size={14} />
                                                </button>

                                                <div className="flex items-center gap-2">
                                                    {!n.leida && (
                                                        <button 
                                                            onClick={() => handleMarkAsRead(n.id)}
                                                            className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors"
                                                        >
                                                            Leído
                                                        </button>
                                                    )}

                                                    {n.actionType && (
                                                        <button 
                                                            onClick={() => handleActionClick(n)}
                                                            className="text-[9px] font-black uppercase tracking-widest px-4.5 py-1.5 text-white rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            {n.actionType === 'VER_PREMIO' ? '🎁 Canjear' : 
                                                             n.actionType === 'VER_CAMPANA' ? '🏆 Ver Progreso' :
                                                             n.actionType === 'VER_RESERVA' ? '📅 Ver Reserva' : 'Ir ahora'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
                                className="w-full py-3.5 bg-white border border-slate-200/80 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
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
                )}
            </main>
        </div>
    );
}
