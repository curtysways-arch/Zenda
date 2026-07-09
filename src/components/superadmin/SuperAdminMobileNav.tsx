'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    MessageCircle,
    Bell,
    Settings,
    Package,
    Menu,
    X,
    CreditCard,
    Banknote,
    BarChart3,
    ShieldCheck,
    Smartphone,
    LogOut,
    UserCog,
    Gift,
    Megaphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';

export default function SuperAdminMobileNav() {
    const pathname = usePathname();
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0);
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/superadmin/solicitudes/count');
                if (res.ok) {
                    const data = await res.json();
                    setPendingCount(data.count || 0);
                }

                const resPagos = await fetch('/api/superadmin/pagos/count');
                if (resPagos.ok) {
                    const data = await resPagos.json();
                    setPendingPaymentsCount(data.count || 0);
                }
            } catch (error) {
                console.error('Error fetching count:', error);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    // Cerrar el menú si cambia de ruta
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    const mainNavItems = [
        { name: 'Dashboard', href: '/superadmin', icon: LayoutDashboard },
        { name: 'Negocios', href: '/superadmin/negocios', icon: Building2 },
        { name: 'WhatsApp', href: '/superadmin/whatsapp', icon: MessageCircle },
        { 
            name: 'Solicitudes', 
            href: '/superadmin/solicitudes', 
            icon: Bell,
            badge: pendingCount > 0 ? pendingCount : null 
        },
    ];

    const extraNavItems = [
        { name: 'Comunicaciones', href: '/superadmin/comunicaciones', icon: Megaphone },
        { name: 'Planes', href: '/superadmin/planes', icon: Package },
        { name: 'Suscripciones', href: '/superadmin/suscripciones', icon: CreditCard },
        { 
            name: 'Pagos', 
            href: '/superadmin/pagos', 
            icon: Banknote,
            badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : null 
        },
        { name: 'Métricas', href: '/superadmin/metricas', icon: BarChart3 },
        { name: 'Referidos', href: '/superadmin/referidos', icon: Gift },
        { name: 'Equipo', href: '/superadmin/equipo', icon: UserCog },
        { name: 'Administradores', href: '/superadmin/administradores', icon: ShieldCheck },
        { name: 'PWA Preview', href: '/superadmin/pwa', icon: Smartphone },
        { name: 'Configuración', href: '/superadmin/configuracion', icon: Settings },
    ];

    return (
        <>
            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 lg:hidden z-50 px-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                    {mainNavItems.map((item) => {
                        const isActive = pathname === item.href && !isMenuOpen;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all relative",
                                    isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-xl transition-all duration-300",
                                    isActive ? "bg-indigo-50" : "bg-transparent"
                                )}>
                                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                    
                                    {item.badge && (
                                        <span className="absolute top-1 right-3 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-bold tracking-tight">{item.name}</span>
                                
                                {isActive && (
                                    <div className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full" />
                                )}
                            </Link>
                        );
                    })}

                    {/* Botón de Menú Más */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all relative border-none bg-transparent outline-none",
                            isMenuOpen ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <div className={cn(
                            "p-1.5 rounded-xl transition-all duration-300",
                            isMenuOpen ? "bg-indigo-50" : "bg-transparent"
                        )}>
                            {isMenuOpen ? (
                                <X size={20} strokeWidth={2.5} className="rotate-0 transition-transform duration-300" />
                            ) : (
                                <Menu size={20} strokeWidth={2} />
                            )}
                            
                            {pendingPaymentsCount > 0 && !isMenuOpen && (
                                <span className="absolute top-1 right-3 flex h-2 w-2 items-center justify-center rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
                            )}
                        </div>
                        <span className="text-[10px] font-bold tracking-tight">Más</span>
                        
                        {isMenuOpen && (
                            <div className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full" />
                        )}
                    </button>
                </div>
            </nav>

            {/* Bottom Sheet Menu */}
            <div
                className={cn(
                    "fixed inset-0 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-all duration-300 z-40",
                    isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setIsMenuOpen(false)}
            >
                <div
                    className={cn(
                        "absolute bottom-16 left-0 right-0 bg-white rounded-t-3xl border-t border-slate-100 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] p-6 max-h-[80vh] overflow-y-auto transition-transform duration-300 ease-out pb-8",
                        isMenuOpen ? "translate-y-0" : "translate-y-full"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header del menú */}
                    <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">Opciones de Administración</h3>
                            <p className="text-xs text-slate-400">Control global y configuraciones</p>
                        </div>
                        <button
                            onClick={() => setIsMenuOpen(false)}
                            className="p-1 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 border-none"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Grid de opciones */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {extraNavItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-200 gap-1.5 relative",
                                        isActive
                                            ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-semibold"
                                            : "bg-slate-50/50 border-slate-100 hover:bg-slate-50 text-slate-600"
                                    )}
                                >
                                    <div className={cn(
                                        "p-2 rounded-xl",
                                        isActive ? "bg-white text-indigo-600 shadow-sm" : "bg-white text-slate-500 shadow-sm"
                                    )}>
                                        <item.icon size={18} />
                                    </div>
                                    <span className="text-[11px] font-medium leading-tight">{item.name}</span>
                                    
                                    {item.badge && (
                                        <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white ring-2 ring-white">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Botón de Cerrar Sesión */}
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all font-semibold text-xs border border-rose-100 active:scale-[0.98]"
                    >
                        <LogOut size={16} />
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </>
    );
}
