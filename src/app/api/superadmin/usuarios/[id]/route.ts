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

        let targetId = id;
        let existingUser = await prisma.usuario.findUnique({ where: { id: targetId } });

        // Si el usuario no existe directamente por ID (ej. ID sintético de negocio "admin_sneaker-wash-id" o ID de negocio)
        if (!existingUser) {
            const negocioId = targetId.startsWith('admin_') ? targetId.replace('admin_', '') : targetId;
            
            // Buscar si existe algún usuario administrador del negocio
            const foundUser = await prisma.usuario.findFirst({
                where: { negocioId }
            });

            if (foundUser) {
                targetId = foundUser.id;
                existingUser = foundUser;
            } else {
                // Si el negocio existe en DB, crear la cuenta de administrador automáticamente
                const negocio = await prisma.negocio.findUnique({
                    where: { id: negocioId },
                    select: { id: true, nombre: true, emailContacto: true, whatsapp: true }
                });

                if (negocio) {
                    const hashedPassword = password ? await bcrypt.hash(password, 10) : await bcrypt.hash("Acceso123456", 10);
                    const newUser = await prisma.usuario.create({
                        data: {
                            id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            nombre: nombre || negocio.nombre || 'Administrador',
                            email: (email ? email.toLowerCase() : (negocio.emailContacto ? negocio.emailContacto.toLowerCase() : `admin@${negocio.id}.com`)),
                            phone: phone || negocio.whatsapp || null,
                            password: hashedPassword,
                            role: role || 'ADMIN',
                            negocioId: negocio.id,
                            updatedAt: new Date()
                        }
                    });
                    return NextResponse.json({ success: true, usuario: newUser });
                } else {
                    return NextResponse.json({ error: "Usuario o negocio no encontrado" }, { status: 404 });
                }
            }
        }

        // ── Validación: teléfono único (excluye el mismo usuario) ───
        if (phone) {
            const phoneConflict = await prisma.usuario.findFirst({
                where: {
                    phone: phone,
                    NOT: { id: targetId }
                },
                include: { Negocio: { select: { nombre: true } } }
            });

            if (phoneConflict) {
                const negocioNombre = (phoneConflict as any).Negocio?.nombre;
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
                    NOT: { id: targetId }
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
            where: { id: targetId },
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
