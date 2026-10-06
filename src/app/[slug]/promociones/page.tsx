import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  Tag, Sparkles, Calendar, Clock, ArrowLeft, MessageCircle, 
  CheckCircle2, ChevronRight, AlertCircle, Percent, Gift, 
  ShieldCheck, ArrowRight, HeartHandshake, Check
} from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const negocio = await prisma.negocio.findUnique({
    where: { slug },
    select: { nombre: true, heroSubtitulo: true, logoUrl: true },
  });

  if (!negocio) {
    return { title: 'Promociones & Ofertas' };
  }

  const title = `Promociones y Ofertas Especiales | ${negocio.nombre}`;
  const description = `Descubre los mejores descuentos, packs y promociones activas en ${negocio.nombre}. Aprovecha tarifas preferenciales por tiempo limitado.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [negocio.logoUrl || '/icon.png'],
    },
  };
}

export default async function PromocionesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const negocio = await prisma.negocio.findUnique({
    where: { slug },
  });

  if (!negocio) notFound();

  const primaryColor = (negocio as any).colorPrimario || '#0284c7';
  const secondaryColor = (negocio as any).colorSecundario || '#0369a1';
  const businessName = negocio.nombre || 'Nuestro Negocio';

  // Obtener promociones activas y no vencidas
  const now = new Date();
  const rawPromotions = await (prisma as any).promotion.findMany({
    where: {
      businessId: negocio.id,
      estado: { in: ['activa', 'ACTIVA'] },
    },
    include: {
      imageMedia: true,
      PromotionToService: {
        include: {
          Service: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const activePromotions = (rawPromotions || []).filter((p: any) => {
    const notExpired = !p.fechaFin || new Date(p.fechaFin) >= now;
    return notExpired;
  });

  // Configuración de contacto WhatsApp
  const rawPhone = (negocio as any).whatsapp || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const generalWhatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola, me gustaría consultar sobre las promociones vigentes en ${businessName}.`)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 antialiased font-sans flex flex-col justify-between">
      <div>
        {/* Barra superior de navegación / Retorno */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link 
              href={`/${slug}`} 
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-semibold text-xs sm:text-sm group"
            >
              <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                <ArrowLeft className="w-4 h-4 text-slate-700" />
              </div>
              <span>Volver a Inicio</span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs font-bold text-slate-500 uppercase tracking-wider">
                {businessName}
              </span>
              {generalWhatsappUrl && (
                <a
                  href={generalWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Hero Banner de Promociones */}
        <section className="relative overflow-hidden bg-white border-b border-slate-200/70 py-12 sm:py-16">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 pointer-events-none" />
          
          {/* Elementos decorativos de fondo */}
          <div 
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ backgroundColor: primaryColor }}
          />
          <div 
            className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ backgroundColor: secondaryColor }}
          />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>Beneficios & Descuentos Especiales</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Promociones Vigentes
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Aprovecha nuestras ofertas y paquetes exclusivos diseñados para brindarte la mejor atención con precios preferenciales por tiempo limitado.
            </p>
          </div>
        </section>

        {/* Listado Principal de Promociones */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {activePromotions.length === 0 ? (
            <div className="max-w-md mx-auto text-center bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xs space-y-4 my-8">
              <div className="size-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">No hay promociones activas hoy</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Estamos preparando nuevas ofertas y paquetes para ti. Puedes explorar todos nuestros servicios disponibles o contactarnos para una cotización personalizada.
              </p>
              <div className="pt-2">
                <Link
                  href={`/${slug}#servicios`}
                  className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:opacity-95 transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>Ver todos los servicios</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {activePromotions.map((promo: any) => {
                const precioPromo = promo.precioPromo ?? 0;
                const precioAnterior = promo.precioAnterior ?? 0;
                const hasDiscount = precioAnterior > precioPromo;
                const ahorro = hasDiscount ? (precioAnterior - precioPromo) : 0;
                const discountPercent = hasDiscount 
                  ? Math.round(((precioAnterior - precioPromo) / precioAnterior) * 100) 
                  : 0;

                const promoImage = promo.imageMedia?.url || promo.imagenUrl || 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&h=500&fit=crop';
                
                // Servicios vinculados
                const servicesIncluded = (promo.PromotionToService || [])
                  .map((pts: any) => pts.Service)
                  .filter(Boolean);

                const primaryService = servicesIncluded[0];
                const bookingUrl = primaryService?.id 
                  ? `/${slug}/servicio/${primaryService.id}?promoId=${promo.id}`
                  : `/${slug}#servicios`;

                const promoWaText = encodeURIComponent(
                  `Hola! Quiero aprovechar la promoción "${promo.titulo}" en ${businessName}. ¿Podrían brindarme disponibilidad de citas?`
                );
                const promoWaUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${promoWaText}` : null;

                const fechaFin = promo.fechaFin ? new Date(promo.fechaFin) : null;
                const formattedDate = fechaFin 
                  ? fechaFin.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                  : null;

                return (
                  <div
                    key={promo.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    <div>
                      {/* Portada con Badges */}
                      <div className="relative w-full h-52 bg-slate-100 overflow-hidden">
                        <img
                          src={promoImage}
                          alt={promo.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                        {/* Badges superiores */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/95 text-slate-800 shadow-sm border border-white/60">
                            {promo.tipoPromo === 'combo_pack' ? '📦 Pack Especial' :
                             promo.tipoPromo === '2x1' ? '👥 2x1 Parejas' :
                             promo.tipoPromo === 'cortesia_gratis' ? '🎁 Cortesía $0' :
                             promo.tipoPromo === 'descuento_segundo' ? '👨‍👩‍👧 2do al 50%' :
                             promo.tipoPromo === '3x1' ? '🔥 3x1 Especial' :
                             '⭐ Especial'}
                          </span>
                          {discountPercent > 0 && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                              {discountPercent}% OFF
                            </span>
                          )}
                        </div>

                        {/* Vigencia badge */}
                        {formattedDate && (
                          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>Válido hasta el {formattedDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Información de la Promo */}
                      <div className="p-6 space-y-3.5">
                        <h3 className="text-lg font-black text-slate-900 group-hover:text-sky-600 transition-colors leading-snug">
                          {promo.titulo}
                        </h3>

                        {promo.descripcion && (
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                            {promo.descripcion}
                          </p>
                        )}

                        {/* Lista de servicios incluidos */}
                        {servicesIncluded.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Servicios incluidos:
                            </span>
                            <div className="space-y-1">
                              {servicesIncluded.map((svc: any) => (
                                <div key={svc.id} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                                  <div className="size-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </div>
                                  <span className="line-clamp-1">{svc.nombre}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Precios y Botones de Acción */}
                    <div className="p-6 pt-0 space-y-4">
                      <div className="pt-3 border-t border-slate-100 flex items-end justify-between">
                        <div>
                          {hasDiscount && (
                            <span className="text-xs text-slate-400 line-through font-semibold block">
                              Normal: ${precioAnterior.toFixed(2)}
                            </span>
                          )}
                          <div className="flex items-baseline gap-1.5">
                            <span 
                              className="text-2xl sm:text-3xl font-black tracking-tight"
                              style={{ color: primaryColor }}
                            >
                              {precioPromo === 0 ? 'Gratis' : `$${precioPromo.toFixed(2)}`}
                            </span>
                          </div>
                        </div>

                        {ahorro > 0 && (
                          <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            Ahorras ${ahorro.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Botones */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Link
                          href={bookingUrl}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:opacity-95 active:scale-95 transition-all text-center"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <span>Aprovechar</span>
                          <ChevronRight className="w-4 h-4" />
                        </Link>

                        {promoWaUrl && (
                          <a
                            href={promoWaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs uppercase tracking-wider border border-emerald-200 active:scale-95 transition-all"
                            title="Consultar por WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                            <span className="sm:hidden">Consultar</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Banner de Garantía y Beneficios */}
          <div className="mt-16 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3.5">
              <div className="size-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Especialistas Certificados</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Todos los tratamientos son ejecutados por profesionales calificados con amplia experiencia.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="size-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Tecnología de Punta</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Equipamiento moderno y materiales de primera calidad para garantizar resultados óptimos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="size-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Atención Personalizada</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Planes adaptados a tus requerimientos con asesoramiento directo y continuo.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer Minimalista de Promociones */}
      <footer className="bg-white border-t border-slate-200/80 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {businessName}. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href={`/${slug}`} className="hover:text-slate-800 transition-colors">Inicio</Link>
            <Link href={`/${slug}#servicios`} className="hover:text-slate-800 transition-colors">Servicios</Link>
            <Link href={`/${slug}/mis-reservas`} className="hover:text-slate-800 transition-colors">Reservas</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
