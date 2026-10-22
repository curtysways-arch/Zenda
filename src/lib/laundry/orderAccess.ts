/**
 * Acceso a órdenes de lavandería / shoe-care desde el panel.
 * Solo el personal del negocio dueño de la orden (o el equipo Citiox) puede verlas o modificarlas.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireBusinessAccess } from '@/lib/auth/requireBusinessAccess';
import { randomInt } from 'crypto';

export type OrderAccessResult =
  | { ok: true; pedido: any; user: any; response?: undefined }
  | { ok: false; response: NextResponse; pedido?: undefined; user?: undefined };

export async function requireOrderAccess(orderId: string): Promise<OrderAccessResult> {
  const pedido = await prisma.pedido.findUnique({ where: { id: orderId } });
  if (!pedido) return { ok: false, response: NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 }) };
  const access = await requireBusinessAccess(pedido.negocioId);
  if (!access.ok) return { ok: false, response: access.response };
  return { ok: true, pedido, user: access.user };
}

/** Códigos de seguridad del cliente: retiro (se lo da al repartidor que recoge) y entrega (al que entrega). */
export function ensureLaundryCodes(extra: any): { pickupCode: string; deliveryCode: string } {
  if (!extra.pickupCode) extra.pickupCode = String(randomInt(1000, 10000));
  if (!extra.deliveryCode) extra.deliveryCode = String(randomInt(1000, 10000));
  return { pickupCode: String(extra.pickupCode), deliveryCode: String(extra.deliveryCode) };
}

/** Código del repartidor (lo muestra él y lo ingresa quien le entrega: el cliente al retirar, el local al despachar). */
export function newDriverCode(): string {
  return String(randomInt(1000, 10000));
}

export function normalizeEcPhone(phone: string): string {
  let clean = String(phone || '').replace(/\D/g, '');
  if (clean.startsWith('0') && clean.length === 10) clean = '593' + clean.substring(1);
  else if (clean.length === 9 && clean.startsWith('9')) clean = '593' + clean;
  else if (clean.startsWith('5930')) clean = '593' + clean.substring(4);
  return clean;
}
