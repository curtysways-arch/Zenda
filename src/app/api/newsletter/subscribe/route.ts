import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { email, negocioId } = await req.json();

        if (!email || !negocioId) {
            return NextResponse.json({ error: 'Email y NegocioID son requeridos' }, { status: 400 });
        }

        // Validar formato de email simple
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
        }

        // Crear o ignorar si ya existe (upsert manual o findFirst + create)
        const existing = await (prisma as any).subscriber.findUnique({
            where: {
                email_negocioId: {
                    email,
                    negocioId
                }
            }
        });

        if (existing) {
            return NextResponse.json({ message: 'Ya estás suscrito' });
        }

        await (prisma as any).subscriber.create({
            data: {
                email,
                negocioId
            }
        });

        return NextResponse.json({ success: true, message: 'Suscripción exitosa' });
    } catch (error) {
        console.error('Newsletter error:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
