/**
 * API Route: PATCH /api/superadmin/equipo/roles/[id]
 * Actualiza un rol (nombre, color, permisos)
 *
 * API Route: DELETE /api/superadmin/equipo/roles/[id]
 * Elimina un rol (solo si no tiene usuarios asignados)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission, canManageRoleByHierarchy, logAuditAction } from "@/lib/admin-permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { session, error } = await requirePermission('EQUIPO_ROLES');
    if (error) return error;

    try {
        const body = await req.json();
        const { nombre, descripcion, color, icono, jerarquia, activo, permisoCodigos } = body;

        const existingRol = await prisma.adminRole.findUnique({ where: { id } });
        if (!existingRol) {
            return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
        }

        // No puede editar el rol Propietario (jerarquía 1) a menos que seas propietario
        if (existingRol.jerarquia === 1 && session!.user.adminRolJerarquia !== 1) {
            return NextResponse.json({ error: "Solo el Propietario puede editar el rol de Propietario." }, { status: 403 });
        }

        // Verificar jerarquía
        if (!canManageRoleByHierarchy(session, existingRol.jerarquia)) {
            return NextResponse.json({ error: "No tienes jerarquía suficiente para editar este rol." }, { status: 403 });
        }

        const updateData: any = {};
        if (nombre !== undefined) updateData.nombre = nombre;
        if (descripcion !== undefined) updateData.descripcion = descripcion;
        if (color !== undefined) updateData.color = color;
        if (icono !== undefined) updateData.icono = icono;
        if (jerarquia !== undefined) updateData.jerarquia = jerarquia;
        if (activo !== undefined) updateData.activo = activo;

        await prisma.adminRole.update({ where: { id }, data: updateData });

        // Actualizar permisos si se proporcionan
        if (permisoCodigos !== undefined && Array.isArray(permisoCodigos)) {
            // Eliminar permisos actuales
            await prisma.adminRolePermission.deleteMany({ where: { rolId: id } });

            if (permisoCodigos.length > 0) {
                const permisos = await prisma.adminPermission.findMany({
                    where: { codigo: { in: permisoCodigos } }
                });
                await prisma.adminRolePermission.createMany({
                    data: permisos.map(p => ({ rolId: id, permisoId: p.id }))
                });
            }
        }

        await logAuditAction({
            adminUserId: session!.user.id,
            accion: 'EDITAR_ROL',
            modulo: 'Equipo',
            descripcion: `Editó rol: ${existingRol.nombre}`,
            targetId: id,
            targetType: 'AdminRole',
            datos: body,
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("PATCH /equipo/roles/[id] error:", e);
        return NextResponse.json({ error: "Error al actualizar rol" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { session, error } = await requirePermission('EQUIPO_ROLES');
    if (error) return error;

    try {
        const existingRol = await prisma.adminRole.findUnique({
            where: { id },
            include: { _count: { select: { usuarios: true } } }
        });
        if (!existingRol) {
            return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
        }

        if (existingRol.jerarquia === 1) {
            return NextResponse.json({ error: "No se puede eliminar el rol de Propietario." }, { status: 403 });
        }

        if (existingRol._count.usuarios > 0) {
            return NextResponse.json({
                error: `Este rol tiene ${existingRol._count.usuarios} usuario(s) asignado(s). Reasigna antes de eliminarlo.`
            }, { status: 409 });
        }

        if (!canManageRoleByHierarchy(session, existingRol.jerarquia)) {
            return NextResponse.json({ error: "No tienes jerarquía suficiente para eliminar este rol." }, { status: 403 });
        }

        // Eliminar permisos del rol primero
        await prisma.adminRolePermission.deleteMany({ where: { rolId: id } });
        await prisma.adminRole.delete({ where: { id } });

        await logAuditAction({
            adminUserId: session!.user.id,
            accion: 'ELIMINAR_ROL',
            modulo: 'Equipo',
            descripcion: `Eliminó rol: ${existingRol.nombre}`,
            targetType: 'AdminRole',
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("DELETE /equipo/roles/[id] error:", e);
        return NextResponse.json({ error: "Error al eliminar rol" }, { status: 500 });
    }
}
