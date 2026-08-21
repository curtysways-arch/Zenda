'use client';

import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Check, 
  Clock, 
  Users, 
  RotateCcw, 
  Truck, 
  ShoppingBag, 
  ShieldAlert, 
  Store, 
  Utensils, 
  Globe, 
  Calendar, 
  Percent, 
  DollarSign, 
  Gift, 
  Package, 
  Tag, 
  ChevronRight, 
  Flame, 
  HelpCircle,
  Calculator,
  ArrowRight
} from 'lucide-react';

interface PromotionBuilderProps {
  products: any[];
  categories: any[];
  initialData?: any;
  onSave: (promoData: any) => void;
  onCancel: () => void;
  negocio?: any;
}

export default function PromotionBuilder({
  products,
  categories,
  initialData,
  onSave,
  onCancel,
  negocio,
}: PromotionBuilderProps) {
  // ── 0. OBJETIVO COMERCIAL ───────────────────────────────────────────────
  const [goalPreset, setGoalPreset] = useState<string>(initialData?.goalPreset || 'TODAY');

  // ── 1. BENEFICIO ────────────────────────────────────────────────────────
  const [tipoPromo, setTipoPromo] = useState<string>(initialData?.tipoPromo || 'PORCENTAJE');
  const [precioPromo, setPrecioPromo] = useState<number>(initialData?.precioPromo || 15);
  const [precioAnterior, setPrecioAnterior] = useState<number | undefined>(initialData?.precioAnterior);
  const [beneficioPersonalizado, setBeneficioPersonalizado] = useState<string>(initialData?.beneficioPersonalizado || '');

  // ── 2. ALCANCE ──────────────────────────────────────────────────────────
  const [alcance, setAlcance] = useState<string>(initialData?.alcance || 'PEDIDO_COMPLETO');
  const [productoRequeridoId, setProductoRequeridoId] = useState<string>(initialData?.productoRequeridoId || '');
  const [servicioRequeridoId, setServicioRequeridoId] = useState<string>(initialData?.servicioRequeridoId || '');
  const [categoriaRequeridaId, setCategoriaRequeridaId] = useState<string>(initialData?.categoriaRequeridaId || '');
  const [profesionalId, setProfesionalId] = useState<string>(initialData?.profesionalId || '');

  // ── DATOS GENERALES ─────────────────────────────────────────────────────
  const [titulo, setTitulo] = useState<string>(initialData?.titulo || '');
  const [descripcion, setDescripcion] = useState<string>(initialData?.descripcion || '');
  const [imagenUrl, setImagenUrl] = useState<string>(initialData?.imagenUrl || '');

  // ── 3. CONDICIONES ──────────────────────────────────────────────────────
  const [montoMinimo, setMontoMinimo] = useState<number>(initialData?.montoMinimo || 0);
  const [cantidadMinima, setCantidadMinima] = useState<number>(initialData?.cantidadMinima || 0);
  const [tipoCliente, setTipoCliente] = useState<'ANY' | 'NEW' | 'RECURRING'>(initialData?.tipoCliente || 'ANY');
  const [cuponCodigo, setCuponCodigo] = useState<string>(initialData?.cuponCodigo || '');

  const [usosTotalesMaximo, setUsosTotalesMaximo] = useState<number | undefined>(initialData?.usosTotalesMaximo);
  const [usosPorClienteMaximo, setUsosPorClienteMaximo] = useState<number | undefined>(initialData?.usosPorClienteMaximo);

  // Fechas y Horarios
  const formatDateInput = (val: any, fallbackDays = 0) => {
    if (!val) {
      const d = new Date();
      if (fallbackDays) d.setDate(d.getDate() + fallbackDays);
      return d.toISOString().split('T')[0];
    }
    if (typeof val === 'string') return val.includes('T') ? val.split('T')[0] : val;
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
    } catch (_) {
      const d = new Date();
      if (fallbackDays) d.setDate(d.getDate() + fallbackDays);
      return d.toISOString().split('T')[0];
    }
  };

  const parseDiasValidos = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim() !== '') return val.split(',').map(s => s.trim());
    return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  };

  const [fechaInicio, setFechaInicio] = useState(formatDateInput(initialData?.fechaInicio));
  const [fechaFin, setFechaFin] = useState(formatDateInput(initialData?.fechaFin, 30));
  const [diasValidos, setDiasValidos] = useState<string[]>(parseDiasValidos(initialData?.diasValidos));
  const [horaInicioValida, setHoraInicioValida] = useState(initialData?.horaInicioValida || '');
  const [horaFinValida, setHoraFinValida] = useState(initialData?.horaFinValida || '');

  // ── 4. CANALES ──────────────────────────────────────────────────────────
  const tipoUpper = (negocio?.tipoNegocio || '').toUpperCase();
  const isRestaurant = tipoUpper === 'RESTAURANTE' || tipoUpper === 'GASTRONOMIA';
  const isBeautySpa = tipoUpper === 'SPA' || tipoUpper === 'CENTRO_ESTETICA' || tipoUpper === 'PELUQUERIA' || tipoUpper === 'BARBERIA';
  const isLaundry = tipoUpper === 'SHOE_CARE' || tipoUpper === 'LAVANDERIA';

  const availableChannelsList = useMemo(() => {
    if (isRestaurant) {
      return [
        { id: 'POS', label: '🏬 POS / Caja', icon: Store },
        { id: 'MESEROS', label: '🍽️ Meseros', icon: Utensils },
        { id: 'DELIVERY', label: '🛵 Delivery', icon: Truck },
        { id: 'PICKUP', label: '🛍️ Pickup / Retiro', icon: ShoppingBag },
        { id: 'LANDING', label: '🌐 Web / Landing', icon: Globe },
      ];
    }
    if (isBeautySpa) {
      return [
        { id: 'POS', label: '🏬 POS / Recepción', icon: Store },
        { id: 'CITAS', label: '📅 Citas Online', icon: Calendar },
        { id: 'DOMICILIO', label: '🚗 A Domicilio', icon: Truck },
        { id: 'LOCAL', label: '📍 En Local', icon: ShoppingBag },
        { id: 'LANDING', label: '🌐 Web', icon: Globe },
      ];
    }
    if (isLaundry) {
      return [
        { id: 'POS', label: '🏬 POS / Recepción', icon: Store },
        { id: 'SOLICITUDES', label: '📦 Solicitud Online', icon: ShoppingBag },
        { id: 'RETIRO', label: '🛵 Retiro / Entrega', icon: Truck },
        { id: 'LOCAL', label: '📍 En Taller', icon: ShoppingBag },
        { id: 'LANDING', label: '🌐 Web', icon: Globe },
      ];
    }
    return [
      { id: 'POS', label: '🏬 POS / Caja', icon: Store },
      { id: 'ONLINE', label: '🛒 Pedidos Online', icon: ShoppingBag },
      { id: 'DELIVERY', label: '🛵 Delivery / Envío', icon: Truck },
      { id: 'LOCAL', label: '📍 En Local', icon: ShoppingBag },
      { id: 'LANDING', label: '🌐 Web', icon: Globe },
    ];
  }, [isRestaurant, isBeautySpa, isLaundry]);

  const defaultInitialChannels = availableChannelsList.map(c => c.id);
  const [canales, setCanales] = useState<string[]>(initialData?.canales || defaultInitialChannels);

  // ── 5. REGLAS ADICIONALES & FINANCIAMIENTO ──────────────────────────────
  const [distanciaMaximaKm, setDistanciaMaximaKm] = useState<number | undefined>(initialData?.distanciaMaximaKm);
  const [costoMaximoSubsidiado, setCostoMaximoSubsidiado] = useState<number | undefined>(initialData?.costoMaximoSubsidiado);
  const [esCostoCompleto, setEsCostoCompleto] = useState<boolean>(initialData?.esCostoCompleto ?? true);
  const [financiamiento, setFinanciamiento] = useState<'NEGOCIO' | 'CLIENTE' | 'PLATAFORMA' | 'COMPARTIDO'>(initialData?.financiamiento || 'NEGOCIO');
  const [esCombinable, setEsCombinable] = useState<boolean>(initialData?.esCombinable || false);

  // Handlers
  const toggleDay = (day: string) => {
    setDiasValidos(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const toggleChannel = (chId: string) => {
    setCanales(prev => prev.includes(chId) ? prev.filter(c => c !== chId) : [...prev, chId]);
  };

  // Aplicar Preset de Objetivo Commercial
  const handleSelectGoalPreset = (presetKey: string) => {
    setGoalPreset(presetKey);

    if (presetKey === 'TODAY') {
      setTitulo('🔥 Descuento Especial Hoy');
      setTipoPromo('PORCENTAJE');
      setPrecioPromo(15);
      setFechaFin(formatDateInput(null, 1));
    } else if (presetKey === 'NEW_CLIENT') {
      setTitulo('🎁 15% OFF en Tu Primera Reserva');
      setTipoPromo('CUPON');
      setCuponCodigo('BIENVENIDO');
      setPrecioPromo(15);
      setTipoCliente('NEW');
      setMontoMinimo(15);
    } else if (presetKey === 'RECURRING_CLIENT') {
      setTitulo('🔄 Premio a Tu Fidelidad: $5.00 OFF');
      setTipoPromo('DESCUENTO_FIJO');
      setPrecioPromo(5);
      setTipoCliente('RECURRING');
    } else if (presetKey === 'ORDER_BOOST') {
      setTitulo('📦 $6.00 OFF en Pedidos Mayores a $30');
      setTipoPromo('DESCUENTO_FIJO');
      setPrecioPromo(6);
      setMontoMinimo(30);
    } else if (presetKey === 'PRODUCT_BOOST') {
      setTitulo('🛍️ 2x1 en Selección Especial');
      setTipoPromo('DOS_POR_UNO');
      setAlcance('PRODUCTOS');
    } else if (presetKey === 'HAPPY_HOUR') {
      setTitulo('🕐 Happy Hour 20% OFF (14:00 - 17:00)');
      setTipoPromo('PORCENTAJE');
      setPrecioPromo(20);
      setHoraInicioValida('14:00');
      setHoraFinValida('17:00');
    }
  };

  // ── CALCULA VISTA PREVIA EN TIEMPO REAL ─────────────────────────────────
  const sampleBasePrice = 30.00;
  const sampleShippingRealCost = 3.50;

  const calculatedDiscount = useMemo(() => {
    if (tipoPromo === 'PORCENTAJE') return Math.min(sampleBasePrice, sampleBasePrice * (precioPromo / 100));
    if (tipoPromo === 'DESCUENTO_FIJO' || tipoPromo === 'CUPON') return Math.min(sampleBasePrice, precioPromo);
    if (tipoPromo === 'DOS_POR_UNO' || tipoPromo === '2X1') return sampleBasePrice / 2;
    if (tipoPromo === 'TRES_POR_DOS' || tipoPromo === '3X2') return sampleBasePrice / 3;
    if (tipoPromo === 'PRECIO_ESPECIAL' || tipoPromo === 'COMBO') return Math.max(0, sampleBasePrice - precioPromo);
    return 0;
  }, [tipoPromo, precioPromo]);

  const calculatedShippingDiscount = useMemo(() => {
    if (tipoPromo !== 'ENVIO_GRATIS') return 0;
    if (esCostoCompleto) return sampleShippingRealCost;
    return Math.min(sampleShippingRealCost, costoMaximoSubsidiado || 0);
  }, [tipoPromo, esCostoCompleto, costoMaximoSubsidiado]);

  const customerShippingToPay = Math.max(0, sampleShippingRealCost - calculatedShippingDiscount);
  const merchantTotalSubsidy = calculatedDiscount + calculatedShippingDiscount;
  const finalEstimatedTotal = Math.max(0, sampleBasePrice - calculatedDiscount) + customerShippingToPay;

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      alert('Por favor ingresa un título para la promoción.');
      return;
    }

    onSave({
      titulo,
      descripcion,
      tipoPromo,
      precioPromo,
      precioAnterior,
      imagenUrl,
      fechaInicio,
      fechaFin,
      diasValidos,
      horaInicioValida,
      horaFinValida,
      canales,
      montoMinimo,
      cantidadMinima,
      productoRequeridoId,
      servicioRequeridoId,
      categoriaRequeridaId,
      profesionalId,
      cuponCodigo,
      tipoCliente,
      usosTotalesMaximo,
      usosPorClienteMaximo,
      goalPreset,
      alcance,
      distanciaMaximaKm,
      costoMaximoSubsidiado,
      esCostoCompleto,
      financiamiento,
      esCombinable,
      estado: initialData?.estado || 'ACTIVA'
    });
  };

  return (
    <form onSubmit={handleSaveSubmit} className="space-y-6 max-w-7xl mx-auto">
      {/* Header Constructor */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block">Constructor Universal Multi-Negocio</span>
          <h2 className="text-xl font-black text-slate-900 italic uppercase">
            {initialData ? '✏️ Editar Promoción' : '✨ Crear Nueva Promoción'}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Check size={16} /> Guardar Promoción
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA & CENTRAL (2 columnas): PASOS PROGRESIVOS */}
        <div className="lg:col-span-2 space-y-6">

          {/* PASO 0: OBJETIVO COMERCIAL */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 0</span>
              <h3 className="text-base font-black text-slate-900 uppercase">¿Qué quieres conseguir?</h3>
              <p className="text-xs text-slate-500 font-medium">Selecciona un objetivo para autoconfigurar las mejores recomendaciones.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'TODAY', label: '🔥 Vender más hoy', desc: 'Impulso inmediato' },
                { id: 'NEW_CLIENT', label: '👥 Nuevos clientes', desc: 'Cupones bienvenida' },
                { id: 'RECURRING_CLIENT', label: '🔄 Hacer volver', desc: 'Fidelización' },
                { id: 'ORDER_BOOST', label: '📦 Aumentar pedidos', desc: 'Compra mínima' },
                { id: 'PRODUCT_BOOST', label: '🛍️ Impulsar producto', desc: '2x1 / Ofertas' },
                { id: 'HAPPY_HOUR', label: '🕐 Llenar horarios', desc: 'Horas de baja demanda' },
                { id: 'CUSTOM', label: '🎁 Oferta libre', desc: 'Configuración manual' },
              ].map(item => {
                const isSelected = goalPreset === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectGoalPreset(item.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-amber-50 border-amber-500 text-amber-950 font-black shadow-xs ring-2 ring-amber-500/20' 
                        : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:border-amber-300'
                    }`}
                  >
                    <span className="text-xs font-black block">{item.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium mt-1">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PASO 1: BENEFICIO */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 1</span>
              <h3 className="text-base font-black text-slate-900 uppercase">Tipo de Beneficio</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'PORCENTAJE', label: 'Porcentaje %', icon: Percent },
                { id: 'DESCUENTO_FIJO', label: 'Monto Fijo ($)', icon: DollarSign },
                { id: 'PRECIO_ESPECIAL', label: 'Precio Especial', icon: Tag },
                { id: 'DOS_POR_UNO', label: '2x1 (Dos por Uno)', icon: Gift },
                { id: 'TRES_POR_DOS', label: '3x2 (Tres por Dos)', icon: Gift },
                { id: 'COMBO', label: 'Combo / Paquete', icon: Package },
                { id: 'ENVIO_GRATIS', label: 'Envío Gratis / Subsidio', icon: Truck },
                { id: 'CUPON', label: 'Cupón Promocional', icon: Tag },
                { id: 'CUSTOM', label: 'Personalizado', icon: Sparkles },
              ].map(b => {
                const IconC = b.icon;
                const isSelected = tipoPromo === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setTipoPromo(b.id)}
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected 
                        ? 'bg-purple-50 border-purple-600 text-purple-950 font-black shadow-xs' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-purple-300'
                    }`}
                  >
                    <IconC size={16} className={isSelected ? 'text-purple-600' : 'text-slate-400'} />
                    <span className="truncate">{b.label}</span>
                  </button>
                );
              })}
            </div>

            {/* FORMULARIO DINÁMICO DE BENEFICIO */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Título de la Promoción *</label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    placeholder="Ej: 15% OFF en Servicios Seleccionados"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    {tipoPromo === 'PORCENTAJE' ? 'Porcentaje (%)' : tipoPromo === 'DESCUENTO_FIJO' ? 'Monto Descuento ($)' : 'Precio Promocional ($)'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={precioPromo}
                    onChange={e => setPrecioPromo(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {tipoPromo === 'CUPON' && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Código del Cupón</label>
                  <input
                    type="text"
                    value={cuponCodigo}
                    onChange={e => setCuponCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej. BIENVENIDO"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-black text-purple-700 uppercase outline-none"
                  />
                </div>
              )}

              {tipoPromo === 'CUSTOM' && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Detalle del Beneficio Personalizado</label>
                  <input
                    type="text"
                    value={beneficioPersonalizado}
                    onChange={e => setBeneficioPersonalizado(e.target.value)}
                    placeholder="Ej. Regalo sorpresa en consumo superior a $40"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-medium outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Descripción / Leyenda Pública</label>
                <textarea
                  rows={2}
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Detalla los términos o instrucciones para el cliente..."
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* PASO 2: ALCANCE DE APLICACIÓN */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 2</span>
              <h3 className="text-base font-black text-slate-900 uppercase">Alcance (¿A qué aplica?)</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'PEDIDO_COMPLETO', label: '🛒 Pedido Completo' },
                { id: 'PRODUCTOS', label: '🛍️ Productos' },
                { id: 'SERVICIOS', label: '💆 Servicios / Citas' },
              ].map(al => (
                <button
                  key={al.id}
                  type="button"
                  onClick={() => setAlcance(al.id)}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                    alcance === al.id ? 'bg-amber-50 border-amber-600 text-amber-950 font-black shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {al.label}
                </button>
              ))}
            </div>

            {alcance === 'PRODUCTOS' && products && products.length > 0 && (
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Producto Requerido Específico</label>
                <select
                  value={productoRequeridoId}
                  onChange={e => setProductoRequeridoId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                >
                  <option value="">-- Todos los Productos del Catálogo --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} (${(Number(p.precio) || 0).toFixed(2)})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* PASO 3: CONDICIONES & REGLAS DE USO */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 3</span>
              <h3 className="text-base font-black text-slate-900 uppercase">Condiciones & Reglas de Aplicación</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Compra / Pedido Mínimo ($)</label>
                <input
                  type="number"
                  step="0.5"
                  value={montoMinimo}
                  onChange={e => setMontoMinimo(parseFloat(e.target.value) || 0)}
                  placeholder="0.00 (Sin mínimo)"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Segmento de Cliente</label>
                <select
                  value={tipoCliente}
                  onChange={e => setTipoCliente(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                >
                  <option value="ANY">👥 Todos los Clientes</option>
                  <option value="NEW">🆕 Clientes Nuevos (Primer Pedido)</option>
                  <option value="RECURRING">🔄 Clientes Recurrentes</option>
                </select>
              </div>
            </div>

            {/* Fechas & Horario */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-xs font-black uppercase text-slate-700 block">🗓️ Vigencia & Horario</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={e => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={e => setFechaFin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Días de la semana válidos</label>
                <div className="flex flex-wrap gap-1">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => {
                    const isChecked = diasValidos.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                          isChecked ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Hora Inicio (Opcional)</label>
                  <input
                    type="time"
                    value={horaInicioValida}
                    onChange={e => setHoraInicioValida(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Hora Fin (Opcional)</label>
                  <input
                    type="time"
                    value={horaFinValida}
                    onChange={e => setHoraFinValida(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PASO 4: CANALES DE VENTA */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 4</span>
              <h3 className="text-base font-black text-slate-900 uppercase">Canales de Venta Permitidos</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableChannelsList.map(ch => {
                const IconC = ch.icon;
                const isChecked = canales.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannel(ch.id)}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      isChecked ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <IconC size={16} className={isChecked ? 'text-amber-400' : 'text-slate-400'} />
                    <span className="truncate">{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PASO 5: REGLAS ESPECÍFICAS & FINANCIAMIENTO DE ENVÍO */}
          {tipoPromo === 'ENVIO_GRATIS' && (
            <div className="bg-white p-6 rounded-3xl border border-purple-200 shadow-sm space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider block">Paso 5</span>
                <h3 className="text-base font-black text-slate-900 uppercase">Configuración de Envío Subsidiado</h3>
              </div>

              <div className="space-y-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={esCostoCompleto}
                    onChange={e => {
                      setEsCostoCompleto(e.target.checked);
                      if (e.target.checked) setCostoMaximoSubsidiado(undefined);
                      else setCostoMaximoSubsidiado(3.00);
                    }}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Cubrir costo completo del envío (100% Envío Gratis)</span>
                </label>

                {!esCostoCompleto && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Subsidio Máximo de Envío ($)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={costoMaximoSubsidiado || ''}
                      onChange={e => setCostoMaximoSubsidiado(parseFloat(e.target.value) || 0)}
                      placeholder="Ej. 3.00"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* COLUMNA DERECHA (1 columna): PREVISUALIZACIÓN Y CALCULADORA EN TIEMPO REAL */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-5 sticky top-6 border border-slate-800">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Calculator className="size-5 text-amber-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Vista Previa & Calculadora</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80 space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-400 block">Título Promocional</span>
                <span className="text-sm font-bold text-white block">{titulo || 'Sin título configurado'}</span>
                {descripcion && <span className="text-[11px] text-slate-300 block italic">{descripcion}</span>}
              </div>

              {/* Desglose Simulado */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal Simulado:</span>
                  <span>${sampleBasePrice.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Descuento Beneficio:</span>
                  <span>-${calculatedDiscount.toFixed(2)}</span>
                </div>

                {tipoPromo === 'ENVIO_GRATIS' && (
                  <>
                    <div className="flex justify-between text-slate-400">
                      <span>Costo Envío Real:</span>
                      <span>${sampleShippingRealCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-purple-400 font-bold">
                      <span>Subsidio Envío Negocio:</span>
                      <span>-${calculatedShippingDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-400 font-bold">
                      <span>Envío a Pagar Cliente:</span>
                      <span>${customerShippingToPay.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-black">
                  <span className="text-white uppercase font-sans text-xs">Total Final Estimado</span>
                  <span className="text-amber-400">${finalEstimatedTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Asumido por Negocio */}
              <div className="p-3 bg-purple-950/60 border border-purple-800/60 rounded-2xl space-y-1">
                <span className="text-[10px] font-black uppercase text-purple-300 block">Financiamiento del Negocio</span>
                <span className="text-xs font-mono font-bold text-purple-200 block">
                  El negocio asume un descuento total de <strong className="text-white">${merchantTotalSubsidy.toFixed(2)}</strong> por cada orden.
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Check size={18} /> Guardar Promoción Universal
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
