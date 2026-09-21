'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Tag, Dumbbell, Edit2, Trash2, Eye, EyeOff, Loader2, X, Save, Calendar, Flame } from 'lucide-react';
import GymPromotionForm, { GymPromoMeta } from './GymPromotionForm';

interface GymPromocion {
  id: string;
  titulo: string;
  descripcion: string;
  imagenUrl?: string;
  estado: string;
  precioPromo?: number;
  precioAnterior?: number;
  fechaInicio?: string;
  fechaFin?: string;
  tipoPromo?: string;
}

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
}

interface GymPromocionesViewProps {
  initialPromotions: GymPromocion[];
  membershipPlans: MembershipPlan[];
  negocio: any;
}

function parseMetaFromDescription(descripcion: string): { cleanDesc: string; meta: any } {
  let cleanDesc = descripcion || '';
  let meta: any = {};
  if (cleanDesc.includes('<!-- CITIOX_META:')) {
    try {
      const parts = cleanDesc.split('<!-- CITIOX_META:');
      cleanDesc = parts[0].trim();
      meta = JSON.parse(parts[1].split('-->')[0].trim());
    } catch (_) {}
  }
  return { cleanDesc, meta };
}

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  publicado: { label: 'Publicado', color: 'bg-emerald-100 text-emerald-700' },
  publicada: { label: 'Publicado', color: 'bg-emerald-100 text-emerald-700' },
  activa: { label: 'Activa', color: 'bg-emerald-100 text-emerald-700' },
  ACTIVA: { label: 'Activa', color: 'bg-emerald-100 text-emerald-700' },
  borrador: { label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
  inactiva: { label: 'Inactiva', color: 'bg-gray-100 text-gray-500' },
  vencida: { label: 'Vencida', color: 'bg-red-100 text-red-500' },
};

export default function GymPromocionesView({ initialPromotions, membershipPlans, negocio }: GymPromocionesViewProps) {
  const [promotions, setPromotions] = useState<GymPromocion[]>(initialPromotions);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [precioPromo, setPrecioPromo] = useState('');
  const [precioAnterior, setPrecioAnterior] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [estado, setEstado] = useState('publicado');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [currentFullDescription, setCurrentFullDescription] = useState('');
  const [currentMeta, setCurrentMeta] = useState<GymPromoMeta>({ membershipPlanId: null, benefitType: 'DESCUENTO_PORCENTAJE', discountValue: 0, finalPrice: null });

  const fetchPromotions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/gym/promotions');
      const data = await res.json();
      if (data.success) setPromotions(data.promotions);
    } catch (_) {}
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setTitulo('');
    setPrecioPromo('');
    setPrecioAnterior('');
    setImagenUrl('');
    setEstado('publicado');
    setFechaInicio('');
    setFechaFin('');
    setCurrentFullDescription('');
    setCurrentMeta({ membershipPlanId: null, benefitType: 'DESCUENTO_PORCENTAJE', discountValue: 0, finalPrice: null });
    setModalOpen(true);
  };

  const openEdit = (promo: GymPromocion) => {
    const { cleanDesc, meta } = parseMetaFromDescription(promo.descripcion);
    setEditingId(promo.id);
    setTitulo(promo.titulo);
    setPrecioPromo(promo.precioPromo?.toString() || '');
    setPrecioAnterior(promo.precioAnterior?.toString() || '');
    setImagenUrl(promo.imagenUrl || '');
    setEstado(promo.estado);
    setFechaInicio(promo.fechaInicio?.split('T')[0] || '');
    setFechaFin(promo.fechaFin?.split('T')[0] || '');
    // Reconstruct meta for GymPromotionForm initial data
    setCurrentMeta({
      membershipPlanId: meta.membershipPlanId || null,
      benefitType: meta.benefitType || 'DESCUENTO_PORCENTAJE',
      discountValue: meta.discountValue || 0,
      finalPrice: meta.finalPrice || null
    });
    setCurrentFullDescription(promo.descripcion);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const body = {
        titulo: titulo.trim(),
        descripcion: currentFullDescription,
        imagenUrl: imagenUrl || null,
        estado,
        precioPromo: precioPromo ? Number(precioPromo) : null,
        precioAnterior: precioAnterior ? Number(precioAnterior) : null,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        tipoPromo: currentMeta.benefitType || 'DESCUENTO_MEMBRESIA'
      };

      const endpoint = editingId
        ? `/api/admin/gym/promotions/${editingId}`
        : '/api/admin/gym/promotions';

      const res = await fetch(endpoint, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        await fetchPromotions();
        closeModal();
      }
    } catch (err) {
      console.error('Error saving promotion:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta promoción?')) return;
    try {
      await fetch(`/api/admin/gym/promotions/${id}`, { method: 'DELETE' });
      setPromotions(prev => prev.filter(p => p.id !== id));
    } catch (_) {}
  };

  const handleToggleEstado = async (promo: GymPromocion) => {
    const newEstado = ['publicado', 'publicada', 'activa', 'ACTIVA'].includes(promo.estado) ? 'borrador' : 'publicado';
    try {
      await fetch(`/api/admin/gym/promotions/${promo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newEstado })
      });
      setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, estado: newEstado } : p));
    } catch (_) {}
  };

  const isActive = (promo: GymPromocion) =>
    ['publicado', 'publicada', 'activa', 'ACTIVA'].includes(promo.estado);

  const linkedPlanName = (promo: GymPromocion) => {
    const { meta } = parseMetaFromDescription(promo.descripcion);
    if (!meta.membershipPlanId) return null;
    return membershipPlans.find(p => p.id === meta.membershipPlanId)?.name || null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Promociones del Gimnasio</h1>
            <p className="text-sm text-gray-500 mt-1">
              Crea ofertas vinculadas a planes de membresía. Aparecerán destacadas en la landing pública.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} /> Nueva Promoción
          </button>
        </div>

        {/* Info banner */}
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
          <Flame size={18} className="text-orange-500 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-700">
            Las promociones <strong>publicadas</strong> y dentro de las fechas de vigencia se mostrarán en la landing como "Oferta Especial". 
            Solo la primera promo activa se muestra destacada.
          </p>
        </div>

        {/* Lista */}
        {promotions.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
            <Tag className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 font-medium">No hay promociones</p>
            <p className="text-gray-400 text-sm mt-1">Crea tu primera promoción vinculada a un plan de membresía.</p>
            <button onClick={openCreate} className="mt-4 px-5 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600">
              <Plus size={14} className="inline mr-1.5" />Nueva Promoción
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {promotions.map(promo => {
              const estadoInfo = ESTADO_LABELS[promo.estado] || { label: promo.estado, color: 'bg-gray-100 text-gray-500' };
              const planName = linkedPlanName(promo);
              const { cleanDesc } = parseMetaFromDescription(promo.descripcion);
              return (
                <div key={promo.id} className={`bg-white rounded-2xl border p-5 flex gap-4 items-center transition-all ${isActive(promo) ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60'}`}>
                  {/* Imagen */}
                  <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                    {promo.imagenUrl ? (
                      <img src={promo.imagenUrl} alt={promo.titulo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dumbbell className="text-gray-300" size={24} />
                      </div>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 text-sm truncate">{promo.titulo}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${estadoInfo.color}`}>
                        {estadoInfo.label}
                      </span>
                    </div>
                    {cleanDesc && <p className="text-xs text-gray-500 line-clamp-1">{cleanDesc}</p>}
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      {promo.precioPromo != null && (
                        <span className="text-sm font-black text-gray-900">
                          ${promo.precioPromo}
                          {promo.precioAnterior && promo.precioAnterior > promo.precioPromo && (
                            <span className="text-xs text-gray-400 line-through ml-1.5">${promo.precioAnterior}</span>
                          )}
                        </span>
                      )}
                      {planName && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                          {planName}
                        </span>
                      )}
                      {promo.fechaFin && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Calendar size={10} />
                          Hasta {new Date(promo.fechaFin).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleEstado(promo)}
                      className={`p-2 rounded-xl transition-colors ${isActive(promo) ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                      title={isActive(promo) ? 'Desactivar' : 'Activar'}
                    >
                      {isActive(promo) ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button onClick={() => openEdit(promo)} className="p-2 rounded-xl hover:bg-blue-50 text-blue-500 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(promo.id)} className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Editar Promoción' : 'Nueva Promoción'}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Título */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Título *</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ej. Plan Anual con 30% de descuento"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none text-sm"
                />
              </div>

              {/* GymPromotionForm */}
              <GymPromotionForm
                plans={membershipPlans}
                initialData={{
                  membershipPlanId: currentMeta.membershipPlanId || undefined,
                  benefitType: currentMeta.benefitType,
                  discountValue: currentMeta.discountValue
                }}
                onDescriptionChange={(fullDesc, meta) => {
                  setCurrentFullDescription(fullDesc);
                  setCurrentMeta(meta);
                  if (meta.finalPrice !== null && !precioPromo) {
                    setPrecioPromo(meta.finalPrice.toFixed(2));
                  }
                }}
              />

              {/* Precios manuales */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Precio Promo ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={precioPromo}
                    onChange={e => setPrecioPromo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Precio Original ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={precioAnterior}
                    onChange={e => setPrecioAnterior(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Imagen URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Imagen (URL)</label>
                <input
                  type="url"
                  value={imagenUrl}
                  onChange={e => setImagenUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none text-sm"
                />
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Inicio</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={e => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Vencimiento</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={e => setFechaFin(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Estado</label>
                <select
                  value={estado}
                  onChange={e => setEstado(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none text-sm bg-white"
                >
                  <option value="publicado">Publicado (visible en la landing)</option>
                  <option value="borrador">Borrador (no visible)</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 font-medium">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving || !titulo.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingId ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
