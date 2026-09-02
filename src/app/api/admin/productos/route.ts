import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { EntitlementsService } from '@/core/entitlements/EntitlementsService';

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
            include: { categoria: true, variantes: true },
            orderBy: { orden: 'asc' }
        });
        return NextResponse.json(productos);
    } catch (e) {
        console.error('[API_PRODUCTOS_GET]', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

function parseNumeric(val: any, fallback = 0): number {
    if (val === undefined || val === null || val === '') return fallback;
    const str = String(val).replace(',', '.').trim();
    const num = parseFloat(str);
    return isNaN(num) ? fallback : num;
}

async function checkBusinessSkuUniqueness(
    negocioId: string,
    skuToCheck: string | null | undefined,
    excludeProductId?: string,
    excludeVariantId?: string
): Promise<string | null> {
    if (!skuToCheck || !skuToCheck.trim()) return null;
    const cleanSku = skuToCheck.trim();

    // Validar en Producto del mismo negocio
    const existingProduct = await (prisma as any).producto.findFirst({
        where: {
            negocioId,
            sku: cleanSku,
            ...(excludeProductId ? { id: { not: excludeProductId } } : {})
        }
    });

    if (existingProduct) {
        return `El SKU "${cleanSku}" ya está siendo utilizado por el producto "${existingProduct.nombre}" en este negocio.`;
    }

    // Validar en ProductoVariante del mismo negocio
    const existingVariant = await (prisma as any).productoVariante.findFirst({
        where: {
            producto: { negocioId },
            sku: cleanSku,
            ...(excludeVariantId ? { id: { not: excludeVariantId } } : {})
        },
        include: { producto: { select: { nombre: true } } }
    });

    if (existingVariant) {
        return `El SKU "${cleanSku}" ya está asignado a la variante "${existingVariant.nombre}" en este negocio.`;
    }

    return null;
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

    const limitCheck = await EntitlementsService.checkLimit(negocioId, 'products');
    if (!limitCheck.allowed) {
        return NextResponse.json({ error: limitCheck.message || 'Límite de productos alcanzado en tu plan actual' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { nombre, descripcion, precio, imagenUrl, imagenes, dimensiones, activo, stock, orden, categoriaId, llevaEmpaque, precioEmpaque, sku, tieneVariantes, variantesIniciales } = body;
        
        if (!nombre || precio === undefined) {
            return NextResponse.json({ error: 'El nombre y precio son obligatorios' }, { status: 400 });
        }

        // Validar SKU del producto base
        const baseSkuError = await checkBusinessSkuUniqueness(negocioId, sku);
        if (baseSkuError) {
            return NextResponse.json({ error: baseSkuError }, { status: 400 });
        }

        // Validar SKUs de variantes iniciales (si aplica)
        if (tieneVariantes && Array.isArray(variantesIniciales) && variantesIniciales.length > 0) {
            const seenSkus = new Set<string>();
            for (const v of variantesIniciales) {
                const varSku = v.sku ? v.sku.trim() : (sku ? `${sku.trim()}-${v.nombre.replace(/\s+/g, '-').toUpperCase()}` : null);
                if (varSku) {
                    if (seenSkus.has(varSku.toUpperCase())) {
                        return NextResponse.json({ error: `Existe más de una variante inicial con el mismo SKU "${varSku}".` }, { status: 400 });
                    }
                    seenSkus.add(varSku.toUpperCase());

                    const varSkuError = await checkBusinessSkuUniqueness(negocioId, varSku);
                    if (varSkuError) {
                        return NextResponse.json({ error: varSkuError }, { status: 400 });
                    }
                }
            }
        }

        const imagenesList = Array.isArray(imagenes) ? imagenes.filter(Boolean) : (imagenUrl ? [imagenUrl] : []);
        const extraData: any = {};
        if (imagenesList.length > 0) extraData.imagenes = imagenesList;
        if (Array.isArray(dimensiones) && dimensiones.length > 0) extraData.dimensiones = dimensiones;

        const nuevoProducto = await (prisma as any).producto.create({
            data: {
                nombre,
                descripcion,
                precio: parseNumeric(precio, 0),
                imagenUrl: imagenesList[0] || imagenUrl || null,
                extraInfo: Object.keys(extraData).length > 0 ? extraData : undefined,
                activo: activo !== undefined ? Boolean(activo) : true,
                stock: stock !== undefined && stock !== null && stock !== '' ? parseInt(String(stock)) : null,
                sku: sku ? sku.trim() : null,
                tieneVariantes: Boolean(tieneVariantes),
                orden: parseNumeric(orden, 0),
                llevaEmpaque: llevaEmpaque !== undefined ? Boolean(llevaEmpaque) : true,
                precioEmpaque: parseNumeric(precioEmpaque, 0.25),
                categoriaId: categoriaId || null,
                negocioId
            }
        });

        // Crear variantes iniciales si fueron enviadas al crear producto nuevo
        if (tieneVariantes && Array.isArray(variantesIniciales) && variantesIniciales.length > 0) {
            for (const v of variantesIniciales) {
                const varSku = v.sku ? v.sku.trim() : (sku ? `${sku.trim()}-${v.nombre.replace(/\s+/g, '-').toUpperCase()}` : null);
                await (prisma as any).productoVariante.create({
                    data: {
                        productoId: nuevoProducto.id,
                        nombre: v.nombre,
                        sku: varSku,
                        precio: parseNumeric(v.precio, parseNumeric(precio, 0)),
                        stock: parseNumeric(v.stock, 0),
                        activo: v.activo !== undefined ? Boolean(v.activo) : true,
                        atributos: typeof v.atributos === 'string' ? v.atributos : (v.atributos || null)
                    }
                });
            }
        }

        const prodConVariantes = await (prisma as any).producto.findUnique({
            where: { id: nuevoProducto.id },
            include: { categoria: true, variantes: true }
        });

        return NextResponse.json(prodConVariantes || nuevoProducto);
    } catch (e: any) {
        console.error('[API_PRODUCTOS_POST]', e);
        return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
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
        const { id, nombre, descripcion, precio, imagenUrl, imagenes, dimensiones, activo, stock, orden, categoriaId, llevaEmpaque, precioEmpaque, sku, tieneVariantes } = body;
        
        if (!id || !nombre || precio === undefined) {
            return NextResponse.json({ error: 'El ID, nombre y precio son obligatorios' }, { status: 400 });
        }

        // Validar propiedad del negocio
        const prod = await (prisma as any).producto.findUnique({ where: { id } });
        if (!prod || prod.negocioId !== negocioId) {
            return NextResponse.json({ error: 'No autorizado o producto no encontrado' }, { status: 403 });
        }

        // Validar SKU único en este negocio
        const skuError = await checkBusinessSkuUniqueness(negocioId, sku, id);
        if (skuError) {
            return NextResponse.json({ error: skuError }, { status: 400 });
        }

        const imagenesList = Array.isArray(imagenes) ? imagenes.filter(Boolean) : (imagenUrl ? [imagenUrl] : []);
        const currentExtra = (prod.extraInfo && typeof prod.extraInfo === 'object') ? prod.extraInfo : {};
        const updatedExtra = {
            ...currentExtra,
            ...(imagenesList.length > 0 ? { imagenes: imagenesList } : {}),
            ...(Array.isArray(dimensiones) ? { dimensiones } : {})
        };

        const prodActualizado = await (prisma as any).producto.update({
            where: { id },
            data: {
                nombre,
                descripcion,
                precio: parseNumeric(precio, 0),
                imagenUrl: imagenesList[0] || imagenUrl || null,
                extraInfo: updatedExtra,
                activo: activo !== undefined ? Boolean(activo) : true,
                stock: stock !== undefined && stock !== null && stock !== '' ? parseInt(String(stock)) : null,
                sku: sku || null,
                tieneVariantes: tieneVariantes !== undefined ? Boolean(tieneVariantes) : prod.tieneVariantes,
                orden: parseNumeric(orden, 0),
                llevaEmpaque: llevaEmpaque !== undefined ? Boolean(llevaEmpaque) : true,
                precioEmpaque: parseNumeric(precioEmpaque, 0.25),
                categoriaId: categoriaId || null
            }
        });

        return NextResponse.json(prodActualizado);
    } catch (e: any) {
        console.error('[API_PRODUCTOS_PUT]', e);
        return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
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
