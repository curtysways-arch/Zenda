'use client';

import { useEffect, useState } from 'react';
import { getFcmToken, onMessageListener } from '@/lib/firebase';
import { useSession } from 'next-auth/react';

export default function PushNotificationManager() {
    const { data: session } = useSession();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [notification, setNotification] = useState<any>(null);
    const [permissionStatus, setPermissionStatus] = useState<string>('default');
    const [hideBanner, setHideBanner] = useState(false);

    // EFECTO 1: Listener de mensajes
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        setPermissionStatus(Notification.permission);
        
        onMessageListener((payload) => {
            setNotification(payload);
            
            // Emitir evento global en tiempo real para actualizar la UI al instante sin recargar la página
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('fcm-notification-received', { detail: payload }));
            }
            
            setTimeout(() => setNotification(null), 8000);
        }).catch(err => console.error('[PUSH] Error:', err));
    }, []);

    // EFECTO 2: Registro automático si ya tiene permiso
    useEffect(() => {
        if (!session || typeof window === 'undefined') return;
        if (Notification.permission === 'granted') {
            setupFCM();
        }
    }, [session]);

    const setupFCM = async () => {
        if (typeof window === 'undefined') return;

        // 1. Validar soporte de notificaciones
        if (!('Notification' in window)) {
            alert("Tu navegador o dispositivo no soporta notificaciones push nativas. Si usas iOS (iPhone), asegúrate de agregar la app a tu pantalla de inicio.");
            setHideBanner(true);
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);
            
            if (permission === 'denied') {
                alert("Has bloqueado los permisos de notificación. Por favor, permítelos desde la configuración de tu navegador para recibir alertas.");
                setHideBanner(true);
                return;
            }

            if (permission === 'granted') {
                const token = await getFcmToken();
                if (!token) {
                    alert("No se pudo generar el token de notificaciones de Firebase. Por favor, recarga e inténtalo de nuevo.");
                    setHideBanner(true);
                    return;
                }

                const res = await fetch('/api/notifications/register-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, device: navigator.userAgent }),
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    alert(`Error en el servidor al registrar: ${errData.error || 'Código ' + res.status}`);
                    setHideBanner(true);
                    return;
                }

                const data = await res.json();
                if (data.success) {
                    alert("¡Notificaciones activadas exitosamente en este dispositivo!");
                    setIsSubscribed(true);
                    setHideBanner(true);
                } else {
                    alert("No se pudo guardar la configuración de notificaciones.");
                    setHideBanner(true);
                }
            }
        } catch (error: any) {
            console.error('Error al configurar FCM:', error);
            alert(`Error de configuración de notificaciones: ${error.message || error}`);
            setHideBanner(true);
        }
    };

    if (permissionStatus === 'default' && session && !hideBanner) {
        return (
            <div className="fixed bottom-24 md:bottom-4 left-4 right-4 md:right-auto z-[110] p-4 bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 max-w-sm flex items-center space-x-4 animate-in slide-in-from-bottom-5">
                <div className="flex-1">
                    <h4 className="font-black text-white text-sm">Notificaciones</h4>
                    <p className="text-[10px] text-white/50 mt-0.5 leading-tight">Activa alertas para tus reservas</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={setupFCM}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                        Activar
                    </button>
                    <button 
                        onClick={() => setHideBanner(true)}
                        className="text-white/30 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            </div>
        );
    }

    if (!notification) return null;

    return (
        <div className="fixed bottom-24 md:bottom-4 right-4 left-4 md:left-auto z-[110] p-4 bg-white rounded-lg shadow-xl border-t-4 border-emerald-500 max-w-sm transform transition-all duration-300 animate-bounce flex items-start space-x-3">
            <div className="flex-shrink-0 pt-1">
                <img 
                    src={notification?.data?.icon || notification?.notification?.image || "/icons/icon-192x192.png"} 
                    alt="Logo" 
                    className="w-10 h-10 object-contain rounded-full border border-gray-100 dark:border-gray-800 bg-white" 
                />
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-gray-800">{notification?.notification?.title}</h4>
                <p className="text-sm text-gray-600 mt-0.5">{notification?.notification?.body}</p>
                <div className="mt-2 flex justify-end">
                    <button
                        onClick={() => setNotification(null)}
                        className="text-xs text-emerald-600 font-semibold hover:underline bg-emerald-50 px-3 py-1 rounded-md transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
