
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        const userRoles = user.roles || [];
        const isSuperAdmin = userRoles.includes('SUPERADMIN') || user.role === 'SUPER_ADMIN';

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q");

        const usuarios = await (prisma as any).usuario.findMany({
            where: {
                // Si es superadmin ve todos, si no, solo los de su negocio
                ...(isSuperAdmin ? {} : { negocioId: negocioId }),
                ...(query ? {
                    OR: [
                        { nombre: { contains: query } },
                        { phone: { contains: query } },
                        { email: { contains: query } }
                    ]
                } : {})
            },
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            },
            orderBy: { nombre: 'asc' }
        });

        // Formatear para que el frontend reciba una lista plana de roles
        const formatted = usuarios.map((u: any) => ({
            ...u,
            password: "", // No enviar password
            roles: u.roles.map((ur: any) => ur.role.name)
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const body = await req.json();
        const { nombre, phone, email, roles } = body;

        if (!nombre || !phone) {
            return NextResponse.json({ error: "Nombre y teléfono son obligatorios" }, { status: 400 });
        }

        // Generar un email ficticio si no tiene, para cumplir con el unique del schema
        const finalEmail = email || `${phone}@cancha.com`;
        
        // Verificar si ya existe
        const existing = await prisma.usuario.findFirst({
            where: { 
                OR: [
                    { phone },
                    { email: finalEmail }
                ]
            }
        });

        if (existing) {
            return NextResponse.json({ error: "Ya existe un usuario con este teléfono o email" }, { status: 400 });
        }

        // Crear usuario
        const usuario = await prisma.usuario.create({
            data: {
                id: crypto.randomUUID(),
                nombre,
                phone,
                email: finalEmail,
                password: await bcrypt.hash(Math.random().toString(36), 10), // Password aleatorio por ahora
                negocioId,
                status: "active",
                auth_method: "otp",
                updatedAt: new Date()
            }
        });

        // Asignar roles
        if (roles && Array.isArray(roles)) {
            for (const roleName of roles) {
                const role = await (prisma as any).role.findUnique({ where: { name: roleName } });
                if (role) {
                    await (prisma as any).userRole.create({
                        data: {
                            user_id: usuario.id,
                            role_id: role.id
                        }
                    });
                }
            }
        }

        return NextResponse.json({ success: true, usuario });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
    }
}
