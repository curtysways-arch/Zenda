import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const negocio = await prisma.negocio.findUnique({
            where: { slug },
            select: {
                id: true,
                nombre: true,
                slug: true,
                tipoNegocio: true,
                logoUrl: true,
                colorPrimario: true,
                colorSecundario: true,
                whatsapp: true,
                mostrarPrecios: true
            }
        });

        if (!negocio && (slug === 'lavado' || slug === 'demo-lavado')) {
            return NextResponse.json({
                id: 'sneaker-wash-id',
                nombre: 'BubbleWash',
                slug: slug,
                tipoNegocio: 'SHOE_CARE',
                logoUrl: '/images/bubblewash/hero_sneakers.jpg',
                colorPrimario: '#7c3aed',
                colorSecundario: '#4c1d95',
                whatsapp: '0991234567',
                mostrarPrecios: true,
                productCount: 0,
                serviceCount: 4,
                hasProducts: false,
                hasServices: true,
                isCanchas: false
            });
        }

        if (!negocio) {
            return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
        }

        // Consultar conteo de productos y servicios activos
        const [productCount, serviceCount] = await Promise.all([
            prisma.producto.count({
                where: {
                    negocioId: negocio.id,
                    activo: true
                }
            }).catch(() => 0),
            prisma.service.count({
                where: {
                    negocioId: negocio.id,
                    estaActivo: true
                }
            }).catch(() => 0)
        ]);

        const tipoUpper = (negocio.tipoNegocio || '').toUpperCase();
        const hasProducts = productCount > 0 || ['PRODUCTOS', 'TIENDA', 'STORE', 'ECOMMERCE', 'MINIMARKET', 'FARMACIA'].includes(tipoUpper);
        const hasServices = serviceCount > 0 || !['PRODUCTOS', 'TIENDA', 'STORE'].includes(tipoUpper);
        const isCanchas = ['CANCHAS', 'SPORTS', 'PADEL'].includes(tipoUpper);

        // Si sigue vacío, probamos en la tabla de Configuracion
        if (!negocio.whatsapp) {
            const config = await prisma.configuracion.findFirst({
                where: { 
                    negocioId: negocio.id,
                    clave: { in: ['whatsapp', 'telefono', 'whatsapp_negocio'] }
                },
                select: { valor: true }
            });
            if (config?.valor) {
                negocio.whatsapp = config.valor;
            }
        }

        // Si aún sigue vacío, buscamos el del administrador como respaldo final
        if (!negocio.whatsapp) {
            const admin = await prisma.usuario.findFirst({
                where: { 
                    negocioId: negocio.id,
                    role: { in: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] }
                },
                select: { phone: true }
            });
            if (admin?.phone) {
                negocio.whatsapp = admin.phone;
            }
        }

        // ÚLTIMO RECURSO: Buscar el campo propietario por si tiene formato de número
        if (!negocio.whatsapp && (negocio as any).propietario) {
            const prop = (negocio as any).propietario;
            if (/\d{7,}/.test(prop)) {
                negocio.whatsapp = prop;
            }
        }

        // Si después de todo sigue vacío, usamos el número maestro del servidor
        if (!negocio.whatsapp) {
            negocio.whatsapp = process.env.WHATSAPP_PHONE || process.env.NEXT_PUBLIC_WHATSAPP || "";
        }

        return NextResponse.json({
            ...negocio,
            productCount,
            serviceCount,
            hasProducts,
            hasServices,
            isCanchas
        });
    } catch (error) {
        console.error("Error fetching public business info:", error);
        return NextResponse.json({ error: "No se pudo cargar la información del negocio" }, { status: 500 });
    }
}
