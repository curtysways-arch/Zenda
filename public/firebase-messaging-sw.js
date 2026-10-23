// Service worker de notificaciones (Firebase Cloud Messaging).
//
// IMPORTANTE: Firebase debe iniciarse de inmediato, al cargar este archivo (sin esperar un fetch).
// El navegador despierta este worker justo cuando llega un aviso; si el manejador de "push" se registra
// después (por ejemplo, tras pedir la configuración al servidor), el aviso llega antes y se pierde.
// Por eso la configuración viene en la URL con la que la app registra este archivo, con valores por defecto.
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

const params = new URLSearchParams(self.location.search);
const config = {
    apiKey: params.get('apiKey') || "AIzaSyCNZYSiXnzpuz7BMarfIQ-SwWE-Toj6TU8",
    authDomain: params.get('authDomain') || "spa-citas-c5c3d.firebaseapp.com",
    projectId: params.get('projectId') || "spa-citas-c5c3d",
    storageBucket: params.get('storageBucket') || "spa-citas-c5c3d.firebasestorage.app",
    messagingSenderId: params.get('messagingSenderId') || "1071729504920",
    appId: params.get('appId') || "1:1071729504920:web:933b5060cc87428f8a96ed",
};

try {
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    // Si el aviso trae "notification", Firebase ya lo muestra solo: volver a mostrarlo lo duplicaba.
    // Aquí solo se muestran los avisos que vienen únicamente con datos.
    messaging.onBackgroundMessage((payload) => {
        if (payload.notification) return;
        const d = payload.data || {};
        return self.registration.showNotification(d.title || 'Nueva notificación', {
            body: d.body || '',
            icon: d.icon || '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            data: d,
            vibrate: [200, 100, 200],
        });
    });
} catch (e) {
    console.error('[SW] Error al iniciar Firebase:', e);
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Al tocar un aviso mostrado por este archivo: abre (o enfoca) la página del enlace.
// Los avisos que muestra Firebase los abre Firebase con su propio enlace.
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const data = event.notification.data || {};
    const raw = data.link || (data.FCM_MSG && data.FCM_MSG.data && data.FCM_MSG.data.link) || '/';
    const url = new URL(raw, self.location.origin).href;
    event.waitUntil((async () => {
        const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const misma = ventanas.find((c) => c.url === url) || ventanas.find((c) => new URL(c.url).pathname === new URL(url).pathname);
        if (misma) return misma.focus();
        return self.clients.openWindow(url);
    })());
});
