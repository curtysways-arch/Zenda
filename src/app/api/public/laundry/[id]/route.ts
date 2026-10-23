/**
 * Acciones del CLIENTE sobre su orden de lavandería (desde su enlace privado de seguimiento).
 *
 *  CONFIRMAR_RETIRO { code }  → el cliente entrega sus artículos: ingresa el código que le muestra el repartidor.
 *  APROBAR_PRECIO             → acepta el precio final que fijó el local tras revisar.
 *  RECHAZAR_PRECIO            → no acepta: el local le devuelve sus artículos sin procesar y solo paga el envío.
 *
 * El id de la orden (UUID, enviado solo al cliente) funciona como llave del enlace privado.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { NotificationService } from '@/lib/notifications/notificationService';
import { guardarPedido } from '@/lib/orders/orderLock';
import { avisarChat } from '@/lib/orders/chatBus';

export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    const pedido = await prisma.pedido.findUnique({ where: { id } });
    if (!pedido) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });

    const extra: any = { ...((pedido.extraInfo as any) || {}) };
    const nowIso = new Date().toISOString();
    const timeline = Array.isArray(extra.timeline) ? [...extra.timeline] : [];
    const log = (action: string) => timeline.push({ id: `tl_${Date.now()}`, type: 'CLIENTE', action, user: pedido.nombreCliente || 'Cliente', timestamp: nowIso });

    const notifyBusiness = (titulo: string, descripcion: string) =>
      NotificationService.createNotification({
        negocioId: pedido.negocioId,
        tipo: 'ORDEN',
        categoria: 'ORDENES',
        titulo,
        descripcion,
        icono: 'PackageCheck',
        prioridad: 'INFO',
        recipientType: 'ALL',
        actionType: 'VER_ORDEN',
        actionPayload: { screen: 'order', orderId: pedido.id, url: '/admin' },
        channels: ['APP', 'PUSH'],
      }).catch(() => {});

    if (action === 'CONFIRMAR_RETIRO') {
      if (pedido.estado !== 'REPARTIDOR_EN_CAMINO' || extra.driverCodeLeg !== 'RETIRO' || !extra.driverCode) {
        return NextResponse.json({ error: 'Esta orden no tiene un retiro en curso.' }, { status: 409 });
      }
      const attempts = Number(extra.pickupAttempts || 0);
      if (attempts >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: 'Demasiados intentos. Comunícate con el local.' }, { status: 429 });
      }
      const code = String(body?.code || '').replace(/\D/g, '');
      if (code !== String(extra.driverCode)) {
        extra.pickupAttempts = attempts + 1;
        await guardarPedido(id, { extraInfo: extra });
        return NextResponse.json({
          error: `El código no coincide. Verifica el que te muestra el repartidor (${MAX_ATTEMPTS - attempts - 1} intentos restantes).`,
        }, { status: 400 });
      }
      extra.pickupVerifiedAt = nowIso;
      extra.pickupVerifiedBy = 'CLIENTE';
      extra.stateUpdatedAt = nowIso;
      log('El cliente entregó sus artículos al repartidor (código verificado)');
      extra.timeline = timeline;
      const updated = await guardarPedido(id, { estado: 'RECOGIDO', extraInfo: extra });
      avisarChat(id, { tipo: 'estado' }); // la app del repartidor pasa sola a «Llevar al local»
      try {
        const { sseEmitter } = require('@/lib/notifications/notificationService');
        sseEmitter.emit('realtime_event', { negocioId: pedido.negocioId, type: 'ESTADO_CAMBIADO', pedidoId: id, estado: 'RECOGIDO' });
      } catch {}
      return NextResponse.json({ ok: true, estado: updated.estado });
    }

    if (action === 'APROBAR_PRECIO' || action === 'RECHAZAR_PRECIO') {
      if (pedido.estado !== 'CAMBIOS_SOLICITADOS') {
        return NextResponse.json({ error: 'No hay un precio pendiente de aprobar.' }, { status: 409 });
      }
      const cot = { ...(extra.cotizacion || {}) };
      if (action === 'APROBAR_PRECIO') {
        cot.estado = 'APROBADA';
        cot.respondidaAt = nowIso;
        extra.cotizacion = cot;
        extra.stateUpdatedAt = nowIso;
        log(`El cliente aprobó el precio final de $${Number(pedido.subtotal || 0).toFixed(2)}`);
        extra.timeline = timeline;
        await guardarPedido(id, { estado: 'ACEPTADO', extraInfo: extra });
        notifyBusiness(`Precio aprobado · #${pedido.numeroPedido}`, `${pedido.nombreCliente} aceptó $${Number(pedido.total || 0).toFixed(2)}. Ya puedes empezar.`);
        return NextResponse.json({ ok: true, estado: 'ACEPTADO' });
      }
      // Rechazo: se devuelve sin procesar, solo se cobra el envío
      cot.estado = 'RECHAZADA';
      cot.respondidaAt = nowIso;
      extra.cotizacion = cot;
      extra.devolverSinServicio = true;
      extra.stateUpdatedAt = nowIso;
      log('El cliente no aceptó el precio: se devuelve sin procesar');
      extra.timeline = timeline;
      const envio = Number(pedido.costoEnvio || 0);
      await guardarPedido(id, { estado: 'LISTO', subtotal: 0, total: envio, extraInfo: extra });
      notifyBusiness(`Precio rechazado · #${pedido.numeroPedido}`, `${pedido.nombreCliente} no aceptó el precio. Devuélvele sus artículos.`);
      return NextResponse.json({ ok: true, estado: 'LISTO' });
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (e: any) {
    console.error('[laundry public]', e);
    return NextResponse.json({ error: 'No se pudo completar la acción.' }, { status: 500 });
  }
}
