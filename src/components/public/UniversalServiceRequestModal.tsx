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
  Info,
  Footprints,
  Package,
  ShoppingBag,
  Shirt,
  ShieldCheck
} from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';
import { isPointInPolygon } from '@/lib/geoUtils';

interface ArticleItem {
  id: string;
  tipo: string; // 'Zapatos' | 'Botas' | 'Mochilas' | 'Gorras' | 'Bolsos' | 'Prendas' | 'Otros'
  variante: string; // 'Sneakers', 'Cuero', 'Gamuza', 'Deportiva', etc.
  cantidad: number;
  servicioId?: string;
  servicioNombre: string;
  precioUnitario: number;
  requiereEvaluacion: boolean;
  extras: string[];
  observaciones: string;
  fotos: string[]; // Array of base64 data URLs
}

interface UniversalServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  negocio: any;
  initialServiceId?: string;
  initialServiceName?: string;
  onSuccess?: (orderData: any) => void;
}

const ARTICLE_TYPES = [
  { id: 'Zapatos', label: 'Zapatos / Sneakers', icon: '👟', defaultVariant: 'Sneakers' },
  { id: 'Botas', label: 'Botas / Botines', icon: '🥾', defaultVariant: 'Cuero / Gamuza' },
  { id: 'Mochilas', label: 'Mochilas / Morrales', icon: '🎒', defaultVariant: 'Deportiva / Escolar' },
  { id: 'Gorras', label: 'Gorras / Sombreros', icon: '🧢', defaultVariant: 'Urbana / Visera' },
  { id: 'Bolsos', label: 'Bolsos / Carteras', icon: '👜', defaultVariant: 'Cuero / Sintético' },
  { id: 'Prendas', label: 'Prendas / Abrigos', icon: '👕', defaultVariant: 'Casual / Especial' },
  { id: 'Otros', label: 'Otros Artículos', icon: '📦', defaultVariant: 'Estándar' },
];

const COMMON_EXTRAS = [
  { id: 'desinfeccion', label: 'Desinfección Antibacteriana', precio: 2.00 },
  { id: 'impermeable', label: 'Protector Impermeabilizante', precio: 3.00 },
  { id: 'color', label: 'Retoque / Renovación de Color', precio: 5.00 },
  { id: 'pegado', label: 'Pegado / Costura Menor', precio: 4.00 }
];

const TIME_SLOTS = [
  { id: '09-11', label: '09:00 - 11:00 AM', icon: '🌅 Mañana', startHour: 9, endHour: 11 },
  { id: '11-13', label: '11:00 AM - 01:00 PM', icon: '☀️ Mediodía', startHour: 11, endHour: 13 },
  { id: '14-16', label: '02:00 - 04:00 PM', icon: '🌤️ Tarde', startHour: 14, endHour: 16 },
  { id: '16-18', label: '04:00 - 06:00 PM', icon: '<ctrl42> Víspera', startHour: 16, endHour: 18 }
];

export default function UniversalServiceRequestModal({
  isOpen,
  onClose,
  negocio,
  initialServiceId,
  initialServiceName,
  onSuccess
}: UniversalServiceRequestModalProps) {
  const [step, setStep] = useState<1 | 2>(1); // 1: Datos y Ubicación, 2: Artículos y Resumen
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);

  // Datos Cliente & Logística
  const [formCliente, setFormCliente] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    referencia: '',
    modo: 'DOMICILIO' as 'DOMICILIO' | 'LOCAL'
  });

  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [selectedDayOption, setSelectedDayOption] = useState<'HOY' | 'MANANA' | 'PASADO'>('MANANA');
  const [selectedSlot, setSelectedSlot] = useState<string>('14-16');

  // Sesión y Cobertura
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  const [coveragePolygon, setCoveragePolygon] = useState<Array<[number, number]>>([]);

  // Artículos Solicitados (Multi-Artículos)
  const defaultService = (negocio?.services && negocio.services.length > 0)
    ? negocio.services[0]
    : { id: 'default', nombre: 'Limpieza Profunda', precio: 6.00 };

  const [articulos, setArticulos] = useState<ArticleItem[]>([
    {
      id: `art_${Date.now()}_1`,
      tipo: 'Zapatos',
      variante: 'Sneakers',
      cantidad: 1,
      servicioId: initialServiceId || defaultService.id,
      servicioNombre: initialServiceName || defaultService.nombre || 'Limpieza Profunda',
      precioUnitario: defaultService.precio ? parseFloat(defaultService.precio) : 6.00,
      requiereEvaluacion: false,
      extras: [],
      observaciones: '',
      fotos: []
    }
  ]);

  // Cargar Cobertura del Negocio
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

  // Validación GPS de Cobertura
  const isOutsideCoverage = useMemo(() => {
    if (formCliente.modo === 'LOCAL') return false;
    if (!coords.lat || !coords.lng || !coveragePolygon || coveragePolygon.length < 3) return false;
    return !isPointInPolygon([coords.lat, coords.lng], coveragePolygon);
  }, [coords.lat, coords.lng, coveragePolygon, formCliente.modo]);

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

  // Agregar nuevo artículo a la solicitud
  const handleAddArticle = () => {
    const srv = (negocio?.services && negocio.services.length > 0) ? negocio.services[0] : defaultService;
    setArticulos(prev => [
      ...prev,
      {
        id: `art_${Date.now()}_${prev.length + 1}`,
        tipo: 'Zapatos',
        variante: 'Sneakers',
        cantidad: 1,
        servicioId: srv.id,
        servicioNombre: srv.nombre || 'Limpieza Profunda',
        precioUnitario: srv.precio ? parseFloat(srv.precio) : 6.00,
        requiereEvaluacion: false,
        extras: [],
        observaciones: '',
        fotos: []
      }
    ]);
  };

  // Remover artículo
  const handleRemoveArticle = (id: string) => {
    if (articulos.length === 1) return; // Mantener al menos 1
    setArticulos(prev => prev.filter(a => a.id !== id));
  };

  // Actualizar artículo individual
  const handleUpdateArticle = (id: string, field: keyof ArticleItem, value: any) => {
    setArticulos(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, [field]: value };
      
      // Si cambia el servicio seleccionado, actualizar precioNombre y precioUnitario
      if (field === 'servicioId') {
        const found = negocio?.services?.find((s: any) => s.id === value);
        if (found) {
          updated.servicioNombre = found.nombre;
          updated.precioUnitario = found.precio ? parseFloat(found.precio) : 0;
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

  // Cálculos de Totales y Evaluación
  const tieneEvaluacion = useMemo(() => {
    return articulos.some(a => a.requiereEvaluacion || a.precioUnitario === 0 || a.variante.toLowerCase().includes('cuero') || a.variante.toLowerCase().includes('gamuza'));
  }, [articulos]);

  const subtotalEstimado = useMemo(() => {
    return articulos.reduce((sum, art) => {
      const extrasCost = art.extras.reduce((eSum, extId) => {
        const foundExt = COMMON_EXTRAS.find(e => e.id === extId);
        return eSum + (foundExt?.precio || 0);
      }, 0);
      return sum + ((art.precioUnitario + extrasCost) * art.cantidad);
    }, 0);
  }, [articulos]);

  const costoEnvio = formCliente.modo === 'DOMICILIO' ? 2.00 : 0.00;
  const totalEstimado = subtotalEstimado + costoEnvio;

  // Enviar Solicitud Completa
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCliente.nombre || !formCliente.telefono) return;
    if (formCliente.modo === 'DOMICILIO' && (!formCliente.direccion || isOutsideCoverage)) return;

    setSubmitting(true);
    try {
      const payload = {
        negocioId: negocio?.id,
        modo: formCliente.modo,
        nombreCliente: formCliente.nombre,
        telefonoCliente: formCliente.telefono,
        direccionCliente: formCliente.direccion,
        referenciaCliente: formCliente.referencia,
        latitud: coords.lat,
        longitud: coords.lng,
        fechaHoraRetiro: `${selectedDayOption} (${TIME_SLOTS.find(s => s.id === selectedSlot)?.label || selectedSlot})`,
        cantidadPares: articulos.reduce((sum, a) => sum + a.cantidad, 0).toString(),
        subtotal: subtotalEstimado,
        costoEnvio,
        total: totalEstimado,
        articulos: articulos.map(a => ({
          tipo: a.tipo,
          variante: a.variante,
          cantidad: a.cantidad,
          servicioId: a.servicioId,
          servicioNombre: a.servicioNombre,
          precioUnitario: a.precioUnitario,
          extras: a.extras.map(eId => COMMON_EXTRAS.find(ex => ex.id === eId)?.label || eId),
          observaciones: a.observaciones,
          fotos: a.fotos
        })),
        requiereConfirmacionPrecio: tieneEvaluacion || formCliente.modo === 'DOMICILIO'
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
      }
    } catch (err) {
      console.error('Error enviando solicitud:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 size-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition-all z-10"
        >
          <X size={18} />
        </button>

        {/* SI SE COMPLETÓ LA ORDEN */}
        {successOrder ? (
          <div className="text-center space-y-5 py-6">
            <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Solicitud Recibida</span>
              <h3 className="text-2xl font-black text-slate-900">¡Orden #{successOrder.numeroPedido} Creada!</h3>
              <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto leading-relaxed">
                Hemos recibido tu solicitud de <span className="font-bold text-purple-700">{articulos.length} {articulos.length === 1 ? 'artículo' : 'artículos'}</span>. Nos comunicaremos contigo por WhatsApp para confirmar los detalles.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-600/25 cursor-pointer transition-all"
            >
              Entendido y Ver Mis Órdenes
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Cabecera */}
            <div>
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Truck size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Servicio de Lavandería & Cuidado</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">Solicitud de Servicio Multi-Artículos</h2>
              <p className="text-xs text-slate-500 font-medium">Ingresa tus datos y añade los artículos que deseas enviar.</p>
            </div>

            {/* Pestañas de Pasos */}
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  step === 1 ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Datos y Ubicación
              </button>
              <button
                type="button"
                onClick={() => {
                  if (formCliente.nombre && formCliente.telefono) setStep(2);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  step === 2 ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Artículos ({articulos.length})
              </button>
            </div>

            {/* PASO 1: DATOS Y UBICACIÓN */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Selector Modo: Domicilio vs En Local */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormCliente(p => ({ ...p, modo: 'DOMICILIO' }))}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      formCliente.modo === 'DOMICILIO' ? 'bg-purple-50 border-purple-600 text-purple-950 font-black shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Truck size={18} className="text-purple-600 shrink-0" />
                    <div>
                      <span className="block text-xs font-bold">Retiro a Domicilio</span>
                      <span className="text-[10px] text-slate-400 font-medium">Recogemos en tu puerta</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCliente(p => ({ ...p, modo: 'LOCAL' }))}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      formCliente.modo === 'LOCAL' ? 'bg-purple-50 border-purple-600 text-purple-950 font-black shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Footprints size={18} className="text-purple-600 shrink-0" />
                    <div>
                      <span className="block text-xs font-bold">Entrega en Taller</span>
                      <span className="text-[10px] text-slate-400 font-medium">Llevo al local físico</span>
                    </div>
                  </button>
                </div>

                {/* Cliente Autenticado o Formulario */}
                {isCustomerLoggedIn && formCliente.nombre ? (
                  <div className="p-3 bg-purple-50/80 border border-purple-200/80 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                        {formCliente.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-purple-700 block">Sesión Iniciada</span>
                        <p className="text-xs font-bold text-slate-900">{formCliente.nombre} <span className="text-slate-500 font-mono text-[11px]">({formCliente.telefono})</span></p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Nombre Completo *</label>
                      <input 
                        type="text" 
                        required 
                        value={formCliente.nombre}
                        onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })}
                        placeholder="Ej. Carlos Rodríguez"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                      />
                    </div>

                    <div>
                      <PhoneInput
                        value={formCliente.telefono}
                        onChange={val => setFormCliente({ ...formCliente, telefono: val })}
                        placeholder="WhatsApp"
                        label="TELÉFONO WHATSAPP *"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Dirección y Referencia (si es Domicilio) */}
                {formCliente.modo === 'DOMICILIO' && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase text-slate-500 block">Dirección de Retiro *</label>
                      <input 
                        type="text" 
                        required
                        value={formCliente.direccion}
                        onChange={e => setFormCliente({ ...formCliente, direccion: e.target.value })}
                        placeholder="Ej. Av. Amazonas 123 y Colón"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                      />
                    </div>

                    {formCliente.direccion.trim() !== '' && (
                      <div className="space-y-1 animate-in fade-in duration-200">
                        <label className="text-[11px] font-black uppercase text-slate-500 block">Referencia de Ubicación *</label>
                        <input 
                          type="text" 
                          required
                          value={formCliente.referencia}
                          onChange={e => setFormCliente({ ...formCliente, referencia: e.target.value })}
                          placeholder="Ej. Casa azul de 2 pisos, portón negro / Frente al parque"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                        />
                      </div>
                    )}

                    {isOutsideCoverage && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-amber-900 text-xs font-medium">
                        <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <span>Tu ubicación seleccionada está fuera de nuestra zona de retiros. Contáctanos por WhatsApp.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Selección de Horario */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-black uppercase text-slate-500 block">Día y Horario Preferido</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['HOY', 'MANANA', 'PASADO'].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDayOption(d as any)}
                        className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          selectedDayOption === d ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {d === 'MANANA' ? 'MAÑANA' : d}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
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
                                ? 'bg-purple-50 border-purple-600 text-purple-900 font-black cursor-pointer' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-purple-300 cursor-pointer'
                          }`}
                        >
                          <span className="block text-[10px] text-purple-600">{slot.icon}</span>
                          <span>{slot.label} {disabled ? '(Pasado)' : ''}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (formCliente.nombre && formCliente.telefono) setStep(2);
                  }}
                  disabled={!formCliente.nombre || !formCliente.telefono}
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Siguiente: Agregar Artículos
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* PASO 2: ARTÍCULOS A LIMPIAR (MULTI-ARTÍCULOS) */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">Lista de Artículos ({articulos.length})</span>
                  <button
                    type="button"
                    onClick={handleAddArticle}
                    className="py-1.5 px-3 bg-purple-100 hover:bg-purple-200 text-purple-800 font-black text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    Agregar otro artículo
                  </button>
                </div>

                {/* TARJETAS POR CADA ARTÍCULO */}
                <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                  {articulos.map((art, index) => (
                    <div key={art.id} className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3 relative group">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-black uppercase text-purple-700 flex items-center gap-1.5">
                          <Package size={14} /> Artículo #{index + 1}
                        </span>
                        {articulos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveArticle(art.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Eliminar artículo"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Tipo y Cantidad */}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Tipo de Artículo</label>
                          <select
                            value={art.tipo}
                            onChange={e => handleUpdateArticle(art.id, 'tipo', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-purple-600"
                          >
                            {ARTICLE_TYPES.map(t => (
                              <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Cantidad</label>
                          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateArticle(art.id, 'cantidad', Math.max(1, art.cantidad - 1))}
                              className="w-6 text-slate-500 hover:text-slate-900 font-black text-sm"
                            >
                              -
                            </button>
                            <span className="flex-1 text-center font-mono font-bold">{art.cantidad}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateArticle(art.id, 'cantidad', art.cantidad + 1)}
                              className="w-6 text-slate-500 hover:text-slate-900 font-black text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Variante y Servicio */}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Variante / Material</label>
                          <input
                            type="text"
                            value={art.variante}
                            onChange={e => handleUpdateArticle(art.id, 'variante', e.target.value)}
                            placeholder="Ej. Sneakers, Cuero, Gamuza"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium outline-none focus:border-purple-600"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Servicio Solicitado</label>
                          {negocio?.services && negocio.services.length > 0 ? (
                            <select
                              value={art.servicioId || ''}
                              onChange={e => handleUpdateArticle(art.id, 'servicioId', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-purple-600"
                            >
                              {negocio.services.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.nombre} (${s.precio || '0'})</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={art.servicioNombre}
                              onChange={e => handleUpdateArticle(art.id, 'servicioNombre', e.target.value)}
                              placeholder="Ej. Limpieza Profunda"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                            />
                          )}
                        </div>
                      </div>

                      {/* Extras opcionales */}
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Servicios Extras (Opcional)</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {COMMON_EXTRAS.map(ex => {
                            const hasExtra = art.extras.includes(ex.id);
                            return (
                              <button
                                key={ex.id}
                                type="button"
                                onClick={() => {
                                  const updatedExtras = hasExtra
                                    ? art.extras.filter(id => id !== ex.id)
                                    : [...art.extras, ex.id];
                                  handleUpdateArticle(art.id, 'extras', updatedExtras);
                                }}
                                className={`px-2.5 py-1.5 rounded-xl border text-left text-[11px] font-medium transition-all flex items-center justify-between cursor-pointer ${
                                  hasExtra ? 'bg-purple-100 border-purple-400 text-purple-900 font-bold' : 'bg-white border-slate-200 text-slate-600'
                                }`}
                              >
                                <span className="truncate">{ex.label}</span>
                                <span className="font-mono text-[10px] text-purple-700 ml-1">+${ex.precio}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Observaciones */}
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Observaciones / Estado</label>
                        <input
                          type="text"
                          value={art.observaciones}
                          onChange={e => handleUpdateArticle(art.id, 'observaciones', e.target.value)}
                          placeholder="Ej: Mancha de aceite en la lengüeta / Despegado leve"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none"
                        />
                      </div>

                      {/* Fotografías adjuntas asociadas AL ARTÍCULO */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                            <Camera size={12} className="text-purple-600" /> Fotos del Artículo ({art.fotos.length})
                          </label>
                          <label className="text-[10px] font-black text-purple-600 hover:underline cursor-pointer">
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
                          <div className="flex items-center gap-2 overflow-x-auto py-1">
                            {art.fotos.map((imgUrl, pIdx) => (
                              <div key={pIdx} className="relative size-14 shrink-0 rounded-xl overflow-hidden border border-slate-200 group/img">
                                <img src={imgUrl} alt={`Foto ${pIdx}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto(art.id, pIdx)}
                                  className="absolute top-1 right-1 size-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center text-[10px]"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[9.5px] text-slate-400 font-medium">Puedes agregar fotos para que el negocio evalúe el estado del artículo.</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* RESUMEN DE PRECIOS Y COTIZACIÓN */}
                <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Subtotal Estimado:</span>
                    <span className="font-mono">${subtotalEstimado.toFixed(2)}</span>
                  </div>
                  {costoEnvio > 0 && (
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Costo de Retiro y Envío:</span>
                      <span className="font-mono">${costoEnvio.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-purple-200/60 pt-2 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase text-purple-700 block">Total Estimado</span>
                      {tieneEvaluacion ? (
                        <span className="text-[11px] text-amber-700 font-bold flex items-center gap-1">
                          <Info size={12} /> Precio sujeto a confirmación por el negocio.
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                          <ShieldCheck size={12} /> Precio estimado precalculado.
                        </span>
                      )}
                    </div>
                    <span className="text-xl font-black text-purple-950 font-mono">${totalEstimado.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (formCliente.modo === 'DOMICILIO' && isOutsideCoverage)}
                    className="w-2/3 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Solicitar Servicio'}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
