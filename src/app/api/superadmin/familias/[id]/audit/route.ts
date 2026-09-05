import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: familyId } = await params;

        // Obtener los IDs de los planes de esta familia
        const plans = await prisma.plan.findMany({
            where: { familyId },
            select: { id: true }
        });

        const targetIds = [familyId, ...plans.map(p => p.id)];

        const logs = await prisma.planAuditLog.findMany({
            where: {
                targetId: { in: targetIds }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return NextResponse.json(logs);
    } catch (error: any) {
        console.error("Error fetching audit logs for family:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
