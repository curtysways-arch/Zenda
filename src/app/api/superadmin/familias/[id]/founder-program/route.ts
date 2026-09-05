import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: familyId } = await params;

        let program = await prisma.founderProgram.findUnique({
            where: { familyId },
            include: {
                founderPlan: {
                    select: { id: true, name: true, price: true, currency: true }
                }
            }
        });

        if (!program) {
            return NextResponse.json({
                familyId,
                enabled: false,
                maxMembers: 25,
                currentMembers: 0,
                founderPrice: 10.0,
                currency: "USD",
                billingPeriod: "monthly",
                lifetimePrice: true,
                founderPlanId: null,
                founderPlan: null
            });
        }

        return NextResponse.json(program);
    } catch (error: any) {
        console.error("Error fetching founder program:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: familyId } = await params;
        const body = await req.json();

        const family = await prisma.planFamily.findUnique({
            where: { id: familyId }
        });

        if (!family) {
            return NextResponse.json({ error: "Familia no encontrada" }, { status: 404 });
        }

        const existing = await prisma.founderProgram.findUnique({
            where: { familyId }
        });

        const newMaxMembers = body.maxMembers !== undefined ? Number(body.maxMembers) : (existing?.maxMembers ?? 25);

        // Regla: No reducir maxMembers por debajo de los miembros ya asignados
        if (existing && newMaxMembers < existing.currentMembers) {
            return NextResponse.json({
                error: `No se puede reducir el cupo máximo a ${newMaxMembers} porque ya hay ${existing.currentMembers} socios fundadores asignados históricamente.`
            }, { status: 400 });
        }

        let founderPlanId = body.founderPlanId !== undefined ? body.founderPlanId : existing?.founderPlanId;
        if (founderPlanId === "") founderPlanId = null;

        if (founderPlanId) {
            const planExists = await prisma.plan.findFirst({
                where: { id: founderPlanId, familyId }
            });
            if (!planExists) {
                return NextResponse.json({
                    error: "El plan seleccionado no pertenece a esta familia de planes."
                }, { status: 400 });
            }
        }

        const dataToSave = {
            enabled: body.enabled !== undefined ? Boolean(body.enabled) : (existing?.enabled ?? false),
            maxMembers: newMaxMembers,
            founderPrice: body.founderPrice !== undefined ? Number(body.founderPrice) : (existing?.founderPrice ?? 10.0),
            currency: body.currency ? String(body.currency).toUpperCase().trim() : (existing?.currency ?? "USD"),
            billingPeriod: body.billingPeriod ? String(body.billingPeriod).toLowerCase().trim() : (existing?.billingPeriod ?? "monthly"),
            lifetimePrice: body.lifetimePrice !== undefined ? Boolean(body.lifetimePrice) : (existing?.lifetimePrice ?? true),
            founderPlanId: founderPlanId
        };

        const updated = await prisma.founderProgram.upsert({
            where: { familyId },
            create: {
                familyId,
                currentMembers: 0,
                ...dataToSave
            },
            update: dataToSave,
            include: {
                founderPlan: {
                    select: { id: true, name: true, price: true, currency: true }
                }
            }
        });

        // Auditoría
        await prisma.planAuditLog.create({
            data: {
                who: 'superadmin',
                what: 'FOUNDER_PROGRAM_UPDATED',
                targetType: 'FAMILY',
                targetId: familyId,
                oldValue: existing,
                newValue: updated,
                description: `Programa de Socios Fundadores actualizado para la familia ${family.name}. Activo: ${updated.enabled}, Cupo: ${updated.currentMembers}/${updated.maxMembers}, Precio: ${updated.founderPrice} ${updated.currency}`
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Error updating founder program:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
