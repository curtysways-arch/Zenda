'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X, Plus, Minus, Trash2, Camera, CheckCircle2, AlertCircle, Loader2, ChevronLeft, ChevronDown, Info,
  ShieldCheck, MapPin, Map as MapIcon, Pencil, Check, ArrowRight, Clock,
} from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';
import MapSelectionModal from '@/components/public/MapSelectionModal';
import { calculateDeliveryCost } from '@/core/delivery/DeliveryPricing';

export interface ArticleItem {
  id: string;
  tipo: string;
  variante: string;
  cantidad: number;
  servicioId?: string;
  servicioNombre: string;
  precioUnitario: number;
  requiereEvaluacion: boolean;
  extras: { id: string; nombre: string; precio: number }[];
  observaciones: string;
  fotos: string[]; // Base64 data URLs
}

export interface UniversalServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  negocio: any;
  initialServiceId?: string;
  initialServiceName?: string;
  onSuccess?: (orderData: any) => void;
}

const ARTICLE_TYPES = [
  { id: 'Zapatos', label: 'Zapatos', unit: ['par', 'pares'] },
  { id: 'Botas', label: 'Botas', unit: ['par', 'pares'] },
  { id: 'Mochilas', label: 'Mochila', unit: ['mochila', 'mochilas'] },
  { id: 'Gorras', label: 'Gorra', unit: ['gorra', 'gorras'] },
  { id: 'Bolsos', label: 'Bolso', unit: ['bolso', 'bolsos'] },
  { id: 'Prendas', label: 'Prenda', unit: ['prenda', 'prendas'] },
  { id: 'Otros', label: 'Otro', unit: ['artículo', 'artículos'] },
];

// `label` se guarda en el pedido tal como antes; `short` es lo que ve el cliente.
const TIME_SLOTS = [
  { id: '09-11', label: '09:00 - 11:00 AM', short: '9:00 – 11:00', part: 'Mañana', startHour: 9 },
  { id: '11-13', label: '11:00 AM - 01:00 PM', short: '11:00 – 13:00', part: 'Mediodía', startHour: 11 },
  { id: '14-16', label: '02:00 - 04:00 PM', short: '14:00 – 16:00', part: 'Tarde', startHour: 14 },
  { id: '16-18', label: '04:00 - 06:00 PM', short: '16:00 – 18:00', part: 'Tarde', startHour: 16 },
];

const DAYS = [
  { id: 'HOY', label: 'Hoy', offset: 0 },
  { id: 'MANANA', label: 'Mañana', offset: 1 },
  { id: 'PASADO', label: 'Pasado mañana', offset: 2 },
] as const;
type DayId = typeof DAYS[number]['id'];

const STEPS = [
  { n: 1, label: 'Qué lavamos', title: '¿Qué vamos a lavar?' },
  { n: 2, label: 'Retiro', title: '¿Dónde y cuándo pasamos?' },
  { n: 3, label: 'Confirmar', title: 'Revisa y confirma' },
] as const;

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

function readableInk(hex: string) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#0f172a' : '#ffffff';
}

/** Reduce la foto antes de enviarla (las del celular pesan varios MB). */
function compressImage(file: File, max = 1400, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(String(reader.result));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function dayDate(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric' }).replace('.', '');
}

const inputCls = (error?: string) =>
  `w-full rounded-xl border bg-white px-3.5 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    error ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-[var(--acc)] focus:ring-[color-mix(in_srgb,var(--acc)_15%,transparent)]'
  }`;

function FieldError({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-rose-600" role="alert">
      <AlertCircle size={14} className="shrink-0" /> {text}
    </p>
  );
}

/**
 * Solicitud de retiro a domicilio (lavandería y cuidado de calzado) en 3 pasos:
 * 1. Qué lavamos (artículos, servicio, extras, fotos)  2. Dirección y horario  3. Contacto, revisión y envío.
 * El total estimado se ve siempre abajo. En celular ocupa toda la pantalla.
 */
export default function UniversalServiceRequestModal({
  isOpen,
  onClose,
  negocio,
  initialServiceId,
  initialServiceName,
  onSuccess,
}: UniversalServiceRequestModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const bodyRef = useRef<HTMLDivElement>(null);

  const [formCliente, setFormCliente] = useState({ nombre: '', telefono: '', direccion: '', referencia: '', modo: 'DOMICILIO' as const });
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [selectedDayOption, setSelectedDayOption] = useState<DayId>('MANANA');
  const [selectedSlot, setSelectedSlot] = useState<string>('14-16');
  const [showMapModal, setShowMapModal] = useState(false);

  // Sesión y verificación por WhatsApp
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  const [showOtpView, setShowOtpView] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState(60);

  const accent = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(negocio?.colorPrimario || '').trim()) ? String(negocio.colorPrimario).trim() : '#7c3aed';
  const accentInk = readableInk(accent);

  useEffect(() => {
    if (!showOtpView || otpCountdown <= 0) return;
    const t = setInterval(() => setOtpCountdown((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [showOtpView, otpCountdown]);

  // Servicios reales del catálogo del negocio
  const businessServices = useMemo(() => {
    if (Array.isArray(negocio?.services) && negocio.services.length > 0) return negocio.services;
    return [{ id: 'srv_std', nombre: 'Limpieza Estándar', precio: 6.0, extras: [] }];
  }, [negocio]);

  const newArticle = useCallback((n: number, serviceId?: string, serviceName?: string): ArticleItem => {
    const srv = businessServices.find((s: any) => s.id === serviceId) || businessServices[0];
    return {
      id: `art_${Date.now()}_${n}`,
      tipo: 'Zapatos',
      variante: '',
      cantidad: 1,
      servicioId: srv?.id || serviceId || '',
      servicioNombre: serviceName || srv?.nombre || 'Servicio de limpieza',
      precioUnitario: srv?.precio ? parseFloat(srv.precio) : 0,
      requiereEvaluacion: false,
      extras: [],
      observaciones: '',
      fotos: [],
    };
  }, [businessServices]);

  const [articulos, setArticulos] = useState<ArticleItem[]>(() => [newArticle(1, initialServiceId, initialServiceName)]);
  const [openArticle, setOpenArticle] = useState<string>(() => '');
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
  useEffect(() => { if (!openArticle && articulos[0]) setOpenArticle(articulos[0].id); }, [openArticle, articulos]);

  // Cargar la sesión del cliente si ya ingresó antes
  useEffect(() => {
    if (!negocio?.slug) return;
    fetch(`/api/${negocio.slug}/perfil`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && (data.nombre || data.telefono)) {
          setIsCustomerLoggedIn(true);
          setFormCliente((prev) => ({ ...prev, nombre: data.nombre || prev.nombre, telefono: data.telefono || prev.telefono, direccion: data.direccion || prev.direccion }));
        }
      })
      .catch(() => {});
  }, [negocio?.slug]);

  // Costo de retiro + entrega según la distancia (ida y vuelta)
  const costoEnvioCalculado = useMemo(() => {
    let cfg: Record<string, any> = {};
    if (negocio?.configuracion) {
      if (typeof negocio.configuracion === 'string') { try { cfg = JSON.parse(negocio.configuracion); } catch { /* */ } }
      else cfg = negocio.configuracion;
    }
    const baseCost = cfg.costoEnvio !== undefined ? parseFloat(cfg.costoEnvio) : 1.5;
    if (coords.lat && coords.lng) {
      const latN = cfg.latitudNegocio ? parseFloat(cfg.latitudNegocio) : (negocio?.latitud || -0.180653);
      const lngN = cfg.longitudNegocio ? parseFloat(cfg.longitudNegocio) : (negocio?.longitud || -78.467838);
      const perKm = cfg.costoEnvioPorKm !== undefined ? parseFloat(cfg.costoEnvioPorKm) : 0.3;
      return calculateDeliveryCost(latN, lngN, coords.lat, coords.lng, { enabled: true, baseCost, costPerKm: perKm, tipoNegocio: 'LAVANDERIA', isRoundTrip: true }).deliveryCost;
    }
    return Math.round(baseCost * 2 * 100) / 100;
  }, [coords.lat, coords.lng, negocio]);
  const costoPorViaje = Math.round((costoEnvioCalculado / 2) * 100) / 100;

  const isSlotDisabled = useCallback((slot: typeof TIME_SLOTS[0], day: DayId = selectedDayOption) => {
    if (day !== 'HOY') return false;
    return new Date().getHours() >= slot.startHour;
  }, [selectedDayOption]);
  const todayAvailable = TIME_SLOTS.some((s) => isSlotDisabled(s, 'HOY') === false);

  useEffect(() => {
    if (isSlotDisabled(TIME_SLOTS.find((s) => s.id === selectedSlot) || TIME_SLOTS[0])) {
      const avail = TIME_SLOTS.find((s) => !isSlotDisabled(s));
      if (avail) setSelectedSlot(avail.id);
    }
  }, [selectedDayOption, selectedSlot, isSlotDisabled]);

  const getServiceExtras = (srvId?: string) => {
    const s = businessServices.find((x: any) => x.id === srvId);
    if (!s) return [];
    if (Array.isArray(s.extras)) return s.extras;
    if (Array.isArray(s.extraInfo?.extras)) return s.extraInfo.extras;
    return [];
  };
  const serviceDescription = (s: any) => s?.descripcion || s?.extraInfo?.descripcion || '';

  const handleAddArticle = () => {
    const a = newArticle(articulos.length + 1);
    setArticulos((prev) => [...prev, a]);
    setOpenArticle(a.id);
    setTimeout(() => document.getElementById(`articulo-${a.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleRemoveArticle = (id: string) => {
    if (articulos.length === 1) return;
    setArticulos((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (openArticle === id && next[0]) setOpenArticle(next[next.length - 1].id);
      return next;
    });
  };

  const updateArticle = (id: string, field: keyof ArticleItem, value: any) => {
    setArticulos((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      const updated = { ...a, [field]: value };
      if (field === 'servicioId') {
        const found = businessServices.find((s: any) => s.id === value);
        if (found) {
          updated.servicioNombre = found.nombre;
          updated.precioUnitario = found.precio ? parseFloat(found.precio) : 0;
          updated.extras = [];
        }
      }
      return updated;
    }));
    setErrors((e) => { const n = { ...e }; delete n.articulos; return n; });
  };

  const handleFileUpload = async (artId: string, files: FileList | null) => {
    if (!files?.length) return;
    const images = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 6);
    const data = await Promise.all(images.map((f) => compressImage(f).catch(() => null)));
    const ok = data.filter(Boolean) as string[];
    setArticulos((prev) => prev.map((a) => (a.id === artId ? { ...a, fotos: [...a.fotos, ...ok].slice(0, 8) } : a)));
  };

  const handleRemovePhoto = (artId: string, idx: number) => {
    setArticulos((prev) => prev.map((a) => (a.id === artId ? { ...a, fotos: a.fotos.filter((_, i) => i !== idx) } : a)));
  };

  const tieneEvaluacion = useMemo(() => articulos.some((a) => a.requiereEvaluacion || a.precioUnitario === 0), [articulos]);
  const itemTotal = (a: ArticleItem) => (a.precioUnitario + a.extras.reduce((s, e) => s + (e.precio || 0), 0)) * a.cantidad;
  const subtotalServicios = useMemo(() => articulos.reduce((s, a) => s + itemTotal(a), 0), [articulos]);
  const totalEstimado = subtotalServicios + costoEnvioCalculado;
  const totalArticulosCantidad = useMemo(() => articulos.reduce((s, a) => s + a.cantidad, 0), [articulos]);

  const dayLabel = DAYS.find((d) => d.id === selectedDayOption)?.label || 'Mañana';
  const slotObj = TIME_SLOTS.find((s) => s.id === selectedSlot);

  // ── Validaciones ───────────────────────────────────────────────
  const checkArticles = () => {
    const e: Record<string, string> = {};
    if (!articulos.length) e.articulos = 'Agrega al menos un artículo.';
    articulos.forEach((a, i) => {
      if (!a.servicioId) e.articulos = `Elige el servicio del artículo ${i + 1}.`;
      if (a.cantidad <= 0) e.articulos = `La cantidad del artículo ${i + 1} debe ser al menos 1.`;
    });
    return e;
  };
  const checkPickup = () => {
    const e: Record<string, string> = {};
    if (!formCliente.direccion.trim()) e.direccion = 'Escribe la dirección o márcala en el mapa.';
    if (!formCliente.referencia.trim()) e.referencia = 'Agrega una referencia para que el repartidor te encuentre.';
    if (!slotObj || isSlotDisabled(slotObj)) e.slot = 'Elige un horario disponible.';
    return e;
  };
  const checkContact = () => {
    const e: Record<string, string> = {};
    if (!formCliente.nombre.trim()) e.nombre = 'Escribe tu nombre.';
    if (!formCliente.telefono.trim()) e.telefono = 'Escribe tu número de WhatsApp.';
    return e;
  };

  const scrollTop = () => bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const goTo = (n: 1 | 2 | 3) => { setStep(n); setErrors({}); scrollTop(); };

  const handleNext = () => {
    const e = step === 1 ? checkArticles() : checkPickup();
    setErrors(e);
    if (Object.keys(e).length) {
      setTimeout(() => bodyRef.current?.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30);
      return;
    }
    goTo((step + 1) as 2 | 3);
  };

  const hasData = Boolean(formCliente.direccion || formCliente.referencia || articulos.some((a) => a.fotos.length || a.observaciones) || articulos.length > 1 || step > 1);
  const handleAttemptClose = useCallback(() => {
    if (hasData && !successOrder) setShowExitConfirm(true);
    else onClose();
  }, [hasData, successOrder, onClose]);

  // Esc cierra (pidiendo confirmación si hay datos) y se bloquea el scroll de la página.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || showMapModal) return;
      if (showExitConfirm) setShowExitConfirm(false);
      else handleAttemptClose();
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [isOpen, showMapModal, showExitConfirm, handleAttemptClose]);

  // ── Envío ──────────────────────────────────────────────────────
  const executeOrderSubmission = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        negocioId: negocio?.id || 'sneaker-wash-id',
        modo: 'DOMICILIO',
        nombreCliente: formCliente.nombre,
        telefonoCliente: formCliente.telefono,
        direccionCliente: formCliente.direccion,
        referenciaCliente: formCliente.referencia,
        latitud: coords.lat,
        longitud: coords.lng,
        fechaHoraRetiro: `${selectedDayOption === 'HOY' ? 'Hoy' : selectedDayOption === 'MANANA' ? 'Mañana' : 'Pasado mañana'} (${slotObj?.label || selectedSlot})`,
        cantidadPares: totalArticulosCantidad.toString(),
        subtotal: subtotalServicios,
        costoEnvio: costoEnvioCalculado,
        total: totalEstimado,
        articulos: articulos.map((a) => ({
          tipo: a.tipo,
          variante: a.variante || 'Estándar',
          cantidad: a.cantidad,
          servicioId: a.servicioId,
          servicioNombre: a.servicioNombre,
          precioUnitario: a.precioUnitario,
          extras: a.extras.map((e) => e.nombre),
          observaciones: a.observaciones,
          fotos: a.fotos,
        })),
        requiereConfirmacionPrecio: true,
      };
      const res = await fetch('/api/shoe-care/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const orderData = await res.json();
        setSuccessOrder(orderData);
        onSuccess?.(orderData);
      } else {
        const err = await res.json().catch(() => ({}));
        setSubmitError(err.error || 'No pudimos registrar tu solicitud. Intenta de nuevo.');
      }
    } catch {
      setSubmitError('No hay conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async () => {
    setOtpLoading(true);
    setOtpError(null);
    setSubmitError(null);
    try {
      const res = await fetch('/api/public/auth/otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp', phone: formCliente.telefono, slug: negocio?.slug || 'lavado' }),
      });
      const data = await res.json();
      if (data.success) { setShowOtpView(true); setOtpInput(''); setOtpCountdown(60); }
      else setSubmitError(data.error || 'No pudimos enviar el código a tu WhatsApp. Revisa el número.');
    } catch {
      setSubmitError('No hay conexión para enviar el código. Intenta de nuevo.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtpAndSubmit = async () => {
    if (otpInput.trim().length < 6) { setOtpError('Escribe los 6 dígitos del código.'); return; }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await fetch('/api/public/auth/otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', phone: formCliente.telefono, code: otpInput.trim(), slug: negocio?.slug || 'lavado' }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCustomerLoggedIn(true);
        setShowOtpView(false);
        await executeOrderSubmission();
      } else {
        setOtpError(data.error || 'El código no es correcto o ya venció.');
      }
    } catch {
      setOtpError('No hay conexión para validar el código.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleConfirmSubmit = async () => {
    const eA = checkArticles();
    if (Object.keys(eA).length) { setErrors(eA); setStep(1); return; }
    const eP = checkPickup();
    if (Object.keys(eP).length) { setErrors(eP); setStep(2); return; }
    const eC = isCustomerLoggedIn ? {} : checkContact();
    setErrors(eC);
    if (Object.keys(eC).length) return;
    if (!isCustomerLoggedIn) { await handleRequestOtp(); return; }
    await executeOrderSubmission();
  };

  if (!isOpen) return null;

  const busy = submitting || otpLoading;
  const pieces = `${totalArticulosCantidad} ${totalArticulosCantidad === 1 ? 'artículo' : 'artículos'}`;
  const cssVars = { ['--acc' as any]: accent, ['--acc-ink' as any]: accentInk } as React.CSSProperties;
  const primaryBtn = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--acc)] px-6 py-3.5 text-[15px] font-semibold text-[var(--acc-ink)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]';
  const tint = 'bg-[color-mix(in_srgb,var(--acc)_8%,white)]';

  // ── Pantalla: pedido enviado ───────────────────────────────────
  const successView = successOrder && (
    <div className="flex flex-1 flex-col overflow-y-auto px-6 py-10 text-center sm:px-10">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 size={34} />
      </div>
      <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">¡Solicitud enviada!</h2>
      <p className="mt-1 text-sm text-slate-500">Número de solicitud <span className="font-semibold text-slate-800">#{successOrder.numeroPedido || '—'}</span></p>
      <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-slate-600">
        Te escribiremos por WhatsApp para confirmar el retiro de tus {pieces}.
      </p>
      <dl className="mx-auto mt-6 w-full max-w-sm divide-y divide-slate-100 rounded-2xl border border-slate-200 text-left text-sm">
        <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-slate-500">Retiro</dt><dd className="text-right font-medium text-slate-900">{dayLabel}, {slotObj?.short}</dd></div>
        <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-slate-500">Dirección</dt><dd className="text-right font-medium text-slate-900">{formCliente.direccion}</dd></div>
        <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-slate-500">Total estimado</dt><dd className="font-semibold text-slate-900">{money(totalEstimado)}</dd></div>
      </dl>
      <button type="button" onClick={onClose} className={`${primaryBtn} mx-auto mt-8 w-full max-w-sm`}>Entendido</button>
    </div>
  );

  // ── Pantalla: código de WhatsApp ───────────────────────────────
  const otpView = (
    <div className="flex flex-1 flex-col overflow-y-auto px-6 py-8 sm:px-10">
      <button type="button" onClick={() => setShowOtpView(false)} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ChevronLeft size={16} /> Volver
      </button>
      <div className="mt-6 text-center">
        <div className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${tint} text-[var(--acc)]`}><ShieldCheck size={28} /></div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Confirma tu número</h2>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-slate-600">
          Te enviamos un código de 6 dígitos por WhatsApp al <span className="font-semibold text-slate-900">{formCliente.telefono}</span>.
        </p>
        <button type="button" onClick={() => { setShowOtpView(false); setStep(3); }} className="mt-1 text-sm font-medium text-[var(--acc)] underline-offset-2 hover:underline">Cambiar número</button>
      </div>
      <div className="mx-auto mt-6 w-full max-w-xs">
        <label htmlFor="otp" className="sr-only">Código de 6 dígitos</label>
        <input
          id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
          value={otpInput}
          onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, '')); setOtpError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyOtpAndSubmit(); }}
          placeholder="000000"
          className="w-full rounded-2xl border-2 border-slate-200 bg-white py-4 text-center font-mono text-3xl tracking-[0.4em] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[var(--acc)]"
        />
        {otpError && <FieldError text={otpError} />}
        <button type="button" disabled={busy || otpInput.length < 6} onClick={handleVerifyOtpAndSubmit} className={`${primaryBtn} mt-4 w-full`}>
          {busy ? <><Loader2 className="animate-spin" size={18} /> Confirmando…</> : <>Confirmar solicitud</>}
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">
          {otpCountdown > 0 ? `¿No llegó? Puedes pedir otro en ${otpCountdown} s` : (
            <button type="button" onClick={handleRequestOtp} disabled={otpLoading} className="font-medium text-[var(--acc)] underline-offset-2 hover:underline">Enviar otro código</button>
          )}
        </p>
      </div>
    </div>
  );

  // ── Paso 1: artículos ──────────────────────────────────────────
  const stepArticles = (
    <div className="space-y-3">
      {articulos.map((art, index) => {
        const open = openArticle === art.id;
        const extras = getServiceExtras(art.servicioId);
        const type = ARTICLE_TYPES.find((t) => t.id === art.tipo) || ARTICLE_TYPES[0];
        const unit = art.cantidad === 1 ? type.unit[0] : type.unit[1];

        if (!open) {
          return (
            <button key={art.id} id={`articulo-${art.id}`} type="button" onClick={() => setOpenArticle(art.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tint} text-sm font-semibold text-[var(--acc)]`}>{art.cantidad}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900">{type.label}{art.variante ? ` · ${art.variante}` : ''}</span>
                <span className="block truncate text-sm text-slate-500">{art.servicioNombre}{art.extras.length ? ` + ${art.extras.length} extra${art.extras.length > 1 ? 's' : ''}` : ''}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-semibold text-slate-900">{art.precioUnitario ? money(itemTotal(art)) : 'A cotizar'}</span>
                <span className="text-sm text-[var(--acc)]">Editar</span>
              </span>
            </button>
          );
        }

        return (
          <section key={art.id} id={`articulo-${art.id}`} className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-label={`Artículo ${index + 1}`}>
            {articulos.length > 1 && (
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Artículo {index + 1}</span>
                <button type="button" onClick={() => handleRemoveArticle(art.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 size={15} /> Quitar
                </button>
              </div>
            )}

            {/* Tipo */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-900">¿Qué es?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {ARTICLE_TYPES.map((t) => {
                  const on = art.tipo === t.id;
                  return (
                    <button key={t.id} type="button" aria-pressed={on} onClick={() => updateArticle(art.id, 'tipo', t.id)}
                      className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${on ? 'border-[var(--acc)] bg-[var(--acc)] text-[var(--acc-ink)]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Cantidad */}
            <div className="mt-5 flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-900">¿Cuántos?</span>
              <div className="flex items-center rounded-xl border border-slate-200">
                <button type="button" aria-label="Quitar uno" disabled={art.cantidad <= 1} onClick={() => updateArticle(art.id, 'cantidad', Math.max(1, art.cantidad - 1))}
                  className="flex size-11 items-center justify-center text-slate-600 transition hover:text-slate-900 disabled:opacity-30"><Minus size={18} /></button>
                <span className="min-w-[5.5rem] text-center text-[15px] font-semibold text-slate-900" aria-live="polite">{art.cantidad} {unit}</span>
                <button type="button" aria-label="Agregar uno" onClick={() => updateArticle(art.id, 'cantidad', Math.min(50, art.cantidad + 1))}
                  className="flex size-11 items-center justify-center text-slate-600 transition hover:text-slate-900"><Plus size={18} /></button>
              </div>
            </div>

            {/* Servicio */}
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-slate-900">Servicio</legend>
              <div className="mt-2 space-y-2">
                {businessServices.map((s: any) => {
                  const on = art.servicioId === s.id;
                  const desc = serviceDescription(s);
                  const price = s.precio ? parseFloat(s.precio) : 0;
                  return (
                    <label key={s.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${on ? `border-[var(--acc)] ${tint} ring-1 ring-[var(--acc)]` : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name={`srv-${art.id}`} checked={on} onChange={() => updateArticle(art.id, 'servicioId', s.id)} className="mt-1 size-4 accent-[var(--acc)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-slate-900">{s.nombre}</span>
                        {desc && <span className="mt-0.5 block text-sm leading-snug text-slate-500">{desc}</span>}
                      </span>
                      <span className="shrink-0 font-semibold text-slate-900">{price ? money(price) : <span className="text-sm font-medium text-slate-500">A cotizar</span>}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Extras */}
            {extras.length > 0 && (
              <fieldset className="mt-5">
                <legend className="text-sm font-semibold text-slate-900">Extras <span className="font-normal text-slate-500">(opcional)</span></legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {extras.map((ex: any) => {
                    const exId = ex.id || ex.nombre;
                    const on = art.extras.some((e) => e.id === exId);
                    return (
                      <button key={exId} type="button" aria-pressed={on}
                        onClick={() => updateArticle(art.id, 'extras', on ? art.extras.filter((e) => e.id !== exId) : [...art.extras, { id: exId, nombre: ex.nombre || ex.label, precio: parseFloat(ex.precio || 0) }])}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition ${on ? `border-[var(--acc)] ${tint} font-medium text-slate-900` : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                        {on && <Check size={14} className="text-[var(--acc)]" />}
                        {ex.nombre || ex.label}
                        <span className="text-slate-500">+{money(ex.precio)}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Detalles y fotos (opcional) */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setDetailsOpen((d) => ({ ...d, [art.id]: !d[art.id] }))} aria-expanded={!!detailsOpen[art.id]}
                className="flex w-full items-center justify-between text-left">
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Fotos y detalles <span className="font-normal text-slate-500">(opcional)</span></span>
                  <span className="block text-sm text-slate-500">
                    {art.fotos.length || art.observaciones || art.variante
                      ? [art.fotos.length && `${art.fotos.length} foto${art.fotos.length > 1 ? 's' : ''}`, art.variante, art.observaciones && 'con nota'].filter(Boolean).join(' · ')
                      : 'Nos ayudan a darte un precio más exacto'}
                  </span>
                </span>
                <ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${detailsOpen[art.id] ? 'rotate-180' : ''}`} />
              </button>
              {detailsOpen[art.id] && (
                <div className="mt-4 space-y-4">
                  <div>
                    <span className="text-sm font-medium text-slate-700">Fotos</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {art.fotos.map((src, i) => (
                        <div key={i} className="relative size-20 overflow-hidden rounded-xl border border-slate-200">
                          <img src={src} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                          <button type="button" onClick={() => handleRemovePhoto(art.id, i)} aria-label="Quitar foto"
                            className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-slate-900/75 text-white hover:bg-rose-600"><X size={13} /></button>
                        </div>
                      ))}
                      {art.fotos.length < 8 && (
                        <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 text-slate-500 transition hover:border-[var(--acc)] hover:text-[var(--acc)]">
                          <Camera size={20} />
                          <span className="text-xs font-medium">Agregar</span>
                          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { handleFileUpload(art.id, e.target.files); e.target.value = ''; }} />
                        </label>
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`var-${art.id}`} className="text-sm font-medium text-slate-700">Material o modelo</label>
                    <input id={`var-${art.id}`} value={art.variante} onChange={(e) => updateArticle(art.id, 'variante', e.target.value)} placeholder="Ej. sneakers blancos, gamuza, cuero" className={`${inputCls()} mt-1.5`} />
                  </div>
                  <div>
                    <label htmlFor={`obs-${art.id}`} className="text-sm font-medium text-slate-700">¿Algo que debamos saber?</label>
                    <textarea id={`obs-${art.id}`} rows={2} value={art.observaciones} onChange={(e) => updateArticle(art.id, 'observaciones', e.target.value)} placeholder="Ej. mancha en la punta, suela despegada" className={`${inputCls()} mt-1.5 resize-none`} />
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}

      <FieldError text={errors.articulos} />

      <button type="button" onClick={handleAddArticle}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-3.5 text-[15px] font-medium text-slate-700 transition hover:border-[var(--acc)] hover:text-[var(--acc)]">
        <Plus size={18} /> Agregar otro artículo
      </button>
    </div>
  );

  // ── Paso 2: dirección y horario ────────────────────────────────
  const stepPickup = (
    <div className="space-y-7">
      <section aria-labelledby="dir-title">
        <h3 id="dir-title" className="text-base font-semibold text-slate-900">Dirección de retiro</h3>
        {coords.lat && coords.lng ? (
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
            <MapPin size={20} className="mt-0.5 shrink-0 text-emerald-600" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-medium text-slate-900">Ubicación marcada en el mapa</span>
              <span className="block text-slate-600">El envío se calculó con tu ubicación exacta.</span>
            </span>
            <button type="button" onClick={() => setShowMapModal(true)} className="shrink-0 text-sm font-medium text-[var(--acc)]">Cambiar</button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowMapModal(true)}
            className={`mt-3 flex w-full items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--acc)_35%,white)] ${tint} p-4 text-left transition hover:brightness-[0.98]`}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--acc)] text-[var(--acc-ink)]"><MapIcon size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-900">Marcar mi ubicación en el mapa</span>
              <span className="block text-sm text-slate-600">Así el repartidor llega directo y el envío es exacto.</span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-[var(--acc)]" />
          </button>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="dir" className="text-sm font-medium text-slate-700">Dirección</label>
            <input id="dir" autoComplete="street-address" value={formCliente.direccion}
              onChange={(e) => { setFormCliente({ ...formCliente, direccion: e.target.value }); setErrors((x) => { const n = { ...x }; delete n.direccion; return n; }); }}
              placeholder="Ej. Av. Amazonas N23-45 y Colón" className={`${inputCls(errors.direccion)} mt-1.5`} aria-invalid={!!errors.direccion} />
            <FieldError text={errors.direccion} />
          </div>
          <div>
            <label htmlFor="ref" className="text-sm font-medium text-slate-700">Referencia</label>
            <input id="ref" value={formCliente.referencia}
              onChange={(e) => { setFormCliente({ ...formCliente, referencia: e.target.value }); setErrors((x) => { const n = { ...x }; delete n.referencia; return n; }); }}
              placeholder="Ej. casa blanca de 2 pisos junto a la farmacia" className={`${inputCls(errors.referencia)} mt-1.5`} aria-invalid={!!errors.referencia} />
            <FieldError text={errors.referencia} />
          </div>
        </div>
      </section>

      <section aria-labelledby="hora-title">
        <h3 id="hora-title" className="text-base font-semibold text-slate-900">¿Cuándo pasamos?</h3>
        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Día">
          {DAYS.map((d) => {
            const on = selectedDayOption === d.id;
            const disabled = d.id === 'HOY' && !todayAvailable;
            return (
              <button key={d.id} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => setSelectedDayOption(d.id)}
                className={`rounded-xl border px-2 py-2.5 text-center transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? 'border-[var(--acc)] bg-[var(--acc)] text-[var(--acc-ink)]' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                <span className="block text-sm font-semibold leading-tight">{d.label}</span>
                <span className={`block text-xs capitalize ${on ? 'opacity-85' : 'text-slate-500'}`}>{disabled ? 'sin horarios' : dayDate(d.offset)}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Horario">
          {TIME_SLOTS.map((slot) => {
            const disabled = isSlotDisabled(slot);
            const on = selectedSlot === slot.id && !disabled;
            return (
              <button key={slot.id} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => { setSelectedSlot(slot.id); setErrors((x) => { const n = { ...x }; delete n.slot; return n; }); }}
                className={`rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? `border-[var(--acc)] ${tint} ring-1 ring-[var(--acc)]` : 'border-slate-200 hover:border-slate-300'}`}>
                <span className="block text-xs text-slate-500">{slot.part}</span>
                <span className="block text-sm font-semibold text-slate-900">{slot.short}</span>
              </button>
            );
          })}
        </div>
        <FieldError text={errors.slot} />
      </section>

      <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-600">
        <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
        <span>
          Envío ida y vuelta: <strong className="font-semibold text-slate-900">{money(costoEnvioCalculado)}</strong> (retiro {money(costoPorViaje)} + entrega {money(costoPorViaje)}).
          {!coords.lat && ' Es un estimado: se ajusta al marcar tu ubicación.'}
        </span>
      </p>
    </div>
  );

  // ── Paso 3: contacto y revisión ────────────────────────────────
  const stepConfirm = (
    <div className="space-y-6">
      <section aria-labelledby="contacto-title">
        <h3 id="contacto-title" className="text-base font-semibold text-slate-900">Tus datos</h3>
        {isCustomerLoggedIn && formCliente.nombre ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5">
            <span className="flex size-10 items-center justify-center rounded-full bg-[var(--acc)] font-semibold text-[var(--acc-ink)]">{formCliente.nombre.charAt(0).toUpperCase()}</span>
            <span className="min-w-0 text-sm">
              <span className="block font-medium text-slate-900">{formCliente.nombre}</span>
              <span className="block text-slate-500">{formCliente.telefono}</span>
            </span>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div>
              <label htmlFor="nombre" className="text-sm font-medium text-slate-700">Nombre</label>
              <input id="nombre" autoComplete="name" value={formCliente.nombre}
                onChange={(e) => { setFormCliente({ ...formCliente, nombre: e.target.value }); setErrors((x) => { const n = { ...x }; delete n.nombre; return n; }); }}
                placeholder="Tu nombre y apellido" className={`${inputCls(errors.nombre)} mt-1.5`} aria-invalid={!!errors.nombre} />
              <FieldError text={errors.nombre} />
            </div>
            <div>
              <label htmlFor="tel-wa" className="mb-1.5 block text-sm font-medium text-slate-700">WhatsApp</label>
              <PhoneInput id="tel-wa" value={formCliente.telefono} onChange={(val: string) => { setFormCliente({ ...formCliente, telefono: val }); setErrors((x) => { const n = { ...x }; delete n.telefono; return n; }); }}
                placeholder="Número de celular" required />
              <FieldError text={errors.telefono} />
              <p className="mt-1.5 text-sm text-slate-500">Te enviaremos un código por WhatsApp para confirmar.</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200" aria-label="Resumen">
        <div className="flex items-start justify-between gap-3 p-4">
          <span className="min-w-0 text-sm">
            <span className="block font-semibold text-slate-900">Retiro {dayLabel.toLowerCase()}, {slotObj?.short}</span>
            <span className="mt-0.5 block text-slate-600">{formCliente.direccion}</span>
            {formCliente.referencia && <span className="block text-slate-500">{formCliente.referencia}</span>}
          </span>
          <button type="button" onClick={() => goTo(2)} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--acc)]"><Pencil size={14} /> Cambiar</button>
        </div>
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-900">{pieces}</span>
            <button type="button" onClick={() => goTo(1)} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--acc)]"><Pencil size={14} /> Cambiar</button>
          </div>
          <ul className="mt-2 space-y-2">
            {articulos.map((a) => {
              const t = ARTICLE_TYPES.find((x) => x.id === a.tipo) || ARTICLE_TYPES[0];
              return (
                <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0 text-slate-700">
                    {a.cantidad} × {t.label}{a.variante ? ` (${a.variante})` : ''} · {a.servicioNombre}
                    {a.extras.length > 0 && <span className="block text-slate-500">+ {a.extras.map((e) => e.nombre).join(', ')}</span>}
                  </span>
                  <span className="shrink-0 font-medium text-slate-900">{a.precioUnitario ? money(itemTotal(a)) : 'A cotizar'}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <dl className="space-y-1.5 border-t border-slate-100 p-4 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Servicios</dt><dd className="text-slate-900">{money(subtotalServicios)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Envío ida y vuelta</dt><dd className="text-slate-900">{money(costoEnvioCalculado)}</dd></div>
          <div className="flex items-baseline justify-between border-t border-slate-100 pt-2.5">
            <dt className="font-semibold text-slate-900">Total estimado</dt>
            <dd className="text-xl font-bold text-slate-900">{money(totalEstimado)}</dd>
          </div>
        </dl>
      </section>

      <p className="flex items-start gap-2 text-sm leading-relaxed text-slate-500">
        <Info size={16} className="mt-0.5 shrink-0" />
        {tieneEvaluacion
          ? 'Algunos artículos se cotizan al revisarlos. Te confirmamos el precio final por WhatsApp antes de empezar.'
          : 'El total es un estimado con las tarifas del negocio. Te escribiremos por WhatsApp para coordinar el retiro.'}
      </p>

      {submitError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700" role="alert">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /> {submitError}
        </div>
      )}
    </div>
  );

  const current = STEPS[step - 1];
  const showWizard = !successOrder && !showOtpView;

  return (
    <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" style={cssVars}
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleAttemptClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="usr-title"
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[min(880px,94vh)] sm:max-w-xl sm:rounded-3xl">

        {/* Encabezado */}
        <header className="shrink-0 border-b border-slate-100 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
          <div className="flex items-center gap-2">
            {showWizard && step > 1 ? (
              <button type="button" onClick={() => goTo((step - 1) as 1 | 2)} aria-label="Paso anterior" className="-ml-2 flex size-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100">
                <ChevronLeft size={22} />
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-500">Retiro a domicilio{negocio?.nombre ? ` · ${negocio.nombre}` : ''}</p>
              <h2 id="usr-title" className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {successOrder ? 'Solicitud enviada' : showOtpView ? 'Verificación' : current.title}
              </h2>
            </div>
            <button type="button" onClick={handleAttemptClose} aria-label="Cerrar" className="-mr-2 flex size-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
              <X size={20} />
            </button>
          </div>
          {showWizard && (
            <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="Pasos">
              {STEPS.map((s) => {
                const done = step > s.n;
                const on = step === s.n;
                return (
                  <li key={s.n} aria-current={on ? 'step' : undefined}>
                    <button type="button" disabled={s.n > step} onClick={() => goTo(s.n)} className="w-full text-left disabled:cursor-default">
                      <span className={`block h-1 rounded-full transition-colors ${done || on ? 'bg-[var(--acc)]' : 'bg-slate-200'}`} />
                      <span className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${on ? 'text-slate-900' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                        {done && <Check size={12} className="text-[var(--acc)]" />}{s.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </header>

        {successOrder ? successView : showOtpView ? otpView : (
          <>
            <div ref={bodyRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
              {step === 1 && stepArticles}
              {step === 2 && stepPickup}
              {step === 3 && stepConfirm}
            </div>

            {/* Pie: total siempre visible + acción */}
            <footer className="shrink-0 border-t border-slate-100 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">{pieces} · {step === 1 ? 'servicios' : 'total estimado'}</p>
                  <p className="text-lg font-bold leading-tight text-slate-900">{money(step === 1 ? subtotalServicios : totalEstimado)}{tieneEvaluacion && <span className="text-sm font-medium text-slate-500"> + cotización</span>}</p>
                </div>
                {step < 3 ? (
                  <button type="button" onClick={handleNext} className={primaryBtn}>
                    Continuar <ArrowRight size={18} />
                  </button>
                ) : (
                  <button type="button" onClick={handleConfirmSubmit} disabled={busy} className={primaryBtn}>
                    {busy ? <><Loader2 className="animate-spin" size={18} /> {otpLoading ? 'Enviando código…' : 'Enviando…'}</> : <>Confirmar solicitud</>}
                  </button>
                )}
              </div>
              {step === 2 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><Clock size={13} /> Retiro {dayLabel.toLowerCase()}, {slotObj?.short}</p>
              )}
            </footer>
          </>
        )}

        {/* Confirmar salida */}
        {showExitConfirm && (
          <div className="absolute inset-0 z-30 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center" role="alertdialog" aria-labelledby="exit-title">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
              <h3 id="exit-title" className="text-lg font-semibold text-slate-900">¿Salir sin enviar?</h3>
              <p className="mt-1 text-sm text-slate-600">Se perderá lo que llenaste en esta solicitud.</p>
              <div className="mt-5 flex gap-2">
                <button type="button" autoFocus onClick={() => setShowExitConfirm(false)} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-200">Seguir aquí</button>
                <button type="button" onClick={() => { setShowExitConfirm(false); onClose(); }} className="flex-1 rounded-xl py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">Salir</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <MapSelectionModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLat={coords.lat}
        initialLng={coords.lng}
        initialReference={formCliente.referencia}
        onConfirmLocation={(lat: number, lng: number, address?: string, ref?: string) => {
          setCoords({ lat, lng });
          setFormCliente((prev) => ({ ...prev, direccion: address || prev.direccion, referencia: ref || prev.referencia }));
          setErrors((prev) => {
            const next = { ...prev };
            if (address || formCliente.direccion) delete next.direccion;
            if (ref || formCliente.referencia) delete next.referencia;
            return next;
          });
          setShowMapModal(false);
        }}
      />
    </div>
  );
}
