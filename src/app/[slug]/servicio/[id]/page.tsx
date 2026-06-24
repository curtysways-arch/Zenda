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

            {/* STICKY TOP HEADER - NATIVE STYLE */}
            <header className="sticky top-0 z-[100] h-16 flex items-center bg-neutral-custom/80 backdrop-blur-xl border-b border-gray-200">
                <div className="max-w-xl mx-auto w-full px-4 flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/${slug}`}
                            className="size-10 rounded-full bg-white active:bg-gray-100 flex items-center justify-center transition-all border border-gray-200 shadow-sm text-gray-700 hover:text-gray-900 hover:scale-105"
                        >
                            <ChevronLeft size={20} strokeWidth={2.5} />
                        </Link>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest leading-none mb-0.5 text-gray-400">{negocio.nombre}</span>
                            <h1 className="font-black text-[14px] text-gray-900 uppercase tracking-tighter leading-none">{cancha.nombre}</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto pb-10 overflow-x-hidden">
                
                {/* HERO CAROUSEL - COMPACT & PREMIUM */}
                <div className="px-4 pt-4">
                    <div className="relative aspect-[16/10] rounded-3xl overflow-hidden shadow-lg border border-gray-100">
                        <HeroCarousel images={imagesToUse} opacityActive="opacity-100" />
                        
                        {/* Status Label Overlay */}
                        <div className="absolute top-4 left-4 z-20">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full border border-gray-200 shadow-sm">
                                <div className="size-2 rounded-full bg-tertiary animate-pulse" />
                                <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">Disponible</span>
                            </div>
                        </div>

                        {/* Type Label Overlay */}
                        <div className="absolute bottom-4 left-4 z-20">
                             <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10">
                                <span className="text-[9px] font-black text-white italic uppercase tracking-widest">{cancha.tipo}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {/* STATS STRIP - NATIVE GRID */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Price Píldora */}
                        {negocio.mostrarPrecios !== false && (
                            <div className="col-span-1 bg-card-dynamic rounded-3xl p-5 flex flex-col gap-1 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                                <div className="absolute -top-4 -right-4 size-16 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Precio</span>
                                <div className="flex items-baseline gap-1.5 z-10">
                                    <span className="text-4xl font-black tracking-tighter text-header-dynamic">
                                        ${cancha.promocion ? Number(cancha.promocion.precioPromo) : Number(cancha.precio || 0)}
                                    </span>
                                    {cancha.promocion && <span className="text-xl font-black line-through text-gray-400 ml-1">${Number(cancha.precioBase)}</span>}
                                </div>
                                {cancha.promocion && (
                                    (cancha.promocion.diasValidos && cancha.promocion.diasValidos.split(',').length < 7) || 
                                    cancha.promocion.horaInicioValida || 
                                    cancha.promocion.horaFinValida
                                ) && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <div className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                                        <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Horario Especial</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Duración Píldora */}
                        <div className="col-span-1 bg-card-dynamic rounded-3xl p-5 flex flex-col gap-1 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                           <div className="absolute -top-4 -right-4 size-16 bg-purple-50 rounded-full blur-2xl group-hover:bg-purple-100 transition-colors" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Duración</span>
                            <div className="flex items-center gap-2 z-10">
                                <Timer size={18} className="text-purple-500" />
                                <span className="text-2xl font-black uppercase tracking-tighter text-header-dynamic">{cancha.duracion || 60} MIN</span>
                            </div>
                        </div>
                    </div>

                    {/* DESCRIPCIÓN DEL SERVICIO */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <div className="bg-tertiary/10 p-1.5 rounded-lg flex items-center justify-center">
                                <Sparkles size={12} className="text-tertiary" />
                            </div>
                             <h3 className="text-[11px] font-black tracking-widest uppercase italic text-header-dynamic">
                                 Descripción
                             </h3>
                        </div>
                        <div className="bg-card-dynamic shadow-sm p-6 rounded-3xl">
                            <p className="text-sm font-semibold leading-relaxed text-slate-500">
                                {cancha.descripcion || 'Vive una experiencia única de bienestar y cuidado personal con nuestro equipo de expertos.'}
                            </p>
                        </div>
                    </div>

                    {/* BOOKING SECTION - THE HEART */}
                    <section id="reservar" className="space-y-6 pt-2">
                        {/* CSS Hack para ocultar la barra global en esta página y dar espacio al nuevo botón */}
                        <style dangerouslySetInnerHTML={{ __html: `
                            nav.fixed.bottom-0 { display: none !important; }
                        ` }} />
                        
                        <BookingClient
                            negocio={negocio}
                            slug={slug}
                            staff={staffHabilitado}
                            initialServiceId={cancha.id}
                            allServices={negocio.services || []}
                        />
                    </section>
                    


                </div>
            </main>
        </div>
    );
}
