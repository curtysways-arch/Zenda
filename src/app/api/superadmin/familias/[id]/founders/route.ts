import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveSubscriptionPrice } from "@/lib/services/planService";

export const dynamic = "force-dynamic";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: familyId } = await params;

        const family = await prisma.planFamily.findUnique({
            where: { id: familyId }
        });

        if (!family) {
            return NextResponse.json({ error: "Familia no encontrada" }, { status: 404 });
        }

        // Buscar suscripciones fundadoras vinculadas a la familia por plan o por tipo de negocio
        const founderSubscriptions = await prisma.suscripcion.findMany({
            where: {
                isFounder: true,
                OR: [
                    {
                        Plan: {
                            familyId: familyId
                        }
                    },
                    {
                        Negocio: {
                            BusinessType: {
                                planFamilyId: familyId
                            }
                        }
                    }
                ]
            },
            include: {
                Negocio: {
                    select: {
                        id: true,
                        nombre: true,
                        slug: true,
                        whatsapp: true,
                        emailContacto: true,
                        createdAt: true,
                        BusinessType: {
                            select: { id: true, name: true, slug: true }
                        }
                    }
                },
                Plan: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        currency: true
                    }
                }
            },
            orderBy: [
                { founderPosition: 'asc' },
                { createdAt: 'asc' }
            ]
        });

        const formattedFounders = founderSubscriptions.map((sub: any) => {
            const effectivePrice = getEffectiveSubscriptionPrice(sub);

            return {
                id: sub.id,
                founderPosition: sub.founderPosition,
                businessId: sub.Negocio?.id,
                businessName: sub.Negocio?.nombre || 'Negocio sin nombre',
                businessSlug: sub.Negocio?.slug || '',
                businessPhone: sub.Negocio?.whatsapp,
                businessEmail: sub.Negocio?.emailContacto,
                businessType: sub.Negocio?.BusinessType?.name || 'No especificado',
                planId: sub.Plan?.id,
                planName: sub.Plan?.name || 'Sin Plan',
                lockedPrice: sub.lockedPrice,
                effectivePrice: effectivePrice,
                currency: sub.Plan?.currency || 'USD',
                status: sub.estado,
                startDate: sub.fechaInicio,
                createdAt: sub.createdAt
            };
        });

        return NextResponse.json({
            family: {
                id: family.id,
                name: family.name,
                code: family.code
            },
            founders: formattedFounders,
            totalFounders: formattedFounders.length
        });
    } catch (error: any) {
        console.error("Error fetching founders list:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
