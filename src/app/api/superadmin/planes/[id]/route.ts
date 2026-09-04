import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const plan = await prisma.plan.findUnique({
            where: { id },
            include: {
                family: true,
                planEntitlements: {
                    include: { module: true }
                },
                planLimits: true,
                _count: {
                    select: { Suscripcion: true }
                }
            }
        });

        if (!plan) {
            return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
        }

        return NextResponse.json(plan);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await req.json();
        const { id } = await params;

        const currentPlan = await prisma.plan.findUnique({
            where: { id },
            include: {
                planEntitlements: { include: { module: true } },
                planLimits: true
            }
        });

        if (!currentPlan) {
            return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
        }

        const modules: string[] | undefined = Array.isArray(body.modules) ? body.modules : undefined;
        const limits: Record<string, number> | undefined = body.limits;

        // 1. VALIDACIÓN ESTRICTA DE DEPENDENCIAS SI SE MODIFICAN MÓDULOS
        if (modules !== undefined) {
            const dependencies = await prisma.moduleDependency.findMany();
            const activeModuleCodes = new Set(modules);

            for (const dep of dependencies) {
                if (activeModuleCodes.has(dep.moduleCode)) {
                    if (!activeModuleCodes.has(dep.dependsOnCode)) {
                        return NextResponse.json({
                            error: `Violación de dependencias: El módulo ${dep.moduleCode} requiere que ${dep.dependsOnCode} esté activo.`,
                            code: 'DEPENDENCY_VIOLATION',
                            module: dep.moduleCode,
                            missingDependency: dep.dependsOnCode
                        }, { status: 400 });
                    }
                }
            }
        }

        // 2. Preparar campos de actualización
        const updateData: any = {
            updated_at: new Date()
        };

        if (body.name || body.nombre) updateData.name = String(body.name || body.nombre);
        if (body.slug !== undefined) updateData.slug = String(body.slug);
        if (body.description !== undefined) updateData.description = String(body.description);
        if (body.price !== undefined || body.precioMensual !== undefined)
            updateData.price = parseFloat(String(body.price ?? body.precioMensual));
        if (body.billingPeriod !== undefined) updateData.billingPeriod = String(body.billingPeriod);
        if (body.currency !== undefined) updateData.currency = String(body.currency);
        if (body.trial_days !== undefined) updateData.trial_days = Math.floor(Number(body.trial_days));
        if (body.displayOrder !== undefined) updateData.displayOrder = Math.floor(Number(body.displayOrder));
        if (body.featured !== undefined) updateData.featured = Boolean(body.featured);
        if (body.isDefault !== undefined) updateData.isDefault = Boolean(body.isDefault);
        if (body.is_recommended !== undefined) updateData.is_recommended = Boolean(body.is_recommended);
        if (body.isPublic !== undefined) updateData.isPublic = Boolean(body.isPublic);
        if (body.familyId !== undefined) updateData.familyId = body.familyId || null;
        if (body.activo !== undefined) updateData.activo = Boolean(body.activo);

        const updatedPlan = await prisma.plan.update({
            where: { id },
            data: updateData
        });

        // 3. Sincronizar PlanEntitlements si se enviaron módulos
        if (modules !== undefined) {
            await prisma.planEntitlement.deleteMany({
                where: { planId: id }
            });

            const catalogModules = await prisma.businessModuleCatalog.findMany({
                where: { code: { in: modules } }
            });

            for (const cm of catalogModules) {
                await prisma.planEntitlement.create({
                    data: {
                        planId: id,
                        moduleId: cm.id,
                        enabled: true
                    }
                });
            }
        }

        // 4. Sincronizar PlanLimits si se enviaron límites
        if (limits !== undefined) {
            await prisma.planLimit.deleteMany({
                where: { planId: id }
            });

            for (const [key, val] of Object.entries(limits)) {
                await prisma.planLimit.create({
                    data: {
                        planId: id,
                        limitKey: key,
                        limitValue: typeof val === 'number' ? val : parseInt(String(val), 10)
                    }
                });
            }
        }

        // 5. Registrar Auditoría
        await prisma.planAuditLog.create({
            data: {
                who: 'superadmin',
                what: 'PLAN_UPDATED',
                targetType: 'PLAN',
                targetId: id,
                oldValue: currentPlan,
                newValue: { plan: updatedPlan, modules, limits },
                description: `Plan actualizado: ${updatedPlan.name} ($${updatedPlan.price})`
            }
        });

        return NextResponse.json({ success: true, plan: updatedPlan });
    } catch (error: any) {
        console.error("Error updating plan:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Validar si tiene suscripciones activas
        const activeSubs = await prisma.suscripcion.count({
            where: { planId: id }
        });

        if (activeSubs > 0) {
            // Soft-delete deshabilitando activo
            await prisma.plan.update({
                where: { id },
                data: { activo: false }
            });
            return NextResponse.json({ success: true, message: "Plan desactivado porque tiene suscripciones vinculadas" });
        }

        await prisma.plan.delete({ where: { id } });
        return NextResponse.json({ success: true, message: "Plan eliminado" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
