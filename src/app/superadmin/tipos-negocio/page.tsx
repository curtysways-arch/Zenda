'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Briefcase, 
  Dribbble, 
  Sparkles, 
  ShoppingBag, 
  Shirt, 
  Utensils, 
  Calendar, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  Layers,
  Sliders,
  ShieldCheck,
  Zap,
  Tag,
  Palette,
  X
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  Calendar,
  Dribbble,
  Shirt,
  Utensils,
  ShoppingBag,
  Briefcase,
  Sparkles
};

export default function TiposNegocioSuperAdminPage() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'Briefcase',
    color: '#6366f1',
    resourceType: 'HUMAN'
  });

  const fetchTipos = async () => {
    try {
      const res = await fetch('/api/superadmin/tipos-negocio');
      if (res.ok) {
        const data = await res.json();
        setTipos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTipos();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name || !newForm.slug) return;
    setCreating(true);

    try {
      const res = await fetch('/api/superadmin/tipos-negocio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm)
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewForm({ name: '', slug: '', description: '', icon: 'Briefcase', color: '#6366f1', resourceType: 'HUMAN' });
        fetchTipos();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al crear tipo de negocio');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/80 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <Briefcase size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-white italic">
                Business Types Manager
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Gobernanza oficial de tipos de negocio, máquinas de estado, capabilities y plantillas
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-3 px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
        >
          <Plus size={18} strokeWidth={3} />
          Nuevo Business Type
        </button>
      </div>

      {/* Warning Box */}
      <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-4 text-xs font-bold text-indigo-300">
        <ShieldCheck size={24} className="text-indigo-400 shrink-0" />
        <div>
          <span className="font-black text-white uppercase tracking-wider block">Gobernanza Arquitectónica (Core Congelado):</span>
          Los Business Types no modifican los Core Engines (<code className="text-emerald-400 font-mono">BookingEngine</code>, <code className="text-emerald-400 font-mono">OrderEngine</code>, <code className="text-emerald-400 font-mono">ServiceEngine</code>). El motor de ejecución se deduce dinámicamente según las capabilities activadas.
        </div>
      </div>

      {/* Grid of Business Types */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-emerald-500" size={36} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tipos.map((type) => {
            const IconComponent = ICON_MAP[type.icon] || Briefcase;
            return (
              <div 
                key={type.id} 
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all rounded-3xl p-6 flex flex-col justify-between space-y-6 group hover:shadow-2xl hover:shadow-indigo-500/5 relative overflow-hidden"
              >
                <div 
                  className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 pointer-events-none rounded-full"
                  style={{ backgroundColor: type.color }}
                />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div 
                      className="p-4 rounded-2xl border text-white font-black flex items-center justify-center"
                      style={{ backgroundColor: `${type.color}20`, borderColor: `${type.color}40`, color: type.color }}
                    >
                      <IconComponent size={26} />
                    </div>
                    <span className="text-[10px] font-mono font-black uppercase px-3 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                      {type.slug}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors">
                      {type.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {type.description || 'Sin descripción'}
                    </p>
                  </div>

                  {/* Capabilities List Badges */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[9px] uppercase tracking-widest text-slate-400 font-black block">Capabilities Activas:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {type.capabilities?.map((c: any) => (
                        <span key={c.capability} className="text-[10px] font-bold px-2.5 py-1 bg-slate-800/80 text-emerald-400 border border-emerald-500/20 rounded-lg">
                          ⚡ {c.capability}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats Counter */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center border-t border-slate-800/60">
                    <div className="p-2 bg-slate-950/50 rounded-xl">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Estados</span>
                      <span className="text-sm font-black text-white">{type.states?.length || 0}</span>
                    </div>
                    <div className="p-2 bg-slate-950/50 rounded-xl">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Perfiles</span>
                      <span className="text-sm font-black text-white">{type.profiles?.length || 0}</span>
                    </div>
                    <div className="p-2 bg-slate-950/50 rounded-xl">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Comercios</span>
                      <span className="text-sm font-black text-emerald-400">{type._count?.negocios || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 relative z-10">
                  <Link
                    href={`/superadmin/tipos-negocio/${type.id}`}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer group/btn"
                  >
                    Configurar Flujos & Módulo
                    <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear Business Type */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white uppercase italic flex items-center gap-2">
                <Plus className="text-emerald-400" size={20} />
                Nuevo Business Type
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-2">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Nombre</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej: Veterinaria & Mascotas"
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Slug Identifier</label>
                <input 
                  type="text"
                  required
                  placeholder="ej: veterinaria"
                  value={newForm.slug}
                  onChange={(e) => setNewForm({ ...newForm, slug: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Descripción</label>
                <textarea 
                  rows={2}
                  placeholder="Breve explicación de la vertical de negocio..."
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Tipo de Recurso</label>
                  <select
                    value={newForm.resourceType}
                    onChange={(e) => setNewForm({ ...newForm, resourceType: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                  >
                    <option value="HUMAN">HUMAN (Profesional)</option>
                    <option value="INFRASTRUCTURE">INFRASTRUCTURE (Cancha/Sala)</option>
                    <option value="EQUIPMENT">EQUIPMENT (Equipo/Vehículo)</option>
                    <option value="PHYSICAL_ITEM">PHYSICAL_ITEM (Prenda/Artículo)</option>
                    <option value="NONE">NONE (Sin recurso)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Color Principal</label>
                  <input 
                    type="color"
                    value={newForm.color}
                    onChange={(e) => setNewForm({ ...newForm, color: e.target.value })}
                    className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-1/2 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 className="animate-spin" size={16} />}
                  Crear Módulo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
