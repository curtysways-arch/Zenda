import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// Configuración hardcodeada como fallback inmediato (sin fetch async)
// Los valores reales vienen del NEXT_PUBLIC_* o se sobreescriben con config dinámica
const FALLBACK_CONFIG = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Función para obtener config dinámica (solo si faltan vars de entorno)
async function getDynamicConfig() {
    try {
        const res = await fetch('/api/config/firebase');
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// Inicializar Firebase de forma síncrona con fallback inmediato
function initFirebaseSync() {
    if (getApps().length > 0) return getApp();
    // Si tenemos todas las vars de entorno, inicializar sincronamente
    if (FALLBACK_CONFIG.apiKey && FALLBACK_CONFIG.projectId) {
        return initializeApp(FALLBACK_CONFIG as any);
    }
    return null;
}

// Intentar inicialización síncrona para tener el app listo inmediatamente
let appSync = initFirebaseSync();

// Promise de inicialización completa (con config dinámica si hace falta)
let initPromise: Promise<any> | null = null;

const getFirebaseApp = async () => {
    if (getApps().length > 0) return getApp();
    if (initPromise) return initPromise;

    initPromise = (async () => {
        const dynamicConfig = await getDynamicConfig();
        if (getApps().length > 0) return getApp();

        const isExample = (val: string | null | undefined) => {
            if (!val) return true;
            const v = val.toLowerCase();
            return v.includes('tu-proyecto') || v.includes('example') || v === 'dummy' || v.includes('placeholder') || v.includes('123456789');
        };

        const getVal = (key: string, envVal: string | undefined) => {
            const dbVal = dynamicConfig?.[key];
            if (dbVal && !isExample(dbVal)) return dbVal;
            if (envVal && !isExample(envVal)) return envVal;
            return dbVal || envVal;
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

        return initializeApp(config);
    })();
    return initPromise;
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
    try {
        const messaging = await getMessagingInstance();
        if (!messaging) return null;

        const dynamicConfig = await getDynamicConfig();

        const isExample = (val: string | null | undefined) => {
            if (!val) return true;
            const v = val.toLowerCase();
            return v.includes('tu-proyecto') || v.includes('example') || v === 'dummy' || v.includes('placeholder') || v.includes('123456789');
        };

        const getVal = (key: string, envVal: string | undefined) => {
            const dbVal = dynamicConfig?.[key];
            if (dbVal && !isExample(dbVal)) return dbVal;
            if (envVal && !isExample(envVal)) return envVal;
            return dbVal || envVal;
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

        const rawVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || dynamicConfig?.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        const vapidKey = (rawVapidKey && !rawVapidKey.includes('placeholder') && rawVapidKey !== 'BK') ? rawVapidKey : undefined;

        // Registrar el Service Worker manualmente pasando las credenciales en el query string
        let serviceWorkerRegistration;
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(apiKey || '')}&messagingSenderId=${encodeURIComponent(messagingSenderId || '')}&projectId=${encodeURIComponent(projectId || '')}&appId=${encodeURIComponent(appId || '')}&authDomain=${encodeURIComponent(authDomain || '')}&storageBucket=${encodeURIComponent(storageBucket || '')}`;
            serviceWorkerRegistration = await navigator.serviceWorker.register(swUrl, {
                scope: '/'
            });
            console.log("[FCM Client] Service Worker registrado dinámicamente:", swUrl);
        }

        const currentToken = await getToken(messaging, { 
            vapidKey,
            serviceWorkerRegistration
        });
        return currentToken;
    } catch (error) {
        console.error("Error al obtener el token FCM:", error);
        return null;
    }
};

export const onMessageListener = async (onReceive: (payload: any) => void) => {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;
    return onMessage(messaging, (payload) => {
        onReceive(payload);
    });
};
