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
  const [cuponTipoModalidad, setCuponTipoModalidad] = useState<'PORCENTAJE' | 'DESCUENTO_FIJO' | 'PRECIO_ESPECIAL'>(initialData?.cuponTipoModalidad || 'PORCENTAJE');
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

  const [activeTab, setActiveTab] = useState<number>(1);
  const [presetNotice, setPresetNotice] = useState<string | null>(null);

  // Aplicar Preset de Objetivo Comercial
  const handleSelectGoalPreset = (presetKey: string) => {
    setGoalPreset(presetKey);

    if (presetKey === 'TODAY') {
      setTitulo('🔥 Descuento Especial Hoy');
      setTipoPromo('PORCENTAJE');
      setPrecioPromo(15);
      setFechaFin(formatDateInput(null, 1));
      setPresetNotice('⚡ Preconfigurado: Oferta de 15% OFF válida para hoy.');
    } else if (presetKey === 'NEW_CLIENT') {
      setTitulo('🎁 15% OFF en Tu Primera Orden');
      setTipoPromo('CUPON');
      setCuponTipoModalidad('PORCENTAJE');
      setCuponCodigo('BIENVENIDO');
      setPrecioPromo(15);
      setTipoCliente('NEW');
      setMontoMinimo(15);
      setPresetNotice('⚡ Preconfigurado: Cupón BIENVENIDO del 15% OFF exclusivo para nuevos clientes.');
    } else if (presetKey === 'RECURRING_CLIENT') {
      setTitulo('🔄 Premio a Tu Fidelidad: $5.00 OFF');
      setTipoPromo('DESCUENTO_FIJO');
      setPrecioPromo(5);
      setTipoCliente('RECURRING');
      setPresetNotice('⚡ Preconfigurado: Descuento fijo de $5.00 para clientes frecuentes.');
    } else if (presetKey === 'ORDER_BOOST') {
      setTitulo('📦 $6.00 OFF en Pedidos Mayores a $30');
      setTipoPromo('DESCUENTO_FIJO');
      setPrecioPromo(6);
      setMontoMinimo(30);
      setPresetNotice('⚡ Preconfigurado: Descuento de $6.00 con pedido mínimo de $30.');
    } else if (presetKey === 'PRODUCT_BOOST') {
      setTitulo('🛍️ 2x1 en Selección Especial');
      setTipoPromo('DOS_POR_UNO');
      setAlcance('PRODUCTOS');
      setPresetNotice('⚡ Preconfigurado: Oferta 2x1 en platillos/productos seleccionados.');
    } else if (presetKey === 'HAPPY_HOUR') {
      setTitulo('🕐 Happy Hour 20% OFF (14:00 - 17:00)');
      setTipoPromo('PORCENTAJE');
      setPrecioPromo(20);
      setHoraInicioValida('14:00');
      setHoraFinValida('17:00');
      setPresetNotice('⚡ Preconfigurado: 20% OFF de 14:00 a 17:00.');
    } else {
      setPresetNotice('⚡ Modo libre: Configura manualmente cada campo.');
    }
  };

  // ── RESUMEN EN LENGUAJE HUMANO (EN TIEMPO REAL) ──────────────────────────
  const humanSummary = useMemo(() => {
    let benefitStr = '';
    if (tipoPromo === 'PORCENTAJE') benefitStr = `${precioPromo}% de descuento`;
    else if (tipoPromo === 'DESCUENTO_FIJO') benefitStr = `$${precioPromo.toFixed(2)} de descuento`;
    else if (tipoPromo === 'CUPON') {
      if (cuponTipoModalidad === 'PORCENTAJE') benefitStr = `${precioPromo}% de descuento con cupón ${cuponCodigo || 'CUPON'}`;
      else if (cuponTipoModalidad === 'DESCUENTO_FIJO') benefitStr = `$${precioPromo.toFixed(2)} de descuento con cupón ${cuponCodigo || 'CUPON'}`;
      else benefitStr = `precio especial $${precioPromo.toFixed(2)} con cupón ${cuponCodigo || 'CUPON'}`;
    }
    else if (tipoPromo === 'DOS_POR_UNO' || tipoPromo === '2X1') benefitStr = 'Oferta 2x1 (Dos por Uno)';
    else if (tipoPromo === 'TRES_POR_DOS' || tipoPromo === '3X2') benefitStr = 'Oferta 3x2 (Tres por Dos)';
    else if (tipoPromo === 'COMBO') benefitStr = `Combo / Paquete especial a $${precioPromo.toFixed(2)}`;
    else if (tipoPromo === 'ENVIO_GRATIS') benefitStr = esCostoCompleto ? '100% Envío Gratis' : `Subsidio de envío hasta $${costoMaximoSubsidiado}`;
    else if (tipoPromo === 'PRECIO_ESPECIAL') benefitStr = `Precio especial $${precioPromo.toFixed(2)}`;
    else benefitStr = beneficioPersonalizado || 'Beneficio personalizado';

    let targetStr = 'en todo el pedido';
    if (alcance === 'PRODUCTOS') {
      const pFound = products?.find(p => p.id === (servicioRequeridoId || productoRequeridoId));
      targetStr = pFound ? `en "${pFound.nombre}"` : (isRestaurant ? 'en platillos seleccionados' : 'en productos seleccionados');
    } else if (alcance === 'SERVICIOS') {
      const cFound = categories?.find(c => c.id === categoriaRequeridaId);
      targetStr = cFound ? `en la categoría "${cFound.nombre}"` : (isRestaurant ? 'en categorías del menú' : 'en servicios seleccionados');
    }

    let clientStr = 'para todos los clientes';
    if (tipoCliente === 'NEW') clientStr = 'exclusivo para clientes nuevos';
    else if (tipoCliente === 'RECURRING') clientStr = 'exclusivo para clientes frecuentes';

    let minStr = montoMinimo > 0 ? ` (compra mín. $${montoMinimo.toFixed(2)})` : '';

    return `Otorgará ${benefitStr} ${targetStr} ${clientStr}${minStr}.`;
  }, [tipoPromo, cuponTipoModalidad, precioPromo, cuponCodigo, beneficioPersonalizado, esCostoCompleto, costoMaximoSubsidiado, alcance, servicioRequeridoId, productoRequeridoId, categoriaRequeridaId, products, categories, isRestaurant, tipoCliente, montoMinimo]);

  // ── CALCULA VISTA PREVIA EN TIEMPO REAL ─────────────────────────────────
  const sampleBasePrice = 30.00;
  const sampleShippingRealCost = 3.50;

  const calculatedDiscount = useMemo(() => {
    if (tipoPromo === 'PORCENTAJE') return Math.min(sampleBasePrice, sampleBasePrice * (precioPromo / 100));
    if (tipoPromo === 'DESCUENTO_FIJO') return Math.min(sampleBasePrice, precioPromo);
    if (tipoPromo === 'CUPON') {
      if (cuponTipoModalidad === 'PORCENTAJE') return Math.min(sampleBasePrice, sampleBasePrice * (precioPromo / 100));
      if (cuponTipoModalidad === 'DESCUENTO_FIJO') return Math.min(sampleBasePrice, precioPromo);
      return Math.max(0, sampleBasePrice - precioPromo);
    }
    if (tipoPromo === 'DOS_POR_UNO' || tipoPromo === '2X1') return sampleBasePrice / 2;
    if (tipoPromo === 'TRES_POR_DOS' || tipoPromo === '3X2') return sampleBasePrice / 3;
    if (tipoPromo === 'PRECIO_ESPECIAL' || tipoPromo === 'COMBO') return Math.max(0, sampleBasePrice - precioPromo);
    return 0;
  }, [tipoPromo, precioPromo, cuponTipoModalidad]);

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
      tipoPromo: tipoPromo === 'CUPON' && cuponTipoModalidad === 'PORCENTAJE' ? 'PORCENTAJE' : tipoPromo,
      cuponTipoModalidad,
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
    <form onSubmit={handleSaveSubmit} className="space-y-6 max-w-7xl mx-auto select-none">
      {/* Header Constructor */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block">Asistente Inteligente de Promociones</span>
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

      {/* ── BARRA PESTAÑAS INTUITIVAS DE PASOS ── */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab(1)}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 1
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
          }`}
        >
          <span>1. 🎯 Objetivo & Beneficio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(2)}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 2
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
          }`}
        >
          <span>2. 📦 Alcance ({isRestaurant ? 'Menú / Platillos' : 'Productos / Servicios'})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(3)}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 3
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
          }`}
        >
          <span>3. 🗓️ Reglas, Vigencia & Canales</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA & CENTRAL (2 columnas) */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── PESTAÑA 1: OBJETIVO Y TIPO DE BENEFICIO ── */}
          {activeTab === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* PASO 0: OBJETIVO COMERCIAL */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 0</span>
                  <h3 className="text-base font-black text-slate-900 uppercase">¿Qué quieres conseguir?</h3>
                  <p className="text-xs text-slate-500 font-medium">Selecciona un objetivo y autoconfiguraremos las mejores reglas para tu negocio.</p>
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

                {presetNotice && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-extrabold text-amber-900 animate-in fade-in duration-200 flex items-center justify-between">
                    <span>{presetNotice}</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab(2)}
                      className="text-[11px] font-black text-amber-700 hover:underline flex items-center gap-1 shrink-0 ml-2"
                    >
                      <span>Siguiente: Alcance</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* PASO 1: BENEFICIO CATEGORIZADO */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 1</span>
                  <h3 className="text-base font-black text-slate-900 uppercase">Selecciona el Tipo de Beneficio</h3>
                </div>

                {/* Categorías de Beneficios */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'PORCENTAJE', label: 'Porcentaje %', icon: Percent },
                    { id: 'DESCUENTO_FIJO', label: 'Monto Fijo ($)', icon: DollarSign },
                    { id: 'PRECIO_ESPECIAL', label: 'Precio Especial', icon: Tag },
                    { id: 'DOS_POR_UNO', label: '2x1 (Dos por Uno)', icon: Gift },
                    { id: 'TRES_POR_DOS', label: '3x2 (Tres por Dos)', icon: Gift },
                    { id: 'COMBO', label: 'Combo / Paquete', icon: Package },
                    { id: 'ENVIO_GRATIS', label: 'Envío Gratis', icon: Truck },
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
                        placeholder="Ej: 20% OFF con Cupón PROMO10"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-amber-500"
                      />
                    </div>

                    {tipoPromo !== 'CUPON' && (
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
                    )}
                  </div>

                  {/* OPCIONES AVANZADAS DE CUPÓN PROMOCIONAL */}
                  {tipoPromo === 'CUPON' && (
                    <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-3">
                      <div>
                        <label className="text-[10px] font-black uppercase text-purple-900 block mb-1.5">
                          Modalidad del Cupón (Porcentaje % o Monto Fijo $)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'PORCENTAJE', label: 'Porcentaje (%)' },
                            { id: 'DESCUENTO_FIJO', label: 'Monto Fijo ($)' },
                            { id: 'PRECIO_ESPECIAL', label: 'Precio Especial ($)' },
                          ].map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setCuponTipoModalidad(m.id as any)}
                              className={`py-2 px-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer text-center ${
                                cuponTipoModalidad === m.id
                                  ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Código del Cupón *</label>
                          <input
                            type="text"
                            required
                            value={cuponCodigo}
                            onChange={e => setCuponCodigo(e.target.value.toUpperCase())}
                            placeholder="Ej. PROMO10"
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-black text-purple-700 uppercase outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                            {cuponTipoModalidad === 'PORCENTAJE' ? 'Porcentaje (%) *' : cuponTipoModalidad === 'DESCUENTO_FIJO' ? 'Monto Descuento ($) *' : 'Precio Promocional ($) *'}
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={precioPromo}
                            onChange={e => setPrecioPromo(parseFloat(e.target.value) || 0)}
                            placeholder={cuponTipoModalidad === 'PORCENTAJE' ? 'Ej: 20 (% OFF)' : 'Ej: 5.00'}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-slate-900 outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
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

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab(2)}
                    className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>Paso 2: Alcance (¿A qué aplica?)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── PESTAÑA 2: ALCANCE ── */}
          {activeTab === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 2</span>
                  <h3 className="text-base font-black text-slate-900 uppercase">Alcance (¿A qué aplica esta oferta?)</h3>
                  <p className="text-xs text-slate-500 font-medium">Determina si el beneficio aplica a todo el catálogo o a ítems específicos.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'PEDIDO_COMPLETO', label: isBeautySpa ? '🛒 Todo el Servicio' : isRestaurant ? '🛒 Todo el Pedido' : '🛒 Pedido Completo' },
                    { id: 'PRODUCTOS', label: isBeautySpa ? '🛍️ Productos' : isRestaurant ? '🍔 Platillos / Bebidas' : '🛍️ Productos' },
                    { id: 'SERVICIOS', label: isBeautySpa ? '💆 Servicios / Citas' : isRestaurant ? '📋 Categorías del Menú' : '💼 Servicios' },
                  ].map(al => (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() => setAlcance(al.id)}
                      className={`p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                        alcance === al.id ? 'bg-amber-50 border-amber-600 text-amber-950 font-black shadow-xs ring-2 ring-amber-500/20' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {al.label}
                    </button>
                  ))}
                </div>

                {(alcance === 'PRODUCTOS' || alcance === 'SERVICIOS') && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                        {isBeautySpa || isLaundry ? '📌 Servicio Específico Asignado' : '📌 Platillo / Producto Específico'}
                      </label>
                      <select
                        value={servicioRequeridoId || productoRequeridoId}
                        onChange={e => {
                          const val = e.target.value;
                          setServicioRequeridoId(val);
                          setProductoRequeridoId(val);
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-amber-500"
                      >
                        <option value="">
                          {isBeautySpa || isLaundry ? '-- Todos los Servicios --' : '-- Todo el Catálogo de Platillos --'}
                        </option>
                        {products && products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} {p.precio ? `($${(Number(p.precio) || 0).toFixed(2)})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {categories && categories.length > 0 && (
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                          🏷️ Categoría Específica del Menú
                        </label>
                        <select
                          value={categoriaRequeridaId}
                          onChange={e => setCategoriaRequeridaId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-amber-500"
                        >
                          <option value="">-- Todas las Categorías --</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab(1)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    ← Paso Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab(3)}
                    className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>Paso 3: Vigencia & Canales</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── PESTAÑA 3: REGLAS, VIGENCIA & CANALES ── */}
          {activeTab === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* CONDICIONES DE COMPRA Y CLIENTES */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 3</span>
                  <h3 className="text-base font-black text-slate-900 uppercase">Reglas & Segmento de Cliente</h3>
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
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <span className="text-xs font-black uppercase text-slate-700 block">🗓️ Vigencia & Horarios</span>
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
                    <div className="flex flex-wrap gap-1.5">
                      {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => {
                        const isChecked = diasValidos.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isChecked ? 'bg-amber-500 text-slate-950 font-black shadow-2xs' : 'bg-slate-100 text-slate-600'
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

              {/* CANALES DE VENTA */}
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
                          isChecked ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <IconC size={16} className={isChecked ? 'text-slate-950' : 'text-slate-400'} />
                        <span className="truncate">{ch.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-start pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab(2)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    ← Paso Anterior
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA (1 columna): RESUMEN HUMANO & CALCULADORA EN TIEMPO REAL */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-5 sticky top-6 border border-slate-800">
            {/* RESUMEN EN LENGUAJE NATURAL */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 p-4 rounded-2xl space-y-1.5">
              <span className="text-[10px] font-black uppercase text-amber-400 block tracking-widest">
                ✨ Resumen de la Promoción
              </span>
              <p className="text-xs font-medium text-amber-100 leading-relaxed">
                {humanSummary}
              </p>
            </div>

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
              <Check size={18} /> Guardar Promoción
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
