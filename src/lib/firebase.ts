import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// Función de validación de ejemplos o placeholders global
const isExample = (val: string | null | undefined) => {
    if (!val) return true;
    const v = val.toLowerCase().replace(/['"]/g, '').trim();
    return v.includes('tu-proyecto') || v.includes('example') || v === 'dummy' || v.includes('placeholder') || v.includes('123456789') || v.includes('..') || v.length < 5;
};

// Configuración hardcodeada como fallback inmediato (sin fetch async)
// Los valores reales vienen del NEXT_PUBLIC_* o se sobreescriben con config dinámica
const FALLBACK_CONFIG = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
};

// Función para obtener config dinámica (con evasión de caché estricta)
async function getDynamicConfig() {
    try {
        const res = await fetch(`/api/config/firebase?t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// Inicializar Firebase de forma síncrona con fallback inmediato
function initFirebaseSync() {
    if (getApps().length > 0) return getApp();
    // Si tenemos todas las vars de entorno y no son placeholders/ejemplos, inicializar sincronamente
    const hasValidConfig = FALLBACK_CONFIG.apiKey && 
                           FALLBACK_CONFIG.projectId && 
                           !isExample(FALLBACK_CONFIG.apiKey) && 
                           !isExample(FALLBACK_CONFIG.projectId);

    if (hasValidConfig) {
        try {
            return initializeApp(FALLBACK_CONFIG as any);
        } catch (e) {
            console.error("[FCM Client] Error inicialización síncrona:", e);
            return null;
        }
    }
    return null;
}

// Intentar inicialización síncrona para tener el app listo inmediatamente
let appSync = initFirebaseSync();

// Promise de inicialización completa (con config dinámica si hace falta)
let initPromise: Promise<any> | null = null;

const getFirebaseApp = async () => {
    const dynamicConfig = await getDynamicConfig();

    const getVal = (key: string, envVal: string | undefined) => {
        const dbVal = dynamicConfig?.[key];
        if (dbVal && !isExample(dbVal)) return dbVal.replace(/['"]/g, '').trim();
        if (envVal && !isExample(envVal)) return envVal.replace(/['"]/g, '').trim();
        const fallback = dbVal || envVal;
        return fallback ? fallback.replace(/['"]/g, '').trim() : fallback;
    };

    const config = {
        apiKey: getVal('NEXT_PUBLIC_FIREBASE_API_KEY', FALLBACK_CONFIG.apiKey),
        authDomain: getVal('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', FALLBACK_CONFIG.authDomain),
        projectId: getVal('NEXT_PUBLIC_FIREBASE_PROJECT_ID', FALLBACK_CONFIG.projectId),
        storageBucket: getVal('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', FALLBACK_CONFIG.storageBucket),
        messagingSenderId: getVal('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', FALLBACK_CONFIG.messagingSenderId),
        appId: getVal('NEXT_PUBLIC_FIREBASE_APP_ID', FALLBACK_CONFIG.appId),
    };

    // Si falta projectId, extraerlo de authDomain
    if (!config.projectId && config.authDomain && config.authDomain.includes('.firebaseapp.com')) {
        config.projectId = config.authDomain.replace('.firebaseapp.com', '');
    }

    if (getApps().length > 0) {
        const existingApp = getApp();
        const existingOptions = existingApp.options;
        const currentApiKey = config.apiKey;
        const currentProjectId = config.projectId;

        // Si la app existente tiene credenciales obsoletas o es una app "de ejemplo/fallback"
        // que no coincide con las credenciales dinámicas reales, la reinicializamos.
        if (existingOptions.apiKey !== currentApiKey || existingOptions.projectId !== currentProjectId) {
            console.log("[FCM Client] Credenciales de Firebase cambiaron o eran inválidas. Reinicializando app...");
            try {
                await deleteApp(existingApp);
                messagingInstance = null; // invalidar instancia de messaging
            } catch (e) {
                console.error("[FCM Client] Error eliminando app anterior:", e);
            }
        } else {
            return existingApp;
        }
    }

    return initializeApp(config);
};

// Instancia de messaging cacheada para reuso
let messagingInstance: any = null;

async function getMessagingInstance() {
    const supported = await isSupported();
    if (!supported) return null;
    if (messagingInstance) return messagingInstance;
    const appInstance = await getFirebaseApp();
    messagingInstance = getMessaging(appInstance);
    return messagingInstance;
}

// Iniciar la obtención del messaging en cuanto se carga el módulo (sin esperar)
// Esto registra el listener lo antes posible
if (typeof window !== 'undefined') {
    getMessagingInstance().catch(() => {});
}

export const getFcmToken = async () => {
    const messaging = await getMessagingInstance();
    if (!messaging) throw new Error("Firebase Messaging no está soportado o no se pudo inicializar.");

    const dynamicConfig = await getDynamicConfig();

    const getVal = (key: string, envVal: string | undefined) => {
        const dbVal = dynamicConfig?.[key];
        if (dbVal && !isExample(dbVal)) return dbVal.replace(/['"]/g, '').trim();
        if (envVal && !isExample(envVal)) return envVal.replace(/['"]/g, '').trim();
        const fallback = dbVal || envVal;
        return fallback ? fallback.replace(/['"]/g, '').trim() : fallback;
    };

    const apiKey = getVal('NEXT_PUBLIC_FIREBASE_API_KEY', FALLBACK_CONFIG.apiKey);
    const authDomain = getVal('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', FALLBACK_CONFIG.authDomain);
    let projectId = getVal('NEXT_PUBLIC_FIREBASE_PROJECT_ID', FALLBACK_CONFIG.projectId);
    const storageBucket = getVal('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', FALLBACK_CONFIG.storageBucket);
    const messagingSenderId = getVal('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', FALLBACK_CONFIG.messagingSenderId);
    const appId = getVal('NEXT_PUBLIC_FIREBASE_APP_ID', FALLBACK_CONFIG.appId);

    if (!projectId && authDomain && authDomain.includes('.firebaseapp.com')) {
        projectId = authDomain.replace('.firebaseapp.com', '');
    }

    const isVapidExample = (val: string | null | undefined) => {
        if (!val) return true;
        const clean = val.replace(/['"]/g, '').trim();
        return clean.length < 50 || clean.includes('..') || clean.includes('placeholder') || clean.includes('tu-proyecto');
    };

    const rawVapidKey = getVal('NEXT_PUBLIC_FIREBASE_VAPID_KEY', FALLBACK_CONFIG.vapidKey);
    const vapidKey = (rawVapidKey && !isVapidExample(rawVapidKey)) 
        ? rawVapidKey.replace(/['"]/g, '').trim() 
        : undefined;

    // Registrar el Service Worker unificado de la PWA (/sw.js) que importa dinámicamente a firebase-messaging-sw.js
    let serviceWorkerRegistration;
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
            // 1. Limpieza activa: buscar y desregistrar Service Workers obsoletos o en conflicto
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                const scriptUrl = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || '';
                if (scriptUrl.includes('firebase-messaging-sw.js')) {
                    console.log(`[FCM Client] Desregistrando Service Worker obsoleto conflictivo: ${scriptUrl}`);
                    await registration.unregister();
                }
            }

            // 2. Registrar el Service Worker unificado
            await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            console.log("[FCM Client] Service Worker unificado (/sw.js) registrado.");

            // Esperar a que el service worker esté completamente activo y listo
            serviceWorkerRegistration = await navigator.serviceWorker.ready;
            console.log("[FCM Client] Service Worker listo y activo para FCM.");

            // 3. Forzar regeneración del token FCM si es la primera vez con la arquitectura unificada (v3)
            const CURRENT_SW_VERSION = 'v3';
            const localVersion = localStorage.getItem('fcm_sw_version');
            if (localVersion !== CURRENT_SW_VERSION) {
                console.log(`[FCM Client] Nueva versión de arquitectura SW (${CURRENT_SW_VERSION}). Purgando token antiguo...`);
                try {
                    // Importar deleteToken dinámicamente o llamarlo directamente
                    const { deleteToken } = await import('firebase/messaging');
                    await deleteToken(messaging);
                    console.log("[FCM Client] Token FCM anterior eliminado con éxito.");
                } catch (delError) {
                    console.warn("[FCM Client] No se pudo borrar el token FCM antiguo (puede que no existiera aún):", delError);
                }
                localStorage.setItem('fcm_sw_version', CURRENT_SW_VERSION);
            }
        } catch (swError) {
            console.error("[FCM Client] Error al gestionar registros de Service Worker:", swError);
        }
    }

    const currentToken = await getToken(messaging, { 
        vapidKey,
        serviceWorkerRegistration
    });
    return currentToken;
};

export const onMessageListener = async (onReceive: (payload: any) => void) => {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;
    return onMessage(messaging, (payload) => {
        onReceive(payload);
    });
};
