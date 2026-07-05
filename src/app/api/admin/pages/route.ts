import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import slugify from 'slugify';
import DOMPurify from 'isomorphic-dompurify';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const businessId = (session.user as any).negocioId;
        if (!businessId) return new NextResponse('No business ID', { status: 400 });

        const pages = (await prisma.$queryRawUnsafe(
            `SELECT id, businessId, title, slug, status, featuredImage, imageMediaId, updatedAt FROM Page WHERE businessId = '${businessId}' ORDER BY updatedAt DESC`
        )) as any[];

        // Para cada página, si tiene imageMediaId, obtener el objeto Media y adjuntarlo
        const mediaIds = pages.filter(p => p.imageMediaId).map(p => p.imageMediaId);
        const medias = mediaIds.length > 0 
            ? await prisma.media.findMany({ where: { id: { in: mediaIds } } })
            : [];
        const mediaMap = new Map(medias.map(m => [m.id, m]));

        const result = pages.map(p => ({
            ...p,
            imageMedia: p.imageMediaId ? mediaMap.get(p.imageMediaId) : null
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('[GET_PAGES_ERROR]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const businessId = (session.user as any).negocioId;
        if (!businessId) return new NextResponse('No business ID', { status: 400 });

        const { title, contentHtml, status, featuredImage, buttonText, buttonUrl, imageMediaId } = await req.json();

        if (!title || !contentHtml) {
            return NextResponse.json({ error: 'Título y contenido son requeridos' }, { status: 400 });
        }

        const baseSlug = slugify(title, { lower: true, strict: true });

        // Sanitizar el HTML antes de guardar
        const cleanHtml = DOMPurify.sanitize(contentHtml);
        const id = `cm${Math.random().toString(36).substring(2, 23)}`; // Generar un ID simple compatible

        // Utilizar Prisma ORM pasando explícitamente createdAt y updatedAt
        await prisma.page.create({
            data: {
                id,
                businessId,
                title,
                slug: baseSlug,
                contentHtml: cleanHtml,
                featuredImage: featuredImage || null,
                imageMediaId: imageMediaId || null,
                buttonText: buttonText || null,
                buttonUrl: buttonUrl || null,
                status: status || 'draft',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ id, title, slug: baseSlug });
    } catch (error: any) {
        console.error('[POST_PAGES_ERROR]', error);

        if (error.message?.includes('Unique constraint') || error.code === 'P2002') {
            return NextResponse.json({ error: 'Ya existe una página con un título similar' }, { status: 400 });
        }

        return NextResponse.json({
            error: 'Error al crear la página',
            details: error.message,
            code: error.code
        }, { status: 500 });
    }
}
