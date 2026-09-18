import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  const adminUserId = (session.user as any).id;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  const { id } = await params;

  try {
    const membership = await (prisma as any).membership.findFirst({
      where: { id, businessId: negocioId },
      include: { cliente: true, membershipPlan: true }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Membresía no encontrada o no pertenece a este negocio' }, { status: 404 });
    }

    const body = await req.json();
    const { action, reason, planId, paymentMethod = 'EFECTIVO', customPrice } = body;

    // ── 1. CONGELAR MEMBRESÍA (FREEZE) ──────────────────────────────────────────
    if (action === 'freeze') {
      if (membership.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Solo se pueden congelar membresías activas' }, { status: 400 });
      }

      const updated = await (prisma as any).membership.update({
        where: { id },
        data: {
          status: 'FROZEN',
          frozenAt: new Date(),
          freezeReason: reason || 'Solicitud del socio',
          frozenByUserId: adminUserId || null
        },
        include: { cliente: true, membershipPlan: true }
      });

      try {
        if (adminUserId) {
          await (prisma as any).adminAuditLog.create({
            data: {
              adminUserId,
              accion: 'MEMBERSHIP_FROZEN',
              modulo: 'GIMNASIO',
              descripcion: `Membresía de ${membership.cliente.nombre} congelada. Motivo: ${reason || 'N/A'}`,
              targetId: id,
              targetType: 'MEMBERSHIP'
            }
          });
        }
      } catch (_) {}

      return NextResponse.json({ success: true, message: 'Membresía congelada con éxito', membership: updated });
    }

    // ── 2. REACTIVAR MEMBRESÍA CONGELADA (UNFREEZE) ───────────────────────────
    if (action === 'unfreeze') {
      if (membership.status !== 'FROZEN') {
        return NextResponse.json({ error: 'La membresía no está congelada' }, { status: 400 });
      }

      const now = new Date();
      const frozenAt = membership.frozenAt ? new Date(membership.frozenAt) : now;
      const frozenDurationMs = Math.max(0, now.getTime() - frozenAt.getTime());
      const frozenDays = Math.ceil(frozenDurationMs / (1000 * 60 * 60 * 24));

      // Extender la fecha de fin por los días que estuvo congelada
      const oldEndAt = new Date(membership.endAt);
      const newEndAt = new Date(oldEndAt.getTime() + frozenDurationMs);

      const updated = await (prisma as any).membership.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          unfrozenAt: now,
          freezeDays: (membership.freezeDays || 0) + frozenDays,
          endAt: newEndAt
        },
        include: { cliente: true, membershipPlan: true }
      });

      try {
        if (adminUserId) {
          await (prisma as any).adminAuditLog.create({
            data: {
              adminUserId,
              accion: 'MEMBERSHIP_REACTIVATED',
              modulo: 'GIMNASIO',
              descripcion: `Membresía de ${membership.cliente.nombre} reactivada (+${frozenDays} días extendidos)`,
              targetId: id,
              targetType: 'MEMBERSHIP'
            }
          });
        }
      } catch (_) {}

      return NextResponse.json({ success: true, message: 'Membresía reactivada con éxito', membership: updated });
    }

    // ── 3. RENOVAR MEMBRESÍA (RENEWAL) ──────────────────────────────────────────
    // Regla 29: No destruir la anterior, crear una nueva transacción/membresía
    if (action === 'renew') {
      // Marcar membresía actual como EXPIRED si no lo estaba ya
      await (prisma as any).membership.update({
        where: { id },
        data: { status: 'EXPIRED' }
      });

      // Determinar plan de renovación (el mismo u otro seleccionado)
      const targetPlanId = planId || membership.membershipPlanId;
      const targetPlan = await (prisma as any).membershipPlan.findFirst({
        where: { id: targetPlanId, businessId: negocioId }
      });

      if (!targetPlan) {
        return NextResponse.json({ error: 'Plan para renovación no encontrado' }, { status: 404 });
      }

      // La nueva membresía inicia hoy o en la fecha de fin si aún no expiraba
      const now = new Date();
      const newStartAt = membership.endAt > now ? new Date(membership.endAt) : now;
      const newEndAt = new Date(newStartAt.getTime() + (targetPlan.durationDays || 30) * 24 * 60 * 60 * 1000);
      const finalPrice = customPrice !== undefined && customPrice !== null ? parseFloat(customPrice) : targetPlan.price;

      const renewedMembership = await (prisma as any).membership.create({
        data: {
          businessId: negocioId,
          customerId: membership.customerId,
          membershipPlanId: targetPlan.id,
          status: 'ACTIVE',
          startAt: newStartAt,
          endAt: newEndAt,
          price: finalPrice,
          currency: targetPlan.currency || 'USD',
          paymentStatus: 'PAID',
          paymentMethod,
          branchId: membership.branchId || null
        },
        include: { cliente: true, membershipPlan: true }
      });

      try {
        if (adminUserId) {
          await (prisma as any).adminAuditLog.create({
            data: {
              adminUserId,
              accion: 'MEMBERSHIP_RENEWED',
              modulo: 'GIMNASIO',
              descripcion: `Renovación para ${membership.cliente.nombre}: Membresía anterior #${membership.id.slice(-6)} expirada, nueva #${renewedMembership.id.slice(-6)} activa por $${finalPrice}`,
              targetId: renewedMembership.id,
              targetType: 'MEMBERSHIP'
            }
          });
        }
      } catch (_) {}

      return NextResponse.json({ success: true, message: 'Membresía renovada con éxito', membership: renewedMembership });
    }

    // ── 4. CANCELAR MEMBRESÍA (CANCEL) ──────────────────────────────────────────
    if (action === 'cancel') {
      const updated = await (prisma as any).membership.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { cliente: true, membershipPlan: true }
      });

      try {
        if (adminUserId) {
          await (prisma as any).adminAuditLog.create({
            data: {
              adminUserId,
              accion: 'MEMBERSHIP_CANCELLED',
              modulo: 'GIMNASIO',
              descripcion: `Membresía cancelada para ${membership.cliente.nombre}. Motivo: ${reason || 'Cancelación administrativa'}`,
              targetId: id,
              targetType: 'MEMBERSHIP'
            }
          });
        }
      } catch (_) {}

      return NextResponse.json({ success: true, message: 'Membresía cancelada', membership: updated });
    }

    return NextResponse.json({ error: 'Acción no válida (use freeze, unfreeze, renew o cancel)' }, { status: 400 });
  } catch (error: any) {
    console.error('[API_GYM_MEMBERSHIPS_ACTIONS_PATCH]', error);
    return NextResponse.json({ error: error.message || 'Error al procesar acción sobre membresía' }, { status: 500 });
  }
}
