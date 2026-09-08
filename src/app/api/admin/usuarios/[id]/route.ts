
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const user = await (prisma as any).usuario.findFirst({
            where: { id, negocioId },
            include: {
                UserRole: {
                    include: { Role: true }
                },
                branchAccesses: {
                    select: { branchId: true }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        let parsedModules: string[] | null = null;
        if (user.allowedModules) {
            try {
                parsedModules = JSON.parse(user.allowedModules);
            } catch {
                parsedModules = null;
            }
        }

        const formatted = {
            ...user,
            password: "",
            roles: (user.UserRole || []).map((ur: any) => ur.Role?.name || ""),
            branches: (user.branchAccesses || []).map((ba: any) => ba.branchId),
            allowedModules: parsedModules
        };

        return NextResponse.json(formatted);
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 });
    }
}

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
        const { nombre, phone, email, roles, branches, allowedModules } = body;

        // Verificar que el usuario pertenece al negocio
        const user = await prisma.usuario.findFirst({
            where: { id, negocioId }
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const updateData: any = {
            nombre: nombre !== undefined ? nombre : user.nombre,
            phone: phone !== undefined ? phone : user.phone,
            email: email !== undefined ? email : user.email
        };

        if (allowedModules !== undefined) {
            updateData.allowedModules = Array.isArray(allowedModules) && allowedModules.length > 0 
                ? JSON.stringify(allowedModules) 
                : null;
        }

        // Actualizar datos básicos
        await prisma.usuario.update({
            where: { id },
            data: updateData
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

        // Sincronizar asignaciones de sucursales si se especifican
        if (branches !== undefined && Array.isArray(branches) && negocioId) {
            await (prisma as any).branchAccess.deleteMany({
                where: {
                    userId: id,
                    businessId: negocioId
                }
            });

            for (const branchId of branches) {
                await (prisma as any).branchAccess.create({
                    data: {
                        userId: id,
                        branchId,
                        businessId: negocioId,
                        role: roles?.[0] || 'STAFF',
                        active: true
                    }
                });
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
