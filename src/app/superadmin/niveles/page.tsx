'use client';

import { useState, useEffect } from 'react';
import { 
  Award, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Loader2, 
  Sparkles, 
  Info,
  Layers,
  ChevronRight,
  Shield,
  Star,
  Zap,
  Crown,
  Gem
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Lucide icon mapping for dynamic preview
const ICON_MAP: Record<string, any> = {
  Award, Star, Zap, Crown, Gem, Shield, Trophy: Award // fallback
};

export default function SuperAdminNivelesPage() {
  const [levels, setLevels] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [nombre, setNombre] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [xpRequerida, setXpRequerida] = useState(0);
  const [orden, setOrden] = useState(1);
  const [version, setVersion] = useState('1.0.0');
  const [activo, setActivo] = useState(true);
  
  // UI Presentation states
  const [icono, setIcono] = useState('Award');
  const [color, setColor] = useState('#4f46e5');
  const [imagen, setImagen] = useState('');
  const [tituloUi, setTituloUi] = useState('');
  const [descripcionUi, setDescripcionUi] = useState('');
  const [selectedRewardIds, setSelectedRewardIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [lvlsRes, rwdsRes] = await Promise.all([
        fetch('/api/superadmin/niveles'),
        fetch('/api/superadmin/rewards')
      ]);

      if (lvlsRes.ok) {
        const data = await lvlsRes.json();
        setLevels(data.levels || []);
      }
      if (rwdsRes.ok) {
        const data = await rwdsRes.json();
        setRewards(data.rewards || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingLevel(null);
    setNombre('');
    setTitulo('');
    setDescripcion('');
    setXpRequerida(0);
    setOrden(levels.length + 1);
    setVersion('1.0.0');
    setActivo(true);
    setIcono('Award');
    setColor('#4f46e5');
    setImagen('');
    setTituloUi('');
    setDescripcionUi('');
    setSelectedRewardIds([]);
    setShowModal(true);
  };

  const openEditModal = (level: any) => {
    setEditingLevel(level);
    setNombre(level.nombre);
    setTitulo(level.titulo);
    setDescripcion(level.descripcion || '');
    setXpRequerida(level.xpRequerida);
    setOrden(level.orden);
    setVersion(level.version);
    setActivo(level.activo);

    const pres = level.Presentation || {};
    setIcono(pres.icono || 'Award');
    setColor(pres.color || '#4f46e5');
    setImagen(pres.imagen || '');
    setTituloUi(pres.tituloUi || '');
    setDescripcionUi(pres.descripcionUi || '');
    setSelectedRewardIds((level.Rewards || []).map((r: any) => r.rewardId));
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/superadmin/niveles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingLevel?.id,
          nombre,
          titulo,
          descripcion,
          xpRequerida,
          orden,
          version,
          activo,
          icono,
          color,
          imagen,
          tituloUi,
          descripcionUi,
          rewardIds: selectedRewardIds
        })
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error('Error saving level:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este nivel global? Esto puede afectar a los cálculos dinámicos de nivel de los usuarios.')) return;
    try {
      const res = await fetch(`/api/superadmin/niveles/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Error al eliminar el nivel global.');
      }
    } catch (err) {
      console.error('Error deleting level:', err);
    }
  };

  const handleToggleReward = (id: string) => {
    if (selectedRewardIds.includes(id)) {
      setSelectedRewardIds(selectedRewardIds.filter(x => x !== id));
    } else {
      setSelectedRewardIds([...selectedRewardIds, id]);
    }
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <Layers className="text-indigo-400" size={24} />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">Niveles Globales Citiox</h2>
          </div>
          <p className="text-slate-400 text-sm max-w-xl">
            Gestiona la progresión de niveles de los usuarios finales en la plataforma. 
            El nivel se calcula dinámicamente según la XP acumulada en el Wallet de cada cliente.
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/25 border-none relative z-10 cursor-pointer"
        >
          <Plus size={20} />
          Nuevo Nivel Global
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
          <p className="text-slate-500 font-medium">Cargando niveles globales...</p>
        </div>
      ) : levels.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Award size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No hay niveles configurados</h3>
          <p className="text-slate-500 text-sm">
            Comienza creando el primer nivel del sistema global de gamificación para habilitar la progresión de usuarios.
          </p>
          <button 
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 border-none cursor-pointer"
          >
            Crear Primer Nivel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {levels.map((level) => {
            const pres = level.Presentation || {};
            const LevelIcon = ICON_MAP[pres.icono] || Award;
            return (
              <div 
                key={level.id} 
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-xl hover:border-indigo-200 transition-all group"
              >
                {/* Visual Header */}
                <div className="p-6 border-b border-slate-50 flex items-center justify-between relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full opacity-10 blur-xl" style={{ backgroundColor: pres.color || '#4f46e5' }} />
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
                      style={{ backgroundColor: pres.color || '#4f46e5', boxShadow: `0 8px 20px -6px ${pres.color || '#4f46e5'}` }}
                    >
                      <LevelIcon size={24} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Orden {level.orden} · v{level.version}</span>
                      <h3 className="font-extrabold text-slate-800 text-lg leading-tight">{level.nombre}</h3>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-[9px] font-bold rounded-full uppercase tracking-wider ${level.activo ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                    {level.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Content body */}
                <div className="p-6 flex-1 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Título de Rango</span>
                    <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      {level.titulo}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">XP Requerida</span>
                    <p className="text-2xl font-black text-slate-900">{level.xpRequerida.toLocaleString()} <span className="text-xs font-semibold text-slate-500">XP</span></p>
                  </div>

                  {level.descripcion && (
                    <p className="text-xs text-slate-500 italic line-clamp-2">"{level.descripcion}"</p>
                  )}

                  {/* Rewards List */}
                  {level.Rewards && level.Rewards.length > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Premios al Desbloquear ({level.Rewards.length})</span>
                      <div className="flex flex-wrap gap-1.5">
                        {level.Rewards.map((r: any) => (
                          <span key={r.id} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100">
                            🎁 {r.Reward?.nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button 
                    onClick={() => openEditModal(level)}
                    className="flex items-center gap-1 px-3 py-1.5 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-all border-none bg-transparent cursor-pointer"
                  >
                    <Edit2 size={14} />
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(level.id)}
                    className="flex items-center gap-1 px-3 py-1.5 hover:bg-rose-50 rounded-xl text-xs font-bold text-rose-600 transition-all border-none bg-transparent cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Layers className="text-indigo-600 dark:text-indigo-400" size={20} />
                {editingLevel ? 'Editar Nivel Global' : 'Nuevo Nivel Global'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 border-none bg-transparent cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Nombre del Nivel</label>
                  <input 
                    type="text" 
                    value={nombre} 
                    onChange={e => setNombre(e.target.value)} 
                    placeholder="Ej. Bronce, Plata, Nivel 1" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Título de Rango</label>
                  <input 
                    type="text" 
                    value={titulo} 
                    onChange={e => setTitulo(e.target.value)} 
                    placeholder="Ej. Explorador Urbano, Gran Maestro" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Descripción</label>
                <textarea 
                  value={descripcion} 
                  onChange={e => setDescripcion(e.target.value)} 
                  placeholder="Describe los beneficios o detalles de este nivel global..." 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">XP Requerida</label>
                  <input 
                    type="number" 
                    value={xpRequerida} 
                    onChange={e => setXpRequerida(parseInt(e.target.value) || 0)} 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    required
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Orden</label>
                  <input 
                    type="number" 
                    value={orden} 
                    onChange={e => setOrden(parseInt(e.target.value) || 1)} 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    required
                    min={1}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Versión</label>
                  <input 
                    type="text" 
                    value={version} 
                    onChange={e => setVersion(e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>
              </div>

              {/* Presentation Options */}
              <div className="bg-slate-50 dark:bg-slate-955 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
                  Presentación de UI & Estilos
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Color del Nivel (Hex)</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={color} 
                        onChange={e => setColor(e.target.value)} 
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent"
                      />
                      <input 
                        type="text" 
                        value={color} 
                        onChange={e => setColor(e.target.value)} 
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-900 dark:text-white outline-none text-xs font-medium uppercase"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Icono Lucide</label>
                    <select 
                      value={icono} 
                      onChange={e => setIcono(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-900 dark:text-white outline-none text-xs font-medium"
                    >
                      <option value="Award" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Premio (Award)</option>
                      <option value="Star" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Estrella (Star)</option>
                      <option value="Zap" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Rayo (Zap)</option>
                      <option value="Crown" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Corona (Crown)</option>
                      <option value="Gem" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Gema (Gem)</option>
                      <option value="Shield" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Escudo (Shield)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Título UI Personalizado</label>
                    <input 
                      type="text" 
                      value={tituloUi} 
                      onChange={e => setTituloUi(e.target.value)} 
                      placeholder="Ej. ¡Rango Oro Desbloqueado!"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-900 dark:text-white outline-none text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Descripción UI</label>
                    <input 
                      type="text" 
                      value={descripcionUi} 
                      onChange={e => setDescripcionUi(e.target.value)} 
                      placeholder="Ej. Felicidades, obtienes 1.2x multiplicador"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-900 dark:text-white outline-none text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Rewards Checklist */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-3 flex items-center gap-1.5">
                  <Info size={14} className="text-indigo-500" />
                  Premios del Catálogo al Alcanzar este Nivel
                </label>
                {rewards.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-550 bg-slate-50 dark:bg-slate-955 p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                    No hay premios activos creados en el catálogo.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-955/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    {rewards.map(r => (
                      <label 
                        key={r.id} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          selectedRewardIds.includes(r.id) 
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-400" 
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                        )}
                      >
                        <input 
                          type="checkbox" 
                          checked={selectedRewardIds.includes(r.id)} 
                          onChange={() => handleToggleReward(r.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{r.nombre}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">{r.tipo} · v{r.version}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Activo Toggle */}
              <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Nivel Activo</h5>
                  <p className="text-xs text-slate-450 dark:text-slate-500">Si se desactiva, los usuarios no podrán ascender a este nivel.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivo(!activo)}
                  className={cn(
                    "w-12 h-6 rounded-full p-0.5 transition-all outline-none border-none cursor-pointer",
                    activo ? "bg-indigo-600 flex justify-end" : "bg-slate-300 dark:bg-slate-800 flex justify-start"
                  )}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-sm rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all bg-white dark:bg-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 transition-all text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 border-none cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {editingLevel ? 'Guardar Cambios' : 'Crear Nivel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
