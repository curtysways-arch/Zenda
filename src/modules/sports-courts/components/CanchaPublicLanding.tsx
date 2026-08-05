'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import HeroCarousel from '@/components/HeroCarousel';
import { 
  Rocket, 
  Trophy, 
  Clock, 
  Star, 
  ChevronRight, 
  MapPin, 
  Calendar, 
  Sparkles, 
  Zap, 
  User, 
  Home, 
  GraduationCap, 
  Check,
  Coffee,
  Car,
  Wifi,
  Shirt,
  ShoppingBag,
  ExternalLink,
  Users,
  Award
} from 'lucide-react';

export interface CanchaPublicLandingProps {
  negocio: any;
  canchas: any[];
  torneos?: any[];
  sedes?: any[];
  paginasPersonalizadas?: any[];
}

export default function CanchaPublicLanding({
  negocio,
  canchas = [],
  torneos = [],
  sedes = [],
  paginasPersonalizadas = []
}: CanchaPublicLandingProps) {
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const defaultBanner = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=1200';

  // Extraer las imágenes subidas por el usuario en el admin
  const userImages: string[] = [];
  if (negocio.imagenes && Array.isArray(negocio.imagenes)) {
    negocio.imagenes.forEach((img: any) => {
      const url = typeof img === 'string' ? img : img.url;
      if (url && !userImages.includes(url)) userImages.push(url);
    });
  }

  const heroImages = userImages.length > 0 
    ? userImages 
    : [
        negocio.bannerUrl || defaultBanner,
        'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=1200',
        'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&q=80&w=1200'
      ];

  // Cambiar foto activa del hero cada 4 segundos
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveHeroIndex(prev => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const canchasConDisponibilidad = (canchas && canchas.length > 0) ? canchas : (negocio.services || [
    { id: 'c1', nombre: 'CANCHA ELITE', tipo: 'FÚTBOL 7', horasDisponiblesHoy: 15, precioHora: 25, imageUrl: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&q=80&w=1200' },
    { id: 'c2', nombre: 'CANCHA PREMIUM', tipo: 'FÚTBOL 7', horasDisponiblesHoy: 15, precioHora: 45, imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200' },
    { id: 'c3', nombre: 'CANCHA BASQUET', tipo: 'BÁSQUET', horasDisponiblesHoy: 15, precioHora: 35, imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=1200' },
  ]);

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white font-sans pb-32 relative overflow-x-hidden">
      {/* 1. TOP BAR DEMO (AMBER) */}
      <div className="bg-amber-500 text-slate-950 px-4 py-2 flex items-center justify-between gap-2 shadow-md z-[60] relative">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="size-4 animate-bounce" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">
              ESTÁS VIENDO UNA DEMO DEL SISTEMA
            </span>
          </div>
          <Link
            href="/register"
            className="bg-white text-slate-950 px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-md"
          >
            CREAR MI NEGOCIO GRATIS
          </Link>
        </div>
      </div>

      {/* 2. HEADER CON LOGO, SEDE Y ACCESOS RÁPIDOS */}
      <header className="sticky top-0 z-50 bg-[#0a0f1d]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo + Nombre */}
          <div className="flex items-center gap-3">
            {negocio.logoUrl ? (
              <img
                src={negocio.logoUrl}
                alt={negocio.nombre}
                className="size-10 rounded-xl object-contain bg-white/10 p-1 shadow-sm border border-slate-800"
              />
            ) : (
              <div className="bg-emerald-500 p-2 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold">
                <Trophy className="size-5" />
              </div>
            )}
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase italic">
              {negocio.nombre || 'CANCHA LOS CAMPEONES'}
            </h1>
          </div>

          {/* Selector de Sede Ubicación (Middle Pill) */}
          <div className="hidden md:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-4 py-1.5 rounded-full text-xs font-black text-slate-300">
            <MapPin className="size-3.5 text-emerald-400" />
            <span>{negocio.ciudad || negocio.direccion || 'SIMÓN BOLÍVAR'}</span>
          </div>

          {/* Botones de Acceso Rápido */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={`/${negocio.slug}/mis-reservas`}
              className="bg-white text-slate-950 hover:bg-slate-100 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all"
            >
              <Calendar className="size-4" />
              <span className="hidden sm:inline">MIS RESERVAS</span>
              <span className="bg-emerald-500 text-slate-950 size-4 rounded-full text-[10px] font-black flex items-center justify-center">0</span>
            </Link>

            <button className="p-2 text-slate-400 hover:text-white relative rounded-full bg-slate-900 border border-slate-800">
              <span className="absolute top-1.5 right-1.5 size-2 bg-emerald-400 rounded-full border-2 border-slate-950" />
              <Clock className="size-4 sm:size-5" />
            </button>
            <Link
              href={`/${negocio.slug}/perfil`}
              className="size-9 sm:size-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 text-emerald-400 hover:scale-105 transition-transform"
            >
              <User className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION CON CAROUSEL DE TARJETAS FLOTANTES */}
      <section className="relative px-4 py-6 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 aspect-[4/5] md:aspect-[21/9] flex flex-col justify-between shadow-2xl border border-white/10 group/hero">
          <HeroCarousel images={heroImages} activeIndex={activeHeroIndex} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#0a0f1d]" />

          {/* Título & Subtítulo Hero */}
          <div className="relative z-10 h-full flex flex-col pt-10 md:pt-16">
            <div className="px-6 text-center space-y-3 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tighter drop-shadow-2xl uppercase italic">
                {negocio.heroTitulo || 'DONDE EL JUEGO SE VIVE AL MÁXIMO'}
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm font-semibold max-w-xl mx-auto opacity-90 italic leading-relaxed">
                "{negocio.heroSubtitulo || 'Instalaciones de alto nivel diseñadas para vivir el deporte al máximo.'}"
              </p>
            </div>

            <div className="flex-grow" />

            {/* Carrusel Flotante de Canchas en la Parte Inferior del Hero */}
            <div className="w-full pb-6 md:pb-10 z-20">
              <div
                className="flex w-full overflow-x-auto snap-x scrollbar-hide gap-3 md:gap-5 pb-4 px-6 justify-start md:justify-center"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {canchasConDisponibilidad.map((cancha: any) => {
                  const horasLibres = cancha.horasDisponiblesHoy ?? 15;
                  return (
                    <Link
                      key={cancha.id}
                      href={`/${negocio.slug}/servicio/${cancha.id}`}
                      className="snap-center shrink-0 w-[220px] sm:w-[260px] bg-white/95 hover:bg-white backdrop-blur-2xl p-4 sm:p-5 rounded-[2rem] shadow-2xl hover:shadow-emerald-500/30 transition-all duration-500 transform hover:-translate-y-1 flex items-center justify-between border border-white/20 group"
                    >
                      <div className="text-left w-2/3">
                        <h4 className="font-black text-slate-950 uppercase tracking-tight text-xs sm:text-sm truncate group-hover:text-emerald-700 transition-colors">
                          {cancha.nombre}
                        </h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate mt-0.5">
                          {cancha.tipo || 'FÚTBOL 7'}
                        </p>
                      </div>

                      <div className="px-2.5 py-1.5 rounded-2xl bg-emerald-50 text-emerald-600 flex flex-col items-center justify-center min-w-[3.2rem] border border-emerald-100 shadow-inner">
                        <span className="text-base sm:text-xl font-black leading-none">{horasLibres}</span>
                        <span className="text-[7px] uppercase font-black tracking-widest leading-tight text-center mt-0.5">
                          HORAS<br />LIBRES
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Indicadores de Paginación Hero (-- -- --) */}
              <div className="flex justify-center gap-1.5 mt-2">
                {heroImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveHeroIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === activeHeroIndex ? 'w-8 bg-emerald-400' : 'w-2 bg-white/30 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CATÁLOGO DE CANCHAS */}
      <section id="canchas" className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-0.5 w-6 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">
              CATÁLOGO
            </span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase">
            Nuestras Canchas
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Selecciona el escenario perfecto para tu próximo partido.
          </p>
        </div>

        {/* Grilla de Canchas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {canchasConDisponibilidad.map((cancha: any) => {
            const extra = typeof cancha.extraInfo === 'string' ? JSON.parse(cancha.extraInfo) : (cancha.extraInfo || {});
            const canchaTipo = cancha.tipo || extra.tipo || 'FÚTBOL 7';
            const precioDisplay = cancha.precio || cancha.precioHora || negocio.precioHora || 25;
            const horasDisponibles = cancha.horasDisponiblesHoy ?? 15;

            return (
              <Link
                key={cancha.id}
                href={`/${negocio.slug}/servicio/${cancha.id}`}
                className="group bg-slate-900/90 rounded-[2.5rem] overflow-hidden border border-slate-800 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 flex flex-col"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
                  <img
                    src={cancha.imageUrl || cancha.imagenUrl || defaultBanner}
                    alt={cancha.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-slate-950/90 backdrop-blur-md text-emerald-400 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-emerald-500/30 shadow-lg">
                    {canchaTipo}
                  </div>
                  <div className="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xl border border-slate-800">
                    <Star className="size-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-black">4.9</span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-black text-xl text-white group-hover:text-emerald-400 transition-colors uppercase italic tracking-tight">
                        {cancha.nombre}
                      </h4>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Desde</span>
                        <span className="text-2xl font-black text-emerald-400">
                          ${Number(precioDisplay).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Clock className="size-3" />
                        {horasDisponibles > 0 ? `${horasDisponibles} Horas libres hoy` : 'Agotado hoy'}
                      </span>
                    </div>

                    <div className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 bg-emerald-500/10 group-hover:bg-emerald-500 text-emerald-400 group-hover:text-slate-950 transition-all duration-300 shadow-inner">
                      <Calendar className="size-4" />
                      <span>Agendar Horario</span>
                      <ChevronRight className="size-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. ACADEMIA & CURSOS */}
      <section id="academia" className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-0.5 w-6 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">
              FORMACIÓN
            </span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase">
            ACADEMIA & CURSOS
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Apúntate a nuestras escuelas de entrenamiento y mejora tu juego.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/90 rounded-[2.5rem] overflow-hidden border border-slate-800 p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                <img 
                  src="https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&q=80&w=800" 
                  alt="Escuela de Verano"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-emerald-500 text-slate-950 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  PAGO MENSUAL
                </div>
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 border border-slate-800">
                  <Users size={12} className="text-emerald-400" />
                  <span>3/20</span>
                </div>
              </div>

              <div>
                <h4 className="text-xl font-black text-white italic uppercase tracking-tight">ESCUELA DE VERANO</h4>
                <p className="text-xs text-emerald-400 italic font-semibold mt-0.5">"¡Donde nacen las futuras estrellas!"</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <span className="text-[9px] font-black text-slate-500 uppercase block">EDADES</span>
                  <span className="text-xs font-bold text-slate-200">5 - 12 años</span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <span className="text-[9px] font-black text-slate-500 uppercase block">INSCRITOS</span>
                  <span className="text-xs font-bold text-slate-200">3 alumnos</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-500 uppercase block">HORARIOS DE CLASE</span>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 rounded-xl text-xs font-bold">Lun • 14:00</span>
                  <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 rounded-xl text-xs font-bold">Mar • 14:00</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">INVERSIÓN</span>
                <span className="text-2xl font-black text-white">$30</span>
              </div>
              <button className="bg-white text-slate-950 hover:bg-slate-100 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all">
                <span>MÁS DETALLES</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. NUESTRAS SEDES */}
      <section id="sedes" className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-0.5 w-6 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">
              DÓNDE ESTAMOS
            </span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase">
            Nuestras Sedes
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Encuéntranos en cualquiera de nuestras ubicaciones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/90 rounded-[2.5rem] overflow-hidden border border-slate-800 p-6 space-y-4">
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
              <img 
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800" 
                alt="Sede Simón Bolívar"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 border border-slate-800">
                <span>Maps</span>
                <ExternalLink size={12} className="text-emerald-400" />
              </div>
            </div>

            <h4 className="text-lg font-black text-white italic uppercase tracking-tight">SIMÓN BOLÍVAR</h4>

            <a 
              href="https://maps.google.com" 
              target="_blank" 
              rel="noreferrer"
              className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <MapPin size={16} />
              <span>VER EN GOOGLE MAPS</span>
            </a>
          </div>
        </div>
      </section>

      {/* 7. EXPERIENCIA DE PRIMERA (SERVICIOS) */}
      <section id="servicios" className="max-w-7xl mx-auto px-6 py-10 space-y-8 border-t border-white/5">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-0.5 w-6 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">
              SERVICIOS
            </span>
            <div className="h-0.5 w-6 bg-emerald-500 rounded-full" />
          </div>
          <h3 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase">
            Experiencia de Primera
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            Todo lo que necesitas para tu comodidad antes y después del pitazo final
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 pt-4">
          {[
            { icon: Coffee, label: 'CAFETERÍA' },
            { icon: Car, label: 'PARKING' },
            { icon: Wifi, label: 'WIFI' },
            { icon: Shirt, label: 'VESTIDORES' },
            { icon: ShoppingBag, label: 'TIENDA' }
          ].map((item) => {
            const IconComp = item.icon;
            return (
              <div key={item.label} className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="size-16 rounded-full bg-emerald-950/40 border border-emerald-500/30 group-hover:border-emerald-400 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-all shadow-lg shadow-emerald-950/50">
                  <IconComp size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-emerald-400 transition-colors">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. NOVEDADES & EVENTOS */}
      <section id="eventos" className="max-w-7xl mx-auto px-6 py-10 space-y-8 border-t border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-0.5 w-6 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">
              EXCLUSIVOS
            </span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase">
            NOVEDADES & EVENTOS
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            No te pierdas las últimas noticias, torneos relámpago y contenido exclusivo que tenemos preparado para ti.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/90 rounded-[2.5rem] overflow-hidden border border-slate-800 p-6 space-y-6">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
              <img 
                src="https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&q=80&w=800" 
                alt="Torneo Relámpago"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-xl border border-slate-800 text-center leading-tight">
                MAR<br /><span className="text-base font-black">29</span>
              </div>
              <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                ACTIVO
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all">
                <span>VER DETALLES</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. PÁGINAS PERSONALIZADAS */}
      {paginasPersonalizadas && paginasPersonalizadas.length > 0 && (
        <section id="paginas" className="max-w-7xl mx-auto px-6 py-10 space-y-8 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-6 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">
              INFORMACIÓN & GUÍAS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {paginasPersonalizadas.map((pagina) => (
              <div
                key={pagina.id}
                className="bg-slate-900/90 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl space-y-6 text-slate-100 font-sans custom-page-content"
                dangerouslySetInnerHTML={{ __html: pagina.contentHtml || '' }}
              />
            ))}
          </div>
        </section>
      )}

      {/* 10. BARRA DE NAVEGACIÓN MÓVIL INFERIOR (TABS) */}
      <nav className="fixed bottom-0 left-0 right-0 z-[150] px-6 pb-6 pt-2 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/95 to-transparent pointer-events-none md:hidden">
        <div className="max-w-md mx-auto h-16 bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] flex items-center justify-around px-4 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] pointer-events-auto">
          <Link href={`/${negocio.slug}`} className="flex flex-col items-center justify-center gap-1 text-emerald-400">
            <div className="relative scale-110 -translate-y-0.5">
              <div className="size-1 w-6 bg-emerald-400 rounded-full absolute -top-2.5 left-1/2 -translate-x-1/2" />
              <Home className="size-5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">INICIO</span>
          </Link>

          <Link href={`/${negocio.slug}/mis-reservas`} className="flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white">
            <Calendar className="size-5" />
            <span className="text-[9px] font-black uppercase tracking-widest">RESERVAS</span>
          </Link>

          <Link href={`/${negocio.slug}/mis-reservas?tab=academia`} className="flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white">
            <GraduationCap className="size-5" />
            <span className="text-[9px] font-black uppercase tracking-widest">ACADEMIA</span>
          </Link>

          <Link href={`/${negocio.slug}/perfil`} className="flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white">
            <User className="size-5" />
            <span className="text-[9px] font-black uppercase tracking-widest">PERFIL</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
