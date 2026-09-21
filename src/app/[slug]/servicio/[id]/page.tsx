import { getNegocioBySlug } from '@/lib/services';
import { getServiceGalleryImages } from '@/lib/serviceImageHelper';
import BookingClient from '../../BookingClient';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import {
    MapPin,
    Star,
    Zap,
    Clock,
    ChevronLeft,
    Share2,
    Heart,
    Timer,
    ExternalLink,
    Trophy,
    Calendar,
    ArrowRight,
    Search,
    Sparkles
} from 'lucide-react';
import Link from 'next/link';
import HeroCarousel from '@/components/HeroCarousel';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export default async function CanchaDetailPage({
    params,
}: {
    params: Promise<{ slug: string; id: string }>;
}) {
    const { slug, id } = await params;
    const negocio = await getNegocioBySlug(slug);

    if (!negocio) {
        notFound();
    }

    const isSportsOrCancha = 
        negocio.tipoNegocio === 'SPORTS_COURTS' || 
        negocio.tipoNegocio === 'CANCHAS' ||
        negocio.tipoNegocio === 'SPORTS' ||
        (negocio.configuracion as any)?.tipoNegocio === 'SPORTS_COURTS' ||
        (negocio.configuracion as any)?.tipoNegocio === 'CANCHAS' ||
        slug.includes('cancha') ||
        Boolean(negocio.precioHora && negocio.precioHora > 0);

    if (isSportsOrCancha) {
        const cancha = (negocio.services || []).find((c: any) => c.id === id) || (negocio.canchas || []).find((c: any) => c.id === id) || {
            id,
            nombre: 'Cancha 1',
            tipo: 'FÚTBOL 7',
            precio: negocio.precioHora || 25,
        };
        const { default: CanchaDetailView } = await import('@/modules/sports-courts/components/CanchaDetailView');
        return <CanchaDetailView negocio={negocio} cancha={cancha} />;
    }
    
    // Mapeo retro-compatible
    negocio.canchas = negocio.services || [];

    let userReservasActivas = 0;
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

                // Lógica de Matching de Teléfono Flexible
                const localTelefono = telefono.replace(/^\+(\d{1,4})/, ''); 
                const digitsOnly = telefono.replace(/\D/g, ''); 
                const localNoZero = localTelefono.replace(/^0+/, '');

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
    } catch (e) {
        // Ignorar
    }

    const cancha = negocio.services?.find((c: any) => c.id === id);
    if (!cancha) {
        notFound();
    }

    // Buscar si la cancha (servicio) tiene una promoción activa HOY para efectos visuales iniciales
    // Buscar la promoción base de hoy (preferir la que NO tiene restricciones de horario)
    const promoHoy = cancha.promociones?.find((p: any) => {
        const now = new Date();
        const isTimeLimited = (p.horaInicioValida && p.horaInicioValida.trim() !== '') || (p.horaFinValida && p.horaFinValida.trim() !== '');
        return p.estado === 'activa' && new Date(p.fechaInicio) <= now && new Date(p.fechaFin) >= now && !isTimeLimited;
    }) || cancha.promociones?.find((p: any) => {
        const now = new Date();
        return p.estado === 'activa' && new Date(p.fechaInicio) <= now && new Date(p.fechaFin) >= now;
    });

    if (promoHoy) {
        cancha.promocion = promoHoy;
        cancha.precioBase = promoHoy.precioAnterior || cancha.precio || negocio.precioHora;
        // NO sobreescribimos cancha.precioHora aquí para que BookingClient pueda calcularlo dinámicamente
    }

    const staffHabilitado = await prisma.staff.findMany({
        where: {
            businessId: negocio.id,
            active: true,
            Service: {
                some: { id: id }
            }
        },
        select: {
            id: true,
            name: true,
            role: true,
            avatar: true
        }
    });

    const primaryColor = (negocio as any).colorPrimario || '#1dc95c';
    const secondaryColor = (negocio as any).colorSecundario || '#07090f';
    const tertiaryColor = (negocio as any).colorTerciario || primaryColor;

    const canchaImages = getServiceGalleryImages(cancha, 'medium');
    const negocioImages = negocio.imagenes?.map((img: any) => img.url) || [];
    const imagesToUse = canchaImages.length > 0 ? canchaImages : negocioImages.length > 0 ? negocioImages : ['https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=600'];

    const ubicacion = (cancha as any).ubicacion;

    const getGoogleMapsUrls = (sede: any, negocio: any) => {
        let rawUrl = (sede.mapUrl || '').trim();
        let embedSrc = '';
        let navUrl = '';

        const makeNav = (dest: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;

        // 1. Si es un iframe directamente
        if (rawUrl.includes('<iframe')) {
            const match = rawUrl.match(/src=["']([^"']+)["']/);
            if (match && match[1]) {
                const src = match[1];
                rawUrl = src;
            }
        }

        // 2. Extraer Coordenadas o Lugar específico de la URL
        if (rawUrl) {
            // Caso A: Coordenadas @lat,lng o q=lat,lng
            const coordMatch = rawUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || rawUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (coordMatch) {
                embedSrc = `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&t=&z=16&ie=UTF8&iwloc=addr&output=embed`;
                navUrl = makeNav(`${coordMatch[1]},${coordMatch[2]}`);
                return { embedSrc, navUrl };
            }

            // Caso B: Coordenadas en parámetro pb (Google iFrames)
            const latMatch = rawUrl.match(/!3d(-?\d+\.\d+)/);
            const lngMatch = rawUrl.match(/!2d(-?\d+\.\d+)/);
            if (latMatch && lngMatch) {
                const lat = latMatch[1];
                const lng = lngMatch[1];
                embedSrc = rawUrl.includes('/maps/embed') ? rawUrl : `https://maps.google.com/maps?q=${lat},${lng}&t=&z=16&ie=UTF8&iwloc=addr&output=embed`;
                navUrl = makeNav(`${lat},${lng}`);
                return { embedSrc, navUrl };
            }

            // Caso C: Si ya es un embed directo
            if (rawUrl.includes('/maps/embed') || rawUrl.includes('output=embed')) {
                embedSrc = rawUrl;
                navUrl = makeNav(`${sede.nombre}, ${negocio.nombre}${negocio.ciudad ? `, ${negocio.ciudad}` : ''}`);
                return { embedSrc, navUrl };
            }
        }

        // 3. Fallback: Búsqueda ultra-precisa
        const queryParts = [negocio.nombre];
        if (sede.nombre && sede.nombre !== negocio.nombre) queryParts.push(sede.nombre);
        if (sede.direccion) queryParts.push(sede.direccion);
        else if (negocio.direccion) queryParts.push(negocio.direccion);
        if (negocio.ciudad) queryParts.push(negocio.ciudad);

        const queryText = queryParts.join(', ').replace(/, ,/g, ',').trim();
        embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(queryText)}&t=&z=16&ie=UTF8&iwloc=addr&output=embed`;
        navUrl = makeNav(queryText);

        return { embedSrc, navUrl };
    };

    const negocioUbicaciones: any[] = (negocio as any).ubicaciones || [];
    const displayUbicacion = ubicacion || (negocioUbicaciones.length > 0 ? negocioUbicaciones[0] : null);
    const { embedSrc, navUrl } = displayUbicacion ? getGoogleMapsUrls(displayUbicacion, negocio) : { embedSrc: null, navUrl: null };

    return (
        <div className="min-h-screen font-sans selection:bg-tertiary/30 bg-neutral-custom text-gray-900 transition-colors duration-500">
            
            {/* Banner de citas activas */}
            {userReservasActivas > 0 && (
                <div className="bg-slate-900/95 backdrop-blur-md text-white px-6 py-3.5 flex items-center justify-between gap-4 w-full shadow-lg z-[120] relative border-b border-white/10 max-w-xl mx-auto border-x border-gray-200/10">
                    <div className="flex items-center gap-3">
                        <div 
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white text-xs font-black shadow-md border border-white/20"
                            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${tertiaryColor || primaryColor})` }}
                        >
                            {userReservasActivas}
                        </div>
                        <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100">
                            {userReservasActivas === 1 ? 'Tienes 1 cita próxima' : `Tienes ${userReservasActivas} citas próximas`}
                        </p>
                    </div>
                    <Link
                        href={`/${slug}/mis-reservas`}
                        className="rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.05em] text-slate-900 hover:bg-slate-100 active:scale-95 transition-all shadow-md shrink-0"
                    >
                        Gestionar mis citas
                    </Link>
                </div>
            )}

            {/* HEADER CURVADO CON DEGRADADO DINÁMICO (SEGÚN REFERENCIA) */}
            <header 
                className="relative z-30 pt-6 pb-7 px-5 rounded-b-[2rem] sm:rounded-b-[2.5rem] shadow-lg overflow-hidden text-white"
                style={{ 
                    background: `linear-gradient(135deg, ${primaryColor}, color-mix(in srgb, ${primaryColor} 75%, black 25%))` 
                }}
            >
                {/* Patrón de fondo sutil orgánico */}
                <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 0 C 40 20, 60 40, 100 0 Z" fill="white" />
                        <circle cx="90" cy="20" r="30" fill="white" />
                    </svg>
                </div>

                <div className="max-w-xl mx-auto flex items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3.5 min-w-0">
                        {/* Botón Volver */}
                        <Link
                            href={`/${slug}`}
                            className="size-10 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition-all backdrop-blur-sm text-white shrink-0"
                        >
                            <ChevronLeft size={22} strokeWidth={2.5} />
                        </Link>

                        {/* Logo Circular */}
                        <div className="size-12 sm:size-13 rounded-full bg-white flex items-center justify-center shadow-md shrink-0 p-1">
                            {negocio.logoUrl ? (
                                <img 
                                    src={negocio.logoUrl} 
                                    alt={negocio.nombre} 
                                    className="size-full object-contain rounded-full" 
                                />
                            ) : (
                                <Sparkles size={24} style={{ color: primaryColor }} />
                            )}
                        </div>

                        {/* Nombre del Negocio y Servicio */}
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.22em] text-white/90 leading-tight truncate">
                                {negocio.nombre}
                            </span>
                            <h1 className="text-lg sm:text-xl font-black text-white leading-snug tracking-tight truncate">
                                {cancha.nombre}
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 pt-4 pb-32 space-y-5 overflow-x-hidden">
                {/* CSS Hack para ocultar la barra global en esta página y dar espacio al nuevo botón */}
                <style dangerouslySetInnerHTML={{ __html: `
                    nav.fixed.bottom-0 { display: none !important; }
                ` }} />

                {/* IMAGEN HERO DEL SERVICIO */}
                {imagesToUse.length > 0 && (
                    <div className="relative aspect-[16/9] sm:aspect-[16/8] rounded-3xl overflow-hidden shadow-sm border border-slate-100 bg-slate-100">
                        <HeroCarousel images={imagesToUse} opacityActive="opacity-100" />
                        
                        {/* Overlay Etiquetas */}
                        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
                            {cancha.duracion && (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-black/65 backdrop-blur-md rounded-full border border-white/20 text-white text-[11px] font-bold">
                                    <Timer size={12} className="text-white" />
                                    <span>{cancha.duracion} min</span>
                                </div>
                            )}
                            {cancha.tipo && (
                                <div className="px-3 py-1 bg-black/65 backdrop-blur-md rounded-full border border-white/20 text-white text-[11px] font-bold uppercase tracking-wider">
                                    {cancha.tipo}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* DESCRIPCIÓN DEL SERVICIO */}
                {cancha.descripcion && (
                    <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-4 sm:p-5 space-y-2">
                        <div className="flex items-center gap-2">
                            <div 
                                className="p-1 rounded-md flex items-center justify-center text-white shadow-xs"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Sparkles size={13} />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                Descripción del servicio
                            </h3>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
                            {cancha.descripcion}
                        </p>
                    </div>
                )}

                {/* BOOKING SECTION - COMPONENTE PRINCIPAL CON NUEVO DISEÑO */}
                <section id="reservar" className="space-y-4">
                    <BookingClient
                        negocio={negocio}
                        slug={slug}
                        staff={staffHabilitado}
                        initialServiceId={cancha.id}
                        allServices={negocio.services || []}
                    />
                </section>
            </main>
        </div>
    );
}
