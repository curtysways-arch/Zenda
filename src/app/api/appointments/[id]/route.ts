import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: rawId } = await params;
        const id = rawId.trim();
        
        // 1. Intentar búsqueda exacta
        let appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                cliente: true,
                staff: true,
                service: {
                    include: {
                        Imagen: true
                    }
                },
                ratings: true,
                pagoReserva: true,
                negocio: true
            }
        });

        // Solo búsqueda exacta: el id funciona como enlace privado de la reserva.
        // (Antes, si no la encontraba, devolvía una reserva parecida o la última de CUALQUIER negocio.)

        if (!appointment) {
            return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
        }

        // Buscar si es un referido y obtener la campaña asociada
        const referralEvent = await prisma.referralEvent.findFirst({
            where: { appointmentId: appointment.id },
            include: {
                Campaign: {
                    select: {
                        valorIncentivo: true,
                        tipoIncentivo: true
                    }
                },
                Usuario: {
                    select: {
                        nombre: true
                    }
                }
            }
        });

        // 4. Normalizar respuesta
        const normalized = {
            ...appointment,
            cliente: appointment.cliente,
            staff: appointment.staff,
            service: appointment.service ? {
                ...appointment.service,
                imagenes: appointment.service.Imagen || [],
                Imagen: appointment.service.Imagen || []
            } : null,
            ratings: appointment.ratings || [],
            pagos: appointment.pagoReserva || [],
            pagoReserva: appointment.pagoReserva || [],
            negocio: (() => {
                const n: any = { ...(appointment.negocio as any) };
                for (const k of ['mercadoPagoAccessToken', 'mercadoPagoPublicKey', 'propietario', 'pagoPorcentaje', 'statusNote', 'billingStatus']) delete n[k];
                return n;
            })(),
            referralInfo: referralEvent ? {
                referidorNombre: referralEvent.Usuario?.nombre || "Un amigo",
                valorIncentivo: referralEvent.Campaign?.valorIncentivo || null,
                tipoIncentivo: referralEvent.Campaign?.tipoIncentivo || null
            } : null
        };

        const { getServerSession } = await import("next-auth/next");
        const { authOptions } = await import("@/lib/auth");
        const session = await getServerSession(authOptions);
        const negocioId = session?.user ? (session.user as any).negocioId : null;

        let finalResponse = normalized;
        const targetBusinessId = negocioId || appointment.negocioId;
        if (targetBusinessId) {
            const { planLimitValidator } = await import('@/lib/services/planLimitValidator');
            const { AccessPolicyService } = await import('@/core/security/AccessPolicyService');
            const limitProcessed = await planLimitValidator.obfuscateOverLimitAppointments(targetBusinessId, [normalized]);
            finalResponse = await AccessPolicyService.protectAppointment(targetBusinessId, limitProcessed[0]);
        }

        return NextResponse.json(finalResponse);
    } catch (error: any) {
        console.error("CRITICAL ERROR in GET appointment:", error);
        return NextResponse.json({ error: "Error de Sistema", details: error.message }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { estado, pagoEstado } = body || {};

        if (!estado && !pagoEstado) {
            return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
        }

        const appointment = await prisma.appointment.findUnique({ where: { id } });
        if (!appointment) {
            return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
        }

        // Solo el personal del negocio dueño de la reserva
        const { requireBusinessAccess } = await import('@/lib/auth/requireBusinessAccess');
        const access = await requireBusinessAccess(appointment.negocioId);
        if (!access.ok) return access.response;

        const data: any = { updatedAt: new Date() };
        if (estado) {
            data.estado = estado;
            if (estado === 'confirmed' || estado === 'cancelled') data.expiresAt = null;
        }
        if (pagoEstado) {
            if (!['PENDIENTE', 'PARCIAL', 'PAGADO'].includes(String(pagoEstado))) {
                return NextResponse.json({ error: "Estado de pago inválido" }, { status: 400 });
            }
            data.pagoEstado = pagoEstado;
        }
        await prisma.appointment.update({ where: { id: appointment.id }, data });

        if (estado) {
            try {
                const { clientCouponService } = await import('@/lib/services/couponService');
                await clientCouponService.syncCouponWithAppointmentStatus(appointment.id, estado);
            } catch (e) {
                console.error("Error al sincronizar cupón con el estado de la reserva:", e);
            }
        }

        return NextResponse.json({ success: true, estado: data.estado, pagoEstado: data.pagoEstado });
    } catch (error: any) {
        console.error("CRITICAL ERROR in PATCH appointment:", error);
        return NextResponse.json({ error: "Error al actualizar reserva" }, { status: 500 });
    }
}
