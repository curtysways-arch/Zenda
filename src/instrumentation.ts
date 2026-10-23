/**
 * Se ejecuta una vez al arrancar el servidor de Next.js.
 * Inicia el programador que envía las campañas del Centro de comunicación
 * a la hora elegida por el negocio.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;
    try {
        const { startCampaignScheduler } = await import('./lib/communications/campaigns');
        startCampaignScheduler();
    } catch (err) {
        console.error('[instrumentation] No se pudo iniciar el programador de campañas:', err);
    }
    try {
        // Avisos de fin de prueba / vencimiento / gracia por WhatsApp
        const { startLifecycleScheduler } = await import('./lib/subscription/reminders');
        startLifecycleScheduler();
    } catch (err) {
        console.error('[instrumentation] No se pudo iniciar los avisos de suscripción:', err);
    }
    try {
        // Retiros agendados: arrancan solos a su hora y avisan al repartidor (push + WhatsApp)
        const { startPickupReminderScheduler } = await import('./lib/logistics/pickupReminders');
        startPickupReminderScheduler();
    } catch (err) {
        console.error('[instrumentation] No se pudo iniciar los recordatorios de retiros:', err);
    }
}
