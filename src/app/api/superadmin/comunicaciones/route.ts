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

export async function GET(req: Request) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const tipo = searchParams.get("tipo");
    const estado = searchParams.get("estado");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (tipo) whereClause.tipo = tipo;
    if (estado) whereClause.estado = estado;
    if (search) {
      whereClause.OR = [
        { titulo: { contains: search, mode: "insensitive" } },
        { subtitulo: { contains: search, mode: "insensitive" } },
        { contenido: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.globalCommunication.count({ where: whereClause }),
      prisma.globalCommunication.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          autor: {
            select: { nombre: true, apellido: true, email: true },
          },
          analiticas: true,
        },
      }),
    ]);

    return NextResponse.json({
      items,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("GET Communications Error:", error);
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
      estado, // BORRADOR | PROGRAMADO | ENVIAR_AHORA
      destinatarios, // JSON string o object
      canales, // JSON string o array
      popupConfig,
      scheduledFor,
      repeatType,
      timeZone,
    } = body;

    if (!titulo || !contenido || !destinatarios || !canales) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    const user = session.user as any;
    // Buscar la id del AdminUser usando el email de la sesión
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: user.email },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "AdminUser no registrado en el sistema de equipo" }, { status: 400 });
    }

    const destString = typeof destinatarios === "string" ? destinatarios : JSON.stringify(destinatarios);
    const channelsString = typeof canales === "string" ? canales : JSON.stringify(canales);
    const popupConfigString = popupConfig ? (typeof popupConfig === "string" ? popupConfig : JSON.stringify(popupConfig)) : null;

    const initialStatus = estado === "ENVIAR_AHORA" ? "ENVIANDO" : (estado || "BORRADOR");

    // Crear la comunicación
    const comm = await prisma.globalCommunication.create({
      data: {
        titulo,
        subtitulo,
        contenido,
        imagenUrl,
        videoUrl,
        icono: icono || "Megaphone",
        color: color || "#0ea5e9",
        prioridad: prioridad || "INFO",
        tipo,
        estado: initialStatus,
        destinatarios: destString,
        canales: channelsString,
        popupConfig: popupConfigString,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        repeatType: repeatType || "NONE",
        timeZone: timeZone || "America/Bogota",
        autorId: adminUser.id,
      },
    });

    // Registrar auditoría
    await logAuditAction({
      adminUserId: adminUser.id,
      accion: "CREAR_CAMPANA",
      modulo: "Comunicaciones",
      descripcion: `Creación de campaña: "${titulo}" (${tipo})`,
      targetId: comm.id,
      targetType: "GlobalCommunication",
      datos: body,
    });

    // Si es ENVIAR_AHORA, despachar inmediatamente en segundo plano
    if (estado === "ENVIAR_AHORA") {
      CommunicationService.dispatch(comm.id).catch(err => {
        console.error("Async Dispatch Campaign Error:", err);
      });
    }

    return NextResponse.json(comm);
  } catch (error: any) {
    console.error("POST Communications Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
