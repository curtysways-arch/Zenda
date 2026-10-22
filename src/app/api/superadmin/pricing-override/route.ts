/**
 * API: /api/superadmin/pricing-override
 *
 * Gestión de precios negociados por suscripción.
 * Solo accesible para SUPERADMIN.
 *
 * GET  ?subscriptionId=xxx  → Obtiene el precio efectivo actual + historial de overrides
 * POST                       → Aplica un nuevo precio negociado
 * DELETE ?overrideId=xxx     → Cancela un override activo
 */

import { NextResponse } from 'next/server';
import { getTeamContext, canAccessBusinessId, outsidePortfolio, vendorMinPrice } from '@/lib/admin/teamGuard';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { pricingService } from '@/lib/services/pricingService';
import prisma from '@/lib/prisma';

// ─── Verificar que el usuario sea SUPERADMIN ──────────────────────────────────
async function verifySuperAdmin() {
  const team = await getTeamContext();
  if (!team) return { authorized: false, userId: null as any, team: null as any };
  return { authorized: true, userId: team.userId || 'SUPERADMIN', team };
}

// ─── GET: precio efectivo + historial ────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { authorized } = await verifySuperAdmin();
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId es requerido' }, { status: 400 });
    }

    const [effectivePrice, overrides, auditHistory] = await Promise.all([
      pricingService.getEffectivePrice(subscriptionId),
      pricingService.getOverrides(subscriptionId),
      pricingService.getAuditHistory(subscriptionId),
    ]);

    if (!effectivePrice) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      effectivePrice,
      overrides,
      auditHistory,
    });
  } catch (error) {
    console.error('[pricing-override GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// ─── POST: aplicar precio negociado ──────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { authorized, userId, team } = await verifySuperAdmin();
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { subscriptionId, amount, currency, duration, reason } = body;

    // Validaciones
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      return NextResponse.json({ error: 'subscriptionId es requerido' }, { status: 400 });
    }
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) < 0) {
      return NextResponse.json({ error: 'amount debe ser un número positivo' }, { status: 400 });
    }
    if (duration === undefined || duration === null) {
      return NextResponse.json({ error: 'duration es requerido (PERMANENT o número de ciclos)' }, { status: 400 });
    }
    if (duration !== 'PERMANENT' && (typeof duration !== 'number' || duration < 1 || !Number.isInteger(duration))) {
      return NextResponse.json({ error: 'duration debe ser "PERMANENT" o un entero positivo de ciclos' }, { status: 400 });
    }

    // Verificar que la suscripción existe
    const sub = await prisma.suscripcion.findUnique({
      where: { id: subscriptionId },
      include: { Plan: true },
    });
    if (!sub) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }

    // Vendedores: solo en negocios de su cartera y nunca por debajo del precio mínimo
    if (!team.isOwner) {
      if (!(await canAccessBusinessId(team, sub.negocioId))) return outsidePortfolio();
      const min = await vendorMinPrice();
      if (Number(amount) < min) {
        return NextResponse.json({ error: `El precio mínimo que puedes aplicar es $${min.toFixed(2)}. Para un precio menor pide aprobación al dueño.` }, { status: 403 });
      }
    }

    // Protección Founder: si el override es permanente en una suscripción Founder,
    // advertir pero permitir (la decisión es del Superadmin con plena consciencia).
    let founderWarning: string | undefined;
    if (sub.isFounder && duration === 'PERMANENT') {
      founderWarning = 'Advertencia: Esta suscripción es Founder. Un override permanente coexiste con lockedPrice. El override tiene prioridad mientras esté activo.';
    }

    const { overrideId } = await pricingService.applyNegotiatedPrice({
      subscriptionId,
      amount: Number(amount),
      currency: currency || 'USD',
      duration,
      reason: reason || undefined,
      createdByAdminId: userId,
    });

    const effectivePrice = await pricingService.getEffectivePrice(subscriptionId);

    return NextResponse.json({
      success: true,
      overrideId,
      effectivePrice,
      ...(founderWarning ? { warning: founderWarning } : {}),
    });
  } catch (error: any) {
    console.error('[pricing-override POST]', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

// ─── DELETE: cancelar override activo ────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const { authorized, userId } = await verifySuperAdmin();
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const overrideId = searchParams.get('overrideId');
    const reason = searchParams.get('reason') || 'Cancelado manualmente por Superadmin';

    if (!overrideId) {
      return NextResponse.json({ error: 'overrideId es requerido' }, { status: 400 });
    }

    await pricingService.cancelOverride(overrideId, userId, reason);

    return NextResponse.json({ success: true, message: 'Override cancelado correctamente' });
  } catch (error: any) {
    console.error('[pricing-override DELETE]', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
