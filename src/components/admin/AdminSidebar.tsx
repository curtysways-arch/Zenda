'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useConfirm } from '@/components/admin/ConfirmContext';
import {
    LayoutDashboard,
    CalendarDays,
    Sparkles,
    Settings,
    Users,
    LogOut,
    ChevronRight,
    MessageSquare,
    Building2,
    BarChart3,
    Trophy,
    Tags,
    Mail,
    Lock,
    Menu,
    X,
    Layout,
    Package,
    GraduationCap,
    Contact,
    Scissors,
    CreditCard,
    ShieldCheck,
    Gift,
    Bell,
    Zap,
    Briefcase,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSession, signOut } from 'next-auth/react';

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

const ZendaLogo = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        {/* Cuerpo del Calendario */}
        <rect x="3" y="5" width="18" height="15" rx="3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Cabezal */}
        <path d="M3 9.5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Anillos de sujeción */}
        <path d="M8 3V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 3V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* El Check en el centro */}
        <path d="M9.5 13.5L11.5 15.5L15 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Líneas inferiores de agenda */}
        <path d="M6 17.5H12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M7 16.5V18.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M9 16.5V18.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M11 16.5V18.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        
        {/* Mini reloj abajo a la derecha */}
        <circle cx="16.5" cy="17" r="1.5" stroke="currentColor" strokeWidth="1" />
        <path d="M16.5 16.2V17H17.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
);

export default function AdminSidebar({ primaryColor = '#0ea5e9' }: { primaryColor?: string }) {
    const { confirm } = useConfirm();
    const pathname = usePathname();
    const { data: session } = useSession();
    const role = (session?.user as any)?.role || 'STAFF';
    const tipoNegocio = (session?.user as any)?.tipoNegocio || 'RESERVA';

    const [isOpen, setIsOpen] = useState(false);
    const [pendingReservations, setPendingReservations] = useState(0);
    const [pendingEnrollments, setPendingEnrollments] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [coursesEnabled, setCoursesEnabled] = useState(false);
    const [promotionsEnabled, setPromotionsEnabled] = useState(false);

    const checkFeatures = async () => {
        try {
            const resC = await fetch('/api/admin/validate-access?feature=courses');
            if (resC.ok) {
                const data = await resC.json();
                setCoursesEnabled(data.allowed);
            }
            const resP = await fetch('/api/admin/validate-access?feature=automatic-discounts');
            if (resP.ok) {
                const data = await resP.json();
                setPromotionsEnabled(data.allowed);
            }
        } catch (error) {
            console.error("Error checking features", error);
        }
    };

    const checkPendingReservations = async () => {
        try {
            const url = tipoNegocio === 'PRODUCTOS' 
                ? '/api/admin/pedidos/pending-count' 
                : '/api/appointments/pending-count';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setPendingReservations(data.count || 0);
            }
        } catch (error) {
            console.error("Error fetching pending reservations count", error);
        }
    };

    const checkPendingEnrollments = async () => {
        try {
            const res = await fetch('/api/admin/cursos/inscripciones/pendientes');
            if (res.ok) {
                const data = await res.json();
                setPendingEnrollments(data.count || 0);
            }
        } catch (error) {
            console.error("Error fetching pending enrollments count", error);
        }
    };

    const checkNotifications = async () => {
        try {
            const res = await fetch('/api/admin/notificaciones?filter=unread');
            if (res.ok) {
                const data = await res.json();
                setUnreadNotifications(Array.isArray(data) ? data.length : 0);
            }
        } catch (error) {
            console.error("Error fetching unread notifications count", error);
        }
    };

    useEffect(() => {
        const handleToggle = () => setIsOpen(prev => !prev);
        window.addEventListener('toggle-admin-sidebar', handleToggle);
        
        // Escuchar cuando una notificación es marcada como leída en la página de Inbox
        window.addEventListener('notification-marked-read', checkNotifications);

        return () => {
            window.removeEventListener('toggle-admin-sidebar', handleToggle);
            window.removeEventListener('notification-marked-read', checkNotifications);
        };
    }, []);

    useEffect(() => {
        // Fetch initially
        checkPendingReservations();
        checkPendingEnrollments();
        checkNotifications();
        checkFeatures();

        // Polling every 60 seconds
        const intervalId = setInterval(() => {
            checkPendingReservations();
            checkPendingEnrollments();
            checkNotifications();
            checkFeatures();
        }, 60000);
        return () => clearInterval(intervalId);
    }, [pathname]); // Refresh when navigating to have fresh count

    const menuItems = (tipoNegocio === 'PRODUCTOS' ? [
        // --- CORE OPERATIVO ---
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, section: 'GESTIÓN OPERATIVA' },
        { name: 'Pedidos', href: '/admin/pedidos', icon: Package, section: 'GESTIÓN OPERATIVA' },
        
        // --- CATÁLOGO ---
        { name: 'Productos', href: '/admin/productos', icon: Sparkles, section: 'CATÁLOGO', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Categorías', href: '/admin/categorias', icon: Tags, section: 'CATÁLOGO', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },

        // --- ADMINISTRACIÓN ---
        { name: 'Clientes', href: '/admin/clientes', icon: Contact, section: 'ADMINISTRACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Personal', href: '/admin/usuarios', icon: Users, section: 'ADMINISTRACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Reportes', href: '/admin/reportes', icon: BarChart3, section: 'ADMINISTRACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        
        // --- CONFIGURACIÓN ---
        { name: 'Anuncios', href: '/admin/notificaciones', icon: Bell, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Configuración', href: '/admin/config', icon: Settings, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Perfil', href: '/admin/perfil', icon: Building2, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Mi Plan', href: '/admin/plan', icon: Package, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Super Panel', href: '/superadmin', icon: ShieldCheck, section: 'CONFIGURACIÓN', roles: ['SUPERADMIN'] },
    ] : [
        // --- CORE OPERATIVO ---
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, section: 'GESTIÓN OPERATIVA' },
        { name: 'Citas', href: '/admin/citas', icon: CalendarDays, section: 'GESTIÓN OPERATIVA' },
        { name: 'Servicios', href: '/admin/servicios', icon: Scissors, section: 'GESTIÓN OPERATIVA', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Profesionales', href: '/admin/staff', icon: Users, section: 'GESTIÓN OPERATIVA', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Bloqueos', href: '/admin/bloqueos', icon: Lock, section: 'GESTIÓN OPERATIVA', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },

        // --- ACADEMIA Y MARKETING ---
        { name: 'Academia', href: '/admin/cursos', icon: GraduationCap, section: 'ACADEMIA Y MARKETING', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'STAFF', 'SUPERADMIN'], enabled: coursesEnabled },
        { name: 'Promociones', href: '/admin/promociones', icon: Tags, section: 'ACADEMIA Y MARKETING', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'], enabled: promotionsEnabled },
        { name: 'Club de Beneficios', href: '/admin/misiones', icon: Trophy, section: 'ACADEMIA Y MARKETING', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Misiones Citiox', href: '/admin/misiones-citiox', icon: Briefcase, section: 'ACADEMIA Y MARKETING', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Comunicación', href: '/admin/comunicacion', icon: MessageSquare, section: 'ACADEMIA Y MARKETING', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Newsletter', href: '/admin/newsletter', icon: Mail, section: 'ACADEMIA Y MARKETING', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Páginas', href: '/admin/paginas', icon: Layout, section: 'ACADEMIA Y MARKETING', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Mis Trabajos', href: '/admin/resultados', icon: Sparkles, section: 'ACADEMIA Y MARKETING', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },

        // --- ADMINISTRACIÓN ---
        { name: 'Clientes', href: '/admin/clientes', icon: Contact, section: 'ADMINISTRACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Personal', href: '/admin/usuarios', icon: Users, section: 'ADMINISTRACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Reportes', href: '/admin/reportes', icon: BarChart3, section: 'ADMINISTRACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        
        // --- CONFIGURACIÓN ---
        { name: 'Anuncios', href: '/admin/notificaciones', icon: Bell, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Configuración', href: '/admin/config', icon: Settings, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Perfil', href: '/admin/perfil', icon: Building2, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Mi Plan', href: '/admin/plan', icon: Package, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] },
        { name: 'Super Panel', href: '/superadmin', icon: ShieldCheck, section: 'CONFIGURACIÓN', roles: ['SUPERADMIN'] },
    ]).filter(item => (!item.roles || item.roles.some(r => r === role || (role === 'ADMIN_NEGOCIO' && r === 'ADMIN'))) && item.enabled !== false);

    // Deslogueo
    const handleLogout = async () => {
        const isOk = await confirm('¿Seguro quieres cerrar sesión del panel de administrador?', {
            title: 'Cerrar Sesión',
            confirmText: 'Cerrar Sesión',
            type: 'danger'
        });
        if (!isOk) return;
        await signOut({ callbackUrl: '/login' });
    };

    return (
        <>

            {/* Overlay para móvil */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Panel Sidebar (Móvil & Escritorio) - PREMIUM STYLE */}
            <aside className={cn(
                "fixed md:sticky top-0 left-0 z-[100] h-[100dvh] w-72 bg-white border-r border-slate-200 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
            )}>
                <div className="p-8 border-b border-slate-100 hidden md:block relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl opacity-10 transition-colors" style={{ backgroundColor: primaryColor }} />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="size-12 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                            <ZendaLogo size={22} />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-900 uppercase tracking-tighter leading-none italic text-xl">
                                Citi<span style={{ color: primaryColor }}>Ox</span>
                            </h2>
                            <span className="text-[10px] font-black tracking-[0.2em] uppercase leading-none" style={{ color: primaryColor }}>Admin Panel</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto custom-scrollbar pt-8 md:pt-10">
                    <div className="px-4 mb-6 hidden md:block">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Menú Principal</span>
                    </div>

                    {menuItems.map((item, index) => {
                        const isActive = pathname === item.href;
                        const showSection = index === 0 || menuItems[index - 1].section !== item.section;
                        
                        return (
                            <div key={item.name}>
                                {showSection && (
                                    <div className="px-5 pt-8 pb-3">
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">{item.section}</span>
                                    </div>
                                )}
                                <Link
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                                        isActive
                                            ? "text-white shadow-xl translate-x-1"
                                            : "text-slate-500 hover:bg-slate-50 hover:translate-x-1"
                                    )}
                                    style={isActive ? { backgroundColor: primaryColor } : {}}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <item.icon size={20} className={cn(
                                            "transition-all duration-500 group-hover:scale-110",
                                            isActive ? "text-white" : "text-slate-400 group-hover:text-slate-900"
                                        )} style={isActive ? { color: '#ffffff' } : {}} />
                                        <span className="font-black tracking-tight text-xs uppercase italic">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 relative z-10">
                                        {item.name === 'Citas' && pendingReservations > 0 && (
                                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-rose-600 text-white text-[9px] font-black rounded-full animate-pulse shadow-lg shadow-rose-500/30">
                                                {pendingReservations}
                                            </span>
                                        )}
                                        {item.name === 'Pedidos' && pendingReservations > 0 && (
                                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-rose-600 text-white text-[9px] font-black rounded-full animate-pulse shadow-lg shadow-rose-500/30">
                                                {pendingReservations}
                                            </span>
                                        )}
                                        {item.name === 'Academia' && pendingEnrollments > 0 && (
                                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-amber-500 text-white text-[9px] font-black rounded-full animate-pulse shadow-lg shadow-amber-500/30">
                                                {pendingEnrollments}
                                            </span>
                                        )}
                                        {item.name === 'Anuncios' && unreadNotifications > 0 && (
                                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-cyan-500 text-white text-[9px] font-black rounded-full animate-pulse shadow-lg shadow-cyan-500/30 animate-bounce">
                                                {unreadNotifications}
                                            </span>
                                        )}
                                        {isActive && (
                                            <div className="size-1.5 rounded-full shadow-lg" style={{ backgroundColor: 'white' }} />
                                        )}
                                    </div>
                                </Link>
                            </div>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-slate-100 bg-white">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 w-full px-5 py-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all duration-300 font-black text-xs uppercase tracking-widest group"
                    >
                        <div className="size-10 bg-rose-500/10 rounded-[1.25rem] flex items-center justify-center text-rose-500 group-hover:rotate-12 transition-transform duration-500">
                            <LogOut size={20} />
                        </div>
                        CERRAR SESIÓN
                    </button>
                </div>
            </aside>

        </>
    );
}
