import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Protección mínima: no permitir borrar al usuario con email de superadmin conocido
        const target = await prisma.usuario.findUnique({ where: { id }, select: { role: true } });
        if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

        await prisma.usuario.delete({ where: { id } });
        return NextResponse.json({ message: "Usuario eliminado" });
    } catch (error) {
        return NextResponse.json({ error: "Error al eliminar el usuario" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { nombre, email, phone, role, password } = body;

        // ── Validación: teléfono único (excluye el mismo usuario) ───
        if (phone) {
            const phoneConflict = await prisma.usuario.findFirst({
                where: {
                    phone: phone,
                    NOT: { id }
                },
                include: { negocio: { select: { nombre: true } } }
            });

            if (phoneConflict) {
                const negocioNombre = (phoneConflict as any).negocio?.nombre;
                const msg = negocioNombre
                    ? `Ese número ya está registrado en el negocio "${negocioNombre}"`
                    : `Ese número ya está registrado con otro usuario`;
                return NextResponse.json({ error: msg }, { status: 400 });
            }
        }

        // ── Validación: email único (excluye el mismo usuario) ──────
        if (email) {
            const emailConflict = await prisma.usuario.findFirst({
                where: {
                    email: email.toLowerCase(),
                    NOT: { id }
                },
                select: { id: true }
            });
            if (emailConflict) {
                return NextResponse.json({ error: "Ese email ya está registrado en otra cuenta" }, { status: 400 });
            }
        }

        // ── Actualizar ──────────────────────────────────────────────
        const updateData: any = {};
        if (nombre !== undefined) updateData.nombre = nombre;
        if (email !== undefined) updateData.email = email.toLowerCase();
        if (phone !== undefined) updateData.phone = phone || null;
        if (role !== undefined) updateData.role = role;
        if (password) {
            if (password.length < 6) {
                return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
            }
            updateData.password = await bcrypt.hash(password, 10);
        }

        const usuario = await prisma.usuario.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ success: true, usuario });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            const field = error?.meta?.target?.includes('email') ? 'email' : 'teléfono';
            return NextResponse.json({ error: `Ese ${field} ya está registrado` }, { status: 400 });
        }
        console.error('[PATCH usuario]', error);
        return NextResponse.json({ error: "Error al actualizar el usuario" }, { status: 500 });
    }
}
