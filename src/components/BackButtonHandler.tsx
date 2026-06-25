'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function BackButtonHandler() {
    const pathname = usePathname();
    const isConfirmingRef = useRef(false);

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
                if (isConfirmingRef.current) return;

                isConfirmingRef.current = true;
                const shouldExit = window.confirm("¿Deseas salir de la aplicación?");
                isConfirmingRef.current = false;

                if (shouldExit) {
                    // Permitir la salida real removiendo el interceptor e yendo hacia atrás
                    window.removeEventListener('popstate', handlePopState);
                    window.history.back();
                } else {
                    // Si cancela, volvemos a asegurar la protección empujando el estado virtual nuevamente
                    window.history.pushState({ isVirtual: true }, '', window.location.href);
                }
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [pathname]);

    return null;
}
