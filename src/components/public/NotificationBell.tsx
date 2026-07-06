'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { Bell } from 'lucide-react';
import Link from 'next/link';

interface NotificationBellProps {
    slug: string;
    initialUnreadCount: number;
}

export default function NotificationBell({ slug, initialUnreadCount }: NotificationBellProps) {
    const { unreadCount } = useNotifications(slug);

    // Si SSE aún no cargó, usamos el inicial calculado en el servidor
    const activeUnreadCount = unreadCount !== 0 ? unreadCount : initialUnreadCount;

    return (
        <Link 
            href={`/${slug}/notificaciones`} 
            className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-700 shadow-sm relative active:scale-95 transition-all"
        >
            <Bell size={18} />
            {activeUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-pink-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white animate-in zoom-in duration-200">
                    {activeUnreadCount}
                </span>
            )}
        </Link>
    );
}
