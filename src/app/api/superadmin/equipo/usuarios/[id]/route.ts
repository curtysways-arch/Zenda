/**
 * API Route: PATCH /api/superadmin/equipo/usuarios/[id]
 * Actualiza un usuario del equipo
 *
 * API Route: DELETE /api/superadmin/equipo/usuarios/[id]
 * Elimina un usuario del equipo
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requirePermission, canManageRoleByHierarchy, logAuditAction } from "@/lib/admin-permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { session, error } = await requirePermission('EQUIPO_EDITAR');
    if (error) return error;

    try {
        const body = await req.json();
        const { nombre, apellido, cargo, telefono, equipoId, rolId, estado, activo, password } = body;

        // Obtener usuario objetivo
        const targetUser = await prisma.adminUser.findUnique({
            where: { id },
            include: { rol: { select: { jerarquia: true } } }
        });
        if (!targetUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // Verificar jerarquía
        if (!canManageRoleByHierarchy(session, targetUser.rol?.jerarquia || 999)) {
            return NextResponse.json({ error: "No tienes jerarquía suficiente para editar este usuario." }, { status: 403 });
        }

        const updateData: any = {};
        if (nombre !== undefined) updateData.nombre = nombre;
        if (apellido !== undefined) updateData.apellido = apellido;
        if (cargo !== undefined) updateData.cargo = cargo;
        if (telefono !== undefined) updateData.telefono = telefono;
        if (equipoId !== undefined) updateData.equipoId = equipoId || null;
        if (estado !== undefined) updateData.estado = estado;
        if (activo !== undefined) updateData.activo = activo;

        // Cambiar rol si se especificó
        if (rolId !== undefined) {
            const newRol = await prisma.adminRole.findUnique({ where: { id: rolId } });
            if (!newRol) return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
            if (!canManageRoleByHierarchy(session, newRol.jerarquia)) {
                return NextResponse.json({ error: "No puedes asignar un rol de igual o mayor jerarquía al tuyo." }, { status: 403 });
            }
            updateData.rolId = rolId;
        }

        // Cambiar contraseña si se especificó
        if (password) {
            updateData.password = await bcrypt.hash(password, 12);
        }

        const updated = await prisma.adminUser.update({
            where: { id },
            data: updateData,
            include: {
                rol: { select: { id: true, nombre: true, color: true, icono: true } }
            }
        });

        await logAuditAction({
            adminUserId: session!.user.id,
            accion: 'EDITAR_USUARIO',
            modulo: 'Equipo',
            descripcion: `Editó usuario del equipo: ${targetUser.email}`,
            targetId: id,
            targetType: 'AdminUser',
            datos: body,
        });

        return NextResponse.json({ success: true, usuario: updated });
    } catch (e: any) {
        console.error("PATCH /equipo/usuarios/[id] error:", e);
        return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { session, error } = await requirePermission('EQUIPO_ELIMINAR');
    if (error) return error;

    try {
        // No puede eliminarse a sí mismo
        if (id === session!.user.id) {
            return NextResponse.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 400 });
        }

        const targetUser = await prisma.adminUser.findUnique({
            where: { id },
            include: { rol: { select: { jerarquia: true, nombre: true } } }
        });
        if (!targetUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // No se puede eliminar al Propietario
        if (targetUser.rol?.jerarquia === 1) {
            return NextResponse.json({ error: "No se puede eliminar al usuario Propietario." }, { status: 403 });
        }

        // Verificar jerarquía
        if (!canManageRoleByHierarchy(session, targetUser.rol?.jerarquia || 999)) {
            return NextResponse.json({ error: "No tienes jerarquía suficiente para eliminar este usuario." }, { status: 403 });
        }

        // Soft delete: marcar como inactivo en lugar de eliminar
        await prisma.adminUser.update({
            where: { id },
            data: { activo: false, estado: 'BLOQUEADO' }
        });

        await logAuditAction({
            adminUserId: session!.user.id,
            accion: 'ELIMINAR_USUARIO',
            modulo: 'Equipo',
            descripcion: `Desactivó usuario del equipo: ${targetUser.email}`,
            targetId: id,
            targetType: 'AdminUser',
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("DELETE /equipo/usuarios/[id] error:", e);
        return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 });
    }
}
