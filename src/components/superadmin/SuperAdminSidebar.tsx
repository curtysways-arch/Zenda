'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    CreditCard,
    Package,
    Users,
    LogOut,
    ChevronRight,
    BarChart3,
    ShieldCheck,
    Settings,
    MessageCircle,
    Bell,
    Smartphone,
    Banknote,
    Gift,
    UserCog,
    Megaphone,
    Trophy,
    Store,
    Award,
    Calendar,
    Briefcase,
    Tag
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { signOut } from 'next-auth/react';

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

export default function SuperAdminSidebar() {
    const pathname = usePathname();
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0);

    // Efecto para buscar el número de solicitudes pendientes y pagos por verificar
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch de solicitudes pendientes
                const resSolicitudes = await fetch('/api/superadmin/solicitudes/count');
                if (resSolicitudes.ok) {
                    const data = await resSolicitudes.json();
                    setPendingCount(data.count || 0);
                }

                // Fetch de pagos pendientes
                const resPagos = await fetch('/api/superadmin/pagos/count');
                if (resPagos.ok) {
                    const data = await resPagos.json();
                    setPendingPaymentsCount(data.count || 0);
                }
            } catch (error) {
                console.error('Error fetching dashboard counts:', error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // Actualizar cada minuto
        return () => clearInterval(interval);
    }, []);

    const menuItems = [
        { name: 'Dashboard', href: '/superadmin', icon: LayoutDashboard },
        { name: 'Negocios', href: '/superadmin/negocios', icon: Building2 },
        { name: 'WhatsApp', href: '/superadmin/whatsapp', icon: MessageCircle },
        { name: 'Comunicaciones', href: '/superadmin/comunicaciones', icon: Megaphone },
        { name: 'Planes', href: '/superadmin/planes', icon: Package },
        { name: 'Suscripciones', href: '/superadmin/suscripciones', icon: CreditCard },
        { 
            name: 'Pagos', 
            href: '/superadmin/pagos', 
            icon: Banknote,
            badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : null 
        },
        { 
            name: 'Solicitudes', 
            href: '/superadmin/solicitudes', 
            icon: Bell,
            badge: pendingCount > 0 ? pendingCount : null 
        },
        { name: 'Métricas', href: '/superadmin/metricas', icon: BarChart3 },
        { name: 'Referidos', href: '/superadmin/referidos', icon: Gift },
        { name: 'Misiones', href: '/superadmin/misiones-globales', icon: Trophy },
        { name: 'Niveles Citiox', href: '/superadmin/niveles', icon: Award },
        { name: 'Temporadas Citiox', href: '/superadmin/temporadas', icon: Calendar },
        { name: 'Cupones Citiox', href: '/superadmin/coupon-templates', icon: Tag },
        { name: 'Marketplace', href: '/superadmin/plantillas', icon: Store },
        { name: 'Equipo', href: '/superadmin/equipo', icon: UserCog },
        { name: 'Administradores', href: '/superadmin/administradores', icon: ShieldCheck },
        { name: 'PWA Preview', href: '/superadmin/pwa', icon: Smartphone },
        { name: 'Configuración', href: '/superadmin/configuracion', icon: Settings },
    ];

    return (
        <aside className="hidden lg:flex w-72 bg-slate-900 text-slate-300 border-r border-slate-800 flex-col h-screen sticky top-0 overflow-hidden">
            <div className="p-8 border-b border-slate-800/50 backdrop-blur-xl bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-[0_10px_30px_-5px_rgba(16,185,129,0.3)] border border-emerald-400/20">
                        S
                    </div>
                    <div>
                        <h2 className="font-black text-white leading-none tracking-tight uppercase italic">Super Panel</h2>
                        <span className="text-[9px] text-emerald-400 font-black tracking-[0.2em] uppercase mt-1 block">Global Control</span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-6 space-y-2 overflow-y-auto mt-4 custom-scrollbar">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-300 group relative",
                                isActive
                                    ? "bg-emerald-600/10 text-emerald-400 shadow-[0_4px_20px_-5px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={cn(isActive ? "text-emerald-500" : "text-slate-600 group-hover:text-slate-400 transition-colors")} />
                                <span className={cn("text-xs font-black uppercase tracking-widest", isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100")}>{item.name}</span>
                            </div>
                            
                            {item.badge !== undefined && item.badge !== null && (
                                <span className="absolute left-7 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-slate-900 animate-pulse-subtle shadow-lg">
                                    {item.badge}
                                </span>
                            )}

                            {isActive && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-6 border-t border-slate-800/50 bg-slate-900/30">
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-4 w-full px-5 py-4 text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all duration-300 font-black uppercase tracking-widest text-[10px] border border-transparent hover:border-rose-500/20 group active:scale-95"
                >
                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
}
