import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const businessId = (session.user as any).negocioId;
        if (!businessId) return new NextResponse('No business ID', { status: 400 });

        const subscribers = await (prisma as any).subscriber.findMany({
            where: { negocioId: businessId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(subscribers);
    } catch (error) {
        console.error('[GET_SUBSCRIBERS_ERROR]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return new NextResponse('Subscriber ID required', { status: 400 });

        await (prisma as any).subscriber.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DELETE_SUBSCRIBER_ERROR]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
