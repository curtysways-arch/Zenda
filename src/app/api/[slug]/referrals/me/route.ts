import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getReferralProgress, generateReferralCode } from "@/lib/referrals";
import crypto from "crypto";

export async function GET(
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

        // Variaciones del teléfono para máxima compatibilidad
        const localTelefono = phone.replace(/^\+(\d{1,4})/, ''); 
        const digitsOnly = phone.replace(/\D/g, ''); 
        const localNoZero = localTelefono.replace(/^0+/, '');

        // 1. Buscar si existe el Usuario
        let user = await prisma.usuario.findFirst({
            where: {
                OR: [
                    { phone: phone },
                    { phone: localTelefono },
                    { phone: digitsOnly },
                    { phone: { endsWith: localNoZero } }
                ]
            }
        });

        // 2. Si no existe el Usuario, crearlo de forma automática
        if (!user) {
            const cliente = await prisma.cliente.findFirst({
                where: {
                    negocioId: negocioId,
                    OR: [
                        { telefono: phone },
                        { telefono: localTelefono },
                        { telefono: digitsOnly }
                    ]
                }
            });

            user = await prisma.usuario.create({
                data: {
                    id: crypto.randomUUID(),
                    nombre: cliente?.nombre || 'Cliente',
                    phone: digitsOnly || phone,
                    role: 'USER',
                    negocioId: negocioId,
                    updatedAt: new Date()
                }
            });
        }

        // 3. Asegurar que tiene un código de referido generado
        const code = await generateReferralCode(user.id, negocioId);

        // 4. Obtener progreso de campañas
        const campaignsProgress = await getReferralProgress(user.id, negocioId);

        // 5. Obtener premios ganados
        const rewards = await prisma.referralReward.findMany({
            where: { userId: user.id, negocioId },
            include: {
                Campaign: {
                    select: {
                        nombre: true,
                        valorRecompensa: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // 6. Obtener total de referidos válidos histórico
        const totalReferidosValidos = await prisma.referralEvent.count({
            where: { referrerId: user.id, negocioId, estado: "VALIDO" }
        });

        return NextResponse.json({
            codigo: code,
            progresoCampañas: campaignsProgress,
            premios: rewards,
            totalReferidosValidos,
            nombreCliente: user.nombre
        });
    } catch (error: any) {
        console.error("Error in referrals/me:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
