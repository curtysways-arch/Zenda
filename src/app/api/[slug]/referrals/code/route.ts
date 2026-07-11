import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { generateReferralCode } from "@/lib/referrals";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get("customer_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Sesión no válida o expirada" }, { status: 401 });
        }

        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");

        let payload;
        try {
            const verification = await jwtVerify(token, secret);
            payload = verification.payload;
        } catch (e) {
            return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });
        }

        const phone = payload.telefono as string;
        const negocioId = payload.negocioId as string;
        const tokenSlug = payload.slug as string;

        if (tokenSlug !== slug) {
            return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
        }

        // Buscar el usuario
        const localTelefono = phone.replace(/^\+(\d{1,4})/, ''); 
        const digitsOnly = phone.replace(/\D/g, ''); 
        const localNoZero = localTelefono.replace(/^0+/, '');

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

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const body = await req.json();
        const { codigoReferido } = body;

        if (!codigoReferido) {
            return NextResponse.json({ error: "Código de referido es obligatorio" }, { status: 400 });
        }

        // Buscar el código de referido en la base de datos
        const codeRecord = await prisma.referralCode.findFirst({
            where: {
                codigo: codigoReferido.trim().toUpperCase(),
                negocioId: negocioId
            }
        });

        if (!codeRecord) {
            return NextResponse.json({ error: "El código de referido no existe para este negocio" }, { status: 400 });
        }

        if (codeRecord.userId === user.id) {
            return NextResponse.json({ error: "No puedes referirte a ti mismo" }, { status: 400 });
        }

        // Verificar si ya fue referido antes
        const alreadyReferred = await prisma.referralEvent.findFirst({
            where: {
                referredId: user.id,
                negocioId: negocioId
            }
        });

        if (alreadyReferred) {
            return NextResponse.json({ error: "Ya has sido referido anteriormente" }, { status: 400 });
        }

        // Buscar campañas activas de referidos para este negocio
        const activeCampaigns = await prisma.referralCampaign.findMany({
            where: { negocioId: negocioId, activa: true }
        });

        if (activeCampaigns.length === 0) {
            return NextResponse.json({ error: "No hay campañas de referidos activas en este momento" }, { status: 400 });
        }

        // Registrar el evento de referido bajo la primera campaña activa
        const campaign = activeCampaigns[0];
        const event = await prisma.referralEvent.create({
            data: {
                id: crypto.randomUUID(),
                campaignId: campaign.id,
                codeId: codeRecord.id,
                negocioId: negocioId,
                referrerId: codeRecord.userId,
                referredId: user.id,
                estado: 'PENDIENTE',
                updatedAt: new Date()
            },
            include: {
                Usuario: {
                    select: { nombre: true }
                }
            }
        });

        return NextResponse.json({ success: true, referidoPor: event.Usuario?.nombre || 'Patrocinador' });
    } catch (error: any) {
        console.error("Error in referrals/code POST:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
