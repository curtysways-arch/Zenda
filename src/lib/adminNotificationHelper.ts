/**
 * Helper centralizado para notificaciones críticas de WhatsApp dirigidas al Super Administrador de Citiox.
 * Eventos soportados:
 * 1. Nuevo negocio registrado
 * 2. Plan solicitado o activado
 * 3. Add-on solicitado o comprado
 */

import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';

const DEFAULT_ADMIN_PHONE = '593968118444';

export async function getSuperAdminWhatsAppNumber(): Promise<string> {
  try {
    const config = await prisma.globalConfig.findUnique({
      where: { clave: 'NUMERO_WHATSAPP_ADMIN' }
    });
    if (config?.valor && config.valor.trim() !== '') {
      return config.valor.replace(/\D/g, '');
    }
  } catch (err) {
    console.error('[AdminNotificationHelper] Error obteniendo NUMERO_WHATSAPP_ADMIN:', err);
  }
  return DEFAULT_ADMIN_PHONE;
}

/**
 * Notifica al Super Admin cuando un nuevo negocio es creado / registrado.
 */
export async function notifyAdminBusinessCreated(data: {
  businessName: string;
  slug: string;
  city: string;
  businessType?: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
}) {
  try {
    const adminPhone = await getSuperAdminWhatsAppNumber();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';

    const message = `🏢 *¡Nuevo Negocio Registrado en Citiox!* 🚀\n\n` +
      `📌 *Negocio:* ${data.businessName}\n` +
      `🌐 *Slug:* ${data.slug}\n` +
      `📍 *Ciudad:* ${data.city}\n` +
      `🏷 *Tipo:* ${data.businessType || 'GENERAL'}\n` +
      `👤 *Dueño/Admin:* ${data.userName}\n` +
      `📧 *Email:* ${data.userEmail}\n` +
      `📱 *Teléfono:* ${data.userPhone || 'No proporcionado'}\n\n` +
      `👉 *Panel SuperAdmin:* ${appUrl}/superadmin/negocios`;

    console.log(`[AdminNotificationHelper] Enviando alerta de negocio creado a ${adminPhone}`);
    await sendWhatsAppMessage(adminPhone, message, 'admin_business_created');
  } catch (err) {
    console.error('[AdminNotificationHelper] Error en notifyAdminBusinessCreated:', err);
  }
}

/**
 * Notifica al Super Admin cuando se solicita o activa un Plan.
 */
export async function notifyAdminPlanEvent(data: {
  eventType: 'SOLICITADO' | 'ACTIVADO';
  businessName: string;
  planName: string;
  period?: string;
  paymentMethod?: string;
  amount?: number;
  reference?: string;
}) {
  try {
    const adminPhone = await getSuperAdminWhatsAppNumber();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';

    const header = data.eventType === 'SOLICITADO'
      ? `🔔 *Nueva Solicitud de Plan* 📋`
      : `🎉 *Plan Activado Exitosamente* ✅`;

    let message = `${header}\n\n` +
      `🏢 *Negocio:* ${data.businessName}\n` +
      `⭐ *Plan:* ${data.planName} ${data.period ? `[${data.period.toUpperCase()}]` : ''}\n`;

    if (data.amount !== undefined) {
      message += `💵 *Monto:* $${Number(data.amount).toFixed(2)}\n`;
    }
    if (data.paymentMethod) {
      message += `💳 *Método:* ${data.paymentMethod}\n`;
    }
    if (data.reference) {
      message += `🧾 *Referencia:* ${data.reference}\n`;
    }

    message += `\n👉 *Validar/Revisar:* ${appUrl}/superadmin/pagos`;

    console.log(`[AdminNotificationHelper] Enviando alerta de plan [${data.eventType}] a ${adminPhone}`);
    await sendWhatsAppMessage(adminPhone, message, 'admin_plan_event');
  } catch (err) {
    console.error('[AdminNotificationHelper] Error en notifyAdminPlanEvent:', err);
  }
}

/**
 * Notifica al Super Admin cuando se solicita o compra un Add-on.
 */
export async function notifyAdminAddonEvent(data: {
  eventType: 'SOLICITADO' | 'ACTIVADO';
  businessName: string;
  addonName: string;
  addonCode: string;
  quantity: number;
  amount: number;
  paymentMethod?: string;
  reference?: string;
}) {
  try {
    const adminPhone = await getSuperAdminWhatsAppNumber();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';

    const header = data.eventType === 'SOLICITADO'
      ? `🚨 *Nueva Solicitud / Compra de Add-on* 🧩`
      : `🎉 *Add-on Activado Exitosamente* ✅`;

    let message = `${header}\n\n` +
      `🏢 *Negocio:* ${data.businessName}\n` +
      `🧩 *Add-on:* ${data.addonName} (${data.addonCode})\n` +
      `🔢 *Cantidad:* ${data.quantity}\n` +
      `💵 *Monto:* $${Number(data.amount).toFixed(2)}\n`;

    if (data.paymentMethod) {
      message += `💳 *Método:* ${data.paymentMethod}\n`;
    }
    if (data.reference) {
      message += `🧾 *Referencia:* ${data.reference}\n`;
    }

    message += `\n👉 *Gestionar en:* ${appUrl}/superadmin/pagos`;

    console.log(`[AdminNotificationHelper] Enviando alerta de add-on [${data.eventType}] a ${adminPhone}`);
    await sendWhatsAppMessage(adminPhone, message, 'admin_addon_event');
  } catch (err) {
    console.error('[AdminNotificationHelper] Error en notifyAdminAddonEvent:', err);
  }
}
