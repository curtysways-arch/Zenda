import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;

        if (!id) {
            return NextResponse.json(
                { error: 'ID de promoción requerido' },
                { status: 400 }
            );
        }

        // Incrementar el contador usando modo transaccional o atómico
        const updatedPromotion = await prisma.promotion.update({
            where: { id },
            data: {
                shareCount: {
                    increment: 1,
                },
            },
        });

        return NextResponse.json({
            success: true,
            shareCount: updatedPromotion.shareCount,
        });

    } catch (error: any) {
        console.error('Error al incrementar shareCount de promoción:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor al incrementar log' },
            { status: 500 }
        );
    }
}
