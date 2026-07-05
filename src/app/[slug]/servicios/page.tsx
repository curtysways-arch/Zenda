import { getNegocioBySlug } from '@/lib/services';
import { cn } from '@/lib/utils';
import { getServicePrimaryImage } from '@/lib/serviceImageHelper';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { Search, Star, Clock, ChevronRight, ChevronLeft, Heart, SlidersHorizontal, Droplet, Sparkles } from 'lucide-react';
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
    const selectedCategory = typeof resolvedSearchParams?.category === 'string' ? resolvedSearchParams.category : 'Todos';
    const negocio = await getNegocioBySlug(slug);

    if (!negocio) {
        notFound();
    }

    const services = negocio.services || [];

    let nextAppointment: any = null;

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

    // Helper para categorizar servicios según su nombre
    const getServiceCategory = (nombre: string) => {
        const lower = nombre.toLowerCase();
        if (lower.includes('facial') || lower.includes('limpieza') || lower.includes('cutis') || lower.includes('exfoliación facial')) {
            return 'Faciales';
        }
        if (lower.includes('masaje') || lower.includes('relax') || lower.includes('piedras') || lower.includes('descontracturante')) {
            return 'Masajes';
        }
        if (lower.includes('corporal') || lower.includes('exfoliación corporal') || lower.includes('reductor') || lower.includes('manicura') || lower.includes('gel') || lower.includes('pedicura') || lower.includes('barba')) {
            return 'Corporales';
        }
        if (lower.includes('paquete') || lower.includes('combo') || lower.includes('pack') || lower.includes('duo') || lower.includes('promoción')) {
            return 'Paquetes';
        }
        return 'Corporales'; // fallback
    };

    // Helper para obtener beneficio según el nombre del servicio
    const getServiceBenefit = (nombre: string) => {
        const lower = nombre.toLowerCase();
        if (lower.includes('hidratación') || lower.includes('gel')) {
            return 'Ideal para piel seca y deshidratada';
        }
        if (lower.includes('facial') || lower.includes('limpieza') || lower.includes('cutis')) {
            return 'Piel más limpia, fresca y luminosa';
        }
        if (lower.includes('masaje') || lower.includes('relax') || lower.includes('piedras')) {
            return 'Reduce el estrés y mejora la circulación';
        }
        if (lower.includes('exfoliación') || lower.includes('corporal')) {
            return 'Estimula la renovación celular de la piel';
        }
        if (lower.includes('barba') || lower.includes('corte')) {
            return 'Corte y perfilado con acabado premium';
        }
        if (lower.includes('manicura') || lower.includes('uñas') || lower.includes('pedicura')) {
            return 'Cuidado e hidratación profunda para tus manos';
        }
        return 'Tratamiento diseñado para tu bienestar integral';
    };

    const getCategoryIcon = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('facial')) return '💆‍♀️';
        if (lower.includes('masaje')) return '💆‍♂️';
        if (lower.includes('corporal')) return '✨';
        if (lower.includes('paquete')) return '🎁';
        return '🌸';
    };

    // Filtrar por término de búsqueda (q)
    let filteredServices = query 
        ? services.filter((s: any) => s.nombre.toLowerCase().includes(query) || (s.descripcion && s.descripcion.toLowerCase().includes(query)))
        : services;

    // Filtrar por categoría seleccionada
    if (selectedCategory !== 'Todos') {
        filteredServices = filteredServices.filter((s: any) => getServiceCategory(s.nombre) === selectedCategory);
    }

    const primaryColor = (negocio as any).colorPrimario || '#e21d6e';
    const secondaryColor = (negocio as any).colorSecundario || '#0f172a';
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

    const uniqueCategories = ['Todos', 'Faciales', 'Masajes', 'Corporales', 'Paquetes'];

    return (
        <main className="min-h-screen font-sans pb-32 md:pb-12 relative overflow-x-hidden" style={{ backgroundColor: neutralColor }}>
            
            {/* Cabecera de Navegación (Mockup de servicios con back y favorites redondo) */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100/80">
                <Link href={`/${slug}`} className="flex items-center justify-center size-9 rounded-full bg-white border border-slate-100 shadow-sm text-slate-600 hover:text-slate-900 transition-all active:scale-90" style={{ color: primaryColor }}>
                    <ChevronLeft size={18} strokeWidth={3} />
                </Link>
                <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">
                    Servicios
                </h1>
                <button className="flex items-center justify-center size-9 rounded-full bg-white border border-slate-100 shadow-sm transition-all active:scale-90" style={{ color: primaryColor }}>
                    <Heart size={16} fill="none" strokeWidth={2.5} />
                </button>
            </header>

            {/* Espaciador Superior */}
            <div className="pt-20"></div>

            {/* PRÓXIMA CITA ALERT BANNER */}
            {nextAppointment && (
                <div className="px-6 mb-5">
                    <NextAppointmentBanner 
                        appointment={nextAppointment}
                        slug={slug}
                        primaryColor={primaryColor}
                    />
                </div>
            )}

            {/* BARRA DE BÚSQUEDA Y FILTRO */}
            <section className="px-6 mb-5 flex items-center gap-3">
                <form method="GET" action={`/${slug}/servicios`} className="relative flex-1">
                    <input 
                        type="text"
                        name="q"
                        defaultValue={query}
                        placeholder="Buscar servicios..."
                        className="w-full pl-11 pr-5 py-3 rounded-[1.8rem] border border-slate-150 focus:border-slate-200 outline-none font-semibold text-xs shadow-sm bg-white"
                    />
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </form>
                
                {/* Botón de Filtro */}
                <button className="flex items-center justify-center size-9 rounded-full bg-white border border-slate-100 shadow-sm transition-all active:scale-90 shrink-0" style={{ color: primaryColor }}>
                    <SlidersHorizontal size={14} strokeWidth={2.5} />
                </button>
            </section>

            {/* CATEGORÍAS EN HORIZONTAL SCROLL PILLS */}
            <section className="px-6 mb-5 flex gap-2.5 overflow-x-auto scrollbar-none select-none">
                {uniqueCategories.map((cat: string) => {
                    const isActive = selectedCategory === cat;
                    const icon = getCategoryIcon(cat);
                    
                    const queryParams = new URLSearchParams();
                    if (query) queryParams.set('q', query);
                    if (cat !== 'Todos') queryParams.set('category', cat);
                    const href = `/${slug}/servicios?${queryParams.toString()}`;
                    
                    return (
                        <Link 
                            key={cat}
                            href={href}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2 rounded-full font-black text-[9px] uppercase tracking-widest border transition-all shrink-0 active:scale-95",
                                isActive 
                                    ? "text-white border-transparent" 
                                    : "bg-white border-slate-100 text-slate-400 hover:text-slate-600"
                            )}
                            style={isActive ? { backgroundColor: primaryColor } : {}}
                        >
                            <span className="text-[11px] leading-none">{icon}</span>
                            {cat}
                        </Link>
                    );
                })}
            </section>

            {/* LISTA DE SERVICIOS */}
            <section className="px-6 pb-12">
                <div className="flex flex-col gap-4">
                    {filteredServices.length === 0 ? (
                        <div className="text-center py-16 space-y-4">
                            <p className="text-slate-400 font-semibold text-sm">No se encontraron servicios.</p>
                            <Link href={`/${slug}/servicios`} className="inline-block text-xs font-black uppercase tracking-widest" style={{ color: primaryColor }}>
                                Ver todos los servicios
                            </Link>
                        </div>
                    ) : (
                        filteredServices.map((service: any, index: number) => {
                            const mockRating = (4.7 + (index * 0.1) % 0.3).toFixed(1);
                            const mockReviews = 180 + (index * 35);
                            const tagLabel = index === 0 ? "MÁS RESERVADO" : (index === 1 ? "POPULAR" : (index === 2 ? "NUEVO" : ""));
                            const benefitText = getServiceBenefit(service.nombre);
                            
                            return (
                                <div 
                                    key={service.id} 
                                    className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] p-3 flex gap-3 h-[165px] transition-all hover:scale-[1.01] active:scale-[0.99] duration-300"
                                >
                                    {/* Lado Izquierdo: Imagen del servicio (38%) */}
                                    <div className="relative w-[38%] h-full rounded-[20px] overflow-hidden bg-slate-50 shrink-0 select-none">
                                        <img 
                                            src={getServicePrimaryImage(service, 'medium')} 
                                            className="w-full h-full object-cover" 
                                            alt={service.nombre} 
                                        />
                                        
                                        {/* Tag de popularidad/novedad */}
                                        {tagLabel && (
                                            <div className="absolute top-2 left-2 bg-pink-500 text-white text-[6px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-md select-none" style={{ backgroundColor: primaryColor }}>
                                                {tagLabel}
                                            </div>
                                        )}
                                        
                                        {/* Corazón favoritos sobre la imagen */}
                                        <button className="absolute top-2 right-2 size-6 rounded-full bg-white/95 border border-slate-100/50 flex items-center justify-center text-slate-400 hover:text-pink-500 active:scale-90 transition-all shadow-sm">
                                            <Heart size={10} fill="none" strokeWidth={2.5} />
                                        </button>
                                        
                                        {/* Duración abajo */}
                                        <div className="absolute bottom-2 left-2 bg-black/45 backdrop-blur-[1px] text-white px-2 py-0.5 rounded-md text-[7.5px] font-black uppercase tracking-wider flex items-center gap-1 select-none">
                                            <Clock size={8} />
                                            {service.duracion || 60} min
                                        </div>
                                    </div>

                                    {/* Lado Derecho: Textos, Beneficios, Precio y Botón */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 pr-1">
                                        <div className="space-y-0.5">
                                            <h2 className="font-black text-[13px] uppercase text-slate-850 tracking-tight leading-snug truncate">
                                                {service.nombre}
                                            </h2>
                                            <p className="text-[10px] text-slate-400 font-semibold line-clamp-1 leading-normal">
                                                {service.extraInfo?.descripcion || service.descripcion || 'Tratamiento diseñado exclusivamente para tu bienestar.'}
                                            </p>
                                            
                                            {/* Calificación y opiniones */}
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 leading-none pt-0.5">
                                                <Star size={10} className="text-pink-500" fill="currentColor" style={{ color: primaryColor }} />
                                                <span className="text-slate-700">{mockRating}</span>
                                                <span className="text-slate-200">|</span>
                                                <span>({mockReviews} opiniones)</span>
                                            </div>
                                        </div>

                                        {/* Caja de Beneficio Destacado */}
                                        <div className="rounded-xl p-2 flex items-center gap-1.5 select-none" style={{ backgroundColor: `${primaryColor}0a` }}>
                                            <Droplet size={11} className="text-pink-500 shrink-0" style={{ color: primaryColor }} />
                                            <span className="text-[8.5px] text-slate-600 font-semibold truncate leading-none">
                                                {benefitText}
                                            </span>
                                        </div>

                                        {/* Precio y Botón Reservar */}
                                        <div className="flex items-center justify-between gap-2 pt-0.5">
                                            <div className="text-sm font-black" style={{ color: primaryColor }}>
                                                ${service.precio || 30}
                                            </div>

                                            <Link 
                                                href={`/${slug}/servicio/${service.id}`}
                                                className="px-4 py-2 rounded-[14px] font-black text-[9px] uppercase tracking-widest text-white shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-0.5"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                Reservar
                                                <ChevronRight size={9} strokeWidth={3} />
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
