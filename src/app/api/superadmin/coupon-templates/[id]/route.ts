import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/superadmin/coupon-templates/[id]
 * Elimina una plantilla de cupón global.
 * Solo marca como inactivo (soft delete) para no romper BusinessInheritance existentes.
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // Soft delete: desactivar en lugar de eliminar para preservar referencias
        const template = await prisma.couponTemplate.update({
            where: { id },
            data: { activo: false },
        });

        return NextResponse.json({ success: true, data: template });

    } catch (error: any) {
        console.error(`[DELETE /api/superadmin/coupon-templates/${id}] Error:`, error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

/**
 * GET /api/superadmin/coupon-templates/[id]
 * Obtiene una plantilla de cupón por ID.
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const template = await prisma.couponTemplate.findUnique({
            where: { id },
        });

        if (!template) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });

        return NextResponse.json(template);

    } catch (error: any) {
        console.error(`[GET /api/superadmin/coupon-templates/${id}] Error:`, error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
