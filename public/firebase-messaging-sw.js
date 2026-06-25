// Importar scripts de Firebase (versión actual)
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

// Obtener parámetros de la URL del Service Worker (query string)
const urlParams = new URLSearchParams(self.location.search);
const apiKey = urlParams.get('apiKey') || "AIzaSyDlErcTHuplaip1cuzXrBMNxUaFJzG52OA";
const authDomain = urlParams.get('authDomain') || "canchas-saas.firebaseapp.com";
const projectId = urlParams.get('projectId') || "canchas-saas";
const storageBucket = urlParams.get('storageBucket') || "canchas-saas.firebasestorage.app";
const messagingSenderId = urlParams.get('messagingSenderId') || "1082356572409";
const appId = urlParams.get('appId') || "1:1082356572409:web:7460b04ede9724e610c228";

// Inicializar Firebase en el Service Worker con la configuración dinámica recibida
firebase.initializeApp({
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId
});

const messaging = firebase.messaging();

// Manejar notificaciones en segundo plano (Service Worker en background)
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Mensaje background recibido:', payload);
    const notificationTitle = payload.notification?.title || 'Nueva notificación';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: payload.data?.icon || payload.notification?.image || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: payload.data,
        vibrate: [200, 100, 200],
        requireInteraction: false
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Listener raw de 'push' para garantizar entrega durante navegación entre páginas
// Este handler se dispara SIEMPRE, incluso si la página está en transición
self.addEventListener('push', (event) => {
    if (!event.data) return;
    let payload;
    try { payload = event.data.json(); } catch { return; }

    const title = payload.notification?.title || payload.data?.title || 'Nueva notificación';
    const body = payload.notification?.body || payload.data?.body || '';
    const icon = payload.data?.icon || payload.notification?.image || '/icons/icon-192x192.png';

// Solo mostrar si no hay cliente visible (evita duplicados con onMessage del app)
    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon,
            badge: '/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            data: payload.data || {}
        })
    );
});

// Manejar click en notificación nativa
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const link = event.notification.data?.link || '/admin/reservas';
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
