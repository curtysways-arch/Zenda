import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { NotificationService } from '@/lib/notifications/notificationService';
import { awardPurchasePoints } from '@/lib/loyalty/purchasePoints';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { requireOrderAccess, ensureLaundryCodes, normalizeEcPhone } from '@/lib/laundry/orderAccess';
import { wordsFor } from '@/lib/laundry/wording';

export const dynamic = 'force-dynamic';

/**
 * Cambios de estado que hace el LOCAL sobre una orden de lavandería.
 *
 * Flujo a domicilio:
 *  PENDIENTE_RETIRO ─(confirmar)→ ESPERANDO_REPARTIDOR_RETIRO ─(repartidor)→ … → RECIBIDO
 *  RECIBIDO ─(ingresar)→ EN_PROCESO → EN_LAVADO / EN_SECADO / EN_ACABADOS → LISTO
 *  LISTO ─(pedir repartidor)→ ESPERANDO_REPARTIDOR_ENTREGA ─(repartidor llega)→ REPARTIDOR_EN_LOCAL
 *  REPARTIDOR_EN_LOCAL ─(local entrega prendas)→ ENTREGADO_A_REPARTIDOR ─(repartidor)→ … → ENTREGADO
 *
 * Los estados que mueve el repartidor (en camino, recogido, en ruta, entregado con código) no se
 * pueden forzar desde aquí, salvo cerrar como ENTREGADO una orden que el cliente retira en el local.
 */
const DRIVER_ONLY = new Set(['REPARTIDOR_EN_CAMINO', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'EN_RUTA_ENTREGA', 'ESPERANDO_CLIENTE']);
const DRIVER_ACTIVE = new Set(['REPARTIDOR_EN_CAMINO', 'RECOGIDO', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR', 'EN_RUTA_ENTREGA', 'ESPERANDO_CLIENTE']);

const LABEL: Record<string, string> = {
  ESPERANDO_REPARTIDOR_RETIRO: 'Confirmada, buscando repartidor para el retiro',
  RECOGIDO: 'Retiro confirmado por el local',
  ACEPTADO: 'El cliente aprobó el precio (registrado por el local)',
  RECIBIDO: 'Recibida en el local',
  EN_PROCESO: 'Ingresada a proceso',
  EN_LAVADO: 'En lavado',
  EN_SECADO: 'En secado',
  EN_ACABADOS: 'En planchado y acabados',
  LISTO: 'Lista',
  ESPERANDO_REPARTIDOR_ENTREGA: 'Lista, buscando repartidor para la entrega',
  ENTREGADO_A_REPARTIDOR: 'Prendas entregadas al repartidor',
  ENTREGADO: 'Entregada al cliente',
  CANCELADO: 'Cancelada',
};

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireOrderAccess(id);
    if (!access.ok) return access.response;
    const pedido = access.pedido;

    const body = await req.json().catch(() => ({}));
    const { estado, photoUrl, photoType, repartidorNombre, notas, motivo } = body || {};
    const prev = pedido.estado;
    const extra: any = { ...((pedido.extraInfo as any) || {}) };
    const isDomicilio = pedido.tipoEntrega === 'DOMICILIO';

    if (estado && estado !== prev) {
      if (DRIVER_ONLY.has(estado)) {
        return NextResponse.json({ error: 'Ese paso lo registra el repartidor desde su app.' }, { status: 400 });
      }
      if (estado === 'ENTREGADO_A_REPARTIDOR') {
        if (prev !== 'REPARTIDOR_EN_LOCAL') {
          return NextResponse.json({ error: 'El repartidor aún no llega al local.' }, { status: 400 });
        }
        // Quien entrega (el local) ingresa el código que le muestra el repartidor
        const attempts = Number(extra.handoverAttempts || 0);
        if (attempts >= 5) {
          return NextResponse.json({ error: 'Demasiados intentos. Pide al repartidor que vuelva a aceptar el pedido.' }, { status: 429 });
        }
        if (extra.driverCode && String(body?.codigo || '').replace(/\D/g, '') !== String(extra.driverCode)) {
          extra.handoverAttempts = attempts + 1;
          await prisma.pedido.update({ where: { id }, data: { extraInfo: extra } });
          return NextResponse.json({ error: 'El código no coincide con el del repartidor asignado.' }, { status: 400 });
        }
      }
      if (estado === 'RECOGIDO') {
        // Respaldo: el cliente no pudo ingresar el código y el local confirma el retiro (queda registrado)
        if (prev !== 'REPARTIDOR_EN_CAMINO') {
          return NextResponse.json({ error: 'No hay un retiro en curso.' }, { status: 400 });
        }
        extra.pickupVerifiedAt = new Date().toISOString();
        extra.pickupVerifiedBy = `LOCAL (${access.user?.name || 'administrador'})`;
      }
      if (estado === 'ENTREGADO' && DRIVER_ACTIVE.has(prev)) {
        return NextResponse.json({ error: 'La entrega la cierra el repartidor con el código del cliente.' }, { status: 400 });
      }
      if (estado === 'CANCELADO' && DRIVER_ACTIVE.has(prev)) {
        return NextResponse.json({ error: 'Hay un repartidor con esta orden en curso. Coordina con él antes de cancelar.' }, { status: 400 });
      }
    }

    if (repartidorNombre) extra.repartidorNombre = repartidorNombre;

    if (photoUrl && photoType) {
      const key = photoType === 'RECEPCION' ? 'fotosRecepcion'
        : photoType === 'PROCESO' ? 'fotosProceso'
        : photoType === 'RETIRO' ? 'fotosRetiro'
        : 'fotosEntrega';
      extra[key] = [...(Array.isArray(extra[key]) ? extra[key] : []), photoUrl];
    }

    const nowIso = new Date().toISOString();
    const changed = estado && estado !== prev;
    let codes: { pickupCode: string; deliveryCode: string } | null = null;

    if (changed) {
      // Códigos de seguridad del cliente: se crean al confirmar o al pedir el repartidor de entrega
      if (estado === 'ESPERANDO_REPARTIDOR_RETIRO' || estado === 'ESPERANDO_REPARTIDOR_ENTREGA') {
        codes = ensureLaundryCodes(extra);
      }
      if (estado === 'ESPERANDO_REPARTIDOR_RETIRO') extra.confirmadoAt = nowIso;
      if (estado === 'EN_PROCESO' && !extra.ingresadoAt) extra.ingresadoAt = nowIso;
      if (estado === 'LISTO') extra.listoAt = nowIso;
      if (estado === 'ESPERANDO_REPARTIDOR_ENTREGA') {
        // Tramo de entrega nuevo: sin repartidor hasta que alguien lo acepte
        extra.assignedDriverId = null;
        extra.assignedDriverName = null;
        extra.assignedDriver = null;
        extra.assignedDriverPhone = null;
        extra.repartidorId = null;
        extra.isHandedOver = false;
        extra.tipoMision = 'ENTREGA';
      }
      if (estado === 'ENTREGADO_A_REPARTIDOR') {
        extra.isHandedOver = true;
        extra.handedOverAt = nowIso;
        extra.handedOverBy = access.user?.name || 'Local';
      }
      if (estado === 'CANCELADO' && motivo) extra.motivoCancelacion = motivo;
      if (estado === 'ACEPTADO' && prev === 'CAMBIOS_SOLICITADOS') {
        extra.cotizacion = { ...(extra.cotizacion || {}), estado: 'APROBADA', respondidaAt: nowIso, aprobadaPor: 'LOCAL (cliente aprobó por teléfono)' };
      }

      const timeline = Array.isArray(extra.timeline) ? [...extra.timeline] : [];
      timeline.push({
        id: `tl_${Date.now()}`,
        type: 'STATUS_CHANGE',
        action: LABEL[estado] || `Estado: ${estado}`,
        estado,
        user: access.user?.name || 'Administrador',
        timestamp: nowIso,
      });
      extra.timeline = timeline;
      extra.stateUpdatedAt = nowIso;
    }

    const updated = await prisma.pedido.update({
      where: { id },
      data: {
        estado: estado || prev,
        notas: notas !== undefined ? notas : pedido.notas,
        extraInfo: extra,
      },
    });

    if (changed) {
      const negocio = await prisma.negocio.findUnique({ where: { id: updated.negocioId }, select: { nombre: true, slug: true, tipoNegocio: true, configuracion: true } });
      const w = wordsFor(negocio);
      const bizName = negocio?.nombre || 'tu lavandería';
      const tracking = `https://citiox.com/${negocio?.slug || ''}/pedidos/${updated.id}`;
      const phone = normalizeEcPhone(updated.telefonoCliente);

      // WhatsApp al cliente en los momentos clave
      let wa: string | null = null;
      if (estado === 'ESPERANDO_REPARTIDOR_RETIRO') {
        wa = [
          `✅ *${bizName} confirmó tu orden #${updated.numeroPedido}*`,
          ``,
          `Un repartidor pasará a retirar ${w.tusCosas}${extra.fechaHoraRetiro ? ` (${extra.fechaHoraRetiro})` : ''}.`,
          `🔐 Al llegar te mostrará un código: *ingrésalo en tu enlace* para entregarle ${w.tusCosas}.`,
          ``,
          `Tu enlace: ${tracking}`,
          ``,
          `El precio que viste es estimado: lo confirmamos al revisar ${w.tusCosas}.`,
        ].join('\n');
      } else if (estado === 'ESPERANDO_REPARTIDOR_ENTREGA' && codes) {
        wa = [
          `✨ *Tu orden #${updated.numeroPedido} está lista*`,
          ``,
          `Ya estamos coordinando el repartidor que te la llevará.`,
          ``,
          `🔐 *Tu código de entrega:* *${codes.deliveryCode}*`,
          `Dáselo al repartidor cuando recibas ${w.tusCosas}. Sin el código no puede cerrar la entrega.`,
          ``,
          `Sigue tu orden: ${tracking}`,
        ].join('\n');
      } else if (estado === 'LISTO' && !isDomicilio) {
        wa = `✨ *Tu orden #${updated.numeroPedido} está lista* para retirar en ${bizName}. Total: $${Number(updated.total || 0).toFixed(2)}.`;
      } else if (estado === 'CANCELADO') {
        wa = `Tu orden #${updated.numeroPedido} en ${bizName} fue cancelada${motivo ? `: ${motivo}` : '.'} Escríbenos si tienes dudas.`;
      }
      if (wa && phone) sendWhatsAppMessage(phone, wa, 'laundry_status').catch(() => {});

      // Notificación en la app del cliente
      try {
        const titles: Record<string, [string, string, 'INFO' | 'SUCCESS' | 'ERROR']> = {
          ESPERANDO_REPARTIDOR_RETIRO: ['Orden confirmada', `Un repartidor pasará a retirar ${w.tusCosas}.`, 'SUCCESS'],
          RECIBIDO: ['En el local', `${w.tusCosas.charAt(0).toUpperCase() + w.tusCosas.slice(1)} llegaron al local.`, 'INFO'],
          EN_PROCESO: ['En proceso', `${w.tusCosas.charAt(0).toUpperCase() + w.tusCosas.slice(1)} ingresaron a proceso.`, 'INFO'],
          EN_LAVADO: ['En lavado', 'Estamos lavando tu orden.', 'INFO'],
          EN_SECADO: ['En secado', 'Tu orden se está secando.', 'INFO'],
          EN_ACABADOS: ['En acabados', 'Estamos dando los últimos detalles.', 'INFO'],
          LISTO: ['Orden lista', isDomicilio ? 'Pronto saldrá a tu dirección.' : 'Ya puedes retirarla en el local.', 'SUCCESS'],
          ESPERANDO_REPARTIDOR_ENTREGA: ['Orden lista', 'Estamos asignando el repartidor de entrega.', 'SUCCESS'],
          ENTREGADO_A_REPARTIDOR: ['Va en camino', `El repartidor ya tiene ${w.tusCosas}.`, 'INFO'],
          ENTREGADO: ['Orden entregada', '¡Gracias por tu confianza!', 'SUCCESS'],
          CANCELADO: ['Orden cancelada', motivo || 'Escríbenos si tienes dudas.', 'ERROR'],
        };
        const t = titles[estado];
        if (t) {
          await NotificationService.createNotification({
            negocioId: updated.negocioId,
            telefonoCliente: updated.telefonoCliente,
            tipo: 'ORDEN',
            categoria: 'ORDENES',
            titulo: `${t[0]} · #${updated.numeroPedido}`,
            descripcion: t[1],
            icono: 'PackageCheck',
            prioridad: t[2],
            recipientType: 'USER',
            actionType: 'VER_ORDEN',
            actionPayload: { screen: 'order', orderId: updated.id, url: '/pedidos' },
            channels: ['APP', 'PUSH'],
          });
        }
      } catch (notifErr) {
        console.warn('[Laundry Status] notificación:', notifErr);
      }

      // Club de beneficios + misiones al entregar
      if (estado === 'ENTREGADO' && !['ENTREGADO', 'FINALIZADO', 'COMPLETADO'].includes(prev)) {
        await awardPurchasePoints({
          negocioId: updated.negocioId,
          referenciaId: updated.id,
          monto: updated.total || 0,
          telefono: updated.telefonoCliente,
          nombre: updated.nombreCliente,
          eventType: 'LAUNDRY_ORDER_COMPLETED',
          cantidad: parseInt(String(extra.cantidadPares || 1), 10) || 1,
          metadata: { numeroPedido: updated.numeroPedido, servicioNombre: extra.servicioNombre, modo: extra.modoIngreso || 'LOCAL' },
        }).catch(() => {});
      }

      try {
        const { sseEmitter } = require('@/lib/notifications/notificationService');
        sseEmitter.emit('realtime_event', { negocioId: updated.negocioId, type: 'ESTADO_CAMBIADO', pedidoId: updated.id, estado });
      } catch {}
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error actualizando estado de orden:', error);
    return NextResponse.json({ error: 'Error al cambiar estado de la orden' }, { status: 500 });
  }
}
