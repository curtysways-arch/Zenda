import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

export async function GET() {
    try {
        const session = await getServerSession();
        const negocioId = (session?.user as any)?.negocioId;
        if (!negocioId) return NextResponse.json([]);

        let tipos = [];
        try {
            tipos = await (prisma as any).tipoCancha.findMany({
                where: { negocioId },
                orderBy: { nombre: 'asc' }
            });
        } catch (e) {}

        return NextResponse.json(tipos);
    } catch (error) {
        return NextResponse.json([]);
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        const negocioId = (session?.user as any)?.negocioId;
        const body = await req.json();
        const { nombre, precioDefecto, capacidadDefecto } = body;

        if (!nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });

        const tipo = await (prisma as any).tipoCancha.create({
            data: {
                nombre,
                precioDefecto: precioDefecto ? parseFloat(precioDefecto) : null,
                capacidadDefecto: capacidadDefecto ? parseInt(capacidadDefecto) : null,
                negocioId
            }
        });

        return NextResponse.json(tipo);
    } catch (error) {
        console.error('Error creating court type:', error);
        return NextResponse.json({ error: 'Error al crear tipo de cancha' }, { status: 500 });
    }
}
