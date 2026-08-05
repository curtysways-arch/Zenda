import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tipos = await prisma.businessType.findMany({
      include: {
        states: { orderBy: { sortOrder: 'asc' } },
        capabilities: true,
        profiles: { orderBy: { sortOrder: 'asc' } },
        planLinks: { include: { plan: true } },
        _count: { select: { negocios: true } }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return NextResponse.json(tipos);
  } catch (error) {
    console.error('Error fetching tipos de negocio:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const roles = (session?.user as any)?.roles || [];
    const isSuper = role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN' || roles.includes('SUPERADMIN') || (session?.user as any)?.isAdminUser;

    if (!session || !isSuper) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, slug, description, icon, color, resourceType, landingThemeId, adminThemeId, uiLabels, rulesOverride } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nombre y Slug son requeridos' }, { status: 400 });
    }

    const existing = await prisma.businessType.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: `El slug "${slug}" ya existe` }, { status: 400 });
    }

    const nuevoTipo = await prisma.businessType.create({
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || "Briefcase",
        color: color || "#6366f1",
        resourceType: resourceType || "HUMAN",
        landingThemeId: landingThemeId || "modern",
        adminThemeId: adminThemeId || "sidebar",
        uiLabels: uiLabels || null,
        rulesOverride: rulesOverride || null
      },
      include: {
        states: true,
        capabilities: true,
        profiles: true,
        planLinks: true
      }
    });

    return NextResponse.json(nuevoTipo, { status: 201 });
  } catch (error) {
    console.error('Error creando tipo de negocio:', error);
    return NextResponse.json({ error: 'Error interno al crear tipo de negocio' }, { status: 500 });
  }
}
