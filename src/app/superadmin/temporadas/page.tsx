'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Loader2, 
  Sparkles, 
  Info,
  Clock,
  Play,
  CheckCircle,
  Archive,
  ArrowRight,
  TrendingUp,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_DETAILS: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  UPCOMING: { label: 'Próxima', bg: 'bg-blue-50/50', text: 'text-blue-600', border: 'border-blue-100', icon: Clock },
  ACTIVE: { label: 'Activa', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: Play },
  FINISHED: { label: 'Finalizada', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', icon: CheckCircle },
  ARCHIVED: { label: 'Archivada', bg: 'bg-slate-100/50', text: 'text-slate-400', border: 'border-slate-200/60', icon: Archive }
};

export default function SuperAdminTemporadasPage() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSeason, setEditingSeason] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [status, setStatus] = useState('UPCOMING');
  const [configStr, setConfigStr] = useState('{}');

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/superadmin/temporadas');
      if (res.ok) {
        const data = await res.json();
        setSeasons(data.seasons || []);
      }
    } catch (err) {
      console.error('Error fetching seasons:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSeason(null);
    setCodigo(`S${new Date().getFullYear()}-0${seasons.length + 1}`);
    setNombre('');
    setDescripcion('');
    
    // Default dates (today and +30 days)
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);
    setFechaInicio(today.toISOString().split('T')[0]);
    setFechaFin(nextMonth.toISOString().split('T')[0]);
    
    setVersion('1.0.0');
    setStatus('UPCOMING');
    setConfigStr(JSON.stringify({ xpMultiplier: 1.0, bonusPoints: 0 }, null, 2));
    setShowModal(true);
  };

  const openEditModal = (season: any) => {
    setEditingSeason(season);
    setCodigo(season.codigo);
    setNombre(season.nombre);
    setDescripcion(season.descripcion || '');
    setFechaInicio(new Date(season.fechaInicio).toISOString().split('T')[0]);
    setFechaFin(new Date(season.fechaFin).toISOString().split('T')[0]);
    setVersion(season.version);
    setStatus(season.status);
    setConfigStr(JSON.stringify(season.config || {}, null, 2));
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(configStr);
      } catch (err) {
        alert('Configuración JSON inválida.');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/superadmin/temporadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSeason?.id,
          codigo,
          nombre,
          descripcion,
          fechaInicio,
          fechaFin,
          version,
          status,
          config: parsedConfig
        })
      });

      if (res.ok) {
        setShowModal(false);
        fetchSeasons();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error('Error saving season:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta temporada global? Se eliminarán los leaderboards asociados.')) return;
    try {
      const res = await fetch(`/api/superadmin/temporadas/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchSeasons();
      } else {
        alert('Error al eliminar la temporada global.');
      }
    } catch (err) {
      console.error('Error deleting season:', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-xl">
              <Calendar className="text-cyan-400" size={24} />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">Temporadas Globales Citiox</h2>
          </div>
          <p className="text-slate-400 text-sm max-w-xl">
            Programa y controla los ciclos de temporadas competitivas, leaderboards globales, 
            y multiplicadores de XP para potenciar el engagement de los usuarios finales.
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3.5 bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] transition-all text-slate-950 font-black rounded-2xl shadow-lg shadow-cyan-500/20 border-none relative z-10 cursor-pointer"
        >
          <Plus size={20} />
          Nueva Temporada
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-cyan-500" size={40} />
          <p className="text-slate-500 font-medium">Cargando temporadas globales...</p>
        </div>
      ) : seasons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Calendar size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No hay temporadas configuradas</h3>
          <p className="text-slate-500 text-sm">
            Crea la primera temporada global competitiva para habilitar leaderboards estacionales y progresión estructurada.
          </p>
          <button 
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-cyan-500 text-slate-950 font-black rounded-xl hover:bg-cyan-400 border-none cursor-pointer"
          >
            Crear Primera Temporada
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {seasons.map((season) => {
            const statusConfig = STATUS_DETAILS[season.status] || STATUS_DETAILS.UPCOMING;
            const StatusIcon = statusConfig.icon;
            
            const initDate = new Date(season.fechaInicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
            const endDate = new Date(season.fechaFin).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

            return (
              <div 
                key={season.id} 
                className={cn(
                  "bg-white rounded-3xl border overflow-hidden flex flex-col hover:shadow-xl transition-all group",
                  season.status === 'ACTIVE' ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-slate-200'
                )}
              >
                {/* Visual Header */}
                <div className="p-6 border-b border-slate-50 flex items-center justify-between relative overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div 
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border",
                        statusConfig.bg,
                        statusConfig.text,
                        statusConfig.border
                      )}
                    >
                      <StatusIcon size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Código {season.codigo} · v{season.version}</span>
                      <h3 className="font-extrabold text-slate-800 text-lg leading-tight">{season.nombre}</h3>
                    </div>
                  </div>
                  <span className={cn("px-2.5 py-1 text-[9px] font-bold rounded-full uppercase tracking-wider border", statusConfig.bg, statusConfig.text, statusConfig.border)}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Content body */}
                <div className="p-6 flex-1 space-y-4">
                  {/* Timeline Row */}
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase text-slate-400 tracking-wider">Fecha Inicio</span>
                      <span>{initDate}</span>
                    </div>
                    <ArrowRight size={16} className="text-slate-400" />
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase text-slate-400 tracking-wider">Fecha Término</span>
                      <span>{endDate}</span>
                    </div>
                  </div>

                  {season.descripcion && (
                    <p className="text-xs text-slate-500 italic">"{season.descripcion}"</p>
                  )}

                  {/* Config Snapshot */}
                  {season.config && Object.keys(season.config).length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Parámetros Estacionales</span>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(season.config).map(([key, val]: any) => (
                          <div key={key} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
                            <span className="text-[8px] text-slate-400 uppercase tracking-wider block font-bold">{key}</span>
                            <span className="text-sm font-black text-slate-700">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button 
                    onClick={() => openEditModal(season)}
                    className="flex items-center gap-1 px-3 py-1.5 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-all border-none bg-transparent cursor-pointer"
                  >
                    <Edit2 size={14} />
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(season.id)}
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

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Calendar className="text-cyan-500" size={20} />
                {editingSeason ? 'Editar Temporada Global' : 'Nueva Temporada Global'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-none bg-transparent cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-5 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Código de Temporada</label>
                  <input 
                    type="text" 
                    value={codigo} 
                    onChange={e => setCodigo(e.target.value)} 
                    placeholder="Ej. S2026-01, HALLOWEEN-2027" 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all text-sm font-medium uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Nombre de Temporada</label>
                  <input 
                    type="text" 
                    value={nombre} 
                    onChange={e => setNombre(e.target.value)} 
                    placeholder="Ej. Temporada de la Furia, Verano 2027" 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Descripción</label>
                <textarea 
                  value={descripcion} 
                  onChange={e => setDescripcion(e.target.value)} 
                  placeholder="Describe la temática, recompensas exclusivas o detalles estacionales..." 
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all text-sm font-medium h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Fecha Inicio</label>
                  <input 
                    type="date" 
                    value={fechaInicio} 
                    onChange={e => setFechaInicio(e.target.value)} 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Fecha Término</label>
                  <input 
                    type="date" 
                    value={fechaFin} 
                    onChange={e => setFechaFin(e.target.value)} 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Estado de Temporada</label>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all text-sm font-medium bg-white dark:bg-slate-800"
                  >
                    <option value="UPCOMING">Próxima (UPCOMING)</option>
                    <option value="ACTIVE">Activa (ACTIVE) - Desactiva anteriores</option>
                    <option value="FINISHED">Finalizada (FINISHED)</option>
                    <option value="ARCHIVED">Archivada (ARCHIVED)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Versión de Reglas</label>
                  <input 
                    type="text" 
                    value={version} 
                    onChange={e => setVersion(e.target.value)} 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 flex items-center justify-between">
                  <span>Configuraciones Estacionales (JSON)</span>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 capitalize">Formato estructurado</span>
                </label>
                <textarea 
                  value={configStr} 
                  onChange={e => setConfigStr(e.target.value)} 
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all text-xs font-mono h-24"
                  required
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all bg-white dark:bg-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-slate-950 font-black text-sm rounded-xl hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/10 border-none cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {editingSeason ? 'Guardar Cambios' : 'Crear Temporada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
