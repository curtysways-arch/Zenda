import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function isSuperAdmin() {
    // const session = await getServerSession(authOptions);
    return true;
}

export async function GET() {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const planes = await prisma.plan.findMany({
        where: { id: { not: 'founder' } },
        orderBy: { price: 'asc' } as any
    });
    return NextResponse.json(planes);
}

export async function POST(req: NextRequest) {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const name = body.name || body.nombre;

        if (!name) {
            return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
        }

        // Datos completos para la creación
        const generatedId = body.id || `plan_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Math.random().toString(36).substring(2, 7)}`;
        const fullPlanData = {
            id: generatedId,
            name: String(name),
            description: String(body.description || ""),
            price: parseFloat(String(body.price ?? 0)),
            trial_days: Math.floor(Number(body.trial_days ?? 0)),
            max_fields: Math.floor(Number(body.max_fields ?? 0)),
            max_reservations_per_month: Math.floor(Number(body.max_reservations_per_month ?? 0)),
            tournaments_enabled: Boolean(body.tournaments_enabled ?? false),
            automatic_discounts_enabled: Boolean(body.automatic_discounts_enabled ?? false),
            courses_module: Boolean(body.courses_module ?? false),
            max_locations: Math.floor(Number(body.max_locations ?? 1)),
            is_recommended: Boolean(body.is_recommended ?? false),
            activo: true,
            features: body.features ? body.features : undefined
        };

        console.log("DEBUG: Full Data ->", JSON.stringify(fullPlanData));

        const plan = await prisma.plan.create({
            data: fullPlanData
        });

        return NextResponse.json(plan);
    } catch (error: any) {
        console.error("FATAL ERROR:", error);
        return NextResponse.json({
            error: "Error en prisma.plan.create",
            details: error.message,
            stack: error.stack?.split("\n").slice(0, 2).join(" | "), // Pequeña traza para el alert
            prismaCode: error.code
        }, { status: 500 });
    }
}
