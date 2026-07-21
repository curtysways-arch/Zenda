'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Trophy, Plus, Trash2, Edit2, CheckCircle2, X, Save, 
  Sparkles, Zap, Users, Calendar, Award, Eye, Settings, 
  ChevronRight, ArrowRight, Shield, Layers, HelpCircle, AlertTriangle
} from 'lucide-react';
import { MissionCategory, QuestDifficulty, MissionDefStatus } from '@prisma/client';

interface RewardCatalog {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  valor: any;
}

interface MissionRewardDefinition {
  id: string;
  missionDefinitionId: string;
  rewardCatalogId: string;
  orden: number;
  RewardCatalog: RewardCatalog;
}

interface MissionPublication {
  id: string;
  missionDefinitionId: string;
  globalSeasonId: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  status: string;
  prioridad: number;
  segmentacion: any;
}

interface MissionDefinition {
  id: string;
  nombre: string;
  descripcion: string;
  imagenUrl: string | null;
  categoria: MissionCategory;
  dificultad: QuestDifficulty;
  triggerEvent: string;
  cantidadMeta: number;
  condicionesExtra: any;
  config: any;
  metadata: any;
  version: string;
  status: MissionDefStatus;
  requiresBusinessReward: boolean;
  Rewards: MissionRewardDefinition[];
  Publications: MissionPublication[];
}

interface Season {
  id: string;
  codigo: string;
  nombre: string;
  status: string;
}

const mapCategory = (cat: string) => {
  const map: Record<string, string> = {
    RESERVAS: 'Reservas',
    REFERIDOS: 'Referidos',
    PERFIL: 'Perfil',
    APP: 'Descarga App',
    PAGOS: 'Pagos',
    REVIEWS: 'Reseñas',
    LEALTAD: 'Lealtad',
    ESPECIAL: 'Especial'
  };
  return map[cat] || cat;
};

const mapStatus = (status: string) => {
  const map: Record<string, string> = {
    DRAFT: 'Borrador',
    PUBLISHED: 'Publicado',
    ARCHIVED: 'Archivado'
  };
  return map[status] || status;
};

const mapDifficulty = (diff: string) => {
  const map: Record<string, string> = {
    EASY: 'Fácil',
    MEDIUM: 'Media',
    HARD: 'Difícil',
    EPIC: 'Épica',
    LEGENDARY: 'Legendaria'
  };
  return map[diff] || diff;
};

const mapTrigger = (trigger: string) => {
  const map: Record<string, string> = {
    BOOKING_COMPLETED: 'Cita Completada (BOOKING_COMPLETED)',
    USER_REGISTERED: 'Registro Nuevo (USER_REGISTERED)',
    REVIEW_CREATED: 'Reseña Publicada (REVIEW_CREATED)',
    REFERRAL_COMPLETED: 'Referido Exitoso (REFERRAL_COMPLETED)',
    CHECKIN: 'Visita / Check-in (CHECKIN)',
    PROFILE_COMPLETED: 'Perfil al 100% (PROFILE_COMPLETED)',
    APP_DOWNLOADED: 'Descarga de Aplicación (APP_DOWNLOADED)'
  };
  return map[trigger] || trigger;
};

export default function MissionEditorClient({
  initialMissions,
  seasons,
  rewardCatalog,
}: {
  initialMissions: MissionDefinition[];
  seasons: Season[];
  rewardCatalog: RewardCatalog[];
}) {
  const [missions, setMissions] = useState<MissionDefinition[]>(initialMissions);
  const [activeTab, setActiveTab] = useState<'info' | 'rules' | 'rewards' | 'config' | 'publish' | 'preview'>('info');
  const [editingMission, setEditingMission] = useState<MissionDefinition | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Form States
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [categoria, setCategoria] = useState<MissionCategory>('RESERVAS');
  const [dificultad, setDificultad] = useState<QuestDifficulty>('MEDIUM');
  
  // Rules States
  const [triggerEvent, setTriggerEvent] = useState('BOOKING_COMPLETED');
  const [cantidadMeta, setCantidadMeta] = useState(1);
  const [condicionesExtraText, setCondicionesExtraText] = useState('{\n  "condition": "AND",\n  "rules": []\n}');

  // Rewards States
  const [selectedRewards, setSelectedRewards] = useState<{ catalogId: string; orden: number }[]>([]);

  // Config States
  const [requiresBusinessReward, setRequiresBusinessReward] = useState(false);
  const [metadataText, setMetadataText] = useState('{}');
  const [version, setVersion] = useState('1.0.0');

  // Publication States
  const [globalSeasonId, setGlobalSeasonId] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [prioridad, setPrioridad] = useState(0);
  const [segmentacionText, setSegmentacionText] = useState('{}');

  const searchParams = useSearchParams();

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const editId = searchParams.get('edit');
    const newParam = searchParams.get('new');

    if (editId) {
      const found = missions.find(m => m.id === editId);
      if (found) {
        // Encontrar los datos de la misión seleccionada y abrir la edición
        startEdit(found);
      }
    } else if (newParam === 'true') {
      startCreate();
    }
  }, [searchParams, missions]);


  const startCreate = () => {
    setEditingMission(null);
    setIsCreating(true);
    setActiveTab('info');
    
    // Reset Form
    setNombre('');
    setDescripcion('');
    setImagenUrl('');
    setCategoria('RESERVAS');
    setDificultad('MEDIUM');
    setTriggerEvent('BOOKING_COMPLETED');
    setCantidadMeta(1);
    setCondicionesExtraText('{\n  "condition": "AND",\n  "rules": []\n}');
    setSelectedRewards([]);
    setRequiresBusinessReward(false);
    setMetadataText('{}');
    setVersion('1.0.0');
    setGlobalSeasonId(seasons.find(s => s.status === 'ACTIVE')?.id || '');
    setFechaInicio('');
    setFechaFin('');
    setPrioridad(0);
    setSegmentacionText('{}');
  };

  const startEdit = (mission: MissionDefinition) => {
    setEditingMission(mission);
    setIsCreating(false);
    setActiveTab('info');

    setNombre(mission.nombre);
    setDescripcion(mission.descripcion);
    setImagenUrl(mission.imagenUrl || '');
    setCategoria(mission.categoria);
    setDificultad(mission.dificultad);
    setTriggerEvent(mission.triggerEvent);
    setCantidadMeta(mission.cantidadMeta);
    setCondicionesExtraText(JSON.stringify(mission.condicionesExtra || { condition: 'AND', rules: [] }, null, 2));
    setSelectedRewards(mission.Rewards.map(r => ({ catalogId: r.rewardCatalogId, orden: r.orden })));
    setRequiresBusinessReward(mission.requiresBusinessReward);
    setMetadataText(JSON.stringify(mission.metadata || {}, null, 2));
    setVersion(mission.version);

    const activePub = mission.Publications.find(p => p.status === 'ACTIVE');
    if (activePub) {
      setGlobalSeasonId(activePub.globalSeasonId || '');
      setFechaInicio(activePub.fechaInicio ? activePub.fechaInicio.substring(0, 10) : '');
      setFechaFin(activePub.fechaFin ? activePub.fechaFin.substring(0, 10) : '');
      setPrioridad(activePub.prioridad);
      setSegmentacionText(JSON.stringify(activePub.segmentacion || {}, null, 2));
    } else {
      setGlobalSeasonId('');
      setFechaInicio('');
      setFechaFin('');
      setPrioridad(0);
      setSegmentacionText('{}');
    }
  };

  const handleSave = async () => {
    if (!nombre || !descripcion || !triggerEvent) {
      showToast('Por favor, rellene los campos obligatorios: Nombre, Descripción y Trigger', 'error');
      return;
    }

    let parsedCond = null;
    let parsedMeta = null;
    let parsedSeg = null;

    try {
      if (condicionesExtraText.trim()) parsedCond = JSON.parse(condicionesExtraText);
      if (metadataText.trim()) parsedMeta = JSON.parse(metadataText);
      if (segmentacionText.trim()) parsedSeg = JSON.parse(segmentacionText);
    } catch (e) {
      showToast('Formato JSON inválido en Reglas, Metadata o Segmentación', 'error');
      return;
    }

    setLoading(true);
    try {
      const url = editingMission 
        ? `/api/superadmin/mission-definitions/${editingMission.id}`
        : `/api/superadmin/mission-definitions`;
        
      const res = await fetch(url, {
        method: editingMission ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          descripcion,
          imagenUrl: imagenUrl || null,
          categoria,
          dificultad,
          triggerEvent,
          cantidadMeta: Number(cantidadMeta),
          condicionesExtra: parsedCond,
          metadata: parsedMeta,
          version,
          requiresBusinessReward
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la misión');

      const savedMission = data.mission;

      // Guardar recompensas asociadas
      if (savedMission && selectedRewards.length > 0) {
        // Limpiar previas si es edición
        if (editingMission) {
          const oldRewards = editingMission.Rewards;
          for (const or of oldRewards) {
            await fetch(`/api/superadmin/mission-definitions/${editingMission.id}/rewards`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rewardCatalogId: or.rewardCatalogId })
            });
          }
        }

        // Agregar nuevas
        for (const sr of selectedRewards) {
          await fetch(`/api/superadmin/mission-definitions/${savedMission.id}/rewards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rewardCatalogId: sr.catalogId, orden: sr.orden })
          });
        }
      }

      // Publicación si corresponde
      if (savedMission && (globalSeasonId || fechaInicio || fechaFin)) {
        await fetch(`/api/superadmin/mission-definitions/${savedMission.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'publish',
            globalSeasonId: globalSeasonId || null,
            fechaInicio: fechaInicio || null,
            fechaFin: fechaFin || null,
            prioridad: Number(prioridad),
            segmentacion: parsedSeg
          })
        });
      }

      showToast(`Misión "${nombre}" guardada con éxito!`, 'success');
      
      // Recargar lista
      const listRes = await fetch('/api/superadmin/mission-definitions');
      const listData = await listRes.json();
      if (listData.success) {
        setMissions(listData.missions);
      }

      setIsCreating(false);
      setEditingMission(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (mission: MissionDefinition, publish: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/mission-definitions/${mission.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: publish ? 'publish' : 'archive'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en operación');

      showToast(`Misión ${publish ? 'publicada' : 'archivada'} correctamente`);
      
      const listRes = await fetch('/api/superadmin/mission-definitions');
      const listData = await listRes.json();
      if (listData.success) setMissions(listData.missions);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta definición? Solo se puede si está en BORRADOR y no tiene instalaciones.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/mission-definitions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');

      showToast('Definición eliminada correctamente');
      setMissions(missions.filter(m => m.id !== id));
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Recompensas Helpers
  const addRewardToSelected = (catalogId: string) => {
    if (selectedRewards.find(r => r.catalogId === catalogId)) return;
    setSelectedRewards([...selectedRewards, { catalogId, orden: selectedRewards.length + 1 }]);
  };

  const removeRewardFromSelected = (catalogId: string) => {
    setSelectedRewards(selectedRewards.filter(r => r.catalogId !== catalogId).map((r, i) => ({ ...r, orden: i + 1 })));
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-bold text-sm">{toast.msg}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-black tracking-tight">Editor de Misiones de Citiox</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">Diseña misiones globales desacopladas para toda la red de negocios y usuarios.</p>
        </div>
        {!isCreating && !editingMission && (
          <button 
            onClick={startCreate}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 transition-all font-bold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-emerald-950/20"
          >
            <Plus className="w-4 h-4" /> Crear Misión
          </button>
        )}
      </div>

      {/* Editor Form View / List View */}
      {isCreating || editingMission ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Workspace (Tabs) */}
          <div className="xl:col-span-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden flex flex-col">
            {/* Tab Links */}
            <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2">
              <button 
                onClick={() => setActiveTab('info')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === 'info' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" /> 1. Información
              </button>
              <button 
                onClick={() => setActiveTab('rules')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === 'rules' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4" /> 2. Reglas
              </button>
              <button 
                onClick={() => setActiveTab('rewards')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === 'rewards' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Award className="w-4 h-4" /> 3. Recompensas Citiox
              </button>
              <button 
                onClick={() => setActiveTab('config')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === 'config' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4" /> 4. Configuración
              </button>
              <button 
                onClick={() => setActiveTab('publish')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === 'publish' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" /> 5. Publicación
              </button>
              <button 
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === 'preview' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4" /> 6. Vista Previa
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 md:p-8 flex-1 space-y-6">
              
              {/* Tab 1: Info */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nombre de la Misión *</label>
                      <input 
                        type="text" 
                        value={nombre} 
                        onChange={e => setNombre(e.target.value)} 
                        placeholder="Ej: Explorador de Belleza"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Dificultad</label>
                      <select 
                        value={dificultad} 
                        onChange={e => setDificultad(e.target.value as QuestDifficulty)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="EASY" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Fácil</option>
                        <option value="MEDIUM" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Media</option>
                        <option value="HARD" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Difícil</option>
                        <option value="EPIC" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Épica</option>
                        <option value="LEGENDARY" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Legendaria</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Descripción corta *</label>
                    <textarea 
                      value={descripcion} 
                      onChange={e => setDescripcion(e.target.value)} 
                      placeholder="Explica qué debe hacer el usuario para completar esta misión..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Categoría</label>
                      <select 
                        value={categoria} 
                        onChange={e => setCategoria(e.target.value as MissionCategory)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="RESERVAS" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Reservas</option>
                        <option value="REFERIDOS" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Referidos</option>
                        <option value="PERFIL" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Perfil</option>
                        <option value="APP" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Descarga App</option>
                        <option value="PAGOS" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Pagos</option>
                        <option value="REVIEWS" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Reseñas</option>
                        <option value="LEALTAD" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Lealtad</option>
                        <option value="ESPECIAL" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Especial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">URL de la Imagen (Opcional)</label>
                      <input 
                        type="text" 
                        value={imagenUrl} 
                        onChange={e => setImagenUrl(e.target.value)} 
                        placeholder="https://ejemplo.com/imagen.png"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex gap-2">
                    <HelpCircle className="w-4 h-4 shrink-0 text-slate-600" />
                    <span>La información básica es pública. Los negocios e integrantes de la comunidad verán estos datos al explorar la misión en el catálogo oficial de Citiox.</span>
                  </div>
                </div>
              )}

              {/* Tab 2: Rules */}
              {activeTab === 'rules' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Evento Disparador (Trigger Event) *</label>
                      <select 
                        value={triggerEvent} 
                        onChange={e => setTriggerEvent(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="BOOKING_COMPLETED" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Cita Completada (BOOKING_COMPLETED)</option>
                        <option value="USER_REGISTERED" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Registro Nuevo (USER_REGISTERED)</option>
                        <option value="REVIEW_CREATED" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Reseña Publicada (REVIEW_CREATED)</option>
                        <option value="REFERRAL_COMPLETED" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Referido Exitoso (REFERRAL_COMPLETED)</option>
                        <option value="CHECKIN" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Visita / Check-in (CHECKIN)</option>
                        <option value="PROFILE_COMPLETED" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Perfil al 100% (PROFILE_COMPLETED)</option>
                        <option value="APP_DOWNLOADED" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Descarga de Aplicación (APP_DOWNLOADED)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Cantidad Meta (Objetivo numérico)</label>
                      <input 
                        type="number" 
                        min={1}
                        value={cantidadMeta} 
                        onChange={e => setCantidadMeta(Number(e.target.value))} 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Condiciones Adicionales (JSON Rule Engine)</label>
                    <textarea 
                      value={condicionesExtraText} 
                      onChange={e => setCondicionesExtraText(e.target.value)} 
                      rows={6}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Configura filtros como monto mínimo o categorías específicas.</span>
                  </div>
                </div>
              )}

              {/* Tab 3: Rewards Citiox */}
              {activeTab === 'rewards' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Recompensas Seleccionadas de la Misión</h3>
                    {selectedRewards.length === 0 ? (
                      <div className="border border-dashed border-slate-200 dark:border-slate-800 p-8 rounded-2xl text-center text-slate-400 text-sm">
                        No hay recompensas de plataforma seleccionadas aún.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedRewards.map((sr, index) => {
                          const cat = rewardCatalog.find(c => c.id === sr.catalogId);
                          return (
                            <div key={sr.catalogId} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                                  {index + 1}
                                </span>
                                <div>
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{cat?.nombre || 'Recompensa del catálogo'}</p>
                                  <p className="text-xs text-slate-400">{cat?.descripcion || 'Sin descripción'}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => removeRewardFromSelected(sr.catalogId)}
                                className="text-rose-500 hover:text-rose-400 p-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Catálogo de Recompensas de Citiox (RewardCatalog)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                      {rewardCatalog.map(c => {
                        const isSelected = !!selectedRewards.find(sr => sr.catalogId === c.id);
                        return (
                          <div 
                            key={c.id} 
                            className={`p-4 rounded-xl border transition-all ${
                              isSelected 
                                ? 'bg-emerald-50/50 border-emerald-500 dark:bg-emerald-950/20 dark:border-emerald-500' 
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">{c.tipo}</span>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{c.nombre}</h4>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.descripcion}</p>
                              </div>
                              {!isSelected ? (
                                <button 
                                  onClick={() => addRewardToSelected(c.id)}
                                  className="text-slate-800 dark:text-slate-200 hover:text-emerald-600 transition-all font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                                >
                                  Agregar
                                </button>
                              ) : (
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Seleccionado
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Config */}
              {activeTab === 'config' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <input 
                      type="checkbox" 
                      id="reqBusiness"
                      checked={requiresBusinessReward}
                      onChange={e => setRequiresBusinessReward(e.target.checked)}
                      className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-500"
                    />
                    <label htmlFor="reqBusiness" className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                      Esta misión requiere premio personalizado del negocio local.
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Versión Semántica de la Definición</label>
                    <input 
                      type="text" 
                      value={version} 
                      onChange={e => setVersion(e.target.value)} 
                      placeholder="1.0.0"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Metadata Adicional (JSON)</label>
                    <textarea 
                      value={metadataText} 
                      onChange={e => setMetadataText(e.target.value)} 
                      rows={4}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Tab 5: Publish */}
              {activeTab === 'publish' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Temporada Global</label>
                      <select 
                        value={globalSeasonId} 
                        onChange={e => setGlobalSeasonId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Ninguna (Permanente)</option>
                        {seasons.map(s => (
                          <option key={s.id} value={s.id} className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">{s.nombre} ({s.codigo})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Prioridad (Orden visual)</label>
                      <input 
                        type="number" 
                        value={prioridad} 
                        onChange={e => setPrioridad(Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Fecha Inicio (Opcional)</label>
                      <input 
                        type="date" 
                        value={fechaInicio} 
                        onChange={e => setFechaInicio(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Fecha Fin (Opcional)</label>
                      <input 
                        type="date" 
                        value={fechaFin} 
                        onChange={e => setFechaFin(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Segmentación (JSON de perfil del negocio)</label>
                    <textarea 
                      value={segmentacionText} 
                      onChange={e => setSegmentacionText(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Tab 6: Preview */}
              {activeTab === 'preview' && (
                <div className="space-y-6">
                  <div className="border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4 bg-slate-50 dark:bg-slate-950">
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300 font-bold uppercase">Vista previa del negocio</span>
                    
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      {imagenUrl ? (
                        <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${imagenUrl})` }} />
                      ) : (
                        <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-slate-400">
                          <Trophy className="w-12 h-12" />
                        </div>
                      )}

                      <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{mapCategory(categoria)}</span>
                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{nombre || 'Misión sin título'}</h2>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            dificultad === 'EASY' ? 'bg-emerald-500/10 text-emerald-600' :
                            dificultad === 'MEDIUM' ? 'bg-blue-500/10 text-blue-600' :
                            dificultad === 'HARD' ? 'bg-orange-500/10 text-orange-600' : 'bg-rose-500/10 text-rose-600'
                          }`}>{mapDifficulty(dificultad)}</span>
                        </div>

                        <p className="text-slate-500 text-sm font-medium leading-relaxed">{descripcion || 'Sin descripción'}</p>

                        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reglas y Objetivos</h4>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
                              Completar <strong className="font-bold text-slate-900 dark:text-white">{cantidadMeta}</strong> vez/veces el evento <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{mapTrigger(triggerEvent)}</code>
                            </p>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recompensas Aseguradas (Citiox)</h4>
                            {selectedRewards.length === 0 ? (
                              <p className="text-xs text-slate-400 font-medium">Esta misión no otorga recompensas de plataforma directas.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {selectedRewards.map(sr => {
                                  const c = rewardCatalog.find(cat => cat.id === sr.catalogId);
                                  return (
                                    <span key={sr.catalogId} className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                      ✨ {c?.nombre}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {requiresBusinessReward && (
                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-500 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" /> Configuración de Premio Requerida
                              </span>
                              <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
                                Al instalar esta misión, tu negocio deberá asignar una recompensa local (Cashback, Cupón de descuento, Producto o Servicio Gratis) para habilitar la misión a tus clientes.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer Panel Operations */}
            <div className="border-t border-slate-200 dark:border-slate-800 p-6 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <button 
                onClick={() => {
                  setIsCreating(false);
                  setEditingMission(null);
                }}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all font-bold text-sm"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
              
              <button 
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white transition-all font-bold text-sm px-6 py-3 rounded-xl shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {loading ? 'Guardando...' : 'Guardar borrador'}
              </button>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Resumen de Flujo
              </h3>
              <div className="space-y-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">1</div>
                  <p>Diseñas la definición sin premios locales.</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">2</div>
                  <p>Publicas en una temporada activa.</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">3</div>
                  <p>Los negocios instalan y seleccionan sus propios premios locales.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List View Panel */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Misiones Definidas ({missions.length})</h2>
          </div>

          {missions.length === 0 ? (
            <div className="border border-dashed border-slate-200 dark:border-slate-800 p-12 rounded-2xl text-center text-slate-400 text-sm">
              No hay misiones globales definidas aún.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {missions.map(m => {
                const activePub = m.Publications.find(p => p.status === 'ACTIVE');
                return (
                  <div key={m.id} className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between hover:shadow-md transition-all">
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">{mapCategory(m.categoria)}</span>
                          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1.5">{m.nombre}</h3>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-600' :
                          m.status === 'ARCHIVED' ? 'bg-slate-500/10 text-slate-500' : 'bg-amber-500/10 text-amber-600'
                        }`}>{mapStatus(m.status)}</span>
                      </div>

                      <p className="text-slate-500 text-xs line-clamp-3">{m.descripcion}</p>

                      <div className="text-xs text-slate-400 space-y-1">
                        <p>Trigger: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{mapTrigger(m.triggerEvent)}</code></p>
                        <p>Objetivo: <strong className="font-bold text-slate-700 dark:text-slate-300">{m.cantidadMeta}</strong> veces</p>
                        {activePub && (
                          <p className="text-emerald-600 font-bold">Publicada en temporada activa</p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/20 flex gap-2">
                      <button 
                        onClick={() => startEdit(m)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 transition-all font-bold text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 py-2 rounded-xl"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </button>

                      {m.status === 'DRAFT' ? (
                        <button 
                          onClick={() => handleTogglePublish(m, true)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white transition-all font-bold text-xs py-2 rounded-xl"
                        >
                          Publicar
                        </button>
                      ) : m.status === 'PUBLISHED' ? (
                        <button 
                          onClick={() => handleTogglePublish(m, false)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white transition-all font-bold text-xs py-2 rounded-xl"
                        >
                          Archivar
                        </button>
                      ) : null}

                      {m.status === 'DRAFT' && (
                        <button 
                          onClick={() => handleDelete(m.id)}
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
