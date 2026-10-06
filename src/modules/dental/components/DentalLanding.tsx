'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, Clock, MapPin, Phone, MessageCircle, ShieldCheck, Sparkles, 
  Award, Heart, Star, CheckCircle2, ChevronRight, 
  Smile, UserCheck, ArrowRight, X, ExternalLink, FileText, ArrowUpRight, Tag
} from 'lucide-react';
import DynamicFavicon from '@/components/DynamicFavicon';
import { getServicePrimaryImage } from '@/lib/serviceImageHelper';

interface DentalLandingProps {
  negocio: any;
  services?: any[];
  staff?: any[];
  results?: any[];
  reviews?: any[];
  pages?: any[];
  promotions?: any[];
}

const DEFAULT_DENTAL_RESULTS = [
  {
    id: 'default-dental-1',
    title: 'Blanqueamiento Dental Láser',
    description: 'Aclarado de hasta 4 tonos en una sesión de 45 minutos sin dolor ni sensibilidad, devolviendo la luminosidad natural.',
    beforeImage: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80',
    afterImage: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'default-dental-2',
    title: 'Diseño de Sonrisa & Carillas',
    description: 'Armonización estética de alta precisión corrigiendo bordes desgastados, manchas y proporciones dentales.',
    beforeImage: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=600&q=80',
    afterImage: 'https://images.unsplash.com/photo-1571772996211-2f02c9727629?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'default-dental-3',
    title: 'Alineación Dental & Ortodoncia',
    description: 'Corrección funcional y estética de alineación de mordida y piezas con tecnología guiada y resultados duraderos.',
    beforeImage: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=600&q=80',
    afterImage: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80',
  }
];

export default function DentalLanding({
  negocio,
  services = [],
  staff = [],
  results = [],
  reviews = [],
  pages = [],
  promotions = []
}: DentalLandingProps) {
  const [selectedService, setSelectedService] = useState<any>(null);

  const primaryColor = negocio?.colorPrimario || '#0284c7';
  const secondaryColor = negocio?.colorSecundario || '#0369a1';
  const businessName = negocio?.nombre || 'Clínica Odontológica';
  const heroTitle = negocio?.heroTitulo || 'Tu Sonrisa, Nuestra Mayor Prioridad';
  const heroSubtitle = negocio?.heroSubtitulo || 'Atención odontológica integral y especializada para cuidar tu salud bucal con tecnología avanzada y trato humano.';

  // Obtener sucursal matriz o primera sede activa configurada
  const mainBranch = (negocio?.ubicaciones && negocio.ubicaciones.length > 0)
    ? (negocio.ubicaciones.find((u: any) => u.isMain) || negocio.ubicaciones[0])
    : null;

  const displayAddress = mainBranch?.direccion || negocio?.direccion || 'Consultar dirección al agendar';
  const displayCity = mainBranch?.ciudad || negocio?.ciudad || '';
  const fullAddress = (displayCity && !displayAddress.toLowerCase().includes(displayCity.toLowerCase()))
    ? `${displayAddress}, ${displayCity}`
    : displayAddress;

  const rawMapUrl = mainBranch?.mapUrl || '';
  const validMapUrl = (rawMapUrl.startsWith('http://') || rawMapUrl.startsWith('https://')) ? rawMapUrl : null;
  const mapLink = validMapUrl || (displayAddress && displayAddress !== 'Consultar dirección al agendar'
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : null);

  const rawPhone = mainBranch?.telefono || negocio?.whatsapp || negocio?.telefono || '';
  const whatsappNumber = rawPhone;
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const whatsappUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola, me gustaría agendar una cita odontológica en ${businessName}`)}`
    : null;


  const cleanHtmlContent = (html: string) => {
    if (!html) return '';
    return html
      .replace(/\{\/\*.*?\*\/\}/g, '')
      .replace(/<!--.*?-->/g, '')
      .replace(/<p>\s*<\/p>/g, '');
  };

  const isPageActive = (p: any) => {
    const st = (p.status || '').toLowerCase();
    return st === 'published' || st === 'publicado' || (!st && st !== 'draft' && st !== 'borrador' && st !== 'inactive');
  };

  const activePages = (pages || []).filter(isPageActive);

  // Páginas en Zona Superior (Top / ARRIBA)
  const topPages = activePages
    .filter((p: any) => {
      const pos = (p.posicion || 'top').toLowerCase();
      return pos === 'top' || pos === 'arriba';
    })
    .sort((a: any, b: any) => (a.orden ?? 1) - (b.orden ?? 1));

  // Páginas en Zona Inferior (Bottom / ABAJO)
  const bottomPages = activePages
    .filter((p: any) => {
      const pos = (p.posicion || '').toLowerCase();
      return pos === 'bottom' || pos === 'abajo';
    })
    .sort((a: any, b: any) => (a.orden ?? 1) - (b.orden ?? 1));

  const displayServices = services.length > 0 ? services : (negocio?.services || []);
  const displayStaff = staff.length > 0 ? staff : (negocio?.Staff || []);
  const dbResults = results.length > 0 ? results : (negocio?.Resultado || []);
  const displayResults = dbResults.length > 0 ? dbResults : DEFAULT_DENTAL_RESULTS;
  const displayPromotions = promotions.length > 0 ? promotions : (negocio?.promociones || negocio?.Promotion || []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      <DynamicFavicon negocio={negocio} defaultTitle={negocio?.nombre || "Clínica Dental"} />

      {/* ─── HEADER / NAVBAR ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {negocio?.logoUrl ? (
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-slate-100 bg-white flex items-center justify-center">
                <img 
                  src={negocio.logoUrl} 
                  alt={businessName} 
                  className="w-full h-full object-contain p-1"
                />
              </div>
            ) : (
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                <Smile className="w-7 h-7" />
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-slate-900 text-lg leading-tight">{businessName}</h1>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Atención Odontológica Activa
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            {topPages.map((p: any) => (
              <a key={p.id} href={`#${p.slug}`} className="hover:text-slate-900 transition-colors">
                {p.title}
              </a>
            ))}
            {displayPromotions.length > 0 && (
              <a href="#promociones" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5 text-emerald-600 font-bold">
                <Tag className="w-3.5 h-3.5" />
                <span>Promociones</span>
              </a>
            )}
            <a href="#servicios" className="hover:text-slate-900 transition-colors">Tratamientos</a>
            <a href="#casos" className="hover:text-slate-900 transition-colors">Resultados</a>
            {displayStaff.length > 0 && (
              <a href="#equipo" className="hover:text-slate-900 transition-colors">Odontólogos</a>
            )}
            {bottomPages.map((p: any) => (
              <a key={p.id} href={`#${p.slug}`} className="hover:text-slate-900 transition-colors">
                {p.title}
              </a>
            ))}
            <a href="#contacto" className="hover:text-slate-900 transition-colors">Contacto</a>
          </nav>

          <div className="flex items-center gap-3">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all shadow-sm"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            )}
            <a
              href="#servicios"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:brightness-105 active:scale-95 transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              <Calendar className="w-4 h-4" />
              <span>Agendar Cita</span>
            </a>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/50 via-white to-slate-50 py-16 lg:py-24 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 text-sky-800 text-xs font-bold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                Odontología Moderna & Sin Dolor
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                {heroTitle}
              </h2>

              <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {heroSubtitle}
              </p>

              {/* Botones de acción principal */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <a
                  href="#servicios"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-extrabold text-white shadow-xl hover:shadow-2xl hover:brightness-105 active:scale-98 transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Calendar className="w-5 h-5" />
                  <span>AGENDAR CITA DENTAL</span>
                  <ChevronRight className="w-4 h-4" />
                </a>

                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-base font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"
                  >
                    <MessageCircle className="w-5 h-5 text-emerald-500" />
                    <span>Consulta por WhatsApp</span>
                  </a>
                )}
              </div>

              {/* Badges de confianza clínica */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200/60 max-w-xl mx-auto lg:mx-0">
                <div className="flex flex-col items-center lg:items-start">
                  <div className="flex items-center gap-1 text-amber-500 font-black text-xl">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span>5.0</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Calificación de pacientes</span>
                </div>
                <div className="flex flex-col items-center lg:items-start">
                  <div className="flex items-center gap-1 text-slate-900 font-black text-xl">
                    <ShieldCheck className="w-5 h-5 text-sky-600" />
                    <span>100%</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Bioseguridad & Esterilización</span>
                </div>
                <div className="flex flex-col items-center lg:items-start">
                  <div className="flex items-center gap-1 text-slate-900 font-black text-xl">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    <span>Puntual</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Citas sin largas esperas</span>
                </div>
              </div>
            </div>

            {/* Imagen principal / Banner de consultorio */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div 
                  className="absolute -inset-4 rounded-3xl opacity-20 blur-xl -z-10"
                  style={{ backgroundColor: primaryColor }}
                />
                <div className="relative bg-white rounded-3xl p-3 shadow-2xl border border-slate-100 overflow-hidden">
                  <div className="relative h-80 sm:h-96 w-full rounded-2xl overflow-hidden bg-slate-100">
                    <img
                      src={
                        (negocio?.configuracion as any)?.bannerUrl ||
                        'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&h=800&fit=crop'
                      }
                      alt={`Consultorio ${businessName}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
                    
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-md text-xs font-semibold mb-1">
                        <Smile className="w-3.5 h-3.5" />
                        Instalaciones Clínicas
                      </div>
                      <p className="text-sm font-medium text-slate-100">Equipamiento ergonómico y radiografía digital para tu comodidad.</p>
                    </div>
                  </div>

                  {/* Tarjeta flotante con horario de hoy */}
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Horario de Atención</p>
                        <p className="text-xs text-slate-500 font-medium">
                          {negocio?.horarioApertura || '08:00'} - {negocio?.horarioCierre || '20:00'} hrs
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase">
                      Abierto
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ─── PÁGINAS ACTIVAS ZONA SUPERIOR (ARRIBA) ─────────────────── */}
      {topPages.map((page: any, idx: number) => (
        <section 
          key={page.id} 
          id={page.slug || `pagina-top-${idx}`} 
          className="py-20 bg-slate-50 border-b border-slate-100 scroll-mt-20"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {page.title && (
              <div className="text-center space-y-3">
                <span 
                  className="text-xs font-extrabold tracking-widest uppercase px-3.5 py-1.5 rounded-full bg-white border border-slate-100 shadow-2xs"
                  style={{ color: primaryColor }}
                >
                  Información &amp; Tecnología
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {page.title}
                </h2>
                <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: primaryColor }} />
              </div>
            )}

            {page.featuredImage && (
              <div className="max-w-4xl mx-auto overflow-hidden rounded-3xl border border-slate-100 shadow-xl bg-white">
                <img 
                  src={page.featuredImage} 
                  alt={page.title} 
                  className="w-full h-80 sm:h-[420px] object-cover" 
                />
              </div>
            )}

            {page.contentHtml && (
              <div 
                className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-100 shadow-sm text-slate-700 leading-relaxed text-base sm:text-lg space-y-4 font-normal"
                dangerouslySetInnerHTML={{ __html: cleanHtmlContent(page.contentHtml) }}
              />
            )}

            {page.buttonText && (
              <div className="text-center pt-2">
                <a
                  href={page.buttonUrl || (whatsappUrl || `/${negocio?.slug || 'dentarmony'}`)}
                  className="inline-flex items-center gap-2.5 px-8 py-4 text-white font-black rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 text-sm uppercase tracking-wide"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>{page.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </section>
      ))}

      {/* ─── SECCIÓN PROMOCIONES & OFERTAS DESTACADAS ─────────────────── */}
      {displayPromotions.length > 0 && (
        <section id="promociones" className="py-20 bg-gradient-to-b from-white to-slate-50 border-b border-slate-100 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div className="space-y-2">
                <span className="text-xs font-black tracking-widest text-emerald-600 uppercase bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 shadow-2xs inline-flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  Ofertas &amp; Beneficios por Tiempo Limitado
                </span>
                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  Promociones &amp; Packs Dentales Especiales
                </h3>
                <p className="text-base text-slate-500 max-w-2xl">
                  Aprovecha nuestras tarifas preferenciales y descuentos exclusivos para cuidar la salud bucal de toda tu familia.
                </p>
              </div>
              <Link
                href={`/${negocio.slug}/promociones`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-800 hover:text-slate-900 hover:border-slate-300 font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md transition-all shrink-0 self-start md:self-auto"
              >
                <span>Ver todas las promociones</span>
                <ArrowRight className="w-4 h-4 text-emerald-600" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayPromotions.map((promo: any) => {
                const hasDiscount = promo.precioAnterior && promo.precioAnterior > (promo.precioPromo ?? 0);
                const discountPercent = hasDiscount 
                  ? Math.round(((promo.precioAnterior - (promo.precioPromo ?? 0)) / promo.precioAnterior) * 100) 
                  : 0;

                const primaryServiceId = promo.PromotionToService?.[0]?.serviceId || 
                                         promo.PromotionToService?.[0]?.B || 
                                         promo.serviceId || 
                                         (promo.services && promo.services[0]?.id);
                const bookingUrl = primaryServiceId 
                  ? `/${negocio.slug}/servicio/${primaryServiceId}?promoId=${promo.id}` 
                  : `/${negocio.slug}/promo/${promo.id}`;

                const promoImg = promo.imageMedia?.url || promo.imagenUrl || 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&h=500&fit=crop';

                return (
                  <div 
                    key={promo.id}
                    className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    <div>
                      {/* Imagen con Badges */}
                      <div className="relative w-full h-48 bg-slate-100 overflow-hidden">
                        <img 
                          src={promoImg} 
                          alt={promo.titulo} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/95 backdrop-blur-sm text-slate-900 shadow-xs border border-white/50">
                            {promo.tipoPromo === 'combo_pack' ? '📦 Pack Dental' :
                             promo.tipoPromo === '2x1' ? '👥 2x1 en Pareja' :
                             promo.tipoPromo === 'cortesia_gratis' ? '🎁 Cortesía $0' :
                             promo.tipoPromo === 'descuento_segundo' ? '👨‍👩‍👧 2do al 50%' :
                             promo.tipoPromo === '3x1' ? '🔥 3x1 Especial' :
                             '⭐ Especial'}
                          </span>
                          {discountPercent > 0 && (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                              {discountPercent}% OFF
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contenido */}
                      <div className="p-6 space-y-3">
                        <h4 className="text-xl font-extrabold text-slate-900 leading-snug">
                          {promo.titulo}
                        </h4>
                        {promo.descripcion && (
                          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-3">
                            {promo.descripcion}
                          </p>
                        )}

                        {/* Precios */}
                        <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tarifa Promo:</span>
                          <div className="flex items-baseline gap-2">
                            {promo.precioAnterior && (
                              <span className="text-sm text-slate-400 line-through font-semibold">
                                ${Number(promo.precioAnterior).toFixed(2)}
                              </span>
                            )}
                            <span className={`text-2xl font-black ${promo.precioPromo === 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                              {promo.precioPromo === 0 ? 'GRATIS' : `$${Number(promo.precioPromo).toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="p-6 pt-0 space-y-2">
                      <Link
                        href={bookingUrl}
                        className="w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Aprovechar Oferta</span>
                      </Link>
                      
                      {whatsappUrl && (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola, me interesa la promoción: "${promo.titulo}" en ${businessName}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-4 rounded-xl text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 border border-emerald-100"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Consultar por WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── SERVICIOS / TARIFARIO DE LA CLÍNICA ─────────────────────── */}
      <section id="servicios" className="py-20 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-2">
              <span className="text-xs font-extrabold tracking-widest text-emerald-600 uppercase">
                Agenda Online Inmediata
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Servicios & Tratamientos Disponibles
              </h3>
              <p className="text-base text-slate-500 max-w-xl">
                Selecciona el servicio que requieres para elegir profesional, día y hora de tu preferencia.
              </p>
            </div>

            {negocio?.slug && (
              <Link
                href={`/${negocio.slug}/servicios`}
                className="inline-flex items-center gap-2 text-sm font-bold text-sky-600 hover:text-sky-700"
              >
                <span>Ver todos los servicios</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {displayServices.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8">
              <Smile className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-slate-700">Tratamientos odontológicos en configuración</h4>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                Puedes agendar directamente tu cita de valoración comunicándote con nosotros.
              </p>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Agendar por WhatsApp
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayServices.map((srv: any) => {
                const bookingUrl = `/${negocio.slug}/servicio/${srv.id}`;
                const srvImg = getServicePrimaryImage(srv, 'medium', 'ODONTOLOGIA');
                return (
                  <div
                    key={srv.id}
                    className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 flex flex-col justify-between group overflow-hidden"
                  >
                    <div>
                      {/* Imagen destacada del servicio */}
                      <div className="relative w-full h-44 rounded-2xl overflow-hidden mb-4 bg-slate-100">
                        <img
                          src={srvImg}
                          alt={srv.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h4 className="text-lg font-extrabold text-slate-900 leading-snug">
                          {srv.nombre}
                        </h4>
                        {srv.precio != null && srv.precio > 0 && (
                          <div className="text-right shrink-0">
                            <span className="text-xs font-semibold text-slate-400 block">Desde</span>
                            <span className="text-xl font-black text-slate-900">
                              ${Number(srv.precio).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-4">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {srv.duracion || 45} min
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmación Inmediata
                        </span>
                      </div>

                      {/* Especialistas Asignados */}
                      {srv.Staff && srv.Staff.length > 0 && (
                        <div className="flex items-center gap-2 mb-5 p-2 rounded-xl bg-slate-50/90 border border-slate-100">
                          <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                            {srv.Staff.slice(0, 3).map((st: any) => (
                              <div key={st.id} className="size-6 rounded-full border-2 border-white bg-slate-200 overflow-hidden" title={st.name}>
                                {st.avatar ? (
                                  <img src={st.avatar} alt={st.name} className="size-full object-cover" />
                                ) : (
                                  <span className="flex size-full items-center justify-center text-[9px] font-black text-slate-700">
                                    {st.name[0]}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 truncate">
                            {srv.Staff.length === 1 ? srv.Staff[0].name : `${srv.Staff.length} especialistas`}
                          </span>
                        </div>
                      )}
                    </div>

                    <Link
                      href={bookingUrl}
                      className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-sm hover:brightness-105 active:scale-98 transition-all"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Agendar Este Turno</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── EQUIPO MÉDICO / ODONTÓLOGOS ────────────────────────────── */}
      {displayStaff.length > 0 && (
        <section id="equipo" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-extrabold tracking-widest text-sky-600 uppercase">
                Staff Especializado
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Nuestros Profesionales de la Salud
              </h3>
              <p className="text-base text-slate-500">
                Doctores altamente capacitados dedicados a brindarte la mejor experiencia clínica con calidez y rigor médico.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {displayStaff.map((st: any) => (
                <div
                  key={st.id}
                  className="bg-slate-50 rounded-3xl p-6 border border-slate-100 text-center hover:shadow-lg transition-all"
                >
                  <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-200">
                    {st.avatar ? (
                      <img src={st.avatar} alt={st.name} className="w-full h-full object-cover" />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {st.name?.charAt(0) || 'D'}
                      </div>
                    )}
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900">{st.name}</h4>
                  <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mt-0.5">
                    {st.role || 'Odontólogo Especialista'}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-center gap-1 text-xs text-slate-500 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Colegiado & Certificado
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── ANTES Y DESPUÉS (CASOS CLÍNICOS) ───────────────────────── */}
      {displayResults.length > 0 && (
        <section id="casos" className="py-20 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-extrabold tracking-widest text-emerald-400 uppercase">
                Evidencia Clínica
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Transformaciones de Sonrisas: Antes y Después
              </h3>
              <p className="text-base text-slate-400">
                Resultados reales de pacientes que recuperaron su salud bucal, funcionalidad y estética dental.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayResults.map((res: any) => (
                <div
                  key={res.id}
                  className="bg-slate-800/90 rounded-3xl overflow-hidden border border-slate-700 shadow-xl"
                >
                  <div className="grid grid-cols-2 h-52 bg-slate-950 relative">
                    <div className="relative h-full border-r border-slate-700">
                      {res.beforeImage && (
                        <img src={res.beforeImage} alt="Antes" className="w-full h-full object-cover" />
                      )}
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                        Antes
                      </span>
                    </div>
                    <div className="relative h-full">
                      {res.afterImage && (
                        <img src={res.afterImage} alt="Después" className="w-full h-full object-cover" />
                      )}
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                        Después
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h5 className="font-extrabold text-white text-base mb-1">{res.title}</h5>
                    {res.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{res.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── UBICACIÓN Y HORARIOS ───────────────────────────────────── */}
      <section id="contacto" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-extrabold tracking-widest text-sky-600 uppercase">
                Visítanos
              </span>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                Ubicación & Contacto del Consultorio
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Estamos listos para recibirte en un ambiente relajado, moderno y con los más rigurosos protocolos de esterilización.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-bold text-slate-900">
                        {mainBranch?.nombre ? `Dirección (${mainBranch.nombre})` : 'Dirección'}
                      </h5>
                      {mapLink && (
                        <a 
                          href={mapLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:underline"
                        >
                          <span>Ver en Mapa</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {fullAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">Horario de Consultas</h5>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Lunes a Sábado: {negocio?.horarioApertura || '08:00'} a {negocio?.horarioCierre || '20:00'} hrs
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Atención previa reserva online o telefónica</p>
                  </div>
                </div>

                {whatsappNumber && (
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-slate-900">Teléfono / WhatsApp</h5>
                      <p className="text-xs text-slate-600 mt-0.5">{whatsappNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CTA Box de agendamiento directo */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div 
                className="p-8 sm:p-10 rounded-3xl text-white shadow-2xl relative overflow-hidden"
                style={{ backgroundColor: secondaryColor }}
              >
                <div className="relative z-10 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-extrabold uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    Tu Primera Consulta
                  </div>

                  <h4 className="text-3xl font-black text-white leading-tight">
                    ¿Listo para cuidar tu salud dental y lucir tu mejor sonrisa?
                  </h4>

                  <p className="text-sm text-slate-200 leading-relaxed">
                    Reserva tu cita en menos de 2 minutos. Elige el horario que mejor se adapte a tu día.
                  </p>

                  <div className="pt-2">
                    <a
                      href="#servicios"
                      className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white text-slate-900 font-black text-base shadow-lg hover:bg-slate-100 active:scale-98 transition-all"
                    >
                      <Calendar className="w-5 h-5 text-sky-600" />
                      <span>SELECCIONAR SERVICIO Y HORA</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PÁGINAS ACTIVAS ZONA INFERIOR (ABAJO) ─────────────────── */}
      {bottomPages.map((page: any, idx: number) => (
        <section 
          key={page.id} 
          id={page.slug || `pagina-bottom-${idx}`} 
          className="py-20 bg-white border-t border-slate-100 scroll-mt-20"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {page.title && (
              <div className="text-center space-y-3">
                <span 
                  className="text-xs font-extrabold tracking-widest uppercase px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-100 shadow-2xs"
                  style={{ color: primaryColor }}
                >
                  Información Clínica
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {page.title}
                </h2>
                <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: primaryColor }} />
              </div>
            )}

            {page.featuredImage && (
              <div className="max-w-4xl mx-auto overflow-hidden rounded-3xl border border-slate-100 shadow-xl bg-white">
                <img 
                  src={page.featuredImage} 
                  alt={page.title} 
                  className="w-full h-80 sm:h-[420px] object-cover" 
                />
              </div>
            )}

            {page.contentHtml && (
              <div 
                className="bg-slate-50/70 p-8 sm:p-12 rounded-3xl border border-slate-100 shadow-sm text-slate-700 leading-relaxed text-base sm:text-lg space-y-4 font-normal"
                dangerouslySetInnerHTML={{ __html: cleanHtmlContent(page.contentHtml) }}
              />
            )}

            {page.buttonText && (
              <div className="text-center pt-2">
                <a
                  href={page.buttonUrl || (whatsappUrl || `/${negocio?.slug || 'dentarmony'}`)}
                  className="inline-flex items-center gap-2.5 px-8 py-4 text-white font-black rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 text-sm uppercase tracking-wide"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>{page.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </section>
      ))}

      {/* ─── FOOTER ─────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: primaryColor }}
            >
              <Smile className="w-5 h-5" />
            </div>
            <span className="text-white font-bold text-sm">{businessName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link href={`/${negocio?.slug || 'dentarmony'}/especialidades`} className="text-slate-400 hover:text-white transition-colors">Especialidades</Link>
            <Link href={`/${negocio?.slug || 'dentarmony'}/servicios`} className="text-slate-400 hover:text-white transition-colors">Servicios</Link>
            <Link href={`/${negocio?.slug || 'dentarmony'}/promociones`} className="text-slate-400 hover:text-white transition-colors">Promociones</Link>
          </div>
          <p>© {new Date().getFullYear()} {businessName}. Todos los derechos reservados.</p>
          <p className="text-slate-500">
            Powered by <span className="text-slate-300 font-bold">Citiox Health & Dental</span>
          </p>
        </div>
      </footer>

      {/* ─── BOTÓN FLOTANTE DE WHATSAPP ─────────────────────────────── */}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 text-white shadow-2xl hover:bg-emerald-600 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
          title="Consultar por WhatsApp"
        >
          <MessageCircle className="w-7 h-7" />
        </a>
      )}
    </div>
  );
}
