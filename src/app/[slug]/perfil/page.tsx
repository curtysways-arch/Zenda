"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Phone,
  Loader2,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Save,
  LogOut,
  Building2,
  CalendarCheck,
  AlertTriangle,
  Info,
  Trophy,
  Activity,
  Award,
  Star,
  Settings,
  ShieldCheck,
  Bell,
  CreditCard,
  ChevronRight,
  MessageCircle,
  Sparkles,
  UserCircle2,
  ArrowRight,
  AlertCircle,
  Key,
  Tag,
  Gift,
  ShoppingBag,
  Share2,
  Menu,
  MapPin,
  Heart,
  HelpCircle,
  Edit3,
  Camera,
  Plus,
  Trash2,
  Check,
  Compass,
  Lock,
  ExternalLink,
  MessageSquare,
  Smartphone,
  Download
} from "lucide-react";
import Link from "next/link";
import PhoneInput from "@/components/ui/PhoneInput";
import { useNotifications } from "@/hooks/useNotifications";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import MapSelectionModal from "@/components/public/MapSelectionModal";
import { useCart } from "@/core/context/CartContext";
import { isPWAInstalled, installPWA, addInstallationListener, removeInstallationListener } from "@/lib/pwa-install";
import { useFavorites, type FavoriteItem } from "@/lib/favorites";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function MiPerfilPage() {
  const params = useParams();
  const slug = (params.slug as string) || (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo-lavado') ? 'demo-lavado' : 'lavado');
  const router = useRouter();
  const cartContext = useCart();

  // Estados de autenticación y carga
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cliente, setCliente] = useState<any>(null);
  const [negocio, setNegocio] = useState<any>(null);

  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [telefono, setTelefono] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Datos reales de perfil y actividad
  const [editNombre, setEditNombre] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [direccionRegistrada, setDireccionRegistrada] = useState("");
  const [referenciaRegistrada, setReferenciaRegistrada] = useState("");
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Listas de direcciones, tarjetas, favoritos
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const currentSlugStr = typeof slug === 'string' ? slug : '';
  const { businessFavorites, removeFavorite, clearFavorites } = useFavorites({
    slug: currentSlugStr,
    negocioId: negocio?.id
  });

  // Determinar si el negocio maneja productos
  const canShowProducts = useMemo(() => {
    if (!negocio) return false;
    if (typeof negocio.hasProducts === 'boolean') return negocio.hasProducts;
    const tipo = ((negocio.tipoNegocio || negocio.type || negocio.tipo || '') as string).toUpperCase();
    return ['PRODUCTOS', 'TIENDA', 'STORE', 'ECOMMERCE', 'MINIMARKET', 'FARMACIA'].includes(tipo) || (negocio.productCount ?? 0) > 0;
  }, [negocio]);

  // Lista de favoritos exclusiva y relevante para este negocio
  const scopedFavorites = useMemo(() => {
    if (!canShowProducts) {
      return businessFavorites.filter(item => item.tipo !== 'PRODUCTO');
    }
    return businessFavorites;
  }, [businessFavorites, canShowProducts]);

  const [favoriteTab, setFavoriteTab] = useState<'ALL' | 'PRODUCTO' | 'SERVICIO' | 'CANCHA'>('ALL');

  // Si no se permiten productos y la pestaña estaba en PRODUCTO, volver a ALL
  useEffect(() => {
    if (!canShowProducts && favoriteTab === 'PRODUCTO') {
      setFavoriteTab('ALL');
    }
  }, [canShowProducts, favoriteTab]);

  const filteredFavoritesList = useMemo(() => {
    if (favoriteTab === 'ALL') return scopedFavorites;
    return scopedFavorites.filter(item => item.tipo === favoriteTab);
  }, [scopedFavorites, favoriteTab]);

  const productosFavCount = useMemo(() => scopedFavorites.filter(i => i.tipo === 'PRODUCTO').length, [scopedFavorites]);
  const serviciosFavCount = useMemo(() => scopedFavorites.filter(i => i.tipo === 'SERVICIO').length, [scopedFavorites]);
  const canchasFavCount = useMemo(() => scopedFavorites.filter(i => i.tipo === 'CANCHA').length, [scopedFavorites]);
  const isCanchasBiz = useMemo(() => {
    const t = ((negocio?.tipoNegocio || negocio?.type || negocio?.tipo || '') as string).toUpperCase();
    return t === 'CANCHAS' || t === 'SPORTS' || t === 'SPORT' || currentSlugStr === 'canchas' || currentSlugStr.includes('cancha') || Boolean(negocio?.isCanchas);
  }, [negocio, currentSlugStr]);
  const [cuponesCount, setCuponesCount] = useState<number>(0);
  const { unreadCount: notifUnreadCount } = useNotifications(typeof slug === 'string' ? slug : '');

  // Estado e instalador de App (PWA)
  const [isPWAInstalledState, setIsPWAInstalledState] = useState<boolean>(false);
  const [canInstallPWA, setCanInstallPWA] = useState<boolean>(false);

  useEffect(() => {
    // Limpiar flag legacy de localStorage si se visita en navegador estándar
    if (typeof window !== 'undefined' && !window.matchMedia('(display-mode: standalone)').matches && !(window.navigator as any).standalone) {
      try {
        localStorage.removeItem('pwa_installed');
      } catch (_) {}
    }

    setIsPWAInstalledState(isPWAInstalled());

    const handlePWAChange = (available: boolean) => {
      setCanInstallPWA(available);
      setIsPWAInstalledState(isPWAInstalled());
    };

    addInstallationListener(handlePWAChange);
    return () => {
      removeInstallationListener(handlePWAChange);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (canInstallPWA) {
      const res = await installPWA();
      if (res) setIsPWAInstalledState(true);
      const bizName = negocio?.nombre || negocio?.name || 'nuestro negocio';
      alert(`Para instalar la App de ${bizName} en tu celular:\n\n📱 En Android: Abre el menú de tu navegador (...) y presiona "Instalar aplicación" o "Agregar a la pantalla principal".\n\n📱 En iPhone: Toca el icono de Compartir y selecciona "Agregar a inicio".`);
    }
  };

  // Modales interactivos
  const [activeModal, setActiveModal] = useState<string | null>(null); // 'personal_info' | 'addresses' | 'payments' | 'favorites' | 'settings' | 'support'
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [newAddrTag, setNewAddrTag] = useState("Casa");
  const [newAddrText, setNewAddrText] = useState("");

  // Referencia al contenedor del mini mapa Leaflet
  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<any>(null);

  // Cargar perfil y datos reales del cliente
  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/${slug}/perfil`);
      if (res.ok) {
        const data = await res.json();

        if (data.imagenUrl) {
          data.imagenUrl = `${data.imagenUrl.split('?')[0]}?v=${Date.now()}`;
        }

        setCliente(data);
        setEditNombre(data.nombre || "");
        setEditEmail(data.email || "");
        setEditTelefono(data.telefono || "");

        // Leer dirección de localStorage / datos de perfil
        const localAddr = localStorage.getItem('pinchos_client_address') || localStorage.getItem('customer_address') || data.direccion || 'Javier Espinoza, Uraba, Camino De Los Eucaliptos, Quito, Ecuador';
        const localRef = localStorage.getItem('pinchos_client_reference') || localStorage.getItem('customer_reference') || data.referencia || '';
        const localLat = localStorage.getItem('customer_lat') ? parseFloat(localStorage.getItem('customer_lat')!) : (data.latitud || -0.180653);
        const localLng = localStorage.getItem('customer_lng') ? parseFloat(localStorage.getItem('customer_lng')!) : (data.longitud || -78.467838);

        setDireccionRegistrada(localAddr);
        setReferenciaRegistrada(localRef);
        setCurrentLat(localLat);
        setCurrentLng(localLng);

        // Inicializar direcciones guardadas reales desde localStorage
        let parsedSavedAddresses: any[] = [];
        try {
          const rawAddr = localStorage.getItem('customer_saved_addresses') || localStorage.getItem('pinchos_saved_addresses');
          if (rawAddr) parsedSavedAddresses = JSON.parse(rawAddr);
        } catch (e) {}

        if (!Array.isArray(parsedSavedAddresses) || parsedSavedAddresses.length === 0) {
          if (localAddr) {
            parsedSavedAddresses = [
              { id: 'addr_1', etiqueta: 'Principal', direccion: localAddr, referencia: localRef, lat: localLat, lng: localLng, principal: true }
            ];
          }
        }

        setSavedAddresses(parsedSavedAddresses);

        // Cargar cupones disponibles reales
        try {
          const coupRes = await fetch(`/api/public/${slug}/loyalty/my-rewards`);
          if (coupRes.ok) {
            const coupData = await coupRes.json();
            const count = Array.isArray(coupData?.cupones) 
              ? coupData.cupones.length 
              : (Array.isArray(coupData?.availableCoupons) ? coupData.availableCoupons.length : 0);
            setCuponesCount(count);
          } else {
            setCuponesCount(0);
          }
        } catch (_) {
          setCuponesCount(0);
        }

        setStep('profile');
      } else {
        setCliente(null);
        setStep('phone');
      }
    } catch (err) {
      console.error("Error al cargar perfil:", err);
      setCliente(null);
      setStep('phone');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusiness = async () => {
    try {
      const res = await fetch(`/api/public/negocio/${slug}`);
      if (res.ok) {
        const data = await res.json();
        if (data) setNegocio(data);
      }
    } catch (e) {
      console.error("Error fetching business info:", e);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchBusiness();
  }, [slug]);

  // Cargar Mini Mapa de Leaflet dinámicamente
  useEffect(() => {
    if (step !== 'profile' || !currentLat || !currentLng || !miniMapRef.current) return;

    let mapInstance: any = null;

    const initMiniMap = () => {
      if (typeof window === 'undefined' || !(window as any).L) return;
      const L = (window as any).L;

      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }

      try {
        mapInstance = L.map(miniMapRef.current, {
          center: [currentLat, currentLng],
          zoom: 15,
          zoomControl: false,
          dragging: false,
          touchZoom: false,
          doubleClickZoom: false,
          scrollWheelZoom: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(mapInstance);

        const customIcon = L.divIcon({
          className: 'custom-pin',
          html: `<div style="background-color:${negocio?.colorPrimario || '#06b6d4'}; width:28px; height:28px; border-radius:50%; border:3px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold;">📍</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        L.marker([currentLat, currentLng], { icon: customIcon }).addTo(mapInstance);
        miniMapInstanceRef.current = mapInstance;
      } catch (e) {
        console.warn('MiniMap init error:', e);
      }
    };

    if (!(window as any).L) {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => initMiniMap();
        document.head.appendChild(script);
      }
    } else {
      initMiniMap();
    }

    return () => {
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }
    };
  }, [step, currentLat, currentLng]);

  // Actualización de foto de perfil
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await fetch(`/api/${slug}/perfil/upload`, {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) throw new Error('Error al subir imagen');
      const { url } = await uploadRes.json();

      const updateRes = await fetch(`/api/${slug}/perfil`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagenUrl: url })
      });

      if (updateRes.ok) {
        setCliente((prev: any) => ({ ...prev, imagenUrl: `${url}?v=${Date.now()}` }));
      }
    } catch (err) {
      alert("No se pudo actualizar la foto de perfil");
    } finally {
      setUploading(false);
    }
  };

  // Guardar datos personales
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/${slug}/perfil`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editNombre,
          email: editEmail
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCliente(data.cliente || data);
        localStorage.setItem('user_name', editNombre);
        localStorage.setItem('pinchos_client_name', editNombre);
        setActiveModal(null);
      } else {
        alert("No se pudieron guardar las modificaciones.");
      }
    } catch (e) {
      alert("Error al conectar con el servidor.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Confirmar y guardar ubicación en el mapa
  const handleConfirmLocationFromMap = async (lat: number, lng: number, addressName?: string, reference?: string) => {
    const newAddress = addressName || direccionRegistrada;
    const newRef = reference || referenciaRegistrada;

    setCurrentLat(lat);
    setCurrentLng(lng);
    setDireccionRegistrada(newAddress);
    setReferenciaRegistrada(newRef);

    localStorage.setItem('customer_lat', String(lat));
    localStorage.setItem('customer_lng', String(lng));
    localStorage.setItem('pinchos_client_address', newAddress);
    localStorage.setItem('customer_address', newAddress);
    localStorage.setItem('pinchos_client_reference', newRef);

    // Actualizar lista de direcciones guardadas del cliente en el estado y localStorage
    setSavedAddresses(prev => {
      let currentSaved = [...prev].map(item => ({ ...item, principal: false }));
      const existingIdx = currentSaved.findIndex(item => item.direccion.trim().toLowerCase() === newAddress.trim().toLowerCase());
      
      if (existingIdx >= 0) {
        currentSaved[existingIdx] = {
          ...currentSaved[existingIdx],
          direccion: newAddress,
          referencia: newRef,
          lat,
          lng,
          principal: true
        };
      } else {
        currentSaved.push({
          id: `addr_${Date.now()}`,
          etiqueta: `Dirección ${currentSaved.length + 1}`,
          direccion: newAddress,
          referencia: newRef,
          lat,
          lng,
          principal: true
        });
      }

      try {
        localStorage.setItem('customer_saved_addresses', JSON.stringify(currentSaved));
        localStorage.setItem('pinchos_saved_addresses', JSON.stringify(currentSaved));
      } catch (e) {}

      return currentSaved;
    });

    // Actualizar en backend
    try {
      await fetch(`/api/${slug}/perfil`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direccion: newAddress,
          referencia: newRef,
          latitud: lat,
          longitud: lng
        })
      });
    } catch (_) {}

    setIsMapModalOpen(false);
  };

  // Eliminar una dirección guardada
  const handleDeleteSavedAddress = (id: string) => {
    setSavedAddresses(prev => {
      const updated = prev.filter(a => a.id !== id);
      try {
        localStorage.setItem('customer_saved_addresses', JSON.stringify(updated));
        localStorage.setItem('pinchos_saved_addresses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Handlers para OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/${slug}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('otp');
        setCountdown(600);
        setTimeout(() => {
          otpInputRef.current?.focus();
        }, 100);
      } else {
        setError(data.error || "No se pudo enviar el código. Verifica tu número.");
      }
    } catch (err) {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/${slug}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono, code }),
      });
      if (res.ok) {
        localStorage.setItem('pinchos_client_phone', telefono);
        localStorage.setItem('user_phone', telefono);
        await fetchProfile();
      } else {
        const data = await res.json();
        setError(data.error || "Código incorrecto");
        setLoading(false);
      }
    } catch (err) {
      setError("Error de conexión al verificar el código.");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("¿Seguro que deseas cerrar tu sesión?")) return;
    try {
      localStorage.removeItem('pinchos_client_phone');
      localStorage.removeItem('pinchos_client_name');
      localStorage.removeItem('pinchos_client_address');
      localStorage.removeItem('pinchos_client_reference');
      localStorage.removeItem('user_phone');
      localStorage.removeItem('user_name');
      await fetch(`/api/${slug}/auth/logout`, { method: "POST" });
      setCliente(null);
      setStep('phone');
      router.push(`/${slug}`);
    } catch (error) {
      console.error(error);
    }
  };

  // Cálculo de etiqueta de cliente (Ej. Usuario frecuente)
  const userLevelTag = useMemo(() => {
    const totalCount = (cliente?.totalPedidos || 0) + (cliente?.stats?.reservasTotales || 0);
    if (totalCount >= 10) return { label: 'Cliente VIP', icon: '👑', color: 'bg-amber-100 text-amber-900 border-amber-300' };
    if (totalCount >= 3) return { label: 'Usuario frecuente', icon: '⭐', color: 'bg-amber-50 text-amber-800 border-amber-200' };
    return { label: 'Cliente Nuevo', icon: '🌱', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  }, [cliente]);

  const displayName = cliente?.nombre || (typeof window !== 'undefined' ? localStorage.getItem('user_name') : null) || 'Cliente';
  const displayPhone = cliente?.telefono || (typeof window !== 'undefined' ? (localStorage.getItem(`${slug}_client_phone`) || localStorage.getItem('user_phone')) : null) || '';
  const displayEmail = cliente?.email || '';
  const firstLetter = (displayName || 'C').charAt(0).toUpperCase();

  const primaryColor = negocio?.colorPrimario || '#06b6d4';
  const secondaryColor = negocio?.colorSecundario || '#0f172a';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-amber-500" size={48} />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cargando Mi Cuenta...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-36 select-none pt-[76px]">
      
      {/* ── 1. HEADER SUPERIOR NEGRO ── */}
      <header className="sticky top-[76px] z-[100] bg-slate-950 text-white px-4 py-3.5 shadow-md border-b border-slate-800">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => router.push(`/${slug}`)} 
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 cursor-pointer border border-slate-800"
            >
              <Menu size={20} />
            </button>
            <div>
              {step === 'profile' ? (
                <>
                  <h1 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                    <span>¡Hola, {displayName.split(' ')[0]}!</span>
                    <span className="text-base">👋</span>
                  </h1>
                  <p className="text-xs text-slate-400 font-medium leading-none mt-0.5">
                    {(negocio?.tipoNegocio === 'RESTAURANTE' || negocio?.tipoNegocio === 'GASTRONOMIA' || negocio?.tipoNegocio === 'RESTAURANT')
                      ? '¿Qué se te antoja hoy?'
                      : (negocio?.tipoNegocio === 'LAVANDERIA' || negocio?.tipoNegocio === 'LAVANDERIAS' || negocio?.tipoNegocio === 'SHOE_CARE' || slug.includes('lavad') || slug.includes('bubble'))
                        ? 'Tu servicio de limpieza y cuidado'
                        : '¿Qué deseas comprar hoy?'}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                    <span>Mi Cuenta</span>
                  </h1>
                  <p className="text-xs text-slate-400 font-medium leading-none mt-0.5">
                    Acceso a tu cuenta y pedidos
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => router.push(`/${slug}/notificaciones`)}
              className="relative p-2 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors"
              title="Notificaciones"
              aria-label="Ver notificaciones"
            >
              <Bell size={18} />
              {notifUnreadCount > 0 && (
                <span 
                  style={{ backgroundColor: primaryColor }}
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-white font-bold text-xs rounded-full flex items-center justify-center shadow-xs"
                >
                  {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                </span>
              )}
            </button>

            <button 
              type="button" 
              onClick={() => setActiveModal('support')}
              className="relative p-2 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 cursor-pointer"
            >
              <MessageSquare size={18} />
              <span 
                style={{ backgroundColor: primaryColor }}
                className="absolute -top-1 -right-1 size-4 text-white font-bold text-xs rounded-full flex items-center justify-center shadow-xs"
              >
                4
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. LOGIN / OTP IF NOT AUTHENTICATED ── */}
      {step === 'phone' && (
        <main className="max-w-4xl w-full mx-auto p-4 pt-10 text-center space-y-6">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Bienvenido</h2>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ingresa tu teléfono para acceder a tu cuenta</p>
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 text-left space-y-4 max-w-lg mx-auto">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block">Número Celular</label>
            <PhoneInput value={telefono} onChange={setTelefono} className="w-full" />
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle size={16} /> <span>{error}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || telefono.length < 8}
              className="w-full py-3.5 bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <>Continuar <ArrowRight size={18} /></>}
            </button>
          </div>
        </main>
      )}

      {step === 'otp' && (
        <main className="max-w-4xl w-full mx-auto p-4 pt-10 text-center space-y-6">
          <div className="size-16 mx-auto bg-white rounded-2xl shadow-lg border border-slate-200 flex items-center justify-center text-amber-500">
            <Key size={28} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Código WhatsApp</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ingresa el código enviado a tu celular</p>

          <form onSubmit={handleVerifyOtp} className="space-y-6 bg-white p-6 rounded-3xl shadow-xl border border-slate-200 max-w-lg mx-auto">
            <div 
              onClick={() => otpInputRef.current?.focus()}
              className="relative cursor-pointer select-none"
            >
              <div className="flex justify-between items-center gap-1.5">
                {[0,1,2,3,4,5].map(idx => (
                  <div 
                    key={idx} 
                    className={`flex-1 h-14 bg-slate-50 border-2 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${
 code[idx] 
 ? 'border-amber-500 text-slate-900 bg-white shadow-xs scale-102' 
 : (code.length === idx ? 'border-slate-400 bg-white ring-2 ring-amber-400/20' : 'border-slate-200 text-slate-300')
 }`}
                  >
                    {code[idx] || ''}
                  </div>
                ))}
              </div>
              <input 
                ref={otpInputRef} 
                type="tel" 
                inputMode="numeric" 
                pattern="[0-9]*" 
                autoFocus 
                autoComplete="one-time-code"
                maxLength={6} 
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" 
                value={code} 
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(val);
                }} 
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError('');
                }}
                className="hover:text-slate-700 underline cursor-pointer"
              >
                ← Cambiar número
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="hover:text-amber-600 underline cursor-pointer disabled:opacity-50"
              >
                Reenviar código
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle size={16} /> <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3.5 bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <>Verificar Código <Check size={18} /></>}
            </button>
          </form>
        </main>
      )}

      {/* ── 3. PERFIL PRINCIPAL AUTENTICADO ── */}
      {step === 'profile' && (
        <main className="max-w-4xl w-full mx-auto px-3 sm:px-6 py-4 space-y-4 animate-in fade-in duration-300">
          
          {/* TARJETA SUPERIOR DE PERFIL */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                {/* Avatar con foto o inicial + botón de edición de foto */}
                <div className="relative shrink-0">
                  {cliente?.imagenUrl ? (
                    <img 
                      src={cliente.imagenUrl} 
                      alt={displayName} 
                      style={{ borderColor: primaryColor }}
                      className="w-16 h-16 rounded-full object-cover border-2 shadow-md" 
                    />
                  ) : (
                    <div 
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                      className="w-16 h-16 rounded-full text-white font-bold text-2xl flex items-center justify-center shadow-md border-2 border-white"
                    >
                      {firstLetter}
                    </div>
                  )}

                  <label className="absolute -bottom-1 -right-1 p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-full border border-slate-200 shadow-md cursor-pointer">
                    <Camera size={13} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                </div>

                {/* Información de usuario */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 leading-snug">{displayName}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${userLevelTag.color}`}>
                      <span>{userLevelTag.icon}</span>
                      <span>{userLevelTag.label}</span>
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-500 leading-tight">{displayPhone}</p>
                  <p className="text-xs text-slate-400 font-medium leading-tight">{displayEmail}</p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setActiveModal('personal_info')}
                className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <ChevronRight size={22} />
              </button>
            </div>

            {/* RESUMEN DE ACTIVIDAD (PEDIDOS, PUNTOS, CUPONES EN 3 BLOQUES) */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <button 
                type="button"
                onClick={() => router.push(`/${slug}/pedidos`)}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-colors cursor-pointer text-left space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span 
                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                    className="p-1.5 rounded-xl"
                  >
                    <ShoppingBag size={14} />
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-400">Pedidos</span>
                </div>
                <div>
                  <span className="text-base font-bold text-slate-900 block leading-tight">
                    {cliente?.totalPedidos ?? cliente?.stats?.totalPedidos ?? 0}
                  </span>
                  <span className="text-xs font-medium text-slate-400 block">Realizados</span>
                </div>
              </button>

              <button 
                type="button"
                onClick={() => router.push(`/${slug}/mis-premios`)}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-colors cursor-pointer text-left space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-amber-100/60 text-amber-700 rounded-xl">
                    <Star size={14} />
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-400">Puntos</span>
                </div>
                <div>
                  <span className="text-base font-bold text-slate-900 block leading-tight">
                    {cliente?.loyalty?.puntos ?? 0}
                  </span>
                  <span className="text-xs font-medium text-slate-400 block">Disponibles</span>
                </div>
              </button>

              <button 
                type="button"
                onClick={() => router.push(`/${slug}/mis-cupones`)}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-colors cursor-pointer text-left space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span 
                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                    className="p-1.5 rounded-xl"
                  >
                    <Tag size={14} />
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-400">Cupones</span>
                </div>
                <div>
                  <span className="text-base font-bold text-slate-900 block leading-tight">
                    {cuponesCount}
                  </span>
                  <span className="text-xs font-medium text-slate-400 block">Disponibles</span>
                </div>
              </button>
            </div>

            {/* DIRECCIÓN REGISTRADA Y MINI MAPA */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span 
                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                    className="p-2 rounded-xl shrink-0 mt-0.5"
                  >
                    <MapPin size={18} />
                  </span>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase text-slate-500 block tracking-wider">Dirección registrada</span>
                    <p className="text-xs font-bold text-slate-900 leading-snug">
                      {direccionRegistrada}
                    </p>
                    {referenciaRegistrada && (
                      <p className="text-xs text-slate-500 font-medium">Ref: {referenciaRegistrada}</p>
                    )}
                  </div>
                </div>

                {/* Contenedor del Mini Mapa Interactivo */}
                <div className="w-28 h-20 rounded-2xl bg-slate-200 overflow-hidden border border-slate-200 shadow-inner shrink-0 relative">
                  <div ref={miniMapRef} className="w-full h-full" />
                </div>
              </div>

              {/* Botón para actualizar ubicación en mapa */}
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                style={{ 
                  backgroundColor: `${primaryColor}15`, 
                  color: primaryColor,
                  borderColor: `${primaryColor}40`
                }}
                className="w-full py-3 px-4 font-bold text-xs uppercase tracking-wider rounded-2xl border transition-all hover:opacity-90 cursor-pointer flex items-center justify-center gap-2"
              >
                <Compass size={16} />
                <span>Actualizar ubicación en el mapa</span>
              </button>
            </div>

          </div>

          {/* BANNER / AVISO INTELIGENTE DE DESCARGA DE LA APP CON COLORES CORPORATIVOS */}
          <div 
            style={{ 
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              borderColor: `${primaryColor}40`
            }}
            className="rounded-3xl p-4.5 text-white shadow-lg space-y-3 relative overflow-hidden border"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white p-1.5 backdrop-blur-md border border-white/40 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                  <img
                    src={negocio?.logoUrl || '/citiox-icon.png'}
                    alt={negocio?.nombre || 'CitiOx'}
                    className="w-full h-full object-contain rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/citiox-icon.png';
                    }}
                  />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-white/80 block">
                    {(negocio?.tipoNegocio === 'RESTAURANTE' || negocio?.tipoNegocio === 'GASTRONOMIA' || negocio?.tipoNegocio === 'RESTAURANT')
                      ? 'App del Restaurante'
                      : 'App de la Tienda'}
                  </span>
                  <h4 className="text-sm font-bold text-white leading-tight">
                    {isPWAInstalledState 
                      ? '¡Ya tienes la App instalada!' 
                      : `Descarga la App de ${negocio?.nombre || 'nuestra tienda'}`}
                  </h4>
                  <p className="text-xs text-white/90 font-medium leading-tight mt-0.5">
                    {isPWAInstalledState 
                      ? ((negocio?.tipoNegocio === 'RESTAURANTE' || negocio?.tipoNegocio === 'GASTRONOMIA' || negocio?.tipoNegocio === 'RESTAURANT')
                          ? 'Disfruta de la máxima velocidad al pedir tu comida y notificaciones en tiempo real.'
                          : 'Disfruta de la máxima velocidad al realizar tus compras y notificaciones en tiempo real.')
                      : 'Instala nuestra aplicación oficial para comprar en 1-clic, seguir el estado de tu pedido en vivo y obtener ofertas exclusivas.'}
                  </p>
                </div>
              </div>
            </div>

            {!isPWAInstalledState ? (
              <button
                type="button"
                onClick={handleInstallPWA}
                style={{ color: primaryColor }}
                className="w-full py-3 bg-white hover:bg-slate-50 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-95 border border-white"
              >
                <Smartphone size={16} />
                <span>Instalar App Gratis en mi Celular</span>
              </button>
            ) : (
              <div className="py-2 px-3 bg-white/15 rounded-xl border border-white/20 flex items-center justify-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 size={15} />
                <span>App lista y activa en tu dispositivo</span>
              </div>
            )}
          </div>

          {/* ── 4. LISTADO DE OPCIONES "MI CUENTA" ── */}
          <div className="bg-white rounded-3xl p-2 shadow-sm border border-slate-200 space-y-1">
            <h3 className="text-xs font-bold uppercase text-slate-900 tracking-wider px-4 pt-3 pb-1">Mi cuenta</h3>

            {[
              { id: 'personal_info', label: 'Información personal', desc: 'Actualiza tus datos personales', icon: User },
              { id: 'addresses', label: 'Mis direcciones', desc: 'Gestiona tus direcciones guardadas', icon: MapPin },
              { id: 'payments', label: 'Métodos de pago', desc: 'Tarjetas y pagos guardados', icon: CreditCard },
              { 
                id: 'favorites', 
                label: 'Mis favoritos', 
                desc: scopedFavorites.length > 0 
                  ? `${scopedFavorites.length} guardado${scopedFavorites.length > 1 ? 's' : ''}` 
                  : (canShowProducts ? 'Productos y servicios guardados' : 'Servicios guardados'), 
                icon: Heart 
              },
              { id: 'settings', label: 'Configuración', desc: 'Notificaciones, privacidad y más', icon: Settings },
              { id: 'support', label: 'Ayuda y soporte', desc: 'Centro de ayuda y contacto', icon: HelpCircle },
            ].map(item => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModal(item.id)}
                  className="w-full p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <span 
                      style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                      className="p-2.5 rounded-2xl shrink-0"
                    >
                      <IconComponent size={18} />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">{item.label}</span>
                      <span className="text-xs text-slate-500 font-medium block mt-0.5">{item.desc}</span>
                    </div>
                  </div>

                  <ChevronRight size={18} className="text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>

        </main>
      )}

      {/* ── MODAL MAP SELECTION (ACTUALIZAR UBICACIÓN EN EL MAPA REAL) ── */}
      {isMapModalOpen && (
        <MapSelectionModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          initialLat={currentLat}
          initialLng={currentLng}
          initialReference={referenciaRegistrada}
          onConfirmLocation={handleConfirmLocationFromMap}
        />
      )}

      {/* ── MODAL 1: INFORMACIÓN PERSONAL ── */}
      {activeModal === 'personal_info' && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" style={{ color: primaryColor }} />
                <h3 className="font-bold text-sm uppercase text-slate-900">Información Personal</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePersonalInfo} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Teléfono Móvil (Registrado)</label>
                <input
                  type="text"
                  disabled
                  value={editTelefono}
                  className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl">
                  Cancelar
                </button>
                <button type="submit" disabled={savingProfile} className="py-2.5 px-5 bg-slate-950 text-white font-bold rounded-xl shadow-md">
                  {savingProfile ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: MIS DIRECCIONES ── */}
      {activeModal === 'addresses' && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
                <h3 className="font-bold text-sm uppercase text-slate-900">Mis Direcciones Guardadas</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-xl">
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-2.5">
              {savedAddresses.length > 0 ? (
                savedAddresses.map(addr => (
                  <div key={addr.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">{addr.etiqueta || 'Dirección'}</span>
                        {addr.principal && (
                          <span 
                            style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                            className="px-2 py-0.5 text-xs font-bold rounded-md uppercase shrink-0"
                          >
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 font-medium leading-snug">{addr.direccion}</p>
                      {addr.referencia && <p className="text-xs text-slate-400">Ref: {addr.referencia}</p>}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        type="button" 
                        onClick={() => {
                          handleConfirmLocationFromMap(addr.lat, addr.lng, addr.direccion, addr.referencia);
                          setActiveModal(null);
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase rounded-xl shadow-xs cursor-pointer"
                      >
                        Usar
                      </button>

                      {savedAddresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedAddress(addr.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar dirección"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 space-y-2">
                  <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Aún no tienes direcciones adicionales guardadas.</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveModal(null);
                setIsMapModalOpen(true);
              }}
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}30` }}
              className="w-full py-3 font-bold text-xs uppercase rounded-2xl border flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
            >
              <Plus size={16} /> Agregar Nueva Dirección desde Mapa
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 3: MÉTODOS DE PAGO ── */}
      {activeModal === 'payments' && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" style={{ color: primaryColor }} />
                <h3 className="font-bold text-sm uppercase text-slate-900">Métodos de Pago</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-xl">
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💵</span>
                  <div>
                    <span className="font-bold text-slate-900 block">Efectivo al Recibir</span>
                    <span className="text-xs text-slate-400 font-medium">Pago directo al repartidor o cajero</span>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏦</span>
                  <div>
                    <span className="font-bold text-slate-900 block">Transferencia Bancaria</span>
                    <span className="text-xs text-slate-400 font-medium">Envío de comprobante por WhatsApp</span>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center">
              🔒 Tus datos de pago están seguros mediante encriptación estándar del sistema.
            </p>
          </div>
        </div>
      )}

      {/* ── MODAL 4: MIS FAVORITOS (UNIVERSAL: PRODUCTOS, SERVICIOS, CANCHAS) ── */}
      {activeModal === 'favorites' && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 text-left max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                <div>
                  <h3 className="font-bold text-sm uppercase text-slate-900 leading-tight">Mis Favoritos</h3>
                  <span className="text-xs text-slate-400 font-bold">
                    {scopedFavorites.length} {scopedFavorites.length === 1 ? 'artículo guardado' : 'artículos guardados'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {scopedFavorites.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Deseas vaciar todos tus favoritos guardados en este negocio?')) {
                        clearFavorites();
                      }
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Vaciar lista
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setActiveModal(null)} 
                  className="p-1 text-slate-400 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>

            {/* Pestañas de Filtro (Todos / Productos / Servicios / Canchas) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setFavoriteTab('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
 favoriteTab === 'ALL'
 ? 'bg-slate-900 text-white shadow-xs'
 : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
 }`}
              >
                Todos ({scopedFavorites.length})
              </button>

              {canShowProducts && (
                <button
                  type="button"
                  onClick={() => setFavoriteTab('PRODUCTO')}
                  className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
 favoriteTab === 'PRODUCTO'
 ? 'bg-cyan-600 text-white shadow-xs'
 : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
 }`}
                >
                  <ShoppingBag size={12} />
                  <span>Productos ({productosFavCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setFavoriteTab('SERVICIO')}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
 favoriteTab === 'SERVICIO'
 ? 'bg-purple-600 text-white shadow-xs'
 : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
 }`}
              >
                <Sparkles size={12} />
                <span>Servicios ({serviciosFavCount})</span>
              </button>

              {(isCanchasBiz || canchasFavCount > 0) && (
                <button
                  type="button"
                  onClick={() => setFavoriteTab('CANCHA')}
                  className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
 favoriteTab === 'CANCHA'
 ? 'bg-emerald-600 text-white shadow-xs'
 : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
 }`}
                >
                  <Trophy size={12} />
                  <span>Canchas ({canchasFavCount})</span>
                </button>
              )}
            </div>

            {/* Listado de Favoritos */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[60vh] pr-1">
              {filteredFavoritesList.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="size-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
                    <Heart className="w-8 h-8 fill-rose-200 text-rose-400" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {favoriteTab === 'ALL'
                      ? 'Aún no tienes favoritos'
                      : favoriteTab === 'PRODUCTO'
                      ? 'No tienes productos guardados'
                      : favoriteTab === 'SERVICIO'
                      ? 'No tienes servicios guardados'
                      : 'No tienes canchas guardadas'}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                    {isCanchasBiz
                      ? 'Toca el corazón en cualquier cancha para guardarla y encontrarla rápidamente aquí.'
                      : canShowProducts
                      ? 'Toca el corazón en cualquier producto o servicio para guardarlo y encontrarlo rápidamente aquí.'
                      : 'Toca el corazón en cualquier servicio para guardarlo y encontrarlo rápidamente aquí.'}
                  </p>
                </div>
              ) : (
                filteredFavoritesList.map((item: FavoriteItem) => {
                  const badgeColor = 
                    item.tipo === 'PRODUCTO' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                    item.tipo === 'SERVICIO' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200';

                  const badgeIcon = 
                    item.tipo === 'PRODUCTO' ? <ShoppingBag size={10} /> :
                    item.tipo === 'SERVICIO' ? <Sparkles size={10} /> :
                    <Trophy size={10} />;

                  const targetUrl = item.url || (
                    item.tipo === 'PRODUCTO'
                      ? `/${item.slug || slug}?view=tienda`
                      : item.tipo === 'CANCHA'
                      ? `/${item.slug || slug}/canchas`
                      : `/${item.slug || slug}#servicios`
                  );

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50/80 hover:bg-slate-100/90 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {item.imagenUrl ? (
                          <img
                            src={item.imagenUrl}
                            alt={item.nombre}
                            className="size-14 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="size-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 shrink-0 text-xl font-bold">
                            {badgeIcon}
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${badgeColor}`}>
                              {badgeIcon}
                              <span>{item.tipo}</span>
                            </span>
                            {item.negocioNombre && (
                              <span className="text-xs text-slate-400 font-bold truncate">
                                • {item.negocioNombre}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 truncate block">
                            {item.nombre}
                          </h4>

                          {item.precio !== undefined && (
                            <span className="text-xs font-extrabold text-slate-900 block font-mono">
                              ${Number(item.precio).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href={targetUrl}
                          onClick={() => setActiveModal(null)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                        >
                          <span>Ver</span>
                          <ChevronRight size={12} />
                        </Link>

                        <button
                          type="button"
                          onClick={() => removeFavorite(item.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Quitar de favoritos"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: CONFIGURACIÓN Y PREFERENCIAS ── */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" style={{ color: primaryColor }} />
                <h3 className="font-bold text-sm uppercase text-slate-900">Configuración</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-xl">
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div>
                  <span className="font-bold text-slate-900 block">Notificaciones de Pedido</span>
                  <span className="text-xs text-slate-400">Avisos del estado de tu entrega</span>
                </div>
                <input 
                  type="checkbox" 
                  defaultChecked 
                  style={{ accentColor: primaryColor }}
                  className="rounded border-slate-300" 
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div>
                  <span className="font-bold text-slate-900 block">Promociones y Ofertas</span>
                  <span className="text-xs text-slate-400">Alertas de cupones exclusivos</span>
                </div>
                <input 
                  type="checkbox" 
                  defaultChecked 
                  style={{ accentColor: primaryColor }}
                  className="rounded border-slate-300" 
                />
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs uppercase rounded-2xl flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 6: AYUDA Y SOPORTE ── */}
      {activeModal === 'support' && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" style={{ color: primaryColor }} />
                <h3 className="font-bold text-sm uppercase text-slate-900">Ayuda y Soporte</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-xl">
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 font-medium">¿Tienes alguna duda o problema con un pedido reciente? Estamos para ayudarte.</p>
              
              <a
                href={`https://wa.me/593959997521?text=Hola,%20necesito%20soporte%20con%20mi%20cuenta%20en%20Citiox`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-2xl shadow-md flex items-center justify-center gap-2"
              >
                <MessageSquare size={16} /> Contactar Soporte WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. BOTÓN FLOTANTE INFERIOR "VER MI PEDIDO" ── */}
      {cartContext && cartContext.totalItemsCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-[90] p-4 max-w-md mx-auto pointer-events-auto">
          <button
            type="button"
            onClick={() => router.push(`/${slug}/pedidos`)}
            style={{ backgroundColor: primaryColor }}
            className="w-full py-3.5 px-5 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-between cursor-pointer active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag size={18} />
              <span>VER MI PEDIDO ({cartContext.totalItemsCount})</span>
            </div>
            <span className="text-sm font-bold font-mono">${cartContext.total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── 6. NAVEGACIÓN INFERIOR PWA CON "MI CUENTA" ACTIVO ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-950 text-slate-400 border-t border-slate-800 py-2.5 px-4">
        <div className="max-w-md mx-auto flex items-center justify-around text-center">
          <button 
            type="button"
            onClick={() => router.push(`/${slug}`)} 
            className="flex flex-col items-center gap-1 text-xs font-bold hover:text-white cursor-pointer"
          >
            <Compass size={18} />
            <span>Inicio</span>
          </button>

          <button 
            type="button"
            onClick={() => router.push(`/${slug}/promo`)} 
            className="flex flex-col items-center gap-1 text-xs font-bold hover:text-white cursor-pointer"
          >
            <Tag size={18} />
            <span>Ofertas</span>
          </button>

          <button 
            type="button"
            onClick={() => router.push(`/${slug}/pedidos`)} 
            className="flex flex-col items-center gap-1 text-xs font-bold hover:text-white cursor-pointer"
          >
            <ShoppingBag size={18} />
            <span>Mis pedidos</span>
          </button>

          <button 
            type="button"
            style={{ color: primaryColor }}
            className="flex flex-col items-center gap-1 text-xs font-bold cursor-pointer"
          >
            <User size={18} />
            <span>Mi cuenta</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
