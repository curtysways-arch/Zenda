import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAuditAction } from "@/lib/admin-permissions";
import { CommunicationService } from "@/lib/services/communicationService";

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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const comm = await prisma.globalCommunication.findUnique({
      where: { id },
      include: {
        autor: {
          select: { nombre: true, apellido: true, email: true },
        },
        analiticas: true,
        destinatariosLog: {
          orderBy: { createdAt: "desc" },
          take: 100, // Devolver últimas 100 por rendimiento
        },
      },
    });

    if (!comm) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    return NextResponse.json(comm);
  } catch (error: any) {
    console.error("GET Campaign Detail Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
    const {
      titulo,
      subtitulo,
      contenido,
      imagenUrl,
      videoUrl,
      icono,
      color,
      prioridad,
      tipo,
      estado,
      destinatarios,
      canales,
      popupConfig,
      scheduledFor,
      repeatType,
      timeZone,
    } = body;

    const existing = await prisma.globalCommunication.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    // Buscar admin
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: session.user?.email || "" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "AdminUser no registrado" }, { status: 400 });
    }

    const updateData: any = {};
    if (titulo !== undefined) updateData.titulo = titulo;
    if (subtitulo !== undefined) updateData.subtitulo = subtitulo;
    if (contenido !== undefined) updateData.contenido = contenido;
    if (imagenUrl !== undefined) updateData.imagenUrl = imagenUrl;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    if (icono !== undefined) updateData.icono = icono;
    if (color !== undefined) updateData.color = color;
    if (prioridad !== undefined) updateData.prioridad = prioridad;
    if (tipo !== undefined) updateData.tipo = tipo;
    if (repeatType !== undefined) updateData.repeatType = repeatType;
    if (timeZone !== undefined) updateData.timeZone = timeZone;

    if (destinatarios !== undefined) {
      updateData.destinatarios = typeof destinatarios === "string" ? destinatarios : JSON.stringify(destinatarios);
    }
    if (canales !== undefined) {
      updateData.canales = typeof canales === "string" ? canales : JSON.stringify(canales);
    }
    if (popupConfig !== undefined) {
      updateData.popupConfig = popupConfig ? (typeof popupConfig === "string" ? popupConfig : JSON.stringify(popupConfig)) : null;
    }

    if (scheduledFor !== undefined) {
      updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
    }

    if (estado !== undefined) {
      updateData.estado = estado === "ENVIAR_AHORA" ? "ENVIANDO" : estado;
    }

    const updated = await prisma.globalCommunication.update({
      where: { id },
      data: updateData,
    });

    // Auditoría
    await logAuditAction({
      adminUserId: adminUser.id,
      accion: "EDITAR_CAMPANA",
      modulo: "Comunicaciones",
      descripcion: `Edición de campaña: "${updated.titulo}" (ID: ${id})`,
      targetId: id,
      targetType: "GlobalCommunication",
      datos: { antes: existing, despues: updated },
    });

    // Despachar inmediatamente si estado es ENVIAR_AHORA
    if (estado === "ENVIAR_AHORA") {
      CommunicationService.dispatch(id).catch(err => {
        console.error("Async Dispatch Campaign Error:", err);
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH Campaign Error:", error);
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
    const existing = await prisma.globalCommunication.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: session.user?.email || "" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "AdminUser no registrado" }, { status: 400 });
    }

    await prisma.globalCommunication.delete({
      where: { id },
    });

    // Auditoría
    await logAuditAction({
      adminUserId: adminUser.id,
      accion: "ELIMINAR_CAMPANA",
      modulo: "Comunicaciones",
      descripcion: `Eliminación de campaña: "${existing.titulo}" (ID: ${id})`,
      targetId: id,
      targetType: "GlobalCommunication",
      datos: { borrado: existing },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Campaign Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
