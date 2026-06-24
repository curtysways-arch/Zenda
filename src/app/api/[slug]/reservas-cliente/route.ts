import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        // Leer token de cookie
        const cookieHeader = req.headers.get("cookie") || "";
        const tokenMatch = cookieHeader.match(/customer_token=([^;]+)/);
        const token = tokenMatch ? tokenMatch[1] : null;

        if (!token) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Verificar JWT
        let payload: any;
        try {
            const secret = new TextEncoder().encode(
                process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me"
            );
            const result = await jwtVerify(token, secret);
            payload = result.payload;
        } catch (jwtErr) {
            console.error("[reservas-cliente] JWT inválido:", jwtErr);
            return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });
        }

        const { telefono, negocioId, slug: tokenSlug } = payload;

        if (!telefono || !negocioId) {
            return NextResponse.json({ error: "Token incompleto" }, { status: 400 });
        }

        // Normalizar variaciones del teléfono
        const localTelefono = String(telefono).replace(/^\+(\d{1,4})/, '');
        const digitsOnly = String(telefono).replace(/\D/g, '');
        const localNoZero = localTelefono.replace(/^0+/, '');

        // DEBUG TEMPORAL - ver qué trae el JWT
        console.log(`[reservas-cliente] telefono=${telefono} negocioId=${negocioId} slug=${tokenSlug}`);
        console.log(`[reservas-cliente] localTelefono=${localTelefono} digitsOnly=${digitsOnly} localNoZero=${localNoZero}`);

        // Buscar clienteIds usando SQL flexible (LIKE para compatibilidad con distintos formatos)
        let clienteIdsList: string = "''";
        try {
            // Obtener todos los clientes que coincidan
            const clientes: any[] = await prisma.$queryRawUnsafe(
                `SELECT id FROM "Cliente" WHERE "negocioId" = '${negocioId}' AND (
                    telefono = '${telefono.replace(/'/g, "''")}' OR 
                    telefono = '${localTelefono.replace(/'/g, "''")}' OR 
                    telefono = '${digitsOnly}' OR
                    telefono LIKE '%${localNoZero}'
                )`
            );

            if (clientes.length > 0) {
                clienteIdsList = clientes.map(c => `'${c.id}'`).join(',');
            } else {
                // Fallback sin negocioId por si acaso
                const fallbackClientes: any[] = await prisma.$queryRawUnsafe(
                    `SELECT id FROM "Cliente" WHERE (
                        telefono = '${telefono.replace(/'/g, "''")}' OR 
                        telefono = '${localTelefono.replace(/'/g, "''")}' OR 
                        telefono = '${digitsOnly}' OR
                        telefono LIKE '%${localNoZero}'
                    )`
                );
                if (fallbackClientes.length > 0) {
                    clienteIdsList = fallbackClientes.map(c => `'${c.id}'`).join(',');
                } else {
                    return NextResponse.json([]); // No se encontró ningún cliente
                }
            }
        } catch (clienteErr) {
            console.error("[reservas-cliente] Error buscando cliente:", clienteErr);
            return NextResponse.json([]);
        }

        console.log(`[reservas-cliente] clienteIds encontrados: ${clienteIdsList}`);

        // Obtener reservas con SQL directo
        let reservas: any[] = [];
        try {
            reservas = await prisma.$queryRawUnsafe(`
                SELECT 
                    r.id, r.fecha, r."horaInicio", r."horaFin", r.estado, 
                    r.total, r."pagoEstado", r."metodoPago", r.comentarios,
                    r."serviceId", r."staffId", r."negocioId", r."clienteId",
                    r."createdAt", r."shareToken", r."checkedInAt", r."expiresAt"
                FROM "Reserva" r
                WHERE r."negocioId" = '${negocioId}' 
                AND r."clienteId" IN (${clienteIdsList})
                AND r.estado NOT IN ('expired', 'cancelled', 'RECHAZADA', 'CANCELADA', 'cancelada', 'rejected', 'expirada', 'EXPIRADA')
                ORDER BY r.fecha ASC
            `);
        } catch (reservasErr) {
            console.error("[reservas-cliente] Error obteniendo reservas:", reservasErr);
            return NextResponse.json([]);
        }

        if (reservas.length === 0) {
            return NextResponse.json([]);
        }

        // Enriquecer con datos del servicio y especialista
        const enriched = await Promise.all(
            reservas.map(async (r: any) => {
                let service: any = null;
                let staff: any = null;

                try {
                    if (r.serviceId) {
                        const serviceRows: any[] = await prisma.$queryRawUnsafe(
                            `SELECT id, nombre, precio FROM "Cancha" WHERE id = '${r.serviceId}' LIMIT 1`
                        );
                        if (serviceRows.length > 0) {
                            service = serviceRows[0];
                            // Imágenes del servicio (tabla Imagen, FK serviceId)
                            const imgRows: any[] = await prisma.$queryRawUnsafe(
                                `SELECT id, url FROM "Imagen" WHERE "serviceId" = '${r.serviceId}' LIMIT 3`
                            );
                            service.Imagen = imgRows;
                            service.imagenes = imgRows;
                        }
                    }
                } catch (e) {
                    console.error("Error fetching service for reserva", r.id, e);
                }

                try {
                    if (r.staffId) {
                        const staffRows: any[] = await prisma.$queryRawUnsafe(
                            `SELECT id, name, "avatarUrl" FROM "Staff" WHERE id = '${r.staffId}' LIMIT 1`
                        );
                        if (staffRows.length > 0) staff = staffRows[0];
                    }
                } catch (_) {}

                // Obtener calificaciones de la cita
                let ratings: any[] = [];
                try {
                    ratings = await prisma.$queryRawUnsafe(
                        `SELECT id, "raterRole", stars FROM "Rating" WHERE "appointmentId" = '${r.id}'`
                    );
                } catch (_) {}

                return {
                    ...r,
                    Service: service,
                    service: service,
                    Staff: staff,
                    staff: staff,
                    ratings: ratings,
                    fecha: r.fecha instanceof Date ? r.fecha.toISOString() : String(r.fecha)
                };
            })
        );

        return NextResponse.json(enriched);

    } catch (error: any) {
        console.error("[reservas-cliente] Error crítico:", error?.message || error);
        // En caso de error total, devolver array vacío en lugar de 500
        // para que el usuario pueda ver su sesión aunque no haya reservas
        return NextResponse.json([]);
    }
}
