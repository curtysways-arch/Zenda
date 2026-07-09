import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAuditAction } from "@/lib/admin-permissions";

async function getSuperAdminSession() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const roles = (session?.user as any)?.roles || [];
  const isSA = role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || roles.includes('SUPERADMIN');
  if (!session || !isSA) {
    return null;
  }
  return session;
}

export async function GET() {
  // Las novedades (Changelog) son consultables por cualquier usuario logueado en el panel.
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const items = await prisma.changelogItem.findMany({
      where: { activo: true },
      orderBy: { fecha: "desc" },
    });
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { version, titulo, descripcion, cambios } = body;

    if (!version || !titulo || !cambios) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: session.user?.email || "" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "AdminUser no registrado" }, { status: 400 });
    }

    const cambiosString = typeof cambios === "string" ? cambios : JSON.stringify(cambios);

    const item = await prisma.changelogItem.create({
      data: {
        version,
        titulo,
        descripcion,
        cambios: cambiosString,
      },
    });

    // Auditoría
    await logAuditAction({
      adminUserId: adminUser.id,
      accion: "CREAR_CHANGELOG",
      modulo: "Changelog",
      descripcion: `Creación de changelog: ${version} - "${titulo}"`,
      targetId: item.id,
      targetType: "ChangelogItem",
      datos: body,
    });

    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
