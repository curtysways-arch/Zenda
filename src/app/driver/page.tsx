'use client';

/**
 * @file page.tsx
 * @module app/driver
 * @description App web de repartidores Citiox.
 *
 * Un repartidor puede trabajar para varios negocios a la vez: la app usa la marca Citiox
 * (azul) y cada pedido lleva el logo y el color de SU negocio, para que siempre sepa
 * para quién está trabajando.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  getCanonicalLogistics,
  getActiveDriverCompensation,
  isLaundryType,
} from '@/core/logistics/CanonicalLogisticsService';
import {
  Truck, Check, X, Navigation, Phone, Clock, PackageCheck, AlertCircle, RefreshCw,
  Power, Store, Lock, MessageCircle, AlertTriangle, History, User, LogOut,
  ChevronRight, ShieldCheck, ArrowRight, Search, Coffee, Wallet, Map as MapIcon, Bike, Eye, Star,
  CalendarClock, Send, Bell,
} from 'lucide-react';
import { wordsFor } from '@/lib/laundry/wording';
import { ventanaRetiro, textoVentana, esParaMasTarde } from '@/lib/laundry/pickupWindow';
import DriverOrderMapModal from '@/components/driver/DriverOrderMapModal';

/* ─────────────────────────────── Tipos ─────────────────────────────── */

interface DbOrder {
  id: string;
  numeroPedido: number;
  codigo?: string;
  nombreCliente: string;
  telefonoCliente: string;
  direccionCliente?: string;
  referenciaCliente?: string;
  latitud?: number;
  longitud?: number;
  estado: string;
  total: number;
  costoEnvio?: number;
  paymentStatus?: string;
  createdAt: string;
  payment?: any;
  extraInfo?: any;
  negocio?: {
    id: string;
    nombre: string;
    slug: string;
    logoUrl?: string;
    direccion?: string;
    tipoNegocio?: string;
    colorPrimario?: string;
    whatsapp?: string;
    branches?: any[];
  };
  items: Array<{ id?: string; nombreProducto: string; cantidad: number; precioUnitario: number }>;
}

type DriverStatus = 'DISPONIBLE' | 'DESCANSO' | 'DESCONECTADO';
type Tab = 'PEDIDOS' | 'GANANCIAS' | 'HISTORIAL' | 'PERFIL';

/* ─────────────────────────────── Utilidades ─────────────────────────────── */

const BRAND = '#0066FF';
const API = '/api/public/_app/driver';
const HEADERS = { 'Content-Type': 'application/json', 'x-citiox-app': 'driver' };

const money = (n: number | string) => `$${Number(n || 0).toFixed(2)}`;

/** Color del negocio, solo si sirve como fondo con texto blanco (si es muy claro, usamos el azul Citiox). */
function safeColor(c?: string | null) {
  if (!c || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return BRAND;
  let h = c.slice(1);
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.62 ? BRAND : `#${h}`;
}

function parseExtra(extra: any) {
  if (!extra) return {};
  if (typeof extra === 'string') {
    try { return JSON.parse(extra); } catch { return {}; }
  }
  return extra;
}

function initials(name?: string) {
  return (name || 'R').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function timeAgo(iso?: string) {
  if (!iso) return '';
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
}

function orderCode(o: DbOrder) {
  return o.codigo || (o.numeroPedido ? String(o.numeroPedido) : o.id.slice(-6).toUpperCase());
}

function waLink(phone?: string) {
  let d = (phone || '').replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 10) d = '593' + d.slice(1);
  else if (d.length === 9 && d.startsWith('9')) d = '593' + d;
  return d ? `https://wa.me/${d}` : '';
}

/** Punto del cliente para los mapas: coordenadas si las hay, si no la dirección. */
function clientPoint(o: DbOrder) {
  if (o.latitud && o.longitud) return `${o.latitud},${o.longitud}`;
  return o.direccionCliente || '';
}
function businessPoint(o: DbOrder) {
  const b: any = o.negocio || {};
  const u = Array.isArray(b.Ubicacion) ? b.Ubicacion[0] : b.Ubicacion;
  if (u?.latitud && u?.longitud) return `${u.latitud},${u.longitud}`;
  return b.direccion || '';
}

type NavApp = 'google' | 'waze';
const NAV_KEY = 'citiox_driver_nav_app';
function getNavApp(): NavApp | null {
  try { const v = localStorage.getItem(NAV_KEY); return v === 'google' || v === 'waze' ? v : null; } catch { return null; }
}
function setNavApp(v: NavApp | null) {
  try { if (v) localStorage.setItem(NAV_KEY, v); else localStorage.removeItem(NAV_KEY); } catch {}
}

/** Abre la navegación ya iniciada hacia el cliente o hacia el local, en la app elegida. */
function navLink(o: DbOrder, toBusiness: boolean, app: NavApp) {
  const p = toBusiness ? businessPoint(o) : clientPoint(o);
  if (!p) return '';
  const isCoords = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(p);
  if (app === 'waze') return isCoords ? `https://waze.com/ul?ll=${p}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(p)}&navigate=yes`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p)}&travelmode=driving&dir_action=navigate`;
}

/** Compatibilidad: enlace de Google Maps (lo usan otras partes). */
function mapsLink(o: DbOrder, toBusiness = false) {
  return navLink(o, toBusiness, 'google');
}

/** Retiro aceptado para más adelante: no ocupa al repartidor hasta su horario (o hasta que lo empiece). */
function isScheduled(o: DbOrder) {
  if (o.estado !== 'REPARTIDOR_EN_CAMINO') return false;
  const ex = parseExtra(o.extraInfo);
  if (ex.retiroIniciadoAt !== null) return false; // pedidos anteriores (sin el campo) siguen como antes
  return esParaMasTarde(ventanaRetiro(ex, o.createdAt));
}
function pickupWindowText(o: DbOrder) {
  const v = ventanaRetiro(parseExtra(o.extraInfo), o.createdAt);
  return v.fecha ? textoVentana(v) : '';
}
function unreadChat(o: DbOrder) {
  const ex = parseExtra(o.extraInfo);
  const seen = ex.chatLeido?.REPARTIDOR ? Date.parse(ex.chatLeido.REPARTIDOR) : 0;
  return (Array.isArray(ex.chat) ? ex.chat : []).filter((m: any) => m.de === 'CLIENTE' && Date.parse(m.at) > seen).length;
}

function distanceOf(o: DbOrder): string | null {
  const ex = parseExtra(o.extraInfo);
  const d = Number(ex?.pricingBreakdown?.distanceKm || ex?.distanceKm || 0);
  return d > 0 ? `${d.toFixed(1)} km` : null;
}

function isLaundryOrder(o: DbOrder) {
  const ex = parseExtra(o.extraInfo);
  return (
    isLaundryType(o.negocio?.tipoNegocio, ex, `${o.negocio?.slug || ''} ${o.negocio?.nombre || ''}`) ||
    (o as any).isLaundry ||
    ex?.isLaundry ||
    Boolean(ex?.servicioNombre || ex?.articulos || ex?.cantidadPares) ||
    ['ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'ESPERANDO_REPARTIDOR_ENTREGA', 'LISTO_PARA_ENTREGA', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO', 'EN_RUTA_ENTREGA'].includes(o.estado)
  );
}

function isRetiroOrder(o: DbOrder) {
  const ex = parseExtra(o.extraInfo);
  return (
    (o as any).tipoMision === 'RETIRO' ||
    ex?.tipoMision === 'RETIRO' ||
    ['ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'PENDIENTE_RETIRO', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO'].includes(o.estado)
  );
}

/** Pasos de la misión según el tipo, para la barra de progreso. */
function missionSteps(o: DbOrder, laundry: boolean, retiro: boolean): { steps: string[]; current: number } {
  if (laundry && retiro) {
    const ex = parseExtra(o.extraInfo);
    const current = o.estado === 'RECOGIDO' ? 2 : ex.llegoClienteAt ? 1 : 0;
    return { steps: ['Ir donde el cliente', 'Recibir del cliente', 'Llevar al local'], current };
  }
  if (laundry) {
    // Entrega de lavandería: el repartidor recoge las prendas listas en el local y las lleva al cliente
    const map: Record<string, number> = {
      REPARTIDOR_ASIGNADO: 0, REPARTIDOR_EN_LOCAL: 1, ENTREGADO_A_REPARTIDOR: 1,
      EN_RUTA_ENTREGA: 2, ESPERANDO_CLIENTE: 3, WAITING_CLIENT: 3,
    };
    return { steps: ['Ir al local', 'Recibir pedido', 'En camino', 'Entregar'], current: map[o.estado] ?? 0 };
  }
  const map: Record<string, number> = {
    REPARTIDOR_ASIGNADO: 0,
    REPARTIDOR_EN_LOCAL: 1,
    ENTREGADO_A_REPARTIDOR: 1,
    EN_CAMINO: 2,
    EN_RUTA: 2,
    ESPERANDO_CLIENTE: 3,
    WAITING_CLIENT: 3,
  };
  return { steps: ['Ir al local', 'Retirar pedido', 'En camino', 'Entregar'], current: map[o.estado] ?? 0 };
}

/** Restaurante: código que el repartidor dice en el local. (En lavandería el código lo tiene el cliente.) */
function pickupCodeFor(o: DbOrder) {
  const ex = parseExtra(o.extraInfo);
  return ex?.pickupCode ? String(ex.pickupCode) : '';
}

const CANCELLATION_REASONS = [
  { code: 'CLIENT_NO_ANSWER', title: 'El cliente no responde', desc: 'No contesta llamadas ni WhatsApp' },
  { code: 'WRONG_ADDRESS', title: 'Dirección incorrecta o inaccesible', desc: 'Ubicación errónea o calle cerrada' },
  { code: 'CLIENT_POSTPONED', title: 'El cliente pidió otra fecha u hora', desc: 'No está listo para recibir o entregar' },
  { code: 'VEHICLE_EMERGENCY', title: 'Emergencia o avería', desc: 'Problema con tu vehículo o fuerza mayor' },
  { code: 'SECURITY_ZONE', title: 'Zona insegura', desc: 'No hay condiciones seguras para llegar' },
  { code: 'OTHER', title: 'Otro motivo', desc: 'Escribe el detalle abajo' },
];

/* ─────────────────────────────── Piezas visuales ─────────────────────────────── */

function BizLogo({ biz, size = 'w-9 h-9' }: { biz?: { nombre?: string; logoUrl?: string | null; colorPrimario?: string | null; color?: string | null }; size?: string }) {
  const [err, setErr] = useState(false);
  const color = safeColor(biz?.colorPrimario || biz?.color);
  if (biz?.logoUrl && !err) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={biz.logoUrl} alt="" onError={() => setErr(true)} className={`${size} rounded-xl object-cover bg-white ring-1 ring-black/5 shrink-0`} />;
  }
  return (
    <div className={`${size} rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0`} style={{ background: color }}>
      {initials(biz?.nombre)}
    </div>
  );
}

function Sheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Página ─────────────────────────────── */

export default function DriverAppPage() {
  const [driverSession, setDriverSession] = useState<{
    driverId: string;
    driverName: string;
    driverPhone: string;
    vehicleType: string;
  } | null>(null);
  const [isInitializingSession, setIsInitializingSession] = useState(true);

  const driverId = driverSession?.driverId || '';
  const driverName = driverSession?.driverName || '';
  const driverPhone = driverSession?.driverPhone || '';

  const [status, setStatus] = useState<DriverStatus>('DISPONIBLE');
  const [tab, setTab] = useState<Tab>('PEDIDOS');
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState(Date.now());
  const [inputPins, setInputPins] = useState<Record<string, string>>({});
  const [detailOrder, setDetailOrder] = useState<DbOrder | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [bizFilter, setBizFilter] = useState<string>('ALL');
  const [activeIdx, setActiveIdx] = useState(0);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'err' } | null>(null);
  const [savingNetwork, setSavingNetwork] = useState(false);

  // Cancelación
  const [cancelOrder, setCancelOrder] = useState<DbOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('CLIENT_NO_ANSWER');
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Calificación al cliente
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
  const [customerStar, setCustomerStar] = useState(5);
  const [customerComment, setCustomerComment] = useState('');

  // Ingreso con WhatsApp
  const [otpStep, setOtpStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpName, setOtpName] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const notify = (msg: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast((t) => (t?.msg === msg ? null : t)), 3500);
  };

  /* ── Sesión ─────────────────────────────────────────────────────────── */

  // La sesión real es la cookie del servidor; localStorage solo guarda datos de pantalla.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let saved: any = null;
        try { saved = JSON.parse(localStorage.getItem('citiox_driver_session') || 'null'); } catch {}
        try {
          const st = localStorage.getItem('citiox_driver_status') as DriverStatus | null;
          if (st === 'DISPONIBLE' || st === 'DESCANSO' || st === 'DESCONECTADO') setStatus(st);
        } catch {}
        if (window.location.search.includes('driverId=')) window.history.replaceState(null, '', window.location.pathname);
        const res = await fetch(API, { cache: 'no-store', headers: { 'x-citiox-app': 'driver' } });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const p = data.driverProfile;
          if (p?.driverId) {
            const s = {
              driverId: p.driverId,
              driverName: p.driverName || saved?.driverName || '',
              driverPhone: p.driverPhone || saved?.driverPhone || '',
              vehicleType: p.vehicleType || saved?.vehicleType || 'MOTO',
            };
            try { localStorage.setItem('citiox_driver_session', JSON.stringify(s)); } catch {}
            setDriverSession(s);
            setProfile(p);
            setOrders(data.availableDbOrders || []);
            return;
          }
        }
        try { localStorage.removeItem('citiox_driver_session'); } catch {}
        setDriverSession(null);
      } catch {
        try {
          const saved = localStorage.getItem('citiox_driver_session');
          if (saved && !cancelled) setDriverSession(JSON.parse(saved));
        } catch {}
      } finally {
        if (!cancelled) setIsInitializingSession(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const normalizedPhone = () => {
    const d = otpPhone.replace(/\D/g, '');
    if (d.length === 9 && d.startsWith('9')) return '0' + d;
    if (d.startsWith('593') && d.length === 12) return '0' + d.slice(3);
    return d;
  };

  const requestOtp = async () => {
    const phone = normalizedPhone();
    if (phone.length < 9) {
      setOtpError('Escribe tu número de celular completo.');
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify({ action: 'REQUEST_OTP', phone }) });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpName(data.driverName || null);
        setOtpStep('OTP');
        setOtpCode('');
        setResendIn(30);
      } else {
        setOtpError(data.error || 'No pudimos enviarte el código.');
      }
    } catch {
      setOtpError('Sin conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async (code: string) => {
    if (code.length < 4) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ action: 'VERIFY_OTP', phone: normalizedPhone(), otp: code }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.session) {
        try { localStorage.setItem('citiox_driver_session', JSON.stringify(data.session)); } catch {}
        setDriverSession(data.session);
        setTab('PEDIDOS');
      } else {
        setOtpError(data.error || 'Código incorrecto.');
        setOtpCode('');
      }
    } catch {
      setOtpError('Sin conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
      setOtpLoading(false);
    }
  };

  const endLocalSession = () => {
    try { localStorage.removeItem('citiox_driver_session'); } catch {}
    setDriverSession(null);
    setOrders([]);
    setProfile(null);
    setOtpStep('PHONE');
    setOtpCode('');
  };

  const handleLogout = async () => {
    setShowLogout(false);
    try { await fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify({ action: 'LOGOUT' }) }); } catch {}
    endLocalSession();
  };

  /* ── Datos ─────────────────────────────────────────────────────────── */

  const fetchDriverData = async () => {
    if (!driverId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}?driverId=${driverId}`, { cache: 'no-store', headers: { 'x-citiox-app': 'driver' } });
      if (res.status === 401 || res.status === 403) {
        endLocalSession();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setOrders(data.availableDbOrders || []);
        if (data.driverProfile) setProfile(data.driverProfile);
      }
    } catch {
      // sin conexión: se reintenta en el siguiente ciclo
    } finally {
      setLoading(false);
    }
  };

  const registerDriver = async () => {
    if (!driverId || !driverName) return;
    try {
      await fetch(API, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          action: 'REGISTER_OR_UPDATE_DRIVER',
          driverId,
          name: driverName,
          phone: driverPhone,
          vehicleType: driverSession?.vehicleType || 'MOTO',
          status,
        }),
      });
    } catch {}
    fetchDriverData();
  };

  useEffect(() => {
    if (!driverId) return;
    registerDriver();
    const interval = window.setInterval(fetchDriverData, 5000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  useEffect(() => {
    const t = window.setInterval(() => setNowTime(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  /* ── Acciones ─────────────────────────────────────────────────────────── */

  const post = async (body: any) => {
    const res = await fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) endLocalSession();
    return { ok: res.ok && data.success !== false, data };
  };

  const changeStatus = async (next: DriverStatus) => {
    setStatus(next);
    try { localStorage.setItem('citiox_driver_status', next); } catch {}
    await post({ action: 'SET_STATUS', driverId, status: next }).catch(() => {});
    fetchDriverData();
  };

  const acceptOrder = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const { ok, data } = await post({ action: 'ACCEPT_TASK', orderId, driverId, name: driverName, phone: driverPhone });
      if (!ok) notify(data.error || 'No se pudo aceptar el pedido.', 'err');
      else {
        notify(data.agendado
          ? `Retiro agendado para ${String(data.ventanaTexto || 'su horario').replace(/^Hoy/, 'hoy').replace(/^Mañana/, 'mañana')}. Mientras tanto puedes tomar otros pedidos.`
          : '¡Pedido aceptado! Ve a retirarlo.');
        setDetailOrder(null);
        setActiveIdx(0);
      }
      fetchDriverData();
    } catch {
      notify('Sin conexión. Intenta de nuevo.', 'err');
    } finally {
      setActionLoading(null);
    }
  };

  const markArrived = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const { ok, data } = await post({ action: 'MARK_ARRIVED', orderId, driverId, name: driverName, phone: driverPhone });
      if (!ok) notify(data.error || 'No se pudo registrar tu llegada.', 'err');
      fetchDriverData();
    } finally {
      setActionLoading(null);
    }
  };

  const updateState = async (
    orderId: string,
    nextState: 'ON_ROUTE' | 'DELIVERED' | 'PICKED_UP' | 'DELIVERED_TO_WORKSHOP' | 'WAITING_CLIENT',
    pin?: string
  ) => {
    setActionLoading(orderId);
    try {
      const { ok, data } = await post({ action: 'UPDATE_DELIVERY_STATE', orderId, nextState, pin: pin ? pin.trim() : undefined });
      if (!ok) {
        notify(data.error || 'No se pudo actualizar la entrega.', 'err');
        return data;
      }
      fetchDriverData();
      if (nextState === 'DELIVERED') {
        setRatingOrderId(orderId);
      }
      if (nextState === 'DELIVERED' || nextState === 'PICKED_UP') {
        setInputPins((p) => ({ ...p, [orderId]: '' }));
      }
      return data;
    } catch (e: any) {
      notify('Sin conexión. Intenta de nuevo.', 'err');
    } finally {
      setActionLoading(null);
    }
  };

  /** Retiro: salir hacia el cliente (empieza la misión y le avisa) o avisar que ya llegó. */
  const pickupStep = async (orderId: string, action: 'START_PICKUP' | 'ARRIVED_AT_CLIENT') => {
    setActionLoading(orderId);
    try {
      const { ok, data } = await post({ action, orderId });
      if (!ok) notify(data.error || 'No se pudo registrar.', 'err');
      else notify(action === 'START_PICKUP' ? 'Le avisamos al cliente que vas en camino.' : 'Le avisamos al cliente que llegaste. Muéstrale tu código.');
      if (ok && action === 'START_PICKUP') setActiveIdx(0);
      fetchDriverData();
    } finally {
      setActionLoading(null);
    }
  };

  const sendChat = async (orderId: string, texto: string) => {
    const { ok, data } = await post({ action: 'CHAT_SEND', orderId, texto });
    if (!ok) notify(data.error || 'No se pudo enviar el mensaje.', 'err');
    else fetchDriverData();
    return ok;
  };
  const readChat = async (orderId: string) => {
    await post({ action: 'CHAT_READ', orderId }).catch(() => {});
    fetchDriverData();
  };

  const resendNotice = async (orderId: string, missionType?: 'RETIRO' | 'ENTREGA') => {
    const { ok, data } = await post({ action: 'RESEND_CUSTOMER_NOTIFICATION', orderId, ...(missionType ? { missionType } : {}) });
    notify(ok ? 'Le enviamos el aviso al cliente por WhatsApp.' : data.error || 'No se pudo enviar el aviso.', ok ? 'ok' : 'err');
  };

  const openCancel = (order: DbOrder) => {
    if (['RECOGIDO', 'RECIBIDO', 'EN_PROCESO', 'ENTREGADO'].includes(order.estado)) {
      notify('Ya retiraste los artículos: llévalos al negocio o escríbele al local.', 'err');
      return;
    }
    setCancelOrder(order);
    setCancelReason('CLIENT_NO_ANSWER');
    setCancelNotes('');
  };

  const confirmCancel = async () => {
    if (!cancelOrder) return;
    const reason = CANCELLATION_REASONS.find((r) => r.code === cancelReason);
    setCancelLoading(true);
    try {
      const { ok, data } = await post({
        action: 'CANCEL_TASK',
        orderId: cancelOrder.id,
        driverId,
        name: driverName,
        phone: driverPhone,
        reasonCode: cancelReason,
        reasonLabel: reason?.title || cancelReason,
        notes: cancelNotes,
      });
      if (!ok) {
        notify(data.error || 'No se pudo cancelar.', 'err');
        return;
      }
      notify('Misión cancelada. El pedido volvió a la lista para otro repartidor.');
      setCancelOrder(null);
      setDetailOrder(null);
      fetchDriverData();
    } finally {
      setCancelLoading(false);
    }
  };

  const submitRating = async () => {
    if (!ratingOrderId) return;
    const order = orders.find((o) => o.id === ratingOrderId);
    try {
      await fetch(`/api/public/${order?.negocio?.slug || '_app'}/orders/${ratingOrderId}`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ driverRating: customerStar, driverComment: customerComment, rater: 'DRIVER' }),
      });
    } catch {}
    setRatingOrderId(null);
    setCustomerComment('');
    setCustomerStar(5);
    fetchDriverData();
  };

  const toggleNetwork = async () => {
    const next = !(profile?.disponibleNuevosNegocios !== false);
    setSavingNetwork(true);
    const { ok, data } = await post({ action: 'SET_NETWORK_AVAILABILITY', value: next });
    setSavingNetwork(false);
    if (!ok) {
      notify(data.error || 'No se pudo guardar.', 'err');
      return;
    }
    setProfile((p: any) => ({ ...(p || {}), disponibleNuevosNegocios: next }));
    notify(next ? 'Otros negocios de Citiox podrán invitarte.' : 'Ya no aparecerás como recomendado para nuevos negocios.');
  };

  /* ── Derivados ─────────────────────────────────────────────────────────── */

  const myAssignedOrders = useMemo(() => orders.filter((o) => {
    const ex = parseExtra(o.extraInfo);
    const mine = ex.assignedDriverId === driverId || (ex.repartidorId === driverId && ex.assignedDriverId !== null);
    if (!mine) return false;
    return [
      'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR', 'EN_CAMINO', 'EN_RUTA',
      'ESPERANDO_CLIENTE', 'WAITING_CLIENT', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO', 'EN_RUTA_ENTREGA',
    ].includes(o.estado);
  }), [orders, driverId]);

  const openOrders = useMemo(() => orders.filter((o) => {
    const ex = parseExtra(o.extraInfo);
    if (ex.assignedDriverId) return false;
    return [
      'EN_PREPARACION', 'ACEPTADO', 'LISTO',
      'ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR',
      'ESPERANDO_REPARTIDOR_ENTREGA', 'LISTO_PARA_ENTREGA',
    ].includes(o.estado);
  }), [orders]);

  const businesses: any[] = profile?.negociosAsociados || [];
  const approvedBiz = businesses.filter((b) => b.isApproved);
  const pendingBiz = businesses.filter((b) => !b.isApproved);
  const isBlocked = Boolean(profile?.isGlobalBlocked);
  // Los retiros agendados para más tarde no ocupan al repartidor: puede seguir tomando pedidos
  const scheduledOrders = myAssignedOrders.filter(isScheduled);
  const activeMissions = myAssignedOrders.filter((o) => !isScheduled(o));
  const hasActiveOrder = activeMissions.length > 0;
  const activeOrder = hasActiveOrder ? activeMissions[Math.min(activeIdx, activeMissions.length - 1)] : null;

  const filteredOpen = bizFilter === 'ALL' ? openOrders : openOrders.filter((o) => o.negocio?.id === bizFilter);
  const countByBiz = (id: string) => openOrders.filter((o) => o.negocio?.id === id).length;

  const firstName = driverName.split(' ')[0] || 'Repartidor';

  // Con una misión en curso solo se ve esa misión hasta terminarla
  useEffect(() => {
    if (activeOrder) setTab('PEDIDOS');
  }, [activeOrder?.id]);

  // Notificaciones push: recordatorios de retiros agendados y mensajes del cliente
  const [pushState, setPushState] = useState<'unsupported' | 'default' | 'granted' | 'denied'>('unsupported');
  const registerPush = async (ask: boolean) => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return;
      if (ask && Notification.permission === 'default') await Notification.requestPermission();
      setPushState(Notification.permission as any);
      if (Notification.permission !== 'granted') return;
      const { getFcmToken } = await import('@/lib/firebase');
      const token = await getFcmToken();
      if (token) await post({ action: 'REGISTER_PUSH', token });
      if (ask) notify('Listo: te avisaremos cuando sea hora de tus retiros.');
    } catch {
      if (ask) notify('No se pudieron activar las notificaciones en este teléfono.', 'err');
    }
  };
  useEffect(() => {
    if (!driverId) return;
    try { if ('Notification' in window) setPushState(Notification.permission as any); } catch {}
    registerPush(false); // si ya dio permiso, se renueva el token en silencio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);
  const [navApp, setNavAppState] = useState<NavApp | null>(null);
  useEffect(() => { setNavAppState(getNavApp()); }, [tab]);

  /* ─────────────────────────── Render: cargando ─────────────────────────── */

  if (isInitializingSession && !driverSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FB]">
        <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-[#0066FF] animate-spin" />
      </div>
    );
  }

  /* ─────────────────────────── Render: ingreso ─────────────────────────── */

  if (!driverSession) {
    const isDev = process.env.NODE_ENV !== 'production';
    return (
      <div className="min-h-screen bg-[#F7F8FB] flex flex-col">
        <div className="bg-[#0066FF] text-white px-6 pt-10 pb-20 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10" />
          <div className="absolute right-10 bottom-[-60px] w-40 h-40 rounded-full bg-white/5" />
          <div className="max-w-sm mx-auto relative">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/citiox-icon.png" alt="" className="w-10 h-10 rounded-xl bg-white p-1" />
              <div>
                <p className="font-bold leading-tight">Citiox</p>
                <p className="text-xs text-white/75 leading-tight">App de repartidores</p>
              </div>
            </div>
            <h1 className="text-[1.7rem] font-bold mt-8 leading-tight">
              {otpStep === 'PHONE' ? 'Entrega pedidos de todos tus negocios en un solo lugar' : 'Revisa tu WhatsApp'}
            </h1>
          </div>
        </div>

        <main className="flex-1 px-4 -mt-12 relative">
          <div className="max-w-sm mx-auto bg-white rounded-3xl shadow-xl shadow-slate-900/5 ring-1 ring-slate-100 p-6">
            {otpStep === 'PHONE' ? (
              <form onSubmit={(e) => { e.preventDefault(); requestOtp(); }} className="space-y-4">
                <div>
                  <label htmlFor="drv-phone" className="text-sm font-semibold text-slate-800">Tu número de WhatsApp</label>
                  <p className="text-xs text-slate-500 mt-0.5">El mismo con el que te registró tu negocio.</p>
                  <div className="mt-3 flex items-center rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-[#0066FF] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0066FF]/10 transition">
                    <span className="pl-4 pr-2 text-sm font-semibold text-slate-600 select-none">🇪🇨 +593</span>
                    <input
                      id="drv-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      autoFocus
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value.replace(/[^\d\s]/g, '').slice(0, 13))}
                      placeholder="099 123 4567"
                      className="flex-1 min-w-0 bg-transparent py-3.5 pr-4 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>
                </div>

                {otpError && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{otpError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={otpLoading || otpPhone.replace(/\D/g, '').length < 9}
                  className="w-full h-13 py-3.5 rounded-2xl bg-[#0066FF] hover:bg-[#0052cc] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition"
                >
                  {otpLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>Recibir código <ArrowRight className="w-4 h-4" /></>}
                </button>

                <p className="text-xs text-slate-500 text-center leading-relaxed">
                  ¿Aún no eres repartidor? Pídele al negocio que te envíe una invitación desde su panel de Citiox.
                </p>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600">
                    {otpName ? <>Hola <b className="text-slate-900">{otpName}</b>, te</> : 'Te'} enviamos un código de 4 dígitos al{' '}
                    <b className="text-slate-900">{normalizedPhone()}</b>.
                  </p>
                </div>

                <label className="block">
                  <span className="sr-only">Código</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={4}
                    value={otpCode}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setOtpCode(v);
                      if (v.length === 4) verifyOtp(v);
                    }}
                    className="w-full text-center text-3xl font-bold tracking-[0.6em] pl-[0.6em] py-3.5 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:border-[#0066FF] focus:bg-white focus:ring-4 focus:ring-[#0066FF]/10 text-slate-900"
                    placeholder="····"
                  />
                </label>

                {otpError && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{otpError}</span>
                  </div>
                )}

                <button
                  onClick={() => verifyOtp(otpCode)}
                  disabled={otpLoading || otpCode.length < 4}
                  className="w-full py-3.5 rounded-2xl bg-[#0066FF] hover:bg-[#0052cc] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition"
                >
                  {otpLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Entrar'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button onClick={() => { setOtpStep('PHONE'); setOtpError(null); }} className="text-slate-500 hover:text-slate-800">
                    Cambiar número
                  </button>
                  <button
                    onClick={requestOtp}
                    disabled={resendIn > 0 || otpLoading}
                    className="font-semibold text-[#0066FF] disabled:text-slate-400"
                  >
                    {resendIn > 0 ? `Reenviar en ${resendIn}s` : 'Reenviar código'}
                  </button>
                </div>

                {isDev && (
                  <p className="text-[11px] text-center text-amber-700 bg-amber-50 rounded-lg py-1.5">
                    Modo desarrollo: el código 1234 también funciona.
                  </p>
                )}
              </div>
            )}
          </div>
        </main>

        <footer className="py-6 text-center text-xs text-slate-400">Citiox · Repartidores</footer>
      </div>
    );
  }

  /* ─────────────────────────── Render: app ─────────────────────────── */

  return (
    <div className="min-h-screen bg-[#F7F8FB] text-slate-900 pb-28">
      {/* Encabezado */}
      {!activeOrder && (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
          <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => setTab('PERFIL')} className="shrink-0" aria-label="Mi perfil">
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-100" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#0066FF] text-white flex items-center justify-center text-sm font-bold">{initials(driverName)}</div>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">Hola,</p>
              <p className="font-bold text-slate-900 leading-tight truncate">{firstName}</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                status === 'DISPONIBLE' ? 'bg-emerald-50 text-emerald-700' : status === 'DESCANSO' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status === 'DISPONIBLE' ? 'bg-emerald-500 animate-pulse' : status === 'DESCANSO' ? 'bg-amber-500' : 'bg-slate-400'}`} />
              {status === 'DISPONIBLE' ? 'Conectado' : status === 'DESCANSO' ? 'En pausa' : 'Desconectado'}
            </span>
            <button onClick={fetchDriverData} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500" aria-label="Actualizar">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>
      )}

      {isBlocked && (
        <div className="max-w-xl mx-auto px-4 pt-4">
          <div className="p-4 rounded-2xl bg-rose-50 ring-1 ring-rose-200 text-rose-800 flex gap-3">
            <Lock className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Tu cuenta está suspendida</p>
              <p className="text-rose-700/90 mt-0.5">{profile?.globalBlockReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════ MISIÓN ACTIVA ═════════════ */}
      {tab === 'PEDIDOS' && activeOrder && (
        <ActiveMission
          key={activeOrder.id}
          order={activeOrder}
          driverId={driverId}
          all={activeMissions}
          activeIdx={Math.min(activeIdx, activeMissions.length - 1)}
          setActiveIdx={setActiveIdx}
          nowTime={nowTime}
          pin={inputPins[activeOrder.id] || ''}
          setPin={(v) => setInputPins((p) => ({ ...p, [activeOrder.id]: v }))}
          busy={actionLoading === activeOrder.id}
          onMap={() => setDetailOrder(activeOrder)}
          onArrived={() => markArrived(activeOrder.id)}
          onState={(s, pin) => updateState(activeOrder.id, s, pin)}
          onCancel={() => openCancel(activeOrder)}
          onResend={(m) => resendNotice(activeOrder.id, m)}
          onStartPickup={() => pickupStep(activeOrder.id, 'START_PICKUP')}
          onArrivedClient={() => pickupStep(activeOrder.id, 'ARRIVED_AT_CLIENT')}
          onChatSend={(t) => sendChat(activeOrder.id, t)}
          onChatRead={() => readChat(activeOrder.id)}
          onRefresh={fetchDriverData}
          scheduledCount={scheduledOrders.length}
        />
      )}

      {/* ═════════════ BOLSA DE PEDIDOS ═════════════ */}
      {tab === 'PEDIDOS' && !activeOrder && (
        <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
          {/* Disponibilidad */}
          <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-1.5 grid grid-cols-3 gap-1">
            {([
              { key: 'DISPONIBLE', label: 'Conectado', Icon: Power, on: 'bg-emerald-500 text-white' },
              { key: 'DESCANSO', label: 'Pausa', Icon: Coffee, on: 'bg-amber-500 text-white' },
              { key: 'DESCONECTADO', label: 'Inactivo', Icon: X, on: 'bg-slate-700 text-white' },
            ] as const).map((s) => (
              <button
                key={s.key}
                onClick={() => changeStatus(s.key)}
                className={`py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition ${
                  status === s.key ? s.on : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <s.Icon className="w-4 h-4" /> {s.label}
              </button>
            ))}
          </section>

          {/* Sin negocios aprobados */}
          {approvedBiz.length === 0 && (
            <section className="p-4 rounded-2xl bg-amber-50 ring-1 ring-amber-200 text-amber-900 text-sm flex gap-3">
              <Clock className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Aún ningún negocio te aprobó</p>
                <p className="text-amber-800/90 mt-0.5">
                  {pendingBiz.length
                    ? `${pendingBiz.map((b) => b.nombre).join(', ')} está revisando tus documentos. Te avisarán por WhatsApp.`
                    : 'Cuando un negocio te apruebe verás aquí sus pedidos.'}
                </p>
              </div>
            </section>
          )}

          {pushState === 'default' && (
            <section className="p-4 rounded-2xl bg-white ring-1 ring-slate-200 flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#0066FF] shrink-0" />
              <p className="flex-1 text-sm text-slate-700">Activa las notificaciones para que te avisemos cuando sea hora de un retiro agendado.</p>
              <button onClick={() => registerPush(true)} className="px-3 py-2 rounded-xl bg-[#0066FF] text-white text-sm font-semibold shrink-0">Activar</button>
            </section>
          )}
          {pushState === 'denied' && scheduledOrders.length > 0 && (
            <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2">Tienes las notificaciones bloqueadas: te avisaremos solo por WhatsApp. Puedes activarlas en los ajustes del navegador.</p>
          )}
          {scheduledOrders.length > 0 && (
            <section>
              <h2 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-sky-600" /> Agendados <span className="text-slate-400 font-semibold">{scheduledOrders.length}</span>
              </h2>
              <div className="space-y-2">
                {scheduledOrders.map((o) => (
                  <ScheduledCard key={o.id} order={o} busy={actionLoading === o.id}
                    onStart={() => pickupStep(o.id, 'START_PICKUP')}
                    onOpen={() => setDetailOrder(o)}
                    onCancel={() => openCancel(o)} />
                ))}
              </div>
            </section>
          )}

          {status !== 'DISPONIBLE' ? (
            <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 mx-auto flex items-center justify-center">
                {status === 'DESCANSO' ? <Coffee className="w-6 h-6 text-amber-500" /> : <Power className="w-6 h-6 text-slate-400" />}
              </div>
              <p className="font-semibold text-slate-900 mt-3">{status === 'DESCANSO' ? 'Estás en pausa' : 'Estás desconectado'}</p>
              <p className="text-sm text-slate-500 mt-1">Conéctate para ver los pedidos disponibles.</p>
              <button onClick={() => changeStatus('DISPONIBLE')} className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold">
                Conectarme
              </button>
            </section>
          ) : (
            <>
              {/* Filtro por negocio */}
              {approvedBiz.length > 1 && (
                <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
                  <button
                    onClick={() => setBizFilter('ALL')}
                    className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold ring-1 transition ${
                      bizFilter === 'ALL' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200'
                    }`}
                  >
                    Todos · {openOrders.length}
                  </button>
                  {approvedBiz.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBizFilter(b.id)}
                      className={`shrink-0 pl-1.5 pr-3.5 py-1.5 rounded-full text-sm font-semibold ring-1 flex items-center gap-2 transition ${
                        bizFilter === b.id ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200'
                      }`}
                    >
                      <BizLogo biz={b} size="w-6 h-6" />
                      <span className="max-w-[120px] truncate">{b.nombre}</span>
                      <span className="opacity-60">{countByBiz(b.id)}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Pedidos disponibles</h2>
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En vivo
                </span>
              </div>

              {filteredOpen.length === 0 ? (
                <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#0066FF]/10 mx-auto flex items-center justify-center">
                    <PackageCheck className="w-6 h-6 text-[#0066FF]" />
                  </div>
                  <p className="font-semibold text-slate-900 mt-3">No hay pedidos por ahora</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {approvedBiz.length
                      ? `Aparecerán aquí apenas ${approvedBiz.length === 1 ? approvedBiz[0].nombre : 'uno de tus negocios'} tenga un pedido listo para enviar.`
                      : 'Cuando un negocio te apruebe verás aquí sus pedidos.'}
                  </p>
                </section>
              ) : (
                <div className="space-y-3">
                  {filteredOpen.map((o) => (
                    <PoolCard key={o.id} order={o} onOpen={() => setDetailOrder(o)} disabled={isBlocked} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* ═════════════ GANANCIAS ═════════════ */}
      {tab === 'GANANCIAS' && <Earnings profile={profile} />}

      {/* ═════════════ HISTORIAL ═════════════ */}
      {tab === 'HISTORIAL' && (
        <main className="max-w-xl mx-auto px-4 pt-4 space-y-3">
          <h2 className="font-bold text-slate-900 text-lg">Historial</h2>
          <div className="flex items-center gap-2 bg-white rounded-xl ring-1 ring-slate-200 px-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Buscar cliente, pedido o negocio"
              className="flex-1 py-2.5 text-sm outline-none bg-transparent"
            />
          </div>
          {(() => {
            const q = historySearch.trim().toLowerCase();
            const list = (profile?.historialEntregas || []).filter((h: any) =>
              !q ||
              String(h.cliente || '').toLowerCase().includes(q) ||
              String(h.negocio || '').toLowerCase().includes(q) ||
              String(h.codigo || h.numeroPedido || '').toLowerCase().includes(q)
            );
            if (!list.length) {
              return (
                <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-8 text-center">
                  <History className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-800 mt-2">{q ? 'Sin resultados' : 'Aún no tienes entregas'}</p>
                  <p className="text-sm text-slate-500 mt-1">Tus entregas completadas aparecerán aquí.</p>
                </div>
              );
            }
            return (
              <div className="bg-white rounded-2xl ring-1 ring-slate-100 divide-y divide-slate-100">
                {list.map((h: any) => (
                  <div key={h.id} className="p-3.5 flex items-center gap-3">
                    <BizLogo biz={{ nombre: h.negocio, logoUrl: h.negocioLogo, color: h.negocioColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{h.cliente}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {h.tipoTramo === 'RETIRO' ? 'Retiro · ' : ''}{h.negocio} · #{h.codigo || h.numeroPedido} · {h.fecha}
                      </p>
                    </div>
                    <span className="text-right">
                      <span className="block text-sm font-bold text-emerald-600">{money(h.gananciaNum ?? 0)}</span>
                      <span className={`block text-[11px] ${h.pagadoPorNegocio ? 'text-slate-400' : 'text-amber-600'}`}>
                        {h.pagadoPorNegocio ? 'Pagado' : 'Por cobrar'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </main>
      )}

      {/* ═════════════ PERFIL ═════════════ */}
      {tab === 'PERFIL' && (
        <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
          <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-5 flex items-center gap-4">
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover bg-slate-100" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#0066FF] text-white flex items-center justify-center text-xl font-bold">{initials(driverName)}</div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-lg text-slate-900 truncate">{driverName}</p>
              <p className="text-sm text-slate-500">{driverPhone}</p>
              <p className="text-xs mt-1 inline-flex items-center gap-1 text-slate-500">
                <Bike className="w-3.5 h-3.5" />
                {[profile?.vehicleType === 'AUTO' ? 'Auto' : profile?.vehicleType === 'BICICLETA' ? 'Bicicleta' : profile?.vehicleType === 'A_PIE' ? 'A pie' : 'Moto', profile?.vehicleName, profile?.placa].filter(Boolean).join(' · ')}
              </p>
            </div>
          </section>

          {/* Negocios */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 mb-2 px-1">Mis negocios</h3>
            <div className="bg-white rounded-2xl ring-1 ring-slate-100 divide-y divide-slate-100">
              {businesses.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Todavía no trabajas con ningún negocio.</p>
              ) : (
                businesses.map((b) => (
                  <div key={b.id} className="p-3.5 flex items-center gap-3">
                    <BizLogo biz={b} size="w-10 h-10" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{b.nombre}</p>
                      <p className="text-xs text-slate-500 truncate">{[b.direccion, b.ciudad].filter((x: string, i: number, arr: string[]) => x && arr.indexOf(x) === i).join(' · ') || 'Sin dirección'}</p>
                    </div>
                    {b.isApproved ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Activo</span>
                    ) : b.pausado ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">En pausa</span>
                    ) : b.status === 'SUSPENDED' ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">Suspendido</span>
                    ) : b.status === 'REJECTED' ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">Corregir datos</span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">En revisión</span>
                    )}
                    {b.telefono && (
                      <a href={waLink(b.telefono)} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center" aria-label={`WhatsApp de ${b.nombre}`}>
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Red Citiox */}
          <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-sm text-slate-900">Recibir invitaciones de otros negocios</p>
              <p className="text-xs text-slate-500 mt-0.5">Citiox puede recomendarte a negocios de tu ciudad que buscan repartidores.</p>
            </div>
            <button
              onClick={toggleNetwork}
              disabled={savingNetwork}
              role="switch"
              aria-checked={profile?.disponibleNuevosNegocios !== false}
              className={`w-12 h-7 rounded-full p-0.5 transition shrink-0 ${profile?.disponibleNuevosNegocios !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${profile?.disponibleNuevosNegocios !== false ? 'translate-x-5' : ''}`} />
            </button>
          </section>

          <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-4 flex items-center gap-3">
            <Navigation className="w-5 h-5 text-slate-500" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-slate-900">App para navegar</p>
              <p className="text-xs text-slate-500">{navApp === 'google' ? 'Google Maps' : navApp === 'waze' ? 'Waze' : 'Te preguntaremos la próxima vez'}</p>
            </div>
            {navApp && (
              <button onClick={() => { setNavApp(null); setNavAppState(null); notify('La próxima vez te preguntaremos qué app usar.'); }} className="text-sm font-semibold text-[#0066FF]">Cambiar</button>
            )}
          </section>

          <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-4 flex items-center gap-3">
            <Bell className={`w-5 h-5 ${pushState === 'granted' ? 'text-emerald-500' : 'text-slate-400'}`} />
            <div className="flex-1">
              <p className="font-semibold text-sm text-slate-900">Notificaciones</p>
              <p className="text-xs text-slate-500">{pushState === 'granted' ? 'Activadas: te avisamos de tus retiros y mensajes.' : pushState === 'denied' ? 'Bloqueadas en este navegador. Actívalas en sus ajustes.' : pushState === 'unsupported' ? 'Este navegador no las admite. Te avisaremos por WhatsApp.' : 'Desactivadas.'}</p>
            </div>
            {pushState === 'default' && <button onClick={() => registerPush(true)} className="text-sm font-semibold text-[#0066FF]">Activar</button>}
          </section>

          <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-4 flex items-center gap-3">
            <ShieldCheck className={`w-5 h-5 ${profile?.documentosCompletos ? 'text-emerald-500' : 'text-amber-500'}`} />
            <div className="flex-1">
              <p className="font-semibold text-sm text-slate-900">Documentos</p>
              <p className="text-xs text-slate-500">
                {profile?.documentosCompletos ? 'Tus documentos están cargados. Solo los ven los negocios con los que trabajas.' : 'Faltan documentos. Pide al negocio que te reenvíe el enlace de registro.'}
              </p>
            </div>
          </section>

          <button
            onClick={() => setShowLogout(true)}
            className="w-full py-3 rounded-2xl bg-white ring-1 ring-slate-200 text-rose-600 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </main>
      )}

      {/* ═════════════ NAVEGACIÓN ═════════════ */}
      {!activeOrder && (
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-xl mx-auto grid grid-cols-4">
            {([
              { key: 'PEDIDOS', label: 'Pedidos', Icon: Truck, badge: openOrders.length },
              { key: 'GANANCIAS', label: 'Ganancias', Icon: Wallet },
              { key: 'HISTORIAL', label: 'Historial', Icon: History },
              { key: 'PERFIL', label: 'Perfil', Icon: User },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative py-2.5 flex flex-col items-center gap-0.5 text-[11px] font-semibold transition ${tab === t.key ? 'text-[#0066FF]' : 'text-slate-400'}`}
              >
                <t.Icon className="w-5 h-5" />
                {t.label}
                {'badge' in t && t.badge ? (
                  <span className="absolute top-1.5 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">{t.badge}</span>
                ) : null}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Vuelve a la misión desde otras pestañas */}
      {activeOrder && tab !== 'PEDIDOS' && (
        <button onClick={() => setTab('PEDIDOS')} className="fixed bottom-4 inset-x-4 z-40 max-w-xl mx-auto py-3.5 rounded-2xl bg-[#0066FF] text-white font-semibold shadow-lg">
          Volver a mi entrega en curso
        </button>
      )}

      {/* ═════════════ MODALES ═════════════ */}

      {cancelOrder && (
        <Sheet title="Cancelar misión" onClose={() => setCancelOrder(null)}>
          <p className="text-sm text-slate-600 mb-3">El pedido volverá a la lista para que otro repartidor lo tome. ¿Qué pasó?</p>
          <div className="space-y-2">
            {CANCELLATION_REASONS.map((r) => (
              <button
                key={r.code}
                onClick={() => setCancelReason(r.code)}
                className={`w-full text-left p-3 rounded-xl ring-1 transition flex items-start gap-3 ${
                  cancelReason === r.code ? 'ring-2 ring-rose-500 bg-rose-50/60' : 'ring-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${cancelReason === r.code ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`} />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{r.title}</span>
                  <span className="block text-xs text-slate-500">{r.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            value={cancelNotes}
            onChange={(e) => setCancelNotes(e.target.value)}
            placeholder="Detalle (opcional)"
            className="mt-3 w-full p-3 rounded-xl ring-1 ring-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-400"
          />
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => setCancelOrder(null)} className="py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold">Volver</button>
            <button
              onClick={confirmCancel}
              disabled={cancelLoading || (cancelReason === 'OTHER' && !cancelNotes.trim())}
              className="py-3 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {cancelLoading ? 'Cancelando…' : 'Cancelar misión'}
            </button>
          </div>
        </Sheet>
      )}

      {ratingOrderId && (
        <Sheet title="¡Entrega completada!" onClose={() => setRatingOrderId(null)}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 mx-auto flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-sm text-slate-600 mt-3">¿Cómo te fue con el cliente?</p>
            <div className="flex justify-center gap-1.5 my-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setCustomerStar(s)} aria-label={`${s} estrellas`}>
                  <Star className={`w-8 h-8 ${s <= customerStar ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
            <input
              value={customerComment}
              onChange={(e) => setCustomerComment(e.target.value)}
              placeholder="Comentario (opcional)"
              className="w-full p-3 rounded-xl ring-1 ring-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#0066FF]"
            />
            <button onClick={submitRating} className="mt-4 w-full py-3 rounded-xl bg-[#0066FF] text-white text-sm font-semibold">
              Enviar y continuar
            </button>
          </div>
        </Sheet>
      )}

      {showLogout && (
        <Sheet title="¿Cerrar sesión?" onClose={() => setShowLogout(false)}>
          <p className="text-sm text-slate-600">Dejarás de recibir pedidos hasta que vuelvas a entrar con tu número.</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => setShowLogout(false)} className="py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold">Cancelar</button>
            <button onClick={handleLogout} className="py-3 rounded-xl bg-rose-600 text-white text-sm font-semibold">Cerrar sesión</button>
          </div>
        </Sheet>
      )}

      {detailOrder && (
        <DriverOrderMapModal
          order={detailOrder as any}
          driverId={driverId}
          hasActiveOrder={hasActiveOrder || isBlocked}
          actionLoading={actionLoading === detailOrder.id}
          onAccept={acceptOrder}
          onUpdateState={updateState}
          onClose={() => setDetailOrder(null)}
          onCancel={openCancel as any}
        />
      )}

      {toast && (
        <div className="fixed top-3 inset-x-3 z-[400] flex justify-center pointer-events-none">
          <div className={`max-w-md w-full px-4 py-3 rounded-2xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.tone === 'ok' ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white'}`}>
            {toast.tone === 'ok' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── Tarjeta de pedido disponible ─────────────────────────────── */

function PoolCard({ order, onOpen, disabled }: { order: DbOrder; onOpen: () => void; disabled?: boolean }) {
  const ex = parseExtra(order.extraInfo);
  const canonical = getCanonicalLogistics(order);
  const laundry = isLaundryOrder(order);
  const retiro = laundry && isRetiroOrder(order);
  const fee = canonical.tipoMision === 'ROUND_TRIP_SERVICE' ? (retiro ? canonical.pickupFee : canonical.deliveryFee) : canonical.deliveryFee;
  const comp = getActiveDriverCompensation(order);
  const color = safeColor(order.negocio?.colorPrimario);
  const dist = distanceOf(order);
  const ready = ['LISTO', 'LISTO_PARA_ENTREGA'].includes(order.estado);

  const from = retiro
    ? { label: 'Retiras en', name: order.nombreCliente || 'Cliente', addr: order.direccionCliente }
    : { label: 'Retiras en', name: order.negocio?.nombre || 'Local', addr: order.negocio?.direccion };
  const to = retiro
    ? { label: 'Entregas en', name: order.negocio?.nombre || 'Taller', addr: order.negocio?.direccion }
    : { label: 'Entregas a', name: order.nombreCliente || 'Cliente', addr: order.direccionCliente };

  return (
    <button onClick={onOpen} className="w-full text-left bg-white rounded-2xl ring-1 ring-slate-100 hover:ring-slate-300 overflow-hidden transition shadow-sm">
      <div className="h-1" style={{ background: color }} />
      <div className="p-4">
        <div className="flex items-center gap-3">
          <BizLogo biz={order.negocio} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-slate-900 truncate">{order.negocio?.nombre || 'Negocio'}</p>
            <p className="text-xs text-slate-500">
              #{orderCode(order)} · {timeAgo(order.createdAt)}
              {dist ? ` · ${dist}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-600 leading-none">{money(fee)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">ganas</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${color}14`, color }}
          >
            {laundry ? (retiro ? 'Retiro en casa del cliente' : 'Entrega de servicio') : 'Entrega a domicilio'}
          </span>
          {!laundry && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ready ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {ready ? 'Listo para retirar' : 'En preparación'}
            </span>
          )}
          {retiro && pickupWindowText(order) && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {pickupWindowText(order)}
            </span>
          )}
          {comp.puedeCobrarCliente && comp.montoRecaudarCliente > 0 ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Cobras {money(comp.montoRecaudarCliente)} en efectivo</span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Ya pagado</span>
          )}
        </div>

        <div className="mt-3 relative pl-5 space-y-2.5">
          <span className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-200" />
          <div className="relative">
            <span className="absolute -left-5 top-1 w-[11px] h-[11px] rounded-full border-2 bg-white" style={{ borderColor: color }} />
            <p className="text-[11px] text-slate-400">{from.label}</p>
            <p className="text-sm font-medium text-slate-800 truncate">{from.name}</p>
            {from.addr && <p className="text-xs text-slate-500 truncate">{from.addr}</p>}
          </div>
          <div className="relative">
            <span className="absolute -left-5 top-1 w-[11px] h-[11px] rounded-full" style={{ background: color }} />
            <p className="text-[11px] text-slate-400">{to.label}</p>
            <p className="text-sm font-medium text-slate-800 truncate">{to.name}</p>
            {to.addr && <p className="text-xs text-slate-500 truncate">{to.addr}</p>}
          </div>
        </div>

        {ex?.notas && <p className="mt-2 text-xs text-slate-500 italic truncate">“{ex.notas}”</p>}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">{disabled ? 'Cuenta suspendida' : 'Toca para ver el mapa y aceptar'}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#0066FF]">
            Ver <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </button>
  );
}

/* ─────────────────────────────── Retiro agendado ─────────────────────────────── */

function ScheduledCard({ order, busy, onStart, onOpen, onCancel }: { order: DbOrder; busy: boolean; onStart: () => void; onOpen: () => void; onCancel: () => void }) {
  const color = safeColor(order.negocio?.colorPrimario);
  const unread = unreadChat(order);
  return (
    <div className="bg-white rounded-2xl ring-1 ring-sky-200 overflow-hidden">
      <div className="px-4 py-2 bg-sky-50 text-sky-900 text-sm font-semibold flex items-center gap-2">
        <CalendarClock className="w-4 h-4" /> {pickupWindowText(order) || 'Horario a coordinar'}
      </div>
      <button onClick={onOpen} className="w-full text-left p-4 flex items-center gap-3">
        <BizLogo biz={order.negocio} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">Retirar donde {order.nombreCliente || 'el cliente'}</p>
          <p className="text-xs text-slate-500 truncate">{order.direccionCliente || 'Sin dirección'}</p>
          <p className="text-xs text-slate-400 truncate">{order.negocio?.nombre} · #{orderCode(order)}{unread ? ` · ${unread} ${unread === 1 ? 'mensaje' : 'mensajes'} nuevo${unread === 1 ? '' : 's'}` : ''}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </button>
      <div className="px-4 pb-4 flex gap-2">
        <button onClick={onCancel} className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold">Soltar</button>
        <button onClick={onStart} disabled={busy} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ background: color }}>
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />} Salir ahora hacia el cliente
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Ganancias ─────────────────────────────── */

function Earnings({ profile }: { profile: any }) {
  const hist: any[] = profile?.historialEntregas || [];
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startWeek = startToday - ((now.getDay() + 6) % 7) * 86400000;
  const sum = (from: number) =>
    hist.filter((h) => h.fechaISO && new Date(h.fechaISO).getTime() >= from).reduce((s, h) => s + Number(h.gananciaNum || 0) + Number(h.propinaNum || 0), 0);
  const countFrom = (from: number) => hist.filter((h) => h.fechaISO && new Date(h.fechaISO).getTime() >= from).length;

  const byBiz = Object.values(
    hist.reduce((acc: any, h) => {
      const k = h.negocioId || h.negocio;
      acc[k] = acc[k] || { nombre: h.negocio, logoUrl: h.negocioLogo, color: h.negocioColor, total: 0, count: 0 };
      acc[k].total += Number(h.gananciaNum || 0) + Number(h.propinaNum || 0);
      acc[k].count += 1;
      return acc;
    }, {})
  ).sort((a: any, b: any) => b.total - a.total) as any[];

  const m = profile?.metricas || {};
  return (
    <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
      <h2 className="font-bold text-slate-900 text-lg">Ganancias</h2>
      <section className="rounded-2xl bg-[#0066FF] text-white p-5 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <p className="text-sm text-white/80">Esta semana</p>
        <p className="text-4xl font-bold mt-1">{money(sum(startWeek))}</p>
        <p className="text-sm text-white/80 mt-1">{countFrom(startWeek)} {countFrom(startWeek) === 1 ? 'viaje' : 'viajes'}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Hoy', value: money(sum(startToday)) },
            { label: 'Total', value: money(m.totalGanado || 0) },
            { label: 'Por cobrar', value: money(m.porCobrarNegocios || 0) },
          ].map((x) => (
            <div key={x.label} className="rounded-xl bg-white/10 py-2">
              <p className="font-bold">{x.value}</p>
              <p className="text-[11px] text-white/75">{x.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-500 mb-2 px-1">Por negocio</h3>
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 divide-y divide-slate-100">
          {byBiz.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Cuando completes entregas verás aquí cuánto ganaste con cada negocio.</p>
          ) : (
            byBiz.map((b: any) => (
              <div key={b.nombre} className="p-3.5 flex items-center gap-3">
                <BizLogo biz={b} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{b.nombre}</p>
                  <p className="text-xs text-slate-500">{b.count} entregas</p>
                </div>
                <span className="font-bold text-slate-900">{money(b.total)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {(m.desgloseDias || []).length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-500 mb-2 px-1">Por día</h3>
          <div className="bg-white rounded-2xl ring-1 ring-slate-100 divide-y divide-slate-100">
            {m.desgloseDias.map((d: any, i: number) => (
              <div key={i} className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{d.label}</p>
                  <p className="text-xs text-slate-500">{d.count} {d.count === 1 ? 'entrega' : 'entregas'}</p>
                </div>
                <span className="font-bold text-emerald-600">{money(d.total)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <p className="text-xs text-slate-400 text-center px-4">Cada negocio te paga directamente. En lavanderías el retiro y la entrega se pagan por separado. "Por cobrar" es lo que el negocio aún no marca como pagado.</p>
    </main>
  );
}

/* ─────────────────────────────── Misión en curso ─────────────────────────────── */

function ActiveMission(props: {
  order: DbOrder;
  driverId: string;
  all: DbOrder[];
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  nowTime: number;
  pin: string;
  setPin: (v: string) => void;
  busy: boolean;
  onMap: () => void;
  onArrived: () => void;
  onState: (s: 'ON_ROUTE' | 'DELIVERED' | 'PICKED_UP' | 'DELIVERED_TO_WORKSHOP' | 'WAITING_CLIENT', pin?: string) => void;
  onCancel: () => void;
  onResend: (m?: 'RETIRO' | 'ENTREGA') => void;
  onStartPickup: () => void;
  onArrivedClient: () => void;
  onChatSend: (texto: string) => Promise<boolean>;
  onChatRead: () => void;
  onRefresh: () => void;
  scheduledCount?: number;
}) {
  const { order, driverId, nowTime, pin, setPin, busy } = props;
  const [chatOpen, setChatOpen] = useState(false);
  // Avisos en vivo del pedido (mensajes del cliente, cambios de estado)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API}/chat-stream?orderId=${encodeURIComponent(order.id)}`);
      es.addEventListener('chat', () => props.onRefresh());
    } catch { es = null; }
    return () => { try { es?.close(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);
  const ex = parseExtra(order.extraInfo);
  const comp = getActiveDriverCompensation(order, driverId);
  const laundry = isLaundryOrder(order);
  const retiro = laundry && isRetiroOrder(order);
  const color = safeColor(order.negocio?.colorPrimario);
  const { steps, current } = missionSteps(order, laundry, retiro);
  const w = wordsFor(order.negocio);
  const driverCode: string | null = laundry && ex?.driverCode ? String(ex.driverCode) : null;
  const pickupCode = pickupCodeFor(order);
  const handedOver =
    ['ENTREGADO_A_REPARTIDOR', 'EN_CAMINO', 'EN_RUTA'].includes(order.estado) || Boolean(ex?.isHandedOver || ex?.dispatchStatus === 'DESPACHADO');
  const pickedUp = !['REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'REPARTIDOR_EN_CAMINO'].includes(order.estado) && !(order.estado === 'ENTREGADO_A_REPARTIDOR' && !handedOver);
  const canCancel = !['RECOGIDO', 'RECIBIDO', 'EN_PROCESO', 'ENTREGADO'].includes(order.estado);
  const waitingClient = ['ESPERANDO_CLIENTE', 'WAITING_CLIENT'].includes(order.estado);
  const dist = distanceOf(order);
  // Retiro: primero sale hacia el cliente, avisa que llegó y recién ahí muestra su código
  const atClient = retiro && Boolean(ex.llegoClienteAt);
  const unread = unreadChat(order);
  const chatMsgs: any[] = Array.isArray(ex.chat) ? ex.chat : [];

  // Hacia dónde va ahora el repartidor
  const goingToBusiness = (!laundry || !retiro) && ['REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR'].includes(order.estado) && !handedOver;
  const goingToWorkshop = laundry && retiro && order.estado === 'RECOGIDO';
  const toClient = !(goingToBusiness || goingToWorkshop);
  const target = !toClient
    ? { title: goingToWorkshop ? `Lleva ${w.lasCosas} a` : 'Recoge el pedido en', name: order.negocio?.nombre || 'Local', addr: order.negocio?.direccion || '', phone: order.negocio?.whatsapp || '', maps: mapsLink(order, true) }
    : { title: retiro ? `Retira ${w.lasCosas} donde` : 'Entrega a', name: order.nombreCliente || 'Cliente', addr: order.direccionCliente || '', ref: order.referenciaCliente, phone: order.telefonoCliente, maps: mapsLink(order) };
  // Navegar: la primera vez pregunta Google Maps o Waze y lo recuerda. En el retiro, ir hacia el cliente
  // avisa que va en camino; después de recoger, el mismo botón lleva al local.
  const [navPicker, setNavPicker] = useState(false);
  const openNav = (app: NavApp) => {
    const link = navLink(order, !toClient, app);
    if (!link) { props.onMap(); return; }
    window.open(link, '_blank', 'noopener');
    if (retiro && toClient && order.estado === 'REPARTIDOR_EN_CAMINO' && !ex.enCaminoAt) props.onStartPickup();
  };
  const navigate = () => {
    const app = getNavApp();
    if (app) openNav(app); else setNavPicker(true);
  };

  const readyAt = ex?.estimatedReadyAt ? new Date(ex.estimatedReadyAt).getTime() : null;
  const secsLeft = readyAt ? Math.max(0, Math.floor((readyAt - nowTime) / 1000)) : null;

  // Botón principal según el estado
  let primary: { label: string; onClick: () => void; disabled?: boolean; hint?: string } | null = null;
  switch (order.estado) {
    case 'REPARTIDOR_EN_CAMINO':
      if (!atClient) {
        primary = { label: 'Llegué donde el cliente', onClick: props.onArrivedClient, hint: 'Toca «Navegar» para ir. Al llegar, toca aquí: le avisamos al cliente y te mostramos tu código.' };
      } else {
        // El retiro lo confirma el cliente (quien entrega) ingresando el código del repartidor
        primary = {
          label: 'Esperando al cliente',
          onClick: () => {},
          disabled: true,
          hint: `Muéstrale tu código al cliente. Cuando lo ingrese en su teléfono, se confirma el retiro de ${w.lasCosas}.`,
        };
      }
      break;
    case 'RECOGIDO':
      primary = { label: 'Entregué en el local', onClick: () => props.onState('DELIVERED_TO_WORKSHOP') };
      break;
    case 'EN_RUTA_ENTREGA':
    case 'EN_CAMINO':
    case 'EN_RUTA':
      primary = { label: 'Llegué donde el cliente', onClick: () => props.onState('WAITING_CLIENT') };
      break;
    case 'REPARTIDOR_ASIGNADO':
      primary = { label: 'Llegué al local', onClick: props.onArrived };
      break;
    case 'REPARTIDOR_EN_LOCAL':
    case 'ENTREGADO_A_REPARTIDOR':
      primary = handedOver
        ? { label: 'Salir a entregar', onClick: () => props.onState('ON_ROUTE') }
        : {
            label: 'Esperando al local',
            onClick: () => {},
            disabled: true,
            hint: laundry
              ? `Dale tu código al local. Cuando te entregue ${w.lasCosas} y lo ingrese, se activa este botón.`
              : 'Dile el código de retiro al local; cuando te entreguen el pedido se activa este botón.',
          };
      break;
    case 'ESPERANDO_CLIENTE':
    case 'WAITING_CLIENT':
      primary = {
        label: 'Confirmar entrega',
        onClick: () => props.onState('DELIVERED', pin),
        disabled: pin.trim().length !== 4,
        hint: pin.trim().length !== 4 ? 'Escribe el código de 4 dígitos que te dicta el cliente.' : undefined,
      };
      break;
  }

  return (
    <div className="max-w-xl mx-auto pb-40">
      {/* Cabecera con el color del negocio */}
      <div className="text-white px-4 pt-4 pb-14 relative overflow-hidden" style={{ background: color }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/25" />
        <div className="relative">
          {props.all.length > 1 && (
            <div className="flex gap-1.5 mb-3 overflow-x-auto">
              {props.all.map((o, i) => (
                <button
                  key={o.id}
                  onClick={() => props.setActiveIdx(i)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${i === props.activeIdx ? 'bg-white text-slate-900' : 'bg-white/20 text-white'}`}
                >
                  #{orderCode(o)}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <BizLogo biz={order.negocio} size="w-11 h-11" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/80">{laundry ? (retiro ? `Retiro de ${w.cosas}` : `Entrega de ${w.cosas}`) : 'Entrega en curso'}</p>
              <p className="font-bold truncate">{order.negocio?.nombre} · #{orderCode(order)}</p>
            </div>
            {order.negocio?.whatsapp && (
              <a href={waLink(order.negocio.whatsapp)} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center" aria-label="Escribir al negocio">
                <Store className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-10 relative space-y-3">
        {/* Progreso */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-4">
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full ${i <= current ? '' : 'bg-slate-200'}`} style={i <= current ? { background: color } : undefined} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">{steps[current]}</p>
            {secsLeft !== null && !pickedUp && !laundry && (
              <span className="text-xs text-slate-500">
                {secsLeft > 0 ? <>Listo en <b className="font-mono text-slate-900">{String(Math.floor(secsLeft / 60)).padStart(2, '0')}:{String(secsLeft % 60).padStart(2, '0')}</b></> : 'Debería estar listo'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Paso {current + 1} de {steps.length}</p>
        </section>

        {retiro && order.estado === 'REPARTIDOR_EN_CAMINO' && pickupWindowText(order) && (
          <section className="rounded-2xl bg-sky-50 ring-1 ring-sky-200 px-4 py-3 text-sm text-sky-900 flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" /> Retiro: <b className="font-semibold">{pickupWindowText(order)}</b>
          </section>
        )}
        {!!props.scheduledCount && (
          <p className="text-xs text-slate-500 px-1 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> Además tienes {props.scheduledCount} {props.scheduledCount === 1 ? 'retiro agendado' : 'retiros agendados'} para más tarde.</p>
        )}

        {/* Dinero */}
        {comp.puedeCobrarCliente && comp.montoRecaudarCliente > 0 ? (
          <section className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-white flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-900">Cobra en efectivo al cliente</p>
              <p className="text-2xl font-bold text-amber-950">{money(comp.montoRecaudarCliente)}</p>
              <p className="text-xs text-amber-800/90">Este dinero es del negocio: lo entregas al local. Tu pago: {money(comp.monto)}.</p>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-900">No cobres nada al cliente</p>
              <p className="text-xs text-emerald-800">
                Tu pago por esta {laundry && retiro ? 'recogida' : 'entrega'}: <b>{money(comp.monto)}</b>
                {comp.estadoCompensacion === 'PAID' ? ' · ya pagado' : ''}
              </p>
            </div>
          </section>
        )}

        {/* Destino actual */}
        <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-4">
          <p className="text-xs text-slate-500">{target.title}</p>
          <p className="font-bold text-slate-900 text-lg leading-tight mt-0.5">{target.name}</p>
          {target.addr && <p className="text-sm text-slate-600 mt-1">{target.addr}</p>}
          {'ref' in target && target.ref && <p className="text-xs text-slate-500 mt-1">Referencia: {target.ref}</p>}
          {dist && <p className="text-xs text-slate-400 mt-1">{dist} del local al cliente</p>}

          <div className="grid grid-cols-4 gap-2 mt-4">
            <button onClick={navigate} className="col-span-2 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5" style={{ background: color }}>
              <Navigation className="w-4 h-4" /> Navegar
            </button>
            {target.phone ? (
              <a href={`tel:${target.phone}`} className="py-3 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center" aria-label="Llamar">
                <Phone className="w-4 h-4" />
              </a>
            ) : <span />}
            {toClient ? (
              <button onClick={() => { setChatOpen(true); props.onChatRead(); }} className="relative py-3 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center" aria-label="Chat con el cliente">
                <MessageCircle className="w-4 h-4" />
                {unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">{unread}</span>}
              </button>
            ) : target.phone ? (
              <a href={waLink(target.phone)} target="_blank" rel="noreferrer" className="py-3 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center" aria-label="WhatsApp del local">
                <MessageCircle className="w-4 h-4" />
              </a>
            ) : <span />}
          </div>
        </section>

        {/* Código para retirar en el local */}
        {['REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR', 'REPARTIDOR_ASIGNADO'].includes(order.estado) && !laundry && pickupCode && (
          <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">Código de retiro</p>
              <p className="text-xs text-slate-500">Dilo en el local para que te entreguen el pedido.</p>
            </div>
            <span className="font-mono text-2xl font-bold tracking-widest px-3 py-1.5 rounded-xl bg-slate-100 text-slate-900">{pickupCode}</span>
          </section>
        )}

        {/* Código del repartidor: lo ingresa quien le entrega (cliente en el retiro, local en la entrega) */}
        {laundry && driverCode && ['REPARTIDOR_EN_CAMINO', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL'].includes(order.estado) && (!retiro || atClient) && (
          <section className="bg-white rounded-2xl ring-2 p-4" style={{ ['--tw-ring-color' as any]: color }}>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Tu código</p>
                <p className="text-xs text-slate-500">
                  {retiro
                    ? `Muéstraselo al cliente: él lo ingresa en su teléfono para entregarte ${w.tusCosas.replace('tus ', 'sus ')}.`
                    : `Dáselo al local: lo ingresa al entregarte ${w.lasCosas}.`}
                </p>
              </div>
              <span className="font-mono text-3xl font-bold tracking-widest px-3 py-2 rounded-xl text-white" style={{ background: color }}>{driverCode}</span>
            </div>
            {retiro && (
              <button onClick={() => props.onResend('RETIRO')} className="mt-3 text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4" /> Reenviar enlace al cliente
              </button>
            )}
          </section>
        )}

        {/* PIN de entrega */}
        {waitingClient && (
          <section className="bg-white rounded-2xl ring-2 p-4" style={{ ['--tw-ring-color' as any]: color }}>
            <p className="font-semibold text-slate-900">Pide el código al cliente</p>
            <p className="text-xs text-slate-500">Lo tiene en su WhatsApp o en la pantalla de su pedido.</p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="····"
              className="mt-3 w-full text-center text-3xl font-bold tracking-[0.6em] pl-[0.6em] py-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 outline-none focus:ring-2"
            />
            <button onClick={() => props.onResend('ENTREGA')} className="mt-3 text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" /> Reenviar código al cliente
            </button>
          </section>
        )}

        {/* Detalle del pedido */}
        <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-4">
          <p className="font-semibold text-slate-900 text-sm mb-2">{laundry ? 'Artículos' : 'Pedido'}</p>
          <div className="space-y-1.5">
            {(order.items || []).length ? (
              order.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    <b className="text-slate-900">{it.cantidad}×</b> {it.nombreProducto}
                  </span>
                  {!laundry && <span className="text-slate-500">{money(Number(it.precioUnitario) * it.cantidad)}</span>}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">{ex?.servicioNombre || 'Sin detalle de artículos'}</p>
            )}
          </div>
          {(ex?.instruccionesRetiro || ex?.notas) && (
            <p className="mt-3 p-2.5 rounded-xl bg-amber-50 text-xs text-amber-900">
              <b>Nota del cliente:</b> {ex.instruccionesRetiro || ex.notas}
            </p>
          )}
          {!laundry && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm">
              <span className="text-slate-500">Total del pedido</span>
              <span className="font-semibold text-slate-900">{money(order.total)}</span>
            </div>
          )}
        </section>

        {/* Avisar al cliente */}
        {!waitingClient && order.estado !== 'REPARTIDOR_EN_CAMINO' && (
          <button onClick={() => props.onResend()} className="w-full py-3 rounded-2xl bg-white ring-1 ring-slate-100 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600" /> Avisar al cliente por WhatsApp
          </button>
        )}
      </div>

      {navPicker && (
        <Sheet title="¿Con qué app quieres navegar?" onClose={() => setNavPicker(false)}>
          <p className="text-sm text-slate-600 mb-3">La recordaremos para tus próximos viajes. Puedes cambiarla en tu perfil.</p>
          <div className="grid grid-cols-2 gap-2">
            {([['google', 'Google Maps'], ['waze', 'Waze']] as const).map(([k, l]) => (
              <button key={k} onClick={() => { setNavApp(k); setNavPicker(false); openNav(k); }} className="py-4 rounded-2xl ring-1 ring-slate-200 font-semibold text-slate-900 flex flex-col items-center gap-1 hover:bg-slate-50">
                <Navigation className="w-5 h-5" style={{ color }} /> {l}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {chatOpen && (
        <DriverChatSheet
          clientName={order.nombreCliente || 'Cliente'}
          messages={chatMsgs}
          color={color}
          onClose={() => { setChatOpen(false); props.onChatRead(); }}
          onSend={props.onChatSend}
        />
      )}

      {/* Barra inferior */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-xl mx-auto p-3 space-y-2">
          {primary?.hint && <p className="text-xs text-center text-slate-500">{primary.hint}</p>}
          <div className="flex gap-2">
            {canCancel ? (
              <button onClick={props.onCancel} className="w-14 shrink-0 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center" aria-label="Cancelar misión" title="Cancelar misión">
                <AlertTriangle className="w-5 h-5" />
              </button>
            ) : (
              <span className="w-14 shrink-0 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center" title="Ya retiraste los artículos">
                <Lock className="w-5 h-5" />
              </span>
            )}
            {primary ? (
              <button
                onClick={primary.onClick}
                disabled={busy || primary.disabled}
                className="flex-1 py-4 rounded-2xl text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-40 transition"
                style={{ background: primary.disabled ? '#94a3b8' : color }}
              >
                {busy ? <RefreshCw className="w-5 h-5 animate-spin" /> : primary.disabled ? <Clock className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                {primary.label}
              </button>
            ) : (
              <button onClick={props.onMap} className="flex-1 py-4 rounded-2xl text-white font-semibold" style={{ background: color }}>
                Ver detalle
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Chat con el cliente ─────────────────────────────── */

const QUICK_REPLIES = ['Estoy afuera', 'Llego en 5 minutos', 'No encuentro la dirección, ¿me das una referencia?', 'Voy en camino'];

function DriverChatSheet({ clientName, messages, color, onClose, onSend }: {
  clientName: string; messages: any[]; color: string; onClose: () => void; onSend: (t: string) => Promise<boolean>;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);
  const send = async (t: string) => {
    const v = t.trim();
    if (!v || sending) return;
    setSending(true);
    const ok = await onSend(v);
    setSending(false);
    if (ok) setText('');
  };
  const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={`Chat con ${clientName}`}>
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-md h-[85dvh] sm:h-[640px] bg-white rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{initials(clientName)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{clientName}</p>
            <p className="text-xs text-slate-500">Chat dentro de Citiox · solo durante esta entrega</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-4 space-y-2">
          {messages.length === 0 && <p className="text-center text-sm text-slate-500 py-8 px-6">Escríbele al cliente si necesitas una indicación. Si no tiene la página abierta, le avisamos por WhatsApp.</p>}
          {messages.map((m) => m.de === 'SISTEMA' ? (
            <p key={m.id} className="text-center text-xs text-slate-500 py-1">{m.texto} · {hhmm(m.at)}</p>
          ) : (
            <div key={m.id} className={`flex ${m.de === 'REPARTIDOR' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-[15px] leading-snug ${m.de === 'REPARTIDOR' ? 'text-white rounded-br-md' : 'bg-white ring-1 ring-slate-200 text-slate-900 rounded-bl-md'}`} style={m.de === 'REPARTIDOR' ? { background: color } : undefined}>
                <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                <p className={`text-[11px] mt-0.5 text-right ${m.de === 'REPARTIDOR' ? 'text-white/75' : 'text-slate-400'}`}>{hhmm(m.at)}</p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-3 pt-2" style={{ scrollbarWidth: 'none' }}>
          {QUICK_REPLIES.map((q) => (
            <button key={q} onClick={() => send(q)} disabled={sending} className="shrink-0 px-3 py-1.5 rounded-full ring-1 ring-slate-200 text-xs font-semibold text-slate-700 bg-white">{q}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2 items-end">
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} rows={1} placeholder="Escribe un mensaje"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }}
            className="flex-1 min-h-11 max-h-28 resize-none rounded-2xl bg-slate-100 px-4 py-2.5 text-base outline-none focus:bg-white focus:ring-2 focus:ring-slate-200" />
          <button type="submit" disabled={!text.trim() || sending} className="w-11 h-11 shrink-0 rounded-full text-white flex items-center justify-center disabled:opacity-40" style={{ background: color }} aria-label="Enviar">
            {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
