import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const families = await prisma.planFamily.findMany({
            orderBy: { displayOrder: 'asc' },
            include: {
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

        // Contar negocios asociados por familia (por suscripción a sus planes o por tipo de negocio vinculado)
        const familyStats = await Promise.all(families.map(async (fam) => {
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
                ...fam,
                activeBusinessesCount: activeSubsCount
            };
        }));

        // Obtener todos los módulos canónicos y dependencias para el constructor
        const [modules, dependencies] = await Promise.all([
            prisma.businessModuleCatalog.findMany({
                where: { active: true },
                orderBy: { name: 'asc' }
            }),
            prisma.moduleDependency.findMany()
        ]);

        return NextResponse.json({
            families: familyStats,
            modules,
            dependencies
        });
    } catch (error: any) {
        console.error("Error fetching plan families:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { code, name, slug, description, icon } = body;

        if (!name || !code) {
            return NextResponse.json({ error: "Nombre y código son obligatorios" }, { status: 400 });
        }

        const normalizedCode = code.toUpperCase().trim();
        const normalizedSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).trim();

        const family = await prisma.planFamily.create({
            data: {
                code: normalizedCode,
                name: String(name),
                slug: normalizedSlug,
                description: description ? String(description) : null,
                icon: icon || 'Briefcase',
                active: true,
                displayOrder: body.displayOrder ?? 10
            }
        });

        // Registrar en auditoría
        await prisma.planAuditLog.create({
            data: {
                who: 'superadmin',
                what: 'FAMILY_CREATED',
                targetType: 'FAMILY',
                targetId: family.id,
                newValue: family,
                description: `Familia de planes creada: ${family.name} (${family.code})`
            }
        });

        return NextResponse.json(family);
    } catch (error: any) {
        console.error("Error creating plan family:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
