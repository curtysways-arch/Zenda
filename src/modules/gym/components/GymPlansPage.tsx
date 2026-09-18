'use client';

import React, { useState, useEffect } from 'react';
import { Tags, Plus, Edit2, Trash2, CheckCircle2, Sparkles, X, Check } from 'lucide-react';

export default function GymPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    durationDays: '30',
    displayOrder: '0',
    featured: false,
    active: true,
    benefitsText: ''
  });

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/gym/plans');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPlans(data.plans || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      currency: 'USD',
      durationDays: '30',
      displayOrder: '0',
      featured: false,
      active: true,
      benefitsText: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (plan: any) => {
    setEditingPlan(plan);
    const bList = Array.isArray(plan.benefits) ? plan.benefits.join('\n') : '';
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      currency: plan.currency || 'USD',
      durationDays: plan.durationDays.toString(),
      displayOrder: (plan.displayOrder || 0).toString(),
      featured: Boolean(plan.featured),
      active: Boolean(plan.active),
      benefitsText: bList
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const benefitsArray = formData.benefitsText
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    const payload = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      currency: formData.currency,
      durationDays: parseInt(formData.durationDays, 10),
      displayOrder: parseInt(formData.displayOrder, 10),
      featured: formData.featured,
      active: formData.active,
      benefits: benefitsArray
    };

    try {
      const url = editingPlan ? `/api/admin/gym/plans/${editingPlan.id}` : '/api/admin/gym/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setFeedback(editingPlan ? 'Plan actualizado con éxito' : 'Plan creado con éxito');
        fetchPlans();
      } else {
        alert(data.error || 'Error al guardar el plan');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (plan: any) => {
    if (!confirm(`¿Eliminar o desactivar el plan "${plan.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/gym/plans/${plan.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback(data.message || 'Plan procesado');
        fetchPlans();
      } else {
        alert(data.error || 'Error al eliminar');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Planes de Membresía
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Configuración de productos comerciales (mensual, trimestral, anual o personalizados)
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
        >
          <Plus size={16} />
          Nuevo Plan
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}><X size={14} /></button>
        </div>
      )}

      {/* Grid de Planes */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          Cargando planes...
        </div>
      ) : plans.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <Tags size={36} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No hay planes creados aún</h3>
          <p className="text-xs text-slate-500 mt-1">Crea tu primer plan para comenzar a vender membresías.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const benefitsList = Array.isArray(p.benefits) ? p.benefits : [];

            return (
              <div
                key={p.id}
                className={`p-6 rounded-2xl border flex flex-col justify-between transition-all ${
                  p.featured
                    ? 'bg-white dark:bg-slate-900 border-orange-500 shadow-md ring-1 ring-orange-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                } ${!p.active ? 'opacity-60' : ''}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      {p.featured && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500 text-white mb-2">
                          Destacado
                        </span>
                      )}
                      <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white">
                        {p.name}
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      p.active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {p.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {p.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                      {p.description}
                    </p>
                  )}

                  <div className="flex items-baseline gap-1 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                      ${p.price}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      / {p.durationDays} días
                    </span>
                  </div>

                  <div className="space-y-2 mb-6">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Beneficios incluidos:
                    </p>
                    {benefitsList.map((b: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <CheckCircle2 size={14} className="text-orange-500 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {p._count?.memberships || 0} socio{p._count?.memberships === 1 ? '' : 's'}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                      title="Editar plan"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Eliminar o desactivar plan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL FORMULARIO DE PLAN ─────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white">
                {editingPlan ? 'Editar Plan de Membresía' : 'Nuevo Plan de Membresía'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Nombre del Plan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mensual, Trimestral, Pase Anual Pro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  placeholder="Descripción corta para la landing pública..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Precio ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="30.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Duración (Días) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="30"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Beneficios (Uno por línea)
                </label>
                <textarea
                  rows={4}
                  placeholder="Acceso total máquinas&#10;Área de cardio y pesas&#10;Clases grupales incluidas"
                  value={formData.benefitsText}
                  onChange={(e) => setFormData({ ...formData, benefitsText: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4"
                  />
                  Destacar en Landing
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4"
                  />
                  Plan Activo
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
