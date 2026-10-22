import { NextRequest, NextResponse } from "next/server";
import { getTeamContext, assignBusinessToCreator } from "@/lib/admin/teamGuard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProvisioningEngine } from "@/core/provisioning/ProvisioningEngine";

export const dynamic = "force-dynamic";

async function isAuthorizedSuperAdmin() {
    // Usuario del equipo Citiox; el permiso de cada acción lo valida el middleware (lib/admin/teamAccessMap)
    return Boolean(await getTeamContext());
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAuthorizedSuperAdmin()) {
      return NextResponse.json({ error: "No autorizado. Se requieren permisos de Superadmin." }, { status: 401 });
    }

    const payload = await req.json();

    if (!payload) {
      return NextResponse.json({ error: "Payload no proporcionado." }, { status: 400 });
    }

    const result: any = await ProvisioningEngine.provisionBusiness(payload);
    // El vendedor que lo crea queda como responsable (lo ve en su cartera)
    if (result?.businessId) await assignBusinessToCreator(await getTeamContext(), result.businessId);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("[PROVISIONING_API_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Error interno al aprovisionar el negocio." },
      { status: 400 }
    );
  }
}
