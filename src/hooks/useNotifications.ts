import { useState, useEffect, useCallback } from 'react';

export interface UseNotificationsResult {
    unreadCount: number;
    pointsBalance: number | null;
    loading: boolean;
    refresh: () => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

export function useNotifications(slug: string): UseNotificationsResult {
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [pointsBalance, setPointsBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch(`/api/public/${slug}/notifications?limit=1`);
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.unreadCount || 0);
                setIsAuthenticated(!!data.isAuthenticated);

                // Solo sincronizar puntos de fidelidad si el cliente está autenticado
                if (data.isAuthenticated) {
                    const meRes = await fetch(`/api/${slug}/referrals/me`);
                    if (meRes.ok) {
                        const meData = await meRes.json();
                        setPointsBalance(meData.puntos !== undefined ? meData.puntos : null);
                    }
                }
            } else {
                setIsAuthenticated(false);
            }
        } catch (err) {
            // Manejo silencioso de red
        } finally {
            setLoading(false);
        }
    }, [slug]);

    const markAllAsRead = async () => {
        setUnreadCount(0);
        try {
            await fetch(`/api/public/${slug}/notifications`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAll: true })
            });
        } catch (err) {
            console.error("Error marking all as read:", err);
        }
    };

    useEffect(() => {
        // Carga inicial
        refresh();
    }, [refresh]);

    useEffect(() => {
        // Solo suscribirse a SSE si se ha verificado que está autenticado
        if (isAuthenticated !== true) return;

        // Suscribirse a SSE en tiempo real
        let eventSource: EventSource | null = null;
        let reconnectTimeout: any = null;
        let reconnectDelay = 5000; // Iniciar reintento en 5 segundos

        const connectSSE = () => {
            if (typeof window === 'undefined') return;

            eventSource = new EventSource(`/api/public/${slug}/notifications/sse`);

            eventSource.onopen = () => {
                reconnectDelay = 5000; // Resetear retraso cuando se conecte exitosamente
            };

            eventSource.onmessage = (event) => {
                // Heartbeat u otros eventos genéricos
            };

            // Escuchar notificaciones en tiempo real
            eventSource.addEventListener('NOTIFICATION', (event: any) => {
                try {
                    const data = JSON.parse(event.data);
                    // Incrementar el conteo de no leídas
                    setUnreadCount(prev => prev + 1);

                    // Disparar evento personalizado de JavaScript para notificar de forma reactiva a componentes
                    window.dispatchEvent(new CustomEvent('new_notification', { detail: data }));
                } catch (e) {
                    console.error("Error parsing real-time notification:", e);
                }
            });

            // Escuchar actualizaciones de puntos en tiempo real
            eventSource.addEventListener('PUNTOS_UPDATE', (event: any) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.puntos !== undefined) {
                        setPointsBalance(data.puntos);
                        
                        // Disparar evento de actualización de puntos
                        window.dispatchEvent(new CustomEvent('points_updated', { detail: data }));
                    }
                } catch (e) {
                    console.error("Error parsing real-time points:", e);
                }
            });

            eventSource.onerror = () => {
                if (eventSource) {
                    eventSource.close();
                }
                
                // Si la sesión ya no está autenticada, no reintentar
                if (!isAuthenticated) return;

                reconnectTimeout = setTimeout(connectSSE, reconnectDelay);
                reconnectDelay = Math.min(reconnectDelay * 2, 60000);
            };
        };

        connectSSE();

        return () => {
            if (eventSource) {
                eventSource.close();
            }
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
        };
    }, [slug, isAuthenticated]);

    // Sincronizar el badge del icono de la aplicación en la pantalla de inicio del teléfono
    useEffect(() => {
        if (typeof window !== 'undefined' && 'setAppBadge' in navigator) {
            try {
                if (unreadCount > 0) {
                    navigator.setAppBadge(unreadCount).catch(() => {});
                } else {
                    navigator.clearAppBadge().catch(() => {});
                }
            } catch {}
        }
    }, [unreadCount]);

    return {
        unreadCount,
        pointsBalance,
        loading,
        refresh,
        markAllAsRead
    };
}
