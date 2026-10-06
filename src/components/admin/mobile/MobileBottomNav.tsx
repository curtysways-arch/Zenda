'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    CalendarDays, 
    Users, 
    Sparkles, 
    Package, 
    ShoppingBag, 
    Utensils, 
    Dribbble, 
    ClipboardList, 
    Store, 
    Menu,
    Smile,
    CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
    isDentalBusiness, 
    isGymBusiness, 
    isLaundryOrShoeCareBusiness, 
    isRestaurantBusiness, 
    isSportsCourtsBusiness, 
    isStoreBusiness 
} from '@/lib/businessTypeHelper';

interface BottomNavProps {
    primaryColor: string;
    initialBusiness?: any;
}

export default function MobileBottomNav({ primaryColor, initialBusiness }: BottomNavProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userObj = session?.user as any;

    const [bizData, setBizData] = useState<any>(initialBusiness || null);
    const [pendingCount, setPendingCount] = useState(0);

    // Cargar información real del negocio actual (soporta acceso delegado)
    useEffect(() => {
        const fetchBiz = async () => {
            try {
                const res = await fetch('/api/negocio');
                if (res.ok) {
                    const data = await res.json();
                    setBizData(data);
                }
            } catch (_) {}
        };
        fetchBiz();
    }, [pathname]);

    // Consolidar señales del negocio (desde API o sesión)
    const effectiveBiz = bizData || {
        tipoNegocio: userObj?.tipoNegocio,
        slug: userObj?.slug,
        nombre: userObj?.nombre || userObj?.businessName,
        configuracion: userObj?.configuracion
    };

    const isDental = isDentalBusiness(effectiveBiz);
    const isGym = isGymBusiness(effectiveBiz);
    const isShoeCare = isLaundryOrShoeCareBusiness(effectiveBiz);
    const isRestaurant = isRestaurantBusiness(effectiveBiz) || 
        (effectiveBiz?.tipoNegocio || '').toUpperCase() === 'PINCHOS' || 
        (effectiveBiz?.slug || '').toLowerCase() === 'pinchos';
    const isCanchas = isSportsCourtsBusiness(effectiveBiz);
    const isStore = isStoreBusiness(effectiveBiz);

    // Definición de ítems según vertical
    let navItems: any[] = [];

    if (isDental) {
        navItems = [
            { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
            { name: 'Agenda', href: '/admin/citas', icon: CalendarDays },
            { name: 'Pacientes', href: '/admin/pacientes', icon: Users },
            { name: 'Tratamientos', href: '/admin/servicios', icon: Smile },
            { name: 'Más', isAction: true, icon: Menu },
        ];
    } else if (isGym) {
        navItems = [
            { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
            { name: 'Socios', href: '/admin/socios', icon: Users },
            { name: 'Clases', href: '/admin/clases', icon: CalendarDays },
            { name: 'Membresías', href: '/admin/membresias', icon: CreditCard },
            { name: 'Más', isAction: true, icon: Menu },
        ];
    } else if (isShoeCare) {
        navItems = [
            { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
            { name: 'Órdenes', href: '/admin/ordenes-servicio', icon: ClipboardList },
            { name: 'Recepciones', href: '/admin/recepciones', icon: ShoppingBag },
            { name: 'Ventas POS', href: '/admin/ventas', icon: Store },
            { name: 'Más', isAction: true, icon: Menu },
        ];
    } else if (isRestaurant) {
        navItems = [
            { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
            { name: 'Ventas POS', href: '/admin/ventas', icon: ShoppingBag },
            { name: 'Mesas', href: '/admin/mesas', icon: Utensils },
            { name: 'Pedidos', href: '/admin/pedidos-online', icon: Package },
            { name: 'Más', isAction: true, icon: Menu },
        ];
    } else if (isCanchas) {
        navItems = [
            { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
            { name: 'Canchas', href: '/admin/canchas', icon: Dribbble },
            { name: 'Reservas', href: '/admin/citas', icon: CalendarDays },
            { name: 'Clientes', href: '/admin/clientes', icon: Users },
            { name: 'Más', isAction: true, icon: Menu },
        ];
    } else if (isStore) {
        navItems = [
            { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
            { name: 'Ventas POS', href: '/admin/ventas', icon: ShoppingBag },
            { name: 'Pedidos', href: '/admin/pedidos-online', icon: Package },
            { name: 'Productos', href: '/admin/productos', icon: Sparkles },
            { name: 'Más', isAction: true, icon: Menu },
        ];
    } else {
        // Servicios generales (Spa, Belleza, Barbería, Peluquería)
        navItems = [
            { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
            { name: 'Agenda', href: '/admin/citas', icon: CalendarDays },
            { name: 'Clientes', href: '/admin/clientes', icon: Users },
            { name: 'Servicios', href: '/admin/servicios', icon: Sparkles },
            { name: 'Más', isAction: true, icon: Menu },
        ];
    }

    // Notificaciones de ítems pendientes
    useEffect(() => {
        const fetchPending = async () => {
            try {
                const url = (isStore || isRestaurant || isShoeCare) 
                    ? '/api/admin/pedidos/pending-count' 
                    : '/api/appointments/pending-count';
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setPendingCount(data.count || 0);
                }
            } catch (_) {}
        };
        fetchPending();
        const interval = setInterval(fetchPending, 30000);
        return () => clearInterval(interval);
    }, [isStore, isRestaurant, isShoeCare]);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe-area-inset-bottom">
            <nav className="flex items-center justify-around h-16 px-1.5 max-w-md mx-auto">
                {navItems.map((item) => {
                    if (item.isAction) {
                        return (
                            <button
                                key={item.name}
                                type="button"
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        window.dispatchEvent(new CustomEvent('toggle-admin-sidebar'));
                                    }
                                }}
                                className="relative flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 transition-all duration-200 active:scale-95 text-slate-500 hover:text-slate-900 cursor-pointer"
                                title="Abrir todas las opciones"
                                aria-label="Abrir todas las opciones"
                            >
                                <div className="p-1 rounded-xl transition-all duration-200 hover:bg-slate-100">
                                    <item.icon size={21} strokeWidth={2.2} />
                                </div>
                                <span className="text-[10px] font-bold tracking-tight text-center truncate max-w-[68px] opacity-75">
                                    {item.name}
                                </span>
                            </button>
                        );
                    }

                    const isActive = pathname === item.href || 
                        (item.href === '/admin/pedidos-online' && pathname === '/admin/pedidos') ||
                        (item.href === '/admin/pacientes' && pathname.startsWith('/admin/pacientes')) ||
                        (item.href === '/admin/citas' && pathname.startsWith('/admin/citas'));

                    return (
                        <Link 
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 transition-all duration-200 active:scale-95",
                                isActive ? "text-slate-900 font-extrabold" : "text-slate-400 font-medium hover:text-slate-600"
                            )}
                        >
                            <div className={cn(
                                "p-1 rounded-xl transition-all duration-200",
                                isActive ? "bg-slate-900/5 shadow-xs" : ""
                            )}>
                                <item.icon 
                                    size={21} 
                                    strokeWidth={isActive ? 2.5 : 2}
                                    style={isActive ? { color: primaryColor } : {}}
                                />
                            </div>
                            <span 
                                className={cn(
                                    "text-[10px] tracking-tight text-center truncate max-w-[68px] leading-tight",
                                    isActive ? "opacity-100 font-extrabold text-slate-900" : "opacity-75"
                                )}
                                style={isActive ? { color: primaryColor } : {}}
                            >
                                {item.name}
                            </span>
                            
                            {(item.name === 'Agenda' || item.name === 'Pedidos' || item.name === 'Reservas') && pendingCount > 0 && (
                                <span className="absolute top-1.5 right-1/4 size-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                    {pendingCount}
                                </span>
                            )}

                            {isActive && (
                                <div 
                                    className="absolute -top-[1px] w-8 h-[3px] rounded-b-full transition-all duration-300"
                                    style={{ backgroundColor: primaryColor }}
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
