'use client';
/**
 * Página pública de lavanderías y cuidado de calzado.
 *
 * Cómo funciona el servicio a domicilio (lo que ve el cliente):
 *  1. Pide el retiro y elige el servicio.   2. El local confirma.
 *  3. Un repartidor retira; el cliente ingresa el código del repartidor al entregarle sus artículos.
 *  4. El local las procesa.                  5. Otro viaje las devuelve con el código de entrega.
 * El envío son dos viajes (retiro + entrega): se cobra 2 × tarifa y cada repartidor recibe una.
 * El cliente le paga al local; el repartidor no cobra.
 */
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Truck, Store, MapPin, Clock, KeyRound, Sparkles, CheckCircle2, MessageCircle,
  ChevronDown, ChevronRight, Shirt, Footprints, Package, Wallet, ShoppingBag, Star,
} from 'lucide-react';
import DynamicFavicon from '@/components/DynamicFavicon';
import PublicMobileNav from '@/components/public/PublicMobileNav';
import UniversalServiceRequestModal from '@/components/public/UniversalServiceRequestModal';
import { tipoArticuloOf, laundryWords } from '@/lib/laundry/wording';

const CoverageMapPublic = dynamic(() => import('@/components/public/CoverageMapPublic'), { ssr: false });

interface Props {
  negocio: any;
  reviews?: any[];
  hasStore?: boolean;
}

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

function parseConfig(raw: any) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

function waLink(phone?: string | null, text?: string) {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, '');
  if (d.startsWith('0')) d = '593' + d.slice(1);
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export default function LaundryLanding({ negocio, reviews = [], hasStore = false }: Props) {
  const cfg = parseConfig(negocio?.configuracion);
  const brand: string = negocio?.colorPrimario || '#0e7490';
  const tipoArticulo = tipoArticuloOf(negocio);
  const w = laundryWords(tipoArticulo);
  const isShoes = tipoArticulo === 'ZAPATOS';
  const nombre: string = negocio?.nombre || 'Lavandería';

  const [requestOpen, setRequestOpen] = useState(false);
  const [initialService, setInitialService] = useState<{ id?: string; nombre?: string } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [slide, setSlide] = useState(0);

  // Tarifas de envío: una por viaje; a domicilio son 2 viajes
  const tarifaViaje = Number(cfg.costoEnvio ?? 1.5) || 0;
  const porKm = Number(cfg.costoEnvioPorKm ?? 0.3) || 0;

  const services: any[] = (Array.isArray(negocio?.services) ? negocio.services : []).filter((s: any) => s.estaActivo !== false);

  const banners: string[] = useMemo(() => {
    const out: string[] = [];
    const push = (u?: string | null) => { if (u && !out.includes(u)) out.push(u); };
    (Array.isArray(negocio?.imagenesPortada) ? negocio.imagenesPortada : []).forEach(push);
    push(negocio?.portadaUrl);
    push(cfg?.bannerUrl);
    return out;
  }, [negocio, cfg?.bannerUrl]);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setSlide((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const ap = String(negocio?.horarioApertura || '').slice(0, 5);
  const ci = String(negocio?.horarioCierre || '').slice(0, 5);
  const openNow = useMemo(() => {
    const toMin = (t: string) => {
      const m = t.match(/^(\d{1,2}):(\d{2})/);
      return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    };
    const a = toMin(ap), c = toMin(ci);
    if (a === null || c === null) return null;
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    return c > a ? cur >= a && cur < c : cur >= a || cur < c;
  }, [ap, ci]);

  const openRequest = (srv?: any) => {
    setInitialService(srv ? { id: srv.id, nombre: srv.nombre } : null);
    setRequestOpen(true);
  };

  const whatsapp = waLink(negocio?.whatsapp || negocio?.telefono, `Hola ${nombre}, quiero información de sus servicios.`);
  const mapsUrl = negocio?.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${negocio.direccion} ${negocio?.ciudad || ''}`)}` : null;

  const steps = [
    { Icon: Sparkles, title: 'Pide tu retiro', text: 'Elige el servicio, tu dirección y el horario. Ves un precio estimado.' },
    { Icon: KeyRound, title: 'Retiramos con código', text: `El repartidor te muestra un código; lo ingresas en tu teléfono al entregarle ${w.tusCosas}.` },
    { Icon: CheckCircle2, title: 'Confirmamos el precio', text: `Revisamos ${w.tusCosas}. Si el precio sube, te pedimos aprobación antes de empezar.` },
    { Icon: isShoes ? Footprints : Shirt, title: 'Lavamos', text: 'Sigue cada etapa desde tu celular.' },
    { Icon: Truck, title: 'Te lo devolvemos', text: 'Recibes con tu código de entrega y pagas al local.' },
  ];

  const faqs = [
    {
      q: '¿Cuánto cuesta el envío?',
      a: `Son dos viajes: uno para retirar ${w.tusCosas} y otro para devolvértelos. Cada viaje cuesta desde ${money(tarifaViaje)}${porKm ? ` (+${money(porKm)} por km)` : ''}, así que el envío total es desde ${money(tarifaViaje * 2)}. Lo ves exacto antes de confirmar.`,
    },
    {
      q: '¿A quién le pago?',
      a: 'Le pagas directamente al local (efectivo, transferencia u otro medio que acepte). El repartidor no cobra nada.',
    },
    {
      q: '¿Cuánto pagaré por el servicio?',
      a: `Al pedir ves un precio estimado. Cuando ${w.tusCosas} llegan al local, los revisamos y confirmamos el precio final según su estado (por ejemplo, si están muy sucios o necesitan reparación). Si sube, te pedimos tu aprobación antes de empezar; si no la apruebas, te devolvemos ${w.tusCosas} y solo pagas el envío.`,
    },
    {
      q: '¿Para qué son los códigos?',
      a: `Para que ${w.tusCosas} solo pasen a manos correctas. Al retirar, el repartidor te muestra su código y tú lo ingresas en tu teléfono. Al devolvértelos, tú le das tu código de entrega. Sin el código no se registra el viaje.`,
    },
    {
      q: '¿Cuánto tarda?',
      a: 'Depende del servicio; el tiempo estimado aparece en cada uno. Te avisamos por WhatsApp cuando tu orden esté lista.',
    },
    {
      q: '¿Puedo llevarlas yo al local?',
      a: `Claro.${negocio?.direccion ? ` Estamos en ${negocio.direccion}.` : ''}${ap && ci ? ` Atendemos de ${ap} a ${ci}.` : ''}`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-0">
      <DynamicFavicon negocio={negocio} defaultTitle={nombre} />

      {/* Encabezado */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          {negocio?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={negocio.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200" />
          ) : (
            <span style={{ backgroundColor: brand }} className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold">
              {nombre.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight truncate">{nombre}</p>
            {openNow !== null && (
              <p className={`text-xs font-medium ${openNow ? 'text-emerald-600' : 'text-slate-500'}`}>
                {openNow ? `Abierto · hasta ${ci}` : `Cerrado · abre ${ap}`}
              </p>
            )}
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm text-slate-600">
            <a href="#servicios" className="hover:text-slate-900">Servicios</a>
            <a href="#como-funciona" className="hover:text-slate-900">Cómo funciona</a>
            <a href={`/${negocio?.slug}/pedidos`} className="hover:text-slate-900">Mis órdenes</a>
            {hasStore && <a href={`/${negocio?.slug}?view=tienda`} className="hover:text-slate-900">Tienda</a>}
          </nav>
          <button
            type="button"
            onClick={() => openRequest()}
            style={{ backgroundColor: brand }}
            className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm active:scale-95 transition"
          >
            Pedir retiro
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4">
        {/* Portada */}
        <section className="pt-5 md:pt-8 grid md:grid-cols-2 gap-6 items-center">
          <div className="order-2 md:order-1 space-y-4">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
              {w.heroTitle}
            </h1>
            <p className="text-slate-600 md:text-lg">
              {negocio?.descripcion || w.heroSub}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => openRequest()}
                style={{ backgroundColor: brand }}
                className="px-5 py-3.5 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition"
              >
                <Truck className="w-5 h-5" /> Pedir retiro a domicilio
              </button>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="px-5 py-3.5 rounded-2xl bg-white ring-1 ring-slate-200 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50">
                  <Store className="w-5 h-5 text-slate-500" /> Llevar al local
                </a>
              )}
            </div>
          </div>
          <div className={`order-1 md:order-2 relative aspect-[4/3] rounded-3xl overflow-hidden ${banners.length ? '' : 'hidden md:block'}`} style={{ backgroundColor: `${brand}14` }}>
            {banners.length > 0 ? (
              banners.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === slide ? 'opacity-100' : 'opacity-0'}`} />
              ))
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {isShoes ? <Footprints style={{ color: brand }} className="w-24 h-24 opacity-60" /> : <Shirt style={{ color: brand }} className="w-24 h-24 opacity-60" />}
              </div>
            )}
          </div>
        </section>

        {/* Envío ida y vuelta */}
        <section className="mt-6 grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 bg-white rounded-2xl ring-1 ring-slate-200 p-4 flex gap-4 items-center">
            <span style={{ backgroundColor: `${brand}14`, color: brand }} className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Envío a domicilio: 2 viajes</p>
              <p className="text-sm text-slate-600">
                Retiro {money(tarifaViaje)} + entrega {money(tarifaViaje)} ={' '}
                <b className="text-slate-900">desde {money(tarifaViaje * 2)}</b>
                {porKm ? <span className="text-slate-500"> · +{money(porKm)}/km por viaje según tu distancia</span> : null}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 flex gap-3 items-center">
            <span className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6" />
            </span>
            <div>
              <p className="font-semibold">Pagas al local</p>
              <p className="text-sm text-slate-600">El repartidor no cobra.</p>
            </div>
          </div>
        </section>

        {/* Servicios */}
        <section id="servicios" className="mt-10 scroll-mt-20">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-bold">Servicios</h2>
              <p className="text-sm text-slate-500">Precios estimados: el local confirma el precio final al revisar {w.tusCosas}.</p>
            </div>
            {hasStore && (
              <a href={`/${negocio?.slug}?view=tienda`} style={{ color: brand }} className="text-sm font-semibold flex items-center gap-1 shrink-0">
                <ShoppingBag className="w-4 h-4" /> Tienda
              </a>
            )}
          </div>
          {services.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-8 text-center">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold mt-2">Pronto publicaremos nuestros servicios</p>
              <p className="text-sm text-slate-500">Puedes pedir tu retiro igual y te cotizamos al revisar {w.tusCosas}.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {services.map((s: any) => {
                const img = s.imagenUrl || s.imageMedia?.url || '';
                const items: string[] = Array.isArray(s.itemsIncluidos) ? s.itemsIncluidos.filter(Boolean).slice(0, 3) : [];
                return (
                  <article key={s.id} className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden flex flex-col">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="w-full aspect-[16/9] object-cover bg-slate-100" loading="lazy" />
                    ) : null}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold leading-snug">{s.nombre}</h3>
                        {s.precio != null && <span className="font-bold whitespace-nowrap">{Number(s.precio) > 0 ? `desde ${money(s.precio)}` : 'A cotizar'}</span>}
                      </div>
                      {s.descripcion && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{s.descripcion}</p>}
                      {items.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {items.map((it) => (
                            <li key={it} className="text-xs text-slate-600 flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> {it}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                        {s.tiempoEntrega ? <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {s.tiempoEntrega}</span> : <span />}
                        <button
                          type="button"
                          onClick={() => openRequest(s)}
                          style={{ color: brand, backgroundColor: `${brand}12` }}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                        >
                          Pedir
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="mt-12 scroll-mt-20">
          <h2 className="text-2xl font-bold mb-4">Cómo funciona</h2>
          <ol className="grid sm:grid-cols-5 gap-3">
            {steps.map((st, i) => (
              <li key={st.title} className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 relative">
                <span className="absolute top-3 right-3 text-xs font-bold text-slate-300">{i + 1}</span>
                <span style={{ backgroundColor: `${brand}14`, color: brand }} className="w-10 h-10 rounded-xl flex items-center justify-center">
                  <st.Icon className="w-5 h-5" />
                </span>
                <p className="font-semibold mt-3 leading-snug">{st.title}</p>
                <p className="text-sm text-slate-600 mt-0.5">{st.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Opiniones reales */}
        {reviews.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Lo que dicen nuestros clientes</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {reviews.slice(0, 6).map((r: any) => (
                <figure key={r.id} className="bg-white rounded-2xl ring-1 ring-slate-200 p-4">
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: Math.max(1, Math.min(5, Number(r.stars) || 5)) }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                  <blockquote className="text-sm text-slate-700 mt-2">{r.comment}</blockquote>
                  <figcaption className="text-xs text-slate-500 mt-2">{r.author}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Cobertura */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-1">¿Llegamos a tu zona?</h2>
          <p className="text-sm text-slate-500 mb-4">Revisa la zona de retiro y entrega.</p>
          <div className="rounded-2xl overflow-hidden ring-1 ring-slate-200 bg-white">
            <CoverageMapPublic negocioId={negocio?.id} onCheckLocation={() => openRequest()} />
          </div>
        </section>

        {/* Preguntas */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Preguntas frecuentes</h2>
          <div className="bg-white rounded-2xl ring-1 ring-slate-200 divide-y divide-slate-100">
            {faqs.map((f, i) => (
              <div key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left font-medium"
                  aria-expanded={openFaq === i}
                >
                  {f.q}
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <p className="px-4 pb-4 -mt-1 text-sm text-slate-600">{f.a}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* Llamado final */}
        <section style={{ backgroundColor: brand }} className="mt-12 rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <h2 className="text-2xl font-bold">¿Listo para tu primer retiro?</h2>
            <p className="text-white/85 text-sm mt-1">Pídelo en un minuto. Te confirmamos por WhatsApp.</p>
          </div>
          <button type="button" onClick={() => openRequest()} className="px-5 py-3 rounded-2xl bg-white text-slate-900 font-semibold flex items-center justify-center gap-1.5">
            Pedir retiro <ChevronRight className="w-4 h-4" />
          </button>
        </section>

        {/* Contacto */}
        <footer className="mt-10 mb-6 grid sm:grid-cols-3 gap-4 text-sm text-slate-600">
          <div>
            <p className="font-semibold text-slate-900">{nombre}</p>
            {negocio?.descripcion && <p className="mt-1 line-clamp-3">{negocio.descripcion}</p>}
          </div>
          <div className="space-y-1.5">
            {negocio?.direccion && (
              <p className="flex gap-2"><MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" /> {negocio.direccion}{negocio?.ciudad ? `, ${negocio.ciudad}` : ''}</p>
            )}
            {ap && ci && <p className="flex gap-2"><Clock className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" /> {ap} a {ci}</p>}
          </div>
          <div>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold">
                <MessageCircle className="w-4 h-4" /> Escríbenos
              </a>
            )}
          </div>
        </footer>
      </main>

      <UniversalServiceRequestModal
        isOpen={requestOpen}
        onClose={() => setRequestOpen(false)}
        negocio={negocio}
        initialServiceId={initialService?.id}
        initialServiceName={initialService?.nombre}
      />

      <div className="md:hidden">
        <PublicMobileNav slug={negocio?.slug || ''} tipoNegocio={negocio?.tipoNegocio || 'LAVANDERIA'} isLoyaltyEnabled={true} />
      </div>
    </div>
  );
}
