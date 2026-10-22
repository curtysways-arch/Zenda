"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Rocket, ShieldCheck, ArrowRight, ArrowLeft, Loader2, CheckCircle2, 
  Sparkles, Building2, Mail, Lock, Phone, MapPin, Clock, Globe, X,
  Trophy, Utensils, Footprints, ShoppingBag, Zap, Scissors, Stethoscope, 
  Dumbbell, Copy, ExternalLink, Plus, Trash2, Check, RefreshCw, Eye,
  FileSpreadsheet, Layers, Sliders, Store, AlertCircle, ChevronRight,
  Flame, Award, Palette, Calendar, Shirt, Dribbble
} from "lucide-react";
import ImageUploader from "@/components/ui/ImageUploader";
import CatalogImportModal from "./CatalogImportModal";
import WizardLocationMapModal from "./WizardLocationMapModal";
import { ProvisioningCatalogItem, ProvisioningBranchItem } from "@/core/provisioning/ProvisioningEngine";
import { getTemplateManifest, TEMPLATE_REGISTRY } from "@/core/templates/templatesRegistry";

const BRAND_PRESET_COLORS = [
  { name: 'Esmeralda', hex: '#059669', bgClass: 'bg-emerald-600' },
  { name: 'Azul Real', hex: '#2563eb', bgClass: 'bg-blue-600' },
  { name: 'Índigo Moderno', hex: '#6366f1', bgClass: 'bg-indigo-600' },
  { name: 'Violeta / Spa', hex: '#7c3aed', bgClass: 'bg-purple-600' },
  { name: 'Magenta / Estética', hex: '#ec4899', bgClass: 'bg-pink-600' },
  { name: 'Rojo Pasión', hex: '#dc2626', bgClass: 'bg-red-600' },
  { name: 'Naranja / Pizzería', hex: '#ea580c', bgClass: 'bg-orange-600' },
  { name: 'Ámbar / Gourmet', hex: '#d97706', bgClass: 'bg-amber-600' },
  { name: 'Cian / Salud / Tech', hex: '#06b6d4', bgClass: 'bg-cyan-600' },
  { name: 'Carbón / Elegante', hex: '#1e293b', bgClass: 'bg-slate-800' },
];

const ICON_MAP: Record<string, any> = {
  Utensils,
  Scissors,
  Trophy,
  Footprints,
  ShoppingBag,
  Dumbbell,
  Stethoscope,
  Building2,
  Sparkles,
  Flame,
  Calendar,
  Shirt,
  Dribbble,
};

interface AppDeliveryWizardProps {
  onClose: () => void;
  onSuccess: (negocioInfo: any) => void;
}

export default function AppDeliveryWizard({ onClose, onSuccess }: AppDeliveryWizardProps) {
  // Modo de entrega: Guiado (8 pasos) vs Rápido (1 vista)
  const [quickMode, setQuickMode] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [provisionResult, setProvisionResult] = useState<any | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState<boolean>(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [enteringAdmin, setEnteringAdmin] = useState<boolean>(false);

  // Catálogos dinámicos desde API
  const [businessTypes, setBusinessTypes] = useState<any[]>([]);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(true);
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);

  // ── ESTADO DEL FORMULARIO ──────────────────────────────────────────────
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [isFounder, setIsFounder] = useState<boolean>(false);
  const [founderPosition, setFounderPosition] = useState<number>(1);
  const [lockedPrice, setLockedPrice] = useState<number>(10.0);

  // ── PRECIO NEGOCIADO (independiente del Founder) ───────────────────────
  const [applyNegotiatedPrice, setApplyNegotiatedPrice] = useState<boolean>(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState<number>(0);
  const [negotiatedPriceDuration, setNegotiatedPriceDuration] = useState<'PERMANENT' | number>('PERMANENT');
  const [negotiatedPriceReason, setNegotiatedPriceReason] = useState<string>('');
  // Para duración personalizada
  const [negotiatedCustomCycles, setNegotiatedCustomCycles] = useState<number>(1);
  const [negotiatedDurationMode, setNegotiatedDurationMode] = useState<'PERMANENT' | '1' | '2' | '3' | '6' | 'custom'>('PERMANENT');



  // Información del Negocio
  const [generalInfo, setGeneralInfo] = useState({
    nombre: "",
    nombreLegal: "",
    slug: "",
    whatsapp: "",
    emailContacto: "",
    direccion: "",
    ciudad: "",
    gpsUrl: "",
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    descripcionCorta: "",
    logoUrl: "",
    bannerUrl: "",
    colorPrimario: "#059669",
    colorSecundario: "#0f172a",
    horarioApertura: "08:00",
    horarioCierre: "22:00",
    timezone: "America/Guayaquil",
    currency: "USD",
    adminEmail: "",
    adminPassword: "",
    adminNombre: "",
    adminTelefono: ""
  });

  // Handler para aplicar datos confirmados en el mapa
  const handleMapConfirm = (location: {
    lat: number;
    lng: number;
    address: string;
    city?: string;
    googleMapsUrl: string;
  }) => {
    setGeneralInfo(prev => ({
      ...prev,
      direccion: location.address || prev.direccion,
      ciudad: location.city || prev.ciudad || "Guayaquil",
      gpsUrl: location.googleMapsUrl,
      latitude: location.lat,
      longitude: location.lng
    }));
  };

  // Contenido Adaptativo & Catálogo
  const [catalogItems, setCatalogItems] = useState<ProvisioningCatalogItem[]>([]);
  const [initialResources, setInitialResources] = useState<Array<{ name: string; category?: string; capacity?: number; quantity?: number }>>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [activeModules, setActiveModules] = useState<string[]>([]);

  // Landing Page
  const [landingHero, setLandingHero] = useState({
    title: "",
    subtitle: "",
    ctaText: "Ver opciones",
    ctaAction: "CATALOG",
    imageUrl: ""
  });
  const [landingHighlights, setLandingHighlights] = useState<Array<{ title: string; price?: number; imageUrl?: string; description?: string }>>([]);

  // Multi-Branch
  const [branches, setBranches] = useState<ProvisioningBranchItem[]>([]);

  // ── CARGA INICIAL DE CATÁLOGOS DINÁMICOS ──────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingTypes(true);
        const resTypes = await fetch("/api/superadmin/tipos-negocio");
        if (resTypes.ok) {
          const typesData = await resTypes.json();
          if (Array.isArray(typesData)) {
            setBusinessTypes(typesData);
            if (typesData.length > 0 && !selectedTypeId) {
              const defaultType = typesData.find(t => t.slug === 'comandas') || typesData[0];
              setSelectedTypeId(defaultType.id);
            }
          }
        }
      } catch (err) {
        console.error("Error al cargar tipos de negocio:", err);
      } finally {
        setLoadingTypes(false);
      }

      try {
        setLoadingPlans(true);
        const resPlans = await fetch("/api/superadmin/planes");
        if (resPlans.ok) {
          const plansData = await resPlans.json();
          if (Array.isArray(plansData)) {
            setDbPlans(plansData);
          }
        }
      } catch (err) {
        console.error("Error al cargar planes:", err);
      } finally {
        setLoadingPlans(false);
      }
    }
    loadData();
  }, []);

  // Mapeo oficial de industrias a código canónico de familias de planes
  const BUSINESS_FAMILY_MAP: Record<string, string> = {
    'comandas': 'RESTAURANTE',
    'pinchos': 'RESTAURANTE',
    'fast-food': 'RESTAURANTE',
    'citas': 'SERVICIOS',
    'reservas': 'CANCHAS',
    'ordenes-servicio': 'LAVANDERIA',
    'ecommerce': 'TIENDA',
    'dentista': 'DENTISTA',
    'odontologia': 'DENTISTA',
    'dental': 'DENTISTA',
    'gimnasio': 'GIMNASIO'
  };

  // Tipo de Negocio actualmente seleccionado
  const currentBusinessType = useMemo(() => {
    return businessTypes.find(t => t.id === selectedTypeId) || businessTypes[0] || null;
  }, [businessTypes, selectedTypeId]);

  // Familia de Planes asociada dinámicamente con fallback automático
  const currentPlanFamily = useMemo(() => {
    if (!currentBusinessType) return null;
    if (currentBusinessType.planFamily) return currentBusinessType.planFamily;

    const bSlug = (currentBusinessType.slug || '').toLowerCase();
    const mappedCode = BUSINESS_FAMILY_MAP[bSlug] || 'RESTAURANTE';
    return {
      id: '',
      code: mappedCode,
      name: mappedCode === 'RESTAURANTE' ? 'Restaurantes & Gastronomía'
            : mappedCode === 'SERVICIOS' ? 'Servicios & Citas'
            : mappedCode === 'CANCHAS' ? 'Canchas & Clubes'
            : mappedCode === 'LAVANDERIA' ? 'Lavandería & Calzado'
            : mappedCode === 'TIENDA' ? 'Tiendas & E-Commerce'
            : mappedCode,
      slug: mappedCode.toLowerCase()
    };
  }, [currentBusinessType]);

  // Planes disponibles filtrados por la PlanFamily seleccionada
  const availablePlans = useMemo(() => {
    if (!dbPlans || dbPlans.length === 0) return [];

    const famCode = (currentPlanFamily?.code || "").toUpperCase();
    const famId = currentPlanFamily?.id || "";
    const bSlug = (currentBusinessType?.slug || "").toLowerCase();
    const mappedCode = (BUSINESS_FAMILY_MAP[bSlug] || "").toUpperCase();

    const filtered = dbPlans.filter(p => {
      // 1. Por familyId si existe
      if (famId && p.familyId === famId) return true;

      // 2. Por código de familia en la entidad Plan
      const pFamCode = (
        (typeof p.family === 'object' && p.family !== null ? p.family.code : (p.familyCode || p.family)) || ""
      ).toUpperCase();

      if (famCode && pFamCode === famCode) return true;
      if (mappedCode && pFamCode === mappedCode) return true;

      // 3. Por slug del plan (ej: 'restaurante-inicio', 'servicios-pro', etc.)
      const pSlug = (p.slug || "").toLowerCase();
      if (famCode && pSlug.includes(famCode.toLowerCase())) return true;
      if (mappedCode && pSlug.includes(mappedCode.toLowerCase())) return true;
      if (bSlug && pSlug.includes(bSlug)) return true;

      return false;
    }).sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));

    // Si por alguna razón la búsqueda estricta no arrojó planes, mostrar catálogo global como fallback
    if (filtered.length === 0) {
      return [...dbPlans].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    }

    return filtered;
  }, [currentPlanFamily, currentBusinessType, dbPlans]);

  // Sincronizar selección de plan cuando cambia la familia
  useEffect(() => {
    if (availablePlans.length > 0) {
      const exists = availablePlans.some(p => p.id === selectedPlanId);
      if (!exists) {
        const defaultPlan = availablePlans.find(p => p.isDefault) || availablePlans.find(p => Number(p.price) > 0) || availablePlans[0];
        if (defaultPlan) {
          setSelectedPlanId(defaultPlan.id);
        }
      }
    }
  }, [availablePlans, selectedPlanId]);

  // Sincronizar configuraciones adaptativas cuando cambia el BusinessType
  useEffect(() => {
    if (!currentBusinessType) return;

    const bSlug = currentBusinessType.slug;
    let bId = 'restaurant_standard';
    if (bSlug === 'comandas') bId = 'restaurant_standard';
    else if (bSlug === 'pinchos' || bSlug === 'fast-food') bId = 'fast_food_standard';
    else if (bSlug === 'citas') bId = 'spa_luxury_standard';
    else if (bSlug === 'reservas') bId = 'padel_club_standard';
    else if (bSlug === 'ordenes-servicio') bId = 'shoe_care_standard';
    else if (bSlug === 'ecommerce') bId = 'store_standard';
    else if (bSlug === 'gimnasio') bId = 'gym';
    else if (bSlug === 'dentista') bId = 'clinic_medical_standard';

    const manifest = getTemplateManifest(bId) || TEMPLATE_REGISTRY.PADEL_CLUB_STANDARD;

    // Colores sugeridos
    if (manifest.suggestedColors) {
      setGeneralInfo(prev => ({
        ...prev,
        colorPrimario: currentBusinessType.color || manifest.suggestedColors?.primaryColor || prev.colorPrimario,
        colorSecundario: manifest.suggestedColors?.secondaryColor || prev.colorSecundario
      }));
    }

    // Recursos iniciales recomendados
    if (manifest.initialResources && manifest.initialResources.length > 0) {
      setInitialResources(manifest.initialResources.map(r => ({
        name: r.name || 'Recurso',
        category: (r as any).category || (r as any).resourceType || 'General',
        capacity: (r as any).capacity || 1,
        quantity: 1
      })));
    }

    // Servicios sugeridos
    if (manifest.initialServices && manifest.initialServices.length > 0) {
      setCatalogItems(manifest.initialServices.map(s => ({
        type: 'service',
        name: s.nombre,
        category: s.categoria || 'General',
        price: s.precio || 0,
        duration: s.duracionMinutos || 45,
        description: s.descripcion
      })));
    } else if (bSlug === 'ecommerce' || bSlug === 'comandas' || bSlug === 'pinchos') {
      setCatalogItems([
        { type: 'product', name: bSlug === 'pinchos' ? 'Combo Pincho Mixto Especial' : (bSlug === 'comandas' ? 'Especial de la Casa' : 'Producto Destacado'), category: 'Destacados', price: 15.0, stock: 25 },
        { type: 'product', name: bSlug === 'pinchos' ? 'Bebida Refrescante Especial' : (bSlug === 'comandas' ? 'Bebida Artesanal' : 'Accesorio Premium'), category: 'Bebidas', price: 3.5, stock: 50 }
      ]);
    }

    // Canales por vertical
    if (bSlug === 'comandas') {
      setChannels(['TABLE', 'QR', 'WAITER', 'KITCHEN_KDS', 'DELIVERY', 'PICKUP', 'POS']);
    } else if (bSlug === 'pinchos' || bSlug === 'fast-food') {
      setChannels(['QR', 'KITCHEN_KDS', 'DELIVERY', 'PICKUP', 'POS']);
    } else if (bSlug === 'ecommerce') {
      setChannels(['DELIVERY', 'PICKUP', 'POS', 'QR']);
    } else if (bSlug === 'citas' || bSlug === 'dentista') {
      setChannels(['RESERVATIONS', 'POS', 'QR']);
    } else if (bSlug === 'reservas') {
      setChannels(['RESERVATIONS', 'POS', 'QR']);
    } else if (bSlug === 'gimnasio') {
      setChannels(['MEMBERSHIPS', 'QR_ACCESS', 'POS']);
    } else {
      setChannels(['DELIVERY', 'PICKUP', 'POS', 'QR']);
    }

    // Módulos
    setActiveModules(['PROMOTIONS', 'COMMUNICATIONS', 'AI_ASSISTANT', 'INVENTORY']);

    // Título Landing por defecto
    setLandingHero(prev => ({
      ...prev,
      title: prev.title || `Bienvenido a tu nueva app de ${currentBusinessType.name}`,
      subtitle: prev.subtitle || currentBusinessType.description || 'Calidad y servicio garantizado.'
    }));

  }, [currentBusinessType]);

  // Autogenerar slug en tiempo real desde el nombre
  const handleNombreChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    setGeneralInfo(prev => ({
      ...prev,
      nombre: name,
      slug: prev.slug === "" || prev.slug === slug.slice(0, -1) ? slug : prev.slug,
      adminNombre: prev.adminNombre || name
    }));
  };

  // Generador seguro de contraseña para admin
  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneralInfo(prev => ({ ...prev, adminPassword: pass }));
  };

  // Guardar y Enviar solicitud de Aprovisionamiento
  const handleProvisionSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!generalInfo.nombre.trim()) throw new Error("Ingresa el nombre del negocio.");
      if (!generalInfo.slug.trim()) throw new Error("Ingresa el slug para el negocio.");
      if (!generalInfo.adminEmail.trim()) throw new Error("Ingresa el correo electrónico del administrador.");
      if (!generalInfo.adminPassword.trim()) throw new Error("Ingresa una contraseña para el administrador.");

      const payload = {
        mode: quickMode ? 'quick' : 'blueprint',
        businessTypeId: selectedTypeId,
        planId: selectedPlanId,
        isFounder,
        founderPosition: isFounder ? founderPosition : undefined,
        lockedPrice: isFounder ? lockedPrice : undefined,
        trialDays: isFounder ? 30 : undefined,
        // Precio negociado — independiente del Founder
        ...(applyNegotiatedPrice && negotiatedPrice > 0 ? {
          negotiatedPrice,
          negotiatedPriceDuration,
          negotiatedPriceReason: negotiatedPriceReason || undefined,
        } : {}),
        generalInfo,
        landingHero,
        landingHighlights,
        catalogItems,
        branches,
        channels,
        activeModules,
        initialResources
      };


      const res = await fetch("/api/superadmin/businesses/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Ocurrió un error al aprovisionar el negocio.");
      }

      setProvisionResult(data);
      onSuccess(data);
    } catch (err: any) {
      console.error("Error en aprovisionamiento:", err);
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Botón para acceder al Admin vía impersonación delegada
  const handleEnterAdmin = async (businessId: string) => {
    setEnteringAdmin(true);
    try {
      const res = await fetch(`/api/superadmin/businesses/${businessId}/access`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        const url = data.redirectUrl || `/admin`;
        window.open(url, "_blank");
      } else {
        window.open(`/admin`, "_blank");
      }
    } catch (err) {
      window.open(`/admin`, "_blank");
    } finally {
      setEnteringAdmin(false);
    }
  };

  // Copiar link al portapapeles
  const handleCopyLink = (url: string) => {
    if (typeof window !== "undefined") {
      const fullUrl = `${window.location.origin}${url}`;
      navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PANTALLA FINAL: 🎉 APP LISTA PARA ENTREGAR
  // ══════════════════════════════════════════════════════════════════════════
  if (provisionResult) {
    const publicUrl = provisionResult.publicAppUrl || `/${provisionResult.slug}`;

    return (
      <div className="max-w-3xl w-full bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl p-6 sm:p-10 text-white font-sans text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center gap-3">
          <div className="size-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-2xl shadow-emerald-500/40 animate-bounce">
            <Rocket size={40} strokeWidth={2.5} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wide text-emerald-400">
            Aprovisionamiento Exitoso
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            🎉 App lista para entregar
          </h2>
          <p className="text-sm text-slate-400 max-w-md">
            El negocio <strong className="text-emerald-400">{provisionResult.nombre || provisionResult.slug}</strong> ha sido configurado y provisionado con todos sus módulos operativos.
          </p>
        </div>

        {/* Resumen de Accesos */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 sm:p-6 text-left space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Negocio & Slug</p>
              <p className="font-bold text-white text-base truncate">{provisionResult.nombre || generalInfo.nombre}</p>
              <p className="text-xs text-emerald-400 font-mono">/{provisionResult.slug}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan Comercial</p>
              <p className="font-bold text-white text-base">{provisionResult.plan || "Crecimiento"}</p>
              <p className="text-xs text-slate-400">{isFounder ? "🌟 Socio Fundador Activo" : "30 Días de Prueba"}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Administrador Inicial</p>
              <p className="text-xs text-slate-300 font-bold">{provisionResult.adminEmail || generalInfo.adminEmail}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                Rol: ADMIN
              </span>
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                Módulos: {provisionResult.modules?.length || 4}
              </span>
            </div>
          </div>
        </div>

        {/* Botones de Acción Inmediata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => window.open(publicUrl, "_blank")}
            className="flex items-center justify-center gap-2.5 py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition active:scale-95"
          >
            <ExternalLink size={16} /> Abrir App Pública
          </button>

          <button
            type="button"
            disabled={enteringAdmin}
            onClick={() => handleEnterAdmin(provisionResult.businessId)}
            className="flex items-center justify-center gap-2.5 py-4 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider border border-slate-700 transition active:scale-95"
          >
            {enteringAdmin ? <Loader2 size={16} className="animate-spin text-emerald-400" /> : <ShieldCheck size={16} className="text-emerald-400" />}
            Entrar como Administrador
          </button>

          <button
            type="button"
            onClick={() => handleCopyLink(publicUrl)}
            className="flex items-center justify-center gap-2 py-3 px-5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-xl font-bold text-xs transition"
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copiedLink ? "¡Enlace Copiado!" : "Copiar Enlace de la App"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-2 py-3 px-5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-xl font-bold text-xs transition"
          >
            Ver Negocios en Superadmin
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODO ENTREGA RÁPIDA ⚡
  // ══════════════════════════════════════════════════════════════════════════
  if (quickMode) {
    return (
      <div className="dark max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Zap size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">⚡ Entrega Rápida de App</h3>
                <span className="text-xs font-bold uppercase px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30">
                  Modo Exprés
                </span>
              </div>
              <p className="text-xs text-slate-400">Completa lo esencial y entrega la app lista en menos de 1 minuto.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuickMode(false)}
              className="text-xs font-bold text-slate-400 hover:text-emerald-400 px-3 py-1.5 rounded-xl bg-slate-800 transition"
            >
              Cambiar a Modo Guiado
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Formulario Rápido */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Tipo de Negocio y Plan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">¿Qué tipo de negocio es?</label>
              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner cursor-pointer"
              >
                {businessTypes.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">Plan de Suscripción</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner cursor-pointer"
              >
                {availablePlans.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name} — ${p.price}/mes {p.isDefault ? "(Recomendado)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Datos Esenciales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">Nombre Comercial <span className="text-rose-400 font-bold">*</span></label>
              <input
                type="text"
                placeholder="Ej: Pizzería Di Napoli"
                value={generalInfo.nombre}
                onChange={(e) => handleNombreChange(e.target.value)}
                style={{ color: '#ffffff' }}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold !text-white caret-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner transition hover:border-slate-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f172a_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">Slug URL de la App <span className="text-rose-400 font-bold">*</span></label>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-mono shadow-inner transition hover:border-slate-500 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20">
                <span className="text-emerald-400 font-bold select-none pr-1">/</span>
                <input
                  type="text"
                  placeholder="pizzeria-dinapoli"
                  value={generalInfo.slug}
                  onChange={(e) => setGeneralInfo(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  style={{ color: '#34d399' }}
                  className="w-full bg-transparent !text-emerald-400 font-bold focus:outline-none outline-none border-none shadow-none ring-0 focus:ring-0 placeholder:text-slate-500 caret-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* 3. Contacto y Ciudad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">WhatsApp de Contacto <span className="text-rose-400 font-bold">*</span></label>
              <input
                type="text"
                placeholder="+593 99 999 9999"
                value={generalInfo.whatsapp}
                onChange={(e) => setGeneralInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                style={{ color: '#ffffff' }}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold !text-white caret-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner transition hover:border-slate-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f172a_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200">Ciudad o Dirección</label>
                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(true)}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition cursor-pointer"
                >
                  <MapPin size={12} />
                  <span>Fijar en Mapa</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Guayaquil, Samborondón..."
                  value={generalInfo.direccion || generalInfo.ciudad}
                  onChange={(e) => setGeneralInfo(prev => ({ ...prev, ciudad: e.target.value, direccion: e.target.value }))}
                  style={{ color: '#ffffff' }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold !text-white caret-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner transition hover:border-slate-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f172a_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]"
                />
                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(true)}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shrink-0 transition active:scale-95 shadow-lg shadow-emerald-600/25 cursor-pointer"
                  title="Abrir mapa interactivo para seleccionar ubicación exacta"
                >
                  <MapPin size={16} />
                  <span className="hidden sm:inline">Mapa</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Administrador */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              Acceso del Administrador
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Email del Administrador</label>
                <input
                  type="email"
                  placeholder="admin@negocio.com"
                  value={generalInfo.adminEmail}
                  onChange={(e) => setGeneralInfo(prev => ({ ...prev, adminEmail: e.target.value }))}
                  style={{ color: '#ffffff' }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold !text-white caret-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-400">Contraseña</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs text-emerald-400 hover:underline font-bold"
                  >
                    Generar segura
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Contraseña"
                  value={generalInfo.adminPassword}
                  onChange={(e) => setGeneralInfo(prev => ({ ...prev, adminPassword: e.target.value }))}
                  style={{ color: '#ffffff' }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold !text-white caret-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 5. Identidad Visual Rápida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Logo del Negocio</label>
              <ImageUploader
                category="logo"
                currentUrl={generalInfo.logoUrl}
                uploadUrl="/api/superadmin/upload"
                onUploadSuccess={(media) => setGeneralInfo(prev => ({ ...prev, logoUrl: media.url }))}
                onRemove={() => setGeneralInfo(prev => ({ ...prev, logoUrl: "" }))}
                label="Subir logo"
                compact
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Portada / Banner</label>
              <ImageUploader
                category="banner"
                aspect="landscape"
                currentUrl={generalInfo.bannerUrl}
                uploadUrl="/api/superadmin/upload"
                onUploadSuccess={(media) => setGeneralInfo(prev => ({ ...prev, bannerUrl: media.url }))}
                onRemove={() => setGeneralInfo(prev => ({ ...prev, bannerUrl: "" }))}
                label="Subir portada"
                compact
              />
            </div>
          </div>

          {/* Selector de Color de Marca Rápido */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Palette size={14} className="text-emerald-400" />
                Color de Marca / Tema de la App
              </label>
              <div className="flex items-center gap-2">
                <div 
                  className="size-4 rounded-full border border-white/20 shadow-sm" 
                  style={{ backgroundColor: generalInfo.colorPrimario }} 
                />
                <span className="text-xs font-mono text-slate-400 font-bold">{generalInfo.colorPrimario}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {BRAND_PRESET_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onClick={() => setGeneralInfo(prev => ({ ...prev, colorPrimario: c.hex }))}
                  className={`size-7 rounded-xl border transition-all ${c.bgClass} flex items-center justify-center ${
                    generalInfo.colorPrimario.toLowerCase() === c.hex.toLowerCase()
                      ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900 border-white'
                      : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  {generalInfo.colorPrimario.toLowerCase() === c.hex.toLowerCase() && <Check size={12} className="text-white" strokeWidth={3} />}
                </button>
              ))}
              <div className="relative flex items-center">
                <input
                  type="color"
                  value={generalInfo.colorPrimario}
                  onChange={(e) => setGeneralInfo(prev => ({ ...prev, colorPrimario: e.target.value }))}
                  className="size-7 rounded-xl border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                  title="Personalizar color hexadecimal"
                />
              </div>
            </div>
          </div>

          {/* Checkbox Fundador */}
          <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <input
              type="checkbox"
              id="founder_quick"
              checked={isFounder}
              onChange={(e) => setIsFounder(e.target.checked)}
              className="size-4 accent-amber-500 rounded cursor-pointer"
            />
            <label htmlFor="founder_quick" className="text-xs text-amber-200 font-bold cursor-pointer">
              Registrar como <strong>Socio Fundador</strong> ($10/mes bloqueado para siempre)
            </label>
          </div>
        </div>

        {/* Footer Rápido */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-white px-4 py-2"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleProvisionSubmit}
            className="flex items-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition active:scale-95"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
            Crear y Entregar App
          </button>
        </div>

        {/* Modal de Mapa GPS */}
        <WizardLocationMapModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          initialLat={generalInfo.latitude}
          initialLng={generalInfo.longitude}
          initialSearchQuery={generalInfo.direccion || generalInfo.ciudad || generalInfo.nombre}
          onConfirm={handleMapConfirm}
        />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODO GUIADO COMPLETO (8 PASOS)
  // ══════════════════════════════════════════════════════════════════════════
  const stepTitles = [
    "Tipo de Negocio",
    "Plan Comercial",
    "Identidad & Datos",
    "Contenido Inicial",
    "Landing Page",
    "Configuración Operativa",
    "Administrador",
    "Resumen Final"
  ];

  return (
    <div className="dark max-w-5xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white font-sans relative">
      {/* Header Fijo */}
      <div className="flex flex-col border-b border-slate-800 bg-slate-950/80 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between px-5 sm:px-8 py-3.5 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold uppercase tracking-wide text-emerald-400">
                Superadmin • Provisioning
              </span>
              <button
                type="button"
                onClick={() => setQuickMode(true)}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition"
              >
                <Zap size={10} /> Modo Entrega Rápida
              </button>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Entrega una nueva app</h2>
            <p className="text-xs text-slate-400 hidden sm:block">Configura el negocio, carga su contenido y deja todo listo para comenzar.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper Horizontal Scrollable sin barra nativa */}
        <div 
          className="flex items-center gap-2 px-4 sm:px-8 py-2.5 overflow-x-auto border-t border-slate-800/80 bg-slate-950/80 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
            const isActive = s === step;
            const isCompleted = s < step;
            return (
              <button
                key={s}
                type="button"
                onClick={() => s <= step && setStep(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
 isActive
 ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
 : isCompleted
 ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
 : 'text-slate-400 hover:text-slate-300 bg-slate-900/60'
 }`}
              >
                <span className={`size-4 rounded-full flex items-center justify-center text-xs ${
 isActive ? 'bg-slate-950 text-white' : isCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
 }`}>
                  {isCompleted ? <Check size={10} strokeWidth={3} /> : s}
                </span>
                <span className="hidden md:inline">{stepTitles[s - 1]}</span>
                <span className="md:hidden">P{s}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido Central Scrollable con scrollbar estilizado */}
      <div 
        className="p-5 sm:p-8 overflow-y-auto space-y-6 flex-1 text-sm [scrollbar-width:thin] scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold animate-in fade-in">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PASO 1 — TIPO DE NEGOCIO (BusinessType dinámico)
        ══════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-xl font-bold text-white">¿Qué tipo de negocio es?</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Selecciona la industria. El sistema determinará automáticamente la familia de planes, capacidades y plantilla adecuada.
              </p>
            </div>

            {loadingTypes ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={32} className="animate-spin text-emerald-400" />
                <p className="text-xs">Cargando catálogo oficial de BusinessTypes...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {businessTypes.map((type) => {
                  const isSelected = type.id === selectedTypeId;
                  const IconComp = ICON_MAP[type.icon] || Building2;
                  const famName = type.planFamily?.name || type.slug;

                  return (
                    <div
                      key={type.id}
                      onClick={() => setSelectedTypeId(type.id)}
                      className={`relative p-5 rounded-3xl border cursor-pointer transition-all duration-300 flex flex-col justify-between gap-3 text-left ${
                        isSelected
                          ? "bg-emerald-950/20 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/20"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950/90"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          className="size-12 rounded-2xl flex items-center justify-center shadow-lg transition"
                          style={{
                            backgroundColor: `${type.color || '#059669'}20`,
                            color: type.color || '#10b981'
                          }}
                        >
                          <IconComp size={24} />
                        </div>
                        {isSelected && (
                          <span className="size-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                            <Check size={14} strokeWidth={3} />
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-white text-base tracking-tight">{type.name}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {type.description || "Solución especializada para este sector."}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Familia: <strong className="text-slate-300">{famName}</strong></span>
                        <span className="text-emerald-400 uppercase tracking-wider">Listo</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PASO 2 — PLAN COMERCIAL & SOCIO FUNDADOR
        ══════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">Selecciona el Plan Comercial</h3>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                  {currentPlanFamily?.name || "Familia Activa"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Planes oficiales asociados dinámicamente a la industria seleccionada.
              </p>
            </div>

            {/* Selector de Planes */}
            {loadingPlans ? (
              <div className="py-14 flex flex-col items-center justify-center gap-3 text-slate-300 bg-slate-900/60 border border-slate-800 rounded-3xl">
                <Loader2 size={36} className="animate-spin text-emerald-400" />
                <p className="text-sm font-bold">Cargando planes comerciales...</p>
                <p className="text-xs text-slate-400">Sincronizando con catálogo canónico de {currentPlanFamily?.name || "la vertical"}</p>
              </div>
            ) : availablePlans.length === 0 ? (
              <div className="p-8 bg-slate-900/80 border border-slate-700 rounded-3xl text-center space-y-3">
                <AlertCircle size={32} className="text-amber-400 mx-auto" />
                <p className="text-base font-bold text-white">No se encontraron planes para esta vertical específica</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Por favor vuelve al Paso 1 y selecciona otra categoría, o utiliza el modo de entrega rápida.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availablePlans.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;
                  const priceFormatted = Number(plan.price) === 0 ? "Gratis" : `$${Number(plan.price).toFixed(2)}`;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative p-5 rounded-3xl border cursor-pointer transition-all duration-300 flex flex-col justify-between gap-4 text-left ${
                        isSelected
                          ? "bg-emerald-950/40 border-2 border-emerald-400 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-400/20 scale-[1.02]"
                          : "bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 hover:bg-slate-900 hover:scale-[1.01]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-emerald-300' : 'text-emerald-400'}`}>
                            {plan.name}
                          </span>
                          {isSelected ? (
                            <span className="size-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
                              <Check size={14} strokeWidth={3} />
                            </span>
                          ) : plan.isDefault ? (
                            <span className="text-xs font-bold px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                              Popular
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2.5 flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-white">{priceFormatted}</span>
                          {Number(plan.price) > 0 && <span className="text-xs text-slate-300 font-bold">/ mes</span>}
                        </div>
                        <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                          {plan.description || "Capacidades completas del vertical."}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-700/70 space-y-2 text-xs text-slate-200">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                          <Check size={14} strokeWidth={3} className="shrink-0" />
                          <span>30 Días de Prueba incluidos</span>
                        </div>
                        {plan.planLimits?.slice(0, 3).map((l: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                            <span className="text-slate-400 font-medium">{l.limitKey.replace(/MAX_/g, "").replace(/_/g, " ")}:</span>
                            <strong className="text-white font-bold">{l.limitValue < 0 || l.limitValue >= 99999 ? "Ilimitado" : l.limitValue}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Opción Socio Fundador */}
            <div className="p-5 bg-gradient-to-r from-amber-500/10 via-slate-950/80 to-slate-950 border border-amber-500/30 rounded-3xl space-y-3">
              <div className="flex items-start gap-3.5">
                <input
                  type="checkbox"
                  id="founder_checkbox"
                  checked={isFounder}
                  onChange={(e) => setIsFounder(e.target.checked)}
                  className="size-5 accent-amber-500 rounded-lg cursor-pointer mt-0.5"
                />
                <div>
                  <label htmlFor="founder_checkbox" className="font-bold text-white text-sm cursor-pointer flex items-center gap-2">
                    <Award size={18} className="text-amber-400" />
                    Registrar como Socio Fundador
                  </label>
                  <p className="text-xs text-slate-400 mt-1">
                    Garantiza tarifa congelada a <strong className="text-amber-300">${lockedPrice.toFixed(2)}/mes</strong> de por vida, prioridad de onboarding y badge de socio fundador.
                  </p>
                </div>
              </div>

              {isFounder && (
                <div className="pt-3 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-amber-200 mb-1">Posición de Fundador (#)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={founderPosition}
                      onChange={(e) => setFounderPosition(parseInt(e.target.value) || 1)}
                      style={{ color: '#ffffff' }}
                      className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-bold !text-white caret-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-200 mb-1">Tarifa Bloqueada ($/mes)</label>
                    <input
                      type="number"
                      step={0.5}
                      value={lockedPrice}
                      onChange={(e) => setLockedPrice(parseFloat(e.target.value) || 10.0)}
                      style={{ color: '#ffffff' }}
                      className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-bold !text-white caret-white focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Bloque Precio Negociado ──────────────────────────────── */}
            {(() => {
              const selectedPlan = dbPlans.find((p: any) => p.id === selectedPlanId);
              return selectedPlan ? (
                <div className="p-5 bg-gradient-to-r from-indigo-500/10 via-slate-950/80 to-slate-950 border border-indigo-500/30 rounded-3xl space-y-3">
                  <div className="flex items-start gap-3.5">
                    <input
                      type="checkbox"
                      id="negotiated_price_checkbox"
                      checked={applyNegotiatedPrice}
                      onChange={(e) => setApplyNegotiatedPrice(e.target.checked)}
                      className="size-5 accent-indigo-500 rounded-lg cursor-pointer mt-0.5"
                    />
                    <div>
                      <label htmlFor="negotiated_price_checkbox" className="font-bold text-white text-sm cursor-pointer flex items-center gap-2">
                        <svg className="text-indigo-400 w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/><path d="M12 8v4m0 4h.01"/></svg>
                        Aplicar precio negociado
                      </label>
                      <p className="text-xs text-slate-400 mt-1">
                        Precio oficial: <strong className="text-white">${selectedPlan.price?.toFixed(2)}/mes</strong> — Un precio negociado no modifica el catálogo.
                      </p>
                    </div>
                  </div>

                  {applyNegotiatedPrice && (
                    <div className="pt-3 border-t border-indigo-500/20 space-y-4 animate-in fade-in">
                      <div>
                        <label className="block text-xs font-bold text-indigo-200 mb-1">Precio negociado ($/mes)</label>
                        <input
                          type="number"
                          step={0.5}
                          min={0}
                          value={negotiatedPrice}
                          onChange={(e) => setNegotiatedPrice(parseFloat(e.target.value) || 0)}
                          style={{ color: '#ffffff' }}
                          placeholder={`Precio oficial: $${selectedPlan.price?.toFixed(2)}`}
                          className="w-full bg-slate-900 border border-indigo-500/40 rounded-xl px-3 py-2 text-xs font-bold !text-white caret-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-indigo-200 mb-2">Duración</label>
                        <div className="flex flex-wrap gap-2">
                          {([
                            { key: 'PERMANENT', label: 'Permanente' },
                            { key: '1', label: '1 ciclo' },
                            { key: '2', label: '2 ciclos' },
                            { key: '3', label: '3 ciclos' },
                            { key: '6', label: '6 ciclos' },
                            { key: 'custom', label: 'Personalizado' },
                          ] as const).map(({ key, label }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setNegotiatedDurationMode(key);
                                if (key === 'PERMANENT') setNegotiatedPriceDuration('PERMANENT');
                                else if (key !== 'custom') setNegotiatedPriceDuration(parseInt(key));
                                else setNegotiatedPriceDuration(negotiatedCustomCycles);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                negotiatedDurationMode === key
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >{label}</button>
                          ))}
                        </div>
                        {negotiatedDurationMode === 'custom' && (
                          <div className="mt-2">
                            <label className="block text-xs font-bold text-indigo-200 mb-1">Ciclos personalizados</label>
                            <input
                              type="number"
                              min={1}
                              value={negotiatedCustomCycles}
                              onChange={(e) => {
                                const v = parseInt(e.target.value) || 1;
                                setNegotiatedCustomCycles(v);
                                setNegotiatedPriceDuration(v);
                              }}
                              style={{ color: '#ffffff' }}
                              className="w-full bg-slate-900 border border-indigo-500/40 rounded-xl px-3 py-2 text-xs font-bold !text-white caret-white focus:outline-none"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-indigo-200 mb-1">Razón / Nota de auditoría</label>
                        <input
                          type="text"
                          placeholder="Ej: Cliente referido, campaña de lanzamiento..."
                          value={negotiatedPriceReason}
                          onChange={(e) => setNegotiatedPriceReason(e.target.value)}
                          style={{ color: '#ffffff' }}
                          className="w-full bg-slate-900 border border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-white caret-white focus:outline-none"
                        />
                      </div>

                      {negotiatedPrice > 0 && (
                        <div className="rounded-2xl bg-slate-900/70 border border-indigo-500/20 p-4 space-y-1.5 text-xs">
                          <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Resumen comercial</p>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Plan</span>
                            <span className="font-bold text-white">{selectedPlan.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Precio oficial</span>
                            <span className="text-slate-300">${selectedPlan.price?.toFixed(2)}/mes</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Precio negociado</span>
                            <span className="font-bold text-indigo-300">${negotiatedPrice.toFixed(2)}/mes</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Duración</span>
                            <span className="font-bold text-white">
                              {negotiatedDurationMode === 'PERMANENT' ? 'Permanente' :
                               negotiatedDurationMode === 'custom' ? `${negotiatedCustomCycles} ciclos` :
                               `${negotiatedDurationMode} ciclo${parseInt(negotiatedDurationMode) > 1 ? 's' : ''}`}
                            </span>
                          </div>
                          {negotiatedDurationMode !== 'PERMANENT' && (
                            <div className="flex justify-between pt-1.5 border-t border-slate-700/60">
                              <span className="text-slate-400">Después del período</span>
                              <span className="font-bold text-amber-300">${selectedPlan.price?.toFixed(2)}/mes (precio oficial)</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null;
            })()}
          </div>
        )}




        {/* ══════════════════════════════════════════════════════════════════
            PASO 3 — INFORMACIÓN DEL NEGOCIO & IDENTIDAD
        ══════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-xl font-bold text-white">Información del Negocio & Identidad</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Datos de contacto, dirección y activos de marca para la app del cliente.
              </p>
            </div>

            {/* Datos Principales con Alto Contraste */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">Nombre Comercial <span className="text-rose-400 font-bold">*</span></label>
                <input
                  type="text"
                  placeholder="Ej: Trattoria Bella Italia"
                  value={generalInfo.nombre}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  style={{ color: '#ffffff' }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold !text-white caret-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner transition hover:border-slate-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f172a_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">Slug URL de la App <span className="text-rose-400 font-bold">*</span></label>
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-mono shadow-inner transition hover:border-slate-500 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20">
                  <span className="text-emerald-400 font-bold select-none pr-1">/</span>
                  <input
                    type="text"
                    placeholder="slug-del-negocio"
                    value={generalInfo.slug}
                    onChange={(e) => setGeneralInfo(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    style={{ color: '#34d399' }}
                    className="w-full bg-transparent !text-emerald-400 font-bold focus:outline-none outline-none border-none shadow-none ring-0 focus:ring-0 placeholder:text-slate-500 caret-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">WhatsApp de Contacto <span className="text-rose-400 font-bold">*</span></label>
                <input
                  type="text"
                  placeholder="+593 99 999 9999"
                  value={generalInfo.whatsapp}
                  onChange={(e) => setGeneralInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                  style={{ color: '#ffffff' }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold !text-white caret-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner transition hover:border-slate-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f172a_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">Email de Notificaciones</label>
                <input
                  type="email"
                  placeholder="contacto@negocio.com"
                  value={generalInfo.emailContacto}
                  onChange={(e) => setGeneralInfo(prev => ({ ...prev, emailContacto: e.target.value }))}
                  style={{ color: '#ffffff' }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold !text-white caret-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner transition hover:border-slate-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f172a_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-200">Dirección y Ciudad</label>
                  <button
                    type="button"
                    onClick={() => setIsMapModalOpen(true)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition cursor-pointer"
                  >
                    <MapPin size={12} />
                    <span>Fijar en Mapa</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Av. Principal #123, Guayaquil"
                  value={generalInfo.direccion}
                  onChange={(e) => setGeneralInfo(prev => ({ ...prev, direccion: e.target.value, ciudad: prev.ciudad || "Guayaquil" }))}
                  style={{ color: '#ffffff' }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold !text-white caret-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner transition hover:border-slate-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f172a_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-200">Ubicación GPS (Link Google Maps)</label>
                  {generalInfo.latitude && generalInfo.longitude ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <Check size={10} strokeWidth={3} /> GPS fijado ({generalInfo.latitude.toFixed(4)}, {generalInfo.longitude.toFixed(4)})
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://maps.google.com/..."
                    value={generalInfo.gpsUrl}
                    onChange={(e) => setGeneralInfo(prev => ({ ...prev, gpsUrl: e.target.value }))}
                    style={{ color: '#ffffff' }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold !text-white caret-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner transition hover:border-slate-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f172a_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]"
                  />
                  <button
                    type="button"
                    onClick={() => setIsMapModalOpen(true)}
                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shrink-0 transition active:scale-95 shadow-lg shadow-emerald-600/25 cursor-pointer"
                    title="Abrir mapa interactivo para seleccionar ubicación exacta"
                  >
                    <MapPin size={16} />
                    <span className="hidden sm:inline">Mapa</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Identidad Visual con ImageUploader */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Logo de la App</label>
                <ImageUploader
                  category="logo"
                  currentUrl={generalInfo.logoUrl}
                  uploadUrl="/api/superadmin/upload"
                  onUploadSuccess={(media) => setGeneralInfo(prev => ({ ...prev, logoUrl: media.url }))}
                  onRemove={() => setGeneralInfo(prev => ({ ...prev, logoUrl: "" }))}
                  label="Arrastra o selecciona el logo"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Portada / Banner</label>
                <ImageUploader
                  category="banner"
                  aspect="landscape"
                  currentUrl={generalInfo.bannerUrl}
                  uploadUrl="/api/superadmin/upload"
                  onUploadSuccess={(media) => setGeneralInfo(prev => ({ ...prev, bannerUrl: media.url }))}
                  onRemove={() => setGeneralInfo(prev => ({ ...prev, bannerUrl: "" }))}
                  label="Arrastra o selecciona el banner"
                />
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PASO 4 — CONTENIDO INICIAL ADAPTATIVO & CATÁLOGO
        ══════════════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-white">Contenido Inicial Adaptativo</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Artículos, servicios o recursos configurados específicamente para {currentBusinessType?.name}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 shrink-0 self-start sm:self-auto"
              >
                <FileSpreadsheet size={16} /> Importar Catálogo (Excel/CSV)
              </button>
            </div>

            {/* Listado de Ítems del Catálogo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ítems Listos ({catalogItems.length})
                </span>
                <button
                  type="button"
                  onClick={() => setCatalogItems(prev => [
                    ...prev,
                    { type: currentBusinessType?.slug === 'citas' ? 'service' : 'product', name: 'Nuevo Ítem', price: 10, category: 'General' }
                  ])}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <Plus size={14} /> Agregar ítem manual
                </button>
              </div>

              {catalogItems.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-800 rounded-3xl text-center text-slate-500">
                  <p className="text-xs">No hay ítems en el catálogo aún.</p>
                  <p className="text-xs mt-1 text-slate-600">Puedes importar un archivo Excel o agregar ítems manualmente.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {catalogItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                      <div className="truncate">
                        <p className="font-bold text-white text-xs truncate">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.category || 'General'} • ${item.price?.toFixed(2)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCatalogItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-rose-400 p-1.5 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Universal de Importación */}
            <CatalogImportModal
              isOpen={isCatalogModalOpen}
              onClose={() => setIsCatalogModalOpen(false)}
              defaultType={currentBusinessType?.slug === 'citas' ? 'service' : 'product'}
              onImportSuccess={(newItems) => {
                setCatalogItems(prev => [...prev, ...newItems]);
              }}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PASO 5 — LANDING PAGE (Hero & Identidad de Marca)
        ══════════════════════════════════════════════════════════════════ */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-xl font-bold text-white">Identidad Visual & Landing Page</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Define la paleta de colores de la marca, el banner principal (Hero) y la apariencia visual de la app.
              </p>
            </div>

            {/* 1. Colores de Marca y Tema Visual */}
            <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Palette size={16} />
                  Paleta de Colores de la Marca
                </h4>
                <span className="text-xs text-slate-400">Personaliza la estética de la app</span>
              </div>

              {/* Selector de Color Primario */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <span>Color Primario (Tema de Botones, Acentos y Badges)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="size-4 rounded-full border border-white/30 shadow-sm" 
                      style={{ backgroundColor: generalInfo.colorPrimario }} 
                    />
                    <input
                      type="text"
                      value={generalInfo.colorPrimario}
                      onChange={(e) => setGeneralInfo(prev => ({ ...prev, colorPrimario: e.target.value }))}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white text-center uppercase"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {BRAND_PRESET_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.name}
                      onClick={() => setGeneralInfo(prev => ({ ...prev, colorPrimario: c.hex }))}
                      className={`h-8 px-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold text-white shadow-sm ${
                        generalInfo.colorPrimario.toLowerCase() === c.hex.toLowerCase()
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 border-white scale-105'
                          : 'border-transparent opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {generalInfo.colorPrimario.toLowerCase() === c.hex.toLowerCase() && (
                        <Check size={12} strokeWidth={3} />
                      )}
                      <span>{c.name}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-1">
                    <input
                      type="color"
                      value={generalInfo.colorPrimario}
                      onChange={(e) => setGeneralInfo(prev => ({ ...prev, colorPrimario: e.target.value }))}
                      className="size-8 rounded-xl border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                      title="Seleccionar color personalizado"
                    />
                    <span className="text-xs text-slate-500 font-bold">Personalizado</span>
                  </div>
                </div>
              </div>

              {/* Selector de Color Secundario */}
              <div className="space-y-2 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Color Secundario / Fondo de Contraste
                  </label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="size-4 rounded-full border border-white/30 shadow-sm" 
                      style={{ backgroundColor: generalInfo.colorSecundario }} 
                    />
                    <input
                      type="text"
                      value={generalInfo.colorSecundario}
                      onChange={(e) => setGeneralInfo(prev => ({ ...prev, colorSecundario: e.target.value }))}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white text-center uppercase"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[
                    { name: 'Noche Oscura', hex: '#0f172a' },
                    { name: 'Carbón', hex: '#18181b' },
                    { name: 'Azul Marino', hex: '#0a192f' },
                    { name: 'Esmeralda Oscuro', hex: '#064e3b' },
                    { name: 'Púrpura Profundo', hex: '#3b0764' },
                    { name: 'Chocolate Cálido', hex: '#451a03' }
                  ].map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.name}
                      onClick={() => setGeneralInfo(prev => ({ ...prev, colorSecundario: c.hex }))}
                      className={`h-7 px-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold text-white ${
 generalInfo.colorSecundario.toLowerCase() === c.hex.toLowerCase()
 ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 border-white scale-105'
 : 'border-slate-800 opacity-80 hover:opacity-100'
 }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {generalInfo.colorSecundario.toLowerCase() === c.hex.toLowerCase() && (
                        <Check size={10} strokeWidth={3} />
                      )}
                      <span>{c.name}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-1">
                    <input
                      type="color"
                      value={generalInfo.colorSecundario}
                      onChange={(e) => setGeneralInfo(prev => ({ ...prev, colorSecundario: e.target.value }))}
                      className="size-7 rounded-xl border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                      title="Seleccionar color personalizado"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Hero Principal y Contenido */}
            <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-3xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Sparkles size={16} />
                Sección Hero Principal
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Título del Hero</label>
                  <input
                    type="text"
                    value={landingHero.title}
                    onChange={(e) => setLandingHero(prev => ({ ...prev, title: e.target.value }))}
                    style={{ color: '#ffffff' }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold !text-white caret-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Texto del Botón (CTA)</label>
                  <input
                    type="text"
                    value={landingHero.ctaText}
                    onChange={(e) => setLandingHero(prev => ({ ...prev, ctaText: e.target.value }))}
                    style={{ color: '#ffffff' }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold !text-white caret-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">Subtítulo / Frase Promocional</label>
                  <input
                    type="text"
                    value={landingHero.subtitle}
                    onChange={(e) => setLandingHero(prev => ({ ...prev, subtitle: e.target.value }))}
                    style={{ color: '#ffffff' }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs !text-white caret-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Vista Previa en Vivo Conectada con los Colores */}
              <div 
                className="p-6 rounded-2xl border relative overflow-hidden transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, ${generalInfo.colorSecundario || '#0f172a'} 0%, #030712 100%)`,
                  borderColor: `${generalInfo.colorPrimario}40`
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span 
                    className="text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full inline-block border shadow-sm"
                    style={{
                      backgroundColor: `${generalInfo.colorPrimario}25`,
                      color: generalInfo.colorPrimario,
                      borderColor: `${generalInfo.colorPrimario}50`
                    }}
                  >
                    Vista Previa en Vivo
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                    <span className="size-2 rounded-full" style={{ backgroundColor: generalInfo.colorPrimario }} />
                    Tema: {generalInfo.colorPrimario}
                  </div>
                </div>

                <h4 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {landingHero.title || generalInfo.nombre || "Tu Negocio Digital"}
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-md leading-relaxed">
                  {landingHero.subtitle || "Experiencia de compra y reservas digital de última generación."}
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <div 
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-xs font-bold shadow-lg transition-transform cursor-default"
                    style={{
                      backgroundColor: generalInfo.colorPrimario,
                      boxShadow: `0 8px 20px -4px ${generalInfo.colorPrimario}60`
                    }}
                  >
                    {landingHero.ctaText || "Ver catálogo"} <ArrowRight size={14} />
                  </div>

                  <span 
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-300"
                  >
                    /{generalInfo.slug || 'mi-app'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PASO 6 — CONFIGURACIÓN OPERATIVA & MULTI-BRANCH
        ══════════════════════════════════════════════════════════════════ */}
        {step === 6 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-xl font-bold text-white">Configuración Operativa & Sucursales</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Canales habilitados y configuración de sucursales según las capacidades del plan.
              </p>
            </div>

            {/* Canales */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Canales de Atención Activos
              </label>
              <div className="flex flex-wrap gap-2">
                {["TABLE", "DELIVERY", "PICKUP", "QR", "RESERVATIONS", "POS", "KITCHEN_KDS", "MEMBERSHIPS"].map((ch) => {
                  const isChecked = channels.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChannels(prev => isChecked ? prev.filter(c => c !== ch) : [...prev, ch])}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        isChecked
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-slate-950 text-slate-500 border border-slate-800 hover:text-white"
                      }`}
                    >
                      <Check size={14} className={isChecked ? "opacity-100" : "opacity-0"} />
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sucursales (Multi-Branch) */}
            <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Store size={16} className="text-emerald-400" />
                    Sucursales Iniciales
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">La sede Matriz se crea automáticamente con la dirección del negocio.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setBranches(prev => [...prev, { name: `Sucursal ${prev.length + 2}`, city: generalInfo.ciudad }])}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Plus size={14} /> + Agregar otra sucursal
                </button>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">{generalInfo.nombre} (Matriz)</span>
                    <span className="ml-2 text-xs font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md">
                      Principal
                    </span>
                  </div>
                  <span className="text-slate-400 text-xs">{generalInfo.ciudad || "Sede Central"}</span>
                </div>

                {branches.map((br, bIdx) => (
                  <div key={bIdx} className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <input
                      type="text"
                      value={br.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBranches(prev => prev.map((b, i) => i === bIdx ? { ...b, name: val } : b));
                      }}
                      className="bg-transparent font-bold text-white focus:outline-none w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setBranches(prev => prev.filter((_, i) => i !== bIdx))}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PASO 7 — USUARIO / ACCESO DEL ADMINISTRADOR
        ══════════════════════════════════════════════════════════════════ */}
        {step === 7 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-xl font-bold text-white">Usuario & Acceso Inicial</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Crea las credenciales de administrador para que el cliente pueda ingresar a gestionar su app.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">Nombre del Administrador</label>
                <input
                  type="text"
                  placeholder="Ej: Carlos Gómez"
                  value={generalInfo.adminNombre}
                  onChange={(e) => setGeneralInfo(prev => ({ ...prev, adminNombre: e.target.value }))}
                  style={{ color: '#ffffff' }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold !text-white caret-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner transition hover:border-slate-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f172a_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">Correo Electrónico de Acceso <span className="text-rose-400 font-bold">*</span></label>
                <input
                  type="email"
                  placeholder="admin@negocio.com"
                  value={generalInfo.adminEmail}
                  onChange={(e) => setGeneralInfo(prev => ({ ...prev, adminEmail: e.target.value }))}
                  style={{ color: '#ffffff' }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold !text-white caret-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner transition hover:border-slate-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f172a_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">Teléfono Celular</label>
                <input
                  type="text"
                  placeholder="+593 99 999 9999"
                  value={generalInfo.adminTelefono}
                  onChange={(e) => setGeneralInfo(prev => ({ ...prev, adminTelefono: e.target.value }))}
                  style={{ color: '#ffffff' }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold !text-white caret-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner transition hover:border-slate-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f172a_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-200">Contraseña de Acceso <span className="text-rose-400 font-bold">*</span></label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs text-emerald-400 hover:underline font-bold"
                  >
                    Generar segura
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Contraseña"
                  value={generalInfo.adminPassword}
                  onChange={(e) => setGeneralInfo(prev => ({ ...prev, adminPassword: e.target.value }))}
                  style={{ color: '#ffffff' }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-mono font-bold !text-white caret-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner transition hover:border-slate-500"
                />
              </div>
            </div>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-bold">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>Rol asignado: Administrador General (ADMIN). Superadmin mantendrá acceso e impersonación en cualquier momento.</span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PASO 8 — RESUMEN ANTES DE CREAR (Listo para Entregar)
        ══════════════════════════════════════════════════════════════════ */}
        {step === 8 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-xl font-bold text-white">Listo para Entregar</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifica los datos antes de ejecutar el aprovisionamiento universal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Negocio & Plan */}
              <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-3xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Negocio & Plan</span>
                <div>
                  <h4 className="text-lg font-bold text-white">{generalInfo.nombre || "Sin Nombre"}</h4>
                  <p className="text-xs text-emerald-400 font-mono">/{generalInfo.slug}</p>
                </div>
                <div className="text-xs text-slate-300 space-y-1 pt-2 border-t border-slate-800/80">
                  <p>Tipo: <strong>{currentBusinessType?.name}</strong></p>
                  <p>Plan: <strong>{availablePlans.find(p => p.id === selectedPlanId)?.name || "Plan Estándar"}</strong></p>
                  <p>Estado Fundador: <strong>{isFounder ? `Sí ($${lockedPrice}/mes)` : "No"}</strong></p>
                </div>
              </div>

              {/* Identidad & Contacto */}
              <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-3xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Identidad & Contacto</span>
                <div className="text-xs text-slate-300 space-y-1">
                  <p>WhatsApp: <strong>{generalInfo.whatsapp || "No asignado"}</strong></p>
                  <p>Email: <strong>{generalInfo.adminEmail || "No asignado"}</strong></p>
                  <p>Ciudad: <strong>{generalInfo.ciudad || "No asignada"}</strong></p>
                  <p>Logo: <strong>{generalInfo.logoUrl ? "✓ Configurado" : "Pendiente"}</strong></p>
                  <p>Banner: <strong>{generalInfo.bannerUrl ? "✓ Configurado" : "Pendiente"}</strong></p>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
                    <span>Color de Marca:</span>
                    <span className="size-3.5 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: generalInfo.colorPrimario }} />
                    <strong className="font-mono text-emerald-400">{generalInfo.colorPrimario}</strong>
                  </div>
                </div>
              </div>

              {/* Contenido & Landing */}
              <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-3xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Contenido & Landing</span>
                <div className="text-xs text-slate-300 space-y-1">
                  <p>Catálogo: <strong>{catalogItems.length} ítems listos</strong></p>
                  <p>Hero de Landing: <strong>{landingHero.title ? "✓ Personalizado" : "Automático"}</strong></p>
                  <p>Canales: <strong>{channels.join(", ")}</strong></p>
                </div>
              </div>

              {/* Operativa & Admin */}
              <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-3xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Operativa & Acceso</span>
                <div className="text-xs text-slate-300 space-y-1">
                  <p>Sucursal Principal: <strong>{generalInfo.nombre} (Matriz)</strong></p>
                  <p>Sucursales Extra: <strong>{branches.length}</strong></p>
                  <p>Administrador: <strong>{generalInfo.adminEmail}</strong></p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Fijo con Navegación Responsive */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-t border-slate-800 bg-slate-950/90 backdrop-blur-md shrink-0">
        <div>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              <ArrowLeft size={16} /> Volver
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1"
            >
              Cancelar
            </button>
          )}
        </div>

        <div>
          {step < 8 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition active:scale-95"
            >
              Siguiente <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleProvisionSubmit}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wide shadow-xl shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />}
              Crear y Entregar App
            </button>
          )}
        </div>
      </div>

      {/* Modal de Mapa GPS */}
      <WizardLocationMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        initialLat={generalInfo.latitude}
        initialLng={generalInfo.longitude}
        initialSearchQuery={generalInfo.direccion || generalInfo.ciudad || generalInfo.nombre}
        onConfirm={handleMapConfirm}
      />
    </div>
  );
}
