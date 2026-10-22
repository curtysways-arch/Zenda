'use client';
/**
 * Página pública de canchas: reservar en 3 toques.
 *   1. Día  ·  2. Duración  ·  3. Hora libre de la cancha  →  nombre y WhatsApp  →  listo.
 * Las horas libres y el precio vienen del servidor (/api/public/{slug}/canchas) y se calculan
 * con la misma lógica que valida la reserva, así lo que ve el cliente es lo que se cobra.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Calendar, Clock, MapPin, Users, ChevronRight, X, Check, MessageCircle, Trophy,
  Coffee, Car, Wifi, Shirt, ShoppingBag, GraduationCap, Loader2, Sun, Moon, Zap,
} from 'lucide-react';
import { buildSlots, slotPrice, toMin, type Busy } from '@/lib/courts/slots';

export interface CanchaPublicLandingProps {
  negocio: any;
  canchas: any[];
  torneos?: any[];
  sedes?: any[];
  paginasPersonalizadas?: any[];
  cursos?: any[];
  hasCoursesModule?: boolean;
}

type Court = {
  id: string;
  nombre: string;
  tipo: string | null;
  capacidad: number | null;
  features: string[];
  precioHora: number;
  duracionMin: number;
  imagen: string | null;
  promos: any[];
  auto: any;
  ocupado: Busy[];
};

const money = (n: number) => `$${(Number(n) || 0).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`;
const pad = (n: number) => String(n).padStart(2, '0');
const localDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function waLink(phone?: string | null, text?: string) {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, '');
  if (d.startsWith('0')) d = '593' + d.slice(1);
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export default function CanchaPublicLanding({
  negocio,
  canchas = [],
  torneos = [],
  paginasPersonalizadas = [],
  cursos = [],
  hasCoursesModule = false,
}: CanchaPublicLandingProps) {
  const brand: string = negocio?.colorPrimario || '#16a34a';
  const slug: string = negocio?.slug;
  const nombre: string = negocio?.nombre || 'Canchas';
  const ap = String(negocio?.horarioApertura || '08:00').slice(0, 5);
  const ci = String(negocio?.horarioCierre || '22:00').slice(0, 5);

  // Días para elegir: hoy + 13
  const days = useMemo(() => {
    const out: { str: string; top: string; num: number }[] = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const wd = d.toLocaleDateString('es-EC', { weekday: 'short' }).replace('.', '');
      out.push({ str: localDateStr(d), top: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : wd.charAt(0).toUpperCase() + wd.slice(1), num: d.getDate() });
    }
    return out;
  }, []);

  const [fecha, setFecha] = useState(days[0].str);
  const [horas, setHoras] = useState(1);
  const [data, setData] = useState<{ apertura: string; cierre: string; canchas: Court[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>('TODAS');
  const [elegido, setElegido] = useState<{ court: Court; time: string; end: string; total: number; base: number; label: string } | null>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const reservarRef = useRef<HTMLDivElement>(null);
  // Lo que depende de la hora del dispositivo se muestra después de montar (evita diferencias con el servidor)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const load = async (f: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/public/${slug}/canchas?fecha=${f}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'No se pudo cargar');
      setData(d);
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar la disponibilidad');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(fecha); }, [fecha]); // eslint-disable-line react-hooks/exhaustive-deps

  // Imágenes reales del negocio (sin fotos genéricas)
  const heroImages: string[] = useMemo(() => {
    const out: string[] = [];
    (Array.isArray(negocio?.imagenes) ? negocio.imagenes : []).forEach((img: any) => {
      const u = typeof img === 'string' ? img : img?.url;
      if (u && !out.includes(u)) out.push(u);
    });
    if (negocio?.bannerUrl && !out.includes(negocio.bannerUrl)) out.push(negocio.bannerUrl);
    return out;
  }, [negocio]);
  useEffect(() => {
    if (heroImages.length < 2) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, [heroImages.length]);

  const isToday = fecha === days[0].str;
  const nowMin = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : null;

  const tipos = useMemo(() => {
    const set = new Set<string>();
    (data?.canchas || []).forEach((c) => c.tipo && set.add(c.tipo));
    return Array.from(set);
  }, [data]);

  const courts = (data?.canchas || []).filter((c) => filtro === 'TODAS' || c.tipo === filtro);

  const slotsFor = (c: Court) => {
    const dur = Math.round(horas * 60);
    const step = Number.isInteger(horas) && c.duracionMin % 60 === 0 ? 60 : 30;
    return buildSlots({ open: data?.apertura || ap, close: data?.cierre || ci, durationMin: dur, stepMin: step, busy: c.ocupado, nowMin })
      .filter((s) => s.available)
      .map((s) => ({ ...s, ...slotPrice({ dateStr: fecha, time: s.time, pricePerHour: c.precioHora, hours: horas, promos: c.promos, auto: c.auto }) }));
  };

  const openNow = (() => {
    const a = toMin(ap), c = toMin(ci);
    if (isNaN(a) || isNaN(c)) return null;
    const n = new Date().getHours() * 60 + new Date().getMinutes();
    return c > a ? n >= a && n < c : n >= a || n < c;
  })();

  const amenities = [
    negocio?.tieneVestidores && { Icon: Shirt, label: 'Vestidores' },
    negocio?.tieneParking && { Icon: Car, label: 'Parqueadero' },
    negocio?.tieneCafeteria && { Icon: Coffee, label: 'Cafetería' },
    negocio?.tieneWifi && { Icon: Wifi, label: 'WiFi' },
    negocio?.tieneTienda && { Icon: ShoppingBag, label: 'Tienda' },
  ].filter(Boolean) as { Icon: any; label: string }[];

  const wa = waLink(negocio?.whatsapp, `Hola ${nombre}, quiero información para reservar una cancha.`);
  const mapsUrl = negocio?.direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nombre} ${negocio.direccion} ${negocio?.ciudad || ''}`)}`
    : null;
  const preciosDesde = (data?.canchas || canchas).map((c: any) => Number(c.precioHora ?? c.precio ?? 0)).filter((n: number) => n > 0);
  const desde = preciosDesde.length ? Math.min(...preciosDesde) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 md:pb-10 md:pt-[88px]">
      {(negocio?.isDemo === true) && (
        <div className="bg-amber-400 text-slate-900 text-sm px-4 py-2 text-center">
          Estás viendo una demo. <Link href="/register" className="font-semibold underline">Crea tu negocio gratis</Link>
        </div>
      )}

      {/* Encabezado */}
      {/* Solo en celular: en computadora ya está la barra superior de la plataforma */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          {negocio?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={negocio.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200" />
          ) : (
            <span style={{ backgroundColor: brand }} className="w-10 h-10 rounded-xl text-white flex items-center justify-center"><Trophy className="w-5 h-5" /></span>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight truncate">{nombre}</p>
            {mounted && openNow !== null && (
              <p className={`text-xs font-medium ${openNow ? 'text-emerald-600' : 'text-slate-500'}`}>
                {openNow ? `Abierto · hasta ${ci}` : `Cerrado · abre ${ap}`}
              </p>
            )}
          </div>
          <Link href={`/${slug}/mis-reservas`} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">
            <Calendar className="w-4 h-4" /> Mis reservas
          </Link>
          <button
            onClick={() => reservarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            style={{ backgroundColor: brand }}
            className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
          >
            Reservar
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4">
        {/* Portada */}
        <section className="pt-4">
          <div className="relative rounded-3xl overflow-hidden text-white min-h-[220px] md:min-h-[300px] flex items-end" style={{ backgroundColor: brand }}>
            {heroImages.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === heroIdx ? 'opacity-100' : 'opacity-0'}`} />
            ))}
            <div className={`absolute inset-0 ${heroImages.length ? 'bg-gradient-to-t from-black/75 via-black/30 to-transparent' : 'bg-gradient-to-br from-black/10 to-black/40'}`} />
            <div className="relative p-5 md:p-8 w-full">
              <h1 className="text-2xl md:text-4xl font-bold leading-tight max-w-xl">{negocio?.heroTitulo || 'Reserva tu cancha en segundos'}</h1>
              <p className="text-white/85 mt-1 max-w-lg text-sm md:text-base">
                {negocio?.heroSubtitulo || 'Mira las horas libres, elige y listo. Te confirmamos por WhatsApp.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                {desde !== null && <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur">Desde {money(desde)}/hora</span>}
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {ap} – {ci}{mounted && openNow !== null && <><span className={`w-1.5 h-1.5 rounded-full ${openNow ? 'bg-emerald-400' : 'bg-slate-300'}`} />{openNow ? 'Abierto ahora' : 'Cerrado ahora'}</>}</span>
                {negocio?.direccion && <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur flex items-center gap-1 max-w-full truncate"><MapPin className="w-3.5 h-3.5 shrink-0" /> {negocio.direccion}</span>}
              </div>
            </div>
          </div>
        </section>

        {/* Reservar */}
        <section ref={reservarRef} id="reservar" className="mt-6 scroll-mt-20 md:scroll-mt-28 space-y-4">
          <h2 className="text-xl font-bold">Reserva tu cancha</h2>

          {/* 1. Día */}
          <div>
            <p className="text-sm text-slate-500 mb-2">1. Elige el día</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-h-[60px]">
              {mounted && days.map((d) => {
                const on = d.str === fecha;
                return (
                  <button
                    key={d.str}
                    onClick={() => setFecha(d.str)}
                    style={on ? { backgroundColor: brand, borderColor: brand } : undefined}
                    className={`shrink-0 w-16 py-2 rounded-2xl border text-center transition ${on ? 'text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    <span className="block text-xs">{d.top}</span>
                    <span className="block text-lg font-bold leading-tight">{d.num}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Duración */}
          <div>
            <p className="text-sm text-slate-500 mb-2">2. ¿Cuánto tiempo?</p>
            <div className="flex gap-2">
              {[1, 1.5, 2].map((h) => {
                const on = h === horas;
                return (
                  <button
                    key={h}
                    onClick={() => setHoras(h)}
                    style={on ? { backgroundColor: brand, borderColor: brand } : undefined}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold ${on ? 'text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    {h === 1 ? '1 hora' : h === 1.5 ? '1 h 30 min' : '2 horas'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Cancha y hora */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm text-slate-500">3. Toca una hora libre</p>
              {tipos.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto">
                  {['TODAS', ...tipos].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFiltro(t)}
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${filtro === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                      {t === 'TODAS' ? 'Todas' : t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loading && !data ? (
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-10 flex items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Buscando horas libres…
              </div>
            ) : error ? (
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-6 text-center">
                <p className="text-sm text-slate-600">{error}</p>
                <button onClick={() => load(fecha)} className="mt-2 text-sm font-semibold" style={{ color: brand }}>Reintentar</button>
              </div>
            ) : courts.length === 0 ? (
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-8 text-center text-sm text-slate-600">Pronto publicaremos nuestras canchas.</div>
            ) : (
              <div className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
                {courts.map((c) => {
                  const slots = slotsFor(c);
                  const manana = slots.filter((s) => toMin(s.time) < 12 * 60);
                  const tarde = slots.filter((s) => toMin(s.time) >= 12 * 60 && toMin(s.time) < 18 * 60);
                  const noche = slots.filter((s) => toMin(s.time) >= 18 * 60);
                  return (
                    <article key={c.id} className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
                      <div className="p-3.5 flex gap-3">
                        {c.imagen ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.imagen} alt="" className="w-20 h-20 rounded-xl object-cover bg-slate-100 shrink-0" />
                        ) : (
                          <span style={{ backgroundColor: `${brand}14`, color: brand }} className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0"><Trophy className="w-7 h-7" /></span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold leading-snug">{c.nombre}</h3>
                            <span className="font-bold whitespace-nowrap">{money(c.precioHora)}<span className="text-xs font-normal text-slate-500">/h</span></span>
                          </div>
                          <p className="text-sm text-slate-500 flex flex-wrap gap-x-3">
                            {c.tipo && <span>{c.tipo}</span>}
                            {c.capacidad ? <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {c.capacidad} jugadores</span> : null}
                          </p>
                          {c.features.length > 0 && <p className="text-xs text-slate-500 mt-0.5 truncate">{c.features.join(' · ')}</p>}
                          <p className={`text-xs mt-1 font-medium ${slots.length ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {slots.length ? `${slots.length} ${slots.length === 1 ? 'hora libre' : 'horas libres'}` : 'Sin horas libres este día'}
                          </p>
                        </div>
                      </div>
                      {slots.length > 0 && (
                        <div className="px-3.5 pb-3.5 space-y-2">
                          {[
                            { label: 'Mañana', Icon: Sun, list: manana },
                            { label: 'Tarde', Icon: Sun, list: tarde },
                            { label: 'Noche', Icon: Moon, list: noche },
                          ].filter((g) => g.list.length).map((g) => (
                            <div key={g.label} className="flex items-start gap-2">
                              <span className="w-14 shrink-0 text-xs text-slate-400 pt-2 flex items-center gap-1"><g.Icon className="w-3 h-3" />{g.label}</span>
                              <div className="flex flex-wrap gap-1.5">
                                {g.list.map((s) => (
                                  <button
                                    key={s.time}
                                    onClick={() => setElegido({ court: c, time: s.time, end: s.end, total: s.total, base: s.base, label: s.label })}
                                    className="relative px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold hover:border-slate-400 active:scale-95 transition"
                                  >
                                    {s.time}
                                    {s.percent > 0 && (
                                      <span className="absolute -top-2 -right-2 px-1 rounded text-[10px] font-bold text-white bg-rose-500">{s.label}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Comodidades reales */}
        {amenities.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold mb-3">Comodidades</h2>
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => (
                <span key={a.label} className="px-3 py-2 rounded-xl bg-white ring-1 ring-slate-200 text-sm flex items-center gap-2">
                  <a.Icon className="w-4 h-4" style={{ color: brand }} /> {a.label}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Academia */}
        {hasCoursesModule && cursos.length > 0 && (
          <section className="mt-10" id="academia">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2"><GraduationCap className="w-5 h-5" style={{ color: brand }} /> Academia</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cursos.map((c: any) => {
                const days: Record<number, string> = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };
                const cupos = Math.max(0, (c.capacity || 20) - (c._count?.enrollments || 0));
                return (
                  <Link key={c.id} href={`/${slug}/cursos/${c.id}`} className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 hover:ring-slate-300 transition flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{c.name}</h3>
                      <span className="font-bold whitespace-nowrap">{c.price ? money(c.price) : 'Gratis'}</span>
                    </div>
                    {c.description && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{c.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(c.schedules || []).slice(0, 4).map((s: any, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-600">{days[s.day_of_week] || ''} {s.start_time}</span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-auto pt-2">
                      {c.min_age || c.max_age ? `${c.min_age || ''}${c.min_age && c.max_age ? '–' : ''}${c.max_age || ''} años · ` : ''}
                      {cupos > 0 ? `${cupos} cupos` : 'Sin cupos'}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Torneos */}
        {torneos.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2"><Zap className="w-5 h-5" style={{ color: brand }} /> Torneos</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {torneos.map((t: any) => (
                <Link key={t.id} href={`/${slug}/torneos/${t.id}`} className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 flex items-center justify-between gap-3">
                  <span>
                    <span className="block font-semibold">{t.nombre}</span>
                    {t.fecha && <span className="block text-sm text-slate-500">{new Date(t.fecha).toLocaleDateString('es-EC', { day: 'numeric', month: 'long' })}</span>}
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Páginas del negocio */}
        {paginasPersonalizadas.length > 0 && (
          <section className="mt-10 grid md:grid-cols-2 gap-3">
            {paginasPersonalizadas.map((p: any) => (
              <div key={p.id} className="bg-white rounded-2xl ring-1 ring-slate-200 p-5 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: p.contentHtml || '' }} />
            ))}
          </section>
        )}

        {/* Ubicación y contacto */}
        <section className="mt-10 mb-6 grid sm:grid-cols-2 gap-3">
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 flex items-center gap-3 hover:ring-slate-300">
              <span style={{ backgroundColor: `${brand}14`, color: brand }} className="w-11 h-11 rounded-xl flex items-center justify-center"><MapPin className="w-5 h-5" /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">Cómo llegar</span>
                <span className="block text-sm text-slate-500 truncate">{negocio.direccion}{negocio?.ciudad ? `, ${negocio.ciudad}` : ''}</span>
              </span>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 flex items-center gap-3 hover:ring-slate-300">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600"><MessageCircle className="w-5 h-5" /></span>
              <span className="flex-1">
                <span className="block font-semibold">Escríbenos</span>
                <span className="block text-sm text-slate-500">Torneos, eventos o grupos grandes</span>
              </span>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </a>
          )}
        </section>
      </main>

      {elegido && (
        <BookingSheet
          slug={slug}
          brand={brand}
          negocioWhatsapp={negocio?.whatsapp}
          fecha={fecha}
          horas={horas}
          sel={elegido}
          onClose={() => setElegido(null)}
          onBooked={() => load(fecha)}
        />
      )}
    </div>
  );
}

/* ── Confirmar reserva ───────────────────────────────────────────────────── */

function BookingSheet({ slug, brand, negocioWhatsapp, fecha, horas, sel, onClose, onBooked }: {
  slug: string; brand: string; negocioWhatsapp?: string | null; fecha: string; horas: number;
  sel: { court: Court; time: string; end: string; total: number; base: number; label: string };
  onClose: () => void; onBooked: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; estado: string; expiresAt?: string | null; sesion?: boolean } | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('customerInfo') || 'null');
      if (saved?.nombre) setNombre(saved.nombre);
      if (saved?.telefono) setTelefono(saved.telefono);
    } catch {}
  }, []);

  const fechaLarga = (() => {
    const [y, m, d] = fecha.split('-').map(Number);
    const s = new Date(y, m - 1, d).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  const submit = async () => {
    setErr(null);
    if (nombre.trim().length < 2) return setErr('Escribe tu nombre.');
    if (telefono.replace(/\D/g, '').length < 9) return setErr('Escribe tu número de WhatsApp.');
    setSending(true);
    try {
      const r = await fetch(`/api/public/${slug}/reservar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNombre: nombre.trim(),
          clienteTelefono: telefono.trim(),
          comentarios: notas.trim(),
          fecha,
          horaInicio: sel.time,
          duracion: horas,
          serviceId: sel.court.id,
          precioTotal: sel.total,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) {
        setErr(d.error || 'No se pudo reservar. Intenta de nuevo.');
        if (r.status === 409) onBooked();
        return;
      }
      try { localStorage.setItem('customerInfo', JSON.stringify({ nombre: nombre.trim(), telefono: telefono.trim() })); } catch {}
      setDone({ id: d.id, estado: d.estado, expiresAt: d.expiresAt, sesion: d.sesion !== false });
      onBooked();
    } finally {
      setSending(false);
    }
  };

  const pending = done && ['pending', 'PENDIENTE', 'pendiente'].includes(done.estado);
  const minsToConfirm = done?.expiresAt ? Math.max(1, Math.round((new Date(done.expiresAt).getTime() - Date.now()) / 60000)) : null;
  const wa = negocioWhatsapp ? (() => {
    let dgt = String(negocioWhatsapp).replace(/\D/g, '');
    if (dgt.startsWith('0')) dgt = '593' + dgt.slice(1);
    return `https://wa.me/${dgt}?text=${encodeURIComponent(`Hola, hice una reserva: ${sel.court.nombre}, ${fechaLarga} de ${sel.time} a ${sel.end}.`)}`;
  })() : null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 pb-8 space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {!done ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{sel.court.nombre}</h3>
                <p className="text-sm text-slate-600">{fechaLarga}</p>
                <p className="text-sm text-slate-600">{sel.time} a {sel.end}</p>
              </div>
              <button onClick={onClose} className="p-1 text-slate-400" aria-label="Cerrar"><X className="w-5 h-5" /></button>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">Total</span>
              <span className="text-right">
                {sel.base > sel.total && <span className="block text-xs text-slate-400 line-through">{money(sel.base)}</span>}
                <span className="text-xl font-bold">{money(sel.total)}</span>
              </span>
            </div>
            <label className="block">
              <span className="text-sm text-slate-600">Tu nombre</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" className="mt-1 w-full px-3 py-2.5 rounded-xl ring-1 ring-slate-200 outline-none focus:ring-2" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">WhatsApp</span>
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="0991234567" className="mt-1 w-full px-3 py-2.5 rounded-xl ring-1 ring-slate-200 outline-none focus:ring-2" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">Nota (opcional)</span>
              <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej.: traemos balón" className="mt-1 w-full px-3 py-2.5 rounded-xl ring-1 ring-slate-200 outline-none focus:ring-2" />
            </label>
            {err && <p className="text-sm text-rose-600">{err}</p>}
            <button disabled={sending} onClick={submit} style={{ backgroundColor: brand }} className="w-full py-3.5 rounded-2xl text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Reservar
            </button>
            <p className="text-xs text-slate-500 text-center">Pagas en la cancha. Te avisamos por WhatsApp.</p>
          </>
        ) : (
          <div className="text-center space-y-3 py-2">
            <span style={{ backgroundColor: `${brand}14`, color: brand }} className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"><Check className="w-7 h-7" /></span>
            <h3 className="text-xl font-bold">{pending ? '¡Solicitud enviada!' : '¡Reserva confirmada!'}</h3>
            <p className="text-sm text-slate-600">
              {sel.court.nombre} · {fechaLarga} · {sel.time} a {sel.end}
            </p>
            {pending && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                El local la confirmará{minsToConfirm ? ` en los próximos ${minsToConfirm} min` : ' pronto'}. Te avisamos por WhatsApp.
              </p>
            )}
            {done.sesion === false && (
              <p className="text-xs text-slate-500">Te enviamos por WhatsApp un enlace para ver y gestionar tus reservas.</p>
            )}
            <div className="flex flex-col gap-2 pt-1">
              <Link href={`/${slug}/confirmacion/${done.id}`} style={{ backgroundColor: brand }} className="w-full py-3 rounded-2xl text-white font-semibold">Ver mi reserva</Link>
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="w-full py-3 rounded-2xl ring-1 ring-slate-200 font-medium">Escribir al local</a>}
              <button onClick={onClose} className="text-sm text-slate-500 py-1">Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
