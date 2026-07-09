/**
 * API Route: GET /api/superadmin/equipo/usuarios
 * Lista todos los usuarios del equipo con sus roles
 *
 * API Route: POST /api/superadmin/equipo/usuarios
 * Crea un nuevo usuario del equipo
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requirePermission, logAuditAction } from "@/lib/admin-permissions";

export async function GET(req: NextRequest) {
    const { session, error } = await requirePermission('EQUIPO_VER');
    if (error) return error;

    try {
        const usuarios = await prisma.adminUser.findMany({
            include: {
                rol: {
                    select: { id: true, nombre: true, color: true, icono: true, jerarquia: true }
                },
                equipo: {
                    select: { id: true, nombre: true, color: true }
                },
                _count: {
                    select: { loginHistory: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(usuarios.map(u => ({
            id: u.id,
            nombre: u.nombre,
            apellido: u.apellido,
            email: u.email,
            avatar: u.avatar,
            activo: u.activo,
            estado: u.estado,
            scope: u.scope,
            telefono: u.telefono,
            cargo: u.cargo,
            ultimaAccion: u.ultimaAccion,
            createdAt: u.createdAt,
            rol: u.rol,
            equipo: u.equipo,
            totalLogins: u._count.loginHistory,
        })));
    } catch (e: any) {
        console.error("GET /equipo/usuarios error:", e);
        return NextResponse.json({ error: "Error al obtener usuarios del equipo" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { session, error } = await requirePermission('EQUIPO_CREAR');
    if (error) return error;

    try {
        const body = await req.json();
        const { nombre, apellido, email, password, rolId, equipoId, cargo, telefono, scope, estado } = body;

        // Validaciones básicas
        if (!nombre || !email || !password || !rolId) {
            return NextResponse.json({ error: "Campos obligatorios: nombre, email, password, rolId" }, { status: 400 });
        }

        // Verificar que el email no exista
        const existing = await prisma.adminUser.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
        }

        // Verificar jerarquía: no puede crear un rol de igual o mayor jerarquía
        const miRol = await prisma.adminRole.findUnique({
            where: { nombre: session!.user.adminRolNombre || '' }
        });
        const targetRol = await prisma.adminRole.findUnique({ where: { id: rolId } });

        if (miRol && targetRol && targetRol.jerarquia <= miRol.jerarquia && miRol.jerarquia !== 1) {
            return NextResponse.json({ error: "No puedes crear usuarios con un rol de igual o mayor jerarquía." }, { status: 403 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await prisma.adminUser.create({
            data: {
                nombre,
                apellido: apellido || null,
                email,
                password: hashedPassword,
                rolId,
                equipoId: equipoId || null,
                cargo: cargo || null,
                telefono: telefono || null,
                scope: scope || 'GLOBAL',
                estado: estado || 'ACTIVO',
                activo: true,
            },
            include: {
                rol: { select: { id: true, nombre: true, color: true, icono: true } }
            }
        });

        await logAuditAction({
            adminUserId: session!.user.id,
            accion: 'CREAR_USUARIO',
            modulo: 'Equipo',
            descripcion: `Creó usuario del equipo: ${email}`,
            targetId: newUser.id,
            targetType: 'AdminUser',
            resultado: 'EXITOSO',
        });

        return NextResponse.json({ success: true, usuario: newUser }, { status: 201 });
    } catch (e: any) {
        console.error("POST /equipo/usuarios error:", e);
        return NextResponse.json({ error: "Error al crear usuario del equipo" }, { status: 500 });
    }
}
