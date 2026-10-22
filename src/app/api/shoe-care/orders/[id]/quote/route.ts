/**
 * El local revisa los artículos y fija el PRECIO FINAL (el cliente solo vio un estimado).
 *
 *  - Si el precio final es igual o menor al estimado → la orden entra directo a proceso.
 *  - Si sube → la orden espera la aprobación del cliente (CAMBIOS_SOLICITADOS). El cliente
 *    aprueba o rechaza desde su enlace; si rechaza, se le devuelve sin procesar y paga solo el envío.
 *    El local también puede marcar "el cliente aprobó por teléfono".
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireOrderAccess, normalizeEcPhone } from '@/lib/laundry/orderAccess';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { wordsFor } from '@/lib/laundry/wording';

export const dynamic = 'force-dynamic';

type Line = { nombreProducto: string; cantidad: number; precioUnitario: number; nivel?: string | null };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireOrderAccess(id);
    if (!access.ok) return access.response;
    const pedido = access.pedido;

    if (!['RECIBIDO', 'RETIRADO', 'INSPECCIONADO', 'CAMBIOS_SOLICITADOS'].includes(pedido.estado)) {
      return NextResponse.json({ error: 'Solo se cotiza una orden que ya está en el local y aún no empieza.' }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const raw: any[] = Array.isArray(body?.items) ? body.items : [];
    const lines: Line[] = raw
      .map((it) => ({
        nombreProducto: String(it.nombreProducto || '').slice(0, 200).trim(),
        cantidad: Math.max(1, Math.round(Number(it.cantidad) || 1)),
        precioUnitario: Math.max(0, Math.round((Number(it.precioUnitario) || 0) * 100) / 100),
        nivel: it.nivel ? String(it.nivel).slice(0, 40) : null,
      }))
      .filter((l) => l.nombreProducto);
    if (!lines.length) return NextResponse.json({ error: 'Agrega al menos un artículo.' }, { status: 400 });

    const extra: any = { ...((pedido.extraInfo as any) || {}) };
    const prev = extra.cotizacion || {};
    const estimado = Number(prev.estimado ?? pedido.subtotal ?? 0);
    const final = Math.round(lines.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0) * 100) / 100;
    const envio = Number(pedido.costoEnvio || 0);
    const sube = final > estimado + 0.009;
    const nowIso = new Date().toISOString();
    const nextEstado = sube ? 'CAMBIOS_SOLICITADOS' : String(body?.siguienteEstado || 'EN_PROCESO');

    extra.cotizacion = {
      estimado,
      final,
      nota: body?.nota ? String(body.nota).slice(0, 500) : null,
      estado: sube ? 'PENDIENTE' : 'CONFIRMADA',
      at: nowIso,
      por: access.user?.name || 'Local',
    };
    extra.inspeccionRealizada = true;
    if (!sube && !extra.ingresadoAt) extra.ingresadoAt = nowIso;
    extra.stateUpdatedAt = nowIso;
    const timeline = Array.isArray(extra.timeline) ? [...extra.timeline] : [];
    timeline.push({
      id: `tl_${Date.now()}`,
      type: 'QUOTE',
      action: sube
        ? `Precio final $${final.toFixed(2)} (estimado $${estimado.toFixed(2)}): esperando aprobación del cliente`
        : `Precio final confirmado: $${final.toFixed(2)}`,
      user: access.user?.name || 'Local',
      timestamp: nowIso,
    });
    extra.timeline = timeline;

    await prisma.$transaction([
      prisma.pedidoItem.deleteMany({ where: { pedidoId: id } }),
      prisma.pedidoItem.createMany({
        data: lines.map((l) => ({
          pedidoId: id,
          nombreProducto: l.nivel ? `${l.nombreProducto} · ${l.nivel}` : l.nombreProducto,
          precioUnitario: l.precioUnitario,
          cantidad: l.cantidad,
        })),
      }),
      prisma.pedido.update({
        where: { id },
        data: { estado: nextEstado, subtotal: final, total: Math.round((final + envio) * 100) / 100, extraInfo: extra },
      }),
    ]);

    // Aviso al cliente
    try {
      const negocio = await prisma.negocio.findUnique({ where: { id: pedido.negocioId }, select: { nombre: true, slug: true, tipoNegocio: true, configuracion: true } });
      const w = wordsFor(negocio);
      const link = `${process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com'}/${negocio?.slug}/pedidos/${id}`;
      const total = (final + envio).toFixed(2);
      const msg = sube
        ? [
            `🧾 *Revisamos ${w.tusCosas}* (orden #${pedido.numeroPedido})`,
            ``,
            `El precio final es *$${final.toFixed(2)}* (el estimado era $${estimado.toFixed(2)})${extra.cotizacion.nota ? `: ${extra.cotizacion.nota}` : '.'}`,
            `Total con envío: *$${total}*`,
            ``,
            `Antes de empezar necesitamos tu aprobación. Si no lo apruebas, te devolvemos ${w.tusCosas} sin costo de servicio (solo pagas el envío).`,
            `👉 Aprueba o rechaza aquí: ${link}`,
          ].join('\n')
        : `✅ Revisamos ${w.tusCosas} (orden #${pedido.numeroPedido}). Precio final: *$${final.toFixed(2)}*, total con envío *$${total}*. ¡Ya empezamos! Sigue tu orden: ${link}`;
      const phone = normalizeEcPhone(pedido.telefonoCliente);
      if (phone) sendWhatsAppMessage(phone, msg, sube ? 'laundry_quote_approval' : 'laundry_quote_ok').catch(() => {});
    } catch {}

    return NextResponse.json({ ok: true, estado: nextEstado, estimado, final, requiereAprobacion: sube });
  } catch (e: any) {
    console.error('[laundry quote]', e);
    return NextResponse.json({ error: 'No se pudo guardar el precio.' }, { status: 500 });
  }
}
