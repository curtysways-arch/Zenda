import { getNegocioBySlug, getAppointmentsByNegocio } from '@/lib/services';
import { cn } from '@/lib/utils';
import { getServicePrimaryImage } from '@/lib/serviceImageHelper';
import { notFound } from 'next/navigation';
import PublicCoursesSection from '@/components/public/PublicCoursesSection';
import PromotionsSection from '@/components/public/PromotionsSection';
import Link from 'next/link';
import Script from 'next/script';
import prisma from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { MapPin, Search, Star, Zap, Clock, ChevronRight, ArrowUpRight, ArrowLeftRight, Wifi, Car, Coffee, Shirt, ShoppingBag, Phone, Globe, Mail, Send, Trophy, Home, Calendar, User, Users, Swords, Instagram, Facebook, FileText, Dribbble, Rocket, MessageCircle, Sparkles, Scissors, ChevronLeft, Bell, CheckCircle, Compass, Image as ImageIcon, Plus } from 'lucide-react';
import HeroCarousel from '@/components/HeroCarousel';
import NewsletterForm from '@/components/NewsletterForm';
import NextAppointmentBanner from '@/components/public/NextAppointmentBanner';

export const dynamic = 'force-dynamic';

export default async function PublicNegocioPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { slug } = await params;
    const resolvedSearchParams = await searchParams;
    const query = typeof resolvedSearchParams?.q === 'string' ? resolvedSearchParams.q.toLowerCase() : '';
    const negocio = await getNegocioBySlug(slug);

    if (!negocio) {
        notFound();
    }
    
    negocio.canchas = negocio.services || [];

    let userReservasActivas = 0;
    let nextAppointment: any = null;
    let clientName = '';

    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("customer_token")?.value;
        if (token) {
            const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
            const verification = await jwtVerify(token, secret);
            const payload = verification.payload;
            if (payload.slug === slug) {
                const now = new Date();
                const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
                const telefono = payload.telefono as string;

                const clienteData = await prisma.cliente.findFirst({
                    where: {
                        negocioId: payload.negocioId as string,
                        OR: [
                            { telefono: telefono },
                            { telefono: telefono.replace(/^\+(\d{1,4})/, '') }
                        ]
                    }
                });
                if (clienteData) {
                    clientName = clienteData.nombre;
                }

                const localTelefono = telefono.replace(/^\+(\d{1,4})/, ''); 
                const digitsOnly = telefono.replace(/\D/g, ''); 
                const localNoZero = localTelefono.replace(/^0+/, '');

                // Buscar la cita más próxima (confirmada o pendiente)
                const upcoming = await prisma.appointment.findMany({
                    where: {
                        negocioId: payload.negocioId as string,
                        cliente: {
                            OR: [
                                { telefono: telefono },
                                { telefono: localTelefono },
                                { telefono: digitsOnly },
                                { telefono: { endsWith: localNoZero } }
                            ]
                        },
                        fecha: { gte: todayUTC },
                        estado: { in: ['pending', 'confirmed'] }
                    },
                    orderBy: [
                        { fecha: 'asc' },
                        { horaInicio: 'asc' }
                    ],
                    take: 10,
                    include: { 
                        service: { select: { nombre: true } },
                        staff: { select: { name: true, avatar: true } },

                    }
                });

                if (upcoming.length > 0) {
                    const nowTime = new Date();
                    const validUpcoming = upcoming.filter((app: any) => {
                        const dateStr = app.fecha instanceof Date ? app.fecha.toISOString().split('T')[0] : String(app.fecha).split('T')[0];
                        const [year, month, day] = dateStr.split('-').map(Number);
                        const [h, m] = app.horaFin ? app.horaFin.split(':').map(Number) : (app.horaInicio || '23:59').split(':').map(Number);
                        const endTime = new Date(year, month - 1, day, h, m, 0);
                        // Tolerancia de 30 minutos después de horaFin para seguir considerándola "actual/próxima"
                        return endTime.getTime() > nowTime.getTime() - (30 * 60 * 1000);
                    });

                    if (validUpcoming.length > 0) {
                        nextAppointment = validUpcoming[0];
                    }
                }

                const activeAppointments = await prisma.appointment.findMany({
                    where: {
                        negocioId: payload.negocioId as string,
                        cliente: {
                            OR: [
                                { telefono: telefono },
                                { telefono: localTelefono },
                                { telefono: digitsOnly },
                                { telefono: { endsWith: localNoZero } }
                            ]
                        },
                        fecha: { gte: todayUTC },
                        estado: { in: ['confirmed', 'pending'] }
                    },
                    select: {
                        fecha: true,
                        horaInicio: true,
                        horaFin: true
                    }
                });

                const nowTime = new Date();
                const validAppointments = activeAppointments.filter((app: any) => {
                    const dateStr = app.fecha instanceof Date ? app.fecha.toISOString().split('T')[0] : String(app.fecha).split('T')[0];
                    const [year, month, day] = dateStr.split('-').map(Number);
                    const [h, m] = app.horaFin ? app.horaFin.split(':').map(Number) : (app.horaInicio || '23:59').split(':').map(Number);
                    const endTime = new Date(year, month - 1, day, h, m, 0);
                    // Tolerancia de 30 minutos después de la hora de fin
                    return endTime.getTime() > nowTime.getTime() - (30 * 60 * 1000);
                });

                userReservasActivas = validAppointments.length;
            }
        }
    } catch (e) {}

    const getGoogleMapsUrls = async (sede: any, negocio: any) => {
        let rawUrl = (sede.mapUrl || '').trim();
        let embedSrc = '';
        let navUrl = '';
        const makeNav = (dest: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
        
        // Si es un iframe, limpiar
        if (rawUrl.includes('<iframe')) {
            const match = rawUrl.match(/src=["']([^"']+)["']/);
            if (match && match[1]) rawUrl = match[1];
        }

        // Si es directamente un link de embed (provisto por Google Maps Share > Embed a map)
        if (rawUrl && rawUrl.includes('/maps/embed')) {
            embedSrc = rawUrl;
            const fallbackNav = sede.direccion ? `${negocio.nombre}, ${sede.direccion}` : negocio.nombre;
            navUrl = makeNav(fallbackNav);
            return { embedSrc, navUrl };
        }

        // 1. Resolver link corto con headers de navegador para evitar bloqueos
        if (rawUrl && (rawUrl.includes('maps.app.goo.gl') || rawUrl.includes('goo.gl/maps'))) {
            try {
                const response = await fetch(rawUrl, { 
                    method: 'GET',
                    redirect: 'follow', 
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
                    }
                });
                rawUrl = response.url;
            } catch (e) {
                console.error('Error resolving map:', e);
            }
        }

        if (rawUrl && rawUrl.startsWith('http')) {
            const decodedUrl = decodeURIComponent(rawUrl);

            // 2. Extraer coordenadas (Soporta múltiples formatos incluyendo el de búsqueda de móvil)
            // Corregido para no perder el signo negativo por culpa del separador
            const coordMatch = 
                decodedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || 
                decodedUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                decodedUrl.match(/\/search\/(-?\d+\.\d+),[^\d-]*(-?\d+\.\d+)/) ||
                decodedUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);

            if (coordMatch) {
                const lat = coordMatch[1];
                const lng = coordMatch[2];
                // Al buscar por Nombre + Coordenadas, Google habilita el cuadro de info (controles)
                const query = encodeURIComponent(`${negocio.nombre}@${lat},${lng}`);
                embedSrc = `https://maps.google.com/maps?q=${query}&hl=es&z=18&output=embed`;
                navUrl = makeNav(`${lat},${lng}`);
                return { embedSrc, navUrl };
            }

            // 3. Fallback a lugar si no hay coordenadas pero sí ID de lugar
            if (rawUrl.includes('/maps/place/')) {
                const placeMatch = rawUrl.split('/maps/place/')[1]?.split('/')[0];
                if (placeMatch) {
                    const cleanPlace = decodeURIComponent(placeMatch.replace(/\+/g, ' '));
                    const searchQuery = negocio.ciudad ? `${cleanPlace}, ${negocio.ciudad}` : cleanPlace;
                    embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(searchQuery)}&hl=es&z=16&output=embed`;
                    navUrl = makeNav(searchQuery);
                    return { embedSrc, navUrl };
                }
            }
        }

        // 4. Fallback final: Si ingresaron texto plano en mapUrl, usarlo. Si no, Dirección + Ciudad
        let queryText = '';
        if (rawUrl && !rawUrl.startsWith('http') && !rawUrl.includes('<iframe')) {
            queryText = rawUrl;
        } else {
            const parts = [];
            if (sede.direccion && sede.direccion !== sede.nombre) parts.push(sede.direccion);
            if (negocio.ciudad) parts.push(negocio.ciudad);
            
            // Si no hay dirección específica, intentar buscar por el nombre del negocio
            queryText = parts.length > 0 ? parts.join(', ') : negocio.nombre;
        }
        
        // El truco +(Nombre) fuerza a Google Maps a poner un marcador exacto en lugar de delimitar un código postal
        const finalQuery = `${queryText} +(${negocio.nombre})`;
        embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(finalQuery)}&hl=es&z=16&output=embed`;
        navUrl = makeNav(queryText);
        
        return { embedSrc, navUrl };
    };

    const resolvedUbicaciones = await Promise.all(
        ((negocio as any).ubicaciones || []).map(async (sede: any) => {
            const urls = await getGoogleMapsUrls(sede, negocio);
            return { ...sede, embedSrc: urls.embedSrc, navUrl: urls.navUrl };
        })
    );

    const rawPromocionesActivas = await (prisma as any).promotion.findMany({
        where: { businessId: negocio.id, estado: 'activa', fechaInicio: { lte: new Date() }, fechaFin: { gte: new Date() } },
        include: { PromotionToService: { include: { Service: true } } },
        orderBy: { createdAt: 'desc' }
    });

    const promocionesActivas = rawPromocionesActivas.map((p: any) => ({
        ...p,
        services: p.PromotionToService?.map((pts: any) => pts.Service) || []
    }));

    const rawCursosActivos = await (prisma as any).course.findMany({
        where: { businessId: negocio.id, status: 'active' },
        include: { 
            CourseSchedule: { include: { Service: { select: { nombre: true } } } }, 
            _count: { select: { CourseEnrollment: { where: { status: 'approved' } } } } 
        },
        orderBy: { createdAt: 'desc' }
    });

    const cursosActivos = rawCursosActivos.map((c: any) => ({
        ...c,
        schedules: c.CourseSchedule?.map((cs: any) => ({
            ...cs,
            service: cs.Service
        })) || [],
        _count: {
            enrollments: c._count?.CourseEnrollment || 0
        }
    }));

    let coursesModuleEnabled = false;
    try {
        const planRows: any[] = await prisma.$queryRawUnsafe(`SELECT p.courses_module FROM Plan p INNER JOIN Suscripcion s ON s.planId = p.id WHERE s.negocioId = '${negocio.id}' AND s.estado IN ('active', 'trial', 'ACTIVA', 'activa') LIMIT 1`);
        if (planRows && planRows.length > 0) {
            coursesModuleEnabled = planRows[0].courses_module === 1 || planRows[0].courses_module === true;
        }
    } catch (e) {
        console.error("[DEBUG] Error checking courses module:", e);
    }

    const canchasConDisponibilidad = (negocio.canchas || []);
    const filteredCanchas = query ? canchasConDisponibilidad.filter((c: any) => c.nombre.toLowerCase().includes(query)) : canchasConDisponibilidad;
    
    // Filtrado robusto de imágenes para evitar pantallas blancas
    // Acepta esBanner:true O tipo:'BANNER' (nuevo sistema BannerGalleryAdmin)
    let bannerImages = (negocio.imagenes || [])
        .filter((img: any) => (img.esBanner || img.tipo === 'BANNER') && img.url && img.url.trim() !== '')
        .map((img: any) => img.url);

    // Fetch directo de imágenes tipo BANNER para asegurar datos frescos
    try {
        const bannerRows = await prisma.imagen.findMany({
            where: { negocioId: negocio.id, tipo: 'BANNER' },
            orderBy: { createdAt: 'asc' },
            select: { url: true }
        });
        if (bannerRows.length > 0) {
            bannerImages = bannerRows.map((r: any) => r.url).filter((u: string) => u && u.trim() !== '');
        }
    } catch (e) {
        console.error('[slug/page] Error fetching banner images:', e);
    }

    // Fallback 1: Buscar bannerUrl guardado en el JSON de configuración para negocios ya creados
    // Parseo defensivo: configuracion puede llegar como string o como objeto
    const rawConfig = negocio.configuracion;
    let config: any = {};
    if (rawConfig) {
        if (typeof rawConfig === 'string') {
            try { config = JSON.parse(rawConfig); } catch { config = {}; }
        } else {
            config = rawConfig as any;
        }
    }
    const configBannerUrl = config.bannerUrl || config.banner_url || (negocio as any).bannerUrl;
    if (bannerImages.length === 0 && configBannerUrl && configBannerUrl.trim() !== '') {
        bannerImages.push(configBannerUrl);
    }
    
    const allImages = (negocio.imagenes || [])
        .filter((img: any) => img.url && img.url.trim() !== '')
        .map((img: any) => img.url);

    let displayImages = bannerImages.length > 0 ? bannerImages : allImages;
    
    // Fallback 2: Si displayImages está vacío, usar un banner hermoso según el rubro de negocio
    if (displayImages.length === 0) {
        const tipoRubro = String(config.tipoNegocio || (negocio as any).tipoNegocio || negocio.nombre || '').toLowerCase();
        
        let defaultBanner = 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=1200'; // Default Spa
        
        if (tipoRubro.includes('dental') || tipoRubro.includes('odont') || tipoRubro.includes('dent') || tipoRubro.includes('clinic')) {
            defaultBanner = 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&q=80&w=1200'; // Dental
        } else if (tipoRubro.includes('barber') || tipoRubro.includes('pelu') || tipoRubro.includes('salon') || tipoRubro.includes('estet') || tipoRubro.includes('corte')) {
            defaultBanner = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200'; // Peluquería / Estética
        } else if (tipoRubro.includes('sport') || tipoRubro.includes('fit') || tipoRubro.includes('gym') || tipoRubro.includes('entren')) {
            defaultBanner = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=1200'; // Fitness / Deporte
        }
        
        displayImages = [defaultBanner];
    }
    
    const businessImage = displayImages[0];
    
    const paginasPersonalizadas = await prisma.page.findMany({
        where: { businessId: negocio.id, status: 'published' },
        orderBy: { createdAt: 'asc' }
    });
    
    // DEFINICIÃ“N DE COLORES DESDE ADMIN
    const primaryColor = (negocio as any).colorPrimario || 'var(--primary)';
    const primaryHex = primaryColor.startsWith('#') ? primaryColor.trim() : '#ec4899';
    const bgOpacityColor = primaryHex.length === 7 ? `${primaryHex}1a` : 'rgba(236, 72, 153, 0.1)';
    const secondaryColor = (negocio as any).colorSecundario || '#0f172a';
    const tertiaryColor = (negocio as any).colorTerciario || '#7B68EE';
    const neutralColor = (negocio as any).colorNeutral || '#fff8f6';

    // Respetar el color de texto configurado por el admin. Si no está definido,
    // elegir automáticamente: fondo oscuro → texto blanco, fondo claro → texto oscuro.
    const rawTextColor = (negocio as any).colorTexto;
    const textColor = rawTextColor
        ? rawTextColor
        : (() => {
            const hex = neutralColor.replace('#', '');
            if (hex.length !== 6) return '#1e293b';
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            return luma < 140 ? '#f8fafc' : '#1e293b';
        })();


    // CÁLCULO DE ESTADO ABIERTO/CERRADO
    const isOpenNow = () => {
        const override = (negocio as any).statusOverride || 'AUTO';
        if (override === 'OPEN') return true;
        if (override === 'CLOSED') return false;

        // Obtener los componentes de tiempo en la zona horaria del negocio (por defecto de Latinoamérica: America/Bogota / GMT-5)
        // Esto evita que servidores alojados en otras regiones (como Europa/GMT+2) calculen el estado de abierto/cerrado de forma incorrecta.
        const timeZone = config?.timeZone || 'America/Bogota';
        let hour = 0;
        let minute = 0;
        let todayDay = 0;

        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone,
                hour: 'numeric',
                minute: 'numeric',
                hourCycle: 'h23',
                weekday: 'short'
            });
            const parts = formatter.formatToParts(new Date());
            const partValues: Record<string, string> = {};
            parts.forEach(p => {
                partValues[p.type] = p.value;
            });

            hour = parseInt(partValues.hour, 10);
            minute = parseInt(partValues.minute, 10);
            const weekdayStr = partValues.weekday;

            const weekdayMap: Record<string, number> = {
                'Sun': 0,
                'Mon': 1,
                'Tue': 2,
                'Wed': 3,
                'Thu': 4,
                'Fri': 5,
                'Sat': 6
            };
            todayDay = weekdayMap[weekdayStr] ?? 0;
        } catch (e) {
            console.error('[slug/page] Error converting timeZone:', e);
            const fallbackNow = new Date();
            hour = fallbackNow.getHours();
            minute = fallbackNow.getMinutes();
            todayDay = fallbackNow.getDay();
        }

        // Verificar si hoy es un día de atención configurado
        // getDay() => 0=Dom, 1=Lun, ..., 6=Sab
        // El admin también usa 0=Dom, 1=Lun, ..., 6=Sab (mismo sistema JS)
        const diasAtencionRaw = config?.diasAtencion;
        if (diasAtencionRaw && Array.isArray(diasAtencionRaw) && diasAtencionRaw.length > 0) {
            const diasNumericos = diasAtencionRaw.map((d: any) => Number(d));
            if (!diasNumericos.includes(todayDay)) {
                return false; // Hoy no es día de atención
            }
        }

        // Verificar horario
        const currentTime = hour * 60 + minute;
        const [openHour, openMin] = (negocio.horarioApertura || "08:00").split(':').map(Number);
        const [closeHour, closeMin] = (negocio.horarioCierre || "20:00").split(':').map(Number);
        const openTotal = openHour * 60 + openMin;
        const closeTotal = closeHour * 60 + closeMin;
        return currentTime >= openTotal && currentTime <= closeTotal;
    };
    const isCurrentlyOpen = isOpenNow();

    let resultadosDestacados: any[] = [];
    try {
        // Usar raw query para evitar problemas de caché del cliente Prisma si no se ha regenerado - Recompiled
        const rawResultados: any[] = await prisma.$queryRawUnsafe(`
            SELECT r.*, 
                   s.nombre as service_nombre, 
                   st.name as staff_name, 
                   st.avatar as staff_avatar,
                   m.url as staff_media_url,
                   (SELECT COUNT(*) FROM "LikeResultado" l WHERE l."resultadoId" = r.id) as likes_count,
                   (SELECT COUNT(*) FROM "CommentResultado" c WHERE c."resultadoId" = r.id) as comments_count
            FROM "Resultado" r
            LEFT JOIN "Cancha" s ON r."serviceId" = s.id
            LEFT JOIN "Staff" st ON r."staffId" = st.id
            LEFT JOIN "Media" m ON st."imageMediaId" = m.id
            WHERE r."businessId" = '${negocio.id}' AND r.published = true AND r."showInLanding" = true
            ORDER BY r."createdAt" DESC
            LIMIT 6
        `);
        resultadosDestacados = rawResultados.map(r => ({
            ...r,
            gallery: typeof r.gallery === 'string' ? JSON.parse(r.gallery) : (r.gallery || []),
            service: r.serviceId ? { nombre: r.service_nombre } : null,
            staff: r.staffId ? { 
                name: r.staff_name, 
                avatar: r.staff_avatar,
                imageMedia: r.staff_media_url ? { url: r.staff_media_url } : null
            } : null,
            likesCount: Number(r.likes_count || 0),
            commentsCount: Number(r.comments_count || 0)
        })).filter(r => {
            // Solo mostrar resultados que tienen imágenes válidas
            if (r.type === 'GALLERY') {
                return r.gallery && r.gallery.length > 0;
            }
            return r.beforeImage || r.afterImage;
        });
    } catch (e) {
        console.error("Error cargando resultados destacados:", e);
    }

    return (
        <main className="min-h-screen font-sans pb-32 md:pb-0 relative overflow-x-hidden">
            {/* Cabecera Flotante (Solo Móvil) */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex items-center justify-between md:hidden">
                <Link href={`/${slug}`} className="flex items-center gap-4">
                    {negocio.logoUrl ? (
                        <img src={negocio.logoUrl} alt={negocio.nombre} className="w-20 h-20 rounded-full object-cover shadow-2xl border-2 border-white" />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-black text-2xl shadow-2xl border-2 border-white">
                            {negocio.nombre.substring(0, 1)}
                        </div>
                    )}
                    <span className="font-black text-2xl uppercase tracking-[0.1em] leading-none drop-shadow-md" style={{ color: textColor }}>
                        {negocio.nombre}
                    </span>
                </Link>

                <Link href={`/${slug}/mis-reservas`} className="w-12 h-12 rounded-full glass-card-light flex items-center justify-center text-slate-900 border-white/40 shadow-xl relative">
                    <Bell size={20} />
                    {userReservasActivas > 0 && (
                        <span className="absolute -top-1 -right-1 w-6 h-6 bg-pink-500 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white">
                            {userReservasActivas}
                        </span>
                    )}
                </Link>
            </header>

            {/* Espaciado superior */}
            <div className={nextAppointment ? "pt-32 md:pt-28" : "pt-28 md:pt-24"}></div>

            {/* PRÃ“XIMA CITA ALERT BANNER */}
            {nextAppointment && (
                <NextAppointmentBanner 
                    appointment={nextAppointment}
                    slug={slug}
                    primaryColor={primaryColor}
                />
            )}


            {/* 2. HERO IMAGE CON SUBTÍTULO INTEGRADO */}
            <section className="px-4 mb-10">
                <div className="relative w-full aspect-[4/3] max-h-[380px] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white">
                    <HeroCarousel images={displayImages} baseClass="absolute inset-0 w-full h-full object-cover" opacityActive="opacity-100" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Subtítulo integrado en la imagen */}
                    {(negocio.heroTitulo || negocio.heroSubtitulo || (negocio.horarioApertura && negocio.horarioCierre)) && (
                        <div className="absolute inset-x-0 bottom-8 px-8 text-center space-y-4">
                            {negocio.heroTitulo && (
                                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl leading-none">
                                    {negocio.heroTitulo}
                                </h2>
                            )}
                            {negocio.heroSubtitulo && (
                                <p className="text-[12px] font-black text-white/90 uppercase tracking-[0.2em] leading-relaxed drop-shadow-lg max-w-[280px] mx-auto">
                                    {negocio.heroSubtitulo}
                                </p>
                            )}
                            {negocio.horarioApertura && negocio.horarioCierre && (
                                <div className="inline-flex items-center gap-2.5 px-5 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full mt-2 transition-all duration-300">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full animate-pulse shrink-0",
                                        isCurrentlyOpen 
                                            ? "bg-[#10b981] shadow-[0_0_12px_#10b981]" 
                                            : "bg-[#ef4444] shadow-[0_0_12px_#ef4444]"
                                    )} />
                                    <span className="text-[10px] font-black text-white uppercase tracking-[0.25em] flex items-center gap-1.5">
                                        <span className={cn(isCurrentlyOpen ? "text-[#10b981]" : "text-[#ef4444]")}>
                                            {isCurrentlyOpen ? 'ABIERTO' : 'CERRADO'}
                                        </span>
                                        <span className="text-white/40 font-normal">|</span>
                                        <span>{negocio.horarioApertura} - {negocio.horarioCierre}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* 3. MENSAJE DE BIENVENIDA */}
            {negocio.mensajeBienvenida && (
                <section className="px-10 mb-12 text-center">
                    <p className="text-xl font-serif italic text-slate-600 leading-relaxed max-w-[320px] mx-auto">
                        "{negocio.mensajeBienvenida}"
                    </p>
                </section>
            )}

            {/* CUADRÍCULA DE NAVEGACIÓN RÁPIDA (DINÁMICA Y COMPACTA) */}
            <section className="px-4 mb-12 mt-4">
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 max-w-md mx-auto">
                    {/* Servicios */}
                    <a 
                        href="#servicios"
                        className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-[1.8rem] sm:rounded-[2.2rem] bg-white border border-gray-100/50 shadow-sm transition-all active:scale-95 text-center group hover:shadow-md"
                    >
                        <div 
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1.5 sm:mb-2 transition-transform group-hover:scale-110"
                            style={{ backgroundColor: bgOpacityColor, color: primaryColor }}
                        >
                            <Scissors className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-black text-slate-800 uppercase tracking-wider block truncate w-full leading-none">
                            Servicios
                        </span>
                    </a>

                    {/* Promociones */}
                    {promocionesActivas.length > 0 && (
                        <a 
                            href="#promociones"
                            className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-[1.8rem] sm:rounded-[2.2rem] bg-white border border-gray-100/50 shadow-sm transition-all active:scale-95 text-center group hover:shadow-md"
                        >
                            <div 
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1.5 sm:mb-2 transition-transform group-hover:scale-110"
                                style={{ backgroundColor: bgOpacityColor, color: primaryColor }}
                            >
                                <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-800 uppercase tracking-wider block truncate w-full leading-none">
                                Promos
                            </span>
                        </a>
                    )}

                    {/* Cursos */}
                    {coursesModuleEnabled && cursosActivos.length > 0 && (
                        <a 
                            href="#cursos"
                            className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-[1.8rem] sm:rounded-[2.2rem] bg-white border border-gray-100/50 shadow-sm transition-all active:scale-95 text-center group hover:shadow-md"
                        >
                            <div 
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1.5 sm:mb-2 transition-transform group-hover:scale-110"
                                style={{ backgroundColor: bgOpacityColor, color: primaryColor }}
                            >
                                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-800 uppercase tracking-wider block truncate w-full leading-none">
                                Cursos
                            </span>
                        </a>
                    )}

                    {/* Resultados */}
                    {resultadosDestacados.length > 0 && (
                        <a 
                            href="#resultados"
                            className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-[1.8rem] sm:rounded-[2.2rem] bg-white border border-gray-100/50 shadow-sm transition-all active:scale-95 text-center group hover:shadow-md"
                        >
                            <div 
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1.5 sm:mb-2 transition-transform group-hover:scale-110"
                                style={{ backgroundColor: bgOpacityColor, color: primaryColor }}
                            >
                                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-800 uppercase tracking-wider block truncate w-full leading-none">
                                Trabajos
                            </span>
                        </a>
                    )}

                    {/* Páginas */}
                    {paginasPersonalizadas.length > 0 && (
                        <a 
                            href="#paginas"
                            className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-[1.8rem] sm:rounded-[2.2rem] bg-white border border-gray-100/50 shadow-sm transition-all active:scale-95 text-center group hover:shadow-md"
                        >
                            <div 
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1.5 sm:mb-2 transition-transform group-hover:scale-110"
                                style={{ backgroundColor: bgOpacityColor, color: primaryColor }}
                            >
                                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-800 uppercase tracking-wider block truncate w-full leading-none">
                                Páginas
                            </span>
                        </a>
                    )}

                    {/* Ubicación */}
                    {resolvedUbicaciones.length > 0 && (
                        <a 
                            href="#ubicacion"
                            className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-[1.8rem] sm:rounded-[2.2rem] bg-white border border-gray-100/50 shadow-sm transition-all active:scale-95 text-center group hover:shadow-md"
                        >
                            <div 
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1.5 sm:mb-2 transition-transform group-hover:scale-110"
                                style={{ backgroundColor: bgOpacityColor, color: primaryColor }}
                            >
                                <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-800 uppercase tracking-wider block truncate w-full leading-none">
                                Ubicación
                            </span>
                        </a>
                    )}
                </div>
            </section>

            {/* SERVICES LIST */}
            <section id="servicios" className="px-6 mb-12">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest mb-1 block" style={{ color: primaryColor }}>OPCIONES PARA TI</span>
                        <h3 className="text-3xl font-black leading-none" style={{ color: textColor }}>Nuestros Servicios</h3>
                    </div>
                    {filteredCanchas.length > 4 && (
                        <Link 
                            href={resolvedSearchParams?.todos ? `/${slug}#servicios` : `/${slug}?todos=true#servicios`}
                            className="text-[10px] font-black uppercase tracking-widest" 
                            style={{ color: primaryColor }}
                        >
                            {resolvedSearchParams?.todos ? 'VER MENOS' : 'VER TODOS'}
                        </Link>
                    )}
                </div>

                <div className="space-y-4">
                    {(resolvedSearchParams?.todos ? filteredCanchas : filteredCanchas.slice(0, 4)).map((service: any) => (
                        <Link href={"/" + slug + "/servicio/" + service.id} key={service.id} className="bg-card-dynamic p-5 rounded-[2.2rem] shadow-sm flex items-center justify-between group transition-all">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <img src={getServicePrimaryImage(service, 'medium')} className="w-[72px] h-[72px] rounded-full object-cover border" style={{ borderColor: `${neutralColor}` }} />
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border border-white" style={{ backgroundColor: tertiaryColor }}>
                                        <Sparkles size={10} className="text-white" fill="white" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-black text-lg leading-tight" style={{ color: textColor }}>{service.nombre}</h4>
                                    <p className="text-[11px] font-bold mt-1.5 text-slate-500">{service.extraInfo?.descripcion || service.descripcion || 'Libera tensión y recupera tu energía vital.'}</p>
                                </div>
                            </div>
                            <ChevronRight style={{ color: primaryColor }} className="w-6 h-6 opacity-30 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    ))}
                </div>
            </section>

            {/* PROMOCIONES */}
            {promocionesActivas.length > 0 && (
                <section id="promociones" className="px-6 mb-12">
                    <PromotionsSection 
                        promociones={promocionesActivas} 
                        slug={slug} 
                        primaryColor={primaryColor}
                        tertiaryColor={tertiaryColor}
                        textColor={textColor}
                        showPrices={negocio.mostrarPrecios !== false}
                    />
                </section>
            )}

            {/* CURSOS Y TALLERES */}
            {coursesModuleEnabled && cursosActivos.length > 0 && (
                <section id="cursos" className="mb-12">
                    <PublicCoursesSection 
                        cursosActivos={cursosActivos} 
                        businessSlug={slug}
                        primaryColor={primaryColor}
                        tertiaryColor={tertiaryColor}
                        textColor={textColor}
                        showPrices={negocio.mostrarPrecios !== false}
                    />
                </section>
            )}

            {/* SECCIÃ“N DE MIS TRABAJOS (RESULTADOS) - Antes y Después Premium */}
            {resultadosDestacados.length > 0 && (
                <section id="resultados" className="px-6 mb-24 overflow-hidden">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 block" style={{ color: primaryColor }}>RESULTADOS REALES</span>
                            <h3 className="text-4xl font-black leading-none" style={{ color: textColor }}>Mis <br/>Trabajos</h3>
                        </div>
                        <Link 
                            href={`/${slug}/portafolio`}
                            className="flex flex-col items-center gap-2 group/btn"
                        >
                            <div className="size-16 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover/btn:bg-slate-900 group-hover/btn:text-white transition-all duration-500 shadow-sm">
                                <Plus size={28} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ver todos</span>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:gap-8">
                        {resultadosDestacados.slice(0, 3).map((item) => (
                            <Link 
                                key={item.id} 
                                href={`/${slug}/portafolio#trabajo-${item.id}`}
                                className="group bg-card-dynamic rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-slate-200/30 overflow-hidden flex flex-col transition-all duration-500 hover:shadow-pink-100/10 relative active:scale-[0.98]"
                            >
                                <div className="absolute top-4 left-4 z-20">
                                    <div className="px-3.5 py-1.5 bg-white/95 backdrop-blur-md rounded-full text-[8px] font-black text-slate-900 uppercase tracking-widest border border-white shadow-md flex items-center gap-1.5">
                                        <Sparkles size={10} className="text-pink-500" />
                                        {item.type === 'GALLERY' ? 'Galería' : 'Transformación'}
                                    </div>
                                </div>

                                {/* Media Area */}
                                {item.type !== 'GALLERY' ? (
                                    <div className="relative aspect-[16/9] flex overflow-hidden">
                                        <div className="w-1/2 relative">
                                            <img src={item.beforeImage} className="w-full h-full object-cover grayscale-[0.2]" alt="Antes" />
                                            <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/30 backdrop-blur-md rounded-lg text-[7px] font-black text-white uppercase tracking-widest border border-white/10">Antes</div>
                                        </div>
                                        <div className="w-1/2 relative">
                                            <img src={item.afterImage} className="w-full h-full object-cover" alt="Después" />
                                            <div className="absolute top-4 right-4 px-2.5 py-1 bg-white/80 backdrop-blur-md rounded-lg text-[7px] font-black text-slate-900 uppercase tracking-widest border border-white shadow-sm">Después</div>
                                        </div>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-10 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-900 z-10 group-hover:scale-110 transition-transform duration-500">
                                            <ArrowLeftRight size={16} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-50">
                                        <img src={item.gallery?.[0] || businessImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3s]" alt={item.title} />
                                        <div className="absolute bottom-4 right-4 px-3.5 py-1 bg-white/95 backdrop-blur-md rounded-full text-[8px] font-black text-slate-900 uppercase tracking-widest border border-white shadow-md flex items-center gap-1.5">
                                            <ImageIcon size={12} /> {item.gallery?.length || 0} Fotos
                                        </div>
                                    </div>
                                )}

                                {/* Info Area */}
                                <div className="p-6 sm:p-8 space-y-2.5">
                                    <div className="flex items-center gap-3">
                                        {item.service && (
                                            <span className="text-[9px] font-black text-pink-500 uppercase tracking-[0.2em]">
                                                {item.service.nombre}
                                            </span>
                                        )}
                                        {item.clientName && (
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">
                                                • {item.clientName}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <h4 className="text-xl font-black leading-tight" style={{ color: textColor }}>
                                        {item.title}
                                    </h4>
                                    <p className="text-xs font-medium text-slate-400 leading-relaxed line-clamp-2 italic">
                                        "{item.description}"
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* PÁGINAS PERSONALIZADAS - BOUTIQUE EXPLORER */}
            {paginasPersonalizadas.length > 0 && (
                <section id="paginas" className="px-6 mb-24">
                    <div className="flex justify-between items-end mb-10">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 block" style={{ color: primaryColor }}>DESCUBRE MÁS</span>
                            <h3 className="text-4xl font-black leading-none" style={{ color: textColor }}>Contenido <br/>Exclusivo</h3>
                        </div>
                        <div className="size-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                            <FileText size={24} />
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-8">
                        {paginasPersonalizadas.map((page) => (
                            <Link 
                                href={`/${slug}/pagina/${page.slug}`} 
                                key={page.id}
                                className="group relative w-full bg-card-dynamic rounded-[3.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 transition-all duration-700"
                            >
                                <div className="flex flex-col md:flex-row">
                                    <div className="md:w-2/5 aspect-[16/10] md:aspect-square relative overflow-hidden">
                                        <img 
                                            src={page.featuredImage || businessImage} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s] ease-out"
                                            alt={page.title}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                                    </div>
                                    
                                    <div className="md:w-3/5 p-8 md:p-12 flex flex-col justify-center relative">
                                        {/* Decorative Element */}
                                        <div className="absolute top-8 right-8 size-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500">
                                            <ArrowUpRight size={24} />
                                        </div>

                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] mb-4 block" style={{ color: primaryColor }}>Especial Spa</span>
                                        <h4 className="text-2xl md:text-3xl font-black leading-tight mb-4 transition-colors" style={{ color: textColor }}>
                                            {page.title}
                                        </h4>
                                        <p className="text-sm font-medium text-slate-400 leading-relaxed mb-8 max-w-md">
                                            Sumérgete en los detalles de nuestra filosofía de bienestar, rituales exclusivos y la esencia que nos hace únicos.
                                        </p>
                                        
                                        <div className="flex items-center gap-4">
                                            <div className="h-px w-8 opacity-30" style={{ backgroundColor: primaryColor }} />
                                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: textColor }}>
                                                Leer artículo
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* UBICACIONES */}
            {resolvedUbicaciones.length > 0 && (
                <section id="ubicacion" className="px-6 mb-32">
                    <div className="flex items-center gap-3 mb-8">
                         <div className="w-2 h-7 rounded-sm" style={{ backgroundColor: tertiaryColor }}></div>
                         <h3 className="text-2xl font-black tracking-tight" style={{ color: textColor }}>Ubicación</h3>
                    </div>
                    <div className="space-y-8">
                        {resolvedUbicaciones.map((sede: any) => (
                            <div key={sede.id} className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
                                <iframe width="100%" height="220" style={{ border: 0 }} loading="lazy" allowFullScreen src={sede.embedSrc}></iframe>
                                <div className="p-6 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-black text-lg" style={{ color: textColor }}>{sede.nombre}</h4>
                                        <p className="text-xs font-semibold opacity-40 flex items-center gap-1.5 mt-1.5">
                                            <MapPin size={14} /> {sede.direccion}
                                        </p>
                                    </div>
                                    <a href={sede.navUrl} target="_blank" rel="noopener noreferrer" className="p-4 rounded-2xl transition-all active:scale-95" style={{ backgroundColor: primaryColor, color: 'white' }}>
                                        <Compass size={24} />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Script optimizado de Next.js para scroll suave seguro sin cambiar el historial en la PWA */}
            <Script 
                id="smooth-scroll-pwa"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{ 
                    __html: `
                        (function() {
                            function setupSmoothScroll() {
                                document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
                                    if (anchor.getAttribute('data-scroller-attached')) return;
                                    anchor.setAttribute('data-scroller-attached', 'true');
                                    
                                    anchor.addEventListener('click', function(e) {
                                        var href = this.getAttribute('href');
                                        if (href === '#') return;
                                        var targetId = href.substring(1);
                                        var target = document.getElementById(targetId);
                                        if (target) {
                                            e.preventDefault();
                                            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }
                                    });
                                });
                            }
                            
                            // Ejecutar al inicio y tras navegaciones del cliente
                            setupSmoothScroll();
                            
                            // Re-intentar periódicamente por si el DOM cambia dinámicamente
                            var timer = setInterval(setupSmoothScroll, 1000);
                            setTimeout(function() { clearInterval(timer); }, 10000);
                        })();
                    `
                }} 
            />
        </main>
    );
}
