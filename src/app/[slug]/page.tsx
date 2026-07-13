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
import { MapPin, Search, Star, Zap, Clock, ChevronRight, ArrowUpRight, ArrowLeftRight, Wifi, Car, Coffee, Shirt, ShoppingBag, Phone, Globe, Mail, Send, Trophy, Home, Calendar, User, Users, Swords, Instagram, Facebook, FileText, Dribbble, Rocket, MessageCircle, Sparkles, Scissors, ChevronLeft, Bell, CheckCircle, Compass, Image as ImageIcon, Plus, Bus, ShieldCheck, Accessibility, Maximize, Locate } from 'lucide-react';
import HeroCarousel from '@/components/HeroCarousel';
import NewsletterForm from '@/components/NewsletterForm';
import NextAppointmentBanner from '@/components/public/NextAppointmentBanner';
import ReferralBanner from '@/components/public/ReferralBanner';
import ReviewsCarousel from '@/components/public/ReviewsCarousel';
import NotificationBell from '@/components/public/NotificationBell';
import { NotificationService } from '@/lib/notifications/notificationService';
import HomeServicesClient from './HomeServicesClient';

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
    let initialUnreadCount = 0;
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

                // 🔔 Calcular el initialUnreadCount de notificaciones no leídas
                const u = await prisma.usuario.findFirst({
                    where: {
                        negocioId: payload.negocioId as string,
                        OR: [
                            { phone: { contains: telefono.replace(/\D/g, '') } },
                            { phone: telefono }
                        ]
                    },
                    select: { id: true }
                });

                if (u) {
                    initialUnreadCount = await NotificationService.getUnreadCount(u.id, payload.negocioId as string);
                }
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
                        cliente: true,
                        service: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 20
        });
        
        reviews = dbReviews.map((r: any) => ({
            id: r.id,
            comment: r.comment,
            stars: r.stars,
            createdAt: r.createdAt,
            appointment: {
                cliente: r.appointment?.cliente ? {
                    nombre: r.appointment.cliente.nombre,
                    avatar: r.appointment.cliente.avatar
                } : null,
                servicio: r.appointment?.service?.nombre || null
            }
        }));
    } catch (e) {
        console.error("Error loading reviews:", e);
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
                        <span className="font-black text-base uppercase tracking-wider leading-none text-slate-900">
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

                <NotificationBell slug={slug} initialUnreadCount={initialUnreadCount} />
            </header>

            {/* Espaciado superior */}
            <div className={nextAppointment ? "h-[128px]" : "h-[92px]"}></div>

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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />
                    
                    {/* Contenido integrado en la imagen */}
                    <div className="absolute inset-x-0 bottom-6 px-6 text-center space-y-3.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full">
                            <span className="text-[7.5px] font-black text-white uppercase tracking-[0.2em]">
                                BIENVENIDO A {negocio.nombre.split(' - ')[0].toUpperCase()}
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

            {/* 3. TARJETAS DE CONFIANZA (INTERACTIVAS) */}
            <section className="px-6 mb-6">
                <div className="grid grid-cols-4 gap-2 bg-white rounded-3xl p-3 border border-slate-100/50 shadow-sm">
                    {/* Calificación */}
                    <button id="btn-opiniones" className="flex flex-col items-center text-center cursor-pointer active:scale-95 transition-transform outline-none bg-transparent border-0 p-0 w-full">
                        <Star size={16} fill="currentColor" style={{ color: primaryColor }} />
                        <span className="text-[11px] font-black text-slate-800 mt-1">4.9/5</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Opiniones</span>
                    </button>
                    {/* Clientes */}
                    <button id="btn-fidelizacion" className="flex flex-col items-center text-center border-l border-slate-100 cursor-pointer active:scale-95 transition-transform outline-none bg-transparent border-0 p-0 w-full">
                        <Users size={16} style={{ color: primaryColor }} />
                        <span className="text-[11px] font-black text-slate-800 mt-1">2.3k+</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Felices</span>
                    </button>
                    {/* Servicios */}
                    <a href="#servicios-seccion" className="flex flex-col items-center text-center border-l border-slate-100 cursor-pointer active:scale-95 transition-transform outline-none no-underline">
                        <Sparkles size={16} style={{ color: primaryColor }} />
                        <span className="text-[11px] font-black text-slate-800 mt-1">{filteredCanchas.length}+</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Servicios</span>
                    </a>
                    {/* Ubicación */}
                    <a href="#ubicacion" className="flex flex-col items-center text-center border-l border-slate-100 cursor-pointer active:scale-95 transition-transform outline-none no-underline">
                        <MapPin size={16} style={{ color: primaryColor }} />
                        <span className="text-[11px] font-black text-slate-800 mt-1 truncate max-w-[64px]">{negocio.ciudad || 'Quito'}</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ubicación</span>
                    </a>
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
                <section id="promociones" className="mb-6">
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

            {/* 5. NUEVOS SERVICIOS (Rediseñados con tags dinámicos y Ver detalles + Favoritos Reactivos) */}
            <section id="servicios-seccion">
                <HomeServicesClient 
                    filteredCanchas={filteredCanchas}
                    slug={slug}
                    primaryColor={primaryColor}
                    textColor={textColor}
                />
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
                            <h3 className="text-2xl font-black leading-none text-slate-900">Resultados Reales</h3>
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
                            <h3 className="text-2xl font-black leading-none text-slate-900">Opiniones</h3>
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
                            <h3 className="text-2xl font-black leading-none text-slate-900">Contenido Exclusivo</h3>
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
                                        <h4 className="text-xl font-black leading-tight mb-2 transition-colors text-slate-900">
                                            {page.title}
                                        </h4>
                                        <p className="text-xs font-semibold text-slate-400 leading-relaxed mb-4 max-w-md line-clamp-2">
                                            Sumérgete en los detalles de nuestra filosofía de bienestar, rituales exclusivos y la esencia que nos hace únicos.
                                        </p>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className="h-px w-6 opacity-30" style={{ backgroundColor: primaryColor }} />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">
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
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-pink-50 text-pink-500 rounded-2xl border border-pink-100/50">
                            <MapPin size={20} className="stroke-[2.5]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight text-slate-800 uppercase leading-none">Ubicación</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Encuéntranos fácilmente</p>
                        </div>
                    </div>
                    
                    <div className="space-y-8">
                        {resolvedUbicaciones.map((sede: any) => (
                            <div key={sede.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100/70 shadow-sm flex flex-col">
                                
                                {/* Contenedor del Mapa con Botones e Imagen de Fachada */}
                                <div className="relative w-full h-[240px] bg-slate-50 overflow-hidden">
                                    <iframe 
                                        width="100%" 
                                        height="100%" 
                                        style={{ border: 0, filter: 'contrast(1.05) brightness(0.98)' }} 
                                        loading="lazy" 
                                        allowFullScreen 
                                        src={sede.embedSrc}
                                    />
                                    
                                    {/* Botón flotante: Mi ubicación (arriba derecha) */}
                                    <a 
                                        href="https://www.google.com/maps/search/?api=1&query=mi+ubicacion" 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="absolute top-4 right-4 bg-white/95 hover:bg-white text-pink-500 border border-slate-100 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest shadow-md flex items-center gap-1.5 active:scale-95 transition-all z-10"
                                    >
                                        <Locate size={10} className="stroke-[3]" />
                                        Mi ubicación
                                    </a>

                                    {/* Botón flotante: Ver mapa (abajo derecha) */}
                                    <a 
                                        href={sede.navUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="absolute bottom-4 right-4 bg-white/95 hover:bg-white text-slate-800 border border-slate-100 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest shadow-md flex items-center gap-1.5 active:scale-95 transition-all z-10"
                                    >
                                        <Maximize size={10} className="stroke-[3]" />
                                        Ver mapa
                                    </a>

                                    {/* Foto de la fachada (abajo izquierda) */}
                                    {sede.imagenUrl && (
                                        <div className="absolute bottom-4 left-4 size-16 rounded-2xl overflow-hidden border-2 border-white shadow-lg z-10 bg-slate-200">
                                            <img 
                                                src={sede.imagenUrl} 
                                                alt="Fachada del local" 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Tarjeta Informativa Inferior */}
                                {(() => {
                                    const rawPhone = sede.telefono || "0991234567";
                                    const cleanPhone = rawPhone.replace(/\D/g, "");
                                    const formattedPhone = cleanPhone.startsWith("593") 
                                        ? cleanPhone 
                                        : cleanPhone.startsWith("0") 
                                            ? `593${cleanPhone.slice(1)}` 
                                            : `593${cleanPhone}`;
                                    const whatsappUrl = `https://wa.me/${formattedPhone}`;

                                    return (
                                        <div className="p-6 bg-white border-b border-slate-50 flex flex-col md:flex-row items-stretch gap-6 md:gap-0">
                                            {/* Sede y Dirección */}
                                            <div className="flex-1 flex items-start gap-4">
                                                <div className="p-3 bg-pink-50 text-pink-500 rounded-2xl border border-pink-100/30 flex items-center justify-center shrink-0">
                                                    <MapPin size={20} className="stroke-[2.5]" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight">{sede.nombre}</h4>
                                                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-sm">
                                                        {sede.direccion}
                                                    </p>
                                                    <a 
                                                        href={sede.navUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="inline-flex items-center gap-1 text-[10px] font-black text-pink-500 hover:text-pink-600 uppercase tracking-wider pt-1.5 transition-colors"
                                                    >
                                                        Cómo llegar <span className="text-xs">→</span>
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Horario */}
                                            <div className="flex-1 md:border-l border-slate-100 md:pl-6 flex items-start gap-4">
                                                <div className="p-3 bg-pink-50/50 text-pink-500 rounded-2xl flex items-center justify-center shrink-0">
                                                    <Clock size={20} className="stroke-[2.5]" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horario</h5>
                                                    <p className="text-xs font-black text-slate-800 leading-tight">
                                                        {sede.horario ? (
                                                            sede.horario.split(/(\d+:\d+\s*(?:AM|PM|am|pm))/).map((txt: string, idx: number) => {
                                                                const isTime = /\d+:\d+\s*(?:AM|PM|am|pm)/.test(txt);
                                                                return isTime ? <span key={idx} className="block text-[10px] text-slate-400 font-semibold mt-0.5">{txt}</span> : <span key={idx}>{txt}</span>;
                                                            })
                                                        ) : (
                                                            <>
                                                                Lun - Dom
                                                                <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">8:00 AM - 11:00 PM</span>
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Teléfono */}
                                            <div className="flex-1 md:border-l border-slate-100 md:pl-6 flex items-start gap-4">
                                                <div className="p-3 bg-pink-50/50 text-pink-500 rounded-2xl flex items-center justify-center shrink-0">
                                                    <Phone size={20} className="stroke-[2.5]" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono</h5>
                                                    <a 
                                                        href={whatsappUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center text-xs font-black text-slate-800 hover:text-pink-500 leading-tight transition-colors"
                                                    >
                                                        {sede.telefono || "099 123 4567"}
                                                        <span className="text-[8px] text-emerald-600 font-black bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 ml-2 uppercase tracking-wider">WhatsApp</span>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Barra de Características / Servicios de Valor Agregado (si hay al menos uno habilitado) */}
                                {(sede.tieneParqueadero || sede.tieneTransporte || sede.tieneZonaSegura || sede.tieneAccesoFacil) && (
                                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-nowrap overflow-x-auto gap-4 scrollbar-none items-center justify-start md:justify-around">
                                        {/* Parqueadero */}
                                        {sede.tieneParqueadero && (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="p-2 bg-pink-100/60 text-pink-500 rounded-xl">
                                                    <Car size={14} className="stroke-[2.5]" />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Parqueadero Disponible</span>
                                            </div>
                                        )}

                                        {/* Transporte */}
                                        {sede.tieneTransporte && (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="p-2 bg-pink-100/60 text-pink-500 rounded-xl">
                                                    <Bus size={14} className="stroke-[2.5]" />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Transporte Cercano</span>
                                            </div>
                                        )}

                                        {/* Zona Segura */}
                                        {sede.tieneZonaSegura && (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="p-2 bg-pink-100/60 text-pink-500 rounded-xl">
                                                    <ShieldCheck size={14} className="stroke-[2.5]" />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Zona Segura</span>
                                            </div>
                                        )}

                                        {/* Acceso Fácil */}
                                        {sede.tieneAccesoFacil && (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="p-2 bg-pink-100/60 text-pink-500 rounded-xl">
                                                    <Accessibility size={14} className="stroke-[2.5]" />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Acceso Fácil</span>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                                            var header = document.querySelector('header');
                                            var headerHeight = header ? header.offsetHeight : 80;
                                            var elementPosition = target.getBoundingClientRect().top;
                                            var offsetPosition = elementPosition + window.pageYOffset - headerHeight - 15;
                                            
                                            window.scrollTo({
                                                top: offsetPosition,
                                                behavior: 'smooth'
                                            });
                                        }
                                    });
                                });
                            }
                            
                            function setupModals() {
                                var btnOpiniones = document.getElementById('btn-opiniones');
                                if (btnOpiniones && !btnOpiniones.getAttribute('data-listener-attached')) {
                                    btnOpiniones.setAttribute('data-listener-attached', 'true');
                                    btnOpiniones.addEventListener('click', function(e) {
                                        e.preventDefault();
                                        var modal = document.getElementById('modal-opiniones');
                                        if (modal) modal.showModal();
                                    });
                                }
                                
                                var btnFidelizacion = document.getElementById('btn-fidelizacion');
                                if (btnFidelizacion && !btnFidelizacion.getAttribute('data-listener-attached')) {
                                    btnFidelizacion.setAttribute('data-listener-attached', 'true');
                                    btnFidelizacion.addEventListener('click', function(e) {
                                        e.preventDefault();
                                        var modal = document.getElementById('modal-fidelizacion');
                                        if (modal) modal.showModal();
                                    });
                                }

                                // Botones de Cierre de Modales
                                var closeOpiniones = document.getElementById('btn-close-opiniones');
                                if (closeOpiniones && !closeOpiniones.getAttribute('data-listener-attached')) {
                                    closeOpiniones.setAttribute('data-listener-attached', 'true');
                                    closeOpiniones.addEventListener('click', function(e) {
                                        e.preventDefault();
                                        var modal = document.getElementById('modal-opiniones');
                                        if (modal) modal.close();
                                    });
                                }

                                var closeFidelizacion = document.getElementById('btn-close-fidelizacion');
                                if (closeFidelizacion && !closeFidelizacion.getAttribute('data-listener-attached')) {
                                    closeFidelizacion.setAttribute('data-listener-attached', 'true');
                                    closeFidelizacion.addEventListener('click', function(e) {
                                        e.preventDefault();
                                        var modal = document.getElementById('modal-fidelizacion');
                                        if (modal) modal.close();
                                    });
                                }

                                var closeFidelizacionFooter = document.getElementById('btn-close-fidelizacion-footer');
                                if (closeFidelizacionFooter && !closeFidelizacionFooter.getAttribute('data-listener-attached')) {
                                    closeFidelizacionFooter.setAttribute('data-listener-attached', 'true');
                                    closeFidelizacionFooter.addEventListener('click', function(e) {
                                        e.preventDefault();
                                        var modal = document.getElementById('modal-fidelizacion');
                                        if (modal) modal.close();
                                    });
                                }
                            }
                            
                            setupSmoothScroll();
                            setupModals();
                            
                            var timer = setInterval(function() {
                                setupSmoothScroll();
                                setupModals();
                            }, 1000);
                            setTimeout(function() { clearInterval(timer); }, 10000);
                        })();
                    `
                }} 
            />

            {/* Dialog de Opiniones - Diseño Premium */}
            <dialog id="modal-opiniones" className="m-auto rounded-[2rem] p-0 max-w-md w-[92%] backdrop:bg-black/60 backdrop:backdrop-blur-sm border border-slate-100 shadow-2xl outline-none select-none bg-white overflow-hidden">
                <div className="flex flex-col max-h-[88vh] w-full overflow-hidden">
                    {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: primaryColor }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="m9 10 2 2 4-4"/></svg>
                            </div>
                            <div>
                                <h4 className="font-black text-slate-900 text-[15px] leading-none">Opiniones de clientes</h4>
                                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Lo que dicen nuestros clientes sobre nosotros</p>
                            </div>
                        </div>
                        <button id="btn-close-opiniones" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold active:scale-95 transition-transform border-0 cursor-pointer text-sm">×</button>
                    </div>
                </div>

                {/* Score Summary */}
                <div className="mx-5 mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col shrink-0">
                            <span className="text-5xl font-black leading-none" style={{ color: primaryColor }}>
                                {reviews.length > 0 ? (reviews.reduce((acc: number, r: any) => acc + r.stars, 0) / reviews.length).toFixed(1) : '0.0'}
                            </span>
                            <div className="flex gap-0.5 mt-1.5">
                                {Array.from({ length: 5 }).map((_: any, i: number) => (
                                    <span key={i} className="text-amber-400 text-[14px]">&#9733;</span>
                                ))}
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 mt-1">Basado en {reviews.length} opiniones</span>
                        </div>
                        <div className="flex-1 space-y-1">
                            {[5, 4, 3, 2, 1].map((star: number) => {
                                const count = reviews.filter((r: any) => r.stars === star).length;
                                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                                return (
                                    <div key={star} className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-bold text-slate-500 w-2">{star}</span>
                                        <span className="text-amber-400 text-[9px]">&#9733;</span>
                                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: primaryColor }} />
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 w-5 text-right">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Reviews list */}
                <div className="overflow-y-auto flex-1 px-5 pb-5 mt-3 space-y-3">
                    {reviews.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-slate-400 text-xs font-semibold">Aún no hay opiniones registradas.</p>
                        </div>
                    ) : (
                        reviews.map((r: any, idx: number) => {
                            const nombre = r.appointment?.cliente?.nombre || 'Cliente';
                            const inicial = nombre.charAt(0).toUpperCase();
                            const apellidoInicial = nombre.split(' ')[1]?.charAt(0).toUpperCase() || '';
                            const nombreCorto = `${nombre.split(' ')[0]} ${apellidoInicial ? apellidoInicial + '.' : ''}`.trim();
                            const fecha = r.createdAt ? (() => {
                                const d = new Date(r.createdAt);
                                const diffMs = Date.now() - d.getTime();
                                const diffDays = Math.floor(diffMs / 86400000);
                                if (diffDays === 0) return 'Hoy';
                                if (diffDays === 1) return 'Hace 1 día';
                                if (diffDays < 7) return `Hace ${diffDays} días`;
                                if (diffDays < 14) return 'Hace 1 semana';
                                if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
                                if (diffDays < 60) return 'Hace 1 mes';
                                return `Hace ${Math.floor(diffDays / 30)} meses`;
                            })() : '';
                            return (
                                <div key={r.id || idx} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-[13px] font-black" style={{ backgroundColor: primaryColor }}>
                                                {inicial}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[12px] font-black text-slate-900">{nombreCorto}</span>
                                                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                                                        Cliente verificado
                                                    </span>
                                                </div>
                                                <div className="flex gap-0.5 mt-0.5">
                                                    {Array.from({ length: 5 }).map((_: any, i: number) => (
                                                        <span key={i} className={`text-[11px] ${i < r.stars ? 'text-amber-400' : 'text-slate-200'}`}>&#9733;</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-semibold text-slate-400 shrink-0">{fecha}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{r.comment}</p>
                                    {r.appointment?.servicio && (
                                        <div className="flex items-center gap-1">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
                                            <span className="text-[9px] font-semibold text-slate-400">{r.appointment.servicio}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-4 pt-2 border-t border-slate-100 shrink-0 flex items-center justify-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: primaryColor }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    <span className="text-[9px] font-bold text-slate-400">Opiniones verificadas y reales de nuestros clientes</span>
                </div>
                </div>
            </dialog>

            {/* Dialog de Fidelización */}
            <dialog id="modal-fidelizacion" className="m-auto rounded-[2rem] p-6 max-w-md w-[90%] backdrop:bg-black/60 backdrop:backdrop-blur-sm border border-slate-100 shadow-2xl outline-none select-none text-slate-800 bg-white">
                <div className="space-y-5">
                    <div className="flex justify-between items-center">
                        <h4 className="font-black text-slate-900 text-base uppercase tracking-tight flex items-center gap-1.5">
                            👑 Club de Fidelización
                        </h4>
                        <button id="btn-close-fidelizacion" className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 font-bold active:scale-95 transition-transform border-0 cursor-pointer">✕</button>
                    </div>
                    <div className="text-center py-4 px-2 space-y-3">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-xl font-bold" style={{ color: primaryColor, backgroundColor: `color-mix(in srgb, ${primaryColor}, transparent 95%)`, borderColor: `color-mix(in srgb, ${primaryColor}, transparent 90%)`, borderStyle: 'solid', borderWidth: '1px' }}>
                            👑
                        </div>
                        <h5 className="font-black text-slate-900 uppercase tracking-wide text-xs">¡Acumula puntos y gana!</h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                            Por cada cita completada con nosotros acumulas puntos automáticamente. Canjea tus puntos acumulados por masajes, tratamientos faciales o servicios gratis.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-2">
                        <button id="btn-close-fidelizacion-footer" className="py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[8px] font-black uppercase tracking-widest text-slate-500 active:scale-95 transition-transform border-0 cursor-pointer">
                            Cerrar
                        </button>
                        <a href={`/${slug}/misiones/premios`} className="py-3 rounded-2xl text-[8px] font-black uppercase tracking-widest text-white text-center active:scale-95 transition-transform shadow-md no-underline flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                            Premios
                        </a>
                        <a href={`/${slug}/misiones`} className="py-3 rounded-2xl text-[8px] font-black uppercase tracking-widest text-white text-center active:scale-95 transition-transform shadow-md no-underline flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                            Misiones
                        </a>
                    </div>
                </div>
            </dialog>

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
