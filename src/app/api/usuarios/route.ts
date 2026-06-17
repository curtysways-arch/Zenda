import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const negocioId = (session.user as any).negocioId;
        const usuarios = await prisma.usuario.findMany({
            where: { negocioId },
            select: {
                id: true,
                nombre: true,
                email: true,
                role: true,
                createdAt: true
            }
        });

        return NextResponse.json(usuarios);
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const negocioId = (session.user as any).negocioId;
        const { nombre, email, password, role } = await req.json();

        const existingUser = await prisma.usuario.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const usuario = await prisma.usuario.create({
            data: {
                id: crypto.randomUUID(),
                nombre,
                email,
                password: hashedPassword,
                role: role || 'STAFF',
                negocioId,
                updatedAt: new Date()
            }
        });

        const { password: _, ...userWithoutPassword } = usuario;
        return NextResponse.json(userWithoutPassword);
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
    }
}
