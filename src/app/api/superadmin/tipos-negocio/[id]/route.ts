import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

async function checkAuth() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const roles = (session?.user as any)?.roles || [];
  const isSuper = role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN' || roles.includes('SUPERADMIN') || (session?.user as any)?.isAdminUser;
  return { session, isSuper };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tipo = await prisma.businessType.findUnique({
      where: { id },
      include: {
        states: { orderBy: { sortOrder: 'asc' } },
        capabilities: true,
        profiles: { orderBy: { sortOrder: 'asc' } },
        planLinks: { include: { plan: true } },
        _count: { select: { negocios: true } }
      }
    });

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de negocio no encontrado' }, { status: 404 });
    }

    return NextResponse.json(tipo);
  } catch (error) {
    console.error('Error obteniendo tipo de negocio:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, isSuper } = await checkAuth();
    if (!session || !isSuper) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.businessType.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        icon: body.icon,
        color: body.color,
        resourceType: body.resourceType,
        landingThemeId: body.landingThemeId,
        adminThemeId: body.adminThemeId,
        active: body.active !== undefined ? body.active : true,
        rulesOverride: body.rulesOverride !== undefined ? body.rulesOverride : undefined,
        initialConfig: body.initialConfig !== undefined ? body.initialConfig : undefined,
        uiLabels: body.uiLabels !== undefined ? body.uiLabels : undefined
      },
      include: {
        states: { orderBy: { sortOrder: 'asc' } },
        capabilities: true,
        profiles: { orderBy: { sortOrder: 'asc' } },
        planLinks: { include: { plan: true } }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error actualizando tipo de negocio:', error);
    return NextResponse.json({ error: 'Error al actualizar tipo de negocio' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, isSuper } = await checkAuth();
    if (!session || !isSuper) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar si hay negocios asociados
    const negociosCount = await prisma.negocio.count({
      where: { businessTypeId: id }
    });

    if (negociosCount > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar este tipo de negocio porque existen ${negociosCount} negocio(s) asignado(s).` 
      }, { status: 409 });
    }

    await prisma.businessType.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Tipo de negocio eliminado correctamente" });
  } catch (error) {
    console.error('Error eliminando tipo de negocio:', error);
    return NextResponse.json({ error: 'Error al eliminar tipo de negocio' }, { status: 500 });
  }
}
