import { getNegocioBySlug } from '@/lib/services';
import BookingClient from '../../BookingClient';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import {
    Clock,
    ChevronLeft,
    Users,
    Zap,
    Trophy,
    MapPin
} from 'lucide-react';
import Link from 'next/link';
import HeroCarousel from '@/components/HeroCarousel';
import CanchaInteractionButtons from '@/components/public/CanchaInteractionButtons';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import PendingReservationBanner from '@/components/public/PendingReservationBanner';

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

    let userReservasActivas = 0;
    let pendingReservation: any = null;
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

                const localTelefono = telefono.replace(/^\+(\d{1,4})/, ''); 
                const digitsOnly = telefono.replace(/\D/g, ''); 
                const localNoZero = localTelefono.replace(/^0+/, '');

                const results = await prisma.appointment.findMany({
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
                        estado: 'pending',
                        expiresAt: { gt: new Date() }
                    },
                    orderBy: { expiresAt: 'asc' },
                    take: 1,
                    include: { service: { select: { nombre: true } } }
                });
                if (results.length > 0) {
                    pendingReservation = {
                        id: results[0].id,
                        expiresAt: results[0].expiresAt,
                        cancha: { nombre: results[0].service?.nombre || 'Cancha' }
                    };
                }

                userReservasActivas = await prisma.appointment.count({
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
                    }
                });
            }
        }
    } catch (e) {
        // Ignorar
    }

    const canchasList = negocio.canchas || (negocio as any).Service || [];
    const cancha = canchasList.find((c: any) => c.id === id);
    if (!cancha) {
        notFound();
    }

    // Adaptar campos de Cancha en Spa
    cancha.nombre = cancha.nombre || cancha.name || 'Cancha';
    cancha.precioHora = cancha.precio || cancha.precioHora || negocio.precioHora || 0;
    cancha.capacidad = (cancha.extraInfo as any)?.capacidad || cancha.capacidad || 10;
    cancha.tipo = (cancha.extraInfo as any)?.tipo || cancha.tipo || 'FÚTBOL 7';

    // Buscar si la cancha tiene una promoción activa válida
    const promo = await prisma.promotion.findFirst({
        where: {
            businessId: negocio.id,
            estado: 'activa',
            fechaInicio: { lte: new Date() },
            fechaFin: { gte: new Date() },
            PromotionToService: { some: { B: cancha.id } }
        },
        orderBy: { createdAt: 'desc' }
    });

    if (promo) {
        cancha.promocion = promo;
        cancha.precioBase = cancha.precioHora;
        cancha.precioHora = promo.precioPromo;
    }

    const canchaImages = (cancha as any).imagenes?.map((img: any) => img.url) || [];
    const negocioImages = negocio.imagenes?.map((img: any) => img.url) || [];
    const imagesToUse = canchaImages.length > 0 ? canchaImages : negocioImages.length > 0 ? negocioImages : ['https://images.unsplash.com/photo-1556121126-199736495b0c?auto=format&fit=crop&q=80&w=1200'];

    const ubicacion = (cancha as any).ubicacion;

    const getGoogleMapsUrls = (sede: any, negocio: any) => {
        let rawUrl = (sede.mapUrl || '').trim();
        let embedSrc = '';
        let navUrl = '';

        const makeNav = (dest: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;

        if (rawUrl.includes('<iframe')) {
            const match = rawUrl.match(/src=["']([^"']+)["']/);
            if (match && match[1]) {
                rawUrl = match[1];
            }
        }

        if (rawUrl) {
            const coordMatch = rawUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || rawUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (coordMatch) {
                embedSrc = `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&t=&z=16&ie=UTF8&iwloc=addr&output=embed`;
                navUrl = makeNav(`${coordMatch[1]},${coordMatch[2]}`);
                return { embedSrc, navUrl };
            }

            const latMatch = rawUrl.match(/!3d(-?\d+\.\d+)/);
            const lngMatch = rawUrl.match(/!2d(-?\d+\.\d+)/);
            if (latMatch && lngMatch) {
                const lat = latMatch[1];
                const lng = lngMatch[1];
                embedSrc = rawUrl.includes('/maps/embed') ? rawUrl : `https://maps.google.com/maps?q=${lat},${lng}&t=&z=16&ie=UTF8&iwloc=addr&output=embed`;
                navUrl = makeNav(`${lat},${lng}`);
                return { embedSrc, navUrl };
            }

            if (rawUrl.includes('/maps/embed') || rawUrl.includes('output=embed')) {
                embedSrc = rawUrl;
                navUrl = makeNav(`${sede.nombre}, ${negocio.nombre}${negocio.ciudad ? `, ${negocio.ciudad}` : ''}`);
                return { embedSrc, navUrl };
            }
        }

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
        <div className="min-h-screen text-white font-sans selection:bg-emerald-500/30" style={{ backgroundColor: '#07090f' }}>
            
            {/* Banner de reservas activas */}
            {pendingReservation ? (
                <PendingReservationBanner 
                    reserva={pendingReservation} 
                    slug={slug}
                    whatsapp={negocio.whatsapp || undefined}
                />
            ) : userReservasActivas > 0 && (
                <div className="bg-emerald-600/95 backdrop-blur-md text-white px-6 py-4 flex flex-wrap items-center justify-center gap-4 w-full shadow-2xl z-[120] relative border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/20 text-xs font-black animate-pulse-subtle">
                            {userReservasActivas}
                        </div>
                        <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-50 text-center">
                            {userReservasActivas === 1 ? 'Tienes 1 reserva próxima' : `Tienes ${userReservasActivas} reservas próximas`}
                        </p>
                    </div>
                    <Link
                        href={`/${slug}/mis-reservas`}
                        className="rounded-xl bg-white px-5 py-2 text-xs font-black uppercase tracking-[0.1em] text-emerald-700 hover:bg-emerald-50 transition-all hover:scale-105 active:scale-95 shadow-xl"
                    >
                        Gestionar ahora
                    </Link>
                </div>
            )}

            {/* STICKY TOP HEADER - NATIVE STYLE */}
            <header className="sticky top-0 z-[100] h-14 flex items-center bg-[#07090f]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-xl mx-auto w-full px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/${slug}`}
                            className="size-9 rounded-full bg-white/5 active:bg-white/10 flex items-center justify-center transition-all border border-white/10"
                        >
                            <ChevronLeft size={20} strokeWidth={2.5} />
                        </Link>
                        <div className="flex flex-col text-left">
                            <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest italic leading-none mb-0.5">{negocio.nombre}</span>
                            <h1 className="font-black text-[13px] uppercase italic tracking-tighter leading-none">{cancha.nombre}</h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                         <CanchaInteractionButtons
                            canchaId={cancha.id}
                            canchaNombre={cancha.nombre}
                            negocioNombre={negocio.nombre}
                        />
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto pb-10 overflow-x-hidden">
                
                {/* HERO CAROUSEL - COMPACT & PREMIUM */}
                <div className="px-4 pt-4">
                    <div className="relative aspect-[16/10] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl">
                        <HeroCarousel images={imagesToUse} opacityActive="opacity-100" />
                        
                        {/* Status Label Overlay */}
                        <div className="absolute top-4 left-4 z-20">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                                <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-black text-white italic uppercase tracking-widest">DISPONIBLE</span>
                            </div>
                        </div>

                        {/* Type Label Overlay */}
                        <div className="absolute bottom-4 left-4 z-20">
                             <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
                                <span className="text-[9px] font-black text-white italic uppercase tracking-widest">{cancha.tipo}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-8 text-left">
                    {/* STATS STRIP - NATIVE GRID */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Price Píldora */}
                        <div className="col-span-1 bg-[#11141d] border border-white/5 rounded-3xl p-5 flex flex-col gap-1 relative overflow-hidden group">
                            <div className="absolute -top-4 -right-4 size-16 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">PRECIO HORA</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-black text-white italic tracking-tighter">${Number(cancha.precioHora)}</span>
                                {cancha.promocion && <span className="text-sm font-black line-through text-slate-600 italic">${Number(cancha.precioBase)}</span>}
                            </div>
                        </div>

                        {/* Capacity Píldora */}
                        <div className="col-span-1 bg-[#11141d] border border-white/5 rounded-3xl p-5 flex flex-col gap-1 relative overflow-hidden group">
                           <div className="absolute -top-4 -right-4 size-16 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">CAPACIDAD</span>
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-blue-500" />
                                <span className="text-2xl font-black text-white italic tracking-tighter uppercase">{cancha.capacidad} JUG.</span>
                            </div>
                        </div>

                        {/* Schedule Píldora - Full Width */}
                        <div className="col-span-2 bg-[#11141d] border border-white/5 rounded-[1.8rem] p-4 flex items-center justify-between px-6">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-500">
                                    <Clock size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-slate-500 uppercase italic tracking-widest">HORARIO DE ATENCIÓN</span>
                                    <span className="text-[11px] font-black text-white italic uppercase">{negocio.horarioApertura} - {negocio.horarioCierre}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 rounded-lg text-emerald-400 text-[8px] font-black uppercase italic tracking-tighter">
                                ABIERTO AHORA
                            </div>
                        </div>
                    </div>

                    {/* KEY FEATURES - CLEAN LIST */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">ESPECIFICACIONES</h3>
                            <Zap size={14} className="text-emerald-500" />
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                            <div className="flex items-center gap-4 bg-[#11141d]/50 border border-white/5 p-4 rounded-2xl">
                                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                                    <Trophy size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-white uppercase italic">Sintético Premium Pro</span>
                                    <span className="text-[9px] font-bold text-slate-500">Certificado FIFA Quality</span>
                                </div>
                            </div>
                             <div className="flex items-center gap-4 bg-[#11141d]/50 border border-white/5 p-4 rounded-2xl">
                                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                                    <Zap size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-white uppercase italic">Iluminación LED 4K</span>
                                    <span className="text-[9px] font-bold text-slate-500">Cero sombras en juego nocturno</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOOKING SECTION - THE HEART */}
                    <section id="reservar" className="space-y-6 pt-2">
                        <BookingClient
                            negocio={{ ...negocio, canchas: [cancha] }}
                            slug={slug}
                        />
                    </section>
                    
                    {/* UBICACION - NATIVE MAP PREVIEW */}
                    {displayUbicacion && (
                        <section className="space-y-4 pt-4">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic px-1">CÓMO LLEGAR</h3>
                            <div className="bg-[#11141d] border border-white/5 rounded-[2rem] overflow-hidden group">
                                <div className="h-40 relative">
                                    <iframe
                                        src={embedSrc || ''}
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        className="grayscale invert opacity-30 contrast-125"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#11141d] to-transparent" />
                                    <div className="absolute bottom-5 left-6">
                                        <h4 className="text-sm font-black text-white italic uppercase tracking-tighter">{displayUbicacion.nombre}</h4>
                                        <p className="text-[10px] font-bold text-slate-500 italic uppercase">{displayUbicacion.direccion || 'Quito, Ecuador'}</p>
                                    </div>
                                </div>
                                <div className="px-6 pb-6 pt-2">
                                    {navUrl && (
                                        <a 
                                            href={navUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="w-full h-14 bg-white/5 active:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black text-white italic uppercase tracking-widest transition-all"
                                        >
                                            <MapPin size={16} className="text-emerald-500" /> GOOGLE MAPS
                                        </a>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                </div>
            </main>
        </div>
    );
}
