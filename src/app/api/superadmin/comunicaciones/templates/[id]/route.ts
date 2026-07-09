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
    const existing = await prisma.communicationTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: session.user?.email || "" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "AdminUser no registrado" }, { status: 400 });
    }

    const updateData: any = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;
    if (body.titulo !== undefined) updateData.titulo = body.titulo;
    if (body.subtitulo !== undefined) updateData.subtitulo = body.subtitulo;
    if (body.contenido !== undefined) updateData.contenido = body.contenido;
    if (body.imagenUrl !== undefined) updateData.imagenUrl = body.imagenUrl;
    if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
    if (body.icono !== undefined) updateData.icono = body.icono;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.canales !== undefined) {
      updateData.canales = typeof body.canales === "string" ? body.canales : JSON.stringify(body.canales);
    }

    const updated = await prisma.communicationTemplate.update({
      where: { id },
      data: updateData,
    });

    // Auditoría
    await logAuditAction({
      adminUserId: adminUser.id,
      accion: "EDITAR_PLANTILLA",
      modulo: "Comunicaciones",
      descripcion: `Edición de plantilla: "${updated.nombre}"`,
      targetId: id,
      targetType: "CommunicationTemplate",
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
    const existing = await prisma.communicationTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: session.user?.email || "" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "AdminUser no registrado" }, { status: 400 });
    }

    await prisma.communicationTemplate.delete({
      where: { id },
    });

    // Auditoría
    await logAuditAction({
      adminUserId: adminUser.id,
      accion: "ELIMINAR_PLANTILLA",
      modulo: "Comunicaciones",
      descripcion: `Eliminación de plantilla: "${existing.nombre}"`,
      targetId: id,
      targetType: "CommunicationTemplate",
      datos: { borrado: existing },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
