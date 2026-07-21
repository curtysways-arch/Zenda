import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
        return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
    }

    try {
        const categorias = await (prisma as any).categoriaProducto.findMany({
            where: { negocioId },
            orderBy: { orden: 'asc' }
        });
        return NextResponse.json(categorias);
    } catch (e) {
        console.error('[API_CATEGORIAS_GET]', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
        return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { nombre, activo, orden } = body;
        if (!nombre) {
            return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
        }

        const nuevaCategoria = await (prisma as any).categoriaProducto.create({
            data: {
                nombre,
                activo: activo !== undefined ? activo : true,
                orden: orden || 0,
                negocioId
            }
        });

        return NextResponse.json(nuevaCategoria);
    } catch (e) {
        console.error('[API_CATEGORIAS_POST]', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const negocioId = (session.user as any).negocioId;

    try {
        const body = await req.json();
        const { id, nombre, activo, orden } = body;
        if (!id || !nombre) {
            return NextResponse.json({ error: 'El ID y el nombre son obligatorios' }, { status: 400 });
        }

        // Validar propiedad del negocio
        const cat = await (prisma as any).categoriaProducto.findUnique({ where: { id } });
        if (!cat || cat.negocioId !== negocioId) {
            return NextResponse.json({ error: 'No autorizado o categoría no encontrada' }, { status: 403 });
        }

        const catActualizada = await (prisma as any).categoriaProducto.update({
            where: { id },
            data: { 
                nombre, 
                activo: activo !== undefined ? activo : true, 
                orden: orden || 0 
            }
        });

        return NextResponse.json(catActualizada);
    } catch (e) {
        console.error('[API_CATEGORIAS_PUT]', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const negocioId = (session.user as any).negocioId;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'El ID es obligatorio' }, { status: 400 });
    }

    try {
        const cat = await (prisma as any).categoriaProducto.findUnique({ where: { id } });
        if (!cat || cat.negocioId !== negocioId) {
            return NextResponse.json({ error: 'No autorizado o categoría no encontrada' }, { status: 403 });
        }

        await (prisma as any).categoriaProducto.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[API_CATEGORIAS_DELETE]', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
