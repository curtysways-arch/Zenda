/**
 * Avisos por WhatsApp al dueño del negocio según el ciclo (lib/subscription/lifecycle):
 *  - Prueba de 30 días: quedan 7 días (día 23), quedan 2 (día 28) y el último día (día 30).
 *  - Plan pagado: quedan 7, 3 y 1 día.
 *  - Gracia: al empezar, a mitad y el último día antes del bloqueo.
 * Un aviso por día como máximo (lastReminderSent).
 */
import prisma from '@/lib/prisma';
import { computePhase } from '@/lib/subscription/lifecycle';

const APP = () => process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';
const fmt = (d: Date) => d.toLocaleDateString('es-EC', { day: 'numeric', month: 'long' });

function messageFor(nombre: string, info: ReturnType<typeof computePhase>): string | null {
  const link = `${APP()}/admin/plan`;
  if (info.phase === 'TRIAL' && info.daysLeft !== null && [7, 2, 0].includes(info.daysLeft)) {
    if (info.daysLeft === 0) {
      return `⏳ *Hoy termina tu prueba gratis de Citiox*\n\nHola, la prueba de *${nombre}* termina hoy. Activa tu plan para que tu página siga recibiendo reservas y pedidos sin interrupciones.\n\n👉 ${link}`;
    }
    return `👋 *Te quedan ${info.daysLeft} días de prueba gratis*\n\nTu prueba de *${nombre}* en Citiox termina el ${fmt(info.endsAt!)}. Activa tu plan cuando quieras desde tu panel; los días que te queden se suman.\n\n👉 ${link}`;
  }
  if (info.phase === 'ACTIVE' && !info.isFree && info.daysLeft !== null && [7, 3, 1].includes(info.daysLeft)) {
    return `📅 *Tu plan de Citiox vence el ${fmt(info.endsAt!)}*\n\nHola, a *${nombre}* le quedan ${info.daysLeft} ${info.daysLeft === 1 ? 'día' : 'días'} de plan. Renueva para seguir recibiendo clientes sin cortes.\n\n👉 ${link}`;
  }
  if (info.phase === 'GRACE' && info.graceDaysLeft !== null && [6, 3, 0, 1].includes(info.graceDaysLeft)) {
    const last = info.graceDaysLeft <= 1;
    return `${last ? '🔴' : '⚠️'} *${last ? 'Último día para activar tu plan' : 'Tu plan de Citiox está vencido'}*\n\nHola, *${nombre}* sigue funcionando hasta el ${fmt(info.graceEndsAt!)}. Después tu página dejará de recibir reservas y pedidos (no se borra nada y se reactiva al pagar).\n\n👉 ${link}`;
  }
  return null;
}

export async function sendLifecycleReminders(): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const subs = await (prisma as any).suscripcion.findMany({
    where: { OR: [{ lastReminderSent: null }, { lastReminderSent: { lt: startOfToday } }] },
    include: { Negocio: { select: { nombre: true, whatsapp: true, estado: true, isDemo: true } }, Plan: { select: { isFree: true } } },
  });

  const { notificationService } = await import('@/lib/notifications');
  let sent = 0;
  for (const sub of subs) {
    const negocio = sub.Negocio;
    if (!negocio?.whatsapp || negocio.isDemo) continue;
    const info = computePhase({ estado: sub.estado, fechaFin: sub.fechaFin, planIsFree: sub.Plan?.isFree, negocioEstado: negocio.estado });
    const message = messageFor(negocio.nombre, info);
    if (!message) continue;
    try {
      await notificationService.provider.sendMessage({
        to: negocio.whatsapp.replace(/\D/g, ''),
        message,
        template: 'aviso_suscripcion',
      });
      await (prisma as any).suscripcion.update({ where: { id: sub.id }, data: { lastReminderSent: new Date() } });
      sent++;
    } catch (e) {
      console.error(`[reminders] No se pudo avisar a ${negocio.nombre}:`, e);
    }
  }
  return sent;
}

/** Revisa cada hora (envía como máximo un aviso por negocio al día). */
export function startLifecycleScheduler() {
  const g = globalThis as any;
  if (g.__citioxLifecycleScheduler) return;
  g.__citioxLifecycleScheduler = true;
  const run = () => sendLifecycleReminders().catch((e) => console.error('[reminders]', e));
  setTimeout(run, 60 * 1000);
  setInterval(run, 60 * 60 * 1000);
}
