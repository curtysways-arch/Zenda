'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, ExternalLink } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { filterNavFor, isNavActive, fetchSuperadminCounts, type SuperadminBadgeKey } from './superadminNav';
import { useSession } from 'next-auth/react';

export default function SuperAdminSidebar() {
    const pathname = usePathname();
    const [counts, setCounts] = useState<Record<SuperadminBadgeKey, number>>({ solicitudes: 0, pagos: 0 });
    const { data: session } = useSession();

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

    return (
        <aside className="hidden lg:flex w-64 shrink-0 bg-slate-950 text-slate-300 border-r border-white/5 flex-col h-screen sticky top-0">
            <div className="px-4 h-14 flex items-center gap-2.5 border-b border-white/5">
                <img src="/citiox-icon.png" alt="" className="size-8 rounded-lg object-contain bg-white/5" />
                <div className="min-w-0">
                    <p className="text-[15px] font-bold text-white leading-tight">Citiox</p>
                    <p className="text-xs text-slate-400">Panel de superadmin</p>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar" aria-label="Menú del superadmin">
                {filterNavFor(session?.user).map((group) => (
                    <div key={group.title}>
                        <p className="px-3 mb-1.5 text-xs font-semibold text-slate-500">{group.title}</p>
                        <ul className="space-y-0.5">
                            {group.items.map((item) => {
                                const active = isNavActive(pathname, item.href);
                                const badge = item.badge ? counts[item.badge] : 0;
                                const Icon = item.icon;
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            aria-current={active ? 'page' : undefined}
                                            className={cn(
                                                'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                                                active
                                                    ? 'bg-[#0066FF] text-white font-semibold'
                                                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                            )}
                                        >
                                            <Icon size={16} className={active ? 'text-white' : 'text-slate-500'} />
                                            <span className="flex-1 truncate">{item.name}</span>
                                            {badge > 0 && (
                                                <span className={cn(
                                                    'min-w-5 h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center',
                                                    active ? 'bg-white text-[#0066FF]' : 'bg-rose-500 text-white'
                                                )}>
                                                    {badge}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            <div className="p-2.5 border-t border-white/5 space-y-0.5">
                <Link
                    href="/"
                    target="_blank"
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                    <ExternalLink size={16} className="text-slate-500" />
                    Ver sitio público
                </Link>
                <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-rose-300 hover:bg-rose-500/10 transition-colors"
                >
                    <LogOut size={16} />
                    Cerrar sesión
                </button>
            </div>
        </aside>
    );
}
