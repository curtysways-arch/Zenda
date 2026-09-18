"use client";

import React, { useState } from 'react';
import CreationModeSelector from './CreationModeSelector';
import ChannelSelector from './ChannelSelector';
import BlueprintCapabilities from './BlueprintCapabilities';
import InitialResourcesConfig from './InitialResourcesConfig';
import ModuleSelector from './ModuleSelector';
import AddonSelector from './AddonSelector';
import ProvisioningSummary from './ProvisioningSummary';
import { TEMPLATE_REGISTRY, getTemplateManifest } from '@/core/templates/templatesRegistry';
import { SUBSCRIPTION_PLANS } from '@/core/subscription/plans';
import { PlanId } from '@/core/subscription/types';
import { 
  Rocket, ShieldCheck, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Copy, 
  Sparkles, Building2, Mail, Lock, Phone, MapPin, Clock, Globe, X,
  Trophy, Utensils, Footprints, ShoppingBag, Zap, Scissors, Stethoscope, GraduationCap
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  Trophy,
  Sparkles,
  Footprints,
  Utensils,
  ShoppingBag,
  Zap,
  Scissors,
  Stethoscope,
  GraduationCap
};

const FAMILY_LABELS: Record<string, string> = {
  RESTAURANTE: 'Restaurantes & Gastronomía',
  SERVICIOS: 'Citas & Servicios',
  CANCHAS: 'Canchas & Deportes',
  LAVANDERIA: 'Lavanderías & Calzado',
  TIENDA: 'Tiendas & Comercio'
};

const formatLimitLabel = (key: string): string => {
  const map: Record<string, string> = {
    MAX_STAFF: 'Personal / Staff',
    MAX_SERVICES: 'Servicios',
    MAX_APPOINTMENTS_MONTHLY: 'Citas / mes',
    MAX_USERS: 'Usuarios Admin',
    MAX_TABLES: 'Mesas',
    MAX_PRODUCTS: 'Productos',
    MAX_ORDERS_MONTHLY: 'Pedidos / mes',
    MAX_COURTS: 'Canchas',
    MAX_HOURS_MONTHLY: 'Horas / mes',
    MAX_BRANCHES: 'Sucursales',
  };
  return map[key] || key.replace(/MAX_/g, '').replace(/_/g, ' ').toLowerCase();
};

const FALLBACK_PLANS_BY_FAMILY: Record<string, any[]> = {
  RESTAURANTE: [
    { id: 'plan_restaurante_free', name: 'Restaurante Free', price: 0, description: 'Plan gratuito inicial para restaurantes y cafeterías.', isFree: true, limits: { MAX_TABLES: 5, MAX_PRODUCTS: 20, MAX_USERS: 1 } },
    { id: 'plan_restaurante_inicio', name: 'Restaurante Inicio', price: 7.99, description: 'Para cafeterías, dark kitchens o comida rápida.', isDefault: false, limits: { MAX_TABLES: 12, MAX_PRODUCTS: 60, MAX_USERS: 2 } },
    { id: 'plan_restaurante_crecimiento', name: 'Restaurante Crecimiento', price: 19.99, description: 'Para restaurantes con comanda en mesas, delivery y KDS de cocina.', isDefault: true, limits: { MAX_TABLES: 30, MAX_PRODUCTS: 150, MAX_USERS: 5 } },
    { id: 'plan_restaurante_pro', name: 'Restaurante Pro', price: 39.99, description: 'Solución corporativa con comanda ilimitada y alta rotación.', limits: { MAX_TABLES: 999, MAX_PRODUCTS: 999, MAX_USERS: 15 } }
  ],
  SERVICIOS: [
    { id: 'plan_servicios_free', name: 'Servicios Free', price: 0, description: 'Plan gratuito para profesionales independientes.', isFree: true, limits: { MAX_STAFF: 2, MAX_SERVICES: 10, MAX_USERS: 1 } },
    { id: 'plan_servicios_inicio', name: 'Servicios Inicio', price: 7.99, description: 'Para barberos, estilistas o terapeutas individuales.', limits: { MAX_STAFF: 4, MAX_SERVICES: 50, MAX_USERS: 2 } },
    { id: 'plan_servicios_crecimiento', name: 'Servicios Crecimiento', price: 19.99, description: 'Para spas, salones de belleza y consultorios médicos.', isDefault: true, limits: { MAX_STAFF: 10, MAX_SERVICES: 120, MAX_USERS: 5 } },
    { id: 'plan_servicios_pro', name: 'Servicios Pro', price: 39.99, description: 'Capacidad ilimitada con agendas múltiples y recordatorios.', limits: { MAX_STAFF: 999, MAX_SERVICES: 999, MAX_USERS: 15 } }
  ],
  CANCHAS: [
    { id: 'plan_canchas_free', name: 'Canchas Free', price: 0, description: 'Plan gratuito para clubes y canchas deportivas.', isFree: true, limits: { MAX_COURTS: 1, MAX_HOURS_MONTHLY: 30, MAX_USERS: 1 } },
    { id: 'plan_canchas_inicio', name: 'Canchas Inicio', price: 7.99, description: 'Para clubes con 1 o 2 canchas deportivas.', limits: { MAX_COURTS: 2, MAX_HOURS_MONTHLY: 120, MAX_USERS: 2 } },
    { id: 'plan_canchas_crecimiento', name: 'Canchas Crecimiento', price: 19.99, description: 'Para complejos deportivos con iluminación nocturna y torneos.', isDefault: true, limits: { MAX_COURTS: 6, MAX_HOURS_MONTHLY: 350, MAX_USERS: 5 } },
    { id: 'plan_canchas_pro', name: 'Canchas Pro', price: 39.99, description: 'Para academias y grandes complejos de pádel o fútbol.', limits: { MAX_COURTS: 999, MAX_HOURS_MONTHLY: 9999, MAX_USERS: 15 } }
  ],
  TIENDA: [
    { id: 'plan_tienda_free', name: 'Tienda Free', price: 0, description: 'Plan gratuito para catálogo digital y pedidos por WhatsApp.', isFree: true, limits: { MAX_PRODUCTS: 15, MAX_ORDERS_MONTHLY: 30, MAX_USERS: 1 } },
    { id: 'plan_tienda_inicio', name: 'Tienda Inicio', price: 7.99, description: 'Para tiendas pequeñas y comercios de venta directa.', limits: { MAX_PRODUCTS: 80, MAX_ORDERS_MONTHLY: 120, MAX_USERS: 2 } },
    { id: 'plan_tienda_crecimiento', name: 'Tienda Crecimiento', price: 19.99, description: 'Para retail y e-commerce con variantes, stock y delivery.', isDefault: true, limits: { MAX_PRODUCTS: 300, MAX_ORDERS_MONTHLY: 450, MAX_USERS: 5 } },
    { id: 'plan_tienda_pro', name: 'Tienda Pro', price: 39.99, description: 'E-commerce avanzado con inventario multialmacén.', limits: { MAX_PRODUCTS: 999, MAX_ORDERS_MONTHLY: 9999, MAX_USERS: 15 } }
  ],
  LAVANDERIA: [
    { id: 'plan_lavanderia_free', name: 'Lavandería Free', price: 0, description: 'Plan gratuito para recepción básica y tickets.', isFree: true, limits: { MAX_ORDERS_MONTHLY: 30, MAX_USERS: 1 } },
    { id: 'plan_lavanderia_inicio', name: 'Lavandería Inicio', price: 7.99, description: 'Para tintorerías y restauración de calzado artesanal.', limits: { MAX_ORDERS_MONTHLY: 100, MAX_USERS: 2 } },
    { id: 'plan_lavanderia_crecimiento', name: 'Lavandería Crecimiento', price: 19.99, description: 'Para talleres con fotos de inspección y tablero Kanban.', isDefault: true, limits: { MAX_ORDERS_MONTHLY: 350, MAX_USERS: 5 } },
    { id: 'plan_lavanderia_pro', name: 'Lavandería Pro', price: 39.99, description: 'Múltiples sucursales y logística de recolección a domicilio.', limits: { MAX_ORDERS_MONTHLY: 9999, MAX_USERS: 15 } }
  ]
};

interface BusinessProvisioningWizardProps {
  onClose: () => void;
  onSuccess: (negocioInfo: any) => void;
}

export default function BusinessProvisioningWizard({ onClose, onSuccess }: BusinessProvisioningWizardProps) {
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [blueprintCategoryFilter, setBlueprintCategoryFilter] = useState<'all' | 'food' | 'services' | 'retail' | 'sports'>('all');

  // Planes dinámicos de base de datos
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);

  // Estado unificado del Wizard
  const [creationMode, setCreationMode] = useState<'blueprint' | 'duplicate' | 'template' | 'import'>('blueprint');
  const [blueprintId, setBlueprintId] = useState<string>('RESTAURANT_STANDARD');
  const [planId, setPlanId] = useState<string>('plan_restaurante_crecimiento');
  
  // Datos Generales
  const [generalInfo, setGeneralInfo] = useState({
    nombre: '',
    slug: '',
    whatsapp: '',
    emailContacto: '',
    direccion: '',
    ciudad: '',
    logoUrl: '',
    colorPrimario: '#ea580c',
    colorSecundario: '#7c2d12',
    adminEmail: '',
    adminPassword: '',
    adminNombre: '',
    crearDemo: false
  });

  // Canales, Capacidades, Recursos Iniciales, Módulos y Addons
  const [channels, setChannels] = useState<string[]>(['TABLE', 'QR', 'WAITER', 'KITCHEN_KDS', 'DELIVERY', 'PICKUP', 'POS']);
  const [activeCapabilities, setActiveCapabilities] = useState<Record<string, boolean>>({
    orders: true, products: true, categories: true, tables: true, waiters: true, kitchen: true, delivery: true, pickup: true, qr_ordering: true
  });
  const [initialResources, setInitialResources] = useState<Array<{ name: string; category?: string; capacity?: number; quantity?: number }>>([
    { name: 'Mesa Estándar', category: 'TABLE', capacity: 4, quantity: 10 },
    { name: 'Mesa Terraza', category: 'TABLE', capacity: 6, quantity: 4 },
    { name: 'Estación Cocina KDS', category: 'KITCHEN', quantity: 2 },
    { name: 'Caja POS', category: 'POS', quantity: 1 }
  ]);
  const [activeModules, setActiveModules] = useState<string[]>(['PROMOTIONS', 'COMMUNICATIONS', 'AI_ASSISTANT', 'INVENTORY']);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(['extra_transactions']);

  // Plantilla reutilizable
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false);
  const [templateName, setTemplateName] = useState<string>('');

  // Cargar planes reales de la base de datos
  React.useEffect(() => {
    async function loadPlans() {
      try {
        setLoadingPlans(true);
        const res = await fetch('/api/superadmin/planes');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setDbPlans(data);
          }
        }
      } catch (err) {
        console.error('Error al cargar planes desde la API:', err);
      } finally {
        setLoadingPlans(false);
      }
    }
    loadPlans();
  }, []);

  // Mapear Blueprint a Código de Familia
  const getFamilyCodeForBlueprint = (bId: string): string => {
    const b = (bId || '').toLowerCase();
    if (b.includes('restaurant') || b.includes('fast_food') || b.includes('pincho')) return 'RESTAURANTE';
    if (b.includes('spa') || b.includes('barber') || b.includes('clinic') || b.includes('dental')) return 'SERVICIOS';
    if (b.includes('padel') || b.includes('cancha') || b.includes('academy') || b.includes('curso')) return 'CANCHAS';
    if (b.includes('shoe') || b.includes('calzado') || b.includes('laundry')) return 'LAVANDERIA';
    if (b.includes('store') || b.includes('tienda') || b.includes('retail')) return 'TIENDA';
    return 'RESTAURANTE';
  };

  const currentFamilyCode = getFamilyCodeForBlueprint(blueprintId);
  const currentFamilyName = FAMILY_LABELS[currentFamilyCode] || 'General';

  // Planes correspondientes a la familia del blueprint
  const availablePlans = React.useMemo(() => {
    if (dbPlans && dbPlans.length > 0) {
      const byFamily = dbPlans.filter(p => {
        const famCode = typeof p.family === 'object' && p.family !== null ? p.family.code : (p.familyCode || p.family);
        if (famCode) return famCode === currentFamilyCode;
        const pid = (p.id || '').toLowerCase();
        const pslug = (p.slug || '').toLowerCase();
        const target = currentFamilyCode.toLowerCase();
        return pid.includes(target) || pslug.includes(target);
      });

      if (byFamily.length > 0) {
        return byFamily
          .sort((a, b) => {
            const orderA = a.displayOrder ?? a.price;
            const orderB = b.displayOrder ?? b.price;
            return orderA - orderB;
          })
          .map(p => {
            // Normalizar límites si vienen de la relación planLimits de Prisma
            let limitsObj: Record<string, any> = {};
            if (p.limits && typeof p.limits === 'object' && !Array.isArray(p.limits)) {
              limitsObj = p.limits;
            } else if (Array.isArray(p.planLimits)) {
              p.planLimits.forEach((lim: any) => {
                if (lim.limitKey) {
                  limitsObj[lim.limitKey] = lim.limitValue >= 999999 ? 'Ilimitado' : lim.limitValue;
                }
              });
            }

            // Normalizar etiqueta de familia para que no sea un objeto
            const familyLabel = typeof p.family === 'object' && p.family !== null 
              ? (p.family.name || p.family.code || currentFamilyCode)
              : (typeof p.family === 'string' ? p.family : currentFamilyCode);

            return {
              ...p,
              familyLabel,
              limits: limitsObj,
              price: Number(p.price) || 0
            };
          });
      }
    }
    return FALLBACK_PLANS_BY_FAMILY[currentFamilyCode] || FALLBACK_PLANS_BY_FAMILY.RESTAURANTE;
  }, [dbPlans, currentFamilyCode]);

  // Sincronizar selección de plan cuando cambie el blueprint o los planes disponibles
  React.useEffect(() => {
    if (availablePlans.length > 0) {
      const exists = availablePlans.some(p => p.id === planId);
      if (!exists) {
        const defaultPlan = availablePlans.find(p => p.isDefault) || availablePlans.find(p => Number(p.price) > 0 && Number(p.price) < 30) || availablePlans[0];
        if (defaultPlan) {
          setPlanId(defaultPlan.id);
        }
      }
    }
  }, [availablePlans, planId]);

  const selectedPlanObj = availablePlans.find(p => p.id === planId) || dbPlans.find(p => p.id === planId);

  // Handlers para selección
  const handleSelectBlueprint = (bId: string) => {
    setBlueprintId(bId);
    const manifest = getTemplateManifest(bId) || TEMPLATE_REGISTRY[bId];
    if (manifest) {
      if (manifest.suggestedColors) {
        setGeneralInfo(prev => ({
          ...prev,
          colorPrimario: manifest.suggestedColors?.primaryColor || prev.colorPrimario,
          colorSecundario: manifest.suggestedColors?.secondaryColor || prev.colorSecundario
        }));
      }
      if (manifest.capabilities) {
        setActiveCapabilities(manifest.capabilities as any);
      }

      // Sincronizar Canales recomendados por tipo de industria
      const bLower = bId.toLowerCase();
      if (bLower.includes('restaurant')) {
        setChannels(['TABLE', 'QR', 'WAITER', 'KITCHEN_KDS', 'DELIVERY', 'PICKUP', 'POS']);
      } else if (bLower.includes('fast_food') || bLower.includes('pincho')) {
        setChannels(['QR', 'KITCHEN_KDS', 'DELIVERY', 'PICKUP', 'POS']);
      } else if (bLower.includes('store') || bLower.includes('tienda')) {
        setChannels(['DELIVERY', 'PICKUP', 'POS', 'QR']);
      } else if (bLower.includes('padel') || bLower.includes('cancha')) {
        setChannels(['RESERVATIONS', 'TABLE', 'POS', 'QR']);
      } else if (bLower.includes('barber') || bLower.includes('spa') || bLower.includes('clinic')) {
        setChannels(['RESERVATIONS', 'POS', 'QR']);
      } else if (bLower.includes('academy')) {
        setChannels(['RESERVATIONS', 'POS', 'QR']);
      } else if (bLower.includes('shoe')) {
        setChannels(['DELIVERY', 'PICKUP', 'POS', 'QR']);
      }

      // Sincronizar Recursos Iniciales desde el manifest
      if (manifest.initialResources && manifest.initialResources.length > 0) {
        setInitialResources(manifest.initialResources.map(r => ({
          name: r.name || 'Recurso',
          category: (r as any).category || (r as any).resourceType || 'General',
          capacity: (r as any).capacity || 1,
          quantity: 1
        })));
      }
    }
  };

  const handleToggleChannel = (channelId: string) => {
    setChannels(prev => 
      prev.includes(channelId) ? prev.filter(c => c !== channelId) : [...prev, channelId]
    );
  };

  const handleUpdateResourceQty = (index: number, newQty: number) => {
    setInitialResources(prev => {
      const next = [...prev];
      if (next[index]) next[index].quantity = newQty;
      return next;
    });
  };

  const handleToggleModule = (moduleId: string) => {
    setActiveModules(prev =>
      prev.includes(moduleId) ? prev.filter(m => m !== moduleId) : [...prev, moduleId]
    );
  };

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonId) ? prev.filter(a => a !== addonId) : [...prev, addonId]
    );
  };

  // Creación Backend
  const handleConfirmCreation = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        mode: creationMode,
        blueprintId,
        planId,
        generalInfo,
        channels,
        activeCapabilities,
        initialResources,
        activeModules,
        selectedAddons,
        saveAsTemplate,
        templateName
      };

      const res = await fetch('/api/superadmin/negocios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al aprovisionar el negocio');
      }

      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Error en el aprovisionamiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl w-full max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl text-white font-sans relative overflow-hidden">
      {/* Header Fijo Superior */}
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3.5 bg-slate-950/80 backdrop-blur-md shrink-0 gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => s <= step && setStep(s)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer shrink-0 transition ${
                s === step
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : s < step
                  ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                  : 'bg-slate-950 text-slate-600'
              }`}
            >
              <span>P{s}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
          title="Cerrar modal"
        >
          <X size={18} />
        </button>
      </div>

      {/* Contenedor desplazable de los pasos */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl text-xs font-bold text-rose-400">
            ⚠️ {error}
          </div>
        )}

      {/* RENDER DE PASOS */}

      {/* PASO 0: Modo de Creación */}
      {step === 0 && (
        <CreationModeSelector
          selectedMode={creationMode}
          onSelectMode={setCreationMode}
          onNext={() => setStep(1)}
        />
      )}

      {/* PASO 1: Elegir Blueprint */}
      {step === 1 && (
        <div className="space-y-6 text-left">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              Paso 1 — Elegir Blueprint de Industria
            </span>
            <h2 className="text-2xl font-black text-white italic">¿Qué tipo de negocio deseas crear?</h2>
            <p className="text-xs text-slate-400">Cada Blueprint preconfigura de forma automática las capacidades nativas, flujos de comanda, turnos, canales y recursos iniciales.</p>
          </div>

          {/* Filtros de Categoría */}
          <div className="flex items-center justify-center flex-wrap gap-2 pt-1 pb-2">
            {[
              { id: 'all', label: 'Todos', count: Object.keys(TEMPLATE_REGISTRY).length },
              { id: 'food', label: '🍽️ Gastronomía', count: 2 },
              { id: 'services', label: '💆 Citas & Salud', count: 3 },
              { id: 'retail', label: '🛍️ Comercio & Retail', count: 2 },
              { id: 'sports', label: '🏓 Deportes & Cursos', count: 2 },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBlueprintCategoryFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  blueprintCategoryFilter === tab.id
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                    : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${blueprintCategoryFilter === tab.id ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Cuadrícula de Blueprints */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Object.values(TEMPLATE_REGISTRY)
              .filter(t => {
                if (blueprintCategoryFilter === 'all') return true;
                const tid = t.id.toLowerCase();
                if (blueprintCategoryFilter === 'food') return tid.includes('restaurant') || tid.includes('fast_food');
                if (blueprintCategoryFilter === 'services') return tid.includes('spa') || tid.includes('barber') || tid.includes('clinic');
                if (blueprintCategoryFilter === 'retail') return tid.includes('store') || tid.includes('shoe');
                if (blueprintCategoryFilter === 'sports') return tid.includes('padel') || tid.includes('academy');
                return true;
              })
              .map(t => {
                const isSelected = blueprintId === t.id || blueprintId === t.module || blueprintId === t.id.toUpperCase();
                const IconComponent = ICON_MAP[t.icon] || Sparkles;

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectBlueprint(t.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className={`p-2 rounded-xl ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-900 border border-slate-800 text-slate-300 group-hover:text-emerald-400'
                        }`}>
                          <IconComponent size={18} />
                        </div>
                        {t.badge && (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                            isSelected
                              ? 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30'
                              : 'text-slate-400 bg-slate-900 border-slate-800'
                          }`}>
                            {t.badge}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-black text-xs md:text-sm text-white leading-snug">{t.name}</h3>
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-1 line-clamp-2">{t.description}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 mt-2.5 space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(t.capabilities)
                          .filter(([_, active]) => active)
                          .slice(0, 3)
                          .map(([cap]) => (
                            <span key={cap} className="text-[8px] font-bold uppercase tracking-wider text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded-md border border-slate-800">
                              {cap.replace(/_/g, ' ')}
                            </span>
                          ))}
                        {Object.keys(t.capabilities).length > 3 && (
                          <span className="text-[8px] font-bold text-slate-500 bg-slate-900 px-1 py-0.5 rounded-md">
                            +{Object.keys(t.capabilities).length - 3}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-400">
                          <CheckCircle2 size={12} />
                          <span>Seleccionado</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Botones de Navegación Sticky en el fondo */}
          <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 -mx-6 md:-mx-8 px-6 md:px-8 py-3.5 flex justify-between items-center z-20 mt-4 shadow-xl">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl hover:text-white hover:bg-slate-700 transition"
            >
              <ArrowLeft size={16} /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest px-8 py-3 rounded-xl hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
            >
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: Elegir Plan */}
      {step === 2 && (
        <div className="space-y-6 text-left">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              Paso 2 — Elegir Plan
            </span>
            <h2 className="text-2xl font-black text-white italic">Nivel de Suscripción</h2>
            <p className="text-xs text-slate-400">
              Planes configurados para la familia <span className="text-emerald-400 font-bold">{FAMILY_LABELS[currentFamilyCode] || currentFamilyCode}</span>.
              Gobiernan cuotas de uso y límites operativos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {availablePlans.map(p => {
              const isSelected = planId === p.id;
              const priceNum = Number(p.price) || 0;
              const isFree = priceNum === 0;

              return (
                <div
                  key={p.id}
                  onClick={() => setPlanId(p.id)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">
                          {p.familyLabel || (typeof p.family === 'string' ? p.family : currentFamilyCode)}
                        </span>
                        <h3 className="font-bold text-base text-white">{p.name}</h3>
                      </div>
                      {p.isDefault && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                          Recomendado
                        </span>
                      )}
                      {isFree && !p.isDefault && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          Gratuito
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      {isFree ? (
                        <span className="text-2xl font-black text-emerald-400">Gratis</span>
                      ) : (
                        <>
                          <span className="text-2xl font-black text-emerald-400">${priceNum.toFixed(2)}</span>
                          <span className="text-xs text-slate-400 font-semibold">/mes</span>
                        </>
                      )}
                    </div>

                    {p.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}

                    {p.limits && Object.keys(p.limits).length > 0 && (
                      <div className="text-[10px] text-slate-300 space-y-1.5 border-t border-slate-800/80 pt-3">
                        {Object.entries(p.limits).map(([key, val]) => (
                          <div key={key} className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-medium">{formatLimitLabel(key)}:</span>
                            <span className="text-emerald-400 font-bold">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                      <span className={isSelected ? 'text-emerald-400' : 'text-slate-500'}>
                        {isSelected ? 'Seleccionado' : 'Hacer clic para elegir'}
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 size={16} className="text-emerald-400" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botones de Navegación Sticky en el fondo */}
          <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 -mx-6 md:-mx-8 px-6 md:px-8 py-3.5 flex justify-between items-center z-20 mt-4 shadow-xl">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl hover:text-white hover:bg-slate-700 transition"
            >
              <ArrowLeft size={16} /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-2 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest px-8 py-3 rounded-xl hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
            >
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: Información del Negocio */}
      {step === 3 && (
        <div className="space-y-6 text-left">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              Paso 3 — Información General
            </span>
            <h2 className="text-2xl font-black text-white italic">Datos Básicos y Administrador</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Nombre del Negocio</label>
              <input
                type="text"
                placeholder="Ej: Resto Grill Central"
                value={generalInfo.nombre}
                onChange={(e) => {
                  const nombre = e.target.value;
                  const slug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  setGeneralInfo(prev => ({ ...prev, nombre, slug }));
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Slug de Dominio</label>
              <input
                type="text"
                placeholder="resto-grill-central"
                value={generalInfo.slug}
                onChange={(e) => setGeneralInfo(prev => ({ ...prev, slug: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Email Administrador</label>
              <input
                type="email"
                placeholder="admin@resto.com"
                value={generalInfo.adminEmail}
                onChange={(e) => setGeneralInfo(prev => ({ ...prev, adminEmail: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Contraseña Administrador</label>
              <input
                type="password"
                placeholder="••••••••"
                value={generalInfo.adminPassword}
                onChange={(e) => setGeneralInfo(prev => ({ ...prev, adminPassword: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">WhatsApp de Atención</label>
              <input
                type="text"
                placeholder="+593959997521"
                value={generalInfo.whatsapp}
                onChange={(e) => setGeneralInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Ciudad / Ubicación</label>
              <input
                type="text"
                placeholder="Guayaquil"
                value={generalInfo.ciudad}
                onChange={(e) => setGeneralInfo(prev => ({ ...prev, ciudad: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Botones de Navegación Sticky en el fondo */}
          <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 -mx-6 md:-mx-8 px-6 md:px-8 py-3.5 flex justify-between items-center z-20 mt-4 shadow-xl">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl hover:text-white hover:bg-slate-700 transition"
            >
              <ArrowLeft size={16} /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex items-center gap-2 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest px-8 py-3 rounded-xl hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
            >
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: Canales de Operación */}
      {step === 4 && (
        <ChannelSelector
          blueprintId={blueprintId}
          selectedChannels={channels}
          onToggleChannel={handleToggleChannel}
          onNext={() => setStep(5)}
          onPrev={() => setStep(3)}
        />
      )}

      {/* PASO 5: Capacidades del Blueprint */}
      {step === 5 && (
        <BlueprintCapabilities
          blueprintId={blueprintId}
          capabilities={activeCapabilities}
          onNext={() => setStep(6)}
          onPrev={() => setStep(4)}
        />
      )}

      {/* PASO 6: Recursos Iniciales */}
      {step === 6 && (
        <InitialResourcesConfig
          blueprintId={blueprintId}
          initialResources={initialResources}
          onUpdateResourceQty={handleUpdateResourceQty}
          onNext={() => setStep(7)}
          onPrev={() => setStep(5)}
        />
      )}

      {/* PASO 7: Módulos Opcionales */}
      {step === 7 && (
        <ModuleSelector
          activeModules={activeModules}
          onToggleModule={handleToggleModule}
          onNext={() => setStep(8)}
          onPrev={() => setStep(6)}
        />
      )}

      {/* PASO 8: Addons */}
      {step === 8 && (
        <AddonSelector
          selectedAddons={selectedAddons}
          onToggleAddon={handleToggleAddon}
          onNext={() => setStep(9)}
          onPrev={() => setStep(7)}
        />
      )}

      {/* PASO 9: Resumen & Creación */}
      {step === 9 && (
        <ProvisioningSummary
          payload={{
            mode: creationMode,
            blueprintId,
            planId,
            generalInfo,
            channels,
            activeCapabilities,
            initialResources,
            activeModules,
            selectedAddons
          }}
          selectedPlanObj={selectedPlanObj}
          saveAsTemplate={saveAsTemplate}
          templateName={templateName}
          onToggleSaveTemplate={setSaveAsTemplate}
          onChangeTemplateName={setTemplateName}
          onConfirmCreation={handleConfirmCreation}
          onPrev={() => setStep(8)}
          loading={loading}
        />
      )}
      </div>
    </div>
  );
}
