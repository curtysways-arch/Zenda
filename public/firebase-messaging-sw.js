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
        
        // El SDK de Firebase muestra las notificaciones del bloque 'notification' automáticamente.
        // onBackgroundMessage se encarga de manejar mensajes cuando el app está cerrada (segundo plano).
        messaging.onBackgroundMessage((payload) => {
            console.log('[SW-AUDIT][PASO 1] onBackgroundMessage disparado. Payload:', JSON.stringify(payload));
            const notificationTitle = payload.notification?.title || payload.data?.title || 'Nueva notificación';
            const notificationOptions = {
                body: payload.notification?.body || payload.data?.body || '',
                icon: payload.data?.icon || payload.notification?.image || '/logo-citiox.png',
                badge: '/logo-citiox.png',
                data: payload.data || {},
                vibrate: [200, 100, 200],
                requireInteraction: false
            };
            console.log('[SW-AUDIT][PASO 2] Llamando a showNotification desde onBackgroundMessage:', notificationTitle, JSON.stringify(notificationOptions));
            self.registration.showNotification(notificationTitle, notificationOptions)
                .then(() => console.log('[SW-AUDIT][PASO 3] showNotification completado con éxito (onBackgroundMessage)'))
                .catch(err => console.error('[SW-AUDIT][ERROR] error en showNotification (onBackgroundMessage):', err));
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
