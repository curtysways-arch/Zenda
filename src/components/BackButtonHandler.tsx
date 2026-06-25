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

        // Evitamos empujar estados virtuales duplicados en la pila del historial
        const state = window.history.state;
        if (!state || !state.isVirtual) {
            window.history.pushState({ isVirtual: true }, '', window.location.href);
        }

        const handlePopState = (event: PopStateEvent) => {
            // Si el estado al que se retrocedió no es virtual, significa que el usuario presionó atrás
            if (!event.state || !event.state.isVirtual) {
                const now = Date.now();
                const diff = now - lastPressRef.current;

                if (diff < 2000) {
                    // Si presionó por segunda vez dentro de los 2 segundos, sale de la app
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    setShowToast(false);
                    window.removeEventListener('popstate', handlePopState);
                    window.history.back();
                } else {
                    // Si es la primera pulsación, actualizamos el tiempo, mostramos el Toast y cancelamos la salida
                    lastPressRef.current = now;
                    setShowToast(true);

                    // Ocultar el toast automáticamente después de 2 segundos
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    timeoutRef.current = setTimeout(() => {
                        setShowToast(false);
                    }, 2000);

                    // Volvemos a asegurar la protección empujando el estado virtual nuevamente
                    window.history.pushState({ isVirtual: true }, '', window.location.href);
                }
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
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
