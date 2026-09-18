import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { BranchService } from '@/core/branch/BranchService';
import { BranchAccessService } from '@/core/branch/BranchAccessService';
import { EntitlementsService } from '@/core/entitlements/EntitlementsService';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetBizId = searchParams.get('businessId') || (session.user as any).negocioId;

    if (!targetBizId) {
      return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });
    }

    await BranchAccessService.requireBusinessAccess(session.user as any, targetBizId);

    const includeInactive = searchParams.get('includeInactive') === 'true';
    const [branches, limitCheck, entitlements, ubicaciones] = await Promise.all([
      BranchService.listBranches(targetBizId, includeInactive),
      EntitlementsService.checkBranchLimit(targetBizId),
      EntitlementsService.resolve(targetBizId),
      prisma.ubicacion.findMany({ where: { negocioId: targetBizId } }).catch(() => [])
    ]);

    const ubicacionesByName = new Map<string, any>(
      ubicaciones.map((u: any): [string, any] => [u.nombre.toLowerCase().trim(), u])
    );

    const enrichedBranches = branches.map((b: any) => {
      const s = (b.settings && typeof b.settings === 'object') ? b.settings : {};
      const ubi = ubicacionesByName.get(b.name.toLowerCase().trim());
      return {
        ...b,
        horario: s.horario ?? ubi?.horario ?? null,
        mapUrl: s.mapUrl ?? ubi?.mapUrl ?? null,
        imagenUrl: s.imagenUrl ?? ubi?.imagenUrl ?? null,
        tieneParqueadero: Boolean(s.tieneParqueadero ?? ubi?.tieneParqueadero),
        tieneTransporte: Boolean(s.tieneTransporte ?? ubi?.tieneTransporte),
        tieneZonaSegura: Boolean(s.tieneZonaSegura ?? ubi?.tieneZonaSegura),
        tieneAccesoFacil: Boolean(s.tieneAccesoFacil ?? ubi?.tieneAccesoFacil),
      };
    });

    return NextResponse.json({
      success: true,
      branches: enrichedBranches,
      limits: {
        active: limitCheck.current,
        limit: limitCheck.limit,
        remaining: limitCheck.remaining,
        allowed: limitCheck.allowed,
        planName: entitlements.planName
      }
    });
  } catch (error: any) {
    console.error('[API_ADMIN_SUCURSALES_GET_ERROR]', error);
    const status = error instanceof Response ? error.status : 500;
    return NextResponse.json({ error: error?.message || 'Error al listar sucursales' }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const targetBizId = body.businessId || (session.user as any).negocioId;

    if (!targetBizId) {
      return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });
    }

    await BranchAccessService.requireBusinessAccess(session.user as any, targetBizId);

    const branch = await BranchService.createBranch(targetBizId, {
      name: body.name,
      code: body.code,
      address: body.address,
      city: body.city,
      phone: body.phone,
      email: body.email,
      mapUrl: body.mapUrl,
      imagenUrl: body.imagenUrl,
      horario: body.horario,
      tieneParqueadero: body.tieneParqueadero,
      tieneTransporte: body.tieneTransporte,
      tieneZonaSegura: body.tieneZonaSegura,
      tieneAccesoFacil: body.tieneAccesoFacil,
      isDefault: body.isDefault
    });

    return NextResponse.json({
      success: true,
      branch
    });
  } catch (error: any) {
    console.error('[API_ADMIN_SUCURSALES_POST_ERROR]', error);
    const status = error?.message?.includes('alcanzado el límite') ? 403 : 500;
    return NextResponse.json({ error: error?.message || 'Error al crear sucursal' }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { branchId, ...updateData } = body;

    if (!branchId) {
      return NextResponse.json({ error: 'branchId es requerido' }, { status: 400 });
    }

    const targetBizId = body.businessId || (session.user as any).negocioId;
    if (!targetBizId) {
      return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });
    }

    await BranchAccessService.requireBranchAccess(session.user as any, targetBizId, branchId);

    const updated = await BranchService.updateBranch(branchId, targetBizId, updateData);

    return NextResponse.json({
      success: true,
      branch: updated
    });
  } catch (error: any) {
    console.error('[API_ADMIN_SUCURSALES_PUT_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error al actualizar sucursal' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    if (!branchId) {
      return NextResponse.json({ error: 'branchId es requerido' }, { status: 400 });
    }

    const targetBizId = searchParams.get('businessId') || (session.user as any).negocioId;
    if (!targetBizId) {
      return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });
    }

    await BranchAccessService.requireBranchAccess(session.user as any, targetBizId, branchId);

    const deactivated = await BranchService.deactivateBranch(branchId, targetBizId);

    return NextResponse.json({
      success: true,
      branch: deactivated
    });
  } catch (error: any) {
    console.error('[API_ADMIN_SUCURSALES_DELETE_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error al desactivar sucursal' }, { status: 500 });
  }
}
