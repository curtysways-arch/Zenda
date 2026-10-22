'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ChevronLeft, Calendar, Gift, Tag, Trash2, Search, Loader2, X, Info, 
    CheckCircle2, SlidersHorizontal, Bell, Megaphone, Inbox, PackageCheck, 
    ShoppingBag, CreditCard, Sparkles, ArrowRight, ShieldCheck, ExternalLink,
    Filter, Check, ChevronRight, MessageCircle
} from 'lucide-react';

export default function CentroNotificacionesPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const [negocio, setNegocio] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Filtros y búsquedas
    const [selectedCategory, setSelectedCategory] = useState('TODAS');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Paginación
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Color de marca
    const [primaryColor, setPrimaryColor] = useState('#7c3aed');
    const [secondaryColor, setSecondaryColor] = useState('#4c1d95');

    // 1. Obtener detalles del negocio
    useEffect(() => {
        const fetchNegocio = async () => {
            try {
                const res = await fetch(`/api/public/negocio/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setNegocio(data);
                    if (data.colorPrimario) setPrimaryColor(data.colorPrimario);
                    if (data.colorSecundario) setSecondaryColor(data.colorSecundario);
                }
            } catch (err) {
                console.error("Error fetching negocio:", err);
            }
        };
        fetchNegocio();
    }, [slug]);

    // Detección del tipo de negocio
    const bizType = useMemo(() => {
        const t = ((negocio?.tipoNegocio || negocio?.type || negocio?.tipo || '') as string).toUpperCase();
        const s = (typeof slug === 'string' ? slug : '').toLowerCase();

        const isShoeCare = t === 'SHOE_CARE' || t === 'LAVANDERIA' || s.includes('lavado') || s.includes('sneaker');
        const isRestaurant = t === 'RESTAURANT' || t === 'RESTAURANTE' || t === 'FOOD' || s.includes('pincho');
        const isCanchas = t === 'CANCHAS' || t === 'SPORTS' || t === 'SPORT' || s.includes('cancha');
        const isGym = t === 'GYM' || t === 'GIMNASIO' || t === 'FITNESS' || s.includes('gym');
        
        return { isShoeCare, isRestaurant, isCanchas, isGym };
    }, [negocio, slug]);

    // Categorías contextuales adaptadas al tipo de negocio
    const categories = useMemo(() => {
        if (bizType.isShoeCare) {
            return [
                { key: 'TODAS', label: 'Todas', icon: <Inbox size={13} /> },
                { key: 'ORDENES', label: 'Órdenes', icon: <PackageCheck size={13} /> },
                { key: 'PROMOCIONES', label: 'Promociones', icon: <Tag size={13} /> },
                { key: 'PREMIOS', label: 'Premios', icon: <Gift size={13} /> },
                { key: 'COMUNICACIONES', label: 'Avisos', icon: <Megaphone size={13} /> }
            ];
        }
        if (bizType.isRestaurant) {
            return [
                { key: 'TODAS', label: 'Todas', icon: <Inbox size={13} /> },
                { key: 'PEDIDOS', label: 'Pedidos', icon: <ShoppingBag size={13} /> },
                { key: 'PROMOCIONES', label: 'Promociones', icon: <Tag size={13} /> },
                { key: 'PREMIOS', label: 'Premios', icon: <Gift size={13} /> },
                { key: 'COMUNICACIONES', label: 'Avisos', icon: <Megaphone size={13} /> }
            ];
        }
        if (bizType.isCanchas) {
            return [
                { key: 'TODAS', label: 'Todas', icon: <Inbox size={13} /> },
                { key: 'RESERVAS', label: 'Reservas', icon: <Calendar size={13} /> },
                { key: 'PROMOCIONES', label: 'Promociones', icon: <Tag size={13} /> },
                { key: 'PREMIOS', label: 'Premios', icon: <Gift size={13} /> },
                { key: 'COMUNICACIONES', label: 'Avisos', icon: <Megaphone size={13} /> }
            ];
        }
        if (bizType.isGym) {
            return [
                { key: 'TODAS', label: 'Todas', icon: <Inbox size={13} /> },
                { key: 'MEMBRESIAS', label: 'Membresías', icon: <CreditCard size={13} /> },
                { key: 'PROMOCIONES', label: 'Promociones', icon: <Tag size={13} /> },
                { key: 'PREMIOS', label: 'Premios', icon: <Gift size={13} /> },
                { key: 'COMUNICACIONES', label: 'Avisos', icon: <Megaphone size={13} /> }
            ];
        }
        // Por defecto: Servicios / Citas
        return [
            { key: 'TODAS', label: 'Todas', icon: <Inbox size={13} /> },
            { key: 'CITAS', label: 'Citas', icon: <Calendar size={13} /> },
            { key: 'PROMOCIONES', label: 'Promociones', icon: <Tag size={13} /> },
            { key: 'PREMIOS', label: 'Premios', icon: <Gift size={13} /> },
            { key: 'COMUNICACIONES', label: 'Avisos', icon: <Megaphone size={13} /> }
        ];
    }, [bizType]);

    // 2. Obtener notificaciones
    const fetchNotifications = async (targetPage: number, append = false) => {
        if (targetPage === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            let url = `/api/public/${slug}/notifications?page=${targetPage}&limit=15`;
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
                setIsAuthenticated(!!data.isAuthenticated);
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
    }, [selectedCategory, searchQuery, slug]);

    // Escuchar notificaciones en tiempo real
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

    // Redirección contextual según la acción
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
                payload = typeof notification.actionPayload === 'string' 
                    ? JSON.parse(notification.actionPayload) 
                    : notification.actionPayload;
            }
        } catch {}

        const actionType = notification.actionType || '';

        if (actionType === 'VER_ORDEN' || payload.screen === 'order') {
            router.push(`/${slug}/pedidos`);
        } else if (actionType === 'VER_RESERVA' || payload.screen === 'appointment') {
            router.push(`/${slug}/mis-reservas`);
        } else if (actionType === 'VER_CAMPANA' || payload.screen === 'campaign') {
            router.push(`/${slug}/referidos`);
        } else if (actionType === 'VER_PREMIO' || payload.screen === 'reward') {
            router.push(`/${slug}/misiones`);
        } else if (actionType === 'VER_PROMO' || payload.screen === 'promo') {
            if (payload.promotionId) {
                router.push(`/${slug}/promo/${payload.promotionId}`);
            } else if (bizType.isShoeCare) {
                router.push(`/${slug}#promociones`);
            } else {
                router.push(`/${slug}#ofertas`);
            }
        } else if (actionType === 'VER_PERFIL' || payload.screen === 'profile') {
            router.push(`/${slug}/perfil`);
        } else if (actionType === 'ABRIR_URL' || payload.url) {
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

    // Agrupar notificaciones por fecha
    const groupNotificationsByDate = (items: any[]) => {
        const groups: Record<string, any[]> = {
            'Hoy': [],
            'Ayer': [],
            'Esta Semana': [],
            'Anteriores': []
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
                groups['Anteriores'].push(item);
            }
        });

        return Object.entries(groups).filter(([_, val]) => val.length > 0);
    };

    // Formatear fecha y hora
    const getFormattedTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        if (isToday) return `Hoy, ${timeStr}`;
        if (isYesterday) return `Ayer, ${timeStr}`;
        const dayMonth = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        return `${dayMonth}, ${timeStr}`;
    };

    // Estilos e iconos por categoría
    const getCategoryStyles = (category: string) => {
        const upper = (category || '').toUpperCase();
        switch (upper) {
            case 'ORDENES':
            case 'ORDENES':
            case 'ORDEN':
            case 'PEDIDOS':
            case 'PEDIDO':
                return {
                    icon: <PackageCheck size={18} className="text-blue-600" />,
                    bg: 'bg-blue-50 border-blue-200/80',
                    textColor: 'text-blue-700',
                    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
                    label: bizType.isRestaurant ? 'PEDIDO' : 'ORDEN'
                };
            case 'RESERVAS':
            case 'RESERVA':
            case 'CITAS':
            case 'CITA':
                return {
                    icon: <Calendar size={18} className="text-amber-600" />,
                    bg: 'bg-amber-50 border-amber-200/80',
                    textColor: 'text-amber-700',
                    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
                    label: bizType.isCanchas ? 'RESERVA' : 'CITA'
                };
            case 'MEMBRESIAS':
            case 'MEMBRESIA':
                return {
                    icon: <CreditCard size={18} className="text-violet-600" />,
                    bg: 'bg-violet-50 border-violet-200/80',
                    textColor: 'text-violet-700',
                    badgeBg: 'bg-violet-100 text-violet-800 border-violet-200',
                    label: 'MEMBRESÍA'
                };
            case 'PROMOCIONES':
            case 'PROMO':
            case 'OFERTAS':
                return {
                    icon: <Tag size={18} className="text-rose-600" />,
                    bg: 'bg-rose-50 border-rose-200/80',
                    textColor: 'text-rose-700',
                    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
                    label: 'PROMOCIÓN'
                };
            case 'PREMIOS':
            case 'PREMIO':
            case 'CUPONES':
            case 'CAMPANAS':
                return {
                    icon: <Gift size={18} className="text-emerald-600" />,
                    bg: 'bg-emerald-50 border-emerald-200/80',
                    textColor: 'text-emerald-700',
                    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    label: 'PREMIO'
                };
            case 'COMUNICACIONES':
            case 'NOTICIAS':
            case 'NOTICIA':
            case 'AVISOS':
            case 'AVISO':
                return {
                    icon: <Megaphone size={18} className="text-purple-600" />,
                    bg: 'bg-purple-50 border-purple-200/80',
                    textColor: 'text-purple-700',
                    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
                    label: 'AVISO'
                };
            default:
                return {
                    icon: <Info size={18} className="text-slate-600" />,
                    bg: 'bg-slate-50 border-slate-200/80',
                    textColor: 'text-slate-700',
                    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
                    label: 'SISTEMA'
                };
        }
    };

    const getActionBtnText = (actionType: string) => {
        switch (actionType) {
            case 'VER_ORDEN': return bizType.isRestaurant ? 'Ver Pedido' : 'Ver Orden';
            case 'VER_RESERVA': return bizType.isCanchas ? 'Ver Reserva' : 'Ver Cita';
            case 'VER_CAMPANA': return 'Ver Detalles';
            case 'VER_PREMIO': return 'Ver Premios';
            case 'VER_PROMO': return 'Ver Oferta';
            case 'VER_PERFIL': return 'Mi Cuenta';
            case 'ABRIR_URL': return 'Abrir enlace';
            default: return 'Ver más';
        }
    };

    const groupedList = groupNotificationsByDate(notifications);

    return (
        <div className="min-h-screen bg-slate-50/80 text-slate-900 font-sans pb-36 pt-0 md:pt-[84px]">
            
            {/* ── BARRA SUPERIOR PARA MÓVIL ──────────────────────────────── */}
            <div className="md:hidden sticky top-0 z-30 px-4 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.back()}
                        className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-all"
                        aria-label="Volver"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xs font-bold uppercase tracking-wider text-slate-900 leading-tight">
                            Notificaciones
                        </h1>
                        <span className="text-xs text-slate-500 font-semibold">
                            {negocio?.nombre || 'Centro de Actividad'}
                        </span>
                    </div>
                </div>

                {unreadCount > 0 && (
                    <button 
                        onClick={handleMarkAllAsRead}
                        className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 border border-slate-200"
                    >
                        <CheckCircle2 size={13} style={{ color: primaryColor }} />
                        Leídas
                    </button>
                )}
            </div>

            {/* ── CONTENIDO PRINCIPAL ADAPTATIVO (MÓVIL & PC) ──────────────── */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
                
                {/* CABECERA EN ESCRITORIO (PC) */}
                <div className="hidden md:flex items-center justify-between pb-6 border-b border-slate-200">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span 
                                className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide text-white shadow-xs"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {negocio?.nombre || 'CitiOx'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Centro de Novedades en Vivo
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            Centro de Notificaciones
                            {unreadCount > 0 && (
                                <span 
                                    className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {unreadCount} nueva{unreadCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-slate-600 font-medium">
                            {bizType.isShoeCare 
                                ? 'Sigue tus órdenes de cuidado de prendas, promociones exclusivas y recompensas acumuladas.'
                                : bizType.isRestaurant
                                ? 'Sigue tus pedidos de comida en vivo, promociones de temporada y cupones de descuento.'
                                : bizType.isCanchas
                                ? 'Consulta tus reservas de canchas, partidos agendados y beneficios deportivos.'
                                : 'Mantente al día con tus reservas, citas, ofertas especiales y novedades de tu cuenta.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllAsRead}
                                className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-700 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                            >
                                <CheckCircle2 size={16} style={{ color: primaryColor }} />
                                Marcar todas leídas
                            </button>
                        )}
                        <Link
                            href={`/${slug}`}
                            className="px-5 py-2.5 rounded-2xl text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                            style={{ 
                                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor})`
                            }}
                        >
                            Ir a Inicio
                            <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>

                {/* FILTROS Y BUSCADOR */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3.5">
                    {/* Buscador */}
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Buscar en tus notificaciones y actividades..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-10 py-3 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')} 
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filtros de Categorías */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        {categories.map((cat) => {
                            const isSelected = selectedCategory === cat.key;
                            return (
                                <button
                                    key={cat.key}
                                    onClick={() => setSelectedCategory(cat.key)}
                                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all flex items-center gap-2 border cursor-pointer ${
 isSelected 
 ? 'text-white border-transparent' 
 : 'bg-slate-50/80 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
 }`}
                                    style={isSelected ? {
                                        backgroundColor: primaryColor,
                                        boxShadow: `0 4px 14px ${primaryColor}40`
                                    } : undefined}
                                >
                                    {cat.icon}
                                    <span>{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* GRID DE DOS COLUMNAS EN PC (8 cols lista + 4 cols sidebar) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* COLUMNA PRINCIPAL DE NOTIFICACIONES */}
                    <div className="lg:col-span-8 space-y-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
                                <Loader2 className="animate-spin" size={32} style={{ color: primaryColor }} />
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Cargando notificaciones...
                                </span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="bg-white rounded-3xl p-8 sm:p-14 border border-slate-200 text-center shadow-sm flex flex-col items-center justify-center py-16">
                                <div className="relative mb-5">
                                    <div 
                                        className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-md"
                                        style={{ 
                                            background: `linear-gradient(135deg, ${primaryColor}18, ${primaryColor}30)`,
                                            border: `1.5px solid ${primaryColor}35`
                                        }}
                                    >
                                        <Bell size={32} style={{ color: primaryColor }} />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white">
                                        <Check size={14} className="stroke-[3]" />
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold tracking-wider text-slate-900">
                                    ¡Estás al día!
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 max-w-md mx-auto leading-relaxed">
                                    {selectedCategory === 'TODAS'
                                        ? 'No tienes notificaciones pendientes en este momento. Las nuevas alertas sobre tus órdenes, citas y promos llegarán aquí.'
                                        : `No se han registrado novedades en la categoría "${selectedCategory}".`}
                                </p>

                                <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
                                    {selectedCategory !== 'TODAS' && (
                                        <button
                                            onClick={() => setSelectedCategory('TODAS')}
                                            className="px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                                        >
                                            Ver todas
                                        </button>
                                    )}
                                    <Link
                                        href={bizType.isShoeCare ? `/${slug}/pedidos` : `/${slug}`}
                                        className="px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {bizType.isShoeCare ? 'Consultar Mis Órdenes' : 'Explorar Tienda'}
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {groupedList.map(([title, groupItems]) => (
                                    <div key={title} className="space-y-3">
                                        <div className="flex items-center gap-3 pl-1">
                                            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                                {title}
                                            </h3>
                                            <div className="h-px flex-1 bg-slate-200" />
                                        </div>

                                        <div className="space-y-3">
                                            {groupItems.map((n) => {
                                                const themeConfig = getCategoryStyles(n.categoria);
                                                return (
                                                    <div 
                                                        key={n.id} 
                                                        className={`bg-white rounded-3xl p-5 sm:p-6 transition-all flex flex-col gap-4 relative overflow-hidden border shadow-xs hover:shadow-md ${
                                                            n.leida 
                                                                ? 'border-slate-200/80 opacity-95' 
                                                                : 'border-slate-200 ring-2 ring-slate-100'
                                                        }`}
                                                        style={!n.leida ? { borderLeftWidth: '4px', borderLeftColor: primaryColor } : undefined}
                                                    >
                                                        {/* Encabezado de la Alerta */}
                                                        <div className="flex items-start gap-4">
                                                            {/* Icono de categoría */}
                                                            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border ${themeConfig.bg}`}>
                                                                {themeConfig.icon}
                                                            </div>

                                                            {/* Textos */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${themeConfig.badgeBg}`}>
                                                                            {themeConfig.label}
                                                                        </span>
                                                                        <span className="text-xs text-slate-500 font-semibold">
                                                                            • {getFormattedTime(n.createdAt)}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center gap-2">
                                                                        {!n.leida && (
                                                                            <span 
                                                                                className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase"
                                                                                style={{ 
                                                                                    backgroundColor: `${primaryColor}18`, 
                                                                                    color: primaryColor 
                                                                                }}
                                                                            >
                                                                                NUEVO
                                                                            </span>
                                                                        )}
                                                                        
                                                                        <div 
                                                                            className={`w-2.5 h-2.5 rounded-full ${
                                                                                n.leida 
                                                                                    ? 'border border-slate-300 bg-transparent' 
                                                                                    : 'animate-ping'
                                                                            }`}
                                                                            style={!n.leida ? { backgroundColor: primaryColor } : undefined}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                
                                                                <h4 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-tight leading-snug">
                                                                    {n.titulo}
                                                                </h4>
                                                                
                                                                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mt-1">
                                                                    {n.descripcion}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Imagen Adjunta si existe */}
                                                        {n.imagenUrl && (
                                                            <div className="w-full h-44 sm:h-52 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                                                                <img src={n.imagenUrl} className="w-full h-full object-cover" alt="Detalle" />
                                                            </div>
                                                        )}

                                                        {/* Acciones */}
                                                        <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
                                                            <button 
                                                                onClick={() => handleDelete(n.id)}
                                                                className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                                                title="Eliminar notificación"
                                                            >
                                                                <Trash2 size={15} />
                                                                <span className="hidden sm:inline">Descartar</span>
                                                            </button>

                                                            <div className="flex items-center gap-2.5">
                                                                {!n.leida && (
                                                                    <button 
                                                                        onClick={() => handleMarkAsRead(n.id)}
                                                                        className="text-xs font-bold uppercase tracking-wider px-3.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                                                                    >
                                                                        Entendido
                                                                    </button>
                                                                )}

                                                                {n.actionType && (
                                                                    <button 
                                                                        onClick={() => handleActionClick(n)}
                                                                        className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-sm text-white cursor-pointer"
                                                                        style={{ 
                                                                            backgroundColor: primaryColor
                                                                        }}
                                                                    >
                                                                        {getActionBtnText(n.actionType)}
                                                                        <ArrowRight size={14} />
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
                                        className="w-full py-4 bg-white border border-slate-200 rounded-3xl text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                                    >
                                        {loadingMore ? (
                                            <>
                                                <Loader2 className="animate-spin" size={16} style={{ color: primaryColor }} />
                                                Cargando más actividades...
                                            </>
                                        ) : 'Cargar más actividades'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* COLUMNA LATERAL (PC DESKTOP SIDEBAR) */}
                    <div className="hidden lg:flex lg:col-span-4 flex-col gap-5 sticky top-28">
                        
                        {/* Tarjeta de Estado del Negocio */}
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center gap-3.5">
                                {negocio?.logoUrl ? (
                                    <img src={negocio.logoUrl} alt={negocio.nombre} className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shadow-xs" />
                                ) : (
                                    <div 
                                        className="w-13 h-13 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-xs"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {negocio?.nombre?.charAt(0) || 'C'}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-base uppercase tracking-tight text-slate-900 leading-tight">
                                        {negocio?.nombre || 'Mi Negocio'}
                                    </h3>
                                    <span className="text-xs text-slate-500 font-semibold block mt-0.5">
                                        {bizType.isShoeCare 
                                            ? 'Cuidado & Limpieza de Calzado'
                                            : bizType.isRestaurant
                                            ? 'Restaurante & Comida'
                                            : bizType.isCanchas
                                            ? 'Centro Deportivo'
                                            : bizType.isGym
                                            ? 'Centro Fitness'
                                            : 'Servicios Profesionales'}
                                    </span>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div 
                                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: `${primaryColor}15` }}
                                    >
                                        <Bell size={16} style={{ color: primaryColor }} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-800">
                                        No leídas
                                    </span>
                                </div>
                                <span 
                                    className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-xs"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {unreadCount}
                                </span>
                            </div>

                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="w-full py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                                >
                                    <CheckCircle2 size={15} style={{ color: primaryColor }} />
                                    Marcar todas como leídas
                                </button>
                            )}
                        </div>

                        {/* Tarjeta de Accesos Rápidos según tipo de negocio */}
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3.5">
                            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                Accesos Rápidos
                            </h4>

                            <div className="space-y-2">
                                {bizType.isShoeCare ? (
                                    <>
                                        <Link 
                                            href={`/${slug}/pedidos`}
                                            className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 transition-all"
                                        >
                                            <span className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                    <PackageCheck size={17} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-900 group-hover:text-black">
                                                    Mis Órdenes
                                                </span>
                                            </span>
                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                                        </Link>

                                        <Link 
                                            href={`/${slug}#servicios`}
                                            className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 transition-all"
                                        >
                                            <span className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                                                    <Sparkles size={17} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-900 group-hover:text-black">
                                                    Solicitar Limpieza
                                                </span>
                                            </span>
                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                                        </Link>

                                        <Link 
                                            href={`/${slug}#promociones`}
                                            className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 transition-all"
                                        >
                                            <span className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                                    <Tag size={17} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-900 group-hover:text-black">
                                                    Ver Ofertas
                                                </span>
                                            </span>
                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                                        </Link>

                                        <Link 
                                            href={`/${slug}/misiones`}
                                            className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 transition-all"
                                        >
                                            <span className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                                    <Gift size={17} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-900 group-hover:text-black">
                                                    Premios & Misiones
                                                </span>
                                            </span>
                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                    </>
                                ) : bizType.isRestaurant ? (
                                    <>
                                        <Link 
                                            href={`/${slug}/pedidos`}
                                            className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 transition-all"
                                        >
                                            <span className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                                    <ShoppingBag size={17} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-900 group-hover:text-black">
                                                    Mis Pedidos
                                                </span>
                                            </span>
                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                                        </Link>

                                        <Link 
                                            href={`/${slug}#menu`}
                                            className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 transition-all"
                                        >
                                            <span className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                                                    <Sparkles size={17} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-900 group-hover:text-black">
                                                    Ver Menú
                                                </span>
                                            </span>
                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                    </>
                                ) : bizType.isCanchas ? (
                                    <>
                                        <Link 
                                            href={`/${slug}/mis-reservas`}
                                            className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 transition-all"
                                        >
                                            <span className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                                    <Calendar size={17} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-900 group-hover:text-black">
                                                    Mis Reservas
                                                </span>
                                            </span>
                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                                        </Link>

                                        <Link 
                                            href={`/${slug}#canchas`}
                                            className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 transition-all"
                                        >
                                            <span className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                                    <Sparkles size={17} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-900 group-hover:text-black">
                                                    Reservar Cancha
                                                </span>
                                            </span>
                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link 
                                            href={`/${slug}/mis-reservas`}
                                            className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 transition-all"
                                        >
                                            <span className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                                    <Calendar size={17} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-900 group-hover:text-black">
                                                    Mis Citas
                                                </span>
                                            </span>
                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                                        </Link>

                                        <Link 
                                            href={`/${slug}/servicios`}
                                            className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 transition-all"
                                        >
                                            <span className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                                                    <Sparkles size={17} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-900 group-hover:text-black">
                                                    Agendar Cita
                                                </span>
                                            </span>
                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                    </>
                                )}

                                <Link 
                                    href={`/${slug}/perfil`}
                                    className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 transition-all"
                                >
                                    <span className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                                            <ShieldCheck size={17} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 group-hover:text-black">
                                            Mi Cuenta & Perfil
                                        </span>
                                    </span>
                                    <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                            </div>
                        </div>

                        {/* Tarjeta de Asistencia / WhatsApp */}
                        {negocio?.whatsapp && (
                            <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent rounded-3xl p-5 border border-emerald-500/20 space-y-2.5">
                                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                                    <MessageCircle size={16} />
                                    ¿Dudas con tu servicio?
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                    Escríbenos directamente por WhatsApp para asistencia con tus órdenes o agendamientos.
                                </p>
                                <a
                                    href={`https://wa.me/${negocio.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${negocio.nombre}, tengo una consulta sobre mis notificaciones / servicios`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs"
                                >
                                    Contactar por WhatsApp
                                    <ArrowRight size={13} />
                                </a>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
}

