'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Truck, 
  Plus, 
  Trash2, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ChevronRight,
  ChevronLeft,
  Info,
  Package,
  ShieldCheck,
  MapPin,
  Map as MapIcon,
  Edit3,
  Clock,
  User,
  Phone,
  Check
} from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';
import { isPointInPolygon } from '@/lib/geoUtils';
import MapSelectionModal from '@/components/public/MapSelectionModal';

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
  { id: 'Zapatos', label: 'Zapatos / Sneakers', icon: '👟' },
  { id: 'Botas', label: 'Botas / Botines', icon: '🥾' },
  { id: 'Mochilas', label: 'Mochilas / Morrales', icon: '🎒' },
  { id: 'Gorras', label: 'Gorras / Sombreros', icon: '🧢' },
  { id: 'Bolsos', label: 'Bolsos / Carteras', icon: '👜' },
  { id: 'Prendas', label: 'Prendas / Abrigos', icon: '👕' },
  { id: 'Otros', label: 'Otros Artículos', icon: '📦' },
];

const TIME_SLOTS = [
  { id: '09-11', label: '09:00 - 11:00 AM', icon: '🌅 Mañana', startHour: 9, endHour: 11 },
  { id: '11-13', label: '11:00 AM - 01:00 PM', icon: '☀️ Mediodía', startHour: 11, endHour: 13 },
  { id: '14-16', label: '02:00 - 04:00 PM', icon: '🌤️ Tarde', startHour: 14, endHour: 16 },
  { id: '16-18', label: '04:00 - 06:00 PM', icon: '🌆 Víspera', startHour: 16, endHour: 18 }
];

export default function UniversalServiceRequestModal({
  isOpen,
  onClose,
  negocio,
  initialServiceId,
  initialServiceName,
  onSuccess
}: UniversalServiceRequestModalProps) {
  // Wizard multi-step: 1: Ubicación, 2: Artículos, 3: Revisión, 4: Confirmación
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Datos Cliente & Logística GPS (Exclusivo Retiro a Domicilio)
  const [formCliente, setFormCliente] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    referencia: '',
    modo: 'DOMICILIO' as const
  });

  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [selectedDayOption, setSelectedDayOption] = useState<'HOY' | 'MANANA' | 'PASADO'>('MANANA');
  const [selectedSlot, setSelectedSlot] = useState<string>('14-16');
  const [showMapModal, setShowMapModal] = useState(false);

  // Sesión y Cobertura
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  const [showOtpView, setShowOtpView] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [otpSentSuccess, setOtpSentSuccess] = useState(false);
  const [coveragePolygon, setCoveragePolygon] = useState<Array<[number, number]>>([]);

  // Cuenta regresiva para reenvío de OTP
  useEffect(() => {
    let timer: any;
    if (showOtpView && otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpView, otpCountdown]);

  // Servicios reales del catálogo del negocio
  const businessServices = useMemo(() => {
    if (negocio?.services && Array.isArray(negocio.services) && negocio.services.length > 0) {
      return negocio.services;
    }
    return [
      { id: 'srv_std', nombre: 'Limpieza Estándar', precio: 6.00, extras: [] }
    ];
  }, [negocio]);

  // Artículos Solicitados (Multi-Artículos)
  const defaultService = businessServices[0];

  const [articulos, setArticulos] = useState<ArticleItem[]>([
    {
      id: `art_${Date.now()}_1`,
      tipo: 'Zapatos',
      variante: 'Sneakers',
      cantidad: 1,
      servicioId: initialServiceId || defaultService.id,
      servicioNombre: initialServiceName || defaultService.nombre,
      precioUnitario: defaultService.precio ? parseFloat(defaultService.precio) : 0,
      requiereEvaluacion: false,
      extras: [],
      observaciones: '',
      fotos: []
    }
  ]);

  // Cargar Cobertura oficial del Negocio
  useEffect(() => {
    if (negocio?.id) {
      fetch(`/api/shoe-care/coverage?negocioId=${negocio.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && Array.isArray(data.poligono) && data.poligono.length >= 3) {
            setCoveragePolygon(data.poligono);
          }
        })
        .catch(() => {});
    }
  }, [negocio?.id]);

  // Cargar Sesión de Cliente Activa
  useEffect(() => {
    if (negocio?.slug) {
      fetch(`/api/${negocio.slug}/perfil`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && (data.nombre || data.telefono)) {
            setIsCustomerLoggedIn(true);
            setFormCliente(prev => ({
              ...prev,
              nombre: data.nombre || prev.nombre,
              telefono: data.telefono || prev.telefono,
              direccion: data.direccion || prev.direccion
            }));
          }
        })
        .catch(() => {});
    }
  }, [negocio?.slug]);

  // Validación GPS de Cobertura para Retiro a Domicilio
  const isOutsideCoverage = useMemo(() => {
    if (!coords.lat || !coords.lng || !coveragePolygon || coveragePolygon.length < 3) return false;
    return !isPointInPolygon([coords.lat, coords.lng], coveragePolygon);
  }, [coords.lat, coords.lng, coveragePolygon]);

  // Cálculo Dinámico del Costo de Retiro / Entrega por Distancia GPS (Haversine)
  const costoEnvioCalculado = useMemo(() => {
    let configMap: Record<string, any> = {};
    if (negocio?.configuracion) {
      if (typeof negocio.configuracion === 'string') {
        try { configMap = JSON.parse(negocio.configuracion); } catch {}
      } else {
        configMap = negocio.configuracion;
      }
    }

    const baseCost = configMap.costoEnvio !== undefined ? parseFloat(configMap.costoEnvio) : 1.50;

    if (coords.lat && coords.lng) {
      const latNegocio = configMap.latitudNegocio ? parseFloat(configMap.latitudNegocio) : (negocio?.latitud || -0.180653);
      const lngNegocio = configMap.longitudNegocio ? parseFloat(configMap.longitudNegocio) : (negocio?.longitud || -78.467838);

      const R = 6371; // Radio de la Tierra en km
      const dLat = (coords.lat - latNegocio) * (Math.PI / 180);
      const dLon = (coords.lng - lngNegocio) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(latNegocio * (Math.PI / 180)) * Math.cos(coords.lat * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = R * c;

      const kmCostRate = configMap.costoEnvioPorKm !== undefined ? parseFloat(configMap.costoEnvioPorKm) : 0.30;
      return parseFloat((baseCost + distanceKm * kmCostRate).toFixed(2));
    }

    return baseCost;
  }, [formCliente.modo, coords.lat, coords.lng, negocio]);

  // Horarios pasados para HOY
  const isSlotDisabled = (slot: typeof TIME_SLOTS[0]) => {
    if (selectedDayOption !== 'HOY') return false;
    const currentHour = new Date().getHours();
    return currentHour >= slot.startHour;
  };

  useEffect(() => {
    if (selectedDayOption === 'HOY') {
      const avail = TIME_SLOTS.find(s => !isSlotDisabled(s));
      if (avail) setSelectedSlot(avail.id);
    }
  }, [selectedDayOption]);

  // Obtener extras configurados reales para un servicio específico del negocio
  const getServiceExtrasConfigured = (srvId?: string) => {
    if (!srvId) return [];
    const foundSrv = businessServices.find((s: any) => s.id === srvId);
    if (!foundSrv) return [];
    if (Array.isArray(foundSrv.extras)) return foundSrv.extras;
    if (foundSrv.extraInfo && Array.isArray(foundSrv.extraInfo.extras)) return foundSrv.extraInfo.extras;
    return [];
  };

  // Agregar nuevo artículo
  const handleAddArticle = () => {
    const srv = businessServices[0];
    setArticulos(prev => [
      ...prev,
      {
        id: `art_${Date.now()}_${prev.length + 1}`,
        tipo: 'Zapatos',
        variante: 'Estándar',
        cantidad: 1,
        servicioId: srv?.id || '',
        servicioNombre: srv?.nombre || 'Servicio de Limpieza',
        precioUnitario: srv?.precio ? parseFloat(srv.precio) : 0,
        requiereEvaluacion: false,
        extras: [],
        observaciones: '',
        fotos: []
      }
    ]);
  };

  // Remover artículo
  const handleRemoveArticle = (id: string) => {
    if (articulos.length === 1) return;
    setArticulos(prev => prev.filter(a => a.id !== id));
  };

  // Actualizar artículo individual
  const handleUpdateArticle = (id: string, field: keyof ArticleItem, value: any) => {
    setArticulos(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, [field]: value };
      
      if (field === 'servicioId') {
        const found = businessServices.find((s: any) => s.id === value);
        if (found) {
          updated.servicioNombre = found.nombre;
          updated.precioUnitario = found.precio ? parseFloat(found.precio) : 0;
          updated.extras = []; // Limpiar extras al cambiar de servicio
        }
      }
      return updated;
    }));
  };

  // Subir fotos para un artículo específico
  const handleFileUpload = (artId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setArticulos(prev => prev.map(a => {
            if (a.id !== artId) return a;
            return { ...a, fotos: [...a.fotos, result] };
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Eliminar foto de un artículo
  const handleRemovePhoto = (artId: string, photoIdx: number) => {
    setArticulos(prev => prev.map(a => {
      if (a.id !== artId) return a;
      return { ...a, fotos: a.fotos.filter((_, idx) => idx !== photoIdx) };
    }));
  };

  // Determinar si algún artículo requiere evaluación previa del negocio
  const tieneEvaluacion = useMemo(() => {
    return articulos.some(a => a.requiereEvaluacion || a.precioUnitario === 0);
  }, [articulos]);

  // Subtotal dinámico de servicios + extras seleccionados
  const subtotalServicios = useMemo(() => {
    return articulos.reduce((sum, art) => {
      const extrasCost = art.extras.reduce((eSum, ext) => eSum + (ext.precio || 0), 0);
      return sum + ((art.precioUnitario + extrasCost) * art.cantidad);
    }, 0);
  }, [articulos]);

  const totalEstimado = subtotalServicios + costoEnvioCalculado;
  const totalArticulosCantidad = useMemo(() => {
    return articulos.reduce((sum, a) => sum + a.cantidad, 0);
  }, [articulos]);

  // Validaciones por paso
  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!formCliente.nombre.trim()) errors.nombre = 'El nombre completo es obligatorio';
    if (!formCliente.telefono.trim()) errors.telefono = 'El teléfono WhatsApp es obligatorio';
    if (!formCliente.direccion.trim()) errors.direccion = 'La dirección de retiro es obligatoria';
    if (!formCliente.referencia.trim()) errors.referencia = 'La referencia de ubicación es obligatoria';
    if (isOutsideCoverage) errors.cobertura = 'La ubicación está fuera de la zona de cobertura oficial';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (articulos.length === 0) {
      errors.articulos = 'Debes agregar al menos un artículo para lavar';
    }
    articulos.forEach((art, idx) => {
      if (art.cantidad <= 0) {
        errors[`art_${idx}_cantidad`] = `El artículo #${idx + 1} debe tener cantidad mayor a 0`;
      }
      if (!art.servicioId) {
        errors[`art_${idx}_servicio`] = `Selecciona un servicio para el artículo #${idx + 1}`;
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep((step - 1) as any);
  };

  // Manejo de cierre seguro
  const handleAttemptClose = () => {
    const hasData = formCliente.nombre || formCliente.telefono || formCliente.direccion || articulos.some(a => a.fotos.length > 0 || a.observaciones);
    if (hasData && !successOrder) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  // Ejecuta la creación del pedido en el backend
  const executeOrderSubmission = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const slotObj = TIME_SLOTS.find(s => s.id === selectedSlot);
      const diaTexto = selectedDayOption === 'HOY' ? 'Hoy' : selectedDayOption === 'MANANA' ? 'Mañana' : 'Pasado mañana';
      const fechaHoraRetiroCalculada = `${diaTexto} (${slotObj?.label || selectedSlot})`;

      const payload = {
        negocioId: negocio?.id || 'sneaker-wash-id',
        modo: 'DOMICILIO',
        nombreCliente: formCliente.nombre,
        telefonoCliente: formCliente.telefono,
        direccionCliente: formCliente.direccion,
        referenciaCliente: formCliente.referencia,
        latitud: coords.lat,
        longitud: coords.lng,
        fechaHoraRetiro: fechaHoraRetiroCalculada,
        cantidadPares: totalArticulosCantidad.toString(),
        subtotal: subtotalServicios,
        costoEnvio: costoEnvioCalculado,
        total: totalEstimado,
        articulos: articulos.map(a => ({
          tipo: a.tipo,
          variante: a.variante,
          cantidad: a.cantidad,
          servicioId: a.servicioId,
          servicioNombre: a.servicioNombre,
          precioUnitario: a.precioUnitario,
          extras: a.extras.map(e => e.nombre),
          observaciones: a.observaciones,
          fotos: a.fotos
        })),
        requiereConfirmacionPrecio: true
      };

      const res = await fetch('/api/shoe-care/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const orderData = await res.json();
        setSuccessOrder(orderData);
        if (onSuccess) onSuccess(orderData);
      } else {
        const errData = await res.json().catch(() => ({}));
        setSubmitError(errData.error || 'No pudimos registrar tu solicitud. Intenta nuevamente.');
      }
    } catch (err: any) {
      console.error('Error enviando solicitud:', err);
      setSubmitError('Ocurrió un error de conexión al enviar la solicitud. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Solicitar envío de OTP por WhatsApp
  const handleRequestOtp = async () => {
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await fetch('/api/public/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          phone: formCliente.telefono,
          slug: negocio?.slug || 'lavado'
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowOtpView(true);
        setOtpSentSuccess(true);
        setOtpCountdown(60);
      } else {
        setSubmitError(data.error || 'No se pudo enviar el código OTP a tu WhatsApp. Verifica tu número.');
      }
    } catch (err) {
      setSubmitError('Error de conexión al enviar el código de verificación.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Verificar OTP e Iniciar Sesión + Enviar Pedido
  const handleVerifyOtpAndSubmit = async () => {
    if (!otpInput || otpInput.trim().length < 6) {
      setOtpError('Por favor ingresa el código completo de 6 dígitos.');
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      const res = await fetch('/api/public/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          phone: formCliente.telefono,
          code: otpInput.trim(),
          slug: negocio?.slug || 'lavado'
        })
      });

      const data = await res.json();
      if (data.success) {
        // Sesión confirmada exitosamente con cookies customer_token y cs=1
        setIsCustomerLoggedIn(true);
        setShowOtpView(false);
        // Crear la orden inmediatamente
        await executeOrderSubmission();
      } else {
        setOtpError(data.error || 'El código ingresado es incorrecto o ha expirado.');
      }
    } catch (err) {
      setOtpError('Error de red al validar el código OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Al presionar Confirmar Solicitud:
  // Si no está logueado, solicita OTP. Si ya está logueado, crea la orden directamente.
  const handleConfirmSubmit = async () => {
    if (!validateStep1() || !validateStep2()) {
      setStep(1);
      return;
    }

    if (!isCustomerLoggedIn) {
      await handleRequestOtp();
      return;
    }

    await executeOrderSubmission();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl relative max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* BOTÓN CERRAR SUPERIOR */}
        <button
          type="button"
          onClick={handleAttemptClose}
          className="absolute top-4 right-4 size-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition-all z-20"
        >
          <X size={18} />
        </button>

        {/* DIÁLOGO CONFIRMAR SALIDA ACCIDENTAL */}
        {showExitConfirm && (
          <div className="absolute inset-0 z-30 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
              <div className="size-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">¿Salir de la solicitud?</h4>
                <p className="text-xs text-slate-500 font-medium mt-1">Perderás la información que has ingresado en este formulario.</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  Seguir editando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-md shadow-rose-600/20"
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL SEGÚN ESTADO */}
        {successOrder ? (
          /* ──────── PANTALLA DE ÉXITO FINAL ──────── */
          <div className="p-6 sm:p-8 text-center space-y-5 overflow-y-auto my-auto">
            <div className="size-18 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-in zoom-in-95 duration-300">
              <CheckCircle2 size={42} />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">
                Solicitud Recibida con Éxito
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                ¡Solicitud #{successOrder.numeroPedido || 'BW-001'}!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
                Hemos registrado tu solicitud de servicio para <strong className="text-purple-700 font-bold">{totalArticulosCantidad} {totalArticulosCantidad === 1 ? 'artículo' : 'artículos'}</strong>. Te contactaremos vía WhatsApp para coordinar el retiro y confirmar el estado de tus prendas.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 max-w-sm mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Modalidad:</span>
                <strong className="text-slate-800">Retiro a Domicilio</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Horario preferido:</span>
                <strong className="text-slate-800">{selectedDayOption === 'HOY' ? 'Hoy' : selectedDayOption === 'MANANA' ? 'Mañana' : 'Pasado mañana'}</strong>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-2 font-black text-purple-900">
                <span>Total Estimado:</span>
                <span className="font-mono text-sm">${totalEstimado.toFixed(2)} USD</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full max-w-md py-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-600/25 cursor-pointer transition-all active:scale-98"
            >
              Entendido y Ver Mis Órdenes
            </button>
          </div>
        ) : showOtpView ? (
          /* ──────── PANTALLA DE VERIFICACIÓN OTP ──────── */
          <div className="p-6 sm:p-8 space-y-5 overflow-y-auto my-auto text-center animate-in zoom-in-95 duration-200">
            <div className="size-18 bg-purple-100 text-purple-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck size={40} />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200/80 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">
                Verificación WhatsApp Requerida
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Confirma tu número
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
                Para registrar tu pedido e iniciar tu sesión de forma segura, ingresa el código de 6 dígitos que enviamos por WhatsApp al número:
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200">
                  {formCliente.telefono}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpView(false);
                    setStep(1);
                  }}
                  className="text-xs text-purple-600 hover:text-purple-800 font-bold underline cursor-pointer"
                >
                  Editar número
                </button>
              </div>
            </div>

            {otpError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2 text-left max-w-sm mx-auto">
                <AlertCircle size={18} className="shrink-0 text-rose-600" />
                <span>{otpError}</span>
              </div>
            )}

            {otpSentSuccess && (
              <p className="text-xs text-emerald-600 font-bold">
                ✓ Código enviado a tu WhatsApp. Revisa tus mensajes.
              </p>
            )}

            <div className="max-w-xs mx-auto space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Código de 6 dígitos
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] font-mono text-3xl font-black py-3.5 px-4 bg-slate-50 border-2 border-purple-300 focus:border-purple-600 rounded-2xl outline-none text-slate-900 transition-colors shadow-inner"
                />
              </div>

              <button
                type="button"
                disabled={otpLoading || submitting || otpInput.trim().length < 6}
                onClick={handleVerifyOtpAndSubmit}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                {(otpLoading || submitting) ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Verificando y registrando pedido...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Verificar y Confirmar Pedido</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setShowOtpView(false)}
                  className="text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                >
                  Volver a la orden
                </button>

                {otpCountdown > 0 ? (
                  <span className="text-slate-400 font-medium text-[11px]">
                    Reenviar en {otpCountdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={otpLoading}
                    className="text-purple-600 hover:text-purple-800 font-bold underline cursor-pointer text-[11px]"
                  >
                    Reenviar código
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ──────── WIZARD DE 4 PASOS ──────── */
          <>
            {/* CABECERA CON STEPPER RESPONSIVE */}
            <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Truck size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">
                  Lavandería & Calzado Profesional
                </span>
              </div>

              {/* STEPPER DESKTOP & TABLET */}
              <div className="hidden sm:flex items-center justify-between relative mt-3 mb-1">
                <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />
                <div 
                  className="absolute top-1/2 left-6 -translate-y-1/2 h-0.5 bg-purple-600 transition-all duration-300 -z-0"
                  style={{ width: `${((step - 1) / 3) * 100}%` }}
                />

                {[
                  { num: 1, label: 'Ubicación' },
                  { num: 2, label: 'Artículos' },
                  { num: 3, label: 'Revisión' },
                  { num: 4, label: 'Confirmación' }
                ].map((s) => {
                  const isPassed = step > s.num;
                  const isCurrent = step === s.num;

                  return (
                    <div key={s.num} className="flex flex-col items-center gap-1.5 relative z-10 bg-white px-2">
                      <div className={`size-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        isPassed 
                          ? 'bg-purple-600 text-white shadow-xs' 
                          : isCurrent 
                            ? 'bg-purple-600 text-white ring-4 ring-purple-100 shadow-md' 
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        {isPassed ? <Check size={14} /> : s.num}
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                        isCurrent ? 'text-purple-900' : isPassed ? 'text-slate-700' : 'text-slate-400'
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* STEPPER COMPACTO MÓVIL */}
              <div className="sm:hidden flex items-center justify-between pt-1">
                <div>
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                    Paso {step} de 4
                  </span>
                  <h3 className="text-xs font-black uppercase text-slate-900">
                    {step === 1 && 'Ubicación & Retiro'}
                    {step === 2 && `Artículos (${articulos.length})`}
                    {step === 3 && 'Revisión de Solicitud'}
                    {step === 4 && 'Confirmación Final'}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((dot) => (
                    <div
                      key={dot}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        step === dot 
                          ? 'w-6 bg-purple-600' 
                          : step > dot 
                            ? 'w-2 bg-purple-400' 
                            : 'w-2 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* CUERPO DEL WIZARD (CON SCROLL INTERNO ERGONÓMICO) */}
            <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5">

              {/* ══════════════════════════════════════════════════════
                  PASO 1 — UBICACIÓN: ¿Dónde recogemos tus artículos?
                  ══════════════════════════════════════════════════════ */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                      ¿Dónde recogemos tus artículos?
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Servicio exclusivo con retiro a domicilio. Recogemos y entregamos tus prendas en tu puerta.
                    </p>
                  </div>

                  {/* Banner Exclusivo Domicilio */}
                  <div className="p-3.5 bg-purple-50/90 border border-purple-200/80 rounded-2xl flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Truck size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-black text-purple-950">Servicio de Retiro a Domicilio</span>
                      <span className="text-[11px] text-purple-700 font-medium leading-tight block">
                        Vamos a tu dirección a retirar tus artículos y te los regresamos como nuevos a tu puerta.
                      </span>
                    </div>
                  </div>

                  {/* Datos del Cliente */}
                  <div className="space-y-3 pt-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                      Datos de Contacto
                    </span>

                    {isCustomerLoggedIn && formCliente.nombre ? (
                      <div className="p-3.5 bg-purple-50/80 border border-purple-200/80 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                            {formCliente.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-purple-700 block">Sesión Iniciada</span>
                            <p className="text-xs font-bold text-slate-900">
                              {formCliente.nombre} <span className="text-slate-500 font-mono text-[11px]">({formCliente.telefono})</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                            Nombre Completo *
                          </label>
                          <input 
                            type="text" 
                            value={formCliente.nombre}
                            onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })}
                            placeholder="Ej. Carlos Rodríguez"
                            className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-xs font-bold outline-none transition-all ${
                              validationErrors.nombre ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-purple-600 focus:bg-white'
                            }`}
                          />
                          {validationErrors.nombre && (
                            <p className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                              <AlertCircle size={12} /> {validationErrors.nombre}
                            </p>
                          )}
                        </div>

                        <div>
                          <PhoneInput
                            value={formCliente.telefono}
                            onChange={val => setFormCliente({ ...formCliente, telefono: val })}
                            placeholder="WhatsApp"
                            label="TELÉFONO WHATSAPP *"
                            required
                          />
                          {validationErrors.telefono && (
                            <p className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                              <AlertCircle size={12} /> {validationErrors.telefono}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ubicación GPS & Dirección de Retiro */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <MapPin size={14} className="text-purple-600" />
                        Dirección de Retiro
                      </span>

                      <button
                        type="button"
                        onClick={() => setShowMapModal(true)}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 hover:bg-purple-100 transition-all shadow-2xs"
                      >
                        <MapIcon size={12} />
                        {coords.lat ? '📍 Cambiar en Mapa' : '📍 Ubicar en Mapa GPS'}
                      </button>
                    </div>

                    {/* Estado GPS actual */}
                    {coords.lat && coords.lng ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-900">
                        <span className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                        </span>
                        <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-md shrink-0">
                          Fijado
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 font-medium">
                        Presiona <strong className="text-purple-700">"Ubicar en Mapa GPS"</strong> para seleccionar tu punto exacto y calcular la tarifa con precisión.
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                        Dirección Principal *
                      </label>
                      <input 
                        type="text" 
                        value={formCliente.direccion}
                        onChange={e => setFormCliente({ ...formCliente, direccion: e.target.value })}
                        placeholder="Ej. Av. Amazonas 123 y Colón"
                        className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-xs font-bold outline-none transition-all ${
                          validationErrors.direccion ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-purple-600 focus:bg-white'
                        }`}
                      />
                      {validationErrors.direccion && (
                        <p className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {validationErrors.direccion}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                        Referencia de Ubicación *
                      </label>
                      <input 
                        type="text" 
                        value={formCliente.referencia}
                        onChange={e => setFormCliente({ ...formCliente, referencia: e.target.value })}
                        placeholder="Ej. Casa blanca de 2 pisos junto a la farmacia"
                        className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-xs font-bold outline-none transition-all ${
                          validationErrors.referencia ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-purple-600 focus:bg-white'
                        }`}
                      />
                      {validationErrors.referencia && (
                        <p className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {validationErrors.referencia}
                        </p>
                      )}
                    </div>

                    {isOutsideCoverage && (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900 text-xs font-medium">
                        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-black text-amber-950">Fuera de Zona de Cobertura</strong>
                          <span>Tu punto GPS está fuera del perímetro de retiro oficial del negocio. Puedes consultarnos directamente por WhatsApp para coordinar una excepción.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selección de Horario */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                      Día y Franja Horaria Preferida
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'HOY', label: 'Hoy' },
                        { id: 'MANANA', label: 'Mañana' },
                        { id: 'PASADO', label: 'Pasado mañana' }
                      ].map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDayOption(d.id as any)}
                          className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            selectedDayOption === d.id 
                              ? 'bg-purple-600 text-white shadow-xs' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {TIME_SLOTS.map(slot => {
                        const disabled = isSlotDisabled(slot);
                        const isSelected = selectedSlot === slot.id && !disabled;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => setSelectedSlot(slot.id)}
                            className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                              disabled 
                                ? 'opacity-40 bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed line-through'
                                : isSelected 
                                  ? 'bg-purple-50 border-purple-600 text-purple-900 font-black ring-1 ring-purple-600 cursor-pointer' 
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-purple-300 cursor-pointer'
                            }`}
                          >
                            <span className="block text-[10px] text-purple-600 font-medium">{slot.icon}</span>
                            <span>{slot.label} {disabled ? '(Pasado)' : ''}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════
                  PASO 2 — ARTÍCULOS: ¿Qué deseas lavar?
                  ══════════════════════════════════════════════════════ */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                        ¿Qué deseas lavar?
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Agrega los artículos que deseas incluir en este pedido.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddArticle}
                      className="py-2 px-3.5 bg-purple-100 hover:bg-purple-200 text-purple-800 font-black text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      <Plus size={15} />
                      <span className="hidden sm:inline">Agregar artículo</span>
                      <span className="sm:hidden">+ Artículo</span>
                    </button>
                  </div>

                  {validationErrors.articulos && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
                      <AlertCircle size={15} /> {validationErrors.articulos}
                    </div>
                  )}

                  {/* LISTA DINÁMICA DE ARTÍCULOS */}
                  <div className="space-y-4">
                    {articulos.map((art, index) => {
                      const serviceExtrasConfigured = getServiceExtrasConfigured(art.servicioId);

                      return (
                        <div key={art.id} className="p-4 sm:p-5 bg-slate-50 border border-slate-200/90 rounded-3xl space-y-3.5 relative group shadow-2xs">
                          <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                            <span className="text-xs font-black uppercase text-purple-700 flex items-center gap-1.5">
                              <Package size={16} /> Artículo #{index + 1}
                            </span>
                            {articulos.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveArticle(art.id)}
                                className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-rose-50"
                                title="Eliminar este artículo"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {/* Tipo de Artículo */}
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                                Tipo de Artículo
                              </label>
                              <select
                                value={art.tipo}
                                onChange={e => handleUpdateArticle(art.id, 'tipo', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-purple-600 shadow-2xs"
                              >
                                {ARTICLE_TYPES.map(t => (
                                  <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Cantidad */}
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                                Cantidad
                              </label>
                              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateArticle(art.id, 'cantidad', Math.max(1, art.cantidad - 1))}
                                  className="size-7 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="flex-1 text-center font-mono font-bold text-sm text-slate-900">
                                  {art.cantidad}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateArticle(art.id, 'cantidad', art.cantidad + 1)}
                                  className="size-7 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Variante / Material */}
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                                Variante / Material
                              </label>
                              <input
                                type="text"
                                value={art.variante}
                                onChange={e => handleUpdateArticle(art.id, 'variante', e.target.value)}
                                placeholder="Ej. Sneakers, Gamuza, Cuero"
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium outline-none focus:border-purple-600 shadow-2xs"
                              />
                            </div>

                            {/* Servicio Solicitado */}
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                                Servicio Solicitado
                              </label>
                              <select
                                value={art.servicioId || ''}
                                onChange={e => handleUpdateArticle(art.id, 'servicioId', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-purple-600 shadow-2xs"
                              >
                                {businessServices.map((s: any) => (
                                  <option key={s.id} value={s.id}>
                                    {s.nombre} {s.precio ? `($${parseFloat(s.precio).toFixed(2)})` : '(A cotizar)'}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Extras Configurables del Servicio */}
                          {serviceExtrasConfigured.length > 0 && (
                            <div className="pt-1">
                              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                                Extras Opcionales
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {serviceExtrasConfigured.map((ex: any) => {
                                  const isSelected = art.extras.some(e => e.id === (ex.id || ex.nombre));
                                  return (
                                    <button
                                      key={ex.id || ex.nombre}
                                      type="button"
                                      onClick={() => {
                                        const updated = isSelected
                                          ? art.extras.filter(e => e.id !== (ex.id || ex.nombre))
                                          : [...art.extras, { id: ex.id || ex.nombre, nombre: ex.nombre || ex.label, precio: parseFloat(ex.precio || 0) }];
                                        handleUpdateArticle(art.id, 'extras', updated);
                                      }}
                                      className={`px-3 py-2 rounded-xl border text-left text-[11px] font-medium transition-all flex items-center justify-between cursor-pointer ${
                                        isSelected 
                                          ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold shadow-2xs' 
                                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                      }`}
                                    >
                                      <span className="truncate">{ex.nombre || ex.label}</span>
                                      <span className="font-mono text-[10px] text-purple-700 ml-1 font-bold">
                                        +${parseFloat(ex.precio || 0).toFixed(2)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Observaciones / Estado */}
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                              Observaciones / Estado del Artículo
                            </label>
                            <input
                              type="text"
                              value={art.observaciones}
                              onChange={e => handleUpdateArticle(art.id, 'observaciones', e.target.value)}
                              placeholder="Ej: Mancha leve en lengüeta o suela despegada"
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-purple-600 shadow-2xs"
                            />
                          </div>

                          {/* Fotos del Artículo */}
                          <div className="space-y-2 pt-1 border-t border-slate-200/50">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                                <Camera size={13} className="text-purple-600" />
                                Fotos del Artículo ({art.fotos.length})
                              </label>
                              <label className="text-[10px] font-black text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200/80 cursor-pointer transition-colors">
                                + Subir Foto
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={e => handleFileUpload(art.id, e.target.files)}
                                  className="hidden"
                                />
                              </label>
                            </div>

                            {art.fotos.length > 0 && (
                              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                                {art.fotos.map((imgUrl, pIdx) => (
                                  <div key={pIdx} className="relative size-14 shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-2xs group/img">
                                    <img src={imgUrl} alt={`Foto ${pIdx}`} className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePhoto(art.id, pIdx)}
                                      className="absolute top-1 right-1 size-5 rounded-full bg-slate-950/80 text-white flex items-center justify-center text-[10px] hover:bg-rose-600 transition-colors"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* RESUMEN COMPACTO PASO 2 */}
                  <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100 space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Artículos ({totalArticulosCantidad}):</span>
                      <span className="font-mono font-black">${subtotalServicios.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Retiro / Entrega (GPS):</span>
                      <span className="font-mono font-black">${costoEnvioCalculado.toFixed(2)}</span>
                    </div>

                    <div className="border-t border-purple-200/70 pt-2 flex justify-between items-baseline">
                      <span className="font-black uppercase text-purple-950">Total Estimado</span>
                      <span className="text-xl font-black text-purple-950 font-mono">${totalEstimado.toFixed(2)} USD</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════
                  PASO 3 — REVISIÓN: Revisa tu solicitud
                  ══════════════════════════════════════════════════════ */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                      Revisa tu solicitud
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Verifica que los datos y artículos sean correctos antes de confirmar.
                    </p>
                  </div>

                  {/* Bloque 1: Ubicación & Logística */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-xs font-black uppercase text-purple-800 flex items-center gap-1.5">
                        <Truck size={15} className="text-purple-600" />
                        Retiro a Domicilio
                      </span>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs"
                      >
                        <Edit3 size={12} />
                        <span>Editar</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700">
                      <p><strong>Cliente:</strong> {formCliente.nombre} • <span className="font-mono">{formCliente.telefono}</span></p>
                      <p><strong>Dirección de Retiro:</strong> {formCliente.direccion}</p>
                      <p><strong>Referencia:</strong> {formCliente.referencia}</p>
                      <p>
                        <strong>Horario de Retiro:</strong> {selectedDayOption === 'HOY' ? 'Hoy' : selectedDayOption === 'MANANA' ? 'Mañana' : 'Pasado mañana'} ({TIME_SLOTS.find(s => s.id === selectedSlot)?.label || selectedSlot})
                      </p>
                    </div>
                  </div>

                  {/* Bloque 2: Artículos Desglosados */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-xs font-black uppercase text-purple-800 flex items-center gap-1.5">
                        <Package size={15} className="text-purple-600" />
                        Artículos a Lavar ({totalArticulosCantidad})
                      </span>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs"
                      >
                        <Edit3 size={12} />
                        <span>Editar artículos</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {articulos.map((art, idx) => {
                        const extrasCost = art.extras.reduce((s, e) => s + (e.precio || 0), 0);
                        const itemTotal = (art.precioUnitario + extrasCost) * art.cantidad;

                        return (
                          <div key={art.id} className="bg-white p-3 rounded-xl border border-slate-200/70 text-xs space-y-1.5 shadow-2xs">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-extrabold text-slate-900">
                                  {art.tipo} ({art.variante}) × {art.cantidad}
                                </h4>
                                <p className="text-slate-600 font-medium text-[11px]">
                                  {art.servicioNombre}
                                  {art.extras.length > 0 && ` + ${art.extras.map(e => e.nombre).join(', ')}`}
                                </p>
                              </div>
                              <span className="font-mono font-bold text-purple-700 text-sm">
                                ${itemTotal.toFixed(2)}
                              </span>
                            </div>

                            {art.observaciones && (
                              <p className="text-[11px] text-slate-500 italic">
                                Nota: "{art.observaciones}"
                              </p>
                            )}

                            {art.fotos.length > 0 && (
                              <div className="flex items-center gap-1.5 pt-1">
                                {art.fotos.map((f, fIdx) => (
                                  <img key={fIdx} src={f} alt="Foto" className="size-8 rounded-lg object-cover border border-slate-200" />
                                ))}
                                <span className="text-[10px] font-bold text-slate-400 ml-1">
                                  {art.fotos.length} {art.fotos.length === 1 ? 'foto' : 'fotos'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bloque 3: Resumen Económico */}
                  <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Servicios Solicitados:</span>
                      <span className="font-mono">${subtotalServicios.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Retiro / Entrega a Domicilio:</span>
                      <span className="font-mono">${costoEnvioCalculado.toFixed(2)}</span>
                    </div>

                    <div className="border-t border-purple-200/70 pt-2 flex justify-between items-baseline">
                      <div>
                        <span className="text-xs font-black uppercase text-purple-950 block">TOTAL ESTIMADO</span>
                        {tieneEvaluacion ? (
                          <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 mt-0.5">
                            <Info size={11} /> Precio sujeto a confirmación tras inspección en taller.
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                            <ShieldCheck size={11} /> Calculado con las tarifas del negocio.
                          </span>
                        )}
                      </div>
                      <span className="text-2xl font-black text-purple-950 font-mono">
                        ${totalEstimado.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════
                  PASO 4 — CONFIRMACIÓN: Confirma tu solicitud
                  ══════════════════════════════════════════════════════ */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200 text-center py-2">
                  <div className="size-16 bg-purple-100 text-purple-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 size={36} />
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      Confirma tu solicitud
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm mx-auto">
                      Tu pedido está listo para ser registrado en nuestro sistema.
                    </p>
                  </div>

                  {submitError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2 text-left">
                      <AlertCircle size={18} className="shrink-0 text-rose-600" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Resumen Compacto Final */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left text-xs space-y-2 max-w-md mx-auto">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
                      <span className="font-black text-slate-800 uppercase tracking-wider">Estado</span>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px]">
                        ✓ Solicitud Lista
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Artículos:</span>
                      <strong className="text-slate-900">{totalArticulosCantidad} artículo(s)</strong>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Modalidad:</span>
                      <strong className="text-slate-900">Retiro a Domicilio</strong>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Horario:</span>
                      <strong className="text-slate-900">{selectedDayOption === 'HOY' ? 'Hoy' : selectedDayOption === 'MANANA' ? 'Mañana' : 'Pasado mañana'}</strong>
                    </div>

                    <div className="flex justify-between border-t border-slate-200/70 pt-2">
                      <span className="font-extrabold text-slate-900">Total Estimado:</span>
                      <span className="font-mono text-base font-black text-purple-700">
                        ${totalEstimado.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium max-w-sm mx-auto">
                    Al confirmar, nuestro equipo recibirá la orden y te escribirá por WhatsApp para coordinar los detalles.
                  </p>
                </div>
              )}
            </div>

            {/* BOTONES Y NAVEGACIÓN INFERIOR DEL WIZARD */}
            <div className="px-5 sm:px-7 py-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={submitting}
                  className="py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronLeft size={16} />
                  <span>Atrás</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className="py-3.5 px-5 text-slate-400 hover:text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="py-3.5 px-7 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-600/25 transition-all cursor-pointer flex items-center gap-2 active:scale-98 ml-auto"
                >
                  <span>Continuar</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={submitting || otpLoading}
                  className="py-4 px-8 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 flex-1 sm:flex-initial ml-auto"
                >
                  {submitting || otpLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>{otpLoading ? 'Enviando código WhatsApp...' : 'Enviando solicitud...'}</span>
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      <span>{isCustomerLoggedIn ? 'CONFIRMAR SOLICITUD' : 'CONFIRMAR Y VERIFICAR'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* MAP MODAL INTERACTIVO */}
      <MapSelectionModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLat={coords.lat}
        initialLng={coords.lng}
        onConfirmLocation={(lat, lng, address) => {
          setCoords({ lat, lng });
          setFormCliente(prev => ({
            ...prev,
            direccion: address || prev.direccion
          }));
          setShowMapModal(false);
        }}
      />
    </div>
  );
}
