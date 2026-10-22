import Link from 'next/link';
import { Fraunces } from 'next/font/google';
import {
    Star,
    MapPin,
    Clock,
    Phone,
    MessageCircle,
    ArrowRight,
    ArrowUpRight,
    Car,
    Bus,
    ShieldCheck,
    Accessibility,
    Sparkles,
    Eye,
} from 'lucide-react';
import { getServicePrimaryImage } from '@/lib/serviceImageHelper';
import NotificationBell from '@/components/public/NotificationBell';
import NextAppointmentBanner from '@/components/public/NextAppointmentBanner';
import ReferralBanner from '@/components/public/ReferralBanner';
import PromotionsSection from '@/components/public/PromotionsSection';
import PublicProductsBoutiqueSection from '@/components/public/PublicProductsBoutiqueSection';
import PublicCoursesSection from '@/components/public/PublicCoursesSection';
import SpaEsenciaMenu, { EsenciaService } from './SpaEsenciaMenu';

const display = Fraunces({ subsets: ['latin'], variable: '--font-esencia', display: 'swap', axes: ['SOFT', 'opsz'] });

export interface SpaEsenciaProps {
    negocio: any;
    slug: string;
    services: any[];
    heroImages: string[];
    isOpen: boolean;
    promedio: number;
    totalOpiniones: number;
    totalClientes: number;
    reviews: any[];
    resultados: any[];
    ubicaciones: any[];
    promociones: any[];
    productos: any[];
    cursos: any[];
    coursesEnabled: boolean;
    paginas: any[];
    nextAppointment: any;
    initialUnreadCount: number;
    clientName?: string;
    referrerName?: string;
    referralCode?: string;
    initialSelectedProduct?: any;
    previewOf?: string | null;
    primaryColor: string;
    tertiaryColor: string;
    textColor: string;
}

function waLink(raw?: string | null, text?: string) {
    if (!raw) return null;
    let n = String(raw).replace(/\D/g, '');
    if (n.startsWith('0') && n.length === 10) n = `593${n.slice(1)}`;
    if (n.length < 9) return null;
    return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

function firstName(full?: string) {
    if (!full) return 'Cliente';
    const parts = full.trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
}

function SectionTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-end justify-between gap-4 mb-8">
            <div>
                <p className="text-xs tracking-[0.25em] uppercase mb-3" style={{ color: 'var(--es-accent)' }}>{eyebrow}</p>
                <h2 className="es-display text-4xl sm:text-5xl leading-[1.02]" style={{ color: 'var(--es-ink)' }}>{title}</h2>
            </div>
            {action}
        </div>
    );
}

/**
 * Diseño "Esencia" para spas, salones y centros de bienestar.
 * Editorial, sereno y centrado en reservar.
 */
export default function SpaEsenciaLanding(p: SpaEsenciaProps) {
    const { negocio, slug } = p;
    const accent = p.primaryColor?.startsWith('#') ? p.primaryColor : '#9a6b4f';
    const showPrices = negocio.mostrarPrecios !== false;
    const heroImage = p.heroImages[0];
    const sideImage = p.heroImages[1] || p.heroImages[0];
    const whatsapp = waLink(negocio.whatsapp, `Hola ${negocio.nombre}, quisiera reservar una cita.`);
    const titulo = negocio.heroTitulo || negocio.nombre;
    const subtitulo = negocio.heroSubtitulo || negocio.mensajeBienvenida || `Un espacio para cuidarte en ${negocio.ciudad || 'tu ciudad'}. Elige tu servicio y reserva en segundos.`;
    const horario = negocio.horarioApertura && negocio.horarioCierre ? `${negocio.horarioApertura} – ${negocio.horarioCierre}` : null;

    const services: EsenciaService[] = (p.services || []).map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        descripcion: s.descripcion || s.extraInfo?.descripcion || '',
        categoria: s.extraInfo?.categoria || s.categoria || undefined,
        duracion: s.duracion,
        precio: s.precio,
        imagen: getServicePrimaryImage(s, 'medium', negocio.tipoNegocio),
    }));

    const staff = (negocio.Staff || negocio.staff || [])
        .filter((st: any) => st.active !== false)
        .slice(0, 8)
        .map((st: any) => ({
            id: st.id,
            name: st.name,
            role: st.role,
            foto: st.imageMedia?.url || st.avatar || null,
            rating: st.ratingPromedio || 0,
        }));

    const reviews = (p.reviews || []).slice(0, 6);
    const featuredReview = reviews[0];
    const otherReviews = reviews.slice(1, 4);

    const cssVars = {
        ['--es-bg' as string]: '#F7F2EC',
        ['--es-surface' as string]: '#FFFCF8',
        ['--es-ink' as string]: '#2A2421',
        ['--es-muted' as string]: '#7A6D65',
        ['--es-line' as string]: 'rgba(42,36,33,0.14)',
        ['--es-accent' as string]: accent,
    } as React.CSSProperties;

    return (
        <main className={`${display.variable} min-h-screen pb-32 md:pb-16 overflow-x-hidden`} style={{ ...cssVars, backgroundColor: 'var(--es-bg)', color: 'var(--es-ink)' }}>
            <style>{`.es-display{font-family:var(--font-esencia),Georgia,serif;font-weight:400;letter-spacing:-0.01em;font-variation-settings:"SOFT" 60}`}</style>

            {p.previewOf && (
                <div className="sticky top-0 z-[60] text-center text-sm py-2 px-4" style={{ backgroundColor: 'var(--es-ink)', color: 'var(--es-bg)' }}>
                    <Eye size={14} className="inline -mt-0.5 mr-1.5" />
                    Vista previa del diseño <strong>Esencia</strong>. Tus clientes todavía ven tu diseño actual.
                </div>
            )}

            {/* Cabecera móvil */}
            <header className="md:hidden sticky top-0 z-50 flex items-center justify-between px-5 py-3 backdrop-blur-md" style={{ backgroundColor: 'rgba(247,242,236,0.88)' }}>
                <Link href={`/${slug}`} className="flex items-center gap-2.5 min-w-0">
                    {negocio.logoUrl ? (
                        <img src={negocio.logoUrl} alt={negocio.nombre} className="size-10 rounded-full object-cover" />
                    ) : (
                        <span className="size-10 rounded-full flex items-center justify-center text-white es-display text-lg" style={{ backgroundColor: accent }}>{negocio.nombre?.[0]}</span>
                    )}
                    <span className="es-display text-lg truncate">{negocio.nombre}</span>
                </Link>
                <NotificationBell slug={slug} initialUnreadCount={p.initialUnreadCount} />
            </header>

            {p.nextAppointment && (
                <div className="max-w-6xl mx-auto px-5 pt-4">
                    <NextAppointmentBanner appointment={p.nextAppointment} slug={slug} primaryColor={accent} />
                </div>
            )}

            {/* ── Portada ── */}
            <section className="max-w-6xl mx-auto px-5 pt-6 md:pt-14 pb-14 md:pb-24 grid md:grid-cols-[1.05fr_1fr] gap-10 md:gap-14 items-center">
                <div className="order-2 md:order-1">
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <span
                            className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5"
                            style={p.isOpen ? { backgroundColor: 'rgba(16,185,129,0.12)', color: '#047857' } : { backgroundColor: 'rgba(42,36,33,0.08)', color: 'var(--es-muted)' }}
                        >
                            <span className={`size-1.5 rounded-full ${p.isOpen ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                            {p.isOpen ? 'Abierto ahora' : 'Cerrado ahora'}
                            {horario && <span className="opacity-70">· {horario}</span>}
                        </span>
                        {p.totalOpiniones > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(42,36,33,0.06)' }}>
                                <Star size={12} fill="currentColor" className="text-amber-500" /> {p.promedio.toFixed(1)} · {p.totalOpiniones} {p.totalOpiniones === 1 ? 'opinión' : 'opiniones'}
                            </span>
                        )}
                    </div>

                    {p.clientName && (
                        <p className="text-base mb-2" style={{ color: 'var(--es-muted)' }}>Hola de nuevo, {p.clientName.split(' ')[0]}</p>
                    )}
                    <h1 className="es-display text-[2.9rem] leading-[0.98] sm:text-6xl lg:text-7xl">{titulo}</h1>
                    <p className="mt-6 text-lg leading-relaxed max-w-md" style={{ color: 'var(--es-muted)' }}>{subtitulo}</p>

                    <div className="mt-8 flex flex-col sm:flex-row gap-3">
                        <a href="#servicios" className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-white text-base font-medium shadow-lg transition-transform hover:-translate-y-0.5" style={{ backgroundColor: accent, boxShadow: `0 14px 30px -12px ${accent}` }}>
                            Reservar una cita <ArrowRight size={18} />
                        </a>
                        {whatsapp && (
                            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border text-base font-medium" style={{ borderColor: 'var(--es-ink)' }}>
                                <MessageCircle size={18} /> Escríbenos
                            </a>
                        )}
                    </div>

                    {(services.length > 0 || p.totalClientes > 0 || negocio.ciudad) && (
                        <dl className="mt-10 pt-6 border-t grid grid-cols-3 gap-4 max-w-md" style={{ borderColor: 'var(--es-line)' }}>
                            {services.length > 0 && (
                                <div><dt className="text-xs uppercase tracking-widest" style={{ color: 'var(--es-muted)' }}>Servicios</dt><dd className="es-display text-3xl mt-1">{services.length}</dd></div>
                            )}
                            {p.totalClientes > 0 && (
                                <div><dt className="text-xs uppercase tracking-widest" style={{ color: 'var(--es-muted)' }}>Clientes</dt><dd className="es-display text-3xl mt-1">{p.totalClientes > 999 ? `${(p.totalClientes / 1000).toFixed(1)}k` : p.totalClientes}</dd></div>
                            )}
                            {negocio.ciudad && (
                                <div><dt className="text-xs uppercase tracking-widest" style={{ color: 'var(--es-muted)' }}>Ciudad</dt><dd className="es-display text-2xl mt-1 truncate">{negocio.ciudad}</dd></div>
                            )}
                        </dl>
                    )}
                </div>

                <div className="order-1 md:order-2 relative">
                    <div className="relative aspect-[6/5] md:aspect-[4/5] w-full max-w-md mx-auto md:max-w-none rounded-t-[12rem] md:rounded-t-full rounded-b-[2rem] overflow-hidden shadow-2xl shadow-black/10">
                        {heroImage && <img src={heroImage} alt={negocio.nombre} className="absolute inset-0 w-full h-full object-cover" />}
                    </div>
                    {sideImage && sideImage !== heroImage && (
                        <div className="hidden md:block absolute -left-10 bottom-10 w-40 aspect-[3/4] rounded-t-full rounded-b-2xl overflow-hidden border-[6px] shadow-xl" style={{ borderColor: 'var(--es-bg)' }}>
                            <img src={sideImage} alt="" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="absolute -bottom-5 right-4 md:right-8 rounded-2xl px-5 py-4 shadow-xl" style={{ backgroundColor: 'var(--es-surface)' }}>
                        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--es-muted)' }}>Reserva en línea</p>
                        <p className="es-display text-xl">24 horas, 7 días</p>
                    </div>
                </div>
            </section>

            {/* ── Promociones ── */}
            {p.promociones.length > 0 && (
                <section id="promociones" className="max-w-6xl mx-auto px-5 pb-16">
                    <SectionTitle eyebrow="Ahora mismo" title="Ofertas especiales" />
                    <PromotionsSection
                        promociones={p.promociones}
                        slug={slug}
                        primaryColor={accent}
                        tertiaryColor={p.tertiaryColor}
                        textColor={p.textColor}
                        showPrices={showPrices}
                        totalServicesCount={services.length}
                        isGym={false}
                    />
                </section>
            )}

            {/* ── Servicios ── */}
            <section id="servicios" className="scroll-mt-20" style={{ backgroundColor: 'var(--es-surface)' }}>
                <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
                    <SectionTitle
                        eyebrow="Menú de servicios"
                        title="Elige tu momento"
                        action={services.length > 0 ? (
                            <Link href={`/${slug}/servicios`} className="hidden sm:inline-flex items-center gap-1 text-sm font-medium shrink-0" style={{ color: accent }}>
                                Ver catálogo <ArrowUpRight size={16} />
                            </Link>
                        ) : undefined}
                    />
                    {services.length > 0 ? (
                        <SpaEsenciaMenu services={services} slug={slug} accent={accent} showPrices={showPrices} />
                    ) : (
                        <p style={{ color: 'var(--es-muted)' }}>Pronto publicaremos nuestros servicios. Escríbenos para reservar.</p>
                    )}
                </div>
            </section>

            {/* ── Equipo ── */}
            {staff.length > 0 && (
                <section id="equipo" className="max-w-6xl mx-auto px-5 py-16 md:py-24">
                    <SectionTitle eyebrow="Nuestro equipo" title="Manos expertas" />
                    <div className="flex gap-5 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 md:grid md:grid-cols-4 md:mx-0 md:px-0 md:overflow-visible">
                        {staff.map((st: any) => (
                            <article key={st.id} className="shrink-0 w-44 md:w-auto">
                                <div className="aspect-[3/4] rounded-t-full rounded-b-2xl overflow-hidden" style={{ backgroundColor: 'rgba(42,36,33,0.06)' }}>
                                    {st.foto ? (
                                        <img src={st.foto} alt={st.name} loading="lazy" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center es-display text-5xl" style={{ color: accent }}>{st.name?.[0]}</div>
                                    )}
                                </div>
                                <h3 className="es-display text-xl mt-4">{st.name}</h3>
                                <p className="text-sm flex items-center gap-2" style={{ color: 'var(--es-muted)' }}>
                                    {st.role || 'Especialista'}
                                    {st.rating > 0 && <span className="inline-flex items-center gap-0.5"><Star size={12} fill="currentColor" className="text-amber-500" />{st.rating.toFixed(1)}</span>}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Resultados ── */}
            {p.resultados.length > 0 && (
                <section id="resultados" style={{ backgroundColor: 'var(--es-ink)', color: 'var(--es-bg)' }}>
                    <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
                        <div className="flex items-end justify-between gap-4 mb-8">
                            <div>
                                <p className="text-xs tracking-[0.25em] uppercase mb-3" style={{ color: accent }}>Resultados reales</p>
                                <h2 className="es-display text-4xl sm:text-5xl leading-[1.02]">El antes y el después</h2>
                            </div>
                            <Link href={`/${slug}/portafolio`} className="inline-flex items-center gap-1 text-sm font-medium shrink-0 opacity-80 hover:opacity-100">
                                Ver todos <ArrowUpRight size={16} />
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {p.resultados.slice(0, 6).map((r: any, i: number) => (
                                <Link key={r.id} href={`/${slug}/portafolio#trabajo-${r.id}`} className={`group relative overflow-hidden rounded-2xl ${i === 0 ? 'col-span-2 md:col-span-1 md:row-span-2 aspect-[4/3] md:aspect-auto' : 'aspect-square'}`}>
                                    {r.type !== 'GALLERY' && r.beforeImage && r.afterImage ? (
                                        <span className="absolute inset-0 flex">
                                            <img src={r.beforeImage} alt="Antes" loading="lazy" className="w-1/2 h-full object-cover" />
                                            <img src={r.afterImage} alt="Después" loading="lazy" className="w-1/2 h-full object-cover border-l-2 border-white/70" />
                                        </span>
                                    ) : (
                                        <img src={r.gallery?.[0] || r.afterImage || r.beforeImage} alt={r.title || ''} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    )}
                                    <span className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                                        <span className="es-display text-lg text-white">{r.title}</span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Productos ── */}
            {p.productos.length > 0 && (
                <section id="productos" className="max-w-6xl mx-auto px-5 pt-16">
                    <SectionTitle eyebrow="Para llevar a casa" title="Productos que usamos" />
                    <PublicProductsBoutiqueSection
                        productos={p.productos}
                        negocio={negocio}
                        slug={slug}
                        primaryColor={accent}
                        initialSelectedProduct={p.initialSelectedProduct}
                    />
                </section>
            )}

            {/* ── Opiniones ── */}
            {featuredReview && (
                <section id="opiniones" className="max-w-6xl mx-auto px-5 py-16 md:py-24">
                    <div className="grid md:grid-cols-[1.2fr_1fr] gap-10 items-start">
                        <figure>
                            <p className="text-xs tracking-[0.25em] uppercase mb-6" style={{ color: accent }}>Lo que dicen de nosotros</p>
                            <blockquote className="es-display text-3xl sm:text-4xl leading-snug">“{featuredReview.comment}”</blockquote>
                            <figcaption className="mt-6 flex items-center gap-3 text-sm" style={{ color: 'var(--es-muted)' }}>
                                <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill="currentColor" className={i < featuredReview.stars ? 'text-amber-500' : 'text-stone-300'} />)}</span>
                                {firstName(featuredReview.appointment?.cliente?.nombre)}{featuredReview.appointment?.servicio ? ` · ${featuredReview.appointment.servicio}` : ''}
                            </figcaption>
                            {p.totalOpiniones > 0 && (
                                <p className="mt-8 es-display text-6xl">{p.promedio.toFixed(1)}<span className="text-2xl" style={{ color: 'var(--es-muted)' }}> / 5 · {p.totalOpiniones} opiniones</span></p>
                            )}
                        </figure>
                        {otherReviews.length > 0 && (
                            <div className="space-y-4">
                                {otherReviews.map((r: any) => (
                                    <div key={r.id} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--es-surface)' }}>
                                        <div className="flex mb-2">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} fill="currentColor" className={i < r.stars ? 'text-amber-500' : 'text-stone-300'} />)}</div>
                                        <p className="text-[15px] leading-relaxed line-clamp-4">{r.comment}</p>
                                        <p className="mt-3 text-sm" style={{ color: 'var(--es-muted)' }}>{firstName(r.appointment?.cliente?.nombre)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ── Cursos ── */}
            {p.coursesEnabled && p.cursos.length > 0 && (
                <section id="cursos" className="max-w-6xl mx-auto px-5 pb-16">
                    <SectionTitle eyebrow="Aprende con nosotros" title="Cursos y talleres" />
                    <PublicCoursesSection
                        cursosActivos={p.cursos}
                        businessSlug={slug}
                        primaryColor={accent}
                        tertiaryColor={p.tertiaryColor}
                        textColor={p.textColor}
                        showPrices={showPrices}
                    />
                </section>
            )}

            {/* ── Páginas extra ── */}
            {p.paginas.length > 0 && (
                <section className="max-w-6xl mx-auto px-5 pb-16">
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {p.paginas.map((pg: any) => (
                            <Link key={pg.id} href={`/${slug}/pagina/${pg.slug}`} className="group flex items-center justify-between gap-3 rounded-2xl px-5 py-4 border" style={{ borderColor: 'var(--es-line)' }}>
                                <span className="es-display text-xl">{pg.title}</span>
                                <ArrowUpRight size={18} className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Visítanos ── */}
            {p.ubicaciones.length > 0 && (
                <section id="ubicacion" className="scroll-mt-20" style={{ backgroundColor: 'var(--es-surface)' }}>
                    <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
                        <SectionTitle eyebrow="Visítanos" title={p.ubicaciones.length > 1 ? 'Nuestras sedes' : 'Te esperamos'} />
                        <div className="space-y-10">
                            {p.ubicaciones.map((sede: any) => (
                                <div key={sede.id} className="grid md:grid-cols-[1.3fr_1fr] gap-6 items-stretch">
                                    <div className="relative min-h-[260px] rounded-3xl overflow-hidden" style={{ backgroundColor: 'rgba(42,36,33,0.06)' }}>
                                        {sede.embedSrc ? (
                                            <iframe src={sede.embedSrc} title={`Mapa de ${sede.nombre || negocio.nombre}`} loading="lazy" className="absolute inset-0 w-full h-full border-0 grayscale-[30%]" referrerPolicy="no-referrer-when-downgrade" />
                                        ) : sede.imagenUrl ? (
                                            <img src={sede.imagenUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                        ) : null}
                                    </div>
                                    <div className="rounded-3xl p-6 sm:p-8 flex flex-col gap-5" style={{ backgroundColor: 'var(--es-bg)' }}>
                                        {sede.nombre && <h3 className="es-display text-2xl">{sede.nombre}</h3>}
                                        {sede.direccion && (
                                            <p className="flex gap-3"><MapPin size={18} className="shrink-0 mt-0.5" style={{ color: accent }} /><span>{sede.direccion}{negocio.ciudad ? `, ${negocio.ciudad}` : ''}</span></p>
                                        )}
                                        {(sede.horario || horario) && (
                                            <p className="flex gap-3"><Clock size={18} className="shrink-0 mt-0.5" style={{ color: accent }} /><span>{sede.horario || horario}</span></p>
                                        )}
                                        {sede.telefono && (
                                            <a href={`tel:${sede.telefono}`} className="flex gap-3"><Phone size={18} className="shrink-0 mt-0.5" style={{ color: accent }} /><span>{sede.telefono}</span></a>
                                        )}
                                        {(sede.tieneParqueadero || sede.tieneTransporte || sede.tieneZonaSegura || sede.tieneAccesoFacil) && (
                                            <div className="flex flex-wrap gap-2 text-sm">
                                                {sede.tieneParqueadero && <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 border" style={{ borderColor: 'var(--es-line)' }}><Car size={14} /> Parqueadero</span>}
                                                {sede.tieneTransporte && <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 border" style={{ borderColor: 'var(--es-line)' }}><Bus size={14} /> Transporte cerca</span>}
                                                {sede.tieneZonaSegura && <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 border" style={{ borderColor: 'var(--es-line)' }}><ShieldCheck size={14} /> Zona segura</span>}
                                                {sede.tieneAccesoFacil && <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 border" style={{ borderColor: 'var(--es-line)' }}><Accessibility size={14} /> Acceso fácil</span>}
                                            </div>
                                        )}
                                        <div className="mt-auto flex flex-wrap gap-3">
                                            {sede.navUrl && (
                                                <a href={sede.navUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-white text-sm font-medium" style={{ backgroundColor: 'var(--es-ink)' }}>
                                                    Cómo llegar <ArrowUpRight size={15} />
                                                </a>
                                            )}
                                            {whatsapp && (
                                                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-full border text-sm font-medium" style={{ borderColor: 'var(--es-ink)' }}>
                                                    <MessageCircle size={15} /> WhatsApp
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Cierre ── */}
            <section className="max-w-6xl mx-auto px-5 py-16 md:py-24">
                <div className="relative overflow-hidden rounded-[2rem] px-6 py-14 sm:px-14 text-center" style={{ backgroundColor: accent, color: '#fff' }}>
                    <Sparkles className="mx-auto opacity-80" size={26} />
                    <h2 className="es-display text-4xl sm:text-5xl mt-4 leading-tight">Tu momento de calma te espera</h2>
                    <p className="mt-3 text-white/85 max-w-md mx-auto">Elige el servicio y la hora que prefieras. Te confirmamos al instante.</p>
                    <a href="#servicios" className="mt-8 inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white text-base font-medium" style={{ color: 'var(--es-ink)' }}>
                        Reservar ahora <ArrowRight size={18} />
                    </a>
                </div>
            </section>

            {p.referralCode && (
                <ReferralBanner referrerName={p.referrerName || 'Un amigo'} referralCode={p.referralCode} negocioName={negocio.nombre} primaryColor={accent} />
            )}
        </main>
    );
}
