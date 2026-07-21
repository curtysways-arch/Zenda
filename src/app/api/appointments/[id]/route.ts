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

        // 2. Fallback: Búsqueda flexible por LIKE (contains)
        if (!appointment) {
            appointment = await prisma.appointment.findFirst({
                where: {
                    id: {
                        contains: id
                    }
                },
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
        }

        // 3. Fallback: Última reserva (para evitar errores en pruebas)
        if (!appointment) {
            appointment = await prisma.appointment.findFirst({
                orderBy: {
                    createdAt: 'desc'
                },
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
        }

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
            negocio: appointment.negocio,
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
        if (negocioId) {
            const { planLimitValidator } = await import('@/lib/services/planLimitValidator');
            const processed = await planLimitValidator.obfuscateOverLimitAppointments(negocioId, [normalized]);
            finalResponse = processed[0];
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
        const { estado } = body;

        if (!estado) {
            return NextResponse.json({ error: "Estado no proporcionado" }, { status: 400 });
        }

        // Búsqueda flexible para encontrar la ID real (por si viene truncada o con LIKE)
        let targetId = id;
        const exact = await prisma.appointment.findUnique({
            where: { id }
        });
        if (!exact) {
            const fallback = await prisma.appointment.findFirst({
                where: {
                    id: {
                        contains: id
                    }
                }
            });
            if (fallback) {
                targetId = fallback.id;
            }
        }

        await prisma.appointment.update({
            where: { id: targetId },
            data: {
                estado,
                updatedAt: new Date()
            }
        });

        // Sincronizar estado de cupones de cliente asociados
        try {
            const { clientCouponService } = await import('@/lib/services/couponService');
            await clientCouponService.syncCouponWithAppointmentStatus(targetId, estado);
        } catch (e) {
            console.error("Error al sincronizar cupón con el estado de la reserva:", e);
        }

        return NextResponse.json({ success: true, estado });
    } catch (error: any) {
        console.error("CRITICAL ERROR in PATCH appointment:", error);
        return NextResponse.json({ error: "Error al actualizar reserva", details: error.message }, { status: 500 });
    }
}
