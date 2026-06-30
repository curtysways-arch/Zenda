import prisma from './prisma';

export async function getNegocioBySlug(slug: string) {
    console.log(`[SERVICES] Buscando negocio por slug: ${slug}`);
    try {
        const negocio: any = await prisma.negocio.findUnique({
            where: { slug },
            include: {
                Service: {
                    where: { estaActivo: true },
                    include: {
                        Imagen: true,
                        imageMedia: true,
                        PromotionToService: {
                            include: {
                                Promotion: true
                            }
                        }
                    }
                },
                Imagen: true
            }
        });

        if (negocio) {
            // Mapear de vuelta a las propiedades originales
            negocio.services = negocio.Service?.map((s: any) => ({
                ...s,
                imagenes: s.Imagen || [],
                imageMedia: s.imageMedia || null,
                promociones: s.PromotionToService?.map((pts: any) => pts.Promotion).filter(Boolean) || []
            })) || [];
            negocio.imagenes = negocio.Imagen || [];
            delete negocio.Service;
            delete negocio.Imagen;
            
            console.log(`[SERVICES] Negocio encontrado: ${negocio.nombre} (${negocio.id})`);
            // Bypass para cargar los campos ignorados por la caché de Prisma JS antes de reiniciar "npm run dev"
            try {
                const extraData: any[] = await prisma.$queryRawUnsafe(`SELECT saludoTitulo, nombreFallback, mensajeBienvenida, mostrarPrecios, isDemo, statusOverride, statusNote, colorSecundario, colorTexto, colorNeutral, colorTerciario, logoUrl, heroTitulo, heroSubtitulo, tieneCafeteria, tieneParking, tieneWifi, tieneVestidores, tieneTienda, moduloTorneos, instagramUrl, facebookUrl, tiktokUrl, emailContacto, websiteUrl, youtubeUrl, faqUrl, terminosUrl, privacidadUrl, ciudad FROM Negocio WHERE id = '${negocio.id}'`);
                if (extraData && extraData.length > 0) {
                    const raw = extraData[0];
                    negocio.ciudad = raw.ciudad || negocio.ciudad;
                    negocio.mostrarPrecios = raw.mostrarPrecios === 1 || raw.mostrarPrecios === true || raw.mostrarPrecios === null || raw.mostrarPrecios === undefined; // Default true if null/undefined in raw query
                    negocio.saludoTitulo = raw.saludoTitulo || negocio.saludoTitulo || 'Hola';
                    negocio.nombreFallback = raw.nombreFallback || negocio.nombreFallback || 'Radiante';
                    negocio.mensajeBienvenida = raw.mensajeBienvenida || negocio.mensajeBienvenida;
                    negocio.isDemo = raw.isDemo === 1 || raw.isDemo === true;
                    negocio.statusOverride = raw.statusOverride || 'AUTO';
                    negocio.statusNote = raw.statusNote || null;
                    // Intentar obtener el color de texto con varias posibles keys
                    negocio.colorTexto = raw.colorTexto || raw.colortexto || raw.COLOR_TEXTO || negocio.colorTexto || '#ffffff';
                    negocio.colorSecundario = raw.colorSecundario || raw.colorsecundario || negocio.colorSecundario || '#07090f';
                    negocio.colorNeutral = raw.colorNeutral || raw.colorneutral || negocio.colorNeutral || '#FFF5F5';
                    negocio.colorTerciario = raw.colorTerciario || raw.colorterciario || negocio.colorTerciario || '#7B68EE';
                    negocio.logoUrl = raw.logoUrl || raw.logourl || negocio.logoUrl;
                    negocio.heroTitulo = raw.heroTitulo || raw.herotitulo || negocio.heroTitulo;
                    negocio.heroSubtitulo = raw.heroSubtitulo || raw.herosubtitulo || negocio.heroSubtitulo;
                    
                    negocio.tieneCafeteria = raw.tieneCafeteria === 1 || raw.tieneCafeteria === true;
                    negocio.tieneParking = raw.tieneParking === 1 || raw.tieneParking === true;
                    negocio.tieneWifi = raw.tieneWifi === 1 || raw.tieneWifi === true;
                    negocio.tieneVestidores = raw.tieneVestidores === 1 || raw.tieneVestidores === true;
                    negocio.tieneTienda = raw.tieneTienda === 1 || raw.tieneTienda === true;
                    negocio.moduloTorneos = raw.moduloTorneos === 1 || raw.moduloTorneos === true;

                    const textFields = ['instagramUrl', 'facebookUrl', 'tiktokUrl', 'emailContacto', 'websiteUrl', 'youtubeUrl', 'faqUrl', 'terminosUrl', 'privacidadUrl'];
                    textFields.forEach(field => {
                        if (!(field in negocio) || negocio[field] === undefined) {
                            negocio[field] = raw[field];
                        }
                    });
                }
            } catch (queryError) {
                console.error(`[SERVICES] Error en bypass SQL:`, queryError);
            }

            // Enriquecer cada servicio con su ubicacion via SQL (bypass Prisma cache)
            try {
                // Paso 1: obtener ubicacionId para cada servicio via SQL
                const serviceIds = (negocio.services || []).map((s: any) => `'${s.id}'`).join(',');
                if (serviceIds) {
                    const serviceUbIds: any[] = await prisma.$queryRawUnsafe(
                        `SELECT id, ubicacionId FROM Cancha WHERE id IN (${serviceIds})`
                    );
                    const ubIdMap = new Map(serviceUbIds.map((s: any) => [s.id, s.ubicacionId]));

                    // Paso 2: obtener ubicaciones únicas que se necesitan
                    const uniqueUbIds = [...new Set(serviceUbIds.map((s: any) => s.ubicacionId).filter(Boolean))];
                    let ubicacionMap = new Map<string, any>();
                    if (uniqueUbIds.length > 0) {
                        const ubList: any[] = await prisma.$queryRawUnsafe(
                            `SELECT id, nombre, direccion, mapUrl FROM Ubicacion WHERE id IN (${uniqueUbIds.map(id => `'${id}'`).join(',')})`
                        );
                        ubList.forEach(u => ubicacionMap.set(u.id, u));
                    }

                    // Paso 3: asignar a cada servicio
                    for (const service of negocio.services || []) {
                        const ubId = ubIdMap.get(service.id);
                        service.ubicacionId = ubId || null;
                        service.ubicacion = ubId ? (ubicacionMap.get(ubId) || null) : null;
                    }
                }
            } catch (e) {
                console.error('Error enriching services with ubicacion:', e);
                for (const service of negocio.services || []) {
                    service.ubicacion = null;
                }
            }

            // Cargar ubicaciones (incluye mapUrl) usando Prisma ORM
            try {
                const ubicaciones = await prisma.ubicacion.findMany({
                    where: { negocioId: negocio.id },
                    orderBy: { createdAt: 'asc' }
                });
                negocio.ubicaciones = ubicaciones;
            } catch (e) {
                console.error('Error loading business locations:', e);
                negocio.ubicaciones = [];
            }

            // Cargar páginas publicadas del negocio (bypass Prisma cache)
            try {
                const pages: any[] = await prisma.$queryRawUnsafe(
                    `SELECT id, title, slug, contentHtml, featuredImage, status, createdAt, updatedAt FROM Page WHERE businessId = '${negocio.id}' AND status = 'published' ORDER BY createdAt DESC`
                );
                negocio.pages = pages;
            } catch (e) {
                negocio.pages = [];
            }
        }

        return negocio;
    } catch (error) {
        console.error(`[SERVICES] Error critico en getNegocioBySlug:`, error);
        return null;
    }
}

export async function getAppointmentsByNegocio(negocioId: string, fecha: Date) {
    // Obtener inicio y fin del día para la búsqueda
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(fecha);
    endOfDay.setHours(23, 59, 59, 999);

    const now = new Date();

    return await prisma.appointment.findMany({
        where: {
            negocioId,
            fecha: {
                gte: startOfDay,
                lte: endOfDay,
            },
            OR: [
                { estado: { in: ['confirmed', 'CONFIRMADA'] } },
                {
                    AND: [
                        { estado: { in: ['pending', 'PENDIENTE'] } },
                        { expiresAt: { gt: now } }
                    ]
                }
            ]
        },
        include: {
            cliente: true,
        },
    });
}
