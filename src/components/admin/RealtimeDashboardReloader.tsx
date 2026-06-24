'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RealtimeDashboardReloader() {
    const router = useRouter();

    useEffect(() => {
        // 1. Escuchar notificaciones FCM en tiempo real
        const handleFcmNotify = () => {
            console.log('[REALTIME] Notificación en vivo en el Dashboard. Refrescando datos...');
            router.refresh();
        };
        window.addEventListener('fcm-notification-received', handleFcmNotify);

        // 2. Polling de respaldo inteligente (cada 30 segundos si la pestaña es visible)
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                console.log('[REALTIME] Polling en el Dashboard. Refrescando datos...');
                router.refresh();
            }
        }, 30000);

        return () => {
            window.removeEventListener('fcm-notification-received', handleFcmNotify);
            clearInterval(interval);
        };
    }, [router]);

    return null;
}
