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
        const productos = await (prisma as any).producto.findMany({
            where: { negocioId },
            include: { categoria: true },
            orderBy: { orden: 'asc' }
        });
        return NextResponse.json(productos);
    } catch (e) {
        console.error('[API_PRODUCTOS_GET]', e);
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
        const { nombre, descripcion, precio, imagenUrl, activo, stock, orden, categoriaId } = body;
        
        if (!nombre || precio === undefined) {
            return NextResponse.json({ error: 'El nombre y precio son obligatorios' }, { status: 400 });
        }

        const nuevoProducto = await (prisma as any).producto.create({
            data: {
                nombre,
                descripcion,
                precio: parseFloat(precio),
                imagenUrl: imagenUrl || null,
                activo: activo !== undefined ? activo : true,
                stock: stock !== undefined && stock !== null && stock !== '' ? parseInt(stock) : null,
                orden: orden || 0,
                categoriaId: categoriaId || null,
                negocioId
            }
        });

        return NextResponse.json(nuevoProducto);
    } catch (e) {
        console.error('[API_PRODUCTOS_POST]', e);
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
        const { id, nombre, descripcion, precio, imagenUrl, activo, stock, orden, categoriaId } = body;
        
        if (!id || !nombre || precio === undefined) {
            return NextResponse.json({ error: 'El ID, nombre y precio son obligatorios' }, { status: 400 });
        }

        // Validar propiedad del negocio
        const prod = await (prisma as any).producto.findUnique({ where: { id } });
        if (!prod || prod.negocioId !== negocioId) {
            return NextResponse.json({ error: 'No autorizado o producto no encontrado' }, { status: 403 });
        }

        const prodActualizado = await (prisma as any).producto.update({
            where: { id },
            data: {
                nombre,
                descripcion,
                precio: parseFloat(precio),
                imagenUrl: imagenUrl || null,
                activo: activo !== undefined ? activo : true,
                stock: stock !== undefined && stock !== null && stock !== '' ? parseInt(stock) : null,
                orden: orden || 0,
                categoriaId: categoriaId || null
            }
        });

        return NextResponse.json(prodActualizado);
    } catch (e) {
        console.error('[API_PRODUCTOS_PUT]', e);
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
        const prod = await (prisma as any).producto.findUnique({ where: { id } });
        if (!prod || prod.negocioId !== negocioId) {
            return NextResponse.json({ error: 'No autorizado o producto no encontrado' }, { status: 403 });
        }

        await (prisma as any).producto.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[API_PRODUCTOS_DELETE]', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
