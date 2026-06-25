'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function BackButtonHandler() {
    const pathname = usePathname();
    const [showToast, setShowToast] = useState(false);
    const lastPressRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Solo interceptamos en las páginas raíz principales donde un atrás físico cerraría la app
        const isRootPath = /^\/[^\/]+$/.test(pathname) || pathname === '/' || pathname === '/admin' || pathname === '/superadmin';

        if (!isRootPath) return;

        const ensureVirtualState = () => {
            try {
                const currentState = window.history.state || {};
                if (!currentState.isVirtual) {
                    // Preservar el estado de Next.js original y añadir nuestra bandera
                    window.history.pushState({ ...currentState, isVirtual: true }, '', window.location.href);
                }
            } catch (e) {
                console.error("[Back Button] Error ensuring virtual state:", e);
            }
        };

        // 1. Ejecución diferida inicial (800ms) para dar tiempo a que Next.js hidrate e inicialice su router
        const initTimer = setTimeout(() => {
            ensureVirtualState();
        }, 800);

        // 2. Asegurar estado virtual con el primer toque o click en la pantalla
        const handleFirstInteraction = () => {
            ensureVirtualState();
            cleanupInteractionListeners();
        };

        const cleanupInteractionListeners = () => {
            window.removeEventListener('touchstart', handleFirstInteraction);
            window.removeEventListener('click', handleFirstInteraction);
        };

        window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
        window.addEventListener('click', handleFirstInteraction, { passive: true });

        // 3. Manejador de retroceso
        const handlePopState = (event: PopStateEvent) => {
            // Si el estado al que se retrocedió no es virtual, significa que el usuario presionó atrás
            if (!event.state || !event.state.isVirtual) {
                const now = Date.now();
                const diff = now - lastPressRef.current;

                if (diff < 2000) {
                    // Si presionó por segunda vez en menos de 2s, sale de la app
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    setShowToast(false);
                    window.removeEventListener('popstate', handlePopState);
                    window.history.back();
                } else {
                    // Primera pulsación: muestra el Toast y actualiza el timestamp
                    lastPressRef.current = now;
                    setShowToast(true);

                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    timeoutRef.current = setTimeout(() => {
                        setShowToast(false);
                    }, 2000);

                    // Re-empujamos el estado virtual para seguir protegiendo la app
                    ensureVirtualState();
                }
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            clearTimeout(initTimer);
            cleanupInteractionListeners();
            window.removeEventListener('popstate', handlePopState);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [pathname]);

    if (!showToast) return null;

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes backtoast-in {
                    from {
                        opacity: 0;
                        transform: translate(-50%, 15px);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, 0);
                    }
                }
                .backbutton-toast {
                    animation: backtoast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                `
            }} />
            <div 
                className="fixed bottom-28 left-1/2 z-[9999] px-5 py-2.5 bg-slate-950/90 text-white text-[11px] font-semibold rounded-full shadow-2xl border border-white/10 backdrop-blur-md flex items-center space-x-2.5 backbutton-toast"
                style={{ transform: 'translateX(-50%)' }}
            >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span>Pulse nuevamente para cerrar la aplicación</span>
            </div>
        </>
    );
}
