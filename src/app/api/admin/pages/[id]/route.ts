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

        const { id: rawId } = await params;
        const id = rawId.trim();

        // Buscar usando Prisma ORM estándar
        const page = await prisma.page.findUnique({
            where: { id },
            include: {
                imageMedia: true
            }
        });

        if (!page) return new NextResponse('Not Found', { status: 404 });

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

        const { id: rawId } = await params;
        const id = rawId.trim();
        const { title, contentHtml, status, featuredImage, buttonText, buttonUrl, imageMediaId } = await req.json();

        const cleanHtml = DOMPurify.sanitize(contentHtml);
        const slug = slugify(title, { lower: true, strict: true });

        // Actualizar usando Prisma ORM estándar
        const updatedPage = await prisma.page.update({
            where: { id },
            data: {
                title,
                slug,
                contentHtml: cleanHtml,
                featuredImage: featuredImage || null,
                imageMediaId: imageMediaId || null,
                buttonText: buttonText || null,
                buttonUrl: buttonUrl || null,
                status: status || 'draft',
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ success: true, id: updatedPage.id });
    } catch (error: any) {
        console.error('[UPDATE_PAGE_ERROR]', error);
        return NextResponse.json({
            error: 'Error al actualizar la página',
            details: error.message,
            code: error.code
        }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const { id: rawId } = await params;
        const id = rawId.trim();

        // Eliminar usando Prisma ORM estándar
        await prisma.page.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DELETE_PAGE_ERROR]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
