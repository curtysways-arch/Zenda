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

        // 6b. Verificar si este usuario fue referido por alguien (quién es su patrocinador/referrer)
        const referredEvent = await prisma.referralEvent.findFirst({
            where: { referredId: user.id, negocioId },
            include: {
                Usuario: {
                    select: { nombre: true }
                }
            }
        });
        const referidoPorNombre = referredEvent?.Usuario?.nombre || null;

        // 7. Balance de puntos
        const pointsRecord = await (prisma as any).userPoints.findUnique({
            where: { userId_negocioId: { userId: user.id, negocioId } }
        });
        const puntos = pointsRecord?.puntos || 0;

        // 8. Verificar si el negocio tiene activos los puntos
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { configuracion: true }
        });
        const config = negocio?.configuracion
            ? (typeof negocio.configuracion === 'string' ? JSON.parse(negocio.configuracion) : negocio.configuracion) as any
            : {};
        const puntosActivos = config?.puntosActivos !== undefined ? config.puntosActivos : true;

        // 9. Obtener cupones del negocio
        const cupones = await (prisma as any).coupon.findMany({
            where: { negocioId, activa: true },
            orderBy: { createdAt: "desc" }
        });

        // 10. Obtener ranking de puntos
        const ranking = await (prisma as any).userPoints.findMany({
            where: { negocioId },
            orderBy: { puntos: "desc" },
            take: 10,
            include: {
                Usuario: { select: { nombre: true } }
            }
        });

        // 11. Obtener puntos acumulados por reservas de forma reciente (últimos 3 días) para animaciones de celebración
        const recentPoints = await prisma.pointsHistory.findMany({
            where: {
                userId: user.id,
                negocioId,
                concepto: 'RESERVA',
                puntos: { gt: 0 },
                createdAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // 3 días
            },
            orderBy: { createdAt: 'desc' }
        });

        const citasPuntosRecientes = [];
        for (const pt of recentPoints) {
            let servicioNombre = 'tu tratamiento';
            if (pt.referenciaId) {
                const appt = await prisma.appointment.findUnique({
                    where: { id: pt.referenciaId },
                    include: { service: { select: { nombre: true } } }
                });
                if (appt?.service?.nombre) {
                    servicioNombre = appt.service.nombre;
                }
            }
            citasPuntosRecientes.push({
                id: pt.id,
                puntos: pt.puntos,
                servicioNombre,
                fecha: pt.createdAt
            });
        }

        return NextResponse.json({
            codigo: code,
            progresoCampañas: campaignsProgress,
            premios: rewards,
            totalReferidosValidos,
            nombreCliente: user.nombre,
            avatarUrl: (user as any).imagenUrl || (user as any).avatarUrl || null,
            referidoPorNombre,
            puntos,
            puntosActivos,
            cupones,
            ranking,
            citasPuntosRecientes
        });
    } catch (error: any) {
        console.error("Error in referrals/me:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
