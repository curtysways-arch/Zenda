import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const planes = await prisma.plan.findMany({
            where: { id: { not: 'founder' } },
            include: {
                family: true,
                planEntitlements: {
                    where: { enabled: true },
                    include: { module: true }
                },
                planLimits: true,
                _count: {
                    select: { Suscripcion: true }
                }
            },
            orderBy: [{ familyId: 'asc' }, { displayOrder: 'asc' }, { price: 'asc' }]
        });
        return NextResponse.json(planes);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const name = body.name || body.nombre;

        if (!name) {
            return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
        }

        const familyId = body.familyId || null;
        const modules: string[] = Array.isArray(body.modules) ? body.modules : [];
        const limits: Record<string, number> = body.limits || {};

        // 1. VALIDACIÓN ESTRICTA DE DEPENDENCIAS EN BACKEND
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

        // 2. Crear Plan en Prisma
        const generatedId = body.id || `plan_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${crypto.randomBytes(3).toString("hex")}`;
        const planData: any = {
            id: generatedId,
            name: String(name),
            slug: body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            description: String(body.description || ""),
            price: parseFloat(String(body.price ?? 0)),
            billingPeriod: body.billingPeriod || "monthly",
            currency: body.currency || "USD",
            trial_days: Math.floor(Number(body.trial_days ?? 0)),
            displayOrder: Math.floor(Number(body.displayOrder ?? 0)),
            featured: Boolean(body.featured ?? false),
            isDefault: Boolean(body.isDefault ?? false),
            is_recommended: Boolean(body.featured ?? false),
            isPublic: body.isPublic !== undefined ? Boolean(body.isPublic) : true,
            familyId: familyId,
            activo: body.activo !== undefined ? Boolean(body.activo) : true,
            updated_at: new Date()
        };

        // Si este plan se marca como default y tiene familia, desactivar el default anterior en la familia
        if (Boolean(body.isDefault) && familyId) {
            const prevDefault = await prisma.plan.findFirst({
                where: { familyId, isDefault: true }
            });
            if (prevDefault) {
                await prisma.plan.update({
                    where: { id: prevDefault.id },
                    data: { isDefault: false }
                });
                await prisma.planAuditLog.create({
                    data: {
                        who: 'superadmin',
                        what: 'PLAN_UPDATED',
                        targetType: 'PLAN',
                        targetId: prevDefault.id,
                        oldValue: { isDefault: true },
                        newValue: { isDefault: false },
                        description: `Desactivado isDefault automático por asignación a nuevo plan en familia ${familyId}`
                    }
                });
            }
        }

        const plan = await prisma.plan.create({
            data: planData
        });

        // 3. Crear PlanEntitlements vinculados a BusinessModuleCatalog
        if (modules.length > 0) {
            const catalogModules = await prisma.businessModuleCatalog.findMany({
                where: { code: { in: modules } }
            });

            for (const cm of catalogModules) {
                await prisma.planEntitlement.create({
                    data: {
                        planId: plan.id,
                        moduleId: cm.id,
                        enabled: true
                    }
                });
            }
        }

        // 4. Crear PlanLimits
        for (const [key, val] of Object.entries(limits)) {
            await prisma.planLimit.create({
                data: {
                    planId: plan.id,
                    limitKey: key,
                    limitValue: typeof val === 'number' ? val : parseInt(String(val), 10)
                }
            });
        }

        // 5. Registrar en PlanAuditLog
        await prisma.planAuditLog.create({
            data: {
                who: 'superadmin',
                what: 'PLAN_CREATED',
                targetType: 'PLAN',
                targetId: plan.id,
                newValue: { plan, modules, limits },
                description: `Plan creado: ${plan.name} ($${plan.price})`
            }
        });

        return NextResponse.json({ success: true, plan });
    } catch (error: any) {
        console.error("FATAL ERROR creating plan:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
