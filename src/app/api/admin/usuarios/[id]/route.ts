
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const body = await req.json();
        const { nombre, phone, email, roles } = body;

        // Verificar que el usuario pertenece al negocio
        const user = await prisma.usuario.findFirst({
            where: { id, negocioId }
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // Actualizar datos básicos
        await prisma.usuario.update({
            where: { id },
            data: {
                nombre: nombre || user.nombre,
                phone: phone || user.phone,
                email: email || user.email
            }
        });

        // Actualizar roles si se proporcionan
        if (roles && Array.isArray(roles)) {
            // 1. Eliminar roles actuales
            await prisma.userRole.deleteMany({
                where: { user_id: id }
            });

            // 2. Insertar nuevos roles
            for (const roleName of roles) {
                const role = await prisma.role.findUnique({ where: { name: roleName } });
                if (role) {
                    await prisma.userRole.create({
                        data: {
                            user_id: id,
                            role_id: role.id
                        }
                    });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const negocioId = (session.user as any).negocioId;

        // Verificar que el usuario pertenece al negocio
        const user = await prisma.usuario.findFirst({
            where: { id, negocioId }
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        await prisma.usuario.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 });
    }
}
