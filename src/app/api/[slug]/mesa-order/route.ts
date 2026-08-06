// src/app/api/[slug]/mesa-order/route.ts
// API para crear un pedido de mesa desde el flujo QR
// Usa el Order Runtime genérico (modelo Pedido) — no requiere lógica específica de restaurante

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { tableNumber, tableName, items, nombreCliente, telefonoCliente, notas } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Se requiere al menos un producto en el pedido.' }, { status: 400 });
  }

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const cfg = (negocio.configuracion as any) || {};
  const channels = cfg.channels || {};
  if (channels.TABLE === false) {
    return NextResponse.json({ error: 'CHANNEL_DISABLED', message: 'El canal de atención en mesa está desactivado.' }, { status: 403 });
  }

  // Calcular total
  let subtotal = 0;
  for (const item of items) {
    subtotal += (item.precioUnitario || 0) * (item.cantidad || 1);
  }

  // Número incremental de pedido por negocio
  const lastOrder = await (prisma as any).pedido.findFirst({
    where: { negocioId: negocio.id },
    orderBy: { numeroPedido: 'desc' }
  });
  const numeroPedido = (lastOrder?.numeroPedido || 0) + 1;

  const pedido = await (prisma as any).pedido.create({
    data: {
      id: crypto.randomUUID(),
      negocioId: negocio.id,
      numeroPedido,
      tipoEntrega: 'MESA',
      nombreCliente: nombreCliente || 'Cliente Mesa',
      telefonoCliente: telefonoCliente || '0000000000',
      fechaEntrega: new Date(Date.now() + 20 * 60 * 1000),
      franjaHoraria: 'INMEDIATO',
      subtotal,
      costoEnvio: 0,
      total: subtotal,
      estado: 'PAGO_CONFIRMADO',
      notas: notas || null,
      extraInfo: { tableName: tableName || `Mesa ${tableNumber}`, tableNumber },
      items: {
        create: items.map((item: any) => ({
          id: crypto.randomUUID(),
          productoId: item.productoId || null,
          nombreProducto: item.nombreProducto || 'Producto',
          precioUnitario: item.precioUnitario || 0,
          cantidad: item.cantidad || 1
        }))
      }
    },
    include: { items: true }
  });

  return NextResponse.json({ success: true, pedido, numeroPedido });
}
