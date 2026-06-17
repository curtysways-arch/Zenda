import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const { banco, numeroCuenta, nombreCuenta, logo, activo } = await req.json();

        const existingAccount = await prisma.paymentAccount.findUnique({ where: { id } });
        if (!existingAccount) {
            return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
        }

        const updatedAccount = await prisma.paymentAccount.update({
            where: { id },
            data: {
                banco: banco !== undefined ? banco : existingAccount.banco,
                numeroCuenta: numeroCuenta !== undefined ? numeroCuenta : existingAccount.numeroCuenta,
                nombreCuenta: nombreCuenta !== undefined ? nombreCuenta : existingAccount.nombreCuenta,
                logo: logo !== undefined ? logo : existingAccount.logo,
                activo: activo !== undefined ? activo : existingAccount.activo
            }
        });

        return NextResponse.json(updatedAccount);
    } catch (error) {
        console.error('Error updating payment account:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id } = await params;

        const existingAccount = await prisma.paymentAccount.findUnique({ where: { id } });
        if (!existingAccount) {
            return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
        }

        await prisma.paymentAccount.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Cuenta eliminada correctamente' });
    } catch (error) {
        console.error('Error deleting payment account:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
