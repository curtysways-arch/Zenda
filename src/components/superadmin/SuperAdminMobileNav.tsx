'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Building2, Bell, Banknote, Menu, X, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { filterNavFor, isNavActive, fetchSuperadminCounts, type SuperadminBadgeKey } from './superadminNav';
import { useSession } from 'next-auth/react';

const BOTTOM_ITEMS: { name: string; href: string; icon: typeof Bell; badge?: SuperadminBadgeKey }[] = [
    { name: 'Inicio', href: '/superadmin', icon: LayoutDashboard },
    { name: 'Negocios', href: '/superadmin/negocios', icon: Building2 },
    { name: 'Solicitudes', href: '/superadmin/solicitudes', icon: Bell, badge: 'solicitudes' },
    { name: 'Pagos', href: '/superadmin/pagos', icon: Banknote, badge: 'pagos' },
];

export default function SuperAdminMobileNav() {
    const pathname = usePathname();
    const [counts, setCounts] = useState<Record<SuperadminBadgeKey, number>>({ solicitudes: 0, pagos: 0 });
    const { data: session } = useSession();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        let alive = true;
        const load = async () => {
            const c = await fetchSuperadminCounts();
            if (alive) setCounts(c);
        };
        load();
        const interval = setInterval(load, 60000);
        return () => {
            alive = false;
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 lg:hidden z-50 pb-safe" aria-label="Navegación principal">
                <div className="flex justify-around items-stretch h-16 max-w-lg mx-auto">
                    {BOTTOM_ITEMS.map((item) => {
                        const active = isNavActive(pathname, item.href) && !isMenuOpen;
                        const badge = item.badge ? counts[item.badge] : 0;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn('flex-1 flex flex-col items-center justify-center gap-0.5 relative', active ? 'text-[#0066FF]' : 'text-slate-500')}
                            >
                                <span className="relative">
                                    <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                                    {badge > 0 && (
                                        <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                                            {badge}
                                        </span>
                                    )}
                                </span>
                                <span className="text-xs font-semibold">{item.name}</span>
                            </Link>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen((v) => !v)}
                        aria-expanded={isMenuOpen}
                        className={cn('flex-1 flex flex-col items-center justify-center gap-0.5', isMenuOpen ? 'text-[#0066FF]' : 'text-slate-500')}
                    >
                        {isMenuOpen ? <X size={21} strokeWidth={2.4} /> : <Menu size={21} />}
                        <span className="text-xs font-semibold">Menú</span>
                    </button>
                </div>
            </nav>

            <div
                className={cn(
                    'fixed inset-0 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity duration-300 z-40',
                    isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
                onClick={() => setIsMenuOpen(false)}
            >
                <div
                    className={cn(
                        'absolute bottom-16 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5 max-h-[78vh] overflow-y-auto transition-transform duration-300 ease-out',
                        isMenuOpen ? 'translate-y-0' : 'translate-y-full'
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4" />
                    <div className="space-y-5">
                        {filterNavFor(session?.user).map((group) => (
                            <div key={group.title}>
                                <p className="text-xs font-semibold text-slate-500 mb-2 px-1">{group.title}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {group.items.map((item) => {
                                        const active = isNavActive(pathname, item.href);
                                        const badge = item.badge ? counts[item.badge] : 0;
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-colors',
                                                    active ? 'bg-blue-50 border-blue-200 text-[#0066FF] font-semibold' : 'bg-white border-slate-200 text-slate-700'
                                                )}
                                            >
                                                <Icon size={17} className={active ? 'text-[#0066FF]' : 'text-slate-400'} />
                                                <span className="flex-1 truncate">{item.name}</span>
                                                {badge > 0 && (
                                                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">{badge}</span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-sm"
                    >
                        <LogOut size={16} />
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </>
    );
}
