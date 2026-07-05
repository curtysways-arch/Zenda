import { getNegocioBySlug } from '@/lib/services';
import { cn } from '@/lib/utils';
import { getServicePrimaryImage } from '@/lib/serviceImageHelper';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { MapPin, Search, Star, Clock, ChevronRight, ArrowLeft, Sparkles, ChevronLeft } from 'lucide-react';
import NextAppointmentBanner from '@/components/public/NextAppointmentBanner';

export const dynamic = 'force-dynamic';

export default async function PublicServicesPage({
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

    const services = negocio.services || [];

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
                    take: 1,
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
                        return endTime.getTime() > nowTime.getTime() - (30 * 60 * 1000);
                    });

                    if (validUpcoming.length > 0) {
                        nextAppointment = validUpcoming[0];
                    }
                }
            }
        }
    } catch (e) {}

    const filteredServices = query 
        ? services.filter((s: any) => s.nombre.toLowerCase().includes(query) || (s.descripcion && s.descripcion.toLowerCase().includes(query)))
        : services;

    const primaryColor = (negocio as any).colorPrimario || 'var(--primary)';
    const secondaryColor = (negocio as any).colorSecundario || '#0f172a';
    const tertiaryColor = (negocio as any).colorTerciario || '#7B68EE';
    const neutralColor = (negocio as any).colorNeutral || '#fff8f6';

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

    return (
        <main className="min-h-screen font-sans pb-32 md:pb-12 relative overflow-x-hidden" style={{ backgroundColor: neutralColor }}>
            {/* Cabecera de Navegación */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-100">
                <Link href={`/${slug}`} className="w-12 h-12 rounded-full border border-slate-100 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-colors bg-white shadow-sm">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-lg font-black uppercase tracking-widest text-slate-800">
                    Servicios
                </h1>
                <div className="w-12 h-12"></div> {/* Espaciador */}
            </header>

            {/* Espaciador Superior */}
            <div className="pt-28"></div>

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

            {/* BARRA DE BÚSQUEDA */}
            <section className="px-6 mb-8">
                <form method="GET" action={`/${slug}/servicios`} className="relative w-full">
                    <input 
                        type="text"
                        name="q"
                        defaultValue={query}
                        placeholder="Buscar servicios..."
                        className="w-full pl-12 pr-6 py-4 rounded-[1.8rem] border border-slate-100 focus:border-slate-200 outline-none font-semibold text-sm shadow-sm bg-white"
                    />
                    <Search size={18} className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </form>
            </section>

            {/* LISTA DE SERVICIOS */}
            <section className="px-6">
                <div className="flex flex-col gap-6">
                    {filteredServices.length === 0 ? (
                        <div className="text-center py-16 space-y-4">
                            <p className="text-slate-400 font-semibold text-sm">No se encontraron servicios que coincidan con tu búsqueda.</p>
                            <Link href={`/${slug}/servicios`} className="inline-block text-xs font-black uppercase tracking-widest" style={{ color: primaryColor }}>
                                Ver todos los servicios
                            </Link>
                        </div>
                    ) : (
                        filteredServices.map((service: any, index: number) => {
                            const mockRating = (4.7 + (index * 0.1) % 0.3).toFixed(1);
                            const mockReviews = 180 + (index * 35);
                            
                            return (
                                <div 
                                    key={service.id} 
                                    className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-5"
                                >
                                    {/* Imagen del servicio */}
                                    <div className="relative w-full sm:w-2/5 aspect-[4/3] rounded-[2rem] overflow-hidden bg-slate-50 shrink-0">
                                        <img 
                                            src={getServicePrimaryImage(service, 'medium')} 
                                            className="w-full h-full object-cover" 
                                            alt={service.nombre} 
                                        />
                                        {index === 0 && (
                                            <div className="absolute top-3 left-3 bg-pink-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                                                MÁS RESERVADO
                                            </div>
                                        )}
                                        {/* Icono Corazón (Favoritos) */}
                                        <button className="absolute top-3 right-3 size-8 rounded-full bg-white/90 backdrop-blur-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-pink-500 active:scale-95 transition-all">
                                            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Contenido */}
                                    <div className="flex-1 flex flex-col justify-between py-2">
                                        <div>
                                            <h2 className="font-black text-xl leading-snug" style={{ color: textColor }}>
                                                {service.nombre}
                                            </h2>
                                            <p className="text-xs font-semibold text-slate-400 mt-2 line-clamp-3">
                                                {service.extraInfo?.descripcion || service.descripcion || 'Libera tensión y recupera tu energía vital en una sesión diseñada exclusivamente para tu bienestar.'}
                                            </p>
                                            
                                            {/* Info line */}
                                            <div className="flex items-center gap-4 mt-4 text-slate-400 text-xs font-bold">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} className="text-slate-400" />
                                                    {service.duracionMinutos || 60} min
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Star size={14} className="text-amber-400" fill="currentColor" />
                                                    {mockRating} ({mockReviews} opiniones)
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 mt-6">
                                            <div className="text-3xl font-black" style={{ color: primaryColor }}>
                                                ${service.precio}
                                            </div>

                                            <Link 
                                                href={`/${slug}/servicio/${service.id}`}
                                                className="px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-md active:scale-95 transition-all"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                Reservar
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>
        </main>
    );
}
