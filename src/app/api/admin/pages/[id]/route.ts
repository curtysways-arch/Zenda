import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import slugify from 'slugify';
import DOMPurify from 'isomorphic-dompurify';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const { id } = await params;

        // Bypass Prisma cache using raw query
        const pages: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM Page WHERE id = '${id}' LIMIT 1`
        );

        if (pages.length === 0) return new NextResponse('Not Found', { status: 404 });

        const page = pages[0];
        if (page.imageMediaId) {
            page.imageMedia = await prisma.media.findUnique({ where: { id: page.imageMediaId } });
        } else {
            page.imageMedia = null;
        }

        return NextResponse.json(page);
    } catch (error) {
        console.error('[GET_PAGE_ID_ERROR]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const { id } = await params;
        const { title, contentHtml, status, featuredImage, buttonText, buttonUrl, imageMediaId } = await req.json();

        const cleanHtml = DOMPurify.sanitize(contentHtml);
        const slug = slugify(title, { lower: true, strict: true });

        // Usar SQL directo para evitar problemas de sincronización con Prisma Client
        await prisma.$executeRawUnsafe(
            `UPDATE Page SET 
                title = '${title.replace(/'/g, "''")}', 
                slug = '${slug}', 
                contentHtml = '${cleanHtml.replace(/'/g, "''")}', 
                featuredImage = ${featuredImage ? `'${featuredImage}'` : 'NULL'}, 
                imageMediaId = ${imageMediaId ? `'${imageMediaId}'` : 'NULL'}, 
                buttonText = ${buttonText ? `'${buttonText.replace(/'/g, "''")}'` : 'NULL'}, 
                buttonUrl = ${buttonUrl ? `'${buttonUrl.replace(/'/g, "''")}'` : 'NULL'}, 
                status = '${status}',
                updatedAt = CURRENT_TIMESTAMP
             WHERE id = '${id}'`
        );

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        console.error('[UPDATE_PAGE_ERROR]', error);
        return NextResponse.json({
            error: 'Error al actualizar mediante SQL',
            details: error.message,
            code: error.code
        }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const { id } = await params;

        await prisma.$executeRawUnsafe(`DELETE FROM Page WHERE id = '${id}'`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DELETE_PAGE_ERROR]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
