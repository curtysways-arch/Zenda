import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

/**
 * El modelo Warehouse solo tiene `branchId` (no hay relación `branch` en el schema),
 * así que la sucursal se adjunta manualmente. Antes se usaba `include: { branch: true }`
 * y la consulta fallaba con error 500 en todas las pantallas del panel.
 */
async function attachBranches(list: any[]) {
  const ids = Array.from(new Set(list.map(w => w.branchId).filter(Boolean)));
  if (ids.length === 0) return list.map(w => ({ ...w, branch: null }));
  const branches = await (prisma as any).branch.findMany({ where: { id: { in: ids } } });
  const byId = new Map(branches.map((b: any) => [b.id, b]));
  return list.map(w => ({ ...w, branch: w.branchId ? byId.get(w.branchId) || null : null }));
}

export async function GET(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    if (!businessId) return NextResponse.json({ error: 'Negocio no especificado' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const excludeVirtual = searchParams.get('excludeVirtual') === 'true';

    const whereClause: any = { businessId, active: true };

    if (branchId && branchId !== 'ALL') {
      whereClause.branchId = branchId;
    }

    if (excludeVirtual) {
      whereClause.type = { notIn: ['TRANSIT', 'SCRAP_WASTE'] };
    }

    let warehouses = await (prisma as any).warehouse.findMany({
      where: whereClause,
      include: {
        stocks: {
          include: {
            warehouse: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Si no tiene bodegas creadas para el negocio y no se especificó filtro de sucursal, inicializar la bodega principal
    if (warehouses.length === 0 && !branchId) {
      const defaultWh = await (prisma as any).warehouse.create({
        data: {
          businessId,
          name: 'Bodega Principal',
          code: 'BOD-01',
          type: 'PHYSICAL',
          isDefault: true,
          active: true
        },
        include: {
          stocks: true
        }
      });
      warehouses = [defaultWh];
    }

    warehouses = await attachBranches(warehouses);
    return NextResponse.json({ success: true, warehouses });
  } catch (e: any) {
    console.error('[API_BODEGAS_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al obtener bodegas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    const body = await req.json();
    const { name, code, isDefault = false, branchId, type = 'PHYSICAL' } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre de la bodega es requerido' }, { status: 400 });
    }

    const warehouse = await (prisma as any).warehouse.create({
      data: {
        businessId,
        branchId: branchId || null,
        type: type || 'PHYSICAL',
        name: name.trim(),
        code: code?.trim() || null,
        isDefault: Boolean(isDefault),
        active: true
      }
    });

    const [withBranch] = await attachBranches([warehouse]);
    return NextResponse.json({ success: true, warehouse: withBranch });
  } catch (e: any) {
    console.error('[API_BODEGAS_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al crear bodega' }, { status: 400 });
  }
}
