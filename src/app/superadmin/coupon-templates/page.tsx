'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag, Plus, Trash2, Edit2, Save, X, Loader2, Info, CheckCircle, Clock
} from 'lucide-react';

export default function SuperAdminCouponTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState<'PORCENTAJE' | 'FIJO'>('PORCENTAJE');
  const [valor, setValor] = useState<number>(10);
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/superadmin/coupon-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
      }
    } catch (err) {
      console.error('Error fetching coupon templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setNombre('');
    setDescripcion('');
    setCodigo('');
    setTipo('PORCENTAJE');
    setValor(10);
    setActivo(true);
    setShowModal(true);
  };

  const openEditModal = (template: any) => {
    setEditingTemplate(template);
    setNombre(template.nombre);
    setDescripcion(template.descripcion);
    const config = template.config || {};
    setCodigo(config.codigo || '');
    setTipo(config.tipo || 'PORCENTAJE');
    setValor(config.valor || 0);
    setActivo(template.activo);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const method = editingTemplate ? 'PUT' : 'POST';
      const res = await fetch('/api/superadmin/coupon-templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplate?.id,
          nombre,
          descripcion,
          config: { tipo, valor, codigo: codigo.trim().toUpperCase() },
          activo
        })
      });

      if (res.ok) {
        setShowModal(false);
        fetchTemplates();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error('Error saving coupon template:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas desactivar esta plantilla de cupón? Los negocios que la usan conservarán la versión actual pero ya no aparecerá como plantilla oficial.')) return;
    try {
      const res = await fetch(`/api/superadmin/coupon-templates/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTemplates();
      } else {
        alert('Error al desactivar la plantilla de cupón.');
      }
    } catch (err) {
      console.error('Error deleting coupon template:', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <Tag className="text-emerald-400" size={24} />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">Plantillas de Cupones Citiox</h2>
          </div>
          <p className="text-slate-400 text-sm max-w-xl">
            Crea y administra las plantillas globales de cupones oficiales de Citiox. 
            Los negocios del club podrán heredarlas y activarlas de forma inmediata para sus clientes.
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition-all text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20 border-none relative z-10 cursor-pointer"
        >
          <Plus size={20} />
          Crear Plantilla
        </button>
      </div>

      {/* Info Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 text-slate-600 text-sm">
        <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />
        <div>
          <span className="font-bold text-slate-800">Sobre la Herencia de Cupones:</span> Las plantillas creadas aquí se propagan automáticamente al catálogo de cupones de todos los negocios en modo 🟢 <strong>Oficial Citiox</strong>. Cada negocio tiene control para habilitar, personalizar (Copy-On-Write) o deshabilitar estas plantillas locales desde su panel del Club.
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin text-emerald-500 mb-4" size={32} />
          <p className="font-semibold">Cargando plantillas de cupones...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Tag className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-slate-700 font-bold text-lg mb-1">No hay plantillas de cupones</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
            Aún no has creado ninguna plantilla global de cupón oficial. Haz clic en "Crear Plantilla" para empezar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => {
            const config = template.config || {};
            return (
              <div 
                key={template.id} 
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                      {config.tipo === 'PORCENTAJE' ? `${config.valor}% DTO` : `$${config.valor} DTO`}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      template.activo ? 'bg-emerald-50 text-emerald-600 border border-emerald-150' : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}>
                      {template.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-2">
                    {template.nombre}
                  </h3>
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Código: <span className="text-emerald-500">{config.codigo ?? `CITIOX-${template.id.substring(0, 5).toUpperCase()}`}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6">
                    {template.descripcion || 'Sin descripción'}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(template)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer border-none"
                    >
                      <Edit2 size={16} />
                    </button>
                    {template.activo && (
                      <button 
                        onClick={() => handleDelete(template.id)}
                        className="p-2 text-slate-450 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer border-none"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Creado {new Date(template.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-extrabold text-slate-900">
                {editingTemplate ? 'Editar Plantilla de Cupón' : 'Nueva Plantilla de Cupón'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all cursor-pointer border-none bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">Nombre de la Plantilla</label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={e => setNombre(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                  placeholder="Ej: Descuento Bienvenida"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">Código de Cupón (para el cliente)</label>
                <input 
                  type="text" 
                  value={codigo} 
                  onChange={e => setCodigo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                  placeholder="Ej: BIENVENIDA10"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">Descripción del Beneficio</label>
                <textarea 
                  value={descripcion} 
                  onChange={e => setDescripcion(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm h-24 resize-none"
                  placeholder="Describe qué obtiene el cliente y las condiciones..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">Tipo de Descuento</label>
                  <select 
                    value={tipo} 
                    onChange={e => setTipo(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
                  >
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="FIJO">Monto Fijo ($)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">Valor de Descuento</label>
                  <input 
                    type="number" 
                    value={valor} 
                    onChange={e => setValor(parseFloat(e.target.value))}
                    min="1"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <input 
                  type="checkbox" 
                  id="activo" 
                  checked={activo} 
                  onChange={e => setActivo(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 border-slate-350 rounded focus:ring-emerald-500"
                />
                <label htmlFor="activo" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                  Plantilla Activa (Disponible para que los negocios la hereden)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm border-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm border-none shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Guardar Plantilla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
