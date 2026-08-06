'use client';
// src/app/admin/mesas/page.tsx
// Módulo de gestión de Mesas (OperableResource category=TABLE) dentro del Business Admin Citiox

import { useState, useEffect } from 'react';
import { Layout, Plus, Edit3, Trash2, Loader2, RefreshCw, Check, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Table { id: string; name: string; estado: string; capacity: number; }

const TABLE_STATES = ['DISPONIBLE', 'OCUPADA', 'RESERVADA'];
const TABLE_COLORS: Record<string, string> = { DISPONIBLE: '#10b981', OCUPADA: '#f59e0b', RESERVADA: '#6366f1' };

export default function AdminMesasPage() {
  const { data: session } = useSession();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', capacity: 4, estado: 'DISPONIBLE' });

  useEffect(() => {
    async function loadNegocio() {
      try {
        const res = await fetch('/api/negocio');
        if (res.ok) {
          const neg = await res.json();
          setSlug(neg.slug);
        }
      } catch (_) {}
    }
    loadNegocio();
  }, []);

  useEffect(() => {
    if (slug) loadTables();
  }, [slug]);

  async function loadTables() {
    setLoading(true);
    try {
      const res = await fetch(`/api/${slug}/tables`);
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveTable() {
    if (!form.name || !slug) return;
    const isEdit = !!form.id;
    const res = isEdit
      ? await fetch(`/api/${slug}/tables/${form.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      : await fetch(`/api/${slug}/tables`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });

    if (res.ok) {
      setShowModal(false);
      setForm({ id: '', name: '', capacity: 4, estado: 'DISPONIBLE' });
      loadTables();
    }
  }

  async function deleteTable(id: string) {
    if (!confirm('¿Eliminar esta mesa?')) return;
    await fetch(`/api/${slug}/tables/${id}`, { method: 'DELETE' });
    setTables(prev => prev.filter(t => t.id !== id));
  }

  async function changeState(id: string, estado: string) {
    await fetch(`/api/${slug}/tables/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) });
    setTables(prev => prev.map(t => t.id === id ? { ...t, estado } : t));
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[500px]">
      <Loader2 className="animate-spin text-slate-400 size-8" />
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Layout className="text-sky-500 size-7" />
            Gestión de Mesas e Infraestructura
          </h1>
          <p className="text-sm text-slate-500 mt-1">Plano operativo de mesas activas y capacidad de salón</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadTables} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50">
            <RefreshCw className="size-4" /> Recargar
          </button>
          <button onClick={() => { setForm({ id: '', name: `Mesa ${tables.length + 1}`, capacity: 4, estado: 'DISPONIBLE' }); setShowModal(true); }}
            className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all">
            <Plus className="size-4" /> Agregar Mesa
          </button>
        </div>
      </div>

      {/* State Badges */}
      <div className="flex gap-4">
        {TABLE_STATES.map(s => (
          <div key={s} className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
            <div className="size-2.5 rounded-full" style={{ backgroundColor: TABLE_COLORS[s] }} />
            <span className="text-xs font-bold text-slate-700">{s}: {tables.filter(t => t.estado === s).length}</span>
          </div>
        ))}
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map(table => (
          <div key={table.id} className="bg-white border-2 rounded-2xl p-5 shadow-sm flex flex-col justify-between" style={{ borderColor: `${TABLE_COLORS[table.estado] || '#e2e8f0'}` }}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-lg text-slate-900">{table.name}</span>
                <span className="size-3 rounded-full" style={{ backgroundColor: TABLE_COLORS[table.estado] }} />
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mb-4">
                <Users className="size-3.5" /> Capacidad: <strong className="text-slate-700">{table.capacity} pers.</strong>
              </p>
            </div>

            <div className="space-y-2">
              <select value={table.estado} onChange={e => changeState(table.id, e.target.value)} className="w-full text-xs font-bold p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                {TABLE_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setForm({ id: table.id, name: table.name, capacity: table.capacity, estado: table.estado }); setShowModal(true); }} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"><Edit3 className="size-3.5" /></button>
                <button onClick={() => deleteTable(table.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Agregar / Editar Mesa */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-black text-lg text-slate-900">{form.id ? 'Editar Mesa' : 'Nueva Mesa'}</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre / Identificador</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Mesa 21" className="w-full text-sm p-2.5 border border-slate-200 rounded-xl outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Capacidad de Personas</label>
              <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))} className="w-full text-sm p-2.5 border border-slate-200 rounded-xl outline-none" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Cancelar</button>
              <button onClick={saveTable} className="flex-1 py-2.5 bg-sky-500 text-white rounded-xl text-xs font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
