'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    CalendarDays, 
    Users, 
    Sparkles, 
    Settings,
    Package,
    ShoppingBag,
    Utensils,
    Dribbble,
    Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface BottomNavProps {
    primaryColor: string;
}

export default function MobileBottomNav({ primaryColor }: BottomNavProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userObj = session?.user as any;

    const [bizData, setBizData] = useState<any>(null);
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

    // Detección de vertical según tipoNegocio, slug, nombre y blueprintId
    const tipoUpper = (bizData?.tipoNegocio || userObj?.tipoNegocio || '').toUpperCase();
    const slugUpper = (bizData?.slug || '').toUpperCase();
    const nameUpper = (bizData?.nombre || '').toUpperCase();
    let cfg: any = {};
    if (typeof bizData?.configuracion === 'string') {
        try { cfg = JSON.parse(bizData.configuracion); } catch { cfg = {}; }
    } else {
        cfg = bizData?.configuracion || {};
    }
    const blueprintId = (cfg.blueprintId || '').toUpperCase();

    const isRestaurant = tipoUpper === 'RESTAURANTE' || tipoUpper === 'GASTRONOMIA' || tipoUpper === 'RESTAURANT' ||
        nameUpper.includes('PARRILLA') || nameUpper.includes('RESTAURANTE') || nameUpper.includes('GASTRONOMIA') || nameUpper.includes('BURGER') || nameUpper.includes('PIZZA') || nameUpper.includes('TACO');
    const isPinchos = tipoUpper === 'PINCHOS' || slugUpper === 'PINCHOS';
    const isCanchas = tipoUpper === 'SPORTS_COURTS' || tipoUpper === 'CANCHAS' || 
        slugUpper.includes('CANCHA') || slugUpper.includes('CAMPEONES') || 
        nameUpper.includes('CANCHA') || nameUpper.includes('COMPLEJO') || 
        nameUpper.includes('CAMPEONES') || nameUpper.includes('PADEL') || nameUpper.includes('SINTETICA');
    const isServiceBiz = !isRestaurant && !isPinchos && !isCanchas && (
        tipoUpper === 'SPA' ||
        tipoUpper === 'CENTRO_ESTETICA' ||
        tipoUpper === 'PELUQUERIA' ||
        tipoUpper === 'BARBERIA' ||
        tipoUpper === 'SHOE_CARE' ||
        tipoUpper === 'LAVANDERIA' ||
        tipoUpper === 'ORDENES-SERVICIO' ||
        tipoUpper === 'BEAUTY_SPA' ||
        tipoUpper === 'RESERVA' ||
        slugUpper.includes('SPA') ||
        slugUpper.includes('BARBER') ||
        slugUpper.includes('NAILS') ||
        slugUpper.includes('DENTAL') ||
        slugUpper.includes('CITAS') ||
        nameUpper.includes('SPA') ||
        nameUpper.includes('ESTETICA') ||
        nameUpper.includes('PELUQUERIA') ||
        nameUpper.includes('BARBERIA')
    );

    const isStore = (
        tipoUpper === 'PRODUCTOS' ||
        tipoUpper === 'TIENDA' ||
        tipoUpper === 'STORE' ||
        tipoUpper === 'E_COMMERCE' ||
        tipoUpper === 'TIENDA_ONLINE' ||
        tipoUpper === 'PRODUCTO' ||
        blueprintId === 'STORE' ||
        (!isRestaurant && !isPinchos && !isCanchas && !isServiceBiz)
    );

    // Definición de ítems según vertical
    let navItems: any[] = [
        { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
        { name: 'Agenda', href: '/admin/citas', icon: CalendarDays },
        { name: 'Clientes', href: '/admin/clientes', icon: Users },
        { name: 'Resultados', href: '/admin/resultados', icon: Sparkles },
        { name: 'Más', isAction: true, icon: Menu },
    ];

    if (isStore) {
        navItems = [
            { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
            { name: 'Ventas POS', href: '/admin/ventas', icon: ShoppingBag },
            { name: 'Pedidos', href: '/admin/pedidos', icon: Package },
            { name: 'Productos', href: '/admin/productos', icon: Sparkles },
            { name: 'Más', isAction: true, icon: Menu },
        ];
    } else if (isRestaurant || isPinchos) {
        navItems = [
            { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
            { name: 'Ventas POS', href: '/admin/ventas', icon: ShoppingBag },
            { name: 'Mesas', href: '/admin/mesas', icon: Utensils },
            { name: 'Pedidos', href: '/admin/pedidos', icon: Package },
            { name: 'Más', isAction: true, icon: Menu },
        ];
    } else if (isCanchas) {
        navItems = [
            { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
            { name: 'Canchas', href: '/admin/canchas', icon: Dribbble },
            { name: 'Reservas', href: '/admin/reservas', icon: CalendarDays },
            { name: 'Clientes', href: '/admin/clientes', icon: Users },
            { name: 'Más', isAction: true, icon: Menu },
        ];
    }

    // Notificaciones de ítems pendientes
    useEffect(() => {
        const fetchPending = async () => {
            try {
                const url = (isStore || isRestaurant || isPinchos) 
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
    }, [isStore, isRestaurant, isPinchos]);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-2xl border-t border-slate-100 pb-safe-area-inset-bottom">
            <nav className="flex items-center justify-around h-20 px-2 max-w-lg mx-auto">
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
                                className="relative flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 active:scale-90 text-slate-500 hover:text-slate-900 cursor-pointer"
                                title="Abrir todas las opciones"
                                aria-label="Abrir todas las opciones"
                            >
                                <div className="p-1.5 rounded-xl transition-all duration-300 hover:bg-slate-100">
                                    <item.icon size={22} strokeWidth={2} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-center truncate max-w-[64px] opacity-70">
                                    {item.name}
                                </span>
                            </button>
                        );
                    }

                    const isActive = pathname === item.href;
                    return (
                        <Link 
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 active:scale-90",
                                isActive ? "text-slate-900" : "text-slate-400"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-xl transition-all duration-300",
                                isActive ? "bg-slate-900/5" : ""
                            )}>
                                <item.icon 
                                    size={22} 
                                    strokeWidth={isActive ? 2.5 : 2}
                                    style={isActive ? { color: primaryColor } : {}}
                                />
                            </div>
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest text-center truncate max-w-[64px]",
                                isActive ? "opacity-100" : "opacity-60"
                            )}>
                                {item.name}
                            </span>
                            
                            {(item.name === 'Agenda' || item.name === 'Pedidos' || item.name === 'Reservas') && pendingCount > 0 && (
                                <span className="absolute top-3 right-1/4 size-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                    {pendingCount}
                                </span>
                            )}

                            {isActive && (
                                <div 
                                    className="absolute -top-[1px] w-8 h-[3px] rounded-b-full transition-all duration-500"
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
