import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getReferralProgress, generateReferralCode } from "@/lib/referrals";
import CampaignDetailClient from "./CampaignDetailClient";

export const dynamic = 'force-dynamic';

export default async function CampaignDetailPage({
    params,
}: {
    params: Promise<{ slug: string; id: string }>;
}) {
    const { slug, id } = await params;

    // 1. Obtener la campaña de referidos junto a la info del Negocio
    const campaign = await prisma.referralCampaign.findFirst({
        where: {
            id,
            Negocio: { slug }
        },
        include: {
            Negocio: {
                select: {
                    id: true,
                    nombre: true,
                    colorPrimario: true,
                    colorSecundario: true,
                    colorNeutral: true,
                    colorTexto: true
                }
            }
        }
    });

    if (!campaign) {
        notFound();
    }

    const negocio = campaign.Negocio;
    const primaryColor = negocio.colorPrimario || '#e21d6e';
    const secondaryColor = negocio.colorSecundario || '#0f172a';
    const neutralColor = negocio.colorNeutral || '#fff8f6';

    const rawTextColor = negocio.colorTexto;
    const textColor = rawTextColor
        ? rawTextColor
        : (() => {
            const hex = neutralColor.replace('#', '');
            if (hex.length !== 6) return '#1e293b';
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            return luma < 140 ? '#f8fafc' : '#1e293b';
        })();

    // 2. Obtener datos de la sesión del cliente si existe
    let meData: any = null;

    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("customer_token")?.value;

        if (token) {
            const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
            const verification = await jwtVerify(token, secret);
            const payload = verification.payload;

            // Confirmar que la sesión es del mismo negocio
            if (payload.slug === slug) {
                const phone = payload.telefono as string;
                const negocioId = payload.negocioId as string;

                const localTelefono = phone.replace(/^\+(\d{1,4})/, ''); 
                const digitsOnly = phone.replace(/\D/g, ''); 
                const localNoZero = localTelefono.replace(/^0+/, '');

                // Buscar al usuario
                const user = await prisma.usuario.findFirst({
                    where: {
                        OR: [
                            { phone: phone },
                            { phone: localTelefono },
                            { phone: digitsOnly },
                            { phone: { endsWith: localNoZero } }
                        ]
                    }
                });

                if (user) {
                    // Obtener código
                    const code = await generateReferralCode(user.id, negocioId);

                    // Contar eventos válidos que no han sido consumidos para esta campaña específica
                    const validCount = await prisma.referralEvent.count({
                        where: {
                            referrerId: user.id,
                            negocioId,
                            campaignId: campaign.id,
                            estado: 'VALIDO',
                            rewardId: null
                        }
                    });

                    meData = {
                        codigo: code,
                        progreso: validCount,
                        nombreCliente: user.nombre
                    };
                }
            }
        }
    } catch (e) {
        console.error("Error al obtener la sesión de referidos para detalles de campaña:", e);
    }

    return (
        <CampaignDetailClient 
            campaign={campaign}
            slug={slug}
            primaryColor={primaryColor}
            textColor={textColor}
            neutralColor={neutralColor}
            meData={meData}
        />
    );
}
