'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { Bell } from 'lucide-react';
import Link from 'next/link';

interface NotificationBellProps {
    slug: string;
    initialUnreadCount: number;
}

export default function NotificationBell({ slug, initialUnreadCount }: NotificationBellProps) {
    const { unreadCount, loading } = useNotifications(slug);

    // Si está cargando el cliente, mostramos el conteo del servidor, si no, mostramos el valor real del cliente
    const activeUnreadCount = loading ? initialUnreadCount : unreadCount;

    return (
        <Link 
            href={`/${slug}/notificaciones`} 
            title="Notificaciones y Actividad"
            aria-label="Ver notificaciones"
            className="w-10 h-10 rounded-full flex items-center justify-center relative active:scale-95 hover:scale-105 transition-all shadow-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0"
        >
            <Bell size={18} style={{ color: 'var(--primary, #ec4899)' }} />
            {activeUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-in zoom-in duration-200 shadow-xs"
                    style={{ backgroundColor: 'var(--primary, #ec4899)' }}>
                    {activeUnreadCount > 99 ? '99+' : activeUnreadCount}
                </span>
            )}
        </Link>
    );
}
