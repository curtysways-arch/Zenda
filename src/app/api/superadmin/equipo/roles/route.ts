/**
 * API Route: GET /api/superadmin/equipo/roles
 * Lista todos los roles con sus permisos
 *
 * API Route: POST /api/superadmin/equipo/roles
 * Crea un nuevo rol
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission, logAuditAction } from "@/lib/admin-permissions";

export async function GET(req: NextRequest) {
    const { session, error } = await requirePermission('EQUIPO_VER');
    if (error) return error;

    try {
        const roles = await prisma.adminRole.findMany({
            include: {
                permisos: {
                    include: {
                        permiso: {
                            select: { id: true, codigo: true, nombre: true, modulo: true, accion: true, critico: true }
                        }
                    }
                },
                _count: { select: { usuarios: true } }
            },
            orderBy: { jerarquia: 'asc' }
        });

        return NextResponse.json(roles.map(r => ({
            id: r.id,
            nombre: r.nombre,
            descripcion: r.descripcion,
            color: r.color,
            icono: r.icono,
            jerarquia: r.jerarquia,
            activo: r.activo,
            createdAt: r.createdAt,
            totalUsuarios: r._count.usuarios,
            permisos: r.permisos.map(rp => rp.permiso),
        })));
    } catch (e: any) {
        console.error("GET /equipo/roles error:", e);
        return NextResponse.json({ error: "Error al obtener roles" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { session, error } = await requirePermission('EQUIPO_ROLES');
    if (error) return error;

    try {
        const body = await req.json();
        const { nombre, descripcion, color, icono, jerarquia, permisoCodigos } = body;

        if (!nombre || !jerarquia) {
            return NextResponse.json({ error: "Campos obligatorios: nombre, jerarquia" }, { status: 400 });
        }

        // No puede crear roles con jerarquía igual o menor (más poderosa) que la propia
        const myRol = await prisma.adminRole.findFirst({
            where: { nombre: session!.user.adminRolNombre || '' }
        });
        if (myRol && myRol.jerarquia !== 1 && jerarquia <= myRol.jerarquia) {
            return NextResponse.json({ error: "No puedes crear un rol con jerarquía igual o superior a la tuya." }, { status: 403 });
        }

        const rol = await prisma.adminRole.create({
            data: {
                nombre,
                descripcion: descripcion || null,
                color: color || '#6366f1',
                icono: icono || 'User',
                jerarquia,
                activo: true,
            }
        });

        // Asignar permisos
        if (permisoCodigos && Array.isArray(permisoCodigos) && permisoCodigos.length > 0) {
            const permisos = await prisma.adminPermission.findMany({
                where: { codigo: { in: permisoCodigos } }
            });

            await prisma.adminRolePermission.createMany({
                data: permisos.map(p => ({ rolId: rol.id, permisoId: p.id }))
            });
        }

        await logAuditAction({
            adminUserId: session!.user.id,
            accion: 'CREAR_ROL',
            modulo: 'Equipo',
            descripcion: `Creó rol: ${nombre}`,
            targetId: rol.id,
            targetType: 'AdminRole',
        });

        return NextResponse.json({ success: true, rol }, { status: 201 });
    } catch (e: any) {
        console.error("POST /equipo/roles error:", e);
        return NextResponse.json({ error: "Error al crear rol" }, { status: 500 });
    }
}
