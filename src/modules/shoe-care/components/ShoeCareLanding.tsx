'use client';

import { useState, useEffect } from 'react';
import DynamicFavicon from '@/components/DynamicFavicon';
import { 
  Sparkles, 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  ChevronRight, 
  Phone, 
  Store, 
  AlertCircle, 
  X, 
  Loader2, 
  Footprints, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Map as MapIcon,
  Check,
  Star,
  Camera,
  Layers,
  HeartHandshake,
  UserCheck,
  Info,
  Instagram,
  Facebook,
  Trophy,
  User
} from 'lucide-react';
import MapSelectionModal from '@/components/public/MapSelectionModal';
import CoverageMapPublic from '@/components/public/CoverageMapPublic';
import PublicMobileNav from '@/components/public/PublicMobileNav';

interface ShoeCareLandingProps {
  negocio: any;
  reviews?: any[];
  paginasPersonalizadas?: any[];
}

const cleanHtmlContent = (html: string) => {
  if (!html) return '';
  return html
    .replace(/\{\/\*.*?\*\/\}/g, '')
    .replace(/<!--.*?-->/g, '')
    .replace(/<p>\s*<\/p>/g, '');
};

function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('593')) return digits;
  if (digits.startsWith('09') && digits.length === 10) {
    return '593' + digits.substring(1);
  }
  if (digits.length === 9) {
    return '593' + digits;
  }
  return digits;
}

const TIME_SLOTS = [
  { id: '09-11', label: '09:00 - 11:00 AM', icon: '🌅 Mañana' },
  { id: '11-13', label: '11:00 AM - 01:00 PM', icon: '☀️ Mediodía' },
  { id: '14-16', label: '02:00 - 04:00 PM', icon: '🌤️ Tarde' },
  { id: '16-18', label: '04:00 - 06:00 PM', icon: '🌆 Víspera' }
];

const SERVICIOS_CATALOGO = [
  {
    id: 'basico',
    nombre: 'Lavado Básico',
    precio: '4',
    descripcion: 'Ideal para zapatos con poco suciedad.',
    imagen: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80'
  },
  {
    id: 'completo',
    nombre: 'Lavado Completo',
    precio: '6',
    descripcion: 'Limpieza profunda interior y exterior.',
    imagen: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&q=80'
  },
  {
    id: 'premium',
    nombre: 'Sneakers Premium',
    precio: '8',
    descripcion: 'Materiales delicados y premium.',
    imagen: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=400&q=80'
  },
  {
    id: 'blancos',
    nombre: 'Blancos',
    precio: '7',
    descripcion: 'Recuperación de color.',
    imagen: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80'
  },
  {
    id: 'gamuza',
    nombre: 'Gamuza',
    precio: '9',
    descripcion: 'Proceso especializado.',
    imagen: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=400&q=80'
  },
  {
    id: 'restauracion',
    nombre: 'Restauración',
    precio: '15',
    descripcion: 'Limpieza + recuperación.',
    imagen: 'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=400&q=80'
  }
];

const FAQS = [
  { q: '¿Cuánto tarda el servicio?', a: 'El servicio estándar toma entre 24 y 48 horas según el tipo de calzado y el secado requerido.' },
  { q: '¿Cómo sé cuánto pagaré?', a: 'Realizamos una inspección inicial al recibir tus zapatos y confirmamos el precio final por WhatsApp antes de lavar.' },
  { q: '¿Qué pasa si mis zapatos necesitan restauración?', a: 'Si requieren pegado, costura o repintado de suela, te enviaremos una cotización detallada para tu aprobación.' },
  { q: '¿Puedo llevarlos directamente al local?', a: '¡Claro que sí! Puedes dejarlos en nuestro taller físico en el horario de atención.' },
  { q: '¿Toman fotos del proceso?', a: 'Sí, fotografiamos tus zapatos al recibirlos y al finalizar para enviarte el estado Antes/Después.' }
];

export default function ShoeCareLanding({ negocio, reviews = [], paginasPersonalizadas = [] }: ShoeCareLandingProps) {
  const [isMounted, setIsMounted] = useState(false);
  // Páginas: inicialmente las del servidor (pueden ser vacías si Prisma falla), se recargan desde API pública al montar
  const [paginas, setPaginas] = useState<any[]>(paginasPersonalizadas);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showInStoreModal, setShowInStoreModal] = useState(false);
  const [showLocalModal, setShowLocalModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<any>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [searchingLookup, setSearchingLookup] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [lookupStep, setLookupStep] = useState<'PHONE' | 'OTP' | 'ORDERS'>('PHONE');
  const [otpCode, setOtpCode] = useState('');

  // Montar y cargar páginas desde API pública si el servidor no las entregó
  useEffect(() => {
    setIsMounted(true);
    if (negocio?.id) {
      fetch(`/api/public/pages/${negocio.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setPaginas(data);
          }
        })
        .catch(() => {});
    }
  }, [negocio?.id]);

  // Carrusel del Banner Hero
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  // Ubicación por mapa
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  // Selección de fecha y hora
  const [selectedDayOption, setSelectedDayOption] = useState<'HOY' | 'MANANA' | 'PASADO'>('MANANA');
  const [selectedSlot, setSelectedSlot] = useState<string>('14-16');

  const [form, setForm] = useState({
    nombreCliente: '',
    telefonoCliente: '',
    direccionCliente: '',
    referenciaCliente: '',
    cantidadPares: '1',
    notas: ''
  });

  const nombreNegocio = negocio?.nombre || 'BubbleWash';
  const logoUrl = negocio?.logoUrl || '';
  const whatsappNum = negocio?.whatsapp || negocio?.telefono || '0991234567';
  const direccion = negocio?.direccion || 'Calle 123 #45-67';
  const horarioApertura = negocio?.horarioApertura || '09:00';
  const horarioCierre = negocio?.horarioCierre || '19:00';

  // Recopilar todas las imágenes de portada (carrusel)
  const bannerImages: string[] = [];
  if (negocio?.imagenesPortada && Array.isArray(negocio.imagenesPortada) && negocio.imagenesPortada.length > 0) {
    bannerImages.push(...negocio.imagenesPortada);
  }
  if (negocio?.media && Array.isArray(negocio.media) && negocio.media.length > 0) {
    negocio.media.forEach((m: any) => {
      if (m.url && !bannerImages.includes(m.url)) {
        bannerImages.push(m.url);
      }
    });
  }
  if (negocio?.portadaUrl && !bannerImages.includes(negocio.portadaUrl)) {
    bannerImages.push(negocio.portadaUrl);
  }
  if (negocio?.configuracion?.bannerUrl && !bannerImages.includes(negocio.configuracion.bannerUrl)) {
    bannerImages.push(negocio.configuracion.bannerUrl);
  }
  if (bannerImages.length === 0) {
    bannerImages.push(
      '/images/bubblewash/hero_sneakers.jpg',
      '/images/bubblewash/store_front.jpg',
      '/images/bubblewash/delivery_driver.jpg'
    );
  }

  // Auto-play para el carrusel de banner hero
  useEffect(() => {
    if (bannerImages.length <= 1) return;
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % bannerImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [bannerImages.length]);

  const displayServices = (negocio?.services && Array.isArray(negocio.services) && negocio.services.length > 0)
    ? negocio.services.map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        precio: s.precio?.toString() || '6',
        descripcion: s.descripcion || 'Servicio profesional de limpieza.',
        imagen: s.imagenUrl || s.imagen || 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80'
      }))
    : SERVICIOS_CATALOGO;

  const getFormattedRetiroDate = () => {
    const today = new Date();
    let targetDate = new Date(today);

    if (selectedDayOption === 'MANANA') {
      targetDate.setDate(today.getDate() + 1);
    } else if (selectedDayOption === 'PASADO') {
      targetDate.setDate(today.getDate() + 2);
    }

    const dayName = targetDate.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
    const slotObj = TIME_SLOTS.find(s => s.id === selectedSlot) || TIME_SLOTS[2];

    const prefix = selectedDayOption === 'HOY' ? 'Hoy' : selectedDayOption === 'MANANA' ? 'Mañana' : 'Pasado mañana';
    return `${prefix} (${dayName}) entre ${slotObj.label}`;
  };

  const handleConfirmLocationOnMap = async (lat: number, lng: number) => {
    setCoords({ lat, lng });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const mainAddress = data.display_name.split(',').slice(0, 3).join(',');
          setForm(prev => ({ ...prev, direccionCliente: mainAddress }));
        }
      }
    } catch (e) {
      console.error('Error reverse geocoding:', e);
    }
  };

  const handlePickupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombreCliente || !form.telefonoCliente || !form.direccionCliente) return;

    setSubmitting(true);
    try {
      const fechaHoraCalculada = getFormattedRetiroDate();

      const res = await fetch('/api/shoe-care/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId: negocio?.id || 'sneaker-wash-id',
          nombreCliente: form.nombreCliente,
          telefonoCliente: form.telefonoCliente,
          direccionCliente: form.direccionCliente,
          referenciaCliente: form.referenciaCliente,
          cantidadPares: form.cantidadPares,
          notas: form.notas,
          modo: 'DOMICILIO',
          fechaHoraRetiro: fechaHoraCalculada,
          latitud: coords.lat,
          longitud: coords.lng
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessOrder(data);
        setShowPickupModal(false);
      }
    } catch (e) {
      console.error('Error creando orden:', e);
    } finally {
      setSubmitting(false);
    }
  };

  // isMounted solo se usa para componentes que requieren el DOM (mapas, etc.)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-purple-500 selection:text-white pb-24">
      <DynamicFavicon negocio={negocio} defaultTitle="BubbleWash | Lavado de Zapatos" defaultIcon="/images/bubblewash/hero_sneakers.jpg" />



      {/* 🔮 TOP HEADER UNIFICADO (Platform Clean) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={nombreNegocio} className="h-10 w-auto max-w-[150px] object-contain rounded-xl" />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30">
              <span className="font-black text-xl italic tracking-tighter">{nombreNegocio.charAt(0)}</span>
            </div>
          )}
          <span className="text-xl font-black text-slate-900 tracking-tight">
            {nombreNegocio}
          </span>
        </div>

        <button
          onClick={() => setShowPickupModal(true)}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all cursor-pointer"
        >
          Solicitar al local
        </button>
      </div>

      {/* 🚀 HERO SECTION */}
      <section id="inicio" className="pt-8 pb-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-8 text-center lg:text-left order-2 lg:order-1">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Tus zapatos <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                  como nuevos.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 font-medium max-w-xl mx-auto lg:mx-0">
                Lavamos, desinfectamos y restauramos tus zapatos con procesos profesionales.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={() => setShowInStoreModal(true)}
                className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-purple-600/25 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Store size={18} />
                Llevar al local
              </button>

              <button
                onClick={() => setShowPickupModal(true)}
                className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50 font-black text-sm rounded-2xl shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Truck size={18} />
                Solicitar retiro a domicilio
              </button>
            </div>

            {/* Features Row */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left border-t border-slate-200/80">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Entrega rápida</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={18} className="text-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Atención por WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Fotos antes y después</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Cuidado profesional</span>
              </div>
            </div>
          </div>

          {/* Right Image Column — Carrusel de Banner Hero */}
          <div className="lg:col-span-6 relative order-1 lg:order-2">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-400/20 to-indigo-300/20 rounded-full blur-3xl -z-10 transform scale-90" />
            
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white h-[380px] sm:h-[450px] bg-slate-100">
              {bannerImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    idx === heroSlideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img 
                    src={imgUrl} 
                    alt={`${nombreNegocio} Banner ${idx + 1}`} 
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                  />
                </div>
              ))}

              {/* Indicadores de diapositivas (dots) */}
              {bannerImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                  {bannerImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setHeroSlideIndex(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === heroSlideIndex ? 'w-6 bg-white shadow-sm' : 'w-2 bg-white/50 hover:bg-white/80'
                      }`}
                      aria-label={`Ver foto ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 📍 SECTION 2: ¿CÓMO FUNCIONA? / PÁGINAS PERSONALIZADAS DINÁMICAS DESDE ADMIN */}
      {(() => {
        const comoFuncionaPage = paginas.find((p: any) => {
          const s = (p.slug || '').toLowerCase();
          const t = (p.title || '').toLowerCase().replace(/<[^>]*>?/gm, '');
          return s === 'como-funciona' || t.includes('funciona');
        });
        if (comoFuncionaPage && comoFuncionaPage.contentHtml) {
          return (
            <section className="py-16 bg-slate-50 border-y border-slate-200/80">
              <div 
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 custom-page-content"
                dangerouslySetInnerHTML={{ __html: cleanHtmlContent(comoFuncionaPage.contentHtml) }}
              />
            </section>
          );
        }
        return (
          <section className="py-16 bg-slate-50 border-y border-slate-200/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              <div className="text-center space-y-3">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">¿Cómo funciona?</h2>
                <div className="w-12 h-1 bg-purple-600 mx-auto rounded-full" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Card 1: Entrega en el local */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center shadow-xs">
                  <img 
                    src="/images/bubblewash/store_front.jpg" 
                    alt="Local BubbleWash" 
                    className="w-full sm:w-1/2 h-56 object-cover rounded-2xl border border-slate-200 shadow-sm"
                  />
                  <div className="space-y-4 w-full sm:w-1/2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                        <Store size={18} />
                      </div>
                      <h3 className="text-base font-black text-slate-900">Entrega en el local</h3>
                    </div>

                    <ol className="space-y-2 text-xs font-semibold text-slate-700">
                      {[
                        'Traes tus zapatos.',
                        'Los inspeccionamos.',
                        'Tomamos fotografías.',
                        'Creamos tu orden.',
                        'Indicamos fecha de entrega.',
                        'Recibes WhatsApp cuando estén listos.'
                      ].map((step, idx) => (
                        <li key={idx} className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* Card 2: Retiro a domicilio */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center shadow-xs">
                  <div className="space-y-3 w-full sm:w-1/2 order-2 sm:order-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                        <Truck size={18} />
                      </div>
                      <h3 className="text-base font-black text-slate-900">Retiro a domicilio</h3>
                    </div>

                    <ol className="space-y-1.5 text-xs font-semibold text-slate-700">
                      {[
                        'Solicitas retiro.',
                        'Elegimos horario.',
                        'Recogemos tus zapatos.',
                        'Los inspeccionamos.',
                        'Confirmamos el precio.',
                        'Los lavamos.',
                        'Te notificamos.',
                        'Te los entregamos.'
                      ].map((step, idx) => (
                        <li key={idx} className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <img 
                    src="/images/bubblewash/delivery_driver.jpg" 
                    alt="Repartidor BubbleWash" 
                    className="w-full sm:w-1/2 h-56 object-cover rounded-2xl border border-slate-200 shadow-sm order-1 sm:order-2"
                  />
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* 🏷️ SECTION 3: NUESTROS SERVICIOS */}
      <section id="servicios" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Nuestros servicios</h2>
          <div className="w-12 h-1 bg-purple-600 mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {displayServices.map((srv: any) => (
            <div key={srv.id} className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <img 
                  src={srv.imagen} 
                  alt={srv.nombre}
                  className="w-full h-28 object-cover rounded-xl border border-slate-100"
                />
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{srv.nombre}</h3>
                  <div className="mt-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Desde</span>
                    <span className="text-lg font-black text-slate-900">${srv.precio}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-tight">{srv.descripcion}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedServiceDetail(srv)}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Ver detalle
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
          <Info size={14} className="text-purple-600" />
          El precio final puede variar según el estado del calzado.
        </p>
      </section>

      {/* 🌟 SECTION 4: ANTES Y DESPUÉS & ELEGIRNOS & RESEÑAS (DINÁMICO DESDE PÁGINAS DEL ADMIN Y RATINGS) */}
      <section className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {(() => {
            const featuresPage = paginas.find((p: any) => {
              const s = (p.slug || '').toLowerCase();
              const t = (p.title || '').toLowerCase().replace(/<[^>]*>?/gm, '');
              return s === 'por-que-elegirnos' || s === 'por-que-elegirnos-y-resultados' || t.includes('elegirnos') || t.includes('resultados');
            });

            if (featuresPage && featuresPage.contentHtml) {
              return (
                <div 
                  className="w-full custom-features-content"
                  dangerouslySetInnerHTML={{ __html: cleanHtmlContent(featuresPage.contentHtml) }}
                />
              );
            }

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Col 1: Antes y Después */}
                <div className="space-y-4">
                  <div className="text-center lg:text-left">
                    <h3 className="text-base font-black text-slate-900">Antes y después</h3>
                    <div className="w-10 h-1 bg-purple-600 mt-1 rounded-full mx-auto lg:mx-0" />
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-4 space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                      <img 
                        src="/images/bubblewash/before_after.jpg" 
                        alt="Antes y después de lavado" 
                        className="w-full h-52 object-cover"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1">
                        <Footprints size={14} className="text-purple-600" /> Lavado Completo
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock size={14} /> Tiempo: 2 días
                      </span>
                    </div>
                  </div>
                </div>

                {/* Col 2: ¿Por qué elegirnos? */}
                <div className="space-y-4">
                  <div className="text-center lg:text-left">
                    <h3 className="text-base font-black text-slate-900">¿Por qué elegirnos?</h3>
                    <div className="w-10 h-1 bg-purple-600 mt-1 rounded-full mx-auto lg:mx-0" />
                  </div>

                  <ul className="space-y-3 bg-slate-50 border border-slate-200/80 rounded-3xl p-6 text-xs font-bold text-slate-700">
                    {[
                      { icon: ShieldCheck, text: 'Productos profesionales' },
                      { icon: Footprints, text: 'Cuidado de materiales delicados' },
                      { icon: Camera, text: 'Fotos del estado del calzado' },
                      { icon: MessageSquare, text: 'Seguimiento por WhatsApp' },
                      { icon: Truck, text: 'Entrega puntual' },
                      { icon: UserCheck, text: 'Personal capacitado' }
                    ].map((item, idx) => {
                      const IconComp = item.icon;
                      return (
                        <li key={idx} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                            <IconComp size={16} />
                          </div>
                          <span>{item.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Col 3: Lo que dicen nuestros clientes */}
                <div className="space-y-4">
                  <div className="text-center lg:text-left">
                    <h3 className="text-base font-black text-slate-900">Lo que dicen nuestros clientes</h3>
                    <div className="w-10 h-1 bg-purple-600 mt-1 rounded-full mx-auto lg:mx-0" />
                  </div>

                  <div className="space-y-3">
                    {(reviews && reviews.length > 0 ? reviews : [
                      { comment: 'Mis zapatillas quedaron increíbles, como nuevas. ¡Excelente atención!', author: 'Andrés G.', stars: 5 },
                      { comment: 'Muy profesionales y cumplidos con la entrega.', author: 'Mariana P.', stars: 5 },
                      { comment: 'El servicio de retiro a domicilio es súper cómodo.', author: 'Carlos R.', stars: 5 }
                    ]).slice(0, 4).map((rev: any, idx: number) => (
                      <div key={rev.id || idx} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
                        <div className="flex text-amber-400 gap-0.5">
                          {[...Array(rev.stars || 5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                        </div>
                        <p className="text-slate-600 italic font-medium">"{rev.comment || rev.text}"</p>
                        <div className="flex items-center justify-between mt-1">
                          {rev.servicio && (
                            <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                              {rev.servicio}
                            </span>
                          )}
                          <span className="font-black text-slate-900 block text-right ml-auto">— {rev.author}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* 📄 OTRAS PÁGINAS PERSONALIZADAS CREADAS DESDE ADMIN */}
      {paginas && paginas.length > 0 && (
        <div className="space-y-12">
          {paginas
            .filter((p: any) => p.slug !== 'como-funciona' && p.slug !== 'por-que-elegirnos' && p.slug !== 'por-que-elegirnos-y-resultados')
            .map((page: any) => (
              <section key={page.id} className="py-16 bg-slate-50 border-y border-slate-200/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                  {page.title && (
                    <div className="text-center space-y-3">
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{page.title}</h2>
                      <div className="w-12 h-1 bg-purple-600 mx-auto rounded-full" />
                    </div>
                  )}

                  {page.featuredImage && (
                    <div className="max-w-3xl mx-auto overflow-hidden rounded-3xl border border-slate-200 shadow-md">
                      <img src={page.featuredImage} alt={page.title} className="w-full h-64 object-cover" />
                    </div>
                  )}

                  <div 
                    className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-purple-600 custom-page-content"
                    dangerouslySetInnerHTML={{ __html: cleanHtmlContent(page.contentHtml) }}
                  />

                  {page.buttonText && page.buttonUrl && (
                    <div className="text-center pt-4">
                      <a 
                        href={page.buttonUrl} 
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95"
                      >
                        {page.buttonText}
                      </a>
                    </div>
                  )}
                </div>
              </section>
            ))}
        </div>
      )}

      {/* 🗺️ SECTION 5: NUESTRA COBERTURA & FAQS */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cobertura Interactiva con Polígono en Mapa */}
          <CoverageMapPublic
            negocioId={negocio?.id}
            onCheckLocation={() => setShowPickupModal(true)}
          />

          {/* FAQs */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
            <h3 className="text-xl font-black text-slate-900 mb-4">Preguntas frecuentes</h3>

            <div className="space-y-2">
              {FAQS.map((faq, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-4 text-left text-xs font-black text-slate-900 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? <ChevronUp size={16} className="text-purple-600" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>

                  {openFaq === idx && (
                    <div className="p-4 text-xs text-slate-600 font-medium bg-white border-t border-slate-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 💜 PURPLE FOOTER CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-6 text-center md:text-left max-w-xl">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Devuélvele la vida a tus zapatos
            </h2>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button
                onClick={() => setShowPickupModal(true)}
                className="px-6 py-3.5 bg-white text-purple-900 font-black text-xs rounded-xl shadow-lg hover:bg-purple-50 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Truck size={16} />
                Solicitar retiro a domicilio
              </button>
              <button
                onClick={() => setShowInStoreModal(true)}
                className="px-6 py-3.5 bg-purple-800/80 border border-purple-400/40 text-white font-black text-xs rounded-xl hover:bg-purple-800 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Store size={16} />
                Llevar al local
              </button>
            </div>
          </div>

          <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl shrink-0">
            <img src="/images/bubblewash/hero_sneakers.jpg" alt="Zapatillas" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* 🦶 FOOTER */}
      <footer className="bg-white border-t border-slate-200 text-xs text-slate-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black">B</div>
              <span className="font-black text-slate-900 text-base">{nombreNegocio}</span>
            </div>
            <p className="text-slate-500 font-medium">Expertos en limpieza profesional de zapatos.</p>
          </div>

          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-wider mb-3">Contáctanos</h4>
            <ul className="space-y-1.5 font-medium">
              <li>💬 WhatsApp: {whatsappNum}</li>
              {direccion && <li>📍 {direccion}</li>}
              <li>⏰ Atención: {horarioApertura} - {horarioCierre}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-wider mb-3">Enlaces</h4>
            <ul className="space-y-1.5 font-medium">
              <li><a href="#servicios" className="hover:text-purple-600">Servicios</a></li>
              <li><a href="#como-funciona" className="hover:text-purple-600">¿Cómo funciona?</a></li>
              <li><a href="#nosotros" className="hover:text-purple-600">Nosotros</a></li>
              <li><a href="#contacto" className="hover:text-purple-600">Contacto</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-wider mb-3">Pagos Seguros</h4>
            <div className="flex items-center gap-2 font-black text-slate-800">
              <span className="px-2 py-1 bg-slate-100 rounded border">VISA</span>
              <span className="px-2 py-1 bg-slate-100 rounded border">Mastercard</span>
              <span className="px-2 py-1 bg-slate-100 rounded border text-cyan-600">Mercado Pago</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 💬 FLOATING WHATSAPP BUTTON */}
      <a
        href={`https://wa.me/${whatsappNum}?text=Hola%20${encodeURIComponent(nombreNegocio)},%20quisiera%20solicitar%20un%20servicio.`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer"
      >
        <Phone size={24} className="fill-white" />
      </a>

      {/* 🏬 MODAL INFORMATIVO: LLEVAR AL LOCAL */}
      {showInStoreModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowInStoreModal(false)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-black text-xl shrink-0">
                <Store size={26} />
              </div>
              <div>
                <span className="text-xs font-black text-purple-600 uppercase tracking-widest block">{nombreNegocio}</span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Trae tus zapatos directamente al local</h3>
              </div>
            </div>

            <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-100/80 text-xs font-medium text-purple-900 space-y-1">
              <p className="font-bold">No necesitas realizar ninguna reserva.</p>
              <p className="text-purple-700/90">
                Nuestro personal recibirá tus zapatos, realizará la inspección, tomará fotografías y creará tu orden de servicio.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-xs font-medium text-slate-700">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-slate-900 block">Dirección</span>
                  <span>{direccion}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 border-t border-slate-200/60 pt-2.5">
                <Clock size={18} className="text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-slate-900 block">Horarios de Atención</span>
                  <span>Lunes a Sábado: {horarioApertura} - {horarioCierre}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 border-t border-slate-200/60 pt-2.5">
                <Phone size={18} className="text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-slate-900 block">Teléfono / WhatsApp</span>
                  <span>{whatsappNum}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(direccion)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-purple-600/25 transition-all text-center flex items-center justify-center gap-2"
              >
                <MapIcon size={16} />
                Cómo llegar
              </a>
              <a
                href={`https://wa.me/${formatWhatsAppPhone(whatsappNum)}?text=${encodeURIComponent(`Hola ${nombreNegocio}, quisiera consultar para llevar mis zapatos al local.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/25 transition-all text-center flex items-center justify-center gap-2"
              >
                <Phone size={16} />
                Escribir por WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 📦 MODAL DE SOLICITUD DE RETIRO A DOMICILIO */}
      {showPickupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowPickupModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>

            {successOrder ? (
              <div className="text-center space-y-4 py-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-xl font-black text-slate-900">¡Orden Registrada con Éxito!</h3>
                <p className="text-xs text-slate-600 font-medium">
                  Orden <strong className="text-purple-600">#{successOrder.numeroPedido}</strong> creada. Nos comunicaremos contigo por WhatsApp para confirmar los detalles.
                </p>
                <button
                  onClick={() => {
                    setSuccessOrder(null);
                    setShowPickupModal(false);
                  }}
                  className="px-6 py-3 bg-purple-600 text-white font-black text-xs rounded-xl shadow-md w-full"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handlePickupSubmit} className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Truck className="text-purple-600" size={22} />
                    Solicitud de Servicio de Limpieza
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Ingresa tus datos para agendar el retiro o la recepción.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Nombre Completo *</label>
                    <input 
                      type="text" 
                      required 
                      value={form.nombreCliente}
                      onChange={e => setForm({ ...form, nombreCliente: e.target.value })}
                      placeholder="Ej. Carlos Rodríguez"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Teléfono WhatsApp *</label>
                    <input 
                      type="tel" 
                      required 
                      value={form.telefonoCliente}
                      onChange={e => setForm({ ...form, telefonoCliente: e.target.value })}
                      placeholder="Ej. 0991234567"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase text-slate-500">Dirección de Retiro *</label>
                      <button
                        type="button"
                        onClick={() => setShowMapModal(true)}
                        className="text-[10px] font-bold text-purple-600 hover:underline flex items-center gap-1"
                      >
                        📍 Ubicar en Mapa GPS
                      </button>
                    </div>
                    <input 
                      type="text" 
                      required
                      value={form.direccionCliente}
                      onChange={e => setForm({ ...form, direccionCliente: e.target.value })}
                      placeholder="Ej. Av. Amazonas 123 y Colón"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                    />
                  </div>

                  {/* Selector Intuitivo de Horario */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[11px] font-black uppercase text-slate-500 block">Día y Horario Preferido</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'HOY', label: 'HOY' },
                        { id: 'MANANA', label: 'MAÑANA' },
                        { id: 'PASADO', label: 'PASADO' }
                      ].map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDayOption(d.id as any)}
                          className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            selectedDayOption === d.id ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {TIME_SLOTS.map(slot => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlot(slot.id)}
                          className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                            selectedSlot === slot.id ? 'bg-purple-50 border-purple-600 text-purple-900 font-black' : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="block text-[10px] text-purple-600">{slot.icon}</span>
                          <span>{slot.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase rounded-2xl shadow-xl shadow-purple-600/25 transition-all cursor-pointer"
                >
                  {submitting ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Confirmar y Solicitar Retiro'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 🌟 MODAL DETALLE DE SERVICIO */}
      {selectedServiceDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative animate-in zoom-in-95 border border-purple-100">
            <button
              onClick={() => setSelectedServiceDetail(null)}
              className="absolute top-4 right-4 size-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition-all z-10"
            >
              ✕
            </button>

            {selectedServiceDetail.imagen && (
              <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <img 
                  src={selectedServiceDetail.imagen} 
                  alt={selectedServiceDetail.nombre}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-3 right-3 bg-purple-600 text-white font-black text-sm px-3 py-1 rounded-xl shadow-md">
                  ${selectedServiceDetail.precio}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 block">Detalle del Servicio</span>
              <h3 className="text-xl font-black text-slate-900">{selectedServiceDetail.nombre}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedServiceDetail.descripcion || 'Servicio profesional especializado de lavado y cuidado de calzado.'}
              </p>
            </div>

            <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100 space-y-2">
              <p className="text-[11px] font-bold text-purple-950 uppercase flex items-center gap-1.5">
                <Sparkles size={14} className="text-purple-600" /> ¿Qué incluye este servicio?
              </p>
              <ul className="text-xs text-slate-700 space-y-1 font-medium pl-1">
                <li>• Lavado artesanal exterior e interior</li>
                <li>• Desinfección antibacteriana y desodorización</li>
                <li>• Limpieza de pasadores y plantillas</li>
                {selectedServiceDetail.duracion && <li>• Tiempo estimado: {selectedServiceDetail.duracion} min / 24h</li>}
              </ul>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedServiceDetail(null)}
                className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl cursor-pointer transition-all"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const srvName = selectedServiceDetail.nombre;
                  setSelectedServiceDetail(null);
                  setForm(prev => ({ ...prev, notas: `Servicio solicitado: ${srvName}` }));
                  setShowPickupModal(true);
                }}
                className="w-2/3 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-600/20 cursor-pointer transition-all"
              >
                Solicitar Servicio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📱 MODAL CONSULTAR MIS ÓRDENES & PERFIL (ESTILO APP CON OTP) */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative border border-purple-100">
            <button
              onClick={() => setShowLookupModal(false)}
              className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Footprints size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Mis Órdenes & Estado</h3>
                <p className="text-xs text-slate-500">Consulta el avance de tu calzado sin contraseñas</p>
              </div>
            </div>

            {lookupStep === 'PHONE' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600">Ingresa tu número de WhatsApp para consultar tus servicios activos o historial:</p>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={lookupPhone}
                    onChange={e => setLookupPhone(e.target.value)}
                    placeholder="Ej: 0998887777"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!lookupPhone.trim()) return;
                    setSearchingLookup(true);
                    try {
                      const res = await fetch(`/api/shoe-care/orders?phone=${encodeURIComponent(lookupPhone.trim())}&businessId=${negocio?.id || 'sneaker-wash-id'}`);
                      if (res.ok) {
                        const data = await res.json();
                        setCustomerOrders(Array.isArray(data) ? data : []);
                        setLookupStep('ORDERS');
                      }
                    } catch (e) {
                      console.error('Error buscando ordenes:', e);
                    } finally {
                      setSearchingLookup(false);
                    }
                  }}
                  disabled={searchingLookup}
                  className="w-full py-3 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-700 shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {searchingLookup ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Consultar mis Órdenes
                </button>
              </div>
            )}

            {lookupStep === 'ORDERS' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {customerOrders.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 space-y-2">
                    <Footprints size={40} className="mx-auto opacity-30 text-purple-600" />
                    <p className="font-bold text-sm text-slate-700">No encontramos órdenes con este número</p>
                    <p className="text-xs text-slate-500">Si enviaste tu pedido recién, asegúrate de escribir el número correctamente.</p>
                  </div>
                ) : (
                  customerOrders.map(ord => (
                    <div key={ord.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-purple-600">Orden #{ord.numeroPedido}</span>
                          <p className="text-xs font-bold text-slate-900">{ord.extraInfo?.servicioNombre || 'Lavado Completo'}</p>
                        </div>
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-[10px] font-black rounded-lg">
                          {ord.estado.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 font-mono">
                        <div>Fecha: <strong className="text-slate-800">{new Date(ord.createdAt).toLocaleDateString('es-PE')}</strong></div>
                        <div>Total: <strong className="text-purple-700 font-bold">${ord.total?.toFixed(2)}</strong></div>
                      </div>

                      {/* Tracker Visual de Progreso */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>Recibido</span>
                          <span>En Proceso</span>
                          <span>Listo / Entregado</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                          <div
                            className="bg-purple-600 transition-all duration-500"
                            style={{
                              width:
                                ord.estado === 'ENTREGADO'
                                  ? '100%'
                                  : ord.estado === 'LISTO'
                                  ? '85%'
                                  : ord.estado === 'RECIBIDO'
                                  ? '30%'
                                  : '60%',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <button
                  onClick={() => setLookupStep('PHONE')}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Probar con otro número
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAP MODAL */}
      <MapSelectionModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLat={coords.lat}
        initialLng={coords.lng}
        onConfirmLocation={handleConfirmLocationOnMap}
      />

      {/* 📱 BARRA DE NAVEGACIÓN INFERIOR DE LA PLATAFORMA */}
      <PublicMobileNav
        slug={negocio?.slug || 'lavado'}
        tipoNegocio={negocio?.tipoNegocio || 'SHOE_CARE'}
        isLoyaltyEnabled={true}
      />
    </div>
  );
}
