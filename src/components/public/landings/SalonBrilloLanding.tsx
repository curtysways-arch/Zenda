import Link from 'next/link';
import { Bodoni_Moda, Manrope } from 'next/font/google';
import {
  Star, MapPin, Clock, Phone, MessageCircle, ArrowRight, ArrowUpRight, Eye, Instagram, CalendarCheck, Sparkles, Scissors, Hand,
} from 'lucide-react';
import { getServicePrimaryImage } from '@/lib/serviceImageHelper';
import NotificationBell from '@/components/public/NotificationBell';
import NextAppointmentBanner from '@/components/public/NextAppointmentBanner';
import ReferralBanner from '@/components/public/ReferralBanner';
import PromotionsSection from '@/components/public/PromotionsSection';
import PublicProductsBoutiqueSection from '@/components/public/PublicProductsBoutiqueSection';
import PublicCoursesSection from '@/components/public/PublicCoursesSection';
import type { SpaEsenciaProps } from './SpaEsenciaLanding';

const display = Bodoni_Moda({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-brillo-display', display: 'swap' });
const body = Manrope({ subsets: ['latin'], variable: '--font-brillo-body', display: 'swap' });

/* ── Utilidades ─────────────────────────────────────────────────────────── */

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

function hexToRgb(hex: string) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** Mezcla el color de la marca con otro (para armar la carta de tonos). */
function mix(hex: string, other: string, t: number) {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}

function inkOn(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.42 ? '#24141c' : '#ffffff';
}

const money = (n: any) => `$${(Number(n) || 0).toFixed(Number(n) % 1 ? 2 : 0)}`;

type Kind = 'unas' | 'cabello' | 'otros';
const NAILS = /uñ|unas\b|manicur|pedicur|acr[ií]lic|\bgel\b|esmalt|semipermanente|nail|polygel|press ?on|kapping|rubber/i;
const HAIR = /cabell|corte|tinte|mech|balayage|babylight|peinad|keratin|alisad|blower|brushing|cepillad|capilar|barba|ondulad|extensi|tratamiento.*pelo|color(ación)?\b|decolor|rizos|botox capilar/i;

function kindOf(s: any): Kind {
  const t = `${s.nombre || ''} ${s.categoria || ''} ${s.extraInfo?.categoria || ''}`;
  if (NAILS.test(t)) return 'unas';
  if (HAIR.test(t)) return 'cabello';
  const d = `${s.descripcion || ''} ${s.extraInfo?.descripcion || ''}`;
  if (NAILS.test(d)) return 'unas';
  if (HAIR.test(d)) return 'cabello';
  return 'otros';
}

const KIND_META: Record<Kind, { title: string; eyebrow: string; Icon: any }> = {
  unas: { title: 'Uñas', eyebrow: 'Manicure · Pedicure · Diseño', Icon: Hand },
  cabello: { title: 'Cabello', eyebrow: 'Corte · Color · Tratamientos', Icon: Scissors },
  otros: { title: 'Más cuidados', eyebrow: 'Para completar tu visita', Icon: Sparkles },
};

/** Marco con forma de uña: la firma visual del diseño. */
function NailFrame({ src, alt, className = '', tone }: { src?: string | null; alt: string; className?: string; tone: string }) {
  return (
    <div className={`relative overflow-hidden rounded-t-[999px] rounded-b-[28px] ${className}`} style={{ backgroundColor: tone }}>
      {src ? <img src={src} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : null}
      <span className="pointer-events-none absolute inset-x-[18%] top-[6%] h-[22%] rounded-full bg-white/25 blur-md" aria-hidden />
    </div>
  );
}

/* ── Página ─────────────────────────────────────────────────────────────── */

/**
 * Diseño "Brillo" para salones de uñas y peluquería.
 * Revista de belleza con una carta de tonos como firma, pensado para convertir:
 * prueba real arriba (trabajos, opiniones), precios "desde" claros, reservar en un toque y WhatsApp siempre a mano.
 */
export default function SalonBrilloLanding(p: SpaEsenciaProps) {
  const { negocio, slug } = p;
  const accent = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(p.primaryColor || '') ? p.primaryColor : '#b0264a';
  const accentInk = inkOn(accent);
  const ink = mix(accent, '#140c10', 0.86); // casi negro, teñido del color de la marca
  const paper = '#fbf6f2';
  const showPrices = negocio.mostrarPrecios !== false;
  const whatsapp = waLink(negocio.whatsapp, `Hola ${negocio.nombre}, quiero reservar una cita.`);
  const horario = negocio.horarioApertura && negocio.horarioCierre ? `${negocio.horarioApertura} – ${negocio.horarioCierre}` : null;

  // Carta de tonos derivada del color de la marca
  const swatches = [mix(accent, '#ffffff', 0.78), mix(accent, '#ffffff', 0.5), accent, mix(accent, '#000000', 0.25), mix(accent, '#140c10', 0.6), mix(accent, '#f5d0b5', 0.55)];

  // Servicios agrupados en Uñas / Cabello / Más cuidados
  // El helper devuelve una foto genérica cuando el servicio no tiene foto: no la repetimos en la lista.
  const placeholder = getServicePrimaryImage(null, 'medium', negocio.tipoNegocio);
  const services = (p.services || []).map((s: any) => ({
    id: s.id,
    nombre: s.nombre,
    descripcion: s.descripcion || s.extraInfo?.descripcion || '',
    duracion: Number(s.duracion) || 0,
    precio: Number(s.precio) || 0,
    imagen: ((img: string) => (img && img !== placeholder ? img : null))(getServicePrimaryImage(s, 'medium', negocio.tipoNegocio)),
    kind: kindOf(s),
  }));
  const groups = (['unas', 'cabello', 'otros'] as Kind[])
    .map((k) => ({ k, items: services.filter((s) => s.kind === k) }))
    .filter((g) => g.items.length > 0);
  const specialties = groups.filter((g) => g.k !== 'otros').map((g) => KIND_META[g.k].title);
  const fromPrice = (items: any[]) => {
    const prices = items.map((s) => s.precio).filter((x) => x > 0);
    return prices.length ? Math.min(...prices) : 0;
  };

  // Fotos de trabajos reales primero; si no hay, las de la portada o los servicios.
  const workPhotos: string[] = [
    ...(p.resultados || []).flatMap((r: any) => [r.afterImage, ...(Array.isArray(r.gallery) ? r.gallery : [])]),
    ...(p.heroImages || []),
    ...services.map((s) => s.imagen),
  ].filter((x: any): x is string => typeof x === 'string' && x.length > 4);
  const uniquePhotos = Array.from(new Set(workPhotos));
  // Sin fotos suficientes, los marcos quedan en tonos de la carta (no repetimos la misma foto).
  const [hero1, hero2, hero3] = [uniquePhotos[0] || null, uniquePhotos[1] || null, uniquePhotos[2] || null];

  const staff = (negocio.Staff || negocio.staff || [])
    .filter((st: any) => st.active !== false)
    .slice(0, 8)
    .map((st: any) => ({ id: st.id, name: st.name, role: st.role, foto: st.imageMedia?.url || st.avatar || null, rating: Number(st.ratingPromedio) || 0 }));

  const reviews = (p.reviews || []).filter((r: any) => r.comment).slice(0, 7);
  const [featured, ...moreReviews] = reviews;
  const promo = (p.promociones || [])[0];
  const titulo = negocio.heroTitulo || negocio.nombre;
  const subtitulo = negocio.heroSubtitulo || negocio.mensajeBienvenida
    || `${specialties.length ? specialties.join(' y ') : 'Belleza'} con detalle${negocio.ciudad ? ` en ${negocio.ciudad}` : ''}. Elige tu servicio, mira el precio y reserva en un minuto.`;
  const extraPages = (p.paginas || []).filter((pg: any) => pg.slug !== 'por-que-elegirnos' && pg.slug !== 'como-funciona');

  const cssVars = {
    ['--br-paper' as string]: paper,
    ['--br-ink' as string]: ink,
    ['--br-muted' as string]: '#6f5a63',
    ['--br-line' as string]: 'rgba(36,20,28,0.12)',
    ['--br-accent' as string]: accent,
    ['--br-accent-ink' as string]: accentInk,
    ['--br-blush' as string]: mix(accent, '#ffffff', 0.9),
  } as React.CSSProperties;

  const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-[15px] font-semibold transition hover:brightness-110 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
  const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-full border px-7 py-4 text-[15px] font-semibold transition hover:bg-black/[0.04]';

  return (
    <main className={`${display.variable} ${body.variable} min-h-screen overflow-x-hidden pb-28 md:pb-0`} style={{ ...cssVars, backgroundColor: 'var(--br-paper)', color: 'var(--br-ink)', fontFamily: 'var(--font-brillo-body), system-ui, sans-serif' }}>
      <style>{`
        .br-display{font-family:var(--font-brillo-display),Georgia,serif;font-weight:500;letter-spacing:-0.02em}
        .br-italic{font-family:var(--font-brillo-display),Georgia,serif;font-style:italic;font-weight:400}
        @media (prefers-reduced-motion: no-preference){
          .br-rise{animation:brRise .9s cubic-bezier(.2,.7,.2,1) both}.br-rise-2{animation-delay:.1s}.br-rise-3{animation-delay:.2s}
          @keyframes brRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        }
      `}</style>

      {p.previewOf && (
        <div className="sticky top-0 z-[60] flex h-9 items-center justify-center px-4 text-center text-sm" style={{ backgroundColor: ink, color: paper }}>
          <Eye size={14} className="-mt-0.5 mr-1.5 inline" /> Vista previa del diseño <strong>Brillo</strong>. Tus clientes todavía ven tu diseño actual.
        </div>
      )}

      {/* Aviso de promoción */}
      {promo && (
        <Link href={promo.serviceId || promo.PromotionToService?.[0]?.serviceId ? `/${slug}/servicio/${promo.serviceId || promo.PromotionToService[0].serviceId}?promoId=${promo.id}` : '#promociones'}
          className="block px-4 py-2.5 text-center text-sm font-medium" style={{ backgroundColor: accent, color: accentInk }}>
          {promo.titulo || promo.title} <span className="underline underline-offset-2">Reservar con la promo</span>
        </Link>
      )}

      {/* Cabecera */}
      <header className={`sticky ${p.previewOf ? 'top-9' : 'top-0'} z-50 border-b backdrop-blur-md`} style={{ backgroundColor: 'rgba(251,246,242,0.86)', borderColor: 'var(--br-line)' }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href={`/${slug}`} className="flex min-w-0 items-center gap-2.5">
            {negocio.logoUrl ? (
              <img src={negocio.logoUrl} alt="" className="size-10 rounded-full object-cover ring-1 ring-black/5" />
            ) : (
              <span className="br-italic flex size-10 items-center justify-center rounded-full text-xl" style={{ backgroundColor: accent, color: accentInk }}>{negocio.nombre?.[0]}</span>
            )}
            <span className="br-display truncate text-xl">{negocio.nombre}</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex" aria-label="Secciones">
            <a href="#servicios" className="hover:opacity-70">Servicios</a>
            {p.resultados.length > 0 && <a href="#trabajos" className="hover:opacity-70">Trabajos</a>}
            {staff.length > 0 && <a href="#equipo" className="hover:opacity-70">Equipo</a>}
            {p.ubicaciones.length > 0 && <a href="#visitanos" className="hover:opacity-70">Visítanos</a>}
          </nav>
          <div className="flex items-center gap-2">
            <NotificationBell slug={slug} initialUnreadCount={p.initialUnreadCount} />
            <a href="#servicios" className="hidden rounded-full px-5 py-2.5 text-sm font-semibold md:inline-flex" style={{ backgroundColor: ink, color: paper }}>Reservar</a>
          </div>
        </div>
      </header>

      {p.nextAppointment && (
        <div className="mx-auto max-w-6xl px-5 pt-4">
          <NextAppointmentBanner appointment={p.nextAppointment} slug={slug} primaryColor={accent} />
        </div>
      )}

      {/* ── Portada ── */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-10 pt-10 md:grid-cols-[1.05fr_1fr] md:pb-16 md:pt-16">
        <div>
          <p className="br-rise flex flex-wrap items-center gap-2 text-sm font-medium" style={{ color: 'var(--br-muted)' }}>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={p.isOpen ? { backgroundColor: 'rgba(16,185,129,0.12)', color: '#047857' } : { backgroundColor: 'rgba(36,20,28,0.06)' }}>
              <span className={`size-1.5 rounded-full ${p.isOpen ? 'bg-emerald-500' : 'bg-stone-400'}`} />
              {p.isOpen ? 'Abierto ahora' : 'Cerrado ahora'}{horario ? ` · ${horario}` : ''}
            </span>
            {specialties.length > 0 && <span>{specialties.join(' · ')}</span>}
          </p>
          {p.clientName && <p className="br-rise mt-6 text-lg" style={{ color: 'var(--br-muted)' }}>Hola de nuevo, {p.clientName.split(' ')[0]}.</p>}
          <h1 className="br-display br-rise br-rise-2 mt-5 text-[3.1rem] leading-[0.95] sm:text-7xl lg:text-[5.4rem]">
            {titulo}
          </h1>
          <p className="br-rise br-rise-3 mt-6 max-w-md text-lg leading-relaxed" style={{ color: 'var(--br-muted)' }}>{subtitulo}</p>
          <div className="br-rise br-rise-3 mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#servicios" className={btnPrimary} style={{ backgroundColor: accent, color: accentInk, outlineColor: accent }}>
              <CalendarCheck size={18} /> Reservar mi cita
            </a>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={btnGhost} style={{ borderColor: ink }}>
                <MessageCircle size={18} /> Escribir por WhatsApp
              </a>
            )}
          </div>

          {/* Prueba social */}
          {(p.totalOpiniones > 0 || p.totalClientes > 0) && (
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t pt-6" style={{ borderColor: 'var(--br-line)' }}>
              {p.totalOpiniones > 0 && (
                <div>
                  <dt className="text-sm" style={{ color: 'var(--br-muted)' }}>{p.totalOpiniones} {p.totalOpiniones === 1 ? 'opinión' : 'opiniones'}</dt>
                  <dd className="br-display mt-1 flex items-center gap-1.5 text-3xl">{p.promedio.toFixed(1)} <Star size={20} fill="currentColor" style={{ color: accent }} /></dd>
                </div>
              )}
              {p.totalClientes > 0 && (
                <div>
                  <dt className="text-sm" style={{ color: 'var(--br-muted)' }}>Clientes atendidos</dt>
                  <dd className="br-display mt-1 text-3xl">{p.totalClientes > 999 ? `${Math.floor(p.totalClientes / 100) / 10}k` : p.totalClientes}+</dd>
                </div>
              )}
              {groups.length > 0 && fromPrice(services) > 0 && showPrices && (
                <div>
                  <dt className="text-sm" style={{ color: 'var(--br-muted)' }}>Servicios desde</dt>
                  <dd className="br-display mt-1 text-3xl">{money(fromPrice(services))}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Collage con marcos de uña */}
        <div className="relative mx-auto grid w-full max-w-md grid-cols-[1fr_0.82fr] items-end gap-4 md:max-w-none">
          <NailFrame src={hero1} alt={`Trabajo de ${negocio.nombre}`} tone={swatches[1]} className="br-rise aspect-[3/4.4] w-full" />
          <div className="flex flex-col gap-4 pb-10">
            <NailFrame src={hero2} alt="" tone={swatches[0]} className="br-rise br-rise-2 aspect-[3/3.9] w-full" />
            <NailFrame src={hero3} alt="" tone={swatches[5]} className="br-rise br-rise-3 aspect-[3/3.2] w-[78%] self-end" />
          </div>
          {featured && (
            <figure className="absolute -bottom-6 left-4 right-10 rounded-2xl bg-white p-4 shadow-[0_24px_60px_-24px_rgba(36,20,28,0.45)] sm:left-8 sm:right-auto sm:max-w-[16rem]">
              <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} fill="currentColor" className={i < featured.stars ? '' : 'opacity-25'} style={{ color: accent }} />)}</div>
              <blockquote className="mt-1.5 line-clamp-3 text-sm leading-snug">“{featured.comment}”</blockquote>
              <figcaption className="mt-1.5 text-xs" style={{ color: 'var(--br-muted)' }}>{firstName(featured.appointment?.cliente?.nombre)}</figcaption>
            </figure>
          )}
        </div>
      </section>

      {/* Carta de tonos (firma) */}
      <div className="mx-auto mt-6 flex max-w-6xl items-end gap-2 overflow-hidden px-5 pb-2" aria-hidden>
        {[...swatches, ...swatches].map((c, i) => (
          <span key={i} className="h-16 w-10 shrink-0 rounded-t-full rounded-b-lg sm:h-20 sm:w-12" style={{ backgroundColor: c, transform: `translateY(${(i % 3) * 6}px)` }} />
        ))}
      </div>

      {/* ── Servicios ── */}
      <section id="servicios" className="scroll-mt-20 border-y" style={{ backgroundColor: '#ffffff', borderColor: 'var(--br-line)' }}>
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>Servicios y precios</p>
              <h2 className="br-display mt-3 text-4xl leading-[1.02] sm:text-6xl">Elige lo que <span className="br-italic">te quieres hacer</span></h2>
            </div>
            <Link href={`/${slug}/servicios`} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: accent }}>Ver todo el menú <ArrowUpRight size={16} /></Link>
          </div>

          {groups.length > 1 && (
            <div className="mt-8 flex flex-wrap gap-2" role="navigation" aria-label="Categorías">
              {groups.map((g) => {
                const M = KIND_META[g.k];
                return (
                  <a key={g.k} href={`#cat-${g.k}`} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-black/[0.03]" style={{ borderColor: 'var(--br-line)' }}>
                    <M.Icon size={15} style={{ color: accent }} /> {M.title} <span style={{ color: 'var(--br-muted)' }}>{g.items.length}</span>
                  </a>
                );
              })}
            </div>
          )}

          {groups.length === 0 ? (
            <p className="mt-10 text-lg" style={{ color: 'var(--br-muted)' }}>Pronto publicaremos nuestros servicios. Escríbenos para reservar.</p>
          ) : (
            <div className={`mt-10 grid gap-x-14 gap-y-14 ${groups.length > 1 ? 'lg:grid-cols-2' : ''}`}>
              {groups.map((g) => {
                const M = KIND_META[g.k];
                const desde = fromPrice(g.items);
                return (
                  <div key={g.k} id={`cat-${g.k}`} className="scroll-mt-24">
                    <div className="flex items-baseline justify-between gap-4 border-b pb-3" style={{ borderColor: ink }}>
                      <h3 className="br-display text-3xl">{M.title}</h3>
                      <p className="text-sm" style={{ color: 'var(--br-muted)' }}>{showPrices && desde > 0 ? `desde ${money(desde)}` : M.eyebrow}</p>
                    </div>
                    <ul>
                      {g.items.slice(0, 8).map((s) => (
                        <li key={s.id} className="border-b" style={{ borderColor: 'var(--br-line)' }}>
                          <Link href={`/${slug}/servicio/${s.id}`} className="group grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 py-4">
                            <span className="relative size-14 overflow-hidden rounded-t-full rounded-b-xl" style={{ backgroundColor: swatches[0] }}>
                              {s.imagen && <img src={s.imagen} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-semibold leading-snug">{s.nombre}</span>
                              <span className="mt-0.5 block truncate text-sm" style={{ color: 'var(--br-muted)' }}>
                                {[s.duracion ? `${s.duracion} min` : null, s.descripcion || null].filter(Boolean).join(' · ') || 'Toca para ver detalles'}
                              </span>
                            </span>
                            <span className="flex items-center gap-3 text-right">
                              {showPrices && <span className="font-semibold tabular-nums">{s.precio > 0 ? money(s.precio) : 'Consultar'}</span>}
                              <span className="hidden size-9 items-center justify-center rounded-full transition group-hover:translate-x-0.5 sm:flex" style={{ backgroundColor: 'var(--br-blush)', color: accent }} aria-hidden><ArrowRight size={16} /></span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {g.items.length > 8 && (
                      <Link href={`/${slug}/servicios`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: accent }}>Ver {g.items.length - 8} más <ArrowRight size={14} /></Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Promociones ── */}
      {p.promociones.length > 0 && (
        <section id="promociones" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-16 md:pt-24">
          <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>Solo por ahora</p>
          <h2 className="br-display mb-8 mt-3 text-4xl sm:text-5xl">Promociones</h2>
          <PromotionsSection promociones={p.promociones} slug={slug} primaryColor={accent} tertiaryColor={p.tertiaryColor} textColor={p.textColor} showPrices={showPrices} totalServicesCount={services.length} isGym={false} />
        </section>
      )}

      {/* ── Trabajos reales ── */}
      {p.resultados.length > 0 && (
        <section id="trabajos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>Hecho aquí</p>
              <h2 className="br-display mt-3 text-4xl sm:text-6xl">Nuestro <span className="br-italic">trabajo</span></h2>
            </div>
            <Link href={`/${slug}/portafolio`} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: accent }}>Ver portafolio <ArrowUpRight size={16} /></Link>
          </div>
          <div className="mt-10 columns-2 gap-4 md:columns-3 [&>*]:mb-4">
            {p.resultados.slice(0, 9).map((r: any, i: number) => (
              <Link key={r.id} href={`/${slug}/portafolio#trabajo-${r.id}`} className="group relative block break-inside-avoid overflow-hidden rounded-[24px]">
                {r.type !== 'GALLERY' && r.beforeImage && r.afterImage ? (
                  <span className={`flex ${i % 3 === 0 ? 'aspect-[4/5]' : 'aspect-square'}`}>
                    <img src={r.beforeImage} alt="Antes" loading="lazy" className="h-full w-1/2 object-cover" />
                    <img src={r.afterImage} alt="Después" loading="lazy" className="h-full w-1/2 border-l-2 border-white object-cover" />
                  </span>
                ) : (
                  <img src={r.gallery?.[0] || r.afterImage || r.beforeImage} alt={r.title || 'Trabajo'} loading="lazy" className={`w-full object-cover transition duration-500 group-hover:scale-[1.03] ${i % 3 === 0 ? 'aspect-[4/5]' : 'aspect-square'}`} />
                )}
                {r.title && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 pt-10 text-sm font-semibold text-white">{r.title}</span>}
                {r.type !== 'GALLERY' && r.beforeImage && r.afterImage && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: ink }}>Antes · Después</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Cómo reservar ── */}
      <section className="scroll-mt-20" style={{ backgroundColor: ink, color: paper }}>
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: swatches[1] }}>Así de fácil</p>
            <h2 className="br-display mt-3 text-4xl sm:text-6xl">Tu cita en <span className="br-italic">un minuto</span></h2>
            <p className="mt-5 max-w-sm text-lg leading-relaxed opacity-80">Sin llamadas ni esperas: ves los horarios libres y apartas el tuyo.</p>
            <a href="#servicios" className={`${btnPrimary} mt-8`} style={{ backgroundColor: accent, color: accentInk }}>Elegir mi servicio <ArrowRight size={18} /></a>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3 md:grid-cols-1">
            {[
              ['Elige tu servicio', staff.length ? 'Y si quieres, también a tu especialista de confianza.' : 'Mira la duración y el precio antes de reservar.'],
              ['Escoge día y hora', 'Solo ves los horarios que de verdad están libres.'],
              ['Listo, te esperamos', 'Recibes la confirmación de tu cita y te esperamos.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-5 rounded-3xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <span className="br-italic text-5xl leading-none" style={{ color: swatches[[1, 0, 5][i]] }}>{i + 1}</span>
                <span>
                  <span className="block text-lg font-semibold">{t}</span>
                  <span className="mt-1 block text-[15px] opacity-75">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Equipo ── */}
      {staff.length > 0 && (
        <section id="equipo" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 md:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>Nuestro equipo</p>
          <h2 className="br-display mt-3 text-4xl sm:text-6xl">Elige a tu <span className="br-italic">especialista</span></h2>
          <div className="-mx-5 mt-10 flex gap-5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
            {staff.map((st: any, i: number) => (
              <article key={st.id} className="w-44 shrink-0 md:w-auto">
                <NailFrame src={st.foto} alt={st.name} tone={swatches[i % swatches.length]} className="aspect-[3/4] w-full" />
                <h3 className="br-display mt-4 text-2xl">{st.name}</h3>
                <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--br-muted)' }}>
                  {st.role && !/^(staff|profesional|especialista)$/i.test(st.role) ? st.role : 'Especialista'}
                  {st.rating > 0 && <span className="inline-flex items-center gap-0.5"><Star size={12} fill="currentColor" style={{ color: accent }} />{st.rating.toFixed(1)}</span>}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Opiniones ── */}
      {moreReviews.length > 0 && (
        <section id="opiniones" className="border-y" style={{ backgroundColor: 'var(--br-blush)', borderColor: 'var(--br-line)' }}>
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="br-display text-4xl sm:text-6xl">Lo que dicen <span className="br-italic">de nosotros</span></h2>
              {p.totalOpiniones > 0 && <p className="br-display text-3xl">{p.promedio.toFixed(1)} <span className="text-lg" style={{ color: 'var(--br-muted)' }}>/ 5 · {p.totalOpiniones} opiniones</span></p>}
            </div>
            <div className="-mx-5 mt-10 flex snap-x gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
              {moreReviews.slice(0, 6).map((r: any) => (
                <figure key={r.id} className="flex w-[80%] shrink-0 snap-start flex-col rounded-3xl bg-white p-6 md:w-auto">
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill="currentColor" className={i < r.stars ? '' : 'opacity-25'} style={{ color: accent }} />)}</div>
                  <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed">“{r.comment}”</blockquote>
                  <figcaption className="mt-4 text-sm font-semibold">{firstName(r.appointment?.cliente?.nombre)}{r.appointment?.servicio ? <span className="font-normal" style={{ color: 'var(--br-muted)' }}> · {r.appointment.servicio}</span> : null}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Productos y cursos ── */}
      {p.productos.length > 0 && (
        <section id="productos" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-16 md:pt-24">
          <h2 className="br-display mb-8 text-4xl sm:text-5xl">Para llevar <span className="br-italic">a casa</span></h2>
          <PublicProductsBoutiqueSection productos={p.productos} negocio={negocio} slug={slug} primaryColor={accent} initialSelectedProduct={p.initialSelectedProduct} />
        </section>
      )}
      {p.coursesEnabled && p.cursos.length > 0 && (
        <section id="cursos" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-16">
          <h2 className="br-display mb-8 text-4xl sm:text-5xl">Aprende <span className="br-italic">con nosotros</span></h2>
          <PublicCoursesSection cursosActivos={p.cursos} businessSlug={slug} primaryColor={accent} tertiaryColor={p.tertiaryColor} textColor={p.textColor} showPrices={showPrices} />
        </section>
      )}

      {extraPages.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pt-16">
          <div className="grid gap-3 sm:grid-cols-2">
            {extraPages.slice(0, 4).map((pg: any) => (
              <Link key={pg.id} href={`/${slug}/pagina/${pg.slug}`} className="group flex items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-4" style={{ borderColor: 'var(--br-line)' }}>
                <span className="font-semibold">{pg.title}</span>
                <ArrowUpRight size={18} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" style={{ color: accent }} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Visítanos ── */}
      {p.ubicaciones.length > 0 && (
        <section id="visitanos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 md:py-24">
          <h2 className="br-display text-4xl sm:text-6xl">Te <span className="br-italic">esperamos</span></h2>
          <div className="mt-10 space-y-6">
            {p.ubicaciones.map((sede: any) => (
              <div key={sede.id} className={`grid overflow-hidden rounded-[28px] border bg-white ${sede.embedSrc || sede.imagenUrl ? 'md:grid-cols-[1.25fr_1fr]' : ''}`} style={{ borderColor: 'var(--br-line)' }}>
                {(sede.embedSrc || sede.imagenUrl) && (
                  <div className="relative min-h-[240px]" style={{ backgroundColor: 'var(--br-blush)' }}>
                    {sede.embedSrc ? (
                      <iframe src={sede.embedSrc} title={`Mapa de ${sede.nombre || negocio.nombre}`} loading="lazy" className="absolute inset-0 h-full w-full border-0" referrerPolicy="no-referrer-when-downgrade" />
                    ) : <img src={sede.imagenUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  </div>
                )}
                <div className="flex flex-col gap-4 p-6 sm:p-8">
                  {sede.nombre && <h3 className="br-display text-2xl">{sede.nombre}</h3>}
                  {sede.direccion && <p className="flex gap-3"><MapPin size={18} className="mt-0.5 shrink-0" style={{ color: accent }} />{sede.direccion}{negocio.ciudad ? `, ${negocio.ciudad}` : ''}</p>}
                  {(sede.horario || horario) && <p className="flex gap-3"><Clock size={18} className="mt-0.5 shrink-0" style={{ color: accent }} />{sede.horario || horario}</p>}
                  {sede.telefono && <a href={`tel:${sede.telefono}`} className="flex gap-3"><Phone size={18} className="mt-0.5 shrink-0" style={{ color: accent }} />{sede.telefono}</a>}
                  <div className="mt-auto flex flex-wrap gap-3 pt-2">
                    {sede.navUrl && <a href={sede.navUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold" style={{ backgroundColor: ink, color: paper }}>Cómo llegar <ArrowUpRight size={15} /></a>}
                    {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold" style={{ borderColor: ink }}><MessageCircle size={15} /> WhatsApp</a>}
                    {negocio.instagramUrl && <a href={negocio.instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold" style={{ borderColor: 'var(--br-line)' }}><Instagram size={15} /> Instagram</a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Cierre ── */}
      <section className="px-5 pb-16 md:pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] px-6 pb-28 pt-14 text-center sm:px-12 md:pb-32 md:pt-20" style={{ backgroundColor: accent, color: accentInk }}>
          <div className="pointer-events-none absolute -bottom-3 left-0 right-0 flex justify-center gap-2.5" aria-hidden>
            {[0, 1, 4, 0, 5, 1, 4].map((k, i) => <span key={i} className="h-16 w-9 rounded-t-full sm:h-20 sm:w-11" style={{ backgroundColor: k === 0 ? 'rgba(255,255,255,0.85)' : swatches[k], transform: `translateY(${(i % 3) * 8}px)` }} />)}
          </div>
          <h2 className="br-display relative text-4xl sm:text-6xl">¿Te <span className="br-italic">consentimos</span> esta semana?</h2>
          <p className="relative mx-auto mt-4 max-w-md text-lg opacity-90">Reserva hoy y llega directo a tu cita.</p>
          <a href="#servicios" className={`${btnPrimary} relative mt-8`} style={{ backgroundColor: accentInk, color: accent }}>Reservar mi cita <ArrowRight size={18} /></a>
        </div>
      </section>

      {/* Barra fija en celular */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden" style={{ backgroundColor: 'rgba(251,246,242,0.94)', borderColor: 'var(--br-line)' }}>
        <a href="#servicios" className="flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold" style={{ backgroundColor: accent, color: accentInk }}><CalendarCheck size={18} /> Reservar</a>
        {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-full border px-4" style={{ borderColor: ink }} aria-label="WhatsApp"><MessageCircle size={20} /></a>}
      </div>

      {p.referralCode && (
        <ReferralBanner referrerName={p.referrerName || 'Un amigo'} referralCode={p.referralCode} negocioName={negocio.nombre} primaryColor={accent} />
      )}
    </main>
  );
}
