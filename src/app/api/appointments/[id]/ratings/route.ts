import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Fix: Removed duplicate imports to resolve Build Error

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { stars, comment, raterRole } = body;

        const starInt = parseInt(stars);

        if (!starInt || starInt < 1 || starInt > 5) {
            return NextResponse.json({ error: 'La calificación debe ser entre 1 y 5 estrellas' }, { status: 400 });
        }

        // 1. OBTENER CITA
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            select: {
                id: true,
                clienteId: true,
                staffId: true,
                estado: true
            }
        });

        if (!appointment) {
            return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
        }

        // Normalizar estado
        const estadoLower = appointment.estado?.toLowerCase();
        if (estadoLower !== 'completed' && estadoLower !== 'finalizada') {
            return NextResponse.json({ error: `Solo se pueden calificar citas finalizadas (Estado actual: ${appointment.estado})` }, { status: 400 });
        }

        // 2. IDENTIFICAR RATER Y RATED
        let raterId = '';
        let ratedId = '';
        let ratedRole = '';

        if (raterRole === 'client') {
            raterId = appointment.clienteId;
            ratedId = appointment.staffId || '';
            ratedRole = 'professional';
            if (!ratedId) return NextResponse.json({ error: 'No hay un profesional asignado a esta cita' }, { status: 400 });
        } else {
            raterId = appointment.staffId || '';
            ratedId = appointment.clienteId;
            ratedRole = 'client';
            if (!raterId) return NextResponse.json({ error: 'No hay un profesional asignado a esta cita para calificar' }, { status: 400 });
        }

        // 3. VERIFICAR CALIFICACIÓN EXISTENTE
        const existing = await prisma.rating.findUnique({
            where: {
                appointmentId_raterRole: {
                    appointmentId: id,
                    raterRole: raterRole
                }
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'Ya has calificado esta cita' }, { status: 400 });
        }

        // 4. EJECUTAR TRANSACCIÓN
        const result = await prisma.$transaction(async (tx) => {
            // Crear Calificación
            const newRating = await tx.rating.create({
                data: {
                    appointmentId: id,
                    raterId,
                    ratedId,
                    raterRole,
                    ratedRole,
                    stars: starInt,
                    comment: comment || null
                }
            });

            // Actualizar estadísticas (Profesional o Cliente)
            if (ratedRole === 'professional') {
                await tx.$executeRaw`
                    UPDATE Staff 
                    SET ratingPromedio = ((ratingPromedio * totalReviews) + ${starInt}) / (totalReviews + 1),
                        totalReviews = totalReviews + 1
                    WHERE id = ${ratedId}
                `;
            } else {
                await tx.$executeRaw`
                    UPDATE Cliente 
                    SET ratingPromedio = ((ratingPromedio * totalReviews) + ${starInt}) / (totalReviews + 1),
                        totalReviews = totalReviews + 1
                    WHERE id = ${ratedId}
                `;
            }

            return newRating;
        });

        return NextResponse.json({ success: true, ratingId: result.id });
    } catch (error: any) {
        console.error('CRITICAL ERROR in POST ratings:', error);
        return NextResponse.json({ 
            error: `Error al procesar la calificación: ${error.message}` 
        }, { status: 500 });
    }
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const ratings = await prisma.rating.findMany({
            where: { appointmentId: id }
        });
        return NextResponse.json(ratings);
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener calificaciones' }, { status: 500 });
    }
}
