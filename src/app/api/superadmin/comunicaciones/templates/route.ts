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
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const templates = await prisma.communicationTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
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
    const { nombre, descripcion, titulo, subtitulo, contenido, imagenUrl, videoUrl, icono, color, tipo, canales } = body;

    if (!nombre || !titulo || !contenido) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: session.user?.email || "" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "AdminUser no registrado" }, { status: 400 });
    }

    const template = await prisma.communicationTemplate.create({
      data: {
        nombre,
        descripcion,
        titulo,
        subtitulo,
        contenido,
        imagenUrl,
        videoUrl,
        icono: icono || "Megaphone",
        color: color || "#0ea5e9",
        tipo: tipo || "PROMO",
        canales: typeof canales === "string" ? canales : JSON.stringify(canales || []),
      },
    });

    // Auditoría
    await logAuditAction({
      adminUserId: adminUser.id,
      accion: "CREAR_PLANTILLA",
      modulo: "Comunicaciones",
      descripcion: `Creación de plantilla: "${nombre}"`,
      targetId: template.id,
      targetType: "CommunicationTemplate",
      datos: body,
    });

    return NextResponse.json(template);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
