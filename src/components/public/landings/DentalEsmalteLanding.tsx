import Link from 'next/link';
import { Geist, Instrument_Serif } from 'next/font/google';
import { ArrowRight, ArrowUpRight, Clock, MapPin, Phone, MessageCircle, Eye, Instagram, Facebook } from 'lucide-react';
import { getServicePrimaryImage } from '@/lib/serviceImageHelper';
import DynamicFavicon from '@/components/DynamicFavicon';

const sans = Geist({ subsets: ['latin'], variable: '--font-esm-sans', display: 'swap' });
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-esm-serif', display: 'swap' });

/**
 * Diseño "Esmalte" para clínicas dentales.
 *
 * Mundo visual: porcelana y precisión clínica. Fondo color esmalte, tinta verde
 * profunda, una sola tipografía de líneas limpias y un acento serif en itálica.
 * El motivo de la arcada dental (nomenclatura FDI) conecta la página con el
 * odontograma digital que la clínica usa en su panel.
 *
 * Solo muestra datos reales del negocio: si no hay casos, opiniones o fotos,
 * la sección no aparece (nunca se rellena con contenido inventado).
 */

export interface DentalEsmalteProps {
  negocio: any;
  services?: any[];
  staff?: any[];
  results?: any[];
  pages?: any[];
  promotions?: any[];
  previewOf?: string | null;
}

// ── Utilidades ─────────────────────────────────────────────────────────

function parseConfig(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  }
  return raw as Record<string, any>;
}

function waLink(raw?: string | null, text?: string) {
  if (!raw) return null;
  let n = String(raw).replace(/\D/g, '');
  if (n.startsWith('0') && n.length === 10) n = `593${n.slice(1)}`;
  if (n.length < 9) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: number[]) {
  const ch = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Oscurece el color de marca hasta que el texto blanco encima sea legible (contraste ≥ 4.5). */
function readableAccent(hex?: string | null) {
  const fallback = '#1F6F64';
  if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return fallback;
  let [r, g, b] = hexToRgb(hex);
  for (let i = 0; i < 12; i++) {
    const contrast = 1.05 / (luminance([r, g, b]) + 0.05);
    if (contrast >= 4.5) break;
    r = Math.round(r * 0.86); g = Math.round(g * 0.86); b = Math.round(b * 0.86);
  }
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function money(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

function cleanHtml(html?: string) {
  return (html || '').replace(/\{\/\*.*?\*\/\}/g, '').replace(/<!--.*?-->/g, '').replace(/<p>\s*<\/p>/g, '');
}

function pageIsLive(p: any) {
  const st = String(p.status || '').toLowerCase();
  return st === 'published' || st === 'publicado';
}

// ── Motivo: arcada dental superior (FDI 18 → 28) ──────────────────────

const UPPER_ARCH = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];

/** Ancho aproximado de cada pieza según su posición FDI (molares más anchos que incisivos laterales). */
const TOOTH_WIDTH: Record<string, number> = { '1': 23, '2': 18, '3': 20, '4': 21, '5': 21, '6': 29, '7': 27, '8': 25 };

/**
 * Coloca las piezas una junto a otra sobre una curva en "U" (como una arcada real),
 * repartidas por longitud de arco para que no queden huecos.
 */
function archLayout() {
  const pts: { x: number; y: number; l: number }[] = [];
  let l = 0;
  for (let i = 0; i <= 400; i++) {
    const x = -178 + (356 * i) / 400;
    const y = 30 + 0.0058 * x * x + 0.0000000032 * x ** 4 * 60;
    if (i > 0) l += Math.hypot(x - pts[i - 1].x, y - pts[i - 1].y);
    pts.push({ x, y, l });
  }
  const gap = 2.5;
  const widths = UPPER_ARCH.map((t) => TOOTH_WIDTH[t[1]]);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
  let cursor = pts[pts.length - 1].l / 2 - total / 2;
  return UPPER_ARCH.map((tooth, i) => {
    const center = cursor + widths[i] / 2;
    cursor += widths[i] + gap;
    let k = pts.findIndex((p) => p.l >= center);
    if (k < 1) k = 1;
    const a = pts[k - 1], b = pts[k];
    const f = (center - a.l) / (b.l - a.l || 1);
    const x = a.x + (b.x - a.x) * f;
    const y = a.y + (b.y - a.y) * f;
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    return { tooth, x: x + 200, y, angle, w: widths[i] };
  });
}

const ARCH = archLayout();
// Recorte justo alrededor de la arcada (con margen para las etiquetas).
const ARCH_BOX = (() => {
  const xs = ARCH.map((t) => t.x), ys = ARCH.map((t) => t.y);
  const minX = Math.min(...xs) - 26, maxX = Math.max(...xs) + 26;
  const minY = Math.min(...ys) - 8, maxY = Math.max(...ys) + 44;
  return `${minX.toFixed(0)} ${minY.toFixed(0)} ${(maxX - minX).toFixed(0)} ${(maxY - minY).toFixed(0)}`;
})();

function DentalArch({ highlight = [], accent, className, labels = true }: { highlight?: string[]; accent: string; className?: string; labels?: boolean }) {
  return (
    <svg viewBox={ARCH_BOX} className={className} role="img" aria-label="Arcada dental superior con nomenclatura FDI">
      {ARCH.map(({ tooth, x, y, angle, w }) => {
        const on = highlight.includes(tooth);
        const h = Number(tooth[1]) >= 4 ? 26 : 30;
        return (
          <g key={tooth} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})`}>
            <rect
              x={-w / 2}
              y={0}
              width={w}
              height={h}
              rx={Number(tooth[1]) >= 4 ? 8 : 9}
              fill={on ? accent : 'var(--esm-surface)'}
              stroke={on ? accent : 'var(--esm-ink)'}
              strokeOpacity={on ? 1 : 0.3}
              strokeWidth={1.3}
            />
            {labels && (
              <text
                y={h + 13}
                textAnchor="middle"
                fontSize="9.5"
                fontFamily="var(--font-esm-sans), ui-sans-serif"
                fill="var(--esm-ink)"
                fillOpacity={on ? 0.85 : 0.38}
                transform={`rotate(${(-angle).toFixed(1)} 0 ${h + 10})`}
              >
                {tooth}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-medium tracking-wide" style={{ color: 'var(--esm-accent)' }}>{children}</p>;
}

// ── Página ────────────────────────────────────────────────────────────

export default function DentalEsmalteLanding({
  negocio,
  services = [],
  staff = [],
  results = [],
  pages = [],
  promotions = [],
  previewOf = null,
}: DentalEsmalteProps) {
  const cfg = parseConfig(negocio?.configuracion);
  const slug: string = negocio?.slug || '';
  const nombre: string = negocio?.nombre || 'Clínica dental';
  const accent = readableAccent(negocio?.colorPrimario);
  const showPrices = negocio?.mostrarPrecios !== false;

  const ubicaciones: any[] = negocio?.ubicaciones || negocio?.Ubicacion || [];
  const sede = ubicaciones.find((u: any) => u.isMain) || ubicaciones[0] || null;
  const direccion = [sede?.direccion || negocio?.direccion, negocio?.ciudad].filter(Boolean).join(', ');
  const mapUrl = sede?.mapUrl && /^https?:\/\//.test(sede.mapUrl)
    ? sede.mapUrl
    : direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}` : null;
  const telefono = sede?.telefono || negocio?.whatsapp || negocio?.telefono || '';
  const whatsapp = waLink(negocio?.whatsapp || telefono, `Hola ${nombre}, quisiera agendar una cita.`);
  const horario = negocio?.horarioApertura && negocio?.horarioCierre ? `${negocio.horarioApertura} – ${negocio.horarioCierre}` : null;

  const heroPhoto: string | null = cfg.bannerUrl || cfg.heroImageUrl || null;
  const titulo: string = negocio?.heroTitulo || 'Una sonrisa sana empieza con una primera cita sin prisas.';
  const subtitulo: string =
    negocio?.heroSubtitulo ||
    negocio?.mensajeBienvenida ||
    `Odontología general y especializada${negocio?.ciudad ? ` en ${negocio.ciudad}` : ''}. Revisamos, te explicamos con claridad y planificamos tu tratamiento pieza por pieza.`;

  const svcList = (services.length ? services : negocio?.services || []).map((s: any) => {
    const extra = parseConfig(s.extraInfo);
    return {
      id: s.id,
      nombre: s.nombre,
      descripcion: extra.descripcion || s.descripcion || '',
      duracion: s.duracion,
      precio: showPrices ? money(s.precio) : null,
      imagen: getServicePrimaryImage(s, 'medium', 'ODONTOLOGIA'),
      doctores: (s.Staff || []).map((st: any) => st.name).filter(Boolean),
    };
  });
  const featured = svcList.slice(0, 8);

  const team = (staff.length ? staff : negocio?.Staff || [])
    .filter((st: any) => st.active !== false)
    .slice(0, 8)
    .map((st: any) => ({ id: st.id, name: st.name, role: st.role, foto: st.imageMedia?.url || st.avatar || null }));

  const cases = (results || [])
    .filter((r: any) => r.published !== false && r.beforeImage && r.afterImage)
    .sort((a: any, b: any) => Number(Boolean(b.showInLanding || b.featured)) - Number(Boolean(a.showInLanding || a.featured)))
    .slice(0, 3);

  const promos = (promotions || []).slice(0, 3);
  const livePages = (pages || []).filter(pageIsLive);
  const topPages = livePages.filter((p: any) => ['top', 'arriba'].includes(String(p.posicion || 'top').toLowerCase()));
  const bottomPages = livePages.filter((p: any) => ['bottom', 'abajo'].includes(String(p.posicion || '').toLowerCase()));

  const bookHref = featured.length ? '#tratamientos' : whatsapp || '#visitanos';

  const nav = [
    featured.length ? { href: '#tratamientos', label: 'Tratamientos' } : null,
    team.length ? { href: '#equipo', label: 'Equipo' } : null,
    cases.length ? { href: '#casos', label: 'Casos' } : null,
    { href: '#visitanos', label: 'Visítanos' },
  ].filter(Boolean) as { href: string; label: string }[];

  const cssVars = {
    ['--esm-bg' as string]: '#F4F2EC',
    ['--esm-surface' as string]: '#FFFFFF',
    ['--esm-ink' as string]: '#0F1F1C',
    ['--esm-muted' as string]: '#56635F',
    ['--esm-line' as string]: 'rgba(15,31,28,0.12)',
    ['--esm-deep' as string]: '#0E2421',
    ['--esm-accent' as string]: accent,
  } as React.CSSProperties;

  const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-medium text-white transition hover:brightness-110 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
  const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-medium ring-1 ring-inset transition hover:bg-black/[0.03] active:scale-[0.98]';

  return (
    <main
      className={`${sans.variable} ${serif.variable} min-h-screen overflow-x-hidden pb-24 md:pb-0 antialiased`}
      style={{ ...cssVars, backgroundColor: 'var(--esm-bg)', color: 'var(--esm-ink)', fontFamily: 'var(--font-esm-sans), ui-sans-serif, system-ui' }}
    >
      <style>{`
        .esm-serif{font-family:var(--font-esm-serif),Georgia,serif;font-weight:400;letter-spacing:-0.01em}
        .esm-h{letter-spacing:-0.035em;line-height:0.98;font-weight:500}
        .esm-num{font-variant-numeric:tabular-nums}
        .esm-rule{border-color:var(--esm-line)}
        .group:hover .esm-go{background:var(--esm-accent);color:#fff;--tw-ring-color:var(--esm-accent)}
        .esm-html h2,.esm-html h3{font-weight:500;letter-spacing:-0.02em;margin:1.2em 0 .4em}
        .esm-html p{margin:.6em 0;color:var(--esm-muted)} .esm-html ul{list-style:disc;padding-left:1.2em;color:var(--esm-muted)}
        @media (prefers-reduced-motion: no-preference){
          .esm-rise{animation:esmRise .8s cubic-bezier(.2,.7,.2,1) both}
          .esm-rise-2{animation-delay:.08s}.esm-rise-3{animation-delay:.16s}
          @keyframes esmRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        }
      `}</style>
      <DynamicFavicon negocio={negocio} defaultTitle={nombre} />

      {previewOf && (
        <div className="sticky top-0 z-[60] px-4 py-2 text-center text-sm" style={{ backgroundColor: 'var(--esm-ink)', color: 'var(--esm-bg)' }}>
          <Eye size={14} className="-mt-0.5 mr-1.5 inline" />
          Vista previa del diseño <strong>Esmalte</strong>. Tus pacientes todavía ven tu diseño actual.
        </div>
      )}

      {/* ── Cabecera ── */}
      <header className="sticky top-0 z-50 border-b esm-rule backdrop-blur-md" style={{ backgroundColor: 'rgba(244,242,236,0.86)' }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
          <Link href={`/${slug}`} className="flex min-w-0 items-center gap-2.5">
            {negocio?.logoUrl ? (
              <img src={negocio.logoUrl} alt={nombre} className="h-9 w-9 rounded-full bg-white object-contain p-0.5 ring-1 ring-black/5" />
            ) : (
              <span className="esm-serif flex h-9 w-9 items-center justify-center rounded-full text-lg text-white" style={{ backgroundColor: 'var(--esm-accent)' }}>
                {nombre.charAt(0)}
              </span>
            )}
            <span className="truncate text-[15px] font-medium tracking-tight">{nombre}</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm md:flex" style={{ color: 'var(--esm-muted)' }}>
            {nav.map((l) => (
              <a key={l.href} href={l.href} className="transition hover:text-[color:var(--esm-ink)]">{l.label}</a>
            ))}
          </nav>
          <a href={bookHref} className="hidden items-center rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-125 md:inline-flex" style={{ backgroundColor: 'var(--esm-ink)', outlineColor: 'var(--esm-accent)' }}>
            Agendar cita
          </a>
        </div>
      </header>

      {/* ── Portada ── */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 md:grid-cols-[1.1fr_0.9fr] md:pb-24 md:pt-20">
        <div>
          {horario && (
            <p className="esm-rise mb-7 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-[13px] ring-1 ring-inset ring-black/5" style={{ color: 'var(--esm-muted)' }}>
              <Clock size={14} style={{ color: 'var(--esm-accent)' }} />
              Atención <span className="esm-num">{horario}</span>
              {negocio?.ciudad && <span>· {negocio.ciudad}</span>}
            </p>
          )}
          <h1 className="esm-h esm-rise esm-rise-2 text-[2.75rem] sm:text-6xl lg:text-[4.4rem]" style={{ textWrap: 'balance' } as React.CSSProperties}>
            {titulo}
          </h1>
          <p className="esm-rise esm-rise-3 mt-6 max-w-xl text-lg leading-relaxed" style={{ color: 'var(--esm-muted)', textWrap: 'pretty' } as React.CSSProperties}>
            {subtitulo}
          </p>
          <div className="esm-rise esm-rise-3 mt-9 flex flex-col gap-3 sm:flex-row">
            <a href={bookHref} className={btnPrimary} style={{ backgroundColor: 'var(--esm-accent)', outlineColor: 'var(--esm-accent)' }}>
              Agendar mi cita <ArrowRight size={18} />
            </a>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={btnGhost} style={{ ['--tw-ring-color' as string]: 'var(--esm-line)' } as React.CSSProperties}>
                <MessageCircle size={18} /> Escribir por WhatsApp
              </a>
            )}
          </div>

          {(svcList.length > 0 || team.length > 0) && (
            <dl className="mt-12 grid max-w-md grid-cols-2 gap-6 border-t esm-rule pt-6">
              {svcList.length > 0 && (
                <div>
                  <dt className="text-[13px]" style={{ color: 'var(--esm-muted)' }}>Tratamientos</dt>
                  <dd className="esm-num mt-1 text-3xl font-medium tracking-tight">{svcList.length}</dd>
                </div>
              )}
              {team.length > 0 && (
                <div>
                  <dt className="text-[13px]" style={{ color: 'var(--esm-muted)' }}>{team.length === 1 ? 'Especialista' : 'Especialistas'}</dt>
                  <dd className="esm-num mt-1 text-3xl font-medium tracking-tight">{team.length}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Visual: foto del consultorio con la ficha dental superpuesta, o la arcada sola */}
        <div className="relative">
          {heroPhoto ? (
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-[28px] bg-white ring-1 ring-black/5">
                <img src={heroPhoto} alt={`Consultorio de ${nombre}`} className="h-full w-full object-cover" />
              </div>
              <div className="absolute -bottom-6 -left-4 w-[78%] rounded-2xl bg-white/95 p-4 shadow-[0_20px_50px_-20px_rgba(15,31,28,0.35)] ring-1 ring-black/5 backdrop-blur sm:-left-8">
                <DentalArch highlight={['16', '21']} accent={accent} className="w-full" />
                <p className="mt-1 text-[13px]" style={{ color: 'var(--esm-muted)' }}>Tu plan de tratamiento, <span className="esm-serif text-[15px] italic" style={{ color: 'var(--esm-ink)' }}>pieza por pieza.</span></p>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] bg-white p-6 ring-1 ring-black/5 sm:p-8">
              <div className="flex items-center justify-between text-[13px]" style={{ color: 'var(--esm-muted)' }}>
                <span>Odontograma</span>
                <span className="esm-num">FDI · 18 — 28</span>
              </div>
              <DentalArch highlight={['16', '21', '26']} accent={accent} className="mt-6 w-full" />
              <div className="mt-6 grid grid-cols-3 gap-3 border-t esm-rule pt-5 text-[13px]">
                {[['Revisión', 'Diagnóstico claro'], ['Plan', 'Pieza por pieza'], ['Presupuesto', 'Antes de empezar']].map(([a, b]) => (
                  <div key={a}>
                    <p className="font-medium">{a}</p>
                    <p style={{ color: 'var(--esm-muted)' }}>{b}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Promociones ── */}
      {promos.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="grid gap-3 md:grid-cols-3">
            {promos.map((pr: any) => {
              const sid = pr.PromotionToService?.[0]?.serviceId || pr.PromotionToService?.[0]?.B || pr.serviceId;
              const href = sid ? `/${slug}/servicio/${sid}?promoId=${pr.id}` : `/${slug}/promo/${pr.id}`;
              const price = pr.precioPromo === 0 ? 'Gratis' : money(pr.precioPromo);
              const before = money(pr.precioAnterior);
              return (
                <Link key={pr.id} href={href} className="group flex items-center justify-between gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/5 transition hover:ring-black/15">
                  <div className="min-w-0">
                    <p className="text-[13px]" style={{ color: 'var(--esm-accent)' }}>Promoción</p>
                    <p className="mt-0.5 truncate font-medium">{pr.titulo}</p>
                    {price && (
                      <p className="esm-num mt-1 text-sm" style={{ color: 'var(--esm-muted)' }}>
                        {before && <span className="mr-1.5 line-through opacity-60">{before}</span>}{price}
                      </p>
                    )}
                  </div>
                  <ArrowUpRight size={20} className="shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Páginas del negocio (arriba) ── */}
      {topPages.map((pg: any) => <CustomPage key={pg.id} page={pg} accent={accent} whatsapp={whatsapp} />)}

      {/* ── Tratamientos ── */}
      {featured.length > 0 && (
        <section id="tratamientos" className="scroll-mt-20 border-t esm-rule">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <Eyebrow>Tratamientos</Eyebrow>
                <h2 className="esm-h mt-3 text-4xl sm:text-5xl">
                  Elige tu tratamiento y <span className="esm-serif italic">reserva en línea.</span>
                </h2>
              </div>
              {svcList.length > featured.length && (
                <Link href={`/${slug}/servicios`} className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--esm-accent)' }}>
                  Ver los {svcList.length} tratamientos <ArrowRight size={16} />
                </Link>
              )}
            </div>

            <ol className="border-t esm-rule">
              {featured.map((s: any, i: number) => (
                <li key={s.id} className="border-b esm-rule">
                  <Link href={`/${slug}/servicio/${s.id}`} className="group grid grid-cols-[2.25rem_1fr_auto] items-center gap-x-4 gap-y-1 py-5 sm:grid-cols-[3rem_4.5rem_1fr_auto_auto] sm:gap-x-6 sm:py-6">
                    <span className="esm-num text-sm" style={{ color: 'var(--esm-muted)' }}>{String(i + 1).padStart(2, '0')}</span>
                    <img src={s.imagen} alt="" loading="lazy" className="hidden h-14 w-[4.5rem] rounded-xl object-cover sm:block" />
                    <div className="min-w-0">
                      <p className="text-lg font-medium tracking-tight transition group-hover:translate-x-0.5 sm:text-xl">{s.nombre}</p>
                      <p className="mt-0.5 truncate text-sm" style={{ color: 'var(--esm-muted)' }}>
                        {[s.duracion ? `${s.duracion} min` : null, s.doctores.length ? s.doctores.slice(0, 2).join(', ') : null, s.descripcion || null].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className="esm-num hidden text-lg font-medium sm:block">{s.precio ? <><span className="text-sm font-normal" style={{ color: 'var(--esm-muted)' }}>desde </span>{s.precio}</> : ''}</span>
                    <span
                      className="esm-go inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-inset transition sm:h-11 sm:w-11"
                      style={{ ['--tw-ring-color' as string]: 'var(--esm-line)' } as React.CSSProperties}
                    >
                      <span className="sr-only">Reservar {s.nombre}</span>
                      <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ── Cómo es tu primera visita ── */}
      <section className="border-t esm-rule bg-white/60">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[0.8fr_1.2fr] md:py-24">
          <div>
            <Eyebrow>Tu primera visita</Eyebrow>
            <h2 className="esm-h mt-3 text-4xl sm:text-5xl">
              Sin sorpresas: <span className="esm-serif italic">sabes qué se hará y cuánto cuesta.</span>
            </h2>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-3xl ring-1 ring-black/5 sm:grid-cols-3" style={{ backgroundColor: 'var(--esm-line)' }}>
            {[
              ['Agenda', 'Elige el tratamiento y la hora que te acomoda. Recibes la confirmación por WhatsApp.'],
              ['Revisión', 'Examinamos cada pieza y registramos todo en tu historia clínica digital.'],
              ['Plan', 'Te explicamos el plan pieza por pieza, con su presupuesto, antes de empezar.'],
            ].map(([t, d], i) => (
              <li key={t} className="bg-white p-6 sm:p-7">
                <span className="esm-num text-sm" style={{ color: 'var(--esm-accent)' }}>0{i + 1}</span>
                <p className="mt-6 text-xl font-medium tracking-tight">{t}</p>
                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: 'var(--esm-muted)' }}>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Equipo ── */}
      {team.length > 0 && (
        <section id="equipo" className="scroll-mt-20 border-t esm-rule">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
            <Eyebrow>Equipo</Eyebrow>
            <h2 className="esm-h mt-3 max-w-2xl text-4xl sm:text-5xl">
              Quién te va a <span className="esm-serif italic">atender.</span>
            </h2>
            <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4">
              {team.map((d: any) => (
                <li key={d.id}>
                  <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                    {d.foto ? (
                      <img src={d.foto} alt={d.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-end p-5" style={{ background: `linear-gradient(160deg, #fff 0%, ${accent}14 100%)` }}>
                        <span className="esm-serif text-6xl" style={{ color: 'var(--esm-accent)' }}>
                          {d.name?.split(/\s+/).filter((w: string) => !/^dr(a)?\.?$/i.test(w)).map((w: string) => w[0]).slice(0, 2).join('')}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 font-medium tracking-tight">{d.name}</p>
                  {d.role && <p className="text-sm" style={{ color: 'var(--esm-muted)' }}>{d.role === 'DENTISTA' ? 'Odontólogo/a' : d.role}</p>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Casos reales (antes y después) ── */}
      {cases.length > 0 && (
        <section id="casos" className="scroll-mt-20 border-t esm-rule">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <Eyebrow>Casos de la clínica</Eyebrow>
                <h2 className="esm-h mt-3 text-4xl sm:text-5xl">Antes y <span className="esm-serif italic">después.</span></h2>
              </div>
              <Link href={`/${slug}/resultados`} className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--esm-accent)' }}>
                Ver todos los casos <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {cases.map((c: any) => (
                <figure key={c.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                  <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: 'var(--esm-line)' }}>
                    {[['Antes', c.beforeImage], ['Después', c.afterImage]].map(([label, src]) => (
                      <div key={label} className="relative aspect-square bg-white">
                        <img src={src} alt={`${c.title}: ${label.toLowerCase()}`} loading="lazy" className="h-full w-full object-cover" />
                        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                  <figcaption className="p-4">
                    <p className="font-medium tracking-tight">{c.title}</p>
                    {c.description && <p className="mt-1 line-clamp-2 text-sm" style={{ color: 'var(--esm-muted)' }}>{c.description}</p>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Páginas del negocio (abajo) ── */}
      {bottomPages.map((pg: any) => <CustomPage key={pg.id} page={pg} accent={accent} whatsapp={whatsapp} />)}

      {/* ── Visítanos + cierre ── */}
      <section id="visitanos" className="scroll-mt-20" style={{ backgroundColor: 'var(--esm-deep)', color: '#EEF2EF' }}>
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <div className="grid gap-12 md:grid-cols-[1.1fr_0.9fr] md:items-end">
            <div>
              <p className="text-[13px] font-medium tracking-wide text-white/60">Visítanos</p>
              <h2 className="esm-h mt-3 text-4xl text-white sm:text-6xl">
                Tu próxima cita, <span className="esm-serif italic text-white/90">a dos minutos de aquí.</span>
              </h2>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href={bookHref} className={btnPrimary} style={{ backgroundColor: '#FFFFFF', color: 'var(--esm-deep)', outlineColor: '#fff' }}>
                  Agendar mi cita <ArrowRight size={18} />
                </a>
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${btnGhost} text-white ring-white/25 hover:bg-white/5`}>
                    <MessageCircle size={18} /> WhatsApp
                  </a>
                )}
              </div>
            </div>

            <dl className="divide-y divide-white/10 border-y border-white/10 text-[15px]">
              {direccion && (
                <div className="flex items-start justify-between gap-4 py-4">
                  <dt className="flex items-center gap-2 text-white/60"><MapPin size={16} /> Dirección</dt>
                  <dd className="text-right">
                    {direccion}
                    {mapUrl && (
                      <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center justify-end gap-1 text-sm text-white/70 underline-offset-4 hover:underline">
                        Abrir en el mapa <ArrowUpRight size={14} />
                      </a>
                    )}
                  </dd>
                </div>
              )}
              {horario && (
                <div className="flex items-center justify-between gap-4 py-4">
                  <dt className="flex items-center gap-2 text-white/60"><Clock size={16} /> Horario</dt>
                  <dd className="esm-num">{sede?.horario || horario}</dd>
                </div>
              )}
              {telefono && (
                <div className="flex items-center justify-between gap-4 py-4">
                  <dt className="flex items-center gap-2 text-white/60"><Phone size={16} /> Teléfono</dt>
                  <dd><a href={`tel:${String(telefono).replace(/[^\d+]/g, '')}`} className="esm-num hover:underline">{telefono}</a></dd>
                </div>
              )}
              {ubicaciones.length > 1 && (
                <div className="py-4">
                  <dt className="mb-2 text-white/60">Otras sedes</dt>
                  <dd className="space-y-1 text-white/85">
                    {ubicaciones.filter((u: any) => u !== sede).map((u: any) => (
                      <p key={u.id}>{u.nombre}{u.direccion ? ` · ${u.direccion}` : ''}</p>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="mt-16 opacity-25" aria-hidden>
            <DentalArch accent="#FFFFFF" className="mx-auto w-full max-w-xl [--esm-ink:#ffffff] [--esm-surface:transparent]" labels={false} />
          </div>
        </div>

        <footer className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {nombre}</p>
            <div className="flex items-center gap-5">
              <Link href={`/${slug}/servicios`} className="hover:text-white">Tratamientos</Link>
              <Link href={`/${slug}/promociones`} className="hover:text-white">Promociones</Link>
              {negocio?.instagramUrl && <a href={negocio.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-white"><Instagram size={18} /></a>}
              {negocio?.facebookUrl && <a href={negocio.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-white"><Facebook size={18} /></a>}
            </div>
          </div>
        </footer>
      </section>

      {/* ── Barra fija en celular ── */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t esm-rule p-3 backdrop-blur-md md:hidden" style={{ backgroundColor: 'rgba(244,242,236,0.92)' }}>
        <div className="flex gap-2">
          <a href={bookHref} className={`${btnPrimary} flex-1`} style={{ backgroundColor: 'var(--esm-accent)' }}>
            Agendar cita
          </a>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-full bg-white ring-1 ring-black/10">
              <MessageCircle size={20} />
            </a>
          )}
        </div>
      </div>
    </main>
  );
}

function CustomPage({ page, accent, whatsapp }: { page: any; accent: string; whatsapp: string | null }) {
  const img = page.imageMedia?.url || page.featuredImage;
  return (
    <section id={page.slug} className="scroll-mt-20 border-t esm-rule">
      <div className={`mx-auto grid max-w-6xl gap-10 px-5 py-16 md:py-20 ${img ? 'md:grid-cols-2 md:items-center' : ''}`}>
        <div>
          <h2 className="esm-h text-3xl sm:text-4xl">{page.title}</h2>
          {page.contentHtml && <div className="esm-html mt-4 text-[17px] leading-relaxed" dangerouslySetInnerHTML={{ __html: cleanHtml(page.contentHtml) }} />}
          {page.buttonText && (
            <a
              href={page.buttonUrl || whatsapp || '#tratamientos'}
              className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-medium text-white"
              style={{ backgroundColor: accent }}
            >
              {page.buttonText} <ArrowRight size={18} />
            </a>
          )}
        </div>
        {img && (
          <div className="aspect-[4/3] overflow-hidden rounded-[24px] ring-1 ring-black/5">
            <img src={img} alt={page.title} loading="lazy" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
