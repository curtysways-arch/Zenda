import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkDemoRestriction } from '@/lib/demo-protection';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        console.log('GET /api/negocio - Session User:', JSON.stringify(session.user));
        console.log('GET /api/negocio - negocioId from session:', negocioId);

        if (!negocioId) {
            return NextResponse.json({ error: 'No tienes un negocio asociado en tu sesión' }, { status: 400 });
        }

        const negocio: any = await prisma.negocio.findUnique({
            where: { id: negocioId },
            include: { Ubicacion: true }
        });

        console.log('GET /api/negocio - Business found:', negocio ? negocio.nombre : 'NOT FOUND');

        if (negocio) {
            try {
                const extraData: any[] = await prisma.$queryRawUnsafe(`SELECT saludoTitulo, nombreFallback, mensajeBienvenida, colorSecundario, colorTerciario, colorNeutral, colorTexto, colorSubTexto, logoUrl, heroTitulo, heroSubtitulo, tieneCafeteria, tieneParking, tieneWifi, tieneVestidores, tieneTienda, instagramUrl, facebookUrl, tiktokUrl, emailContacto, websiteUrl, youtubeUrl, faqUrl, terminosUrl, privacidadUrl, whatsapp_notifications FROM Negocio WHERE id = '${negocio.id}'`);
                if (extraData && extraData.length > 0) {
                    if (!('saludoTitulo' in negocio) || negocio.saludoTitulo === undefined) {
                      negocio.saludoTitulo = extraData[0].saludoTitulo;
                    }
                    if (!('nombreFallback' in negocio) || negocio.nombreFallback === undefined) {
                      negocio.nombreFallback = extraData[0].nombreFallback;
                    }
                    if (!('mensajeBienvenida' in negocio) || negocio.mensajeBienvenida === undefined) {
                      negocio.mensajeBienvenida = extraData[0].mensajeBienvenida;
                    }
                    if (!('colorSecundario' in negocio) || negocio.colorSecundario === undefined) {
                        negocio.colorSecundario = extraData[0].colorSecundario;
                    }
                    if (!('colorTerciario' in negocio) || negocio.colorTerciario === undefined) {
                        negocio.colorTerciario = extraData[0].colorTerciario;
                    }
                    if (!('colorNeutral' in negocio) || negocio.colorNeutral === undefined) {
                        negocio.colorNeutral = extraData[0].colorNeutral;
                    }
                    if (!('colorTexto' in negocio) || negocio.colorTexto === undefined || negocio.colorTexto === null) {
                        negocio.colorTexto = extraData[0].colorTexto;
                    }
                    if (!('colorSubTexto' in negocio) || negocio.colorSubTexto === undefined || negocio.colorSubTexto === null) {
                        negocio.colorSubTexto = extraData[0].colorSubTexto;
                    }
                    if (!('logoUrl' in negocio) || negocio.logoUrl === undefined) {
                        negocio.logoUrl = extraData[0].logoUrl;
                    }
                    if (!('heroTitulo' in negocio) || negocio.heroTitulo === undefined) {
                        negocio.heroTitulo = extraData[0].heroTitulo;
                    }
                    if (!('heroSubtitulo' in negocio) || negocio.heroSubtitulo === undefined) {
                        negocio.heroSubtitulo = extraData[0].heroSubtitulo;
                    }
                    negocio.tieneCafeteria = extraData[0].tieneCafeteria === 1 || extraData[0].tieneCafeteria === true;
                    negocio.tieneParking = extraData[0].tieneParking === 1 || extraData[0].tieneParking === true;
                    negocio.tieneWifi = extraData[0].tieneWifi === 1 || extraData[0].tieneWifi === true;
                    negocio.tieneVestidores = extraData[0].tieneVestidores === 1 || extraData[0].tieneVestidores === true;
                    negocio.tieneTienda = extraData[0].tieneTienda === 1 || extraData[0].tieneTienda === true;
                    negocio.whatsapp_notifications = extraData[0].whatsapp_notifications === 1 || extraData[0].whatsapp_notifications === true;

                    const textFields = ['instagramUrl', 'facebookUrl', 'tiktokUrl', 'emailContacto', 'websiteUrl', 'youtubeUrl', 'faqUrl', 'terminosUrl', 'privacidadUrl'];
                    textFields.forEach(field => {
                        if (!(field in negocio) || negocio[field] === undefined) {
                            negocio[field] = extraData[0][field];
                        }
                    });
                }
            } catch (e) { }
        }

        // Mapear Ubicacion → ubicaciones para compatibilidad con el frontend
        if (negocio && negocio.Ubicacion) {
            negocio.ubicaciones = negocio.Ubicacion;
        }

        return NextResponse.json(negocio);
    } catch (error: any) {
        console.error('CRITICAL ERROR in GET /api/negocio:', error);
        return NextResponse.json({
            error: 'Error al obtener negocio',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // PROTECCIÓN MODO DEMO
        const demoCheck = await checkDemoRestriction();
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        const negocioId = (session.user as any).negocioId;
        if (!negocioId) return NextResponse.json({ error: 'Negocio ID no encontrado' }, { status: 400 });

        const body = await req.json();
        const {
            nombre, whatsapp, direccion, logoUrl,
            horarioApertura, horarioCierre, precioHora,
            colorPrimario, colorSecundario, colorTerciario, colorNeutral, colorTexto, colorSubTexto, pagosActivos, pagoPorcentaje,
            mercadoPagoPublicKey, mercadoPagoAccessToken,
            heroTitulo, heroSubtitulo, mensajeBienvenida, saludoTitulo, nombreFallback,
            tieneCafeteria, tieneParking, tieneWifi, tieneVestidores, tieneTienda,
            instagramUrl, facebookUrl, tiktokUrl, emailContacto, websiteUrl, youtubeUrl, faqUrl, terminosUrl, privacidadUrl,
            mostrarPrecios, whatsapp_notifications, configuracion
        } = body;

        // 1. Datos base que sabemos que existen siempre
        const baseData: any = {
            nombre, whatsapp, direccion, logoUrl, horarioApertura, horarioCierre
        };
        if (precioHora !== undefined && precioHora !== null && precioHora !== "") {
            baseData.precioHora = parseFloat(precioHora.toString());
        }

        // 2. Datos extendidos (los que están fallando por caché de esquema)
        const extendedFields: any = {
            colorPrimario,
            colorSecundario,
            colorTerciario,
            colorNeutral,
            colorTexto,
            colorSubTexto,
            heroTitulo,
            heroSubtitulo,
            mensajeBienvenida,
            saludoTitulo,
            nombreFallback,
            pagosActivos: pagosActivos !== undefined ? Boolean(pagosActivos) : undefined,
            pagoPorcentaje: (pagoPorcentaje !== undefined && pagoPorcentaje !== null && pagoPorcentaje !== "") ? parseInt(pagoPorcentaje.toString()) : undefined,
            mercadoPagoPublicKey,
            mercadoPagoAccessToken,
            tieneCafeteria: tieneCafeteria !== undefined ? Boolean(tieneCafeteria) : undefined,
            tieneParking: tieneParking !== undefined ? Boolean(tieneParking) : undefined,
            tieneWifi: tieneWifi !== undefined ? Boolean(tieneWifi) : undefined,
            mostrarPrecios: mostrarPrecios !== undefined ? Boolean(mostrarPrecios) : undefined,
            statusOverride: body.statusOverride || undefined,
            statusNote: body.statusNote || null,
            whatsapp_notifications: whatsapp_notifications !== undefined ? Boolean(whatsapp_notifications) : undefined,
            instagramUrl, facebookUrl, tiktokUrl, emailContacto, websiteUrl, youtubeUrl, faqUrl, terminosUrl, privacidadUrl,
            configuracion: configuracion !== undefined ? configuracion : undefined
        };

        try {
            // Intento A: Intento normal (si el esquema está al día)
            console.log('PATCH /api/negocio - Intentando actualización completa');
            const negocio = await prisma.negocio.update({
                where: { id: negocioId },
                data: { ...baseData, ...extendedFields }
            });
            return NextResponse.json(negocio);
        } catch (prismaError: any) {
            console.warn('Prisma update falló (posible esquema viejo), intentando modo seguro:', prismaError.message);

            // Intento B: Actualizar lo base con Prisma y lo nuevo con SQL crudo
            await prisma.negocio.update({
                where: { id: negocioId },
                data: baseData
            });

            // Bypass de esquema: Actualización manual campo por campo via SQL
            for (const [key, value] of Object.entries(extendedFields)) {
                if (value !== undefined) {
                    try {
                        let sqlValue;
                        if (value === null) sqlValue = 'NULL';
                        else if (typeof value === 'object') sqlValue = `'${JSON.stringify(value).replace(/'/g, "''")}'`;
                        else if (typeof value === 'boolean') sqlValue = value ? '1' : '0';
                        else sqlValue = value;

                        await prisma.$executeRawUnsafe(
                            `UPDATE Negocio SET ${key} = ${sqlValue} WHERE id = '${negocioId}'`
                        );
                    } catch (rawError) {
                        console.error(`Error crítico actualizando campo ${key} vía SQL:`, rawError);
                    }
                }
            }

            const finalResult: any = await prisma.negocio.findUnique({ where: { id: negocioId } });
            // Forzamos la devolución de los campos "extendidos" en memoria, ya que la caché de Prisma de findUnique 
            // no los devolverá si no se ha reiniciado el servicio y sigue operando con un esquema asíncrono viejo.
            return NextResponse.json({ ...finalResult, ...extendedFields });
        }
    } catch (error: any) {
        console.error('Error fatal en PATCH /api/negocio:', error);
        return NextResponse.json({
            error: 'Error al actualizar negocio',
            details: error.message
        }, { status: 500 });
    }
}
