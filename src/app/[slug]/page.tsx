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
import { MapPin, Search, Star, Zap, Clock, ChevronRight, ArrowUpRight, ArrowLeftRight, Wifi, Car, Coffee, Shirt, ShoppingBag, Phone, Globe, Mail, Send, Trophy, Home, Calendar, User, Users, Swords, Instagram, Facebook, FileText, Dribbble, Rocket, MessageCircle, Sparkles, Scissors, ChevronLeft, Bell, CheckCircle, Compass, Image as ImageIcon, Plus, Bus, ShieldCheck, Accessibility, Maximize, Locate, QrCode, Dumbbell } from 'lucide-react';
import HeroCarousel from '@/components/HeroCarousel';
import NewsletterForm from '@/components/NewsletterForm';
import NextAppointmentBanner from '@/components/public/NextAppointmentBanner';
import ReferralBanner from '@/components/public/ReferralBanner';
import ReviewsCarousel from '@/components/public/ReviewsCarousel';
import NotificationBell from '@/components/public/NotificationBell';
import { NotificationService } from '@/lib/notifications/notificationService';
import HomeServicesClient from './HomeServicesClient';
import HomeMembershipPlansClient from './HomeMembershipPlansClient';
import ProductsStoreClient from '@/components/public/ProductsStoreClient';
import PublicProductsBoutiqueSection from '@/components/public/PublicProductsBoutiqueSection';
import { ModuleResolver } from '@/lib/modules/ModuleResolver';
import { resolveLandingContent } from '@/lib/landingContentResolver';
import UniversalHeroCarousel from '@/components/public/UniversalHeroCarousel';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageExcerpt, pageImage } from '@/lib/customPages';

/** Convierte Decimal → number y Date → ISO para pasar datos de Prisma a Client Components. */
function toPlain<T>(value: T): T {
    const walk = (v: any): any => {
        if (v === null || typeof v !== 'object') return v;
        if (v instanceof Date) return v.toISOString();
        if (typeof v.toNumber === 'function' && typeof v.isFinite === 'function') return v.toNumber();
        if (Array.isArray(v)) return v.map(walk);
        const out: any = {};
        for (const k of Object.keys(v)) out[k] = walk(v[k]);
        return out;
    };
    return walk(value);
}


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const resolvedSearchParams = await searchParams;
    const productId = typeof resolvedSearchParams?.producto === 'string'
        ? resolvedSearchParams.producto
        : (typeof resolvedSearchParams?.p === 'string' ? resolvedSearchParams.p : null);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';

    if (productId) {
        try {
            const producto = await (prisma as any).producto.findFirst({
                where: {
                    id: productId,
                    activo: true,
                },
                include: {
                    negocio: {
                        select: {
                            nombre: true,
                            slug: true,
                            logoUrl: true,
                            heroSubtitulo: true,
                        }
                    },
                    variantes: {
                        where: { activo: true }
                    },
                }
            });

            if (producto) {
                const businessName = producto.negocio?.nombre || 'CitiOx';
                const formattedPrice = Number(producto.precio || 0).toLocaleString('es-DO', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
                const title = `${producto.nombre} - $${formattedPrice} | ${businessName}`;
                const description = producto.descripcion
                    ? producto.descripcion.trim().slice(0, 160)
                    : `Descubre ${producto.nombre} en ${businessName}. ¡Compra online con entrega y garantía!`;

                let rawImg = producto.imagenUrl;
                if (!rawImg && producto.extraInfo && typeof producto.extraInfo === 'object') {
                    const extra = producto.extraInfo as any;
                    if (Array.isArray(extra.imagenes) && extra.imagenes[0]) {
                        rawImg = extra.imagenes[0];
                    }
                }
                if (!rawImg && producto.variantes && producto.variantes.length > 0) {
                    const variantWithImg = producto.variantes.find((v: any) => v.imagenUrl);
                    if (variantWithImg) rawImg = variantWithImg.imagenUrl;
                }
                if (!rawImg) {
                    rawImg = producto.negocio?.logoUrl || '/icon.png';
                }

                const absoluteImageUrl = rawImg.startsWith('http')
                    ? rawImg
                    : `${baseUrl.replace(/\/$/, '')}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;

                const canonicalUrl = `${baseUrl.replace(/\/$/, '')}/${slug}?producto=${producto.id}`;

                return {
                    metadataBase: new URL(baseUrl),
                    title,
                    description,
                    openGraph: {
                        title,
                        description,
                        url: canonicalUrl,
                        siteName: businessName,
                        images: [
                            {
                                url: absoluteImageUrl,
                                width: 800,
                                height: 800,
                                alt: producto.nombre,
                            }
                        ],
                        type: 'website',
                    },
                    twitter: {
                        card: 'summary_large_image',
                        title,
                        description,
                        images: [absoluteImageUrl],
                    },
                    alternates: {
                        canonical: canonicalUrl,
                    }
                };
            }
        } catch (e) {
            console.error('[generateMetadata] Error fetching product metadata:', e);
        }
    }

    // Fallback general al negocio
    const negocio = await getNegocioBySlug(slug);
    if (!negocio) {
        return {
            title: 'CitiOx - Reserva y Tienda Online',
            manifest: `/api/pwa/manifest?slug=${slug}`
        };
    }

    const title = `${negocio.nombre} | CitiOx`;
    const description = negocio.heroSubtitulo || "Gestiona citas, clientes y servicios con CitiOx.";
    const ogImage = negocio.bannerUrl || negocio.logoUrl || '/icon.png';
    const absoluteOgImage = ogImage.startsWith('http')
        ? ogImage
        : `${baseUrl.replace(/\/$/, '')}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`;

    return {
        metadataBase: new URL(baseUrl),
        title,
        description,
        icons: {
            icon: negocio.logoUrl ? `${negocio.logoUrl}` : "/icon.png"
        },
        openGraph: {
            title,
            description,
            images: [
                {
                    url: absoluteOgImage,
                    width: 1200,
                    height: 630,
                    alt: negocio.nombre
                }
            ],
            type: 'website',
            siteName: negocio.nombre
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [absoluteOgImage],
        },
        manifest: `/api/pwa/manifest?slug=${slug}`
    };
}

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
    const targetProductId = typeof resolvedSearchParams?.producto === 'string'
        ? resolvedSearchParams.producto
        : (typeof resolvedSearchParams?.p === 'string' ? resolvedSearchParams.p : null);
    const viewParam = typeof resolvedSearchParams?.view === 'string' ? resolvedSearchParams.view.toLowerCase() : '';

    const negocio = await getNegocioBySlug(slug);

    if (!negocio) {
        notFound();
    }

    let initialSelectedProduct: any = null;
    if (targetProductId) {
        try {
            initialSelectedProduct = await (prisma as any).producto.findFirst({
                where: { id: targetProductId, negocioId: negocio.id, activo: true },
                include: { categoria: true, variantes: true }
            });
        } catch (_) {}
    }

    const { 
        normalizeBusinessConfig, 
        isLaundryOrShoeCareBusiness, 
        isDentalBusiness, 
        isGymBusiness, 
        isRestaurantBusiness, 
        isStoreBusiness 
    } = await import('@/lib/businessTypeHelper');

    const restConfig = normalizeBusinessConfig(negocio.configuracion);
    const blueprintId = restConfig.blueprintId;

    if (isDentalBusiness(negocio)) {
        let dentalServices: any[] = [];
        let dentalStaff: any[] = [];
        let dentalResults: any[] = [];
        let dentalPages: any[] = [];
        let dentalPromotions: any[] = [];
        try {
            const now = new Date();
            const [srvs, stf, res, pgs, prms] = await Promise.all([
                prisma.service.findMany({
                    where: { negocioId: negocio.id, estaActivo: true },
                    include: { Staff: { where: { active: true } }, Imagen: true, imageMedia: true },
                    orderBy: { nombre: 'asc' }
                }),
                prisma.staff.findMany({
                    where: { businessId: negocio.id, active: true },
                    include: { Service: true, imageMedia: true },
                    orderBy: { name: 'asc' }
                }),
                prisma.resultado.findMany({
                    where: { businessId: negocio.id },
                    orderBy: { id: 'desc' }
                }),
                prisma.page.findMany({
                    where: { businessId: negocio.id, status: { in: ['published', 'PUBLISHED'] } },
                    include: { imageMedia: true },
                    orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }]
                }),
                (prisma as any).promotion.findMany({
                    where: { businessId: negocio.id },
                    include: {
                        PromotionToService: {
                            include: { Service: true }
                        },
                        imageMedia: true
                    },
                    orderBy: { createdAt: 'desc' }
                })
            ]);
            dentalServices = srvs;
            dentalStaff = stf;
            dentalResults = res;
            dentalPages = pgs;
            dentalPromotions = (prms || []).filter((p: any) => {
                const isActiva = p.estado === 'activa' || p.estado === 'ACTIVA';
                const notExpired = !p.fechaFin || new Date(p.fechaFin) >= now;
                return isActiva && notExpired;
            });
        } catch (_) {}

        // Diseño elegido en la tienda de diseños (o vista previa con ?diseno=esmalte).
        const { readLandingState: readDentalState, getLandingDesign: getDentalDesign } = await import('@/lib/landingDesigns');
        const dentalState = readDentalState(negocio.configuracion);
        const dentalPreviewParam = typeof resolvedSearchParams?.diseno === 'string' ? resolvedSearchParams.diseno : null;
        const dentalPreview = dentalPreviewParam ? getDentalDesign(dentalPreviewParam) : undefined;
        const dentalDesignId = dentalPreview && dentalPreview.familias.includes('dental') ? dentalPreview.id : dentalState.activo;

        if (dentalDesignId === 'esmalte') {
            const { default: DentalEsmalteLanding } = await import('@/components/public/landings/DentalEsmalteLanding');
            return (
                <DentalEsmalteLanding
                    negocio={negocio}
                    services={dentalServices}
                    staff={dentalStaff}
                    results={dentalResults}
                    pages={dentalPages || []}
                    promotions={dentalPromotions}
                    previewOf={dentalPreview && dentalPreview.id !== dentalState.activo ? dentalPreview.id : null}
                />
            );
        }

        const { default: DentalLanding } = await import('@/modules/dental/components/DentalLanding');
        return (
            <DentalLanding
                negocio={negocio}
                services={dentalServices}
                staff={dentalStaff}
                results={dentalResults}
                pages={dentalPages || []}
                promotions={dentalPromotions}
            />
        );
    }

    const isRestaurantModule = isRestaurantBusiness(negocio);

    if (isRestaurantModule) {
        let initialProducts: any[] = [];
        let initialCategories: any[] = [];
        let initialHeroContent: any = { hero: [], highlights: [] };
        try {
            const { resolveLandingContent } = await import('@/lib/landingContentResolver');
            const [prods, cats, landingContent] = await Promise.all([
                (prisma as any).producto.findMany({ where: { negocioId: negocio.id }, orderBy: { orden: 'asc' }, include: { categoria: true } }),
                (prisma as any).categoriaProducto.findMany({ where: { negocioId: negocio.id, activo: true }, orderBy: { orden: 'asc' } }),
                resolveLandingContent(negocio.id)
            ]);
            // Prisma devuelve Decimal (stock, precios…): los Client Components solo aceptan objetos planos.
            initialProducts = toPlain(prods);
            initialCategories = toPlain(cats);
            initialHeroContent = landingContent;
        } catch (_) {}

        const { default: RestaurantLanding } = await import('@/modules/restaurant/components/RestaurantLanding');
        return (
            <RestaurantLanding
                negocio={negocio}
                initialProducts={initialProducts}
                initialCategories={initialCategories}
                initialHeroContent={initialHeroContent}
            />
        );
    }

    const isGymModule = isGymBusiness(negocio);

    let membershipPlans: any[] = [];
    let gymAreas: any[] = [];
    let gymEquipment: any[] = [];
    let gymPromotions: any[] = [];
    if (isGymModule) {
        try {
            const [plans, areas, equipment, promos] = await Promise.all([
                (prisma as any).membershipPlan.findMany({
                    where: { businessId: negocio.id, active: true },
                    orderBy: { displayOrder: 'asc' }
                }),
                (prisma as any).gymArea.findMany({
                    where: { businessId: negocio.id, active: true },
                    include: { imageMedia: { select: { url: true } } },
                    orderBy: { order: 'asc' }
                }).catch(() => []),
                (prisma as any).gymEquipment.findMany({
                    where: { businessId: negocio.id, active: true },
                    include: {
                        imageMedia: { select: { url: true } },
                        area: { select: { id: true, name: true } }
                    },
                    orderBy: { order: 'asc' }
                }).catch(() => []),
                (prisma as any).promotion.findMany({
                    where: {
                        businessId: negocio.id,
                        estado: { in: ['publicado', 'publicada', 'activa', 'ACTIVA'] },
                        fechaFin: { gte: new Date() }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }).catch(() => [])
            ]);
            membershipPlans = plans;
            gymAreas = areas.map((a: any) => ({ ...a, imageUrl: a.imageMedia?.url || a.imageUrl || null }));
            gymEquipment = equipment.map((e: any) => ({ ...e, imageUrl: e.imageMedia?.url || e.imageUrl || null }));
            gymPromotions = promos;
        } catch (e) {
            console.error('[slug/page] Error loading gym module data:', e);
        }
    }

    const isShoeCareModule = isLaundryOrShoeCareBusiness(negocio);

    const isStoreModule = isStoreBusiness(negocio, viewParam);

    if (isStoreModule && !ModuleResolver.isPinchosModule(slug)) {
        let initialProducts: any[] = [];
        let initialCategories: any[] = [];
        let initialHeroContent: any = { hero: [], highlights: [] };
        let initialPromotions: any[] = [];
        try {
            const { resolveLandingContent } = await import('@/lib/landingContentResolver');
            const [prods, cats, landingContent, promosDb] = await Promise.all([
                (prisma as any).producto.findMany({
                    where: { negocioId: negocio.id },
                    orderBy: { orden: 'asc' },
                    include: { categoria: true, variantes: true }
                }),
                (prisma as any).categoriaProducto.findMany({
                    where: { negocioId: negocio.id, activo: true },
                    orderBy: { orden: 'asc' }
                }),
                resolveLandingContent(negocio.id),
                (prisma as any).promotion.findMany({
                    where: {
                        businessId: negocio.id,
                        estado: { in: ['activa', 'activo', 'ACTIVA', 'ACTIVO', 'publicado', 'publicada'] }
                    },
                    orderBy: { createdAt: 'desc' },
                    include: { PromotionToService: true }
                }).catch(() => [])
            ]);
            initialProducts = prods;
            initialCategories = cats;
            initialHeroContent = landingContent;
            initialPromotions = promosDb || [];
        } catch (_) {}

        const { default: StoreLanding } = await import('@/modules/store/components/StoreLanding');
        if (initialSelectedProduct && !initialProducts.some((p: any) => p.id === initialSelectedProduct.id)) {
            initialProducts.unshift(initialSelectedProduct);
        }
        return (
            <StoreLanding
                negocio={negocio}
                initialProducts={initialProducts}
                initialCategories={initialCategories}
                initialHeroContent={initialHeroContent}
                initialPromotions={initialPromotions}
                initialSelectedProduct={initialSelectedProduct}
            />
        );
    }

    if (negocio.tipoNegocio === 'PRODUCTOS') {
        // Dispatch via ModuleResolver — never hardcode slug here
        if (ModuleResolver.isPinchosModule(slug)) {
            const { default: PinchosStoreModule } = await import('@/modules/pinchos/components/PinchosStoreModule');

            // Pre-fetch products server-side so the first render is not empty
            let initialProducts: any[] = [];
            let initialCategories: any[] = [];
            try {
                const [prods, cats] = await Promise.all([
                    (prisma as any).producto.findMany({
                        where: { negocioId: negocio.id },
                        orderBy: { orden: 'asc' }
                    }),
                    (prisma as any).categoriaProducto.findMany({
                        where: { negocioId: negocio.id, activo: true },
                        orderBy: { orden: 'asc' }
                    })
                ]);
                initialProducts = toPlain(prods);
                initialCategories = toPlain(cats);
            } catch (_) {
                // Non-critical — client will fetch via useEffect
            }

            return <PinchosStoreModule negocio={negocio} initialProducts={initialProducts} initialCategories={initialCategories} />;
        }
        return <ProductsStoreClient negocio={negocio} />;
    }

    if (isShoeCareModule) {
        let realReviews: any[] = [];
        let paginas: any[] = [];
        
        // Consulta de páginas con Prisma ORM directo
        try {
            const dbPages = await prisma.page.findMany({
                where: { businessId: negocio.id, status: { in: ['published', 'PUBLISHED'] } },
                orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }]
            });
            paginas = dbPages.map((p: any) => ({
                id: p.id,
                businessId: p.businessId,
                title: p.title,
                slug: p.slug,
                contentHtml: p.contentHtml || '',
                featuredImage: p.featuredImage || null,
                buttonText: p.buttonText || null,
                buttonUrl: p.buttonUrl || null,
                status: p.status,
            }));
            console.log(`[SHOE_CARE_PAGES] Cargadas ${paginas.length} páginas para negocio ${negocio.id}:`, paginas.map(p => p.slug));
        } catch (err) {
            console.error('[SHOE_CARE_PAGES_ERROR]', err);
        }


        // Consulta de reviews
        try {
            const dbReviews = await prisma.rating.findMany({
                where: {
                    appointment: { negocioId: negocio.id },
                    raterRole: 'client',
                    stars: { gt: 0 }
                },
                include: {
                    appointment: {
                        include: { cliente: true, service: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 6
            });
            realReviews = dbReviews.map((r: any) => ({
                id: r.id,
                comment: r.comment,
                stars: r.stars,
                author: r.appointment?.cliente?.nombre || 'Cliente',
                servicio: r.appointment?.service?.nombre || null
            })).filter(r => r.comment && r.comment.trim() !== '');
        } catch (_) {}

        const initialShoeCareView = (viewParam === 'tienda' || viewParam === 'store' || viewParam === 'productos' || viewParam === 'catalogo') ? 'tienda' : 'landing';
        if (initialShoeCareView === 'tienda') {
            const { default: ShoeCareLanding } = await import('@/modules/shoe-care/components/ShoeCareLanding');
            return <ShoeCareLanding negocio={negocio} reviews={realReviews} paginasPersonalizadas={paginas} initialView="tienda" />;
        }
        let hasStore = false;
        try {
            hasStore = (await (prisma as any).producto.count({ where: { negocioId: negocio.id, activo: true } })) > 0;
        } catch (_) {}
        const { default: LaundryLanding } = await import('@/modules/shoe-care/components/LaundryLanding');
        return <LaundryLanding negocio={toPlain(negocio)} reviews={realReviews} hasStore={hasStore} />;
    }

    if (negocio.tipoNegocio === 'SPORTS_COURTS' || (negocio.configuracion as any)?.tipoNegocio === 'SPORTS_COURTS' || slug.includes('canchas')) {
        let paginasCanchas: any[] = [];
        try {
            const dbPages = await prisma.page.findMany({
                where: { businessId: negocio.id, status: { in: ['published', 'PUBLISHED'] } },
                orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }]
            });
            paginasCanchas = dbPages.map((p: any) => ({
                id: p.id,
                businessId: p.businessId,
                title: p.title,
                slug: p.slug,
                contentHtml: p.contentHtml || '',
                featuredImage: p.featuredImage || null,
                buttonText: p.buttonText || null,
                buttonUrl: p.buttonUrl || null,
                status: p.status,
            }));
        } catch (_) {}

        let coursesModuleEnabled = false;
        try {
            const planRows: any[] = await prisma.$queryRawUnsafe(`SELECT p.courses_module FROM Plan p INNER JOIN Suscripcion s ON s.planId = p.id WHERE s.negocioId = '${negocio.id}' AND s.estado IN ('active', 'trial', 'ACTIVA', 'activa') LIMIT 1`);
            if (planRows && planRows.length > 0) {
                coursesModuleEnabled = planRows[0].courses_module === 1 || planRows[0].courses_module === true;
            }
        } catch (e) {
            console.error("[DEBUG] Error checking courses module for courts:", e);
        }

        let cursosActivos: any[] = [];
        if (coursesModuleEnabled) {
            try {
                const rawCursos = await (prisma as any).course.findMany({
                    where: { businessId: negocio.id, status: 'active' },
                    include: {
                        CourseSchedule: { include: { Service: { select: { nombre: true } } } },
                        _count: { select: { CourseEnrollment: { where: { status: 'approved' } } } }
                    },
                    orderBy: { createdAt: 'desc' }
                });
                cursosActivos = rawCursos.map((c: any) => ({
                    ...c,
                    schedules: c.CourseSchedule?.map((cs: any) => ({
                        ...cs,
                        service: cs.Service
                    })) || [],
                    _count: {
                        enrollments: c._count?.CourseEnrollment || 0
                    }
                }));
            } catch (_) {}
        }

        const { default: CanchaPublicLanding } = await import('@/modules/sports-courts/components/CanchaPublicLanding');
        return (
            <CanchaPublicLanding
                negocio={negocio}
                canchas={negocio.services || []}
                paginasPersonalizadas={paginasCanchas}
                cursos={cursosActivos}
                hasCoursesModule={coursesModuleEnabled}
            />
        );
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
        where: {
            businessId: negocio.id,
            estado: { in: ['activa', 'activo', 'ACTIVA', 'ACTIVO', 'publicado', 'publicada'] }
        },
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

    // Boutique en Spas/Servicios: solo si el negocio activó la venta de productos (add-on o tipo con pedidos).
    // Sin ella, los clientes no pueden comprar, así que no mostramos productos con carrito.
    const { getCommerceAccess } = await import('@/lib/business/commerceAccess');
    const commerceAccess = await getCommerceAccess(negocio as any);
    (negocio as any).commerceAccess = commerceAccess;
    if (!commerceAccess.orders) initialSelectedProduct = null;
    const rawProductosActivos = commerceAccess.orders
        ? await (prisma as any).producto.findMany({
            where: { negocioId: negocio.id, activo: true },
            include: { categoria: true, variantes: true },
            orderBy: { orden: 'asc' }
        })
        : [];

    const canchasConDisponibilidad = (negocio.canchas || []);
    const filteredCanchas = query ? canchasConDisponibilidad.filter((c: any) => c.nombre.toLowerCase().includes(query)) : canchasConDisponibilidad;
    
    // Resolver contenido dinámico mediante el Constructor Universal de Hero y Destacados
    const resolvedLandingContent = await resolveLandingContent(negocio.id);
    let bannerImages = resolvedLandingContent.hero.map((h: any) => h.image).filter((u: string) => u && u.trim() !== '');

    // Fallback defensivo si no hay imágenes en HeroItem
    if (bannerImages.length === 0) {
        bannerImages = (negocio.imagenes || [])
            .filter((img: any) => (img.esBanner || img.tipo === 'BANNER') && img.url && img.url.trim() !== '')
            .map((img: any) => img.url);
    }

    // Fallback 1: Buscar bannerUrls y bannerUrl guardados en configuracion del negocio
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
    const configBannerUrls = (Array.isArray(config.bannerUrls) ? config.bannerUrls : []).filter((u: string) => typeof u === 'string' && u.trim() !== '');
    const configBannerUrl = config.bannerUrl || config.banner_url || (negocio as any).bannerUrl;

    const allImages = (negocio.imagenes || [])
        .filter((img: any) => img.url && img.url.trim() !== '')
        .map((img: any) => img.url);

    let displayImages: string[] = [];
    if (configBannerUrls.length > 0) {
        displayImages = configBannerUrls;
    } else if (bannerImages.length > 0) {
        displayImages = bannerImages;
    } else if (configBannerUrl) {
        displayImages = [configBannerUrl];
    } else {
        displayImages = allImages;
    }
    
    // Fallback 2: Si displayImages está vacío, usar un banner hermoso según el rubro de negocio
    if (displayImages.length === 0) {
        const tipoRubro = String(config.tipoNegocio || (negocio as any).tipoNegocio || negocio.nombre || '').toLowerCase();
        
        let defaultBanner = 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=1200'; // Default Spa
        
        if (tipoRubro.includes('cancha') || tipoRubro.includes('padel') || tipoRubro.includes('tenis') || tipoRubro.includes('futbol') || tipoRubro.includes('deport') || (negocio as any).tipoNegocio === 'SPORTS_COURTS') {
            defaultBanner = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=1200'; // Cancha de Pádel / Tenis
        } else if (tipoRubro.includes('dental') || tipoRubro.includes('odont') || tipoRubro.includes('dent') || tipoRubro.includes('clinic')) {
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
        include: { imageMedia: true },
        where: { 
            businessId: negocio.id, 
            status: { in: ['published', 'PUBLISHED'] } 
        },
        orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }]
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
        // Sistema JS: 0=Dom, 1=Lun, ..., 6=Sab
        // Algunos negocios creados via Superadmin pueden tener 7=Domingo (ISO).
        // Normalizamos ambas representaciones a 0=Domingo antes de comparar.
        const diasAtencionRaw = config?.diasAtencion;
        if (diasAtencionRaw && Array.isArray(diasAtencionRaw) && diasAtencionRaw.length > 0) {
            const diasNumericos = diasAtencionRaw.map((d: any) => {
                const n = Number(d);
                return n === 7 ? 0 : n; // 7 (ISO domingo) → 0 (JS domingo)
            });
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
    let allReviews: any[] = [];
    try {
        const dbReviews = await prisma.rating.findMany({
            where: {
                appointment: { negocioId: negocio.id },
                raterRole: 'client',
                stars: { gt: 0 }
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
            }
        });
        
        allReviews = dbReviews.map((r: any) => ({
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

    const reviews = allReviews.filter((r: any) => r.comment && r.comment.trim() !== '');

    // --- Estadísticas globales de calificaciones y clientes ---
    let totalOpiniones = allReviews.length;
    let promedioOpiniones = allReviews.length > 0 
        ? allReviews.reduce((acc: number, r: any) => acc + r.stars, 0) / allReviews.length 
        : 5.0;
    let totalClientes = 0;

    try {
        totalClientes = await prisma.cliente.count({
            where: { negocioId: negocio.id }
        });
    } catch (e) {
        console.error("Error counting clientes:", e);
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

    if (isShoeCareModule) {
        const { default: ShoeCareLanding } = await import('@/modules/shoe-care/components/ShoeCareLanding');
        return (
            <main className="min-h-screen font-sans pb-32 relative overflow-x-hidden">
                <ShoeCareLanding negocio={negocio} />
            </main>
        );
    }

    // ── Diseño de página elegido por el negocio (tienda de diseños) ──
    // ?diseno=<id> permite ver la vista previa de otro diseño sin activarlo.
    const { readLandingState, getLandingDesign } = await import('@/lib/landingDesigns');
    const landingState = readLandingState(negocio.configuracion);
    const previewParam = typeof resolvedSearchParams?.diseno === 'string' ? resolvedSearchParams.diseno : null;
    const previewDesign = previewParam ? getLandingDesign(previewParam) : undefined;
    const activeDesignId = previewDesign ? previewDesign.id : landingState.activo;

    if (!isGymModule && (activeDesignId === 'esencia' || activeDesignId === 'brillo')) {
        const { default: SpaEsenciaLanding } = activeDesignId === 'brillo'
            ? await import('@/components/public/landings/SalonBrilloLanding')
            : await import('@/components/public/landings/SpaEsenciaLanding');
        return (
            <SpaEsenciaLanding
                negocio={negocio}
                slug={slug}
                services={filteredCanchas}
                heroImages={displayImages}
                isOpen={isCurrentlyOpen}
                promedio={promedioOpiniones}
                totalOpiniones={totalOpiniones}
                totalClientes={totalClientes}
                reviews={reviews}
                resultados={resultadosDestacados}
                ubicaciones={resolvedUbicaciones}
                promociones={promocionesActivas}
                productos={
                    initialSelectedProduct && !rawProductosActivos.some((p: any) => p.id === initialSelectedProduct.id)
                        ? [initialSelectedProduct, ...rawProductosActivos]
                        : rawProductosActivos
                }
                cursos={cursosActivos}
                coursesEnabled={coursesModuleEnabled}
                paginas={paginasPersonalizadas}
                nextAppointment={nextAppointment}
                initialUnreadCount={initialUnreadCount}
                clientName={clientName}
                referrerName={referrerName}
                referralCode={referralCode}
                initialSelectedProduct={initialSelectedProduct}
                previewOf={previewDesign && previewDesign.id !== landingState.activo ? previewDesign.id : null}
                primaryColor={primaryHex}
                tertiaryColor={tertiaryColor}
                textColor={textColor}
            />
        );
    }

    // ── Datos para la barra de acciones y la sección de ubicación ──
    const waDigits = String(negocio.whatsapp || '').replace(/\D/g, '');
    const waNumber = waDigits.startsWith('593') ? waDigits : waDigits.startsWith('0') ? `593${waDigits.slice(1)}` : waDigits ? `593${waDigits}` : '';
    const mainWhatsapp = waNumber.length >= 11 ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hola ${negocio.nombre}, quiero reservar una cita.`)}` : null;
    const horarioGeneral = negocio.horarioApertura && negocio.horarioCierre ? `${negocio.horarioApertura} – ${negocio.horarioCierre}` : null;
    const compactNum = (n: number) => (n > 999 ? `${(n / 1000).toFixed(1)}k` : String(n));
    const mainCtaHref = isGymModule ? '#planes' : '#servicios-seccion';
    const mainCtaText = isGymModule ? 'Ver planes' : 'Reservar cita';
    // Texto legible sobre el color de la marca (rosado claro → texto oscuro).
    const primaryInk = (() => {
        const h = primaryHex.replace('#', '');
        const f = h.length === 3 ? h.split('').map((c: string) => c + c).join('') : h;
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#1e1b2e' : '#ffffff';
    })();

    return (
        <main className="min-h-screen font-sans pb-32 md:pb-16 relative overflow-x-hidden" style={{ backgroundColor: neutralColor }}>
            {/* Contenedor y ritmo de secciones (CSS normal: no depende de clases generadas) */}
            <style>{`
                .cx{max-width:1200px;margin-left:auto;margin-right:auto;padding-left:24px;padding-right:24px}
                @media (min-width:768px){.cx{padding-left:32px;padding-right:32px}}
                .cx-sec{margin-top:48px;scroll-margin-top:96px}
                @media (min-width:768px){.cx-sec{margin-top:80px}}
                .cx-bleed{margin-left:-24px;margin-right:-24px}
                .cx-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}
                @media (min-width:768px){.cx-stats{display:flex;flex-wrap:wrap;gap:4px}}
                .cx-flush > section{padding-left:0 !important;padding-right:0 !important;margin-bottom:0 !important}
                .cx-row{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px;scrollbar-width:none}
                .cx-row::-webkit-scrollbar{display:none}
                .cx-row > *{scroll-snap-align:start;flex-shrink:0}
                @media (min-width:768px){
                    .cx-grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));overflow:visible}
                    .cx-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));overflow:visible}
                    .cx-loc{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr)}
                    .cx-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center}
                }
            `}</style>

            {/* Cabecera Flotante (Solo Móvil) */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between md:hidden bg-gradient-to-b from-white/98 via-white/90 to-transparent backdrop-blur-md shadow-[0_2px_15px_rgba(0,0,0,0.02)] border-b border-slate-100/5 transition-all">
                <Link href={`/${slug}`} className="flex items-center gap-3">
                    {negocio.logoUrl ? (
                        <img src={negocio.logoUrl} alt={negocio.nombre} className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-100/50" />
                    ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm border border-slate-100/50" style={{ backgroundColor: primaryColor }}>
                            {negocio.nombre.substring(0, 1)}
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="font-bold text-base leading-tight text-slate-900">{negocio.nombre}</span>
                        {totalOpiniones > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                                <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star key={i} size={10} className={i < Math.round(promedioOpiniones) ? "text-amber-400" : "text-slate-200"} fill="currentColor" />
                                    ))}
                                </div>
                                <span className="text-xs text-slate-500 leading-none">{promedioOpiniones.toFixed(1)} ({compactNum(totalOpiniones)})</span>
                            </div>
                        )}
                    </div>
                </Link>
                <NotificationBell slug={slug} initialUnreadCount={initialUnreadCount} />
            </header>

            {/* Espaciador superior (solo celular, por la cabecera fija) */}
            <div className="h-[84px] md:h-6" />

            <div className="cx">
                {/* PRÓXIMA CITA */}
                {nextAppointment && (
                    <div className="mb-4">
                        <NextAppointmentBanner appointment={nextAppointment} slug={slug} primaryColor={primaryColor} />
                    </div>
                )}

                {/* 1. BANNERS (portada) */}
                <section aria-label="Destacados">
                    <UniversalHeroCarousel
                        heroItems={resolvedLandingContent.hero}
                        negocio={negocio}
                        isOpenNow={isCurrentlyOpen}
                        defaultImages={displayImages}
                    />
                </section>

                {/* 2. BARRA DE CONFIANZA + ACCIONES */}
                <section aria-label="Resumen" className="relative z-10 mx-auto -mt-6 w-[calc(100%-24px)] md:-mt-10 md:w-[calc(100%-64px)]">
                    <div className="cx-actions gap-4 rounded-3xl bg-white p-4 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5 md:p-5">
                        <div className="cx-stats">
                            {totalOpiniones > 0 && (
                                <button id="btn-opiniones" className="flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-slate-50 active:scale-95 bg-transparent border-0 cursor-pointer">
                                    <span className="flex size-10 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in srgb, ${primaryColor} 12%, white)`, color: primaryColor }}><Star size={18} fill="currentColor" /></span>
                                    <span>
                                        <span className="block text-lg font-bold leading-none text-slate-900">{promedioOpiniones.toFixed(1)}</span>
                                        <span className="mt-1 block text-xs text-slate-500">{compactNum(totalOpiniones)} {totalOpiniones === 1 ? 'opinión' : 'opiniones'}</span>
                                    </span>
                                </button>
                            )}
                            {totalClientes > 0 && (
                                <button id="btn-fidelizacion" className="flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-slate-50 active:scale-95 bg-transparent border-0 cursor-pointer">
                                    <span className="flex size-10 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in srgb, ${primaryColor} 12%, white)`, color: primaryColor }}><Users size={18} /></span>
                                    <span>
                                        <span className="block text-lg font-bold leading-none text-slate-900">{compactNum(totalClientes)}</span>
                                        <span className="mt-1 block text-xs text-slate-500">{isGymModule ? 'Socios' : 'Clientes'}</span>
                                    </span>
                                </button>
                            )}
                            {(isGymModule ? membershipPlans.length : filteredCanchas.length) > 0 && (
                                <a href={mainCtaHref} className="flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2 no-underline transition hover:bg-slate-50">
                                    <span className="flex size-10 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in srgb, ${primaryColor} 12%, white)`, color: primaryColor }}><Sparkles size={18} /></span>
                                    <span>
                                        <span className="block text-lg font-bold leading-none text-slate-900">{isGymModule ? membershipPlans.length : filteredCanchas.length}</span>
                                        <span className="mt-1 block text-xs text-slate-500">{isGymModule ? 'Planes' : 'Servicios'}</span>
                                    </span>
                                </a>
                            )}
                            {(negocio.ciudad || horarioGeneral) && (
                                <a href="#ubicacion" className="flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2 no-underline transition hover:bg-slate-50">
                                    <span className="flex size-10 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in srgb, ${primaryColor} 12%, white)`, color: primaryColor }}><Clock size={18} /></span>
                                    <span>
                                        <span className={`block text-sm font-bold leading-none ${isCurrentlyOpen ? 'text-emerald-600' : 'text-slate-500'}`}>{isCurrentlyOpen ? 'Abierto ahora' : 'Cerrado ahora'}</span>
                                        <span className="mt-1 block text-xs text-slate-500">{horarioGeneral || negocio.ciudad}</span>
                                    </span>
                                </a>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <a href={mainCtaHref} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold no-underline shadow-sm transition hover:brightness-110 active:scale-[0.98] md:flex-none" style={{ backgroundColor: primaryColor, color: primaryInk }}>
                                <Calendar size={17} /> {mainCtaText}
                            </a>
                            {mainWhatsapp && (
                                <a href={mainWhatsapp} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-800 no-underline transition hover:bg-slate-50">
                                    <MessageCircle size={17} className="text-emerald-600" /> <span className="hidden sm:inline">WhatsApp</span>
                                </a>
                            )}
                        </div>
                    </div>
                    {negocio.mensajeBienvenida && (
                        <p className="mx-auto mt-5 max-w-xl text-center font-serif text-[15px] italic leading-relaxed text-slate-500">“{negocio.mensajeBienvenida}”</p>
                    )}
                </section>

                <div className="cx-bleed" style={{ marginTop: 24 }}>
            {/* BANNER ACCESO SOCIO GYM */}
            {isGymModule && (
                <section className="px-6 mb-6">
                    <Link
                        href={`/${slug}/mi-gym`}
                        className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-950 p-4 border border-slate-800 shadow-xl flex items-center justify-between transition-all active:scale-[0.98] hover:border-emerald-500/40"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                                <QrCode className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold uppercase tracking-wide text-emerald-400">
                                        Portal del Socio
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                </div>
                                <h3 className="font-bold text-sm text-white mt-0.5">
                                    ¿Ya eres socio? Entra a Mi Gym
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Credencial QR, asistencias y rutinas
                                </p>
                            </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white/10 text-white group-hover:bg-emerald-500 transition-colors shrink-0">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </Link>
                </section>
            )}

                </div>

                {isGymModule ? (
                    <div className="cx-sec cx-bleed">
                    {/* GYM — 1. CONOCE EL GIMNASIO (INSTALACIONES Y EQUIPOS) */}
                    {(gymAreas.length > 0 || gymEquipment.length > 0) && (
                        <section id="conoce-el-gym" className="mb-8 px-4 sm:px-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: primaryColor }}>Instalaciones</span>
                                    <h3 className="text-2xl font-bold leading-none text-slate-900">Conoce el Gimnasio</h3>
                                </div>
                            </div>
                            {gymAreas.length > 0 && (
                                <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none">
                                    {gymAreas.map((area: any) => (
                                        <div key={area.id} className="relative shrink-0 w-48 sm:w-56 rounded-2xl overflow-hidden border border-slate-200/80 shadow-md group">
                                            <div className="aspect-[3/4] bg-slate-100">
                                                {area.imageUrl ? (
                                                    <img src={area.imageUrl} alt={area.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                                        <Dumbbell className="text-slate-300" size={36} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                                            <div className="absolute bottom-0 left-0 right-0 p-3.5">
                                                <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide leading-tight">{area.name}</p>
                                                {area.description && <p className="text-xs text-white/80 mt-1 line-clamp-2 leading-tight">{area.description}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* GYM — 2. PROMOCIONES DESTACADAS */}
                    {promocionesActivas.length > 0 && (
                        <section id="promociones" className="mb-8">
                            <PromotionsSection 
                                promociones={promocionesActivas} 
                                slug={slug} 
                                primaryColor={primaryColor}
                                tertiaryColor={tertiaryColor}
                                textColor={textColor}
                                showPrices={negocio.mostrarPrecios !== false}
                                totalServicesCount={canchasConDisponibilidad.length}
                                isGym={true}
                            />
                        </section>
                    )}

                    {/* GYM — 3. PLANES DE MEMBRESÍA */}
                    <HomeMembershipPlansClient 
                        plans={membershipPlans}
                        promotions={promocionesActivas}
                        slug={slug}
                        primaryColor={primaryColor}
                        textColor={textColor}
                        whatsapp={negocio.whatsapp}
                        businessName={negocio.nombre}
                    />

                    </div>
                ) : (
                    <>
                        {/* 3. PROMOCIONES */}
                        {promocionesActivas.length > 0 && (
                            <section id="promociones" className="cx-sec cx-bleed">
                                <PromotionsSection
                                    promociones={promocionesActivas}
                                    slug={slug}
                                    primaryColor={primaryColor}
                                    tertiaryColor={tertiaryColor}
                                    textColor={textColor}
                                    showPrices={negocio.mostrarPrecios !== false}
                                    totalServicesCount={canchasConDisponibilidad.length}
                                    isGym={false}
                                />
                            </section>
                        )}

                        {/* 4. SERVICIOS */}
                        <section id="servicios-seccion" className="cx-sec">
                            <HomeServicesClient
                                filteredCanchas={filteredCanchas}
                                slug={slug}
                                primaryColor={primaryColor}
                                textColor={textColor}
                                tipoNegocio={negocio.tipoNegocio}
                                showPrices={negocio.mostrarPrecios !== false}
                            />
                        </section>
                    </>
                )}

                {/* 5. RESULTADOS REALES */}
                {resultadosDestacados.length > 0 && (
                    <section id="resultados" className="cx-sec">
                        <SectionHead eyebrow="Hecho aquí" title="Resultados reales" color={primaryColor} action={{ href: `/${slug}/portafolio`, label: 'Ver portafolio' }} />
                        <div className="cx-row cx-grid-4">
                            {resultadosDestacados.slice(0, 8).map((item) => {
                                const isGallery = item.type === 'GALLERY';
                                return (
                                    <Link key={item.id} href={`/${slug}/portafolio#trabajo-${item.id}`}
                                        className="group relative block aspect-[4/5] w-[72%] overflow-hidden rounded-3xl bg-slate-100 sm:w-[45%] md:w-auto">
                                        {!isGallery ? (
                                            <span className="flex h-full">
                                                <img src={item.beforeImage} className="h-full w-1/2 object-cover" alt="Antes" loading="lazy" />
                                                <img src={item.afterImage} className="h-full w-1/2 border-l-2 border-white object-cover" alt="Después" loading="lazy" />
                                            </span>
                                        ) : (
                                            <img src={item.gallery?.[0] || businessImage} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" alt={item.title} loading="lazy" />
                                        )}
                                        {!isGallery && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-800">Antes · Después</span>}
                                        {item.title && (
                                            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-sm font-semibold text-white">{item.title}</span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* 6. OPINIONES */}
                {reviews.length > 0 && (
                    <section id="opiniones" className="cx-sec">
                        <SectionHead eyebrow="Testimonios" title="Lo que dicen nuestros clientes" color={primaryColor}
                            aside={totalOpiniones > 0 ? (
                                <button data-open-modal="modal-opiniones" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 cursor-pointer">
                                    <Star size={15} className="text-amber-400" fill="currentColor" /> {promedioOpiniones.toFixed(1)} · Ver las {compactNum(totalOpiniones)}
                                </button>
                            ) : null} />
                        <ReviewsCarousel reviews={reviews} primaryColor={primaryColor} textColor={textColor} />
                    </section>
                )}

                {/* 7. PRODUCTOS */}
                {(rawProductosActivos.length > 0 || initialSelectedProduct) && (
                    <div className="cx-sec cx-flush">
                        <PublicProductsBoutiqueSection
                            productos={
                                initialSelectedProduct && !rawProductosActivos.some((p: any) => p.id === initialSelectedProduct.id)
                                    ? [initialSelectedProduct, ...rawProductosActivos]
                                    : rawProductosActivos
                            }
                            negocio={negocio}
                            slug={slug}
                            primaryColor={primaryColor}
                            initialSelectedProduct={initialSelectedProduct}
                        />
                    </div>
                )}

                {/* 8. CURSOS Y TALLERES */}
                {coursesModuleEnabled && cursosActivos.length > 0 && (
                    <div className="cx-sec cx-flush">
                        <PublicCoursesSection
                            cursosActivos={cursosActivos}
                            businessSlug={slug}
                            primaryColor={primaryColor}
                            tertiaryColor={tertiaryColor}
                            textColor={textColor}
                            showPrices={negocio.mostrarPrecios !== false}
                        />
                    </div>
                )}

                {/* 9. PÁGINAS PERSONALIZADAS */}
                {paginasPersonalizadas.length > 0 && (
                    <section id="paginas" className="cx-sec">
                        <SectionHead eyebrow="Descubre más" title={isGymModule ? 'Conoce más del gimnasio' : 'Conoce más de nosotros'} color={primaryColor}
                            action={paginasPersonalizadas.length > 3 ? { href: `/${slug}/paginas`, label: 'Ver todo' } : undefined} />
                        <div className="cx-row cx-grid-3">
                            {paginasPersonalizadas.slice(0, 6).map((page) => (
                                <Link href={`/${slug}/pagina/${page.slug}`} key={page.id}
                                    className="group flex w-[80%] flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-lg sm:w-[46%] md:w-auto">
                                    <span className="relative block aspect-[16/10] overflow-hidden bg-slate-100">
                                        <img src={pageImage(page) || businessImage} alt={page.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                                    </span>
                                    <span className="flex flex-1 flex-col p-5">
                                        <span className="text-lg font-bold leading-snug text-slate-900">{page.title}</span>
                                        {page.contentHtml && <span className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">{pageExcerpt(page.contentHtml, 140)}</span>}
                                        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold" style={{ color: primaryColor }}>Leer más <ArrowUpRight size={15} /></span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* 10. UBICACIÓN */}
                {resolvedUbicaciones.length > 0 && (
                    <section id="ubicacion" className="cx-sec">
                        <SectionHead eyebrow="Visítanos" title={resolvedUbicaciones.length > 1 ? 'Nuestras sedes' : 'Dónde estamos'} color={primaryColor} />
                        <div className="space-y-6">
                            {resolvedUbicaciones.map((sede: any) => {
                                const telDigits = String(sede.telefono || '').replace(/\D/g, '');
                                const telWa = telDigits ? (telDigits.startsWith('593') ? telDigits : telDigits.startsWith('0') ? `593${telDigits.slice(1)}` : `593${telDigits}`) : '';
                                const horario = sede.horario || horarioGeneral;
                                const extras = [
                                    sede.tieneParqueadero && { icon: Car, label: 'Parqueadero' },
                                    sede.tieneTransporte && { icon: Bus, label: 'Transporte cercano' },
                                    sede.tieneZonaSegura && { icon: ShieldCheck, label: 'Zona segura' },
                                    sede.tieneAccesoFacil && { icon: Accessibility, label: 'Acceso fácil' },
                                ].filter(Boolean) as { icon: any; label: string }[];
                                return (
                                    <div key={sede.id} className="cx-loc overflow-hidden rounded-3xl bg-white ring-1 ring-slate-900/5">
                                        <div className="relative min-h-[240px] bg-slate-100 md:min-h-[340px]">
                                            {sede.embedSrc && <iframe title={`Mapa de ${sede.nombre || negocio.nombre}`} className="absolute inset-0 h-full w-full border-0" loading="lazy" allowFullScreen src={sede.embedSrc} />}
                                            {sede.imagenUrl && (
                                                <div className="absolute bottom-4 left-4 z-10 h-20 w-28 cursor-pointer overflow-hidden rounded-2xl border-2 border-white bg-slate-200 shadow-xl">
                                                    <img src={sede.imagenUrl} alt="Fachada del local" className="foto-fachada-click h-full w-full object-cover" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-5 p-6 md:p-8">
                                            {sede.nombre && <h4 className="text-xl font-bold text-slate-900">{sede.nombre}</h4>}
                                            {sede.direccion && (
                                                <p className="flex gap-3 text-[15px] leading-relaxed text-slate-700"><MapPin size={19} className="mt-0.5 shrink-0" style={{ color: primaryColor }} />{sede.direccion}</p>
                                            )}
                                            {horario && (
                                                <p className="flex gap-3 text-[15px] text-slate-700"><Clock size={19} className="mt-0.5 shrink-0" style={{ color: primaryColor }} />
                                                    <span>{horario}{isCurrentlyOpen ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Abierto ahora</span> : null}</span>
                                                </p>
                                            )}
                                            {sede.telefono && (
                                                <p className="flex gap-3 text-[15px] text-slate-700"><Phone size={19} className="mt-0.5 shrink-0" style={{ color: primaryColor }} /><a href={`tel:${sede.telefono}`} className="hover:underline">{sede.telefono}</a></p>
                                            )}
                                            {extras.length > 0 && (
                                                <ul className="flex flex-wrap gap-2">
                                                    {extras.map((x) => <li key={x.label} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-100"><x.icon size={13} /> {x.label}</li>)}
                                                </ul>
                                            )}
                                            <div className="mt-auto flex flex-wrap gap-2 pt-1">
                                                {sede.navUrl && (
                                                    <a href={sede.navUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold no-underline transition hover:brightness-110" style={{ backgroundColor: primaryColor, color: primaryInk }}>
                                                        <Compass size={16} /> Cómo llegar
                                                    </a>
                                                )}
                                                {telWa.length >= 11 && (
                                                    <a href={`https://wa.me/${telWa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-800 no-underline transition hover:bg-slate-50">
                                                        <MessageCircle size={16} className="text-emerald-600" /> WhatsApp
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    {/* Modal para ampliar foto de fachada */}
                    <div 
                        id="modal-foto" 
                        className="fixed inset-0 z-[300] bg-black/85 items-center justify-center p-4 animate-in fade-in duration-200"
                        style={{ display: 'none' }}
                    >
                        <button 
                            id="modal-foto-close"
                            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors active:scale-95 border-none outline-none cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        <img 
                            id="modal-foto-img" 
                            src="" 
                            alt="Foto ampliada del local" 
                            className="max-w-full max-h-[85vh] rounded-3xl object-contain shadow-2xl border-[4px] border-white animate-in zoom-in-95 duration-200"
                        />
                    </div>

                    <Script 
                        id="facade-image-modal"
                        strategy="afterInteractive"
                        dangerouslySetInnerHTML={{
                            __html: `
                                (function() {
                                    function setupFacadeModal() {
                                        var images = document.querySelectorAll('.foto-fachada-click');
                                        var modal = document.getElementById('modal-foto');
                                        var modalImg = document.getElementById('modal-foto-img');
                                        
                                        images.forEach(function(img) {
                                            if (img.getAttribute('data-modal-attached')) return;
                                            img.setAttribute('data-modal-attached', 'true');
                                            img.addEventListener('click', function() {
                                                if (modal && modalImg) {
                                                    modalImg.src = img.src;
                                                    modal.style.display = 'flex';
                                                    document.body.style.overflow = 'hidden';
                                                }
                                            });
                                        });
                                        
                                        var closeBtn = document.getElementById('modal-foto-close');
                                        if (closeBtn && modal) {
                                            if (!closeBtn.getAttribute('data-modal-attached')) {
                                                closeBtn.setAttribute('data-modal-attached', 'true');
                                                closeBtn.addEventListener('click', function() {
                                                    modal.style.display = 'none';
                                                    document.body.style.overflow = '';
                                                });
                                            }
                                        }
                                        
                                        if (modal) {
                                            if (!modal.getAttribute('data-modal-attached')) {
                                                modal.setAttribute('data-modal-attached', 'true');
                                                modal.addEventListener('click', function(e) {
                                                    if (e.target === modal) {
                                                        modal.style.display = 'none';
                                                        document.body.style.overflow = '';
                                                    }
                                                });
                                            }
                                        }
                                    }
                                    
                                    if (document.readyState === 'loading') {
                                        document.addEventListener('DOMContentLoaded', setupFacadeModal);
                                    } else {
                                        setupFacadeModal();
                                    }
                                    
                                    // Para soportar transiciones de Next.js PWA
                                    window.addEventListener('popstate', setupFacadeModal);
                                    var observer = new MutationObserver(setupFacadeModal);
                                    observer.observe(document.body, { childList: true, subtree: true });
                                })();
                            `
                        }}
                    />

                    </section>
                )}

                {/* 11. CIERRE */}
                <section className="cx-sec mb-4">
                    <div className="relative overflow-hidden rounded-[32px] px-6 py-12 text-center md:px-12 md:py-16" style={{ backgroundColor: primaryColor, color: primaryInk }}>
                        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10" aria-hidden />
                        <div className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-black/10" aria-hidden />
                        <p className="relative text-sm font-semibold uppercase tracking-[0.18em] opacity-75">{negocio.nombre}</p>
                        <h2 className="relative mx-auto mt-3 max-w-2xl text-3xl font-bold leading-tight md:text-5xl">
                            {isGymModule ? 'Empieza a entrenar esta semana' : 'Tu próxima cita, en un minuto'}
                        </h2>
                        <p className="relative mx-auto mt-3 max-w-md text-[15px] opacity-85">
                            {isGymModule ? 'Elige tu plan y te esperamos.' : 'Elige el servicio, mira los horarios libres y reserva desde tu celular.'}
                        </p>
                        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                            <a href={mainCtaHref} className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold no-underline shadow-sm transition hover:opacity-90" style={{ backgroundColor: primaryInk, color: primaryInk === '#ffffff' ? primaryColor : '#ffffff' }}>
                                <Calendar size={17} /> {mainCtaText}
                            </a>
                            {mainWhatsapp && (
                                <a href={mainWhatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border px-6 py-3.5 text-sm font-bold no-underline transition hover:opacity-80" style={{ borderColor: 'currentColor', color: primaryInk }}>
                                    <MessageCircle size={17} /> WhatsApp
                                </a>
                            )}
                        </div>
                    </div>
                </section>
            </div>

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
                            
                            function setupOpeners() {
                                document.querySelectorAll('[data-open-modal]').forEach(function(btn) {
                                    if (btn.getAttribute('data-listener-attached')) return;
                                    btn.setAttribute('data-listener-attached', 'true');
                                    btn.addEventListener('click', function(e) {
                                        e.preventDefault();
                                        var modal = document.getElementById(btn.getAttribute('data-open-modal'));
                                        if (modal && modal.showModal) modal.showModal();
                                    });
                                });
                            }

                            setupSmoothScroll();
                            setupModals();
                            setupOpeners();
                            
                            var timer = setInterval(function() {
                                setupSmoothScroll();
                                setupModals();
                                setupOpeners();
                            }, 1000);
                            setTimeout(function() { clearInterval(timer); }, 10000);
                        })();
                    `
                }} 
            />

            {/* Dialog de Opiniones - Diseño Premium */}
            <dialog id="modal-opiniones" className="m-auto rounded-3xl p-0 max-w-md w-[92%] backdrop:bg-black/60 backdrop:backdrop-blur-sm border border-slate-100 shadow-2xl outline-none select-none bg-white overflow-hidden">
                <div className="flex flex-col max-h-[88vh] w-full overflow-hidden">
                    {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: primaryColor }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="m9 10 2 2 4-4"/></svg>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-[15px] leading-none">Opiniones de clientes</h4>
                                <p className="text-xs font-medium text-slate-400 mt-0.5">Lo que dicen nuestros clientes sobre nosotros</p>
                            </div>
                        </div>
                        <button id="btn-close-opiniones" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold active:scale-95 transition-transform border-0 cursor-pointer text-sm">×</button>
                    </div>
                </div>

                {/* Score Summary */}
                <div className="mx-5 mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col shrink-0">
                            <span className="text-5xl font-bold leading-none" style={{ color: primaryColor }}>
                                {allReviews.length > 0 ? (allReviews.reduce((acc: number, r: any) => acc + r.stars, 0) / allReviews.length).toFixed(1) : '5.0'}
                            </span>
                            <div className="flex gap-0.5 mt-1.5">
                                {Array.from({ length: 5 }).map((_: any, i: number) => (
                                    <span key={i} className="text-amber-400 text-[14px]">&#9733;</span>
                                ))}
                            </div>
                            <span className="text-xs font-bold text-slate-400 mt-1">
                                Basado en {allReviews.length} {allReviews.length === 1 ? 'opinión' : 'opiniones'}
                            </span>
                        </div>
                        <div className="flex-1 space-y-1">
                            {[5, 4, 3, 2, 1].map((star: number) => {
                                const count = allReviews.filter((r: any) => r.stars === star).length;
                                const pct = allReviews.length > 0 ? (count / allReviews.length) * 100 : (star === 5 ? 100 : 0);
                                return (
                                    <div key={star} className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-500 w-2">{star}</span>
                                        <span className="text-amber-400 text-xs">&#9733;</span>
                                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: primaryColor }} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 w-5 text-right">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Reviews list */}
                <div className="overflow-y-auto flex-1 px-5 pb-5 mt-3 space-y-3">
                    {allReviews.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-slate-400 text-xs font-semibold">Aún no hay opiniones registradas.</p>
                        </div>
                    ) : (
                        allReviews.map((r: any, idx: number) => {
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
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold" style={{ backgroundColor: primaryColor }}>
                                                {inicial}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-slate-900">{nombreCorto}</span>
                                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                                                        Cliente verificado
                                                    </span>
                                                </div>
                                                <div className="flex gap-0.5 mt-0.5">
                                                    {Array.from({ length: 5 }).map((_: any, i: number) => (
                                                        <span key={i} className={`text-xs ${i < r.stars ? 'text-amber-400' : 'text-slate-200'}`}>&#9733;</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-400 shrink-0">{fecha}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                        {r.comment && r.comment.trim() !== '' ? r.comment : 'Calificación de 5 estrellas por excelente servicio en el negocio.'}
                                    </p>
                                    {r.appointment?.servicio && (
                                        <div className="flex items-center gap-1">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
                                            <span className="text-xs font-semibold text-slate-400">{r.appointment.servicio}</span>
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
                    <span className="text-xs font-bold text-slate-400">Opiniones verificadas y reales de nuestros clientes</span>
                </div>
                </div>
            </dialog>

            {/* Dialog de Fidelización */}
            <dialog id="modal-fidelizacion" className="m-auto rounded-3xl p-6 max-w-md w-[90%] backdrop:bg-black/60 backdrop:backdrop-blur-sm border border-slate-100 shadow-2xl outline-none select-none text-slate-800 bg-white">
                <div className="space-y-5">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-slate-900 text-base uppercase tracking-tight flex items-center gap-1.5">
                            👑 Club de Fidelización
                        </h4>
                        <button id="btn-close-fidelizacion" className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 font-bold active:scale-95 transition-transform border-0 cursor-pointer">✕</button>
                    </div>
                    <div className="text-center py-4 px-2 space-y-3">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-xl font-bold" style={{ color: primaryColor, backgroundColor: `color-mix(in srgb, ${primaryColor}, transparent 95%)`, borderColor: `color-mix(in srgb, ${primaryColor}, transparent 90%)`, borderStyle: 'solid', borderWidth: '1px' }}>
                            👑
                        </div>
                        <h5 className="font-bold text-slate-900 uppercase tracking-wide text-xs">¡Acumula puntos y gana!</h5>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            Por cada cita completada con nosotros acumulas puntos automáticamente. Canjea tus puntos acumulados por masajes, tratamientos faciales o servicios gratis.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-2">
                        <button id="btn-close-fidelizacion-footer" className="py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase tracking-wide text-slate-500 active:scale-95 transition-transform border-0 cursor-pointer">
                            Cerrar
                        </button>
                        <a href={`/${slug}/misiones/premios`} className="py-3 rounded-2xl text-xs font-bold uppercase tracking-wide text-white text-center active:scale-95 transition-transform shadow-md no-underline flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                            Premios
                        </a>
                        <a href={`/${slug}/misiones`} className="py-3 rounded-2xl text-xs font-bold uppercase tracking-wide text-white text-center active:scale-95 transition-transform shadow-md no-underline flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
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

/** Encabezado de sección común de la landing clásica: antetítulo, título y una acción opcional. */
function SectionHead({ eyebrow, title, color, action, aside }: { eyebrow: string; title: string; color: string; action?: { href: string; label: string }; aside?: ReactNode }) {
    return (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-7">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color }}>{eyebrow}</p>
                <h2 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight text-slate-900 md:text-[2rem]">{title}</h2>
            </div>
            {aside}
            {action && (
                <Link href={action.href} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color }}>
                    {action.label} <ChevronRight size={16} />
                </Link>
            )}
        </div>
    );
}
