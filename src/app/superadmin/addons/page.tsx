'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, CheckCircle2, Zap, Sliders, ShieldCheck, Loader2, DollarSign, Edit3, Power, AlertTriangle } from 'lucide-react';

interface AddonItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  type: 'CAPABILITY' | 'LIMIT';
  targetKey: string;
  amount: number | null;
  stackable: boolean;
  maxQuantity: number | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function SuperAdminAddonsPage() {
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    id: '',
    code: '',
    name: '',
    description: '',
    priceMonthly: '10',
    type: 'CAPABILITY' as 'CAPABILITY' | 'LIMIT',
    targetKey: 'ECOMMERCE',
    amount: '1',
    stackable: false,
    maxQuantity: '',
    active: true
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

  const handleOpenCreate = () => {
    setIsEditing(false);
    setForm({
      id: '',
      code: '',
      name: '',
      description: '',
      priceMonthly: '10',
      type: 'CAPABILITY',
      targetKey: 'ECOMMERCE',
      amount: '1',
      stackable: false,
      maxQuantity: '',
      active: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (addon: AddonItem) => {
    setIsEditing(true);
    setForm({
      id: addon.id,
      code: addon.code,
      name: addon.name,
      description: addon.description || '',
      priceMonthly: addon.priceMonthly.toString(),
      type: addon.type,
      targetKey: addon.targetKey,
      amount: addon.amount ? addon.amount.toString() : '1',
      stackable: addon.stackable,
      maxQuantity: addon.maxQuantity ? addon.maxQuantity.toString() : '',
      active: addon.active
    });
    setShowModal(true);
  };

  const handleToggleActive = async (addon: AddonItem) => {
    try {
      setTogglingId(addon.id);
      const res = await fetch(`/api/superadmin/addons/${addon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !addon.active })
      });
      if (res.ok) {
        await fetchAddons();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al cambiar estado del Add-on');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = isEditing ? `/api/superadmin/addons/${form.id}` : '/api/superadmin/addons';
      const method = isEditing ? 'PATCH' : 'POST';

      const payload: any = {
        code: form.code,
        name: form.name,
        description: form.description,
        priceMonthly: form.priceMonthly,
        type: form.type,
        targetKey: form.targetKey,
        amount: form.type === 'LIMIT' ? form.amount : null,
        stackable: form.stackable,
        maxQuantity: form.stackable && form.maxQuantity ? form.maxQuantity : null,
        active: form.active
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowModal(false);
        await fetchAddons();
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
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Catálogo de Add-ons Citiox</h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Configuración universal, persistente y auditable de módulos adicionales y extensiones de límites
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
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
      ) : addons.length === 0 ? (
        <div className="py-20 text-center text-slate-500 bg-white border border-slate-200 rounded-3xl p-8">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-500 mb-3" />
          <h3 className="text-base font-black">No hay add-ons registrados</h3>
          <p className="text-xs text-slate-400 mt-1">Crea nuevos add-ons o ejecuta el seeder canónico.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {addons.map(addon => (
            <div
              key={addon.id}
              className={`bg-white border-2 rounded-3xl p-5 shadow-xs space-y-4 transition-all flex flex-col justify-between ${
                addon.active
                  ? 'border-slate-200/80 hover:border-amber-400'
                  : 'border-rose-200 bg-rose-50/20 opacity-80'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    addon.type === 'CAPABILITY' 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {addon.type === 'CAPABILITY' ? '⚡ Capacidad' : '📈 Límite'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      addon.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {addon.active ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className="font-mono font-black text-sm text-slate-900">${addon.priceMonthly.toFixed(2)}/m</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-black text-base text-slate-900 leading-tight">{addon.name}</h3>
                  <p className="text-[11px] font-mono text-slate-400 uppercase mt-0.5">{addon.code}</p>
                </div>
                
                <p className="text-xs text-slate-500 font-medium leading-relaxed min-h-[36px]">
                  {addon.description || 'Sin descripción'}
                </p>
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

                {/* Acciones de Edición y Desactivación */}
                <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEdit(addon)}
                    className="flex items-center gap-1.5 text-xs font-black text-slate-700 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>

                  <button
                    onClick={() => handleToggleActive(addon)}
                    disabled={togglingId === addon.id}
                    className={`flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      addon.active
                        ? 'text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                        : 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {addon.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación / Edición */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <h2 className="text-xl font-black text-slate-900">
              {isEditing ? 'Editar Add-on Comercial' : 'Crear Nuevo Add-on Comercial'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Código Único (ID / Code):</label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  placeholder="Ej: ADDON_PROMOTIONS"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 uppercase font-mono outline-none ${
                    isEditing ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''
                  }`}
                />
                {isEditing && (
                  <p className="text-[10px] text-slate-400 mt-1">El código es inmutable para proteger los contratos activos.</p>
                )}
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
                  placeholder="Ej: ECOMMERCE, MAX_BRANCHES, MAX_STAFF, MAX_APPOINTMENTS_MONTHLY"
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

              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2">
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

                {form.stackable && (
                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">Cantidad Máxima Permitida (opcional):</label>
                    <input
                      type="number"
                      placeholder="Dejar vacío si no hay límite"
                      value={form.maxQuantity}
                      onChange={e => setForm({ ...form, maxQuantity: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : (isEditing ? 'Actualizar Add-on' : 'Guardar Add-on')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
