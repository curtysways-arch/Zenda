import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const accounts = await prisma.paymentAccount.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(accounts);
    } catch (error) {
        console.error('Error fetching payment accounts:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { banco, numeroCuenta, nombreCuenta, logo, activo } = await req.json();

        if (!banco || !numeroCuenta || !nombreCuenta) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        const account = await prisma.paymentAccount.create({
            data: {
                id: crypto.randomUUID(),
                banco,
                numeroCuenta,
                nombreCuenta,
                logo: logo || null,
                activo: activo !== undefined ? activo : true,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(account);
    } catch (error) {
        console.error('Error creating payment account:', error);
        return NextResponse.json({ error: 'Error interno al crear la cuenta' }, { status: 500 });
    }
}
