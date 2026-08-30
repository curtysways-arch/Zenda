"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, Clock, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResolvedHeroItem } from '@/lib/landingContentResolver';

interface UniversalHeroCarouselProps {
  heroItems: ResolvedHeroItem[];
  negocio: any;
  isOpenNow?: boolean;
  defaultImages?: string[];
}

export default function UniversalHeroCarousel({
  heroItems,
  negocio,
  isOpenNow = true,
  defaultImages = []
}: UniversalHeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Normalizar items: Si no hay heroItems resolutivos, crear un ítem por defecto usando defaultImages o datos legacy
  const items: ResolvedHeroItem[] = (heroItems && heroItems.length > 0)
    ? heroItems
    : (defaultImages && defaultImages.length > 0
        ? defaultImages.map((imgUrl, i) => ({
            id: `fallback-${i}`,
            businessId: negocio?.id || '',
            type: 'IMAGE',
            sourceType: 'CUSTOM_IMAGE',
            sourceId: null,
            image: imgUrl,
            mobileImage: null,
            title: null,
            description: null,
            price: null,
            originalPrice: null,
            button: {
              enabled: true,
              text: null,
              actionType: 'BOOK_SERVICE',
              actionValue: null
            },
            position: i,
            priority: 0
          }))
        : [{
            id: 'fallback-default',
            businessId: negocio?.id || '',
            type: 'IMAGE',
            sourceType: 'CUSTOM_IMAGE',
            sourceId: null,
            image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=1200',
            mobileImage: null,
            title: null,
            description: null,
            price: null,
            originalPrice: null,
            button: {
              enabled: true,
              text: null,
              actionType: 'BOOK_SERVICE',
              actionValue: null
            },
            position: 0,
            priority: 0
          }]);

  // Rotación automática cada 4.5 segundos si hay más de 1 slide
  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [items.length]);

  const activeItem = items[currentIndex] || items[0];

  const primaryColor = negocio?.colorPrimario || 'var(--primary)';
  const slug = negocio?.slug || '';
  const isSports = (negocio as any)?.tipoNegocio === 'SPORTS_COURTS';

  // Resolver texto de título y descripción
  const displayBadge = `BIENVENIDO A ${(negocio?.nombre || '').split(' - ')[0].toUpperCase()}`;
  const displayTitle = activeItem.title || negocio?.heroTitulo || `BIENVENIDO A ${(negocio?.nombre || '').split(' - ')[0].toUpperCase()}`;
  const displayDescription = activeItem.description || negocio?.heroSubtitulo || 'RESERVA TU CITA DE FORMA ONLINE EN SENCILLOS PASOS.';

  // Resolver acción de botón y URL
  const button = activeItem.button || { enabled: true, actionType: 'BOOK_SERVICE' };
  const buttonEnabled = button.enabled !== false;
  const defaultBtnText = isSports ? 'Elegir cancha' : 'Elegir servicio';
  const buttonText = button.text || defaultBtnText;

  const getButtonHref = () => {
    const action = button.actionType;
    const val = (button.actionValue || '').trim();

    // 1. Enlace Externo o URL personalizada
    if (action === 'EXTERNAL_URL' || action === 'CUSTOM_URL') {
      if (val) return val;
    }

    // 2. Ruta Interna personalizada
    if (action === 'INTERNAL_URL') {
      if (val) return val.startsWith('/') ? val : `/${val}`;
    }

    // 3. Ir a Promoción / Promociones
    if (action === 'PROMOTION' || action === 'VIEW_PROMO') {
      if (val) return `/${slug}/promo/${val}`;
      return `/${slug}#promociones`;
    }

    // 4. Ir a Producto / Productos
    if (action === 'PRODUCT' || action === 'VIEW_PRODUCT') {
      if (val) return `/${slug}#producto-${val}`;
      return `/${slug}#productos`;
    }

    // 5. Ir a Servicio / Servicios
    if (action === 'SERVICE' || action === 'BOOK_SERVICE') {
      if (val) return `/${slug}/servicio/${val}`;
      return `/${slug}/servicios`;
    }

    // 6. Agendar Cancha
    if (action === 'BOOK_COURT') {
      return `/${slug}/canchas`;
    }

    // 7. Combos
    if (action === 'COMBO') {
      if (val) return `/${slug}#combo-${val}`;
      return `/${slug}#combos`;
    }

    // 8. Categorías
    if (action === 'CATEGORY') {
      if (val) return `/${slug}#categoria-${val}`;
      return `/${slug}#categorias`;
    }

    // Fallback si se proveyó una URL/ruta en actionValue
    if (val) {
      if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/')) {
        return val;
      }
    }

    return isSports ? `/${slug}/canchas` : `/${slug}/servicios`;
  };

  const buttonHref = getButtonHref();
  const isExternalUrl = buttonHref.startsWith('http://') || buttonHref.startsWith('https://');

  return (
    <div className="relative w-full aspect-[16/13] xs:aspect-[16/11] sm:aspect-[16/10] max-h-[380px] rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100/50 group">
      {/* 1. Carrusel de Imágenes de Fondo */}
      <div className="absolute inset-0 w-full h-full">
        {items.map((item, idx) => {
          const isActive = idx === currentIndex;
          return (
            <img
              key={item.id + idx}
              src={item.image}
              alt={item.title || `Banner ${idx + 1}`}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out",
                isActive ? "opacity-100 scale-105 z-0" : "opacity-0 scale-100 -z-10"
              )}
            />
          );
        })}
      </div>

      {/* 2. Capa Gradiente para Legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-black/75 z-10 pointer-events-none" />

      {/* 3. Contenido Superpuesto Dinámico */}
      <div className="absolute inset-0 p-4 z-20 flex flex-col justify-between items-center text-center">
        
        {/* Bloque Superior/Medio: Título, Descripción y Distintivo */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-2.5 my-auto">
          {displayBadge && (
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md border border-white/20 rounded-full mx-auto">
              <span className="text-[7.5px] xs:text-[8px] font-black text-white uppercase tracking-[0.2em] text-center">
                {displayBadge}
              </span>
            </div>
          )}

          {displayTitle && (
            <h2 className="text-xl xs:text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-md leading-tight text-center mx-auto max-w-[290px] xs:max-w-[350px]">
              {displayTitle}
            </h2>
          )}

          {displayDescription && (
            <p className="text-[9px] xs:text-[10px] font-bold text-white/90 uppercase tracking-[0.12em] leading-relaxed drop-shadow-md max-w-[310px] mx-auto text-center">
              {displayDescription}
            </p>
          )}

          {/* Etiqueta de Precio Dinámica */}
          {(activeItem.priceLabel || (activeItem.price !== null && activeItem.price !== undefined)) && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/90 text-slate-950 font-black rounded-full text-xs shadow-md mt-1 animate-bounce">
              <Tag size={12} className="shrink-0" />
              <span>{activeItem.priceLabel || `$${Number(activeItem.price).toFixed(2)}`}</span>
              {(activeItem.previousPrice || activeItem.originalPrice) && (
                <span className="line-through text-slate-700 text-[10px] font-semibold">
                  ${Number(activeItem.previousPrice || activeItem.originalPrice).toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bloque Inferior: Horarios y Botón de Acción Dinámico */}
        <div className="w-full flex flex-col items-center space-y-2 pb-1">
          {/* Horario de Atención */}
          <div className="inline-flex items-center justify-center gap-2 px-3.5 py-0.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-full mx-auto text-center">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse shrink-0",
              isOpenNow ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]"
            )} />
            <span className="text-[7.5px] font-black text-white uppercase tracking-[0.2em] flex items-center justify-center gap-1 text-center">
              <span className={cn(isOpenNow ? "text-emerald-400" : "text-rose-400")}>
                {isOpenNow ? 'ABIERTO' : 'CERRADO'}
              </span>
              <span className="text-white/30 font-normal">|</span>
              <span>{negocio?.horarioApertura || '08:00'} - {negocio?.horarioCierre || '20:00'}</span>
            </span>
          </div>

          {/* Botón Personalizado Dinámico (Sólo si buttonEnabled es true) */}
          {buttonEnabled && (
            <div className="flex flex-col items-center w-full">
              {isExternalUrl ? (
                <a
                  href={buttonHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-7 py-2.5 text-white rounded-full font-black text-[9px] xs:text-[10px] uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all mx-auto"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 10px 20px ${primaryColor}35`
                  }}
                >
                  {buttonText}
                  <ChevronRight size={12} strokeWidth={3} />
                </a>
              ) : (
                <Link
                  href={buttonHref}
                  className="inline-flex items-center justify-center gap-2 px-7 py-2.5 text-white rounded-full font-black text-[9px] xs:text-[10px] uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all mx-auto"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 10px 20px ${primaryColor}35`
                  }}
                >
                  {buttonText}
                  <ChevronRight size={12} strokeWidth={3} />
                </Link>
              )}
              <p className="text-[7.5px] font-bold text-white/50 flex items-center justify-center gap-1 mt-1 tracking-wide text-center mx-auto">
                <Clock size={9} />
                Reserva en menos de un minuto.
              </p>
            </div>
          )}
        </div>

        {/* 4. Puntos Indicadores del Carrusel (Navegación Manual) */}
        {items.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 z-30 flex items-center justify-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                aria-label={`Ir al banner ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 border-0 p-0 cursor-pointer",
                  i === currentIndex ? "w-6 bg-white shadow-sm" : "w-1.5 bg-white/40 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
