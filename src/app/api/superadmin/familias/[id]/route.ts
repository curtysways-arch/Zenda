import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const family = await prisma.planFamily.findUnique({
            where: { id },
            include: {
                founderProgram: {
                    include: {
                        founderPlan: {
                            select: { id: true, name: true, price: true, currency: true }
                        }
                    }
                },
                businessTypes: {
                    select: { id: true, name: true, slug: true }
                },
                plans: {
                    orderBy: { displayOrder: 'asc' },
                    include: {
                        planEntitlements: {
                            where: { enabled: true },
                            include: { module: true }
                        },
                        planLimits: true,
                        _count: {
                            select: { Suscripcion: true }
                        }
                    }
                }
            }
        });

        if (!family) {
            return NextResponse.json({ error: "Familia no encontrada" }, { status: 404 });
        }

        const planIds = family.plans.map(p => p.id);
        const businessTypeIds = family.businessTypes.map(bt => bt.id);

        const activeBusinessesCount = await prisma.negocio.count({
            where: {
                OR: [
                    {
                        Suscripcion: {
                            planId: { in: planIds },
                            estado: { in: ['activa', 'active', 'trial'] }
                        }
                    },
                    {
                        businessTypeId: { in: businessTypeIds }
                    }
                ]
            }
        });

        return NextResponse.json({
            ...family,
            activeBusinessesCount
        });
    } catch (error: any) {
        console.error("Error fetching family detail:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, code, slug, description, icon, active, displayOrder } = body;

        const existingFamily = await prisma.planFamily.findUnique({
            where: { id }
        });

        if (!existingFamily) {
            return NextResponse.json({ error: "Familia no encontrada" }, { status: 404 });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = String(name).trim();
        if (code !== undefined) updateData.code = String(code).toUpperCase().trim();
        if (slug !== undefined) updateData.slug = String(slug).trim();
        if (description !== undefined) updateData.description = description ? String(description).trim() : null;
        if (icon !== undefined) updateData.icon = String(icon).trim();
        if (active !== undefined) updateData.active = Boolean(active);
        if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);

        const updated = await prisma.planFamily.update({
            where: { id },
            data: updateData
        });

        // Auditoría
        await prisma.planAuditLog.create({
            data: {
                who: 'superadmin',
                what: 'FAMILY_UPDATED',
                targetType: 'FAMILY',
                targetId: id,
                oldValue: existingFamily,
                newValue: updated,
                description: `Familia de planes actualizada: ${updated.name}`
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Error updating family:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const family = await prisma.planFamily.findUnique({
            where: { id },
            include: {
                plans: {
                    select: { id: true, name: true }
                },
                businessTypes: {
                    select: { id: true, name: true }
                }
            }
        });

        if (!family) {
            return NextResponse.json({ error: "Familia no encontrada" }, { status: 404 });
        }

        // Regla: No eliminar si tiene planes o businessTypes asociados
        const planCount = family.plans.length;
        const businessTypeCount = family.businessTypes.length;

        if (planCount > 0 || businessTypeCount > 0) {
            return NextResponse.json({
                error: `No se puede eliminar la familia '${family.name}' porque tiene ${planCount} planes y ${businessTypeCount} tipos de negocio asociados. Considere desactivarla.`,
                canDeactivate: true
            }, { status: 400 });
        }

        // Verificar si hay suscripciones o negocios que hagan referencia indirecta
        const activeBusinesses = await prisma.negocio.count({
            where: {
                businessType: {
                    familyId: id
                }
            }
        });

        if (activeBusinesses > 0) {
            return NextResponse.json({
                error: `No se puede eliminar la familia '${family.name}' porque tiene ${activeBusinesses} negocios vinculados. Desactive la familia en su lugar.`,
                canDeactivate: true
            }, { status: 400 });
        }

        // Borrar founderProgram si existe
        await prisma.founderProgram.deleteMany({
            where: { familyId: id }
        });

        await prisma.planFamily.delete({
            where: { id }
        });

        // Auditoría
        await prisma.planAuditLog.create({
            data: {
                who: 'superadmin',
                what: 'FAMILY_DELETED',
                targetType: 'FAMILY',
                targetId: id,
                oldValue: family,
                description: `Familia de planes eliminada: ${family.name} (${family.code})`
            }
        });

        return NextResponse.json({ success: true, message: `Familia ${family.name} eliminada con éxito` });
    } catch (error: any) {
        console.error("Error deleting family:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
