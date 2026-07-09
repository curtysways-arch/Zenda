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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const existing = await prisma.changelogItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Changelog no encontrado" }, { status: 404 });
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: session.user?.email || "" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "AdminUser no registrado" }, { status: 400 });
    }

    const updateData: any = {};
    if (body.version !== undefined) updateData.version = body.version;
    if (body.titulo !== undefined) updateData.titulo = body.titulo;
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;
    if (body.cambios !== undefined) {
      updateData.cambios = typeof body.cambios === "string" ? body.cambios : JSON.stringify(body.cambios);
    }
    if (body.activo !== undefined) updateData.activo = body.activo;

    const updated = await prisma.changelogItem.update({
      where: { id },
      data: updateData,
    });

    // Auditoría
    await logAuditAction({
      adminUserId: adminUser.id,
      accion: "EDITAR_CHANGELOG",
      modulo: "Changelog",
      descripcion: `Edición de changelog: ${updated.version} - "${updated.titulo}"`,
      targetId: id,
      targetType: "ChangelogItem",
      datos: { antes: existing, despues: updated },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.changelogItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Changelog no encontrado" }, { status: 404 });
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: session.user?.email || "" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "AdminUser no registrado" }, { status: 400 });
    }

    await prisma.changelogItem.delete({
      where: { id },
    });

    // Auditoría
    await logAuditAction({
      adminUserId: adminUser.id,
      accion: "ELIMINAR_CHANGELOG",
      modulo: "Changelog",
      descripcion: `Eliminación de changelog: ${existing.version} - "${existing.titulo}"`,
      targetId: id,
      targetType: "ChangelogItem",
      datos: { borrado: existing },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
