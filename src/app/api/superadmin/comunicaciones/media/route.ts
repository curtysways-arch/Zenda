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
    const media = await prisma.sharedMedia.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(media);
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
    const { nombre, url, tipo, sizeBytes } = body;

    if (!nombre || !url || !tipo) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: session.user?.email || "" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "AdminUser no registrado" }, { status: 400 });
    }

    const media = await prisma.sharedMedia.create({
      data: {
        nombre,
        url,
        tipo,
        sizeBytes: sizeBytes ? Number(sizeBytes) : null,
      },
    });

    // Auditoría
    await logAuditAction({
      adminUserId: adminUser.id,
      accion: "SUBIR_MEDIA_COMPARTIDO",
      modulo: "Biblioteca Media",
      descripcion: `Se agregó recurso multimedia: "${nombre}"`,
      targetId: media.id,
      targetType: "SharedMedia",
      datos: body,
    });

    return NextResponse.json(media);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
