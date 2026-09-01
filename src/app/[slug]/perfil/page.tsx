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
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import MapSelectionModal from "@/components/public/MapSelectionModal";
import { useCart } from "@/core/context/CartContext";
import { isPWAInstalled, installPWA, addInstallationListener, removeInstallationListener } from "@/lib/pwa-install";

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
  const [favoriteItems, setFavoriteItems] = useState<any[]>([]);
  const [cuponesCount, setCuponesCount] = useState<number>(3);

  // Estado e instalador de App (PWA)
  const [isPWAInstalledState, setIsPWAInstalledState] = useState<boolean>(false);
  const [canInstallPWA, setCanInstallPWA] = useState<boolean>(false);

  useEffect(() => {
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
    } else {
      alert(`Para instalar la App de ${negocio?.nombre || 'Restaurante'} en tu celular:\n\n📱 En Android: Abre el menú de tu navegador (...) y presiona "Instalar aplicación" o "Agregar a la pantalla principal".\n\n📱 En iPhone: Toca el icono de Compartir y selecciona "Agregar a inicio".`);
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
          const coupRes = await fetch(`/api/${slug}/mis-cupones`);
          if (coupRes.ok) {
            const coupData = await coupRes.json();
            if (Array.isArray(coupData)) setCuponesCount(coupData.length);
          }
        } catch (_) {}

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
          html: `<div style="background-color:#ea580c; width:28px; height:28px; border-radius:50%; border:3px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold;">📍</div>`,
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

  const displayName = cliente?.nombre || 'Carlos Caicedo';
  const displayPhone = cliente?.telefono || '+593 959 997 521';
  const displayEmail = cliente?.email || 'carlos.caicedo@email.com';
  const firstLetter = displayName.charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-amber-500" size={48} />
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando Mi Cuenta...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-36 select-none">
      
      {/* ── 1. HEADER SUPERIOR NEGRO ── */}
      <header className="sticky top-0 z-[100] bg-slate-950 text-white px-4 py-3.5 shadow-md border-b border-slate-800">
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
              <h1 className="text-sm font-black text-white leading-tight flex items-center gap-1.5">
                <span>¡Hola, {displayName.split(' ')[0]}!</span>
                <span className="text-base">👋</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">
                {(negocio?.tipoNegocio === 'RESTAURANTE' || negocio?.tipoNegocio === 'GASTRONOMIA' || negocio?.tipoNegocio === 'RESTAURANT')
                  ? '¿Qué se te antoja hoy?'
                  : '¿Qué deseas comprar hoy?'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => router.push(`/${slug}/notificaciones`)}
              className="relative p-2 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 cursor-pointer"
            >
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 size-4 bg-red-600 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-xs">
                2
              </span>
            </button>

            <button 
              type="button" 
              onClick={() => setActiveModal('support')}
              className="relative p-2 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 cursor-pointer"
            >
              <MessageSquare size={18} />
              <span className="absolute -top-1 -right-1 size-4 bg-red-600 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-xs">
                4
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. LOGIN / OTP IF NOT AUTHENTICATED ── */}
      {step === 'phone' && (
        <main className="max-w-4xl w-full mx-auto p-4 pt-10 text-center space-y-6">
          <h2 className="text-4xl font-black italic uppercase tracking-tight text-slate-900">Bienvenido</h2>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ingresa tu teléfono para acceder a tu cuenta</p>
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 text-left space-y-4 max-w-lg mx-auto">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Número Celular</label>
            <PhoneInput value={telefono} onChange={setTelefono} className="w-full" />
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-black rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle size={16} /> <span>{error}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || telefono.length < 8}
              className="w-full py-3.5 bg-slate-950 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
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
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Código WhatsApp</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ingresa el código enviado a tu celular</p>

          <form onSubmit={handleVerifyOtp} className="space-y-6 bg-white p-6 rounded-3xl shadow-xl border border-slate-200 max-w-lg mx-auto">
            <div className="flex justify-between items-center gap-1.5">
              {[0,1,2,3,4,5].map(idx => (
                <div 
                  key={idx} 
                  className={`flex-1 h-14 bg-slate-50 border-2 rounded-xl flex items-center justify-center text-2xl font-black ${
                    code[idx] ? 'border-amber-500 text-slate-900 bg-white shadow-xs' : 'border-slate-200 text-slate-300'
                  }`}
                >
                  {code[idx] || ''}
                </div>
              ))}
            </div>
            <input 
              ref={otpInputRef} 
              type="text" 
              inputMode="numeric" 
              pattern="[0-9]*" 
              autoFocus 
              maxLength={6} 
              className="sr-only" 
              value={code} 
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))} 
            />

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-black rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle size={16} /> <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3.5 bg-slate-950 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
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
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-500 shadow-md" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-orange-600 text-white font-black text-2xl flex items-center justify-center shadow-md border-2 border-white">
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
                    <h2 className="text-base font-black text-slate-900 leading-snug">{displayName}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${userLevelTag.color}`}>
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
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-amber-50/50 border border-slate-100 transition-colors cursor-pointer text-left space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-amber-100/60 text-amber-700 rounded-xl">
                    <ShoppingBag size={14} />
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-400">Pedidos</span>
                </div>
                <div>
                  <span className="text-base font-black text-slate-900 block leading-tight">
                    {cliente?.totalPedidos ?? cliente?.stats?.totalPedidos ?? 0}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 block">Realizados</span>
                </div>
              </button>

              <button 
                type="button"
                onClick={() => router.push(`/${slug}/mis-premios`)}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-amber-50/50 border border-slate-100 transition-colors cursor-pointer text-left space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-amber-100/60 text-amber-700 rounded-xl">
                    <Star size={14} />
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-400">Puntos</span>
                </div>
                <div>
                  <span className="text-base font-black text-slate-900 block leading-tight">
                    {cliente?.loyalty?.puntos ?? 0}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 block">Disponibles</span>
                </div>
              </button>

              <button 
                type="button"
                onClick={() => router.push(`/${slug}/mis-cupones`)}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-amber-50/50 border border-slate-100 transition-colors cursor-pointer text-left space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-amber-100/60 text-amber-700 rounded-xl">
                    <Tag size={14} />
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-400">Cupones</span>
                </div>
                <div>
                  <span className="text-base font-black text-slate-900 block leading-tight">
                    {cuponesCount}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 block">Disponibles</span>
                </div>
              </button>
            </div>

            {/* DIRECCIÓN REGISTRADA Y MINI MAPA */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="p-2 bg-red-50 text-red-600 rounded-xl shrink-0 mt-0.5">
                    <MapPin size={18} />
                  </span>
                  <div className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-slate-500 block tracking-wider">Dirección registrada</span>
                    <p className="text-xs font-black text-slate-900 leading-snug">
                      {direccionRegistrada}
                    </p>
                    {referenciaRegistrada && (
                      <p className="text-[11px] text-slate-500 font-medium">Ref: {referenciaRegistrada}</p>
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
                className="w-full py-3 px-4 bg-red-50 hover:bg-red-100/70 text-red-600 font-black text-xs uppercase tracking-wider rounded-2xl border border-red-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Compass size={16} />
                <span>ACTUALIZAR UBICACIÓN EN EL MAPA</span>
              </button>
            </div>

          </div>

          {/* BANNER / AVISO INTELIGENTE DE DESCARGA DE LA APP DE RESTAURANTE */}
          <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 rounded-3xl p-4.5 text-white shadow-lg space-y-3 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                  📱
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-200 block">
                    {(negocio?.tipoNegocio === 'RESTAURANTE' || negocio?.tipoNegocio === 'GASTRONOMIA' || negocio?.tipoNegocio === 'RESTAURANT')
                      ? 'App del Restaurante'
                      : 'App de la Tienda'}
                  </span>
                  <h4 className="text-sm font-black text-white leading-tight">
                    {isPWAInstalledState 
                      ? '¡Ya tienes la App instalada!' 
                      : `Descarga la App de ${negocio?.nombre || 'nuestra tienda'}`}
                  </h4>
                  <p className="text-[11px] text-white/90 font-medium leading-tight mt-0.5">
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
                className="w-full py-3 bg-white hover:bg-slate-50 text-red-600 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-95 border border-white"
              >
                <Smartphone size={16} />
                <span>Instalar App Gratis en mi Celular</span>
              </button>
            ) : (
              <div className="py-2 px-3 bg-white/15 rounded-xl border border-white/20 flex items-center justify-center gap-2 text-[11px] font-bold text-emerald-200">
                <CheckCircle2 size={15} />
                <span>App lista y activa en tu dispositivo</span>
              </div>
            )}
          </div>

          {/* ── 4. LISTADO DE OPCIONES "MI CUENTA" ── */}
          <div className="bg-white rounded-3xl p-2 shadow-sm border border-slate-200 space-y-1">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider px-4 pt-3 pb-1">Mi cuenta</h3>

            {[
              { id: 'personal_info', label: 'Información personal', desc: 'Actualiza tus datos personales', icon: User, color: 'bg-red-50 text-red-600' },
              { id: 'addresses', label: 'Mis direcciones', desc: 'Gestiona tus direcciones guardadas', icon: MapPin, color: 'bg-red-50 text-red-600' },
              { id: 'payments', label: 'Métodos de pago', desc: 'Tarjetas y pagos guardados', icon: CreditCard, color: 'bg-red-50 text-red-600' },
              { id: 'favorites', label: 'Mis favoritos', desc: 'Restaurantes y productos favoritos', icon: Star, color: 'bg-red-50 text-red-600' },
              { id: 'settings', label: 'Configuración', desc: 'Notificaciones, privacidad y más', icon: Settings, color: 'bg-red-50 text-red-600' },
              { id: 'support', label: 'Ayuda y soporte', desc: 'Centro de ayuda y contacto', icon: HelpCircle, color: 'bg-red-50 text-red-600' },
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
                    <span className={`p-2.5 rounded-2xl ${item.color} shrink-0`}>
                      <IconComponent size={18} />
                    </span>
                    <div>
                      <span className="text-xs font-black text-slate-900 block leading-tight">{item.label}</span>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">{item.desc}</span>
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
                <User className="w-5 h-5 text-red-600" />
                <h3 className="font-black text-sm uppercase text-slate-900">Información Personal</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePersonalInfo} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Teléfono Móvil (Registrado)</label>
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
                <button type="submit" disabled={savingProfile} className="py-2.5 px-5 bg-slate-950 text-white font-black rounded-xl shadow-md">
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
                <MapPin className="w-5 h-5 text-red-600" />
                <h3 className="font-black text-sm uppercase text-slate-900">Mis Direcciones Guardadas</h3>
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
                        <span className="font-black text-slate-900 truncate">{addr.etiqueta || 'Dirección'}</span>
                        {addr.principal && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black rounded-md uppercase shrink-0">Principal</span>
                        )}
                      </div>
                      <p className="text-slate-600 font-medium leading-snug">{addr.direccion}</p>
                      {addr.referencia && <p className="text-[10px] text-slate-400">Ref: {addr.referencia}</p>}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        type="button" 
                        onClick={() => {
                          handleConfirmLocationFromMap(addr.lat, addr.lng, addr.direccion, addr.referencia);
                          setActiveModal(null);
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase rounded-xl shadow-xs cursor-pointer"
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
              className="w-full py-3 bg-red-50 hover:bg-red-100/80 text-red-600 font-black text-xs uppercase rounded-2xl border border-red-100 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
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
                <CreditCard className="w-5 h-5 text-red-600" />
                <h3 className="font-black text-sm uppercase text-slate-900">Métodos de Pago</h3>
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
                    <span className="font-black text-slate-900 block">Efectivo al Recibir</span>
                    <span className="text-[10px] text-slate-400 font-medium">Pago directo al repartidor o cajero</span>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏦</span>
                  <div>
                    <span className="font-black text-slate-900 block">Transferencia Bancaria</span>
                    <span className="text-[10px] text-slate-400 font-medium">Envío de comprobante por WhatsApp</span>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic text-center">
              🔒 Tus datos de pago están seguros mediante encriptación estándar del sistema.
            </p>
          </div>
        </div>
      )}

      {/* ── MODAL 4: MIS FAVORITOS ── */}
      {activeModal === 'favorites' && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-red-600" />
                <h3 className="font-black text-sm uppercase text-slate-900">Mis Favoritos</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-xl">
                <XCircle size={20} />
              </button>
            </div>

            <div className="py-8 space-y-3">
              <div className="size-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
                ⭐
              </div>
              <h4 className="text-sm font-black text-slate-900">Aún no tienes favoritos</h4>
              <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                Guarda tus platillos y restaurantes favoritos para encontrarlos y pedirlos rápidamente.
              </p>
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
                <Settings className="w-5 h-5 text-red-600" />
                <h3 className="font-black text-sm uppercase text-slate-900">Configuración</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-xl">
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div>
                  <span className="font-black text-slate-900 block">Notificaciones de Pedido</span>
                  <span className="text-[10px] text-slate-400">Avisos del estado de tu entrega</span>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-red-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div>
                  <span className="font-black text-slate-900 block">Promociones y Ofertas</span>
                  <span className="text-[10px] text-slate-400">Alertas de cupones exclusivos</span>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-red-600" />
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs uppercase rounded-2xl flex items-center justify-center gap-2 mt-4"
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
                <HelpCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-black text-sm uppercase text-slate-900">Ayuda y Soporte</h3>
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
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-2xl shadow-md flex items-center justify-center gap-2"
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
            className="w-full py-3.5 px-5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-between border border-red-500 cursor-pointer active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag size={18} />
              <span>VER MI PEDIDO ({cartContext.totalItemsCount})</span>
            </div>
            <span className="text-sm font-black font-mono">${cartContext.total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── 6. NAVEGACIÓN INFERIOR PWA CON "MI CUENTA" ACTIVO ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-950 text-slate-400 border-t border-slate-800 py-2.5 px-4">
        <div className="max-w-md mx-auto flex items-center justify-around text-center">
          <button 
            type="button"
            onClick={() => router.push(`/${slug}`)} 
            className="flex flex-col items-center gap-1 text-[10px] font-bold hover:text-white cursor-pointer"
          >
            <Compass size={18} />
            <span>Inicio</span>
          </button>

          <button 
            type="button"
            onClick={() => router.push(`/${slug}/promo`)} 
            className="flex flex-col items-center gap-1 text-[10px] font-bold hover:text-white cursor-pointer"
          >
            <Tag size={18} />
            <span>Ofertas</span>
          </button>

          <button 
            type="button"
            onClick={() => router.push(`/${slug}/pedidos`)} 
            className="flex flex-col items-center gap-1 text-[10px] font-bold hover:text-white cursor-pointer"
          >
            <ShoppingBag size={18} />
            <span>Mis pedidos</span>
          </button>

          <button 
            type="button"
            className="flex flex-col items-center gap-1 text-[10px] font-black text-red-500 cursor-pointer"
          >
            <User size={18} />
            <span>Mi cuenta</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
