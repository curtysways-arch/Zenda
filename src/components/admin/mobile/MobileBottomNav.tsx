'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    CalendarDays, 
    Users, 
    Sparkles, 
    Settings,
    PlusCircle,
    Package
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
    const tipoNegocio = (session?.user as any)?.tipoNegocio || 'RESERVA';
    const [pendingCitas, setPendingCitas] = useState(0);

    const navItems = tipoNegocio === 'PRODUCTOS' ? [
        { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
        { name: 'Pedidos', href: '/admin/pedidos', icon: Package },
        { name: 'Productos', href: '/admin/productos', icon: Sparkles },
        { name: 'Clientes', href: '/admin/clientes', icon: Users },
        { name: 'Negocio', href: '/admin/config', icon: Settings },
    ] : [
        { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
        { name: 'Agenda', href: '/admin/citas', icon: CalendarDays },
        { name: 'Clientes', href: '/admin/clientes', icon: Users },
        { name: 'Resultados', href: '/admin/resultados', icon: Sparkles },
        { name: 'Negocio', href: '/admin/config', icon: Settings },
    ];

    useEffect(() => {
        const fetchPending = async () => {
            try {
                const url = tipoNegocio === 'PRODUCTOS' 
                    ? '/api/admin/pedidos/pending-count' 
                    : '/api/appointments/pending-count';
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setPendingCitas(data.count || 0);
                }
            } catch (e) {}
        };
        fetchPending();
        const interval = setInterval(fetchPending, 30000);
        return () => clearInterval(interval);
    }, [tipoNegocio]);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-2xl border-t border-slate-100 pb-safe-area-inset-bottom">
            <nav className="flex items-center justify-around h-20 px-2 max-w-lg mx-auto">
                {navItems.map((item) => {
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
                                "text-[9px] font-black uppercase tracking-widest",
                                isActive ? "opacity-100" : "opacity-60"
                            )}>
                                {item.name}
                            </span>
                            
                            {item.name === 'Agenda' && pendingCitas > 0 && (
                                <span className="absolute top-3 right-1/4 size-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                    {pendingCitas}
                                </span>
                            )}

                            {item.name === 'Pedidos' && pendingCitas > 0 && (
                                <span className="absolute top-3 right-1/4 size-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                    {pendingCitas}
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
