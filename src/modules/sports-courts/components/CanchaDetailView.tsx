'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import HeroCarousel from '@/components/HeroCarousel';
import CanchaInteractionButtons from '@/components/public/CanchaInteractionButtons';
import BookingCalendar from '@/components/BookingCalendar';
import BookingModal from '@/components/BookingModal';
import { 
  ChevronLeft, 
  Clock, 
  Zap, 
  Trophy, 
  Users, 
  MapPin
} from 'lucide-react';

export interface CanchaDetailViewProps {
  negocio: any;
  cancha: any;
}

export default function CanchaDetailView({ negocio, cancha }: CanchaDetailViewProps) {
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const defaultBanner = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=1200';
  const canchaImages = (cancha.imagenes && cancha.imagenes.length > 0)
    ? cancha.imagenes.map((img: any) => img.url)
    : [cancha.imageUrl || defaultBanner];
  const negocioImages = negocio.imagenes?.map((img: any) => img.url) || [];
  const imagesToUse = canchaImages.length > 0 ? canchaImages : negocioImages.length > 0 ? negocioImages : [defaultBanner];

  const canchaNombre = cancha.nombre || cancha.name || 'Cancha';
  const canchaTipo = cancha.tipo || (cancha.extraInfo as any)?.tipo || 'Cancha';
  const precioHora = Number(cancha.precio || cancha.precioHora || negocio.precioHora || 25);
  const capacidad = (cancha.extraInfo as any)?.capacidad || cancha.capacidad || 10;

  const ubicacion = cancha.ubicacion || (negocio.ubicaciones && negocio.ubicaciones[0]);
  const features: string[] = Array.isArray((cancha.extraInfo as any)?.features) ? (cancha.extraInfo as any).features.map((f: any) => (typeof f === 'string' ? f : String(f?.title || f?.content || '')).trim()).filter(Boolean) : [];
  const openNow = (() => {
    const toM = (t: string) => { const m = String(t || '').match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
    const a = toM(negocio.horarioApertura || '08:00');
    const c = toM(negocio.horarioCierre || '23:00');
    if (isNaN(a) || isNaN(c)) return null;
    const d = new Date();
    const n = d.getHours() * 60 + d.getMinutes();
    return c > a ? n >= a && n < c : n >= a || n < c;
  })();

  const getGoogleMapsUrls = (sede: any, neg: any) => {
    let rawUrl = (sede?.mapUrl || '').trim();
    let embedSrc = '';
    let navUrl = '';

    const makeNav = (dest: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;

    if (rawUrl.includes('<iframe')) {
      const match = rawUrl.match(/src=["']([^"']+)["']/);
      if (match && match[1]) rawUrl = match[1];
    }

    if (rawUrl) {
      const coordMatch = rawUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || rawUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        embedSrc = `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&t=&z=16&ie=UTF8&iwloc=addr&output=embed`;
        navUrl = makeNav(`${coordMatch[1]},${coordMatch[2]}`);
        return { embedSrc, navUrl };
      }

      const latMatch = rawUrl.match(/!3d(-?\d+\.\d+)/);
      const lngMatch = rawUrl.match(/!2d(-?\d+\.\d+)/);
      if (latMatch && lngMatch) {
        const lat = latMatch[1];
        const lng = lngMatch[1];
        embedSrc = rawUrl.includes('/maps/embed') ? rawUrl : `https://maps.google.com/maps?q=${lat},${lng}&t=&z=16&ie=UTF8&iwloc=addr&output=embed`;
        navUrl = makeNav(`${lat},${lng}`);
        return { embedSrc, navUrl };
      }

      if (rawUrl.includes('/maps/embed') || rawUrl.includes('output=embed')) {
        embedSrc = rawUrl;
        navUrl = makeNav(`${sede.nombre || neg.nombre}, ${neg.nombre}`);
        return { embedSrc, navUrl };
      }
    }

    const queryParts = [neg.nombre];
    if (sede?.nombre && sede.nombre !== neg.nombre) queryParts.push(sede.nombre);
    if (sede?.direccion) queryParts.push(sede.direccion);
    else if (neg.direccion) queryParts.push(neg.direccion);
    if (neg.ciudad) queryParts.push(neg.ciudad);

    const queryText = queryParts.join(', ').replace(/, ,/g, ',').trim();
    embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(queryText)}&t=&z=16&ie=UTF8&iwloc=addr&output=embed`;
    navUrl = makeNav(queryText);

    return { embedSrc, navUrl };
  };

  const { embedSrc, navUrl } = ubicacion ? getGoogleMapsUrls(ubicacion, negocio) : { embedSrc: null, navUrl: null };

  const canchaParaBooking = {
    ...cancha,
    id: cancha.id,
    nombre: canchaNombre,
    tipo: canchaTipo,
    capacidad: capacidad,
    precioHora: precioHora
  };

  const handleSelectSlot = (date: Date, hour: string, canchaId: string, duracion: number = 1, discountPercentage: number = 0) => {
    const totalBase = precioHora * duracion;
    const totalConDescuento = totalBase * (1 - discountPercentage / 100);

    setSelectedBooking({
      date,
      hour,
      canchaId: cancha.id,
      duracion,
      canchaNombre,
      precio: totalConDescuento,
      precioBase: totalBase,
      precioHora,
      slug: negocio.slug,
      pagosActivos: negocio.pagosActivos,
      pagoPorcentaje: negocio.pagoPorcentaje,
      whatsapp: negocio.whatsapp
    });
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-emerald-500/30" style={{ backgroundColor: '#07090f' }}>
      
      {/* Ocultar barra superior e inferior del sitio publico en la vista de detalle de cancha */}
      <style dangerouslySetInnerHTML={{ __html: `
        nav.fixed.top-0,
        nav.fixed.bottom-0,
        header.fixed.top-0,
        header.sticky.top-0:not(.cancha-native-header) {
            display: none !important;
        }
        header.cancha-native-header {
            background-color: #07090f !important;
            color: #ffffff !important;
        }
      ` }} />

      {/* STICKY TOP HEADER - NATIVE STYLE */}
      <header className="cancha-native-header sticky top-0 z-[100] h-14 flex items-center bg-[#07090f] backdrop-blur-xl border-b border-white/10 text-white">
        <div className="max-w-xl mx-auto w-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/${negocio.slug}`}
              className="size-9 rounded-full bg-white/5 active:bg-white/10 flex items-center justify-center transition-all border border-white/10"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </Link>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide leading-none mb-0.5">{negocio.nombre}</span>
              <h1 className="font-bold text-sm uppercase tracking-tight leading-none">{canchaNombre}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <CanchaInteractionButtons
              canchaId={cancha.id}
              canchaNombre={canchaNombre}
              negocioNombre={negocio.nombre}
            />
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto pb-10 overflow-x-hidden">
        
        {/* HERO CAROUSEL - COMPACT & PREMIUM */}
        <div className="px-4 pt-4">
          <div className="relative aspect-[16/10] rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
            <HeroCarousel images={imagesToUse} opacityActive="opacity-100" />
            
            {/* Status Label Overlay */}
            <div className="absolute top-4 left-4 z-20">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wide">Disponible</span>
              </div>
            </div>

            {/* Type Label Overlay */}
            <div className="absolute bottom-4 left-4 z-20">
              <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
                <span className="text-xs font-bold text-white uppercase tracking-wide">{canchaTipo}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8 text-left">
          {/* STATS STRIP - NATIVE GRID */}
          <div className="grid grid-cols-2 gap-3">
            {/* Price Píldora */}
            <div className="col-span-1 bg-[#11141d] border border-white/5 rounded-3xl p-5 flex flex-col gap-1 relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 size-16 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide ">Precio hora</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white tracking-tight">${precioHora}</span>
              </div>
            </div>

            {/* Capacity Píldora */}
            <div className="col-span-1 bg-[#11141d] border border-white/5 rounded-3xl p-5 flex flex-col gap-1 relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 size-16 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide ">Capacidad</span>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-500" />
                <span className="text-2xl font-bold text-white tracking-tight ">{capacidad} JUG.</span>
              </div>
            </div>

            {/* Schedule Píldora - Full Width */}
            <div className="col-span-2 bg-[#11141d] border border-white/5 rounded-2xl p-4 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-500">
                  <Clock size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Horario de atención</span>
                  <span className="text-xs font-bold text-white uppercase">{negocio.horarioApertura || '08:00'} - {negocio.horarioCierre || '23:00'}</span>
                </div>
              </div>
              {openNow !== null && (
                <div className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-tight ${openNow ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-400'}`}>
                  {openNow ? 'Abierto ahora' : 'Cerrado ahora'}
                </div>
              )}
            </div>
          </div>

          {/* Características reales de la cancha (las que cargó el negocio) */}
          {features.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-wide px-1">Características</h3>
              <div className="flex flex-wrap gap-2">
                {features.map((f: string) => (
                  <span key={f} className="px-3 py-1.5 rounded-xl bg-[#11141d] border border-white/5 text-xs font-semibold text-slate-200">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* BOOKING CALENDAR DIRECT FOR COURTS - NO PROFESSIONALS REQUIRED */}
          <section id="reservar" className="space-y-6 pt-2">
            <BookingCalendar
              canchas={[canchaParaBooking]}
              horarioApertura={negocio.horarioApertura || "08:00"}
              horarioCierre={negocio.horarioCierre || "23:00"}
              onSelectSlot={handleSelectSlot}
              darkMode={true}
            />

            <BookingModal
              isOpen={!!selectedBooking}
              onClose={() => setSelectedBooking(null)}
              bookingData={selectedBooking}
            />
          </section>
          
          {/* UBICACION - NATIVE MAP PREVIEW */}
          {ubicacion && (
            <section className="space-y-4 pt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">Cómo llegar</h3>
              <div className="bg-[#11141d] border border-white/5 rounded-3xl overflow-hidden group">
                <div className="h-40 relative">
                  <iframe
                    src={embedSrc || ''}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    className="grayscale invert opacity-30 contrast-125"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#11141d] to-transparent" />
                  <div className="absolute bottom-5 left-6">
                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">{ubicacion.nombre || negocio.nombre}</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase">{ubicacion.direccion || negocio.direccion || 'Quito, Ecuador'}</p>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-2">
                  {navUrl && (
                    <a 
                      href={navUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="w-full h-14 bg-white/5 active:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-xs font-bold text-white uppercase tracking-wide transition-all"
                    >
                      <MapPin size={16} className="text-emerald-500" /> GOOGLE MAPS
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
