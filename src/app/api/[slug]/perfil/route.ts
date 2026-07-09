import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

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

        const telefono = payload.telefono as string;
        const negocioId = payload.negocioId as string;
        const tokenSlug = payload.slug as string;

        if (tokenSlug !== slug) {
            return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
        }

        // Variaciones del teléfono para máxima compatibilidad
        const localTelefono = telefono.replace(/^\+(\d{1,4})/, ''); 
        const digitsOnly = telefono.replace(/\D/g, ''); 
        const localNoZero = localTelefono.replace(/^0+/, '');

        const cliente = await prisma.cliente.findFirst({
            where: {
                negocioId: negocioId,
                OR: [
                    { telefono: telefono },
                    { telefono: localTelefono },
                    { telefono: digitsOnly },
                    { telefono: { endsWith: localNoZero } }
                ]
            }
        });

        if (!cliente) {
            return NextResponse.json({ 
                telefono: telefono,
                enrollments: [],
                stats: { partidosJugados: 0, goles: 0, reservasTotales: 0 }
            });
        }

        // --- CÁLCULO DE ESTADÍSTICAS SPA ---
        
        // 1. Sesiones de bienestar totales
        const totalReservas = await prisma.appointment.count({
            where: { 
                clienteId: cliente.id,
                estado: { in: ['confirmed', 'confirmada', 'approved'] }
            }
        });

        // Buscar inscripciones a cursos de bienestar
        const p = prisma as any;
        const enrollments = await p.CourseEnrollment.findMany({
            where: {
                businessId: negocioId,
                OR: [
                    { guardian_phone: telefono },
                    { guardian_phone: localTelefono },
                    { guardian_phone: digitsOnly },
                    { guardian_phone: { endsWith: localNoZero } }
                ]
            },
            include: {
                Course: {
                    include: {
                        CourseSchedule: true
                    }
                }
            },
            orderBy: {
                enrollment_date: 'desc'
            }
        });

        const mappedEnrollments = enrollments.map((en: any) => ({
            ...en,
            course: {
                ...en.Course,
                schedules: en.Course?.CourseSchedule || []
            }
        }));

        const roles = (payload.roles as string[]) || ['USER'];

        return NextResponse.json({
            ...cliente,
            telefono,
            roles,
            enrollments: mappedEnrollments,
            stats: {
                reservasTotales: totalReservas
            }
        });
    } catch (error) {
        console.error("Error fetching client profile:", error);
        return NextResponse.json({ error: "No se pudo cargar el perfil" }, { status: 500 });
    }
}

export async function PATCH(
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

        const telefono = payload.telefono as string;
        const negocioId = payload.negocioId as string;
        const tokenSlug = payload.slug as string;

        if (tokenSlug !== slug) {
            return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
        }

        const body = await req.json();
        const { nombre, email, imagenUrl, fechaNacimiento } = body;

        // Buscar al cliente usando las mismas variaciones para evitar "Cliente no encontrado"
        const localTelefono = telefono.replace(/^\+(\d{1,4})/, ''); 
        const digitsOnly = telefono.replace(/\D/g, ''); 
        const localNoZero = localTelefono.replace(/^0+/, '');

        let cliente = await prisma.cliente.findFirst({
            where: {
                negocioId: negocioId,
                OR: [
                    { telefono: telefono },
                    { telefono: localTelefono },
                    { telefono: digitsOnly },
                    { telefono: { endsWith: localNoZero } }
                ]
            }
        });

        // Si no existe el registro de cliente para este negocio, lo creamos
        if (!cliente) {
            cliente = await prisma.cliente.create({
                data: {
                    id: crypto.randomUUID(),
                    nombre: nombre || "Usuario",
                    telefono: telefono,
                    email: email || null,
                    imagenUrl: imagenUrl || null,
                    fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
                    updatedAt: new Date(),
                    Negocio: { connect: { id: negocioId } }
                }
            });
        } else {
            // Si existe, lo actualizamos
            cliente = await prisma.cliente.update({
                where: { id: cliente.id },
                data: {
                    nombre: nombre !== undefined ? nombre : cliente.nombre,
                    email: email !== undefined ? email : cliente.email,
                    imagenUrl: imagenUrl !== undefined ? imagenUrl : cliente.imagenUrl,
                    fechaNacimiento: fechaNacimiento !== undefined ? (fechaNacimiento ? new Date(fechaNacimiento) : null) : cliente.fechaNacimiento
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: "Perfil actualizado correctamente",
            cliente: cliente
        });
    } catch (error) {
        console.error("Error updating client profile:", error);
        return NextResponse.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
    }
}
