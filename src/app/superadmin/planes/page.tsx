import prisma from "@/lib/prisma";
import SuperadminPlanManager from "@/components/superadmin/SuperadminPlanManager";

export const dynamic = "force-dynamic";

export default async function PlanesPage() {
    // 1. Obtener familias con sus planes, entitlements y limits
    const rawFamilies = await prisma.planFamily.findMany({
        orderBy: { displayOrder: 'asc' },
        include: {
            founderProgram: {
                include: {
                    founderPlan: {
                        select: { id: true, name: true, price: true }
                    }
                }
            },
            businessTypes: {
                select: {
                    id: true,
                    name: true,
                    slug: true
                }
            },
            plans: {
                where: { activo: true },
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

    // 2. Contar negocios asociados por familia (vía suscripción activa o vía tipo de negocio vinculado)
    const families = await Promise.all(rawFamilies.map(async (fam) => {
        const planIds = fam.plans.map(p => p.id);
        const businessTypeIds = fam.businessTypes.map(bt => bt.id);

        const activeSubsCount = await prisma.negocio.count({
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

        return {
            id: fam.id,
            code: fam.code,
            name: fam.name,
            slug: fam.slug,
            description: fam.description,
            icon: fam.icon,
            active: fam.active,
            displayOrder: fam.displayOrder,
            businessTypes: fam.businessTypes,
            plans: fam.plans,
            founderProgram: fam.founderProgram,
            activeBusinessesCount: activeSubsCount
        };
    }));

    // 3. Obtener catálogo completo de módulos canónicos y dependencias
    const [allModules, dependencies] = await Promise.all([
        prisma.businessModuleCatalog.findMany({
            where: { active: true },
            orderBy: { name: 'asc' }
        }),
        prisma.moduleDependency.findMany()
    ]);

    return (
        <SuperadminPlanManager
            initialFamilies={JSON.parse(JSON.stringify(families))}
            allModules={JSON.parse(JSON.stringify(allModules))}
            dependencies={JSON.parse(JSON.stringify(dependencies))}
        />
    );
}
