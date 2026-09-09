import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = (session.user as any).negocioId;
    if (!businessId) {
      return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });
    }

    const { id } = await params;
    const body = await req.json();
    const newQuantity = parseInt(body.quantity, 10);

    if (isNaN(newQuantity) || newQuantity < 1) {
      return NextResponse.json({ error: 'La cantidad debe ser un número entero positivo' }, { status: 400 });
    }

    const subAddon = await prisma.subscriptionAddon.findUnique({
      where: { id },
      include: {
        addon: true,
        subscription: true
      }
    });

    if (!subAddon || subAddon.subscription.negocioId !== businessId) {
      return NextResponse.json({ error: 'Add-on contratado no encontrado para este negocio' }, { status: 404 });
    }

    if (!subAddon.addon.stackable) {
      return NextResponse.json({ error: 'Este add-on no es acumulable (stackable)' }, { status: 400 });
    }

    if (subAddon.addon.maxQuantity && newQuantity > subAddon.addon.maxQuantity) {
      return NextResponse.json({
        error: `La cantidad solicitada supera el máximo permitido (${subAddon.addon.maxQuantity})`
      }, { status: 400 });
    }

    const oldQty = subAddon.quantity;
    const updated = await prisma.subscriptionAddon.update({
      where: { id },
      data: { quantity: newQuantity }
    });

    // Registrar en auditoría
    await prisma.subscriptionAddonHistory.create({
      data: {
        id: crypto.randomUUID(),
        subscriptionAddonId: updated.id,
        action: 'UPDATE_QUANTITY',
        priceAtChange: updated.priceContracted,
        quantityAtChange: newQuantity,
        notes: `Cantidad modificada de ${oldQty} a ${newQuantity}`
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Cantidad actualizada exitosamente',
      subscriptionAddon: updated
    });
  } catch (error: any) {
    console.error('[API_ADMIN_ADDONS_UPDATE_QTY]', error);
    return NextResponse.json({ error: error?.message || 'Error al actualizar cantidad' }, { status: 400 });
  }
}
