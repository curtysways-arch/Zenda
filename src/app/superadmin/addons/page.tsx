'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, CheckCircle2, Zap, Sliders, ShieldCheck, Loader2, DollarSign } from 'lucide-react';
import { AddonDefinition } from '@/core/entitlements/AddonRegistry';

export default function SuperAdminAddonsPage() {
  const [addons, setAddons] = useState<AddonDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    id: '',
    name: '',
    description: '',
    priceMonthly: '10',
    type: 'CAPABILITY' as 'CAPABILITY' | 'LIMIT',
    targetKey: 'ECOMMERCE',
    amount: '1',
    stackable: false
  });

  const fetchAddons = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/superadmin/addons');
      if (res.ok) {
        const data = await res.json();
        setAddons(data.addons || []);
      }
    } catch (e) {
      console.error('Error fetching addons:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddons();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/superadmin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        setForm({
          id: '',
          name: '',
          description: '',
          priceMonthly: '10',
          type: 'CAPABILITY',
          targetKey: 'ECOMMERCE',
          amount: '1',
          stackable: false
        });
        fetchAddons();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar Add-on');
      }
    } catch (e) {
      alert('Error guardando Add-on');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-200">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Administración de Add-ons</h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Configuración comercial de módulos adicionales de capacidad y extensiones de límites para negocios Citiox
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" /> Crear Nuevo Add-on
        </button>
      </div>

      {/* Grid de Addons */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
          <p className="text-xs font-black uppercase tracking-widest">Cargando catálogo de add-ons...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {addons.map(addon => (
            <div
              key={addon.id}
              className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4 hover:border-amber-400 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    addon.type === 'CAPABILITY' 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {addon.type === 'CAPABILITY' ? '⚡ Activador de Capacidad' : '📈 Extensión de Límite'}
                  </span>
                  <span className="font-mono font-black text-sm text-slate-900">${addon.priceMonthly.toFixed(2)}/mes</span>
                </div>

                <h3 className="font-black text-base text-slate-900 leading-tight">{addon.name}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{addon.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 font-semibold">
                  <span>Recurso Afectado:</span>
                  <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{addon.targetKey}</span>
                </div>
                {addon.type === 'LIMIT' && (
                  <div className="flex justify-between text-slate-600 font-semibold">
                    <span>Monto de Extensión:</span>
                    <span className="font-black text-emerald-600">+{addon.amount || 1}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 font-semibold">
                  <span>Acumulable / Múltiple:</span>
                  <span className={`font-black ${addon.stackable ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {addon.stackable ? `Sí (Máx: ${addon.maxQuantity || 'Sin Límite'})` : 'No (Único)'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <h2 className="text-xl font-black text-slate-900">Crear Nuevo Add-on Comercial</h2>
            
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Código Único (ID):</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: ADDON_PROMOTIONS"
                  value={form.id}
                  onChange={e => setForm({ ...form, id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 uppercase font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Nombre del Add-on:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Add-on Promociones & Descuentos"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Descripción:</label>
                <input
                  type="text"
                  placeholder="Ej: Habilita la creación de cupones y ofertas"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Precio Mensual ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.priceMonthly}
                    onChange={e => setForm({ ...form, priceMonthly: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Tipo de Add-on:</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="CAPABILITY">Activar Capacidad</option>
                    <option value="LIMIT">Aumentar Límite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Recurso o Capacidad Afectada:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: ECOMMERCE, branches, professionals, appointmentsMonthly"
                  value={form.targetKey}
                  onChange={e => setForm({ ...form, targetKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                />
              </div>

              {form.type === 'LIMIT' && (
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Cantidad a Sumar al Límite:</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="stackable-check"
                  checked={form.stackable}
                  onChange={e => setForm({ ...form, stackable: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="stackable-check" className="text-slate-800 font-extrabold cursor-pointer">
                  Permitir contratación múltiple / acumulable
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Add-on'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
