import { NextResponse } from 'next/server';
import { getNegocioBySlug } from '@/lib/services';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug') || 'arena';
        console.log("Testing getNegocioBySlug for:", slug);
        const negocio = await getNegocioBySlug(slug);
        return NextResponse.json({ success: true, data: negocio });
    } catch (e: any) {
        console.error("DIAGNOSTIC ERROR getNegocioBySlug:", e);
        return NextResponse.json({
            success: false,
            error: e.message,
            stack: e.stack,
            prisma_client_version: '7.4.1'
        }, { status: 500 });
    }
}
