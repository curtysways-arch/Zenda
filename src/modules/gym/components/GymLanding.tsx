'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Dumbbell, CheckCircle, ArrowRight, Shield, Zap, Flame, Award, 
  Clock, MapPin, Phone, Star, Sparkles, User, Calendar, QrCode, X, ChevronRight, Check, Users,
  Building2, Layers, Tag
} from 'lucide-react';

interface GymLandingProps {
  negocio: any;
  initialPlans?: any[];
  initialPromotions?: any[];
  initialGymAreas?: any[];
  initialEquipment?: any[];
}

export default function GymLanding({
  negocio,
  initialPlans = [],
  initialPromotions = [],
  initialGymAreas = [],
  initialEquipment = []
}: GymLandingProps) {
  const [plans, setPlans] = useState<any[]>(initialPlans);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(initialPlans.length === 0);
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(true);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('TODOS');
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState<boolean>(false);
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'success'>('form');
  const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchasedMembership, setPurchasedMembership] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const primaryColor = negocio?.colorPrimario || '#ea580c';
  const config = typeof negocio?.configuracion === 'string'
    ? (() => { try { return JSON.parse(negocio.configuracion); } catch { return {}; } })()
    : negocio?.configuracion || {};

  const gymLanding = config?.gymLandingConfig || {};
  const heroBannerUrl = gymLanding.heroBannerUrl || config?.heroBannerUrl || negocio?.bannerUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1920&auto=format&fit=crop';
  const heroBadge = gymLanding.heroBadge || 'Gimnasio & Centro Fitness Oficial';
  const heroTitulo = gymLanding.heroTitulo || negocio?.heroTitulo || config?.heroTitulo || 'TU MEJOR VERSIÓN COMIENZA AQUÍ';
  const heroSubtitulo = gymLanding.heroSubtitulo || negocio?.heroSubtitulo || config?.heroSubtitulo || 'Entrena con los mejores equipos, clases exclusivas y acceso inteligente por QR.';
  const heroStats = (gymLanding.heroStats && Array.isArray(gymLanding.heroStats) && gymLanding.heroStats.length > 0) ? gymLanding.heroStats : [
    { value: '24/7', label: 'Acceso Inteligente' },
    { value: '+50', label: 'Máquinas Pro' },
    { value: '100%', label: 'Sin Contratos Ocultos' }
  ];
  const heroCtaPrimary = gymLanding.heroCtaPrimary || 'Ver Membresías';
  const heroCtaSecondary = gymLanding.heroCtaSecondary || 'Conocer el Gimnasio';

  const facilitiesBadge = gymLanding.facilitiesBadge || 'Instalaciones de Primer Nivel';
  const facilitiesTitle = gymLanding.facilitiesTitle || 'DISEÑADO PARA TU RENDIMIENTO';
  const gymDescription = gymLanding.facilitiesDescription || config?.gymDescription || 'El centro fitness definitivo diseñado para transformar tu rendimiento físico con tecnología de vanguardia y comunidad apasionada.';

  const defaultBenefits = [
    'Acceso 24/7 con código QR digital en tu móvil',
    'Área completa de peso libre y fuerza',
    'Zona cardiovascular de última generación',
    'Vestidores premium con duchas y lockers',
    'Clases grupales dinámicas incluidas',
    'Seguimiento y evaluación física periódica'
  ];
  const beneficios = (gymLanding.benefits && Array.isArray(gymLanding.benefits) && gymLanding.benefits.length > 0)
    ? gymLanding.benefits
    : ((config?.beneficios && config.beneficios.length > 0) ? config.beneficios : defaultBenefits);

  const defaultFeatureCards = [
    {
      id: 'card-1',
      title: 'Acceso con Tu QR',
      description: 'Ingreso automático sin filas ni tarjetas físicas.',
      icon: 'qr'
    },
    {
      id: 'card-2',
      title: 'Club de Beneficios',
      description: 'Gana puntos y premios exclusivos por cada asistencia.',
      icon: 'award'
    },
    {
      id: 'card-3',
      title: 'Zona de Alta Intensidad',
      description: 'Espacios de acondicionamiento físico, fuerza y cardio.',
      icon: 'zap'
    }
  ];
  const featureCards = (gymLanding.featureCards && Array.isArray(gymLanding.featureCards) && gymLanding.featureCards.length > 0)
    ? gymLanding.featureCards
    : defaultFeatureCards;

  const horarioSemana = gymLanding.horarioSemana || `Lunes a Viernes: ${negocio?.horarioApertura || '06:00'} - ${negocio?.horarioCierre || '22:00'}`;
  const horarioFinSemana = gymLanding.horarioFinSemana || 'Sábados y Domingos: 08:00 - 18:00';

  // Cargar planes si no vinieron precargados
  useEffect(() => {
    if (initialPlans.length === 0 && negocio?.slug) {
      fetch(`/api/${negocio.slug}/gym/public-plans`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.plans) {
            setPlans(data.plans);
          }
        })
        .catch(err => console.error('Error fetching gym plans:', err))
        .finally(() => setLoadingPlans(false));
    }
  }, [negocio?.slug, initialPlans.length]);

  // Cargar clases grupales y horarios
  useEffect(() => {
    if (negocio?.slug) {
      fetch(`/api/${negocio.slug}/gym/classes`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.classes) {
            setClasses(data.classes);
          }
        })
        .catch(err => console.error('Error fetching gym classes:', err))
        .finally(() => setLoadingClasses(false));
    }
  }, [negocio?.slug]);

  // Estados de áreas y equipamiento
  const [gymAreas, setGymAreas] = useState<any[]>(initialGymAreas);
  const [gymEquipment, setGymEquipment] = useState<any[]>(initialEquipment);
  const [loadingGym, setLoadingGym] = useState(initialGymAreas.length === 0);

  // Cargar áreas/equipamiento si no vinieron pre-cargados (SSR)
  useEffect(() => {
    if (initialGymAreas.length === 0 && negocio?.slug) {
      fetch(`/api/${negocio.slug}/gym/know-the-gym`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setGymAreas(data.areas || []);
            setGymEquipment(data.equipment || []);
          }
        })
        .catch(err => console.error('Error fetching gym areas:', err))
        .finally(() => setLoadingGym(false));
    } else {
      setLoadingGym(false);
    }
  }, [negocio?.slug, initialGymAreas.length]);

  // Promoción destacada activa
  const activePromo = (initialPromotions || []).find((p: any) => {
    if (p.estado !== 'publicado') return false;
    const now = new Date();
    const start = p.fechaInicio ? new Date(p.fechaInicio) : null;
    const end = p.fechaFin ? new Date(p.fechaFin) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  }) || null;

  const handleOpenCheckout = (plan: any) => {
    setSelectedPlan(plan);
    setCheckoutStep('form');
    setErrorMessage('');
    setCheckoutModalOpen(true);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.telefono.trim()) {
      setErrorMessage('Por favor ingresa tu nombre y teléfono móvil.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/${negocio.slug}/gym/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          nombre: formData.nombre,
          telefono: formData.telefono,
          email: formData.email
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo procesar la inscripción');
      }

      setPurchasedMembership(data.membership);
      // Guardar teléfono para recordar sesión de socio
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${negocio.slug}_client_phone`, formData.telefono.trim());
        localStorage.setItem('user_phone', formData.telefono.trim());
      }
      setCheckoutStep('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error al adquirir la membresía');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white pb-24 md:pb-12">
      {/* ── 1. HERO SECTION (ACOPLADO CON BANNER DE ALTO IMPACTO) ──────── */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-36 overflow-hidden bg-slate-950">
        {/* Imagen de Fondo (Banner Hero Acoplado) */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
          style={{ backgroundImage: `url(${heroBannerUrl})` }}
        />

        {/* Gradiente y Overlay Deportivo sobre el banner para máxima legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/60 backdrop-blur-[1px]" />
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 blur-3xl opacity-25 pointer-events-none rounded-full"
          style={{ backgroundColor: primaryColor }}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col items-center text-center">
            {/* Pill de Vertical */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 backdrop-blur-md mb-6 shadow-xl animate-pulse">
              <Flame size={16} className="text-orange-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {heroBadge}
              </span>
            </div>

            {/* Nombre del Gimnasio */}
            <h2 className="text-sm md:text-base uppercase tracking-widest font-black text-orange-400 mb-3 drop-shadow">
              {negocio?.nombre || 'VORTEX FITNESS CLUB'}
            </h2>

            {/* Título Principal de Alto Impacto */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-tight text-white max-w-4xl drop-shadow-lg mb-6">
              {heroTitulo}
            </h1>

            {/* Subtítulo Descriptivo */}
            <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl font-medium leading-relaxed mb-10 drop-shadow">
              {heroSubtitulo}
            </p>

            {/* CTAs Principales */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <a
                href="#planes"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-black text-sm uppercase tracking-wider text-white shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: primaryColor,
                  boxShadow: `0 10px 25px -5px ${primaryColor}88`
                }}
              >
                <Dumbbell size={18} />
                {heroCtaPrimary}
              </a>

              <a
                href="#instalaciones"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-wider bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700/80 backdrop-blur-md transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {heroCtaSecondary}
                <ArrowRight size={16} />
              </a>
            </div>

            {/* Badges rápidos de confianza (Stats del Hero Acoplado) */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-14 pt-8 border-t border-slate-800/80 w-full max-w-2xl">
              {heroStats.map((st: any, idx: number) => (
                <div key={idx} className="flex flex-col items-center">
                  <span className="text-2xl sm:text-3xl font-black text-white drop-shadow">{st.value}</span>
                  <span className="text-xs text-slate-300 font-medium mt-0.5">{st.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. PLANES DE MEMBRESÍA (Regla 9 y 10: SECCIÓN PROTAGONISTA) ──── */}
      <section id="planes" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles size={14} />
            Membresías Disponibles
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
            ELIGE TU MEMBRESÍA
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Planes flexibles diseñados para adaptarse a tu ritmo de entrenamiento y objetivos.
          </p>
        </div>

        {loadingPlans ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-md mx-auto">
            <Dumbbell className="mx-auto text-slate-600 mb-3" size={40} />
            <p className="text-slate-300 font-semibold">Próximamente nuevas membresías</p>
            <p className="text-slate-500 text-xs mt-1">El gimnasio está configurando su catálogo comercial.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {plans.map((plan) => {
              const isFeatured = plan.featured;
              const benefitsList = Array.isArray(plan.benefits) ? plan.benefits : [];

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl p-6 sm:p-8 transition-all duration-300 ${
                    isFeatured
                      ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-2 border-orange-500 shadow-2xl shadow-orange-500/20 md:-translate-y-2'
                      : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Badge Destacado */}
                  {isFeatured && (
                    <div 
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-md"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Más Recomendado
                    </div>
                  )}

                  {/* Cabecera del Plan */}
                  <div className="mb-6">
                    <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                      {plan.name}
                    </h3>
                    {plan.description && (
                      <p className="text-xs sm:text-sm text-slate-400 mt-2 line-clamp-2">
                        {plan.description}
                      </p>
                    )}
                  </div>

                  {/* Precio Dinámico (Regla 9) */}
                  <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-slate-800">
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                      ${plan.price}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-400 uppercase">
                      / {plan.durationDays === 30 ? 'Mes' : plan.durationDays === 90 ? 'Trimestre' : plan.durationDays === 365 ? 'Año' : `${plan.durationDays} días`}
                    </span>
                  </div>

                  {/* Lista de Beneficios */}
                  <div className="flex-1 space-y-3 mb-8">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Incluye:
                    </p>
                    {benefitsList.map((bnf: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                        <CheckCircle size={16} className="text-orange-400 shrink-0 mt-0.5" />
                        <span>{bnf}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Principal de Compra (Regla 7: "Adquirir membresía") */}
                  <button
                    onClick={() => handleOpenCheckout(plan)}
                    className={`w-full py-3.5 px-6 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      isFeatured
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                  >
                    Adquirir Membresía
                    <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 3. CLASES GRUPALES & HORARIOS (DINÁMICAS DESDE EL SISTEMA) ──── */}
      <section id="clases" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Flame size={14} />
            Entrenamiento Dirigido
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
            CLASES & HORARIOS
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Sesiones guiadas por coaches certificados incluidas o con aforo preferencial para miembros.
          </p>

          {/* Selector de Días */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {[
              { key: 'TODOS', label: 'Todos' },
              { key: 'LUN', label: 'Lunes' },
              { key: 'MAR', label: 'Martes' },
              { key: 'MIE', label: 'Miércoles' },
              { key: 'JUE', label: 'Jueves' },
              { key: 'VIE', label: 'Viernes' },
              { key: 'SAB', label: 'Sábado' },
              { key: 'DOM', label: 'Domingo' }
            ].map((day) => (
              <button
                key={day.key}
                onClick={() => setSelectedDayFilter(day.key)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  selectedDayFilter === day.key
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 scale-105'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {loadingClasses ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-md mx-auto">
            <Calendar className="mx-auto text-slate-600 mb-3" size={40} />
            <p className="text-slate-300 font-semibold">Horarios de clases en preparación</p>
            <p className="text-slate-500 text-xs mt-1">El gimnasio publicará sus próximas clases grupales muy pronto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes
              .filter((c) => {
                if (selectedDayFilter === 'TODOS') return true;
                const days = (c.daysOfWeek || '').toUpperCase();
                return days.includes(selectedDayFilter);
              })
              .map((c) => {
                const daysArray = (c.daysOfWeek || '').split(',').map((d: string) => d.trim()).filter(Boolean);
                return (
                  <div
                    key={c.id}
                    className="flex flex-col justify-between p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-orange-500/40 transition-all shadow-xl group hover:-translate-y-1"
                  >
                    <div>
                      {/* Categoría y Aforo */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span 
                          className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider"
                          style={{
                            backgroundColor: `${c.color || '#ea580c'}22`,
                            color: c.color || '#ea580c',
                            border: `1px solid ${c.color || '#ea580c'}44`
                          }}
                        >
                          {c.category || 'General'}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Users size={14} className="text-slate-500" />
                          <span>{c.capacity} cupos max</span>
                        </div>
                      </div>

                      {/* Nombre y Descripción */}
                      <h3 className="text-xl font-black uppercase text-white group-hover:text-orange-400 transition-colors">
                        {c.name}
                      </h3>
                      {c.description && (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                          {c.description}
                        </p>
                      )}

                      {/* Meta Datos (Coach, Horario, Sala) */}
                      <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-800/80">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <Clock size={14} className="text-orange-400 shrink-0" />
                          <span className="font-bold text-white">{c.startTime}</span>
                          <span className="text-slate-500">({c.durationMinutes} minutos)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <User size={14} className="text-orange-400 shrink-0" />
                          <span>Coach: <strong className="text-white">{c.coach}</strong></span>
                        </div>
                        {c.room && (
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <MapPin size={14} className="text-orange-400 shrink-0" />
                            <span>{c.room}</span>
                          </div>
                        )}
                      </div>

                      {/* Días en que se dicta */}
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {daysArray.map((day: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] font-mono font-bold text-slate-300"
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Botón Acción */}
                    <div className="mt-6 pt-4 border-t border-slate-800">
                      <Link
                        href={`/${negocio.slug}/mi-gym/clases`}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-orange-500 text-white transition-all flex items-center justify-center gap-2 text-center group-hover:bg-orange-500"
                      >
                        <span>Reservar en App de Socio</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* ── PROMO DESTACADA (si hay una activa vigente) ─────────────────────── */}
      {activePromo && (() => {
        // Parsear metadata CITIOX_META de la descripción
        let promoDesc = activePromo.descripcion || '';
        let promoMeta: any = {};
        if (promoDesc.includes('<!-- CITIOX_META:')) {
          try {
            const parts = promoDesc.split('<!-- CITIOX_META:');
            promoDesc = parts[0].trim();
            promoMeta = JSON.parse(parts[1].split('-->')[0].trim());
          } catch (_) {}
        }

        return (
          <section className="py-12 max-w-6xl mx-auto px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-orange-500/40 bg-gradient-to-r from-slate-900 via-orange-950/30 to-slate-900 p-8 sm:p-10 shadow-2xl shadow-orange-500/10">
              {/* Glow decorativo */}
              <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: primaryColor }} />

              <div className="relative z-10 flex flex-col sm:flex-row gap-8 items-center">
                {/* Imagen */}
                {activePromo.imagenUrl && (
                  <div className="shrink-0 w-full sm:w-52 aspect-square rounded-2xl overflow-hidden border border-slate-700">
                    <img src={activePromo.imagenUrl} alt={activePromo.titulo} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Contenido */}
                <div className="flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-3 border border-orange-500/25">
                    <Flame size={12} />
                    Oferta Especial
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase text-white mb-2 leading-tight">
                    {activePromo.titulo}
                  </h2>
                  {promoDesc && (
                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">{promoDesc}</p>
                  )}

                  {/* Precio */}
                  <div className="flex items-baseline gap-3 mb-5">
                    <span className="text-4xl font-black text-white">
                      ${activePromo.precioPromo}
                    </span>
                    {activePromo.precioAnterior && activePromo.precioAnterior > activePromo.precioPromo && (
                      <span className="text-xl text-slate-500 line-through">
                        ${activePromo.precioAnterior}
                      </span>
                    )}
                  </div>

                  {/* Validez */}
                  {activePromo.fechaFin && (
                    <p className="text-xs text-slate-400 mb-4">
                      Válido hasta: <span className="font-semibold text-slate-300">
                        {new Date(activePromo.fechaFin).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </p>
                  )}

                  <a
                    href="#planes"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Dumbbell size={16} />
                    Ver Membresías
                  </a>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── 3.5 CONOCE NUESTRO GIMNASIO (solo si hay contenido activo) ─── */}
      {!loadingGym && (gymAreas.length > 0 || gymEquipment.length > 0) && (
        <section id="conoce-el-gym" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Building2 size={14} />
              Instalaciones
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
              CONOCE NUESTRO GIMNASIO
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Espacios diseñados para maximizar tu entrenamiento y tu bienestar.
            </p>
          </div>

          {/* Áreas del Gimnasio */}
          {gymAreas.length > 0 && (
            <div className="mb-14">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-5 flex items-center gap-2">
                <Layers size={14} /> Áreas y Espacios
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {gymAreas.map((area: any) => (
                  <div key={area.id} className="group relative overflow-hidden rounded-2xl border border-slate-800 hover:border-orange-500/40 transition-all shadow-xl">
                    {/* Imagen */}
                    <div className="aspect-video overflow-hidden bg-slate-900">
                      {area.imageUrl ? (
                        <img
                          src={area.imageUrl}
                          alt={area.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900">
                          <Building2 className="text-slate-700" size={48} />
                        </div>
                      )}
                    </div>
                    {/* Info superpuesta */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="text-base font-black text-white uppercase tracking-wide drop-shadow">
                        {area.name}
                      </h4>
                      {area.description && (
                        <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                          {area.description}
                        </p>
                      )}
                      {/* Equipos del área */}
                      {gymEquipment.filter((e: any) => e.areaId === area.id).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {gymEquipment
                            .filter((e: any) => e.areaId === area.id)
                            .slice(0, 3)
                            .map((e: any) => (
                              <span key={e.id} className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-semibold border border-orange-500/20">
                                {e.name}
                              </span>
                            ))}
                          {gymEquipment.filter((e: any) => e.areaId === area.id).length > 3 && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 text-[10px] font-semibold">
                              +{gymEquipment.filter((e: any) => e.areaId === area.id).length - 3} más
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipamiento sin área asignada */}
          {gymEquipment.filter((e: any) => !e.areaId).length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-5 flex items-center gap-2">
                <Dumbbell size={14} /> Equipamiento General
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {gymEquipment
                  .filter((e: any) => !e.areaId)
                  .map((equip: any) => (
                    <div key={equip.id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden hover:border-slate-700 transition-all group">
                      <div className="aspect-square overflow-hidden bg-slate-900/80">
                        {equip.imageUrl ? (
                          <img
                            src={equip.imageUrl}
                            alt={equip.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Dumbbell className="text-slate-700" size={32} />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-bold text-white truncate">{equip.name}</p>
                        {equip.description && (
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{equip.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 4. BENEFICIOS E INSTALACIONES (100% CONFIGURABLE DESDE ADMIN) ─ */}
      <section id="instalaciones" className="py-20 bg-slate-900/40 border-y border-slate-800/80 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider mb-4">
                <Shield size={14} className="text-orange-400" />
                {facilitiesBadge}
              </div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white mb-6">
                {facilitiesTitle}
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8">
                {gymDescription}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {beneficios.map((b: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <CheckCircle size={18} className="text-orange-400 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm font-medium text-slate-200">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Showcase Visual o Características Destacadas Dinámicas */}
            <div className="space-y-4">
              {featureCards.map((card: any, idx: number) => {
                const isQr = card.icon === 'qr' || card.title?.toLowerCase().includes('qr');
                const isAward = card.icon === 'award' || card.title?.toLowerCase().includes('beneficio') || card.title?.toLowerCase().includes('club');
                
                return (
                  <div key={card.id || idx} className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 transition-all shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 shrink-0">
                        {isQr ? <QrCode size={24} /> : isAward ? <Award size={24} /> : <Zap size={24} />}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white uppercase">{card.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{card.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. UBICACIÓN Y HORARIOS (CONFIGURABLES) ───────────────────────── */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center max-w-3xl mx-auto">
          <h3 className="text-2xl sm:text-3xl font-black uppercase text-white mb-6">
            HORARIOS & UBICACIÓN
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left mb-8">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <Clock size={20} className="text-orange-400 shrink-0 mt-1" />
              <div>
                <span className="text-xs font-bold uppercase text-slate-400">Horario de Atención</span>
                <p className="text-sm font-semibold text-white mt-1">
                  {horarioSemana}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{horarioFinSemana}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <MapPin size={20} className="text-orange-400 shrink-0 mt-1" />
              <div>
                <span className="text-xs font-bold uppercase text-slate-400">Ubicación</span>
                <p className="text-sm font-semibold text-white mt-1">
                  {negocio?.direccion || 'Av. Principal 123'}
                </p>
                <p className="text-xs text-slate-400">{negocio?.ciudad || 'Ciudad'}</p>
              </div>
            </div>
          </div>

          {/* CTA FINAL (Regla 38) */}
          <div className="pt-6 border-t border-slate-800/80">
            <h4 className="text-xl sm:text-2xl font-black uppercase text-white mb-2">
              ¿LISTO PARA EMPEZAR?
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              Elige tu membresía hoy y comienza a entrenar de inmediato.
            </p>
            <a
              href="#membresias"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              <Dumbbell size={16} />
              Ver Membresías
            </a>
          </div>
        </div>
      </section>

      {/* ── 5. MODAL DE ADQUISICIÓN / CHECKOUT PÚBLICO ────────────────────── */}
      {checkoutModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
            {/* Botón cerrar */}
            <button
              onClick={() => setCheckoutModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>

            {checkoutStep === 'form' ? (
              <div>
                <div className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                    Adquirir Membresía
                  </span>
                  <h3 className="text-2xl font-black uppercase text-white mt-1">
                    {selectedPlan.name}
                  </h3>
                  <p className="text-sm font-bold text-slate-300 mt-1">
                    ${selectedPlan.price} {selectedPlan.currency || 'USD'} · {selectedPlan.durationDays} días de acceso
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-orange-500 focus:outline-none text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Teléfono Móvil (WhatsApp) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. +51 999 888 777"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-orange-500 focus:outline-none text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Correo Electrónico (Opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="socio@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-orange-500 focus:outline-none text-white text-sm"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          Confirmar y Activar Membresía
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <Check size={32} />
                </div>
                <h3 className="text-2xl font-black uppercase text-white mb-2">
                  ¡BIENVENIDO AL GIMNASIO!
                </h3>
                <p className="text-sm text-slate-300 mb-6">
                  Tu membresía <span className="text-orange-400 font-bold">{selectedPlan.name}</span> está activa. Presenta tu código QR en recepción para ingresar.
                </p>

                <div className="space-y-3">
                  <Link
                    href={`/${negocio.slug}/mi-qr`}
                    className="block w-full py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-xs uppercase tracking-wider text-white text-center shadow-lg transition-all"
                  >
                    Ver Mi Código QR de Acceso
                  </Link>
                  <Link
                    href={`/${negocio.slug}/mi-membresia`}
                    className="block w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs uppercase tracking-wider text-slate-200 text-center border border-slate-700 transition-all"
                  >
                    Ir a Mi Membresía
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
