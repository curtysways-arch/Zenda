// Importar scripts de Firebase (versión actual)
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

// Obtener parámetros de la URL del Service Worker (query string si los hay)
const urlParams = new URLSearchParams(self.location.search);
let urlApiKey = urlParams.get('apiKey');
let urlAuthDomain = urlParams.get('authDomain');
let urlProjectId = urlParams.get('projectId');
let urlStorageBucket = urlParams.get('storageBucket');
let urlMessagingSenderId = urlParams.get('messagingSenderId');
let urlAppId = urlParams.get('appId');

function initFirebase(config) {
    try {
        firebase.initializeApp(config);
        const messaging = firebase.messaging();
        
        messaging.onBackgroundMessage((payload) => {
            console.log('[SW-AUDIT][PASO 1] onBackgroundMessage disparado. Payload:', JSON.stringify(payload));
            console.log('[SW-AUDIT][PASO 2] Omitiendo showNotification duplicado en onBackgroundMessage. Será manejado exclusivamente por el listener raw de push.');
        });
        console.log('[SW] Firebase Messaging inicializado correctamente.');
    } catch (e) {
        console.error('[SW] Error al inicializar Firebase en SW:', e);
    }
}

// Intentar inicialización asíncrona mediante fetch a la API de configuración dinámica
fetch('/api/config/firebase')
    .then(res => {
        if (!res.ok) throw new Error('API config no disponible');
        return res.json();
    })
    .then(config => {
        const getVal = (key, envVal) => {
            const dbVal = config[key];
            return dbVal || envVal;
        };
        const fConfig = {
            apiKey: getVal('NEXT_PUBLIC_FIREBASE_API_KEY', urlApiKey) || "AIzaSyCNZYSiXnzpuz7BMarfIQ-SwWE-Toj6TU8",
            authDomain: getVal('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', urlAuthDomain) || "spa-citas-c5c3d.firebaseapp.com",
            projectId: getVal('NEXT_PUBLIC_FIREBASE_PROJECT_ID', urlProjectId) || "spa-citas-c5c3d",
            storageBucket: getVal('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', urlStorageBucket) || "spa-citas-c5c3d.firebasestorage.app",
            messagingSenderId: getVal('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', urlMessagingSenderId) || "1071729504920",
            appId: getVal('NEXT_PUBLIC_FIREBASE_APP_ID', urlAppId) || "1:1071729504920:web:933b5060cc87428f8a96ed"
        };
        initFirebase(fConfig);
    })
    .catch(() => {
        // Fallback síncrono si el fetch falla (offline o fase inicial)
        initFirebase({
            apiKey: urlApiKey || "AIzaSyCNZYSiXnzpuz7BMarfIQ-SwWE-Toj6TU8",
            authDomain: urlAuthDomain || "spa-citas-c5c3d.firebaseapp.com",
            projectId: urlProjectId || "spa-citas-c5c3d",
            storageBucket: urlStorageBucket || "spa-citas-c5c3d.firebasestorage.app",
            messagingSenderId: urlMessagingSenderId || "1071729504920",
            appId: urlAppId || "1:1071729504920:web:933b5060cc87428f8a96ed"
        });
    });

// Listener raw de 'push' para garantizar entrega durante navegación entre páginas
// Este handler se dispara SIEMPRE, incluso si la página está en transición
self.addEventListener('push', (event) => {
    console.log('[SW-AUDIT][PASO A] Evento push raw interceptado.');
    if (!event.data) {
        console.warn('[SW-AUDIT][PASO A] Evento push no contiene data.');
        return;
    }
    
    let payload;
    try { 
        payload = event.data.json(); 
        console.log('[SW-AUDIT][PASO B] Payload push descodificado exitosamente:', JSON.stringify(payload));
    } catch (err) { 
        console.error('[SW-AUDIT][PASO B][ERROR] Error al descodificar JSON del push:', err);
        return; 
    }

    const title = payload.notification?.title || payload.data?.title || 'Nueva notificación';
    const body = payload.notification?.body || payload.data?.body || '';
    const icon = payload.data?.icon || payload.notification?.image || '/icons/icon-192x192.png';

    console.log('[SW-AUDIT][PASO C] Llamando a showNotification desde evento push:', title);
    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon,
            badge: '/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            data: payload.data || {}
        })
        .then(() => console.log('[SW-AUDIT][PASO D] showNotification completado (evento push)'))
        .catch(err => console.error('[SW-AUDIT][ERROR] error en showNotification (evento push):', err))
    );
});

// Forzar la activación inmediata de este Service Worker al instalarse
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Manejar click en notificación nativa
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const link = event.notification.data?.link || '/admin/citas';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            if (clients.length > 0) {
                clients[0].focus();
                clients[0].navigate(link);
            } else {
                self.clients.openWindow(link);
            }
        })
    );
});
