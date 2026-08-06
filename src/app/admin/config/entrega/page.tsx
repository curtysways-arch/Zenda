'use client';
// src/app/admin/config/entrega/page.tsx
// Configuración de Delivery (Zonas/Rangos) y Empaque (Take Away) del Business Configuration Runtime

import { useState, useEffect } from 'react';
import { Truck, Package, Save, Plus, Trash2, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface DeliveryZone {
  minKm: number;
  maxKm: number;
  cost: number;
}

export default function ConfigEntregaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Delivery Config
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [baseCost, setBaseCost] = useState(1.5);
  const [costPerKm, setCostPerKm] = useState(0.25);
  const [zones, setZones] = useState<DeliveryZone[]>([
    { minKm: 0, maxKm: 3, cost: 1.50 },
    { minKm: 3, maxKm: 5, cost: 2.50 },
    { minKm: 5, maxKm: 10, cost: 4.00 }
  ]);

  // Packaging Config (Take Away / Para Llevar)
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [packagingType, setPackagingType] = useState<'FREE' | 'FLAT' | 'PER_PRODUCT'>('PER_PRODUCT');
  const [packagingAmount, setPackagingAmount] = useState(0.25);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/negocio');
        if (res.ok) {
          const data = await res.json();
          let cfg: any = {};
          if (typeof data.configuracion === 'string') {
            try { cfg = JSON.parse(data.configuracion); } catch { cfg = {}; }
          } else {
            cfg = data.configuracion || {};
          }

          if (cfg.deliveryConfig) {
            setDeliveryEnabled(cfg.deliveryConfig.enabled ?? true);
            setBaseCost(cfg.deliveryConfig.baseCost ?? 1.5);
            setCostPerKm(cfg.deliveryConfig.costPerKm ?? 0.25);
            if (Array.isArray(cfg.deliveryConfig.zones)) {
              setZones(cfg.deliveryConfig.zones);
            }
          }

          if (cfg.packagingConfig) {
            setPickupEnabled(cfg.packagingConfig.enabled ?? true);
            setPackagingType(cfg.packagingConfig.type || 'PER_PRODUCT');
            setPackagingAmount(cfg.packagingConfig.amount ?? 0.25);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const resGet = await fetch('/api/negocio');
      let currentCfg: any = {};
      if (resGet.ok) {
        const data = await resGet.json();
        if (typeof data.configuracion === 'string') {
          try { currentCfg = JSON.parse(data.configuracion); } catch { currentCfg = {}; }
        } else {
          currentCfg = data.configuracion || {};
        }
      }

      const updatedCfg = {
        ...currentCfg,
        deliveryConfig: {
          enabled: deliveryEnabled,
          baseCost,
          costPerKm,
          zones
        },
        packagingConfig: {
          enabled: pickupEnabled,
          type: packagingType,
          amount: packagingAmount
        }
      };

      const saveRes = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configuracion: updatedCfg })
      });

      if (saveRes.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Error guardando configuración de entrega:', e);
    } finally {
      setSaving(false);
    }
  }

  function addZone() {
    const lastZone = zones[zones.length - 1];
    const newMin = lastZone ? lastZone.maxKm : 0;
    setZones([...zones, { minKm: newMin, maxKm: newMin + 5, cost: 3.50 }]);
  }

  function removeZone(index: number) {
    setZones(zones.filter((_, i) => i !== index));
  }

  function updateZone(index: number, field: keyof DeliveryZone, val: number) {
    setZones(zones.map((z, i) => i === index ? { ...z, [field]: val } : z));
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[500px]">
      <Loader2 className="animate-spin text-slate-400 size-8" />
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/config" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
            <ArrowLeft className="size-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Configuración de Entrega y Empaque</h1>
            <p className="text-sm text-slate-500">Tarifas por distancia y empaque para llevar (Take Away)</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all">
          {saving ? <Loader2 className="animate-spin size-4" /> : <Save className="size-4" />}
          Guardar Cambios
        </button>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <CheckCircle2 className="size-5 text-emerald-600" />
          Configuración de entrega guardada correctamente.
        </div>
      )}

      {/* 1. SECCIÓN DELIVERY POR DISTANCIA */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
              <Truck className="size-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Configuración de Delivery</h2>
              <p className="text-xs text-slate-500">Activa el envío a domicilio y configura el cálculo por km</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={deliveryEnabled} onChange={e => setDeliveryEnabled(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500" />
          </label>
        </div>

        {deliveryEnabled && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Costo Base ($)</label>
                <input type="number" step="0.5" value={baseCost} onChange={e => setBaseCost(parseFloat(e.target.value) || 0)} className="w-full text-sm p-3 border border-slate-200 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Costo por KM Adicional ($)</label>
                <input type="number" step="0.1" value={costPerKm} onChange={e => setCostPerKm(parseFloat(e.target.value) || 0)} className="w-full text-sm p-3 border border-slate-200 rounded-xl outline-none" />
              </div>
            </div>

            {/* Table of Distance Zones */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800">Rangos de Distancia Personalizados</span>
                <button onClick={addZone} className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
                  <Plus className="size-3.5" /> Agregar Rango
                </button>
              </div>

              <div className="space-y-2">
                {zones.map((z, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs font-semibold">
                    <span className="text-slate-500 w-16">Rango {idx + 1}:</span>
                    <input type="number" step="0.5" value={z.minKm} onChange={e => updateZone(idx, 'minKm', parseFloat(e.target.value) || 0)} className="w-20 p-2 bg-white border border-slate-200 rounded-lg text-center" />
                    <span className="text-slate-400">a</span>
                    <input type="number" step="0.5" value={z.maxKm} onChange={e => updateZone(idx, 'maxKm', parseFloat(e.target.value) || 0)} className="w-20 p-2 bg-white border border-slate-200 rounded-lg text-center" />
                    <span className="text-slate-400">km  =  $</span>
                    <input type="number" step="0.25" value={z.cost} onChange={e => updateZone(idx, 'cost', parseFloat(e.target.value) || 0)} className="w-24 p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-center" />
                    <button onClick={() => removeZone(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg ml-auto"><Trash2 className="size-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. SECCIÓN COSTO DE EMPAQUE (TAKE AWAY) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Package className="size-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Configuración de Empaque (Para Llevar / Pickup)</h2>
              <p className="text-xs text-slate-500">Aplica recargos automáticos por empaque o descartables</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={pickupEnabled} onChange={e => setPickupEnabled(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>

        {pickupEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Modalidad de Empaque</label>
              <select value={packagingType} onChange={e => setPackagingType(e.target.value as any)} className="w-full text-sm p-3 border border-slate-200 rounded-xl outline-none font-semibold bg-slate-50">
                <option value="FREE">Gratis ($0.00)</option>
                <option value="FLAT">Tarifa Fija por Pedido</option>
                <option value="PER_PRODUCT">Tarifa por Producto</option>
              </select>
            </div>

            {packagingType !== 'FREE' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Monto ($)</label>
                <input type="number" step="0.05" value={packagingAmount} onChange={e => setPackagingAmount(parseFloat(e.target.value) || 0)} className="w-full text-sm p-3 border border-slate-200 rounded-xl outline-none" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
