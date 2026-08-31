'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, Check, Clock, Users, Truck, ShoppingBag, Store, Utensils, Globe, 
  Calendar, Percent, DollarSign, Gift, Package, Tag, ChevronRight, Flame, 
  Calculator, ArrowRight, ArrowLeft, Search, X, AlertTriangle, ShieldCheck, 
  HelpCircle, Settings, Layers, Zap, Info, ChevronDown
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
  products = [],
  categories = [],
  initialData,
  onSave,
  onCancel,
  negocio,
}: PromotionBuilderProps) {
  // ── ESTADO DE NAVEGACIÓN Y PASOS ──────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);

  // ── PASO 1: ALCANCE / TARGET DE LA PROMOCIÓN ─────────────────────────────
  // 'PEDIDO_COMPLETO' | 'PRODUCTOS' | 'SERVICIOS' | 'COMBO' | 'ENVIO_GRATIS'
  const [alcance, setAlcance] = useState<string>(initialData?.alcance || 'PEDIDO_COMPLETO');
  const [productoRequeridoId, setProductoRequeridoId] = useState<string>(initialData?.productoRequeridoId || initialData?.servicioRequeridoId || '');
  const [categoriaRequeridaId, setCategoriaRequeridaId] = useState<string>(initialData?.categoriaRequeridaId || '');
  const [productosRelacionados, setProductosRelacionados] = useState<string[]>(initialData?.productosRelacionados || []);

  // ── PASO 2: TIPO DE BENEFICIO / OFERTA ────────────────────────────────────
  // 'PORCENTAJE' | 'DESCUENTO_FIJO' | 'PRECIO_ESPECIAL' | 'DOS_POR_UNO' | 'TRES_POR_DOS' | 'COMBO' | 'ENVIO_GRATIS' | 'CUPON' | 'CUSTOM'
  const [tipoPromo, setTipoPromo] = useState<string>(initialData?.tipoPromo || 'PORCENTAJE');
  const [cuponTipoModalidad, setCuponTipoModalidad] = useState<'PORCENTAJE' | 'DESCUENTO_FIJO' | 'PRECIO_ESPECIAL'>(initialData?.cuponTipoModalidad || 'PORCENTAJE');

  // ── PASO 3: MONTO & CÁLCULOS ─────────────────────────────────────────────
  const [precioPromo, setPrecioPromo] = useState<number>(initialData?.precioPromo !== undefined ? Number(initialData.precioPromo) : 15);
  const [precioAnteriorInput, setPrecioAnteriorInput] = useState<number | undefined>(initialData?.precioAnterior ? Number(initialData.precioAnterior) : undefined);
  const [beneficioPersonalizado, setBeneficioPersonalizado] = useState<string>(initialData?.beneficioPersonalizado || '');
  const [cuponCodigo, setCuponCodigo] = useState<string>(initialData?.cuponCodigo || '');

  // Reglas de Envío Gratis
  const [esCostoCompleto, setEsCostoCompleto] = useState<boolean>(initialData?.esCostoCompleto ?? true);
  const [costoMaximoSubsidiado, setCostoMaximoSubsidiado] = useState<number | undefined>(initialData?.costoMaximoSubsidiado);
  const [distanciaMaximaKm, setDistanciaMaximaKm] = useState<number | undefined>(initialData?.distanciaMaximaKm);
  const [financiamiento, setFinanciamiento] = useState<'NEGOCIO' | 'CLIENTE' | 'PLATAFORMA' | 'COMPARTIDO'>(initialData?.financiamiento || 'NEGOCIO');

  // ── PASO 4: REGLAS DE VIGENCIA Y SEGMENTACIÓN ────────────────────────────
  const formatDateInput = (val: any, fallbackDays = 0) => {
    if (!val) {
      const d = new Date();
      d.setDate(d.getDate() + fallbackDays);
      return d.toISOString().split('T')[0];
    }
    if (typeof val === 'string') return val.split('T')[0];
    if (val instanceof Date) return val.toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  };

  const [tipoCliente, setTipoCliente] = useState<'ANY' | 'NEW' | 'RECURRING'>(initialData?.tipoCliente || 'ANY');
  const [montoMinimo, setMontoMinimo] = useState<number>(initialData?.montoMinimo || 0);
  const [usosTotalesMaximo, setUsosTotalesMaximo] = useState<number | undefined>(initialData?.usosTotalesMaximo);
  const [usosPorClienteMaximo, setUsosPorClienteMaximo] = useState<number | undefined>(initialData?.usosPorClienteMaximo);

  const [fechaInicio, setFechaInicio] = useState<string>(formatDateInput(initialData?.fechaInicio, 0));
  const [fechaFin, setFechaFin] = useState<string>(formatDateInput(initialData?.fechaFin, 30));
  const [diasValidos, setDiasValidos] = useState<string[]>(() => {
    if (!initialData?.diasValidos) return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    if (Array.isArray(initialData.diasValidos)) return initialData.diasValidos;
    return String(initialData.diasValidos).split(',').map(s => s.trim());
  });
  const [horaInicioValida, setHoraInicioValida] = useState<string>(initialData?.horaInicioValida || '');
  const [horaFinValida, setHoraFinValida] = useState<string>(initialData?.horaFinValida || '');

  // Canales y Metadata
  const defaultInitialChannels = ['POS', 'ONLINE', 'DELIVERY', 'PICKUP', 'LANDING'];
  const [canales, setCanales] = useState<string[]>(initialData?.canales || defaultInitialChannels);
  const [esCombinable, setEsCombinable] = useState<boolean>(initialData?.esCombinable || false);
  const [goalPreset, setGoalPreset] = useState<string>(initialData?.goalPreset || 'CUSTOM');

  // ── PASO 5: TÍTULO, DESCRIPCIÓN E IMAGEN ───────────────────────────────────
  const [titulo, setTitulo] = useState<string>(initialData?.titulo || '');
  const [descripcion, setDescripcion] = useState<string>(initialData?.descripcion || '');
  const [imagenUrl, setImagenUrl] = useState<string>(initialData?.imagenUrl || '');
  const [userEditedTitle, setUserEditedTitle] = useState<boolean>(!!initialData?.titulo);

  // ── EFECTOS DE AUTOMATIZACIÓN DE VALORES ──────────────────────────────────

  // Obtener producto y categoría seleccionados
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === productoRequeridoId) || null;
  }, [products, productoRequeridoId]);

  const selectedCategory = useMemo(() => {
    return categories.find(c => c.id === categoriaRequeridaId) || null;
  }, [categories, categoriaRequeridaId]);

  const selectedComboProducts = useMemo(() => {
    return products.filter(p => productosRelacionados.includes(p.id));
  }, [products, productosRelacionados]);

  // Precio base real de referencia
  const basePrice = useMemo(() => {
    if (alcance === 'PRODUCTOS' && selectedProduct) {
      return Number(selectedProduct.precio) || 0;
    }
    if (alcance === 'COMBO' && selectedComboProducts.length > 0) {
      return selectedComboProducts.reduce((sum, p) => sum + (Number(p.precio) || 0), 0);
    }
    if (precioAnteriorInput) return precioAnteriorInput;
    return 15.00; // Valor simulado general
  }, [alcance, selectedProduct, selectedComboProducts, precioAnteriorInput]);

  // Autogenerar título y descripción inteligentes si el usuario no los ha personalizado
  useEffect(() => {
    if (userEditedTitle) return;

    let autoTitle = '';
    let autoDesc = '';

    if (tipoPromo === 'PRECIO_ESPECIAL' && selectedProduct) {
      autoTitle = `🔥 ${selectedProduct.nombre} a $${precioPromo.toFixed(2)}`;
      autoDesc = `Disfruta nuestra ${selectedProduct.nombre} a precio preferencial por tiempo limitado.`;
    } else if (tipoPromo === 'PORCENTAJE') {
      const targetStr = selectedProduct ? selectedProduct.nombre : selectedCategory ? `categoría ${selectedCategory.nombre}` : 'todo el menú';
      autoTitle = `⚡ ${precioPromo}% OFF en ${targetStr}`;
      autoDesc = `Aprovecha el ${precioPromo}% de descuento especial en ${targetStr}.`;
    } else if (tipoPromo === 'DESCUENTO_FIJO') {
      const targetStr = selectedProduct ? selectedProduct.nombre : 'tu pedido';
      autoTitle = `📦 $${precioPromo.toFixed(2)} OFF en ${targetStr}`;
      autoDesc = `Obtén $${precioPromo.toFixed(2)} de descuento directo en tu consumo.`;
    } else if (tipoPromo === 'DOS_POR_UNO' || tipoPromo === '2X1') {
      const prodStr = selectedProduct ? selectedProduct.nombre : 'Platillos Seleccionados';
      autoTitle = `🎁 2x1 en ${prodStr}`;
      autoDesc = `Compra 1 ${prodStr} y lleva el segundo totalmente gratis.`;
    } else if (tipoPromo === 'TRES_POR_DOS' || tipoPromo === '3X2') {
      const prodStr = selectedProduct ? selectedProduct.nombre : 'Platillos Seleccionados';
      autoTitle = `🎁 3x2 en ${prodStr}`;
      autoDesc = `Lleva 3 ${prodStr} y paga únicamente 2.`;
    } else if (tipoPromo === 'COMBO') {
      const count = selectedComboProducts.length;
      autoTitle = `🍔 Combo Especial ${count > 0 ? `(${count} productos)` : ''} a $${precioPromo.toFixed(2)}`;
      autoDesc = selectedComboProducts.length > 0 ? `Incluye: ${selectedComboProducts.map(p => p.nombre).join(' + ')}` : 'Paquete especial del menú a precio reducido.';
    } else if (tipoPromo === 'ENVIO_GRATIS') {
      autoTitle = esCostoCompleto ? '🚚 100% Envío Gratis' : `💰 Subsidio de Envío $${(costoMaximoSubsidiado || 0).toFixed(2)} OFF`;
      autoDesc = 'Descuento especial en el costo de entrega a domicilio.';
    } else if (tipoPromo === 'CUPON') {
      autoTitle = `🎟️ Cupón ${cuponCodigo || 'PROMO'}: ${precioPromo}${cuponTipoModalidad === 'PORCENTAJE' ? '% OFF' : ' OFF'}`;
      autoDesc = `Aplica el código ${cuponCodigo || 'PROMO'} al finalizar tu pedido.`;
    } else if (tipoPromo === 'CUSTOM') {
      autoTitle = beneficioPersonalizado || '🎁 Promoción Especial';
      autoDesc = 'Oferta exclusiva disponible por tiempo limitado.';
    }

    if (autoTitle) setTitulo(autoTitle);
    if (autoDesc) setDescripcion(autoDesc);
  }, [tipoPromo, alcance, selectedProduct, selectedCategory, selectedComboProducts, precioPromo, cuponCodigo, cuponTipoModalidad, esCostoCompleto, costoMaximoSubsidiado, beneficioPersonalizado, userEditedTitle]);

  // CÁLCULOS MATEMÁTICOS INTELIGENTES EN TIEMPO REAL PARA LA PREVISUALIZACIÓN VIVA
  const previewCalculation = useMemo(() => {
    let totalNormal = basePrice;
    let totalPromo = basePrice;
    let savings = 0;
    let percentageOff = 0;

    if (tipoPromo === 'PRECIO_ESPECIAL') {
      totalNormal = basePrice;
      totalPromo = Math.max(0, precioPromo);
      savings = Math.max(0, totalNormal - totalPromo);
      percentageOff = totalNormal > 0 ? Math.min(100, Math.round((savings / totalNormal) * 100)) : 0;
    } else if (tipoPromo === 'PORCENTAJE') {
      totalNormal = basePrice;
      percentageOff = Math.min(100, Math.max(0, precioPromo));
      savings = totalNormal * (percentageOff / 100);
      totalPromo = Math.max(0, totalNormal - savings);
    } else if (tipoPromo === 'DESCUENTO_FIJO') {
      totalNormal = basePrice;
      savings = Math.min(totalNormal, Math.max(0, precioPromo));
      totalPromo = Math.max(0, totalNormal - savings);
      percentageOff = totalNormal > 0 ? Math.min(100, Math.round((savings / totalNormal) * 100)) : 0;
    } else if (tipoPromo === 'DOS_POR_UNO' || tipoPromo === '2X1') {
      totalNormal = basePrice * 2;
      totalPromo = basePrice;
      savings = basePrice;
      percentageOff = 50;
    } else if (tipoPromo === 'TRES_POR_DOS' || tipoPromo === '3X2') {
      totalNormal = basePrice * 3;
      totalPromo = basePrice * 2;
      savings = basePrice;
      percentageOff = 33;
    } else if (tipoPromo === 'COMBO') {
      totalNormal = basePrice;
      totalPromo = Math.max(0, precioPromo);
      savings = Math.max(0, totalNormal - totalPromo);
      percentageOff = totalNormal > 0 ? Math.min(100, Math.round((savings / totalNormal) * 100)) : 0;
    } else if (tipoPromo === 'ENVIO_GRATIS') {
      totalNormal = 2.50;
      savings = esCostoCompleto ? 2.50 : Math.min(2.50, costoMaximoSubsidiado || 0);
      totalPromo = Math.max(0, totalNormal - savings);
      percentageOff = esCostoCompleto ? 100 : Math.round((savings / 2.50) * 100);
    } else if (tipoPromo === 'CUPON') {
      totalNormal = basePrice;
      if (cuponTipoModalidad === 'PORCENTAJE') {
        percentageOff = Math.min(100, Math.max(0, precioPromo));
        savings = totalNormal * (percentageOff / 100);
        totalPromo = Math.max(0, totalNormal - savings);
      } else if (cuponTipoModalidad === 'DESCUENTO_FIJO') {
        savings = Math.min(totalNormal, Math.max(0, precioPromo));
        totalPromo = Math.max(0, totalNormal - savings);
        percentageOff = totalNormal > 0 ? Math.min(100, Math.round((savings / totalNormal) * 100)) : 0;
      } else {
        totalPromo = Math.max(0, precioPromo);
        savings = Math.max(0, totalNormal - totalPromo);
        percentageOff = totalNormal > 0 ? Math.min(100, Math.round((savings / totalNormal) * 100)) : 0;
      }
    }

    return {
      totalNormal,
      totalPromo,
      savings,
      percentageOff
    };
  }, [tipoPromo, basePrice, precioPromo, esCostoCompleto, costoMaximoSubsidiado, cuponTipoModalidad]);

  // VALIDACIONES EN TIEMPO REAL
  const validationError = useMemo(() => {
    if (currentStep >= 3) {
      if (tipoPromo === 'PORCENTAJE' && precioPromo > 100) {
        return '⚠️ El porcentaje de descuento no puede superar el 100%.';
      }
      if (tipoPromo === 'PORCENTAJE' && precioPromo <= 0) {
        return '⚠️ Ingresa un porcentaje válido mayor a 0%.';
      }
      if (tipoPromo === 'PRECIO_ESPECIAL' && selectedProduct && precioPromo >= selectedProduct.precio) {
        return `⚠️ El precio promocional ($${precioPromo.toFixed(2)}) debe ser menor al precio normal ($${selectedProduct.precio.toFixed(2)}).`;
      }
      if (tipoPromo === 'DESCUENTO_FIJO' && selectedProduct && precioPromo >= selectedProduct.precio) {
        return `⚠️ El descuento ($${precioPromo.toFixed(2)}) no puede ser mayor o igual al precio del platillo ($${selectedProduct.precio.toFixed(2)}).`;
      }
      if (tipoPromo === 'CUPON' && !cuponCodigo.trim()) {
        return '⚠️ Por favor escribe el código del cupón (ej. VERANO10).';
      }
      if (tipoPromo === 'COMBO' && selectedComboProducts.length === 0) {
        return '⚠️ Selecciona al menos 1 platillo para formar el combo.';
      }
      if (fechaFin && fechaInicio && new Date(fechaFin) < new Date(fechaInicio)) {
        return '⚠️ La fecha de fin no puede ser anterior a la fecha de inicio.';
      }
    }
    return null;
  }, [currentStep, tipoPromo, precioPromo, selectedProduct, cuponCodigo, selectedComboProducts, fechaFin, fechaInicio]);

  // APLICAR SUGERENCIA DE OBJETIVO INTELIGENTE
  const handleApplyPreset = (presetKey: string) => {
    setGoalPreset(presetKey);
    const todayStr = formatDateInput(null, 0);

    if (presetKey === 'TODAY') {
      setAlcance('PEDIDO_COMPLETO');
      setTipoPromo('PORCENTAJE');
      setPrecioPromo(15);
      setMontoMinimo(0);
      setTipoCliente('ANY');
      setFechaInicio(todayStr);
      setFechaFin(todayStr);
    } else if (presetKey === 'NEW_CLIENT') {
      setAlcance('PEDIDO_COMPLETO');
      setTipoPromo('CUPON');
      setCuponTipoModalidad('PORCENTAJE');
      setCuponCodigo('BIENVENIDO15');
      setPrecioPromo(15);
      setMontoMinimo(12);
      setTipoCliente('NEW');
      setFechaInicio(todayStr);
      setFechaFin(formatDateInput(null, 30));
    } else if (presetKey === 'RECURRING_CLIENT') {
      setAlcance('PEDIDO_COMPLETO');
      setTipoPromo('DESCUENTO_FIJO');
      setPrecioPromo(5);
      setMontoMinimo(20);
      setTipoCliente('RECURRING');
      setFechaInicio(todayStr);
      setFechaFin(formatDateInput(null, 30));
    } else if (presetKey === 'HAPPY_HOUR') {
      setAlcance('PEDIDO_COMPLETO');
      setTipoPromo('PORCENTAJE');
      setPrecioPromo(20);
      setMontoMinimo(0);
      setTipoCliente('ANY');
      setFechaInicio(todayStr);
      setFechaFin(formatDateInput(null, 30));
      setDiasValidos(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);
      setHoraInicioValida('14:00');
      setHoraFinValida('17:00');
    }
  };

  // HANDLER SUBMIT FINAL
  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim()) {
      alert('Por favor ingresa un título para la promoción.');
      return;
    }

    if (validationError) {
      alert(validationError);
      return;
    }

    onSave({
      titulo,
      descripcion,
      tipoPromo: tipoPromo === 'CUPON' && cuponTipoModalidad === 'PORCENTAJE' ? 'PORCENTAJE' : tipoPromo,
      cuponTipoModalidad,
      precioPromo,
      precioAnterior: basePrice,
      imagenUrl: imagenUrl || (selectedProduct?.imagenUrl || ''),
      fechaInicio,
      fechaFin,
      diasValidos,
      horaInicioValida,
      horaFinValida,
      canales,
      montoMinimo,
      cantidadMinima: 0,
      productoRequeridoId,
      servicioRequeridoId: productoRequeridoId,
      categoriaRequeridaId,
      cuponCodigo,
      tipoCliente,
      usosTotalesMaximo,
      usosPorClienteMaximo,
      productosRelacionados: alcance === 'COMBO' ? productosRelacionados : [],
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

  const toggleDay = (day: string) => {
    setDiasValidos(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const toggleChannel = (chId: string) => {
    setCanales(prev => prev.includes(chId) ? prev.filter(c => c !== chId) : [...prev, chId]);
  };

  const toggleComboProduct = (pId: string) => {
    setProductosRelacionados(prev => 
      prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
    );
  };

  // ── RENDERIZADO COMPONENTE ────────────────────────────────────────────────
  return (
    <form onSubmit={handleSaveSubmit} className="space-y-6 max-w-7xl mx-auto select-none pb-16">
      
      {/* ── HEADER PRINCIPAL INTUITIVO ── */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500 text-slate-950 rounded-2xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block">Asistente de Promociones Gastronómicas</span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 italic uppercase">
                {initialData ? '✏️ Editar Oferta' : '✨ Crear Nueva Oferta para Restaurante'}
              </h2>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
          >
            Cancelar
          </button>
          {currentStep === 5 ? (
            <button
              type="submit"
              disabled={!!validationError}
              className="py-2.5 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={18} /> Publicar Oferta
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
              className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer transition-all flex items-center gap-2"
            >
              <span>Continuar</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── INDICADOR DE PASOS Y WIZARD PROGRESS BAR (MOBILE & DESKTOP) ── */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-1 overflow-x-auto">
        {[
          { step: 1, label: '1. ¿Qué promocionar?' },
          { step: 2, label: '2. ¿Qué oferta?' },
          { step: 3, label: '3. Configura' },
          { step: 4, label: '4. ¿Cuándo y para quién?' },
          { step: 5, label: '5. Publicar' },
        ].map(s => {
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step)}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isActive 
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-500/20' 
                  : isDone
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-500'
              }`}
            >
              <span>{isDone ? '✓' : s.step}</span>
              <span className="truncate">{s.label.split('. ')[1]}</span>
            </button>
          );
        })}
      </div>

      {/* ── GRID PRINCIPAL DE 2 COLUMNAS (CONFIGURADOR E IZQ + PREVIEW EN DER) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA (2 COLS): FLUJO DE PASOS INTUITIVOS */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── PASO 1: ¿QUÉ QUIERES PROMOCIONAR? ── */}
          {currentStep === 1 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-200">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 1</span>
                <h3 className="text-lg font-black text-slate-900 uppercase">¿Qué quieres promocionar?</h3>
                <p className="text-xs text-slate-500 font-medium">Selecciona qué elemento de tu menú o servicio recibirá la oferta.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 🍔 Un Producto / Platillo */}
                <button
                  type="button"
                  onClick={() => {
                    setAlcance('PRODUCTOS');
                    if (!productoRequeridoId) setShowProductModal(true);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                    alcance === 'PRODUCTOS'
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <span className="p-3 bg-amber-500 text-slate-950 rounded-xl font-black text-xl shrink-0">🍔</span>
                  <div>
                    <span className="text-sm font-black text-slate-900 block">Un Platillo o Bebida</span>
                    <span className="text-xs text-slate-500 font-medium leading-relaxed block mt-0.5">
                      Promociona un elemento específico de tu catálogo (ej. Hamburguesa Clásica).
                    </span>
                    {selectedProduct && alcance === 'PRODUCTOS' && (
                      <span className="inline-flex items-center gap-1 mt-2 text-xs font-black text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-lg">
                        <span>Seleccionado: {selectedProduct.nombre} (${(Number(selectedProduct.precio) || 0).toFixed(2)})</span>
                      </span>
                    )}
                  </div>
                </button>

                {/* 📂 Una Categoría */}
                <button
                  type="button"
                  onClick={() => {
                    setAlcance('SERVICIOS');
                    if (!categoriaRequeridaId) setShowCategoryModal(true);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                    alcance === 'SERVICIOS'
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <span className="p-3 bg-orange-500 text-white rounded-xl font-black text-xl shrink-0">📂</span>
                  <div>
                    <span className="text-sm font-black text-slate-900 block">Una Categoría del Menú</span>
                    <span className="text-xs text-slate-500 font-medium leading-relaxed block mt-0.5">
                      Aplica la oferta a todos los platillos de una categoría (ej. Pizzas o Bebidas).
                    </span>
                    {selectedCategory && alcance === 'SERVICIOS' && (
                      <span className="inline-flex items-center gap-1 mt-2 text-xs font-black text-orange-900 bg-orange-200/80 px-2.5 py-1 rounded-lg">
                        <span>Categoría: {selectedCategory.nombre}</span>
                      </span>
                    )}
                  </div>
                </button>

                {/* 🛒 Todo el Pedido */}
                <button
                  type="button"
                  onClick={() => {
                    setAlcance('PEDIDO_COMPLETO');
                    setProductoRequeridoId('');
                    setCategoriaRequeridaId('');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                    alcance === 'PEDIDO_COMPLETO'
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <span className="p-3 bg-slate-900 text-amber-400 rounded-xl font-black text-xl shrink-0">🛒</span>
                  <div>
                    <span className="text-sm font-black text-slate-900 block">Todo el Pedido</span>
                    <span className="text-xs text-slate-500 font-medium leading-relaxed block mt-0.5">
                      Aplica el descuento al valor total del consumo de la mesa o pedido online.
                    </span>
                  </div>
                </button>

                {/* 🍔 Crear un Combo */}
                <button
                  type="button"
                  onClick={() => {
                    setAlcance('COMBO');
                    setTipoPromo('COMBO');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                    alcance === 'COMBO'
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <span className="p-3 bg-purple-600 text-white rounded-xl font-black text-xl shrink-0">🎁</span>
                  <div>
                    <span className="text-sm font-black text-slate-900 block">Crear un Combo / Paquete</span>
                    <span className="text-xs text-slate-500 font-medium leading-relaxed block mt-0.5">
                      Agrupa varios platillos (Plato + Acompañante + Bebida) a un precio único.
                    </span>
                  </div>
                </button>

                {/* 🚚 El Envío */}
                <button
                  type="button"
                  onClick={() => {
                    setAlcance('ENVIO_GRATIS');
                    setTipoPromo('ENVIO_GRATIS');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                    alcance === 'ENVIO_GRATIS'
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <span className="p-3 bg-blue-600 text-white rounded-xl font-black text-xl shrink-0">🚚</span>
                  <div>
                    <span className="text-sm font-black text-slate-900 block">El Envío (Delivery)</span>
                    <span className="text-xs text-slate-500 font-medium leading-relaxed block mt-0.5">
                      Crea una promoción de envío gratis o subsidio parcial de flete.
                    </span>
                  </div>
                </button>
              </div>

              {/* BOTONES DIRECTOS PARA CAMBIAR O ELEGIR PRODUCTO / CATEGORÍA */}
              {alcance === 'PRODUCTOS' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-amber-600" />
                    <span className="text-xs font-black text-amber-950">
                      {selectedProduct ? `Platillo: ${selectedProduct.nombre} ($${(Number(selectedProduct.precio) || 0).toFixed(2)})` : 'Ningún platillo seleccionado aún'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProductModal(true)}
                    className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    {selectedProduct ? 'Cambiar Platillo' : 'Seleccionar Platillo'}
                  </button>
                </div>
              )}

              {alcance === 'SERVICIOS' && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-orange-600" />
                    <span className="text-xs font-black text-orange-950">
                      {selectedCategory ? `Categoría: ${selectedCategory.nombre}` : 'Ninguna categoría seleccionada aún'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="py-2 px-4 bg-orange-500 hover:bg-orange-400 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    {selectedCategory ? 'Cambiar Categoría' : 'Seleccionar Categoría'}
                  </button>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Siguiente: Tipo de Oferta</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 2: ¿QUÉ OFERTA QUIERES HACER? ── */}
          {currentStep === 2 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-200">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 2</span>
                <h3 className="text-lg font-black text-slate-900 uppercase">¿Qué oferta quieres hacer?</h3>
                <p className="text-xs text-slate-500 font-medium">Elige el tipo de beneficio comercial que recibirá el cliente.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'PORCENTAJE', label: '📉 Porcentaje %', desc: 'Descuenta un % del precio' },
                  { id: 'DESCUENTO_FIJO', label: '💵 Descuento Fijo ($)', desc: 'Resta un monto fijo' },
                  { id: 'PRECIO_ESPECIAL', label: '🏷️ Precio Especial', desc: 'Define un nuevo precio' },
                  { id: 'DOS_POR_UNO', label: '🎁 2x1', desc: 'Lleva 2, paga 1' },
                  { id: 'TRES_POR_DOS', label: '🎁 3x2', desc: 'Lleva 3, paga 2' },
                  { id: 'COMBO', label: '🍔 Combo / Paquete', desc: 'Agrupa varias opciones' },
                  { id: 'ENVIO_GRATIS', label: '🚚 Envío Gratis', desc: 'Subsidio de entrega' },
                  { id: 'CUPON', label: '🎟️ Cupón Promocional', desc: 'Código de descuento' },
                  { id: 'CUSTOM', label: '✨ Personalizado', desc: 'Beneficio libre' },
                ].map(b => {
                  const isSelected = tipoPromo === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setTipoPromo(b.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-amber-50 border-amber-500 text-amber-950 font-black shadow-xs ring-2 ring-amber-500/20' 
                          : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:border-amber-300'
                      }`}
                    >
                      <span className="text-xs font-black block truncate">{b.label}</span>
                      <span className="text-[10px] text-slate-400 font-medium mt-1 leading-tight block">{b.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  ← Paso Anterior
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Siguiente: Configurar Oferta</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 3: CONFIGURA LA OFERTA Y CÁLCULOS ── */}
          {currentStep === 3 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-200">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 3</span>
                <h3 className="text-lg font-black text-slate-900 uppercase">Configura la Oferta</h3>
                <p className="text-xs text-slate-500 font-medium">Ajusta los precios y porcentajes con cálculo automático en tiempo real.</p>
              </div>

              {/* CARD PRECIO ESPECIAL CON COMPORTAMIENTO INTELIGENTE */}
              {tipoPromo === 'PRECIO_ESPECIAL' && (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-4">
                  {selectedProduct ? (
                    <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {selectedProduct.imagenUrl && (
                          <img src={selectedProduct.imagenUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <div>
                          <span className="text-xs font-black text-slate-900 block">{selectedProduct.nombre}</span>
                          <span className="text-[10px] text-slate-400 font-bold">Precio Actual: ${selectedProduct.precio.toFixed(2)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowProductModal(true)}
                        className="text-[11px] font-black text-amber-700 hover:underline cursor-pointer"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowProductModal(true)}
                      className="w-full p-3 bg-white border border-dashed border-amber-300 rounded-xl text-xs font-black text-amber-800 text-center hover:bg-amber-50 cursor-pointer"
                    >
                      + Seleccionar Platillo para Precio Especial
                    </button>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Nuevo Precio Promocional ($)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 font-black text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.25"
                          value={precioPromo}
                          onChange={e => setPrecioPromo(parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-base text-slate-900 outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Cálculo de Ahorro</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold text-slate-600">Ahorro Cliente:</span>
                        <span className="text-sm font-black text-emerald-600">${previewCalculation.savings.toFixed(2)} ({previewCalculation.percentageOff}% OFF)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD PORCENTAJE % */}
              {tipoPromo === 'PORCENTAJE' && (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Porcentaje de Descuento (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        max="100"
                        value={precioPromo}
                        onChange={e => setPrecioPromo(parseFloat(e.target.value) || 0)}
                        className="w-full pr-8 pl-3 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-lg text-slate-900 outline-none focus:border-amber-500"
                      />
                      <span className="absolute right-3 top-3 font-black text-slate-400 text-base">%</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Precio Normal de Referencia:</span>
                      <span className="font-bold text-slate-800">${basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Descuento Calculado ({precioPromo}%):</span>
                      <span>-${previewCalculation.savings.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-100 pt-1 flex justify-between font-black text-slate-900">
                      <span>Cliente Paga:</span>
                      <span className="text-amber-600">${previewCalculation.totalPromo.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD DESCUENTO FIJO $ */}
              {tipoPromo === 'DESCUENTO_FIJO' && (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Monto de Descuento Directo ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-black text-slate-400 text-base">$</span>
                      <input
                        type="number"
                        step="0.5"
                        value={precioPromo}
                        onChange={e => setPrecioPromo(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-lg text-slate-900 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Precio Normal:</span>
                      <span className="font-bold text-slate-800">${basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Descuento Directo:</span>
                      <span>-${precioPromo.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-100 pt-1 flex justify-between font-black text-slate-900">
                      <span>Cliente Paga:</span>
                      <span className="text-amber-600">${previewCalculation.totalPromo.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD 2X1 Y 3X2 */}
              {(tipoPromo === 'DOS_POR_UNO' || tipoPromo === '2X1' || tipoPromo === 'TRES_POR_DOS' || tipoPromo === '3X2') && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-3">
                  <span className="text-xs font-black text-purple-900 block">
                    {tipoPromo.includes('3') ? '🎁 Oferta 3x2 (Lleva 3, Paga 2)' : '🎁 Oferta 2x1 (Lleva 2, Paga 1)'}
                  </span>
                  {selectedProduct ? (
                    <div className="p-3 bg-white rounded-xl border border-purple-200 flex justify-between items-center text-xs">
                      <span className="font-black text-slate-900">{selectedProduct.nombre} (${selectedProduct.precio.toFixed(2)} c/u)</span>
                      <span className="font-bold text-purple-700">Pagas ${previewCalculation.totalPromo.toFixed(2)} (Ahorras ${previewCalculation.savings.toFixed(2)})</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowProductModal(true)}
                      className="w-full p-3 bg-white border border-dashed border-purple-300 rounded-xl text-xs font-black text-purple-800 text-center hover:bg-purple-50 cursor-pointer"
                    >
                      + Seleccionar Platillo que participa
                    </button>
                  )}
                </div>
              )}

              {/* CARD COMBO */}
              {tipoPromo === 'COMBO' && (
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-purple-950">Platillos Incluidos en el Combo ({selectedComboProducts.length})</span>
                    <button
                      type="button"
                      onClick={() => setShowProductModal(true)}
                      className="text-xs font-black text-purple-700 hover:underline cursor-pointer"
                    >
                      + Seleccionar Productos
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {products.map(p => {
                      const isChecked = productosRelacionados.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleComboProduct(p.id)}
                          className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                            isChecked ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          <span className="truncate">{p.nombre}</span>
                          <span className="font-mono text-[11px] ml-2 shrink-0">${(Number(p.precio) || 0).toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-purple-900 block mb-1">Precio Combo Sugerido ($)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={precioPromo}
                        onChange={e => setPrecioPromo(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl font-black text-slate-900"
                      />
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-purple-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-400">Valor Normal Sumado:</span>
                      <span className="font-black text-purple-900 text-sm">${basePrice.toFixed(2)} (Ahorro: ${previewCalculation.savings.toFixed(2)})</span>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD ENVÍO GRATIS */}
              {tipoPromo === 'ENVIO_GRATIS' && (
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-4">
                  <span className="text-xs font-black text-blue-900 block">¿Cómo quieres cubrir el envío?</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEsCostoCompleto(true);
                        setCostoMaximoSubsidiado(undefined);
                      }}
                      className={`p-3 rounded-xl border text-xs font-black text-left transition-all ${
                        esCostoCompleto ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>🚚 Envío 100% Gratis</span>
                      <span className="text-[10px] font-normal block mt-0.5 opacity-90">El restaurante cubre el costo total.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEsCostoCompleto(false);
                        if (!costoMaximoSubsidiado) setCostoMaximoSubsidiado(3.00);
                      }}
                      className={`p-3 rounded-xl border text-xs font-black text-left transition-all ${
                        !esCostoCompleto ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>💰 Subsidio de Envío</span>
                      <span className="text-[10px] font-normal block mt-0.5 opacity-90">Cubrir hasta un monto máximo.</span>
                    </button>
                  </div>

                  {!esCostoCompleto && (
                    <div>
                      <label className="text-[10px] font-black uppercase text-blue-900 block mb-1">Monto Máximo Subsidiado ($)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={costoMaximoSubsidiado || ''}
                        onChange={e => setCostoMaximoSubsidiado(parseFloat(e.target.value) || 0)}
                        placeholder="Ej: 3.00"
                        className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-black text-slate-900"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* CARD CUPÓN */}
              {tipoPromo === 'CUPON' && (
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-black uppercase text-purple-900 block mb-1">Código del Cupón *</label>
                      <input
                        type="text"
                        required
                        value={cuponCodigo}
                        onChange={e => setCuponCodigo(e.target.value.toUpperCase())}
                        placeholder="Ej. VERANO10"
                        className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl font-mono font-black text-purple-800 uppercase outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-purple-900 block mb-1">Modalidad del Beneficio</label>
                      <select
                        value={cuponTipoModalidad}
                        onChange={e => setCuponTipoModalidad(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl font-bold text-slate-900"
                      >
                        <option value="PORCENTAJE">Porcentaje (%)</option>
                        <option value="DESCUENTO_FIJO">Monto Fijo ($)</option>
                        <option value="PRECIO_ESPECIAL">Precio Especial ($)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-purple-900 block mb-1">Valor del Beneficio</label>
                    <input
                      type="number"
                      step="0.5"
                      value={precioPromo}
                      onChange={e => setPrecioPromo(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl font-black text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* MUESTRA ERROR DE VALIDACIÓN EN VIVO SI EXISTE */}
              {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-black text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  ← Paso Anterior
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Siguiente: Reglas & Fechas</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 4: ¿CUÁNDO Y PARA QUIÉN? (REGLAS Y VIGENCIA) ── */}
          {currentStep === 4 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-200">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 4</span>
                <h3 className="text-lg font-black text-slate-900 uppercase">¿Cuándo y para quién?</h3>
                <p className="text-xs text-slate-500 font-medium">Define los segmentos de cliente, mínimos de compra y horarios de validez.</p>
              </div>

              {/* BOTONES DE SUGERENCIA RÁPIDA DE ESTRATEGIA (GOAL PRESETS) */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">💡 Sugerencias de Estrategia Comercial (1-Clic)</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'TODAY', label: '🔥 Vender más hoy' },
                    { id: 'NEW_CLIENT', label: '👋 Nuevos clientes' },
                    { id: 'RECURRING_CLIENT', label: '❤️ Hacer volver' },
                    { id: 'HAPPY_HOUR', label: '⏰ Happy Hour' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        goalPreset === p.id ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Segmento de Clientes</label>
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

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Compra Mínima en Productos ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={montoMinimo}
                    onChange={e => setMontoMinimo(parseFloat(e.target.value) || 0)}
                    placeholder="0.00 (Sin mínimo)"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Fechas & Días */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <span className="text-xs font-black uppercase text-slate-800 block">🗓️ Vigencia & Días de la Semana</span>
                
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
                  <label className="text-[10px] font-bold text-slate-500 block mb-1.5">Días de la semana válidos</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => {
                      const isChecked = diasValidos.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isChecked ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {day.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
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

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  ← Paso Anterior
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Siguiente: Vista Previa & Publicar</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 5: RESUMEN, OPCIONES AVANZADAS Y PUBLICAR ── */}
          {currentStep === 5 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-200">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Paso 5</span>
                <h3 className="text-lg font-black text-slate-900 uppercase">Así quedará tu oferta</h3>
                <p className="text-xs text-slate-500 font-medium">Revisa la presentación pública y completa la publicación.</p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Título Público de la Oferta *</label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={e => {
                      setTitulo(e.target.value);
                      setUserEditedTitle(true);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Descripción / Leyenda Comercial</label>
                  <textarea
                    rows={2}
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none resize-none"
                  />
                </div>
              </div>

              {/* TOGGLE DESPLEGABLE DE OPCIONES AVANZADAS (CANALES, FINANCIAMIENTO, REGULACIONES) */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(prev => !prev)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-black text-slate-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>⚙️ Opciones Avanzadas (Canales, Límites y Financiamiento)</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
                </button>

                {showAdvancedOptions && (
                  <div className="p-4 bg-white space-y-4 text-xs border-t border-slate-200 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Canales de Venta Permitidos</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'POS', label: '🏬 POS / Caja' },
                          { id: 'ONLINE', label: '🛒 Pedidos Online' },
                          { id: 'DELIVERY', label: '🛵 Delivery' },
                          { id: 'PICKUP', label: '🛍️ Retiro / Pickup' },
                          { id: 'LANDING', label: '🌐 Web Landing' },
                        ].map(ch => {
                          const isChecked = canales.includes(ch.id);
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => toggleChannel(ch.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isChecked ? 'bg-slate-900 text-white font-black' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {ch.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Límite Usos Totales</label>
                        <input
                          type="number"
                          value={usosTotalesMaximo || ''}
                          onChange={e => setUsosTotalesMaximo(parseInt(e.target.value) || undefined)}
                          placeholder="Sin límite"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Límite por Cliente</label>
                        <input
                          type="number"
                          value={usosPorClienteMaximo || ''}
                          onChange={e => setUsosPorClienteMaximo(parseInt(e.target.value) || undefined)}
                          placeholder="Sin límite"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={esCombinable}
                          onChange={e => setEsCombinable(e.target.checked)}
                          className="rounded border-slate-300 text-amber-600"
                        />
                        <span>Permitir combinar con otros cupones</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  ← Paso Anterior
                </button>

                <button
                  type="submit"
                  disabled={!!validationError}
                  className="py-3.5 px-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg cursor-pointer transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  <Check size={18} /> Publicar Promoción
                </button>
              </div>
            </div>
          )}

        </div>

        {/* COLUMNA DERECHA (1 COL): PREVISUALIZACIÓN VIVA Y SIMULADOR (DESKTOP & MOBILE STICKY) */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-5 sticky top-6 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Previsualización en Vivo</h3>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                Live Preview
              </span>
            </div>

            {/* TARJETA PÚBLICA SIMULADA */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black uppercase">
                  {tipoPromo}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  {previewCalculation.percentageOff > 0 ? `${previewCalculation.percentageOff}% OFF` : 'OFERTA'}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-black text-white leading-tight">{titulo || 'Título de la Oferta'}</h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{descripcion || 'Descripción promocional...'}</p>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl flex items-baseline justify-between font-mono">
                <span className="text-[10px] text-slate-400 uppercase font-sans">
                  {tipoPromo.includes('3') ? 'Pagas 2 de 3:' : tipoPromo.includes('2') ? 'Pagas 1 de 2:' : 'Precio Final:'}
                </span>
                <div className="flex items-baseline gap-2">
                  {previewCalculation.totalNormal > previewCalculation.totalPromo && (
                    <span className="text-xs text-slate-500 line-through">${previewCalculation.totalNormal.toFixed(2)}</span>
                  )}
                  <span className="text-base font-black text-amber-400">${previewCalculation.totalPromo.toFixed(2)}</span>
                </div>
              </div>

              {previewCalculation.savings > 0 && (
                <div className="text-[11px] font-extrabold text-emerald-400 text-right">
                  Ahorro estimado cliente: ${previewCalculation.savings.toFixed(2)}
                </div>
              )}
            </div>

            {/* DETALLES RESUMIDOS */}
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Segmento:</span>
                <span className="font-bold text-white">{tipoCliente === 'NEW' ? 'Nuevos Clientes' : tipoCliente === 'RECURRING' ? 'Recurrentes' : 'Todos los Clientes'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Vigencia:</span>
                <span className="font-bold text-white">{fechaInicio} al {fechaFin}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!!validationError}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check size={18} /> Publicar Oferta
            </button>
          </div>
        </div>

      </div>

      {/* ── MODAL REUTILIZABLE SELECCIONADOR VISUAL DE PRODUCTOS ── */}
      {showProductModal && (
        <ProductSelectorModal
          products={products}
          selectedProductId={productoRequeridoId}
          onSelect={(pId) => {
            setProductoRequeridoId(pId);
            setShowProductModal(false);
          }}
          onClose={() => setShowProductModal(false)}
        />
      )}

      {/* ── MODAL REUTILIZABLE SELECCIONADOR VISUAL DE CATEGORÍAS ── */}
      {showCategoryModal && (
        <CategorySelectorModal
          categories={categories}
          selectedCategoryId={categoriaRequeridaId}
          onSelect={(cId) => {
            setCategoriaRequeridaId(cId);
            setShowCategoryModal(false);
          }}
          onClose={() => setShowCategoryModal(false)}
        />
      )}
    </form>
  );
}

// ── COMPONENTE REUTILIZABLE: MODAL SELECTOR DE PRODUCTOS ───────────────────
function ProductSelectorModal({
  products,
  selectedProductId,
  onSelect,
  onClose,
}: {
  products: any[];
  selectedProductId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p => p.nombre.toLowerCase().includes(term));
  }, [products, searchTerm]);

  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200">
        
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-amber-500" />
            <h3 className="font-black text-sm uppercase text-slate-900">Seleccionar Platillo o Bebida</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre de platillo..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="p-3 overflow-y-auto flex-1 space-y-2">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold">No se encontraron productos.</div>
          ) : (
            filteredProducts.map(p => {
              const isSelected = selectedProductId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20' : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {p.imagenUrl ? (
                      <img src={p.imagenUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 text-slate-400 font-black text-xs">🍔</div>
                    )}
                    <div>
                      <span className="text-xs font-black text-slate-900 block">{p.nombre}</span>
                      <span className="text-[10px] text-slate-500 font-bold">${(Number(p.precio) || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 ${
                    isSelected ? 'bg-amber-500 text-slate-950' : 'bg-white border border-slate-200 text-slate-700'
                  }`}>
                    {isSelected ? 'Seleccionado' : 'Elegir'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── COMPONENTE REUTILIZABLE: MODAL SELECTOR DE CATEGORÍAS ─────────────────
function CategorySelectorModal({
  categories,
  selectedCategoryId,
  onSelect,
  onClose,
}: {
  categories: any[];
  selectedCategoryId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-500" />
            <h3 className="font-black text-sm uppercase text-slate-900">Seleccionar Categoría del Menú</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 overflow-y-auto flex-1 space-y-2">
          {categories.map(c => {
            const isSelected = selectedCategoryId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500/20' : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-xs font-black text-slate-900">{c.nombre}</span>
                <span className={`px-3 py-1 rounded-xl text-xs font-black ${
                  isSelected ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-700'
                }`}>
                  {isSelected ? 'Seleccionada' : 'Elegir'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
