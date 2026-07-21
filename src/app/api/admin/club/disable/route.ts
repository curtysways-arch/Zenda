import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ClubResolver } from "@/lib/growth/clubResolver";
import { InheritanceResource } from "@prisma/client";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/club/disable
 *
 * Marca un recurso global como DISABLED para el negocio.
 * El recurso global no se elimina — solo se oculta para este negocio.
 *
 * Body: { resourceType: InheritanceResource, resourceId: string }
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const body = await req.json();
        const { resourceType, resourceId } = body;

        if (!resourceType || !resourceId) {
            return NextResponse.json({ error: "resourceType y resourceId son obligatorios" }, { status: 400 });
        }

        if (!Object.values(InheritanceResource).includes(resourceType)) {
            return NextResponse.json({ error: "resourceType inválido" }, { status: 400 });
        }

        const result = await ClubResolver.disableResource(negocioId, resourceType as InheritanceResource, resourceId);

        return NextResponse.json({ success: true, data: result });

    } catch (error: any) {
        console.error("[POST /api/admin/club/disable] Error:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
