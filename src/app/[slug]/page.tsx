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
import ReferralBanner from '@/components/public/ReferralBanner';
import ReviewsCarousel from '@/components/public/ReviewsCarousel';

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

    // --- Comentarios y calificaciones reales de los clientes ---
    let reviews: any[] = [];
    try {
        const dbReviews = await prisma.rating.findMany({
            where: {
                appointment: { negocioId: negocio.id },
                raterRole: 'client',
                comment: { not: null, notIn: [''] }
            },
            include: {
                appointment: {
                    include: {
                        cliente: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 6
        });
        
        reviews = dbReviews.map((r: any) => ({
            id: r.id,
            comment: r.comment,
            stars: r.stars,
            appointment: {
                cliente: r.appointment?.cliente ? {
                    nombre: r.appointment.cliente.nombre,
                    avatar: r.appointment.cliente.avatar
                } : null
            }
        }));
    } catch (e) {
        console.error("Error loading reviews:", e);
    }

    if (reviews.length === 0) {
        reviews = [
            {
                id: 'fb-1',
                comment: 'Excelente atención, el lugar es hermoso y los resultados increíbles. Reservé desde el celular en menos de un minuto.',
                stars: 5,
                appointment: {
                    cliente: {
                        nombre: 'María P.',
                        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'
                    }
                }
            },
            {
                id: 'fb-2',
                comment: 'Muy profesionales, la atención al detalle es fantástica. Recomiendo totalmente el masaje relajante corporal.',
                stars: 5,
                appointment: {
                    cliente: {
                        nombre: 'Carlos G.',
                        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150'
                    }
                }
            },
            {
                id: 'fb-3',
                comment: 'El sistema de reservas por WhatsApp es una maravilla. Me atendieron a la hora exacta. ¡5 estrellas!',
                stars: 5,
                appointment: {
                    cliente: {
                        nombre: 'Laura M.',
                        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
                    }
                }
            }
        ];
    }

    // --- Datos del referido (si el usuario llegó por un enlace de referido) ---
    let referrerName = '';
    let referralCode = '';
    try {
        const cookieStore = await cookies();
        const rawCode = cookieStore.get('referral_code')?.value;
        if (rawCode) {
            const cleanCode = rawCode.trim().toUpperCase();
            const refCodeRecord = await (prisma as any).referralCode.findUnique({
                where: { codigo: cleanCode },
                include: { user: { select: { nombre: true } } }
            });
            // Solo mostrar el banner si el código pertenece a este negocio
            if (refCodeRecord && refCodeRecord.negocioId === negocio.id) {
                referralCode = cleanCode;
                referrerName = refCodeRecord.user?.nombre || 'Un amigo';
            }
        }
    } catch (e) {
        // No bloquear el render si falla la consulta del referido
    }

    return (
        <main className="min-h-screen font-sans pb-32 md:pb-12 relative overflow-x-hidden" style={{ backgroundColor: neutralColor }}>
            {/* Cabecera Flotante (Solo Móvil) */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between md:hidden bg-gradient-to-b from-white/98 via-white/90 to-transparent backdrop-blur-md shadow-[0_2px_15px_rgba(0,0,0,0.02)] border-b border-slate-100/5 transition-all">
                <Link href={`/${slug}`} className="flex items-center gap-3">
                    {negocio.logoUrl ? (
                        <img src={negocio.logoUrl} alt={negocio.nombre} className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-100/50" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-black text-lg shadow-sm border border-slate-100/50">
                            {negocio.nombre.substring(0, 1)}
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="font-black text-base uppercase tracking-wider leading-none" style={{ color: textColor }}>
                            {negocio.nombre}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                            <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} size={8} className="text-amber-400" fill="currentColor" />
                                ))}
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">4.9 (2.3k+)</span>
                        </div>
                    </div>
                </Link>

                <Link href={`/${slug}/mis-reservas`} className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-700 shadow-sm relative active:scale-95 transition-transform">
                    <Bell size={18} />
                    {userReservasActivas > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-pink-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
                            {userReservasActivas}
                        </span>
                    )}
                </Link>
            </header>

            {/* Espaciado superior */}
            <div className={nextAppointment ? "pt-[110px]" : "pt-20"}></div>

            {/* PRÓXIMA CITA ALERT BANNER */}
            {nextAppointment && (
                <div className="px-6 mb-6">
                    <NextAppointmentBanner 
                        appointment={nextAppointment}
                        slug={slug}
                        primaryColor={primaryColor}
                    />
                </div>
            )}

            {/* 2. HERO IMAGE CON SUBTÍTULO INTEGRADO */}
            <section className="px-6 mb-6">
                <div className="relative w-full aspect-[16/11] sm:aspect-[16/10] max-h-[380px] rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100/50">
                    <HeroCarousel images={displayImages} baseClass="absolute inset-0 w-full h-full object-cover" opacityActive="opacity-100" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/10" />
                    
                    {/* Contenido integrado en la imagen */}
                    <div className="absolute inset-x-0 bottom-6 px-6 text-center space-y-3.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full">
                            <span className="text-[7.5px] font-black text-white uppercase tracking-[0.2em]">
                                BIENVENIDO A {negocio.nombre.toUpperCase()}
                            </span>
                        </div>

                        {negocio.heroTitulo && (
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-md leading-none">
                                {negocio.heroTitulo}
                            </h2>
                        )}
                        {negocio.heroSubtitulo && (
                            <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] leading-relaxed drop-shadow-md max-w-[280px] mx-auto">
                                {negocio.heroSubtitulo}
                            </p>
                        )}
                        {negocio.horarioApertura && negocio.horarioCierre && (
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black/40 backdrop-blur-md border border-white/5 rounded-full mt-1">
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full animate-pulse shrink-0",
                                    isCurrentlyOpen ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]"
                                )} />
                                <span className="text-[8px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-1">
                                    <span className={cn(isCurrentlyOpen ? "text-emerald-400" : "text-rose-400")}>
                                        {isCurrentlyOpen ? 'ABIERTO' : 'CERRADO'}
                                    </span>
                                    <span className="text-white/30 font-normal">|</span>
                                    <span>{negocio.horarioApertura} - {negocio.horarioCierre}</span>
                                </span>
                            </div>
                        )}

                        <div className="flex flex-col items-center pt-1.5">
                            <Link
                                href={`/${slug}/servicios`}
                                className="inline-flex items-center gap-2 px-7 py-3 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-md hover:brightness-110 active:scale-95 transition-all"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Elegir servicio
                                <ChevronRight size={12} strokeWidth={3} />
                            </Link>
                            <p className="text-[8px] font-bold text-white/50 flex items-center justify-center gap-1 mt-2.5 tracking-wide">
                                <Clock size={10} />
                                Reserva en menos de un minuto.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. TARJETAS DE CONFIANZA */}
            <section className="px-6 mb-6">
                <div className="grid grid-cols-4 gap-2 bg-white rounded-3xl p-3 border border-slate-100/50 shadow-sm">
                    {/* Calificación */}
                    <div className="flex flex-col items-center text-center">
                        <Star size={16} className="text-pink-500" fill="currentColor" />
                        <span className="text-[11px] font-black text-slate-800 mt-1">4.9/5</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Opiniones</span>
                    </div>
                    {/* Clientes */}
                    <div className="flex flex-col items-center text-center border-l border-slate-100">
                        <Users size={16} className="text-pink-500" />
                        <span className="text-[11px] font-black text-slate-800 mt-1">2.3k+</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Felices</span>
                    </div>
                    {/* Servicios */}
                    <div className="flex flex-col items-center text-center border-l border-slate-100">
                        <Sparkles size={16} className="text-pink-500" />
                        <span className="text-[11px] font-black text-slate-800 mt-1">{filteredCanchas.length}+</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Servicios</span>
                    </div>
                    {/* Ubicación */}
                    <div className="flex flex-col items-center text-center border-l border-slate-100">
                        <MapPin size={16} className="text-pink-500" />
                        <span className="text-[11px] font-black text-slate-800 mt-1 truncate max-w-[64px]">{negocio.ciudad || 'Quito'}</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ubicación</span>
                    </div>
                </div>
            </section>

            {/* 3. MENSAJE DE BIENVENIDA */}
            {negocio.mensajeBienvenida && (
                <section className="px-10 mb-6 text-center">
                    <p className="text-xs font-serif italic text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                        "{negocio.mensajeBienvenida}"
                    </p>
                </section>
            )}

            {/* 4. PROMOCIONES (Movidas inmediatamente debajo de las tarjetas de confianza) */}
            {promocionesActivas.length > 0 && (
                <section id="promociones" className="px-6 mb-6">
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

            {/* 5. NUEVOS SERVICIOS (Rediseñados con tags dinámicos y Ver detalles) */}
            <section id="servicios" className="px-6 mb-6">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest mb-1 block" style={{ color: primaryColor }}>OPCIONES PARA TI</span>
                        <h3 className="text-2xl font-black leading-none" style={{ color: textColor }}>Nuestros Servicios</h3>
                    </div>
                    {filteredCanchas.length > 0 && (
                        <Link 
                            href={`/${slug}/servicios`}
                            className="text-[10px] font-black uppercase tracking-widest" 
                            style={{ color: primaryColor }}
                        >
                            VER TODOS
                        </Link>
                    )}
                </div>

                <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none px-1">
                    {filteredCanchas.slice(0, 4).map((service: any, index: number) => {
                        const mockRating = (4.7 + (index * 0.1) % 0.3).toFixed(1);
                        const mockReviews = 180 + (index * 35);
                        
                        const tags = ["Más reservado", "Nuevo", "Popular", "Favorito"];
                        const currentTag = tags[index % tags.length];

                        return (
                            <div 
                                key={service.id} 
                                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-4 flex flex-col justify-between min-w-[280px] max-w-[280px] shrink-0 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                            >
                                {/* Imagen del servicio */}
                                <div className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden mb-4 bg-slate-50">
                                    <img 
                                        src={getServicePrimaryImage(service, 'medium')} 
                                        className="w-full h-full object-cover" 
                                        alt={service.nombre} 
                                    />
                                    {/* Badge con la etiqueta dinámica */}
                                    <div className="absolute top-3 left-3 bg-pink-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                                        {currentTag}
                                    </div>
                                    {/* Icono Corazón (Favoritos) */}
                                    <button className="absolute top-3 right-3 size-8 rounded-full bg-white/90 backdrop-blur-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-pink-500 active:scale-95 transition-all">
                                        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Contenido */}
                                <div className="flex-1 flex flex-col justify-between px-1">
                                    <div>
                                        <h4 className="font-black text-[17px] leading-snug line-clamp-2" style={{ color: textColor }}>
                                            {service.nombre}
                                        </h4>
                                        
                                        {/* Info line */}
                                        <div className="flex items-center gap-4 mt-2.5 mb-3 text-slate-400 text-[11px] font-bold">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} className="text-slate-400" />
                                                {service.duracionMinutos || 60} min
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Star size={12} className="text-amber-400" fill="currentColor" />
                                                {mockRating} ({mockReviews})
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        {/* Precio */}
                                        <div className="text-2xl font-black mb-3" style={{ color: primaryColor }}>
                                            ${service.precio}
                                        </div>

                                        {/* Botón Ver detalles */}
                                        <Link 
                                            href={`/${slug}/servicio/${service.id}`}
                                            className="block w-full text-center py-3 rounded-2xl border text-xs font-black uppercase tracking-widest active:scale-95 transition-all bg-white hover:bg-slate-50 shadow-sm"
                                            style={{ 
                                                borderColor: `${primaryColor}26`, 
                                                color: primaryColor 
                                            }}
                                        >
                                            Ver detalles
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* CURSOS Y TALLERES */}
            {coursesModuleEnabled && cursosActivos.length > 0 && (
                <section id="cursos" className="mb-6 px-6">
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

            {/* 6. RESULTADOS REALES (Rediseñados para mostrar sólo la imagen y el título en un scroll horizontal) */}
            {resultadosDestacados.length > 0 && (
                <section id="resultados" className="px-6 mb-6">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest mb-1 block" style={{ color: primaryColor }}>RESULTADOS REALES</span>
                            <h3 className="text-2xl font-black leading-none" style={{ color: textColor }}>Resultados Reales</h3>
                        </div>
                        <Link 
                            href={`/${slug}/portafolio`}
                            className="text-[10px] font-black uppercase tracking-widest" 
                            style={{ color: primaryColor }}
                        >
                            Ver todos
                        </Link>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none px-1">
                        {resultadosDestacados.map((item) => {
                            const isGallery = item.type === 'GALLERY';

                            return (
                                <Link 
                                    key={item.id} 
                                    href={`/${slug}/portafolio#trabajo-${item.id}`}
                                    className="group relative aspect-[4/3] w-[180px] sm:w-[220px] rounded-[2rem] overflow-hidden shrink-0 bg-slate-50 border border-slate-100 shadow-sm flex hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                                >
                                    {/* Si es transformación (Antes/Después), los mostramos lado a lado */}
                                    {!isGallery ? (
                                        <>
                                            <div className="w-1/2 relative h-full">
                                                <img src={item.beforeImage} className="w-full h-full object-cover" alt="Antes" />
                                            </div>
                                            <div className="w-1/2 relative h-full border-l border-white/60">
                                                <img src={item.afterImage} className="w-full h-full object-cover" alt="Después" />
                                            </div>
                                        </>
                                    ) : (
                                        <img src={item.gallery?.[0] || businessImage} className="w-full h-full object-cover" alt={item.title} />
                                    )}
                                    
                                    {/* Badge del título centrado abajo */}
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-md border border-slate-100/50 max-w-[90%] truncate">
                                        <span className="text-[10px] font-black text-slate-800 tracking-wide uppercase leading-none block text-center">
                                            {item.title}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* 7. OPINIONES (ReviewsCarousel con slider dinámico) */}
            {reviews.length > 0 && (
                <section id="opiniones" className="px-6 mb-6">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest mb-1 block" style={{ color: primaryColor }}>TESTIMONIOS</span>
                            <h3 className="text-2xl font-black leading-none" style={{ color: textColor }}>Opiniones</h3>
                        </div>
                    </div>
                    <ReviewsCarousel 
                        reviews={reviews} 
                        primaryColor={primaryColor} 
                        textColor={textColor} 
                    />
                </section>
            )}

            {/* PÁGINAS PERSONALIZADAS - BOUTIQUE EXPLORER */}
            {paginasPersonalizadas.length > 0 && (
                <section id="paginas" className="px-6 mb-6">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: primaryColor }}>DESCUBRE MÁS</span>
                            <h3 className="text-2xl font-black leading-none" style={{ color: textColor }}>Contenido Exclusivo</h3>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-6">
                        {paginasPersonalizadas.map((page) => (
                            <Link 
                                href={`/${slug}/pagina/${page.slug}`} 
                                key={page.id}
                                className="group relative w-full bg-white border border-slate-100/50 rounded-[2.5rem] overflow-hidden shadow-sm transition-all duration-500"
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
                                    
                                    <div className="md:w-3/5 p-6 md:p-8 flex flex-col justify-center relative">
                                        <div className="absolute top-6 right-6 size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-200 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-500">
                                            <ArrowUpRight size={20} />
                                        </div>
 
                                        <span className="text-[8px] font-black uppercase tracking-widest mb-2 block" style={{ color: primaryColor }}>Especial Spa</span>
                                        <h4 className="text-xl font-black leading-tight mb-2 transition-colors" style={{ color: textColor }}>
                                            {page.title}
                                        </h4>
                                        <p className="text-xs font-semibold text-slate-400 leading-relaxed mb-4 max-w-md line-clamp-2">
                                            Sumérgete en los detalles de nuestra filosofía de bienestar, rituales exclusivos y la esencia que nos hace únicos.
                                        </p>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className="h-px w-6 opacity-30" style={{ backgroundColor: primaryColor }} />
                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: textColor }}>
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
                <section id="ubicacion" className="px-6 mb-12">
                    <div className="flex items-center gap-3 mb-6">
                         <div className="w-2.5 h-6 rounded-sm" style={{ backgroundColor: tertiaryColor }}></div>
                         <h3 className="text-xl font-black tracking-tight" style={{ color: textColor }}>Ubicación</h3>
                    </div>
                    <div className="space-y-6">
                        {resolvedUbicaciones.map((sede: any) => (
                            <div key={sede.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100/50 shadow-sm">
                                <iframe width="100%" height="220" style={{ border: 0 }} loading="lazy" allowFullScreen src={sede.embedSrc}></iframe>
                                <div className="p-5 flex justify-between items-center">
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
                            
                            setupSmoothScroll();
                            var timer = setInterval(setupSmoothScroll, 1000);
                            setTimeout(function() { clearInterval(timer); }, 10000);
                        })();
                    `
                }} 
            />

            {/* Banner de referido */}
            {referralCode && (
                <ReferralBanner
                    referrerName={referrerName}
                    referralCode={referralCode}
                    negocioName={negocio.nombre}
                    primaryColor={primaryHex}
                />
            )}
        </main>
    );
}
