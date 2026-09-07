import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AccessPolicyService } from '@/core/security/AccessPolicyService';

export const dynamic = 'force-dynamic';

async function getAuthNegocioId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as any;
  return user.negocioId || user.businessId || null;
}

export async function GET() {
  try {
    const negocioId = await getAuthNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [mesas, rawActiveOrders] = await Promise.all([
      (prisma as any).restaurantTable.findMany({
        where: { negocioId },
        include: {
          _count: {
            select: {
              orderRequests: { where: { estado: 'PENDING_ADMIN_CONFIRMATION' } },
              waiterCalls: { where: { estado: { in: ['PENDING', 'ACKNOWLEDGED'] } } }
            }
          },
          waiterCalls: {
            where: { estado: { in: ['PENDING', 'ACKNOWLEDGED'] } },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: [{ numero: 'asc' }, { createdAt: 'asc' }]
      }),
      (prisma as any).pedido.findMany({
        where: {
          negocioId,
          NOT: {
            estado: { in: ['ENTREGADO', 'CANCELADO', 'COMPLETADO', 'RECHAZADO', 'DESPACHADO'] }
          }
        },
        include: {
          items: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Proteger órdenes según las políticas de acceso del plan (Free vs Crecimiento/Pro)
    const activeOrders = await AccessPolicyService.protectOrders(negocioId, rawActiveOrders);

    // Mapear cada mesa con su orden activa
    const enrichedMesas = mesas.map((mesa: any) => {
      // Buscar orden activa para esta mesa
      const activeOrder = activeOrders.find((ord: any) => {
        const extra = ord.extraInfo || {};
        if (extra.tableId && extra.tableId === mesa.id) return true;
        if (extra.tableName && extra.tableName.trim().toLowerCase() === mesa.nombre.trim().toLowerCase()) return true;
        if (ord.referenciaCliente && ord.referenciaCliente.toLowerCase().includes(mesa.nombre.toLowerCase())) return true;
        return false;
      });

      // Determinar si hay llamada activa de pedir cuenta
      const lastCall = mesa.waiterCalls?.[0];
      const hasBillRequest = lastCall && (
        lastCall.notas?.toLowerCase().includes('cuenta') ||
        lastCall.notas?.toLowerCase().includes('pagar') ||
        lastCall.notas?.toLowerCase().includes('cobro')
      );

      // Calcular estado dinámico de la mesa
      let computedEstado = mesa.estado || 'DISPONIBLE';
      if (hasBillRequest) {
        computedEstado = 'CUENTA_SOLICITADA';
      } else if (activeOrder) {
        computedEstado = 'OCUPADA';
      } else if (!mesa.activa) {
        computedEstado = 'INACTIVA';
      }

      // Duración de la orden si está activa
      let activeOrderSummary = null;
      if (activeOrder) {
        const durationMinutes = Math.floor((Date.now() - new Date(activeOrder.createdAt).getTime()) / (1000 * 60));
        activeOrderSummary = {
          id: activeOrder.id,
          numeroPedido: activeOrder.numeroPedido,
          estado: activeOrder.estado,
          subtotal: activeOrder.subtotal,
          total: activeOrder.total,
          itemsCount: activeOrder.items?.reduce((sum: number, it: any) => sum + (it.cantidad || 1), 0) || 0,
          items: activeOrder.items || [],
          createdAt: activeOrder.createdAt,
          durationMinutes: Math.max(0, durationMinutes),
          kitchenStatus: activeOrder.extraInfo?.kitchenStatus || 'EN_PROCESO',
          isLocked: activeOrder.isLocked,
          lockReason: activeOrder.lockReason
        };
      }

      return {
        ...mesa,
        estado: computedEstado,
        activeOrder: activeOrderSummary,
        hasBillRequest: Boolean(hasBillRequest),
        hasPendingCall: (mesa._count?.waiterCalls || 0) > 0,
        hasPendingRequest: (mesa._count?.orderRequests || 0) > 0
      };
    });

    return NextResponse.json({ success: true, mesas: enrichedMesas });
  } catch (error: any) {
    console.error('[ADMIN_MESAS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Error al obtener mesas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const negocioId = await getAuthNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, numero, permitePedidos, estado, capacidad } = body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre de la mesa es obligatorio' }, { status: 400 });
    }

    // Verificar límite de mesas del plan canónico
    const currentTablesCount = await (prisma as any).restaurantTable.count({
      where: { negocioId }
    });

    const { plan } = await AccessPolicyService.getEffectivePlan(negocioId);
    const tableLimitObj = plan?.planLimits?.find((l: any) => l.limitCode === 'MAX_TABLES');
    const maxTables = tableLimitObj ? tableLimitObj.limitValue : (plan?.isFree ? 5 : 9999);

    if (maxTables !== -1 && currentTablesCount >= maxTables) {
      return NextResponse.json({
        error: `Has alcanzado el límite de mesas permitidas (${currentTablesCount}/${maxTables}) para tu plan actual.`
      }, { status: 403 });
    }

    const nuevaMesa = await (prisma as any).restaurantTable.create({
      data: {
        negocioId,
        nombre: nombre.trim(),
        numero: numero ? parseInt(numero, 10) : null,
        capacidad: capacidad ? parseInt(capacidad, 10) : 4,
        activa: true,
        permitePedidos: permitePedidos !== undefined ? Boolean(permitePedidos) : true,
        estado: estado || 'DISPONIBLE'
      }
    });

    return NextResponse.json({ success: true, mesa: nuevaMesa }, { status: 201 });
  } catch (error: any) {
    console.error('[ADMIN_MESAS_POST_ERROR]', error);
    return NextResponse.json({ error: 'Error al crear la mesa' }, { status: 500 });
  }
}
