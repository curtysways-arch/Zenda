'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Dumbbell, Plus, Edit2, Trash2, ChevronUp, ChevronDown,
  Eye, EyeOff, Save, X, ImagePlus, Loader2, Tag, Info
} from 'lucide-react';

interface GymArea {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  imageMediaId?: string | null;
  order: number;
  active: boolean;
  equipment?: { id: string; name: string; active: boolean }[];
}

interface GymEquipment {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  imageMediaId?: string | null;
  areaId?: string | null;
  area?: { id: string; name: string } | null;
  order: number;
  active: boolean;
}

interface ItemFormData {
  name: string;
  description: string;
  imageUrl: string;
  areaId?: string;
  order: number;
  active: boolean;
}

const defaultForm: ItemFormData = {
  name: '',
  description: '',
  imageUrl: '',
  areaId: '',
  order: 0,
  active: true
};

export default function GymKnowTheGymAdmin({ negocioSlug }: { negocioSlug: string }) {
  const [tab, setTab] = useState<'areas' | 'equipment'>('areas');
  const [areas, setAreas] = useState<GymArea[]>([]);
  const [equipment, setEquipment] = useState<GymEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemFormData>(defaultForm);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [areasRes, equipRes] = await Promise.all([
        fetch('/api/admin/gym/areas'),
        fetch('/api/admin/gym/equipment')
      ]);
      const areasData = await areasRes.json();
      const equipData = await equipRes.json();
      if (areasData.success) setAreas(areasData.areas);
      if (equipData.success) setEquipment(equipData.equipment);
    } catch (err) {
      console.error('Error fetching gym content:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm, order: (tab === 'areas' ? areas.length : equipment.length) });
    setModalOpen(true);
  };

  const openEdit = (item: GymArea | GymEquipment) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      areaId: (item as GymEquipment).areaId || '',
      order: item.order,
      active: item.active
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', tab === 'areas' ? 'gym_area' : 'gym_equipment');
      const res = await fetch('/api/superadmin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) {
        setForm(prev => ({ ...prev, imageUrl: data.url }));
      }
    } catch (err) {
      console.error('Error uploading image:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const isArea = tab === 'areas';
      const endpoint = isArea
        ? (editingId ? `/api/admin/gym/areas/${editingId}` : '/api/admin/gym/areas')
        : (editingId ? `/api/admin/gym/equipment/${editingId}` : '/api/admin/gym/equipment');

      const body: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl || null,
        order: form.order,
        active: form.active
      };
      if (!isArea) body.areaId = form.areaId || null;

      const res = await fetch(endpoint, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        closeModal();
      }
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, type: 'areas' | 'equipment') => {
    if (!confirm('¿Eliminar este elemento?')) return;
    try {
      await fetch(`/api/admin/gym/${type}/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const handleToggleActive = async (id: string, type: 'areas' | 'equipment', currentActive: boolean) => {
    try {
      await fetch(`/api/admin/gym/${type}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive })
      });
      await fetchData();
    } catch (err) {
      console.error('Error toggling active:', err);
    }
  };

  const handleReorder = async (id: string, type: 'areas' | 'equipment', direction: 'up' | 'down') => {
    const list = type === 'areas' ? [...areas] : [...equipment];
    const idx = list.findIndex(i => i.id === id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === list.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newOrder = list[swapIdx].order;
    const currentOrder = list[idx].order;

    await Promise.all([
      fetch(`/api/admin/gym/${type}/${list[idx].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder })
      }),
      fetch(`/api/admin/gym/${type}/${list[swapIdx].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: currentOrder })
      })
    ]);
    await fetchData();
  };

  const currentList = tab === 'areas' ? areas : equipment;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conoce el Gimnasio</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configura las áreas e instalaciones que verán los visitantes en tu landing.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={`/${negocioSlug}#conoce-el-gym`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye size={16} /> Ver landing
          </a>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
          >
            <Plus size={16} />
            {tab === 'areas' ? 'Nueva Área' : 'Nuevo Equipo'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab('areas')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'areas'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 size={16} />
          Áreas del Gimnasio
          <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
            {areas.length}
          </span>
        </button>
        <button
          onClick={() => setTab('equipment')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'equipment'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Dumbbell size={16} />
          Equipamiento
          <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
            {equipment.length}
          </span>
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          {tab === 'areas'
            ? 'Las áreas activas aparecerán en la sección "Conoce nuestro Gimnasio" de la landing pública. Si no hay áreas activas, la sección se ocultará automáticamente.'
            : 'El equipamiento activo aparecerá agrupado por área en la landing. Puedes asignar un equipo a un área o dejarlo sin área para mostrarlo en sección general.'}
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-orange-500" size={32} />
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          {tab === 'areas' ? <Building2 className="mx-auto text-gray-300 mb-3" size={48} /> : <Dumbbell className="mx-auto text-gray-300 mb-3" size={48} />}
          <p className="text-gray-500 font-medium">
            {tab === 'areas' ? 'No hay áreas configuradas' : 'No hay equipamiento configurado'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {tab === 'areas' ? 'Agrega áreas como Cardio, Peso Libre, Spinning, etc.' : 'Agrega máquinas y equipos del gimnasio.'}
          </p>
          <button
            onClick={openCreate}
            className="mt-4 px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus size={14} className="inline mr-1.5" />
            {tab === 'areas' ? 'Nueva Área' : 'Nuevo Equipo'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentList.map((item, idx) => (
            <div
              key={item.id}
              className={`relative rounded-2xl border overflow-hidden transition-all ${
                item.active ? 'border-gray-200 bg-white shadow-sm' : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              {/* Imagen */}
              <div className="aspect-video bg-gray-100 relative overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {tab === 'areas' ? <Building2 className="text-gray-300" size={40} /> : <Dumbbell className="text-gray-300" size={40} />}
                  </div>
                )}
                {/* Badge activo/inactivo */}
                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  item.active ? 'bg-emerald-500 text-white' : 'bg-gray-400 text-white'
                }`}>
                  {item.active ? 'Visible' : 'Oculto'}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-sm truncate">{item.name}</h3>
                {item.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                )}
                {tab === 'equipment' && (item as GymEquipment).area && (
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-semibold border border-orange-100">
                    <Tag size={10} /> {(item as GymEquipment).area?.name}
                  </span>
                )}
                {tab === 'areas' && (item as GymArea).equipment && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    {(item as GymArea).equipment!.length} equipos
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleReorder(item.id, tab, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-20"
                    title="Subir"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => handleReorder(item.id, tab, 'down')}
                    disabled={idx === currentList.length - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-20"
                    title="Bajar"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleToggleActive(item.id, tab, item.active)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      item.active ? 'hover:bg-gray-100 text-emerald-500' : 'hover:bg-gray-100 text-gray-400'
                    }`}
                    title={item.active ? 'Ocultar' : 'Mostrar'}
                  >
                    {item.active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, tab)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId
                  ? (tab === 'areas' ? 'Editar Área' : 'Editar Equipo')
                  : (tab === 'areas' ? 'Nueva Área' : 'Nuevo Equipo')}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={tab === 'areas' ? 'Ej. Área de Musculación' : 'Ej. Trotadora Pro 2000'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none text-sm"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción breve visible en la landing..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none text-sm resize-none"
                />
              </div>

              {/* Imagen */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Imagen
                </label>
                {form.imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video mb-2">
                    <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm(p => ({ ...p, imageUrl: '' }))}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg hover:bg-black/80"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 aspect-video border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-colors">
                    {uploadingImage ? (
                      <Loader2 className="animate-spin text-orange-500" size={24} />
                    ) : (
                      <>
                        <ImagePlus size={28} className="text-gray-300" />
                        <span className="text-xs text-gray-400">Click para subir imagen</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }}
                    />
                  </label>
                )}
                <p className="text-[10px] text-gray-400 mt-1">O pega una URL:</p>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none text-sm mt-1"
                />
              </div>

              {/* Área asignada (solo para equipamiento) */}
              {tab === 'equipment' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Área (Opcional)
                  </label>
                  <select
                    value={form.areaId || ''}
                    onChange={e => setForm(p => ({ ...p, areaId: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none text-sm bg-white"
                  >
                    <option value="">Sin área asignada</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Orden */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Orden
                </label>
                <input
                  type="number"
                  value={form.order}
                  onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) }))}
                  min={0}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:outline-none text-sm"
                />
              </div>

              {/* Activo */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Visible en la landing</p>
                  <p className="text-xs text-gray-400">Los elementos inactivos no aparecerán públicamente.</p>
                </div>
                <button
                  onClick={() => setForm(p => ({ ...p, active: !p.active }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${form.active ? 'bg-orange-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingId ? 'Guardar cambios' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
