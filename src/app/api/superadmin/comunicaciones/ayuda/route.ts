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

export async function GET(req: Request) {
  // El endpoint GET de ayuda puede ser accedido por usuarios del SaaS (negocios/staff) para consultar recursos!
  // Por lo tanto, no restringimos solo a SuperAdmin, sino a cualquier sesión iniciada.
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const categoria = searchParams.get("categoria");
    const search = searchParams.get("search");

    const whereClause: any = { activo: true };
    if (tipo) whereClause.tipo = tipo;
    if (categoria) whereClause.categoria = categoria;
    if (search) {
      whereClause.OR = [
        { titulo: { contains: search, mode: "insensitive" } },
        { descripcion: { contains: search, mode: "insensitive" } },
        { contenido: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.helpCenterItem.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
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
    const { titulo, descripcion, contenido, tipo, categoria, urlRecurso } = body;

    if (!titulo || !contenido || !tipo || !categoria) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: session.user?.email || "" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "AdminUser no registrado" }, { status: 400 });
    }

    const helpItem = await prisma.helpCenterItem.create({
      data: {
        titulo,
        descripcion,
        contenido,
        tipo,
        categoria,
        urlRecurso,
      },
    });

    // Auditoría
    await logAuditAction({
      adminUserId: adminUser.id,
      accion: "CREAR_RECURSO_AYUDA",
      modulo: "Centro de Ayuda",
      descripcion: `Creación de recurso de ayuda: "${titulo}" (${tipo})`,
      targetId: helpItem.id,
      targetType: "HelpCenterItem",
      datos: body,
    });

    return NextResponse.json(helpItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
