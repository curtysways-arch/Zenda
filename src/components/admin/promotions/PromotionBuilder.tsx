'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Check, AlertTriangle, Flame, Clock, Users, RotateCcw, Truck, ShoppingBag, ShieldAlert, Store, Utensils, Globe } from 'lucide-react';

interface PromotionBuilderProps {
  products: any[];
  categories: any[];
  initialData?: any;
  onSave: (promoData: any) => void;
  onCancel: () => void;
}

export default function PromotionBuilder({
  products,
  categories,
  initialData,
  onSave,
  onCancel,
}: PromotionBuilderProps) {
  const [goalPreset, setGoalPreset] = useState<string>(initialData?.goalPreset || 'TODAY');

  // Datos principales
  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '');
  const [tipoPromo, setTipoPromo] = useState(initialData?.tipoPromo || 'PORCENTAJE');
  const [precioPromo, setPrecioPromo] = useState<number>(initialData?.precioPromo || 15);
  const [precioAnterior, setPrecioAnterior] = useState<number | undefined>(initialData?.precioAnterior);

  // Fechas y Horarios
  const [fechaInicio, setFechaInicio] = useState(initialData?.fechaInicio ? initialData.fechaInicio.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(initialData?.fechaFin ? initialData.fechaFin.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [diasValidos, setDiasValidos] = useState<string[]>(initialData?.diasValidos ? (Array.isArray(initialData.diasValidos) ? initialData.diasValidos : initialData.diasValidos.split(',')) : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);
  const [horaInicioValida, setHoraInicioValida] = useState(initialData?.horaInicioValida || '');
  const [horaFinValida, setHoraFinValida] = useState(initialData?.horaFinValida || '');

  // Canales
  const [canales, setCanales] = useState<string[]>(initialData?.canales || ['POS', 'MESEROS', 'DELIVERY', 'PICKUP', 'LANDING']);

  // Condiciones & Límites
  const [montoMinimo, setMontoMinimo] = useState<number>(initialData?.montoMinimo || 0);
  const [cantidadMinima, setCantidadMinima] = useState<number>(initialData?.cantidadMinima || 0);
  const [productoRequeridoId, setProductoRequeridoId] = useState<string>(initialData?.productoRequeridoId || '');
  const [categoriaRequeridaId, setCategoriaRequeridaId] = useState<string>(initialData?.categoriaRequeridaId || '');
  const [cuponCodigo, setCuponCodigo] = useState(initialData?.cuponCodigo || '');
  const [tipoCliente, setTipoCliente] = useState<'NEW' | 'RECURRING' | 'ANY'>(initialData?.tipoCliente || 'ANY');

  const [usosTotalesMaximo, setUsosTotalesMaximo] = useState<number | undefined>(initialData?.usosTotalesMaximo);
  const [usosPorClienteMaximo, setUsosPorClienteMaximo] = useState<number | undefined>(initialData?.usosPorClienteMaximo);
  const [presupuestoMaximo, setPresupuestoMaximo] = useState<number | undefined>(initialData?.presupuestoMaximo);
  const [esCombinable, setEsCombinable] = useState<boolean>(initialData?.esCombinable || false);
  const [imagenUrl, setImagenUrl] = useState<string>(initialData?.imagenUrl || '');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(initialData?.productosRelacionados || []);

  // Alerta de Rentabilidad (Calculada)
  const selectedProduct = products.find(p => p.id === productoRequeridoId);
  const samplePrice = selectedProduct ? Number(selectedProduct.precio) || 15 : (precioAnterior || 15.00);
  const sampleDiscount = (tipoPromo === 'DOS_POR_UNO' || tipoPromo === '2X1') ? (samplePrice / 2) : (tipoPromo === 'PORCENTAJE' ? (samplePrice * (precioPromo / 100)) : (precioPromo || 3));
  const finalSamplePrice = Math.max(0, samplePrice - sampleDiscount);
  const sampleMargin = samplePrice > 0 ? (finalSamplePrice / samplePrice) * 100 : 50;
  const isLowMarginAlert = sampleMargin < 50;

  // Auto-ajustar titulo, precios e imagen al cambiar producto o tipo de promo
  const handleSelectProduct = (productId: string) => {
    setProductoRequeridoId(productId);
    if (!productId) return;

    const foundProd = products.find(p => p.id === productId);
    if (foundProd) {
      const basePrice = Number(foundProd.precio) || 0;
      if (!imagenUrl && foundProd.imagenUrl) {
        setImagenUrl(foundProd.imagenUrl);
      }

      if (tipoPromo === 'DOS_POR_UNO' || tipoPromo === '2X1') {
        setTitulo(`🔥 2x1 en ${foundProd.nombre}`);
        setDescripcion(`Pide 1 de esta oferta y se añadirán 2 ${foundProd.nombre} al carrito por el precio de 1.`);
        setPrecioPromo(basePrice);
        setPrecioAnterior(basePrice * 2);
      } else if (tipoPromo === 'PORCENTAJE') {
        setTitulo(`🔥 ${precioPromo || 15}% OFF en ${foundProd.nombre}`);
        setDescripcion(`Disfruta de descuento especial en ${foundProd.nombre}.`);
        setPrecioAnterior(basePrice);
        setPrecioPromo(precioPromo || 15);
      } else {
        setTitulo(`🔥 Oferta Especial en ${foundProd.nombre}`);
        setPrecioAnterior(basePrice);
      }
    }
  };

  useEffect(() => {
    if (productoRequeridoId) {
      const foundProd = products.find(p => p.id === productoRequeridoId);
      if (foundProd) {
        const basePrice = Number(foundProd.precio) || 0;
        if (tipoPromo === 'DOS_POR_UNO' || tipoPromo === '2X1') {
          setTitulo(`🔥 2x1 en ${foundProd.nombre}`);
          setDescripcion(`Pide 1 de esta oferta y se añadirán 2 ${foundProd.nombre} al carrito por el precio de 1.`);
          setPrecioPromo(basePrice);
          setPrecioAnterior(basePrice * 2);
        }
      }
    }
  }, [tipoPromo, productoRequeridoId]);

  // Sincronizar estado cuando initialData cambie (ej: Cupones, Oportunidades o presets externos)
  useEffect(() => {
    if (initialData) {
      if (initialData.goalPreset) setGoalPreset(initialData.goalPreset);
      if (initialData.titulo !== undefined) setTitulo(initialData.titulo);
      if (initialData.descripcion !== undefined) setDescripcion(initialData.descripcion);
      if (initialData.tipoPromo !== undefined) setTipoPromo(initialData.tipoPromo);
      if (initialData.precioPromo !== undefined) setPrecioPromo(Number(initialData.precioPromo) || 0);
      if (initialData.precioAnterior !== undefined) setPrecioAnterior(initialData.precioAnterior ? Number(initialData.precioAnterior) : undefined);
      if (initialData.productoRequeridoId !== undefined) setProductoRequeridoId(initialData.productoRequeridoId || '');
      if (initialData.categoriaRequeridaId !== undefined) setCategoriaRequeridaId(initialData.categoriaRequeridaId || '');
      if (initialData.cuponCodigo !== undefined) setCuponCodigo(initialData.cuponCodigo || '');
      if (initialData.tipoCliente !== undefined) setTipoCliente(initialData.tipoCliente);
      if (initialData.montoMinimo !== undefined) setMontoMinimo(Number(initialData.montoMinimo) || 0);
      if (initialData.diasValidos !== undefined) setDiasValidos(Array.isArray(initialData.diasValidos) ? initialData.diasValidos : (initialData.diasValidos ? initialData.diasValidos.split(',') : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']));
      if (initialData.horaInicioValida !== undefined) setHoraInicioValida(initialData.horaInicioValida || '');
      if (initialData.horaFinValida !== undefined) setHoraFinValida(initialData.horaFinValida || '');
      if (initialData.canales !== undefined) setCanales(initialData.canales);
      if (initialData.imagenUrl !== undefined) setImagenUrl(initialData.imagenUrl || '');
    }
  }, [initialData]);

  // Aplicar Presets de Objetivos
  const applyPreset = (presetKey: string) => {
    setGoalPreset(presetKey);
    const firstProd = products && products.length > 0 ? products[0] : null;

    if (presetKey === 'TODAY') {
      setTitulo('🔥 Venta Flash de Hoy');
      setDescripcion('Descuento especial válido únicamente durante el día de hoy.');
      setTipoPromo('PORCENTAJE');
      setPrecioPromo(15);
      setFechaFin(new Date().toISOString().split('T')[0]);
    } else if (presetKey === 'OFF_PEAK') {
      setTitulo('🕐 Happy Hour Tardes (15:00 - 17:00)');
      setDescripcion('Descuento especial en horas de baja ocupación.');
      setTipoPromo('PORCENTAJE');
      setPrecioPromo(20);
      setHoraInicioValida('15:00');
      setHoraFinValida('17:00');
      setDiasValidos(['Lunes', 'Martes', 'Miércoles', 'Jueves']);
    } else if (presetKey === 'NEW_CLIENT') {
      setTitulo('🎁 15% OFF en Tu Primer Pedido Online');
      setDescripcion('Válido exclusivamente para clientes nuevos.');
      setTipoPromo('CUPON');
      setCuponCodigo('BIENVENIDO');
      setTipoCliente('NEW');
      setMontoMinimo(12);
      setPrecioPromo(15);
    } else if (presetKey === 'RECURRING') {
      setTitulo('🔁 Regreso VIP — $3.00 OFF');
      setDescripcion('Recompensa para comensales frecuentes.');
      setTipoPromo('DESCUENTO_FIJO');
      setPrecioPromo(3);
      setTipoCliente('RECURRING');
    } else if (presetKey === 'DELIVERY') {
      setTitulo('📦 Envío Gratis en Pedidos > $15');
      setDescripcion('Disfruta de delivery sin costo en tus pedidos seleccionados.');
      setTipoPromo('ENVIO_GRATIS');
      setMontoMinimo(15);
      setCanales(['DELIVERY', 'PICKUP', 'LANDING']);
    } else if (presetKey === 'PRODUCT') {
      setTipoPromo('DOS_POR_UNO');
      if (firstProd) {
        setProductoRequeridoId(firstProd.id);
        const basePrice = Number(firstProd.precio) || 0;
        setTitulo(`🔥 2x1 en ${firstProd.nombre}`);
        setDescripcion(`Pide 1 de esta oferta y se añadirán 2 ${firstProd.nombre} al carrito por el precio de 1.`);
        setPrecioPromo(basePrice);
        setPrecioAnterior(basePrice * 2);
        if (firstProd.imagenUrl) setImagenUrl(firstProd.imagenUrl);
      } else {
        setTitulo('🍔 Especial 2x1 del Menú');
        setDescripcion('Pide 2 y paga 1 en el producto seleccionado.');
      }
    }
  };

  const toggleChannel = (ch: string) => {
    setCanales(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  const toggleDay = (day: string) => {
    setDiasValidos(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo) {
      alert('Por favor ingresa un título para la promoción');
      return;
    }

    onSave({
      titulo,
      descripcion,
      tipoPromo,
      precioPromo,
      precioAnterior,
      imagenUrl: imagenUrl || selectedProduct?.imagenUrl || '',
      fechaInicio,
      fechaFin,
      diasValidos,
      horaInicioValida,
      horaFinValida,
      canales,
      montoMinimo,
      cantidadMinima,
      productoRequeridoId,
      categoriaRequeridaId,
      cuponCodigo,
      tipoCliente,
      usosTotalesMaximo,
      usosPorClienteMaximo,
      presupuestoMaximo,
      esCombinable,
      estado: 'ACTIVA'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase italic">Constructor de Promoción</h2>
          <p className="text-slate-500 text-xs font-medium">Configura una promoción orientada a aumentar ventas o elige un objetivo predeterminado.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Check className="size-4" /> Guardar Promoción
          </button>
        </div>
      </div>

      {/* 1. SECCIÓN: PROMOCIONES ORIENTADAS A OBJETIVOS (PRESETS 1-CLIC) */}
      <div className="space-y-3">
        <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
          🎯 1. Elige un Objetivo Comercial (Configuración 1-Clic)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { id: 'TODAY', label: '🔥 Vender hoy', icon: Flame },
            { id: 'OFF_PEAK', label: '🕐 Horas bajas', icon: Clock },
            { id: 'NEW_CLIENT', label: '🆕 Nuevos comensales', icon: Users },
            { id: 'RECURRING', label: '🔁 Hacer volver', icon: RotateCcw },
            { id: 'DELIVERY', label: '📦 Aumentar envíos', icon: Truck },
            { id: 'PRODUCT', label: '🍔 Vender producto', icon: ShoppingBag },
          ].map(preset => {
            const IconC = preset.icon;
            const isSel = goalPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  isSel ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400/40' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <IconC className={`size-5 ${isSel ? 'text-white' : 'text-amber-600'}`} />
                <span className="text-[11px] font-black leading-tight block">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ASIGNACIÓN EXPLÍCITA A PRODUCTO O CATEGORÍA EXISTENTE */}
      <div className="bg-amber-50/70 p-4.5 rounded-2xl border border-amber-200/80 space-y-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-4 text-amber-600" />
          <label className="text-xs font-black text-amber-950 uppercase tracking-wider block">
            📦 Asignar a Producto o Categoría Existente del Menú
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
              Producto Específico del Menú:
            </label>
            <select
              value={productoRequeridoId}
              onChange={e => handleSelectProduct(e.target.value)}
              className="w-full p-3 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
            >
              <option value="">-- Todos los Productos (Global) --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  🍔 {p.nombre} (${(Number(p.precio) || 0).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
              Categoría Completa del Menú:
            </label>
            <select
              value={categoriaRequeridaId}
              onChange={e => setCategoriaRequeridaId(e.target.value)}
              className="w-full p-3 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
            >
              <option value="">-- Todas las Categorías --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  📁 {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. DATOS GENERALES Y TIPO DE PROMOCIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">Título de la Promoción *</label>
            <input
              type="text"
              required
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej. 🔥 20% OFF en Hamburguesas"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">Descripción</label>
            <textarea
              rows={2}
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej. Válido en pedidos mayores a $10 durante esta semana."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">🖼️ Imagen de la Promoción</label>
            <div className="flex items-center gap-3">
              <div className="size-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                {imagenUrl || selectedProduct?.imagenUrl ? (
                  <img src={imagenUrl || selectedProduct?.imagenUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] font-extrabold uppercase">Sin Foto</div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <input
                  type="url"
                  value={imagenUrl}
                  onChange={e => setImagenUrl(e.target.value)}
                  placeholder="https://... URL de la foto o banner"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {selectedProduct?.imagenUrl && (
                  <button
                    type="button"
                    onClick={() => setImagenUrl(selectedProduct.imagenUrl)}
                    className="text-[10px] font-black text-amber-700 hover:text-amber-800 underline cursor-pointer block"
                  >
                    📷 Usar foto de {selectedProduct.nombre}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">Tipo de Beneficio</label>
            <select
              value={tipoPromo}
              onChange={e => setTipoPromo(e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="PORCENTAJE">Porcentaje de Descuento (%)</option>
              <option value="DESCUENTO_FIJO">Descuento Fijo ($)</option>
              <option value="DOS_POR_UNO">2x1 (Dos por Uno)</option>
              <option value="TRES_POR_DOS">3x2 (Tres por Dos)</option>
              <option value="COMBO">Combo Especial</option>
              <option value="PRECIO_ESPECIAL">Precio Especial Fijo</option>
              <option value="ENVIO_GRATIS">Envío / Delivery Gratis</option>
              <option value="CUPON">Cupón de Código Promocional</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                {tipoPromo === 'PORCENTAJE' ? 'Porcentaje %' : 'Monto / Beneficio ($)'}
              </label>
              <input
                type="number"
                step="0.5"
                value={precioPromo}
                onChange={e => setPrecioPromo(parseFloat(e.target.value) || 0)}
                className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">Precio Anterior ($)</label>
              <input
                type="number"
                step="0.5"
                value={precioAnterior || ''}
                onChange={e => setPrecioAnterior(parseFloat(e.target.value) || undefined)}
                placeholder="Opcional"
                className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. CANALES Y HORARIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">📍 Canales Permitidos</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'POS', label: '🏬 POS / Ventas' },
              { id: 'MESEROS', label: '🍽️ Meseros' },
              { id: 'DELIVERY', label: '🛵 Delivery' },
              { id: 'PICKUP', label: '🛍️ Pickup' },
              { id: 'LANDING', label: '🌐 Landing' },
            ].map(ch => {
              const isChecked = canales.includes(ch.id);
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => toggleChannel(ch.id)}
                  className={`p-2.5 rounded-xl border text-[10px] font-black transition-all cursor-pointer ${
                    isChecked ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {ch.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">⏰ Horario & Días Válidos</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Hora Inicio:</span>
              <input
                type="time"
                value={horaInicioValida}
                onChange={e => setHoraInicioValida(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
              />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Hora Fin:</span>
              <input
                type="time"
                value={horaFinValida}
                onChange={e => setHoraFinValida(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. CONDICIONES & PROTECCIÓN DE RENTABILIDAD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">🛒 Condiciones de Compra</label>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Compra Mínima ($):</span>
              <input
                type="number"
                value={montoMinimo}
                onChange={e => setMontoMinimo(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
              />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Código Cupón (Si requiere):</span>
              <input
                type="text"
                value={cuponCodigo}
                onChange={e => setCuponCodigo(e.target.value.toUpperCase())}
                placeholder="Ej. BIENVENIDO"
                className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-amber-600 uppercase"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">👥 Segmento de Cliente</label>
          <select
            value={tipoCliente}
            onChange={e => setTipoCliente(e.target.value as any)}
            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
          >
            <option value="ANY">Todos los clientes (Nuevos y Recurrentes)</option>
            <option value="NEW">Solo Clientes Nuevos (Primer Pedido)</option>
            <option value="RECURRING">Solo Clientes Recurrentes</option>
          </select>
        </div>

        {/* ALERTA DE RENTABILIDAD */}
        <div className={`p-4 rounded-2xl border space-y-2 flex flex-col justify-between ${
          isLowMarginAlert ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-black text-xs uppercase">
              <ShieldAlert className="size-4 shrink-0" />
              <span>Protección de Rentabilidad</span>
            </div>
            <p className="text-[11px] leading-snug font-medium">
              Precio Muestra: <strong>${samplePrice.toFixed(2)}</strong> • Descuento: <strong>-${sampleDiscount.toFixed(2)}</strong> • Precio Final: <strong>${finalSamplePrice.toFixed(2)}</strong>
            </p>
          </div>
          {isLowMarginAlert ? (
            <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 p-1.5 rounded-lg border border-rose-200 block text-center">
              ⚠️ Este descuento reduce significativamente el margen estimado.
            </span>
          ) : (
            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 p-1.5 rounded-lg border border-emerald-200 block text-center">
              ✓ Margen de rentabilidad protegido (&gt;50%)
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
