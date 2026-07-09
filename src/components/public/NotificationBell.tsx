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
            className="w-10 h-10 rounded-full flex items-center justify-center relative active:scale-95 transition-all"
            style={{ backgroundColor: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
        >
            <Bell size={18} style={{ color: 'var(--text-primary, #0f172a)' }} />
            {activeUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white animate-in zoom-in duration-200"
                    style={{ backgroundColor: 'var(--primary, #ec4899)' }}>
                    {activeUnreadCount}
                </span>
            )}
        </Link>
    );
}
