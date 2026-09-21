'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles, Plus, Edit2, Trash2, ArrowUp, ArrowDown, Eye, Smartphone, Monitor,
  CheckCircle2, AlertCircle, Loader2, Calendar, Link2, Tag, ShoppingBag, Scissors,
  Layers, Image as ImageIcon, Wand2, Power, X
} from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';

interface HeroItemData {
  id: string;
  businessId: string;
  type: string;
  sourceType: string | null;
  sourceId: string | null;
  image: string | null;
  mobileImage: string | null;
  title: string | null;
  description: string | null;
  buttonEnabled: boolean;
  buttonText: string | null;
  actionType: string;
  actionValue: string | null;
  isActive: boolean;
  position: number;
  priority: number;
  startAt: string | null;
  endAt: string | null;
}

interface HighlightItemData {
  id: string;
  businessId: string;
  type: string;
  sourceType: string | null;
  sourceId: string | null;
  image: string | null;
  title: string | null;
  description: string | null;
  position: number;
  priority: number;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
}

interface OptionsData {
  negocio?: any;
  promotions: any[];
  products: any[];
  services: any[];
  categories: any[];
}

export default function HeroDestacadosPage() {
  const [activeTab, setActiveTab] = useState<'hero' | 'destacados' | 'preview'>('hero');
  const [heroItems, setHeroItems] = useState<HeroItemData[]>([]);
  const [highlightItems, setHighlightItems] = useState<HighlightItemData[]>([]);
  const [options, setOptions] = useState<OptionsData>({ promotions: [], products: [], services: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Color primario dinámico de marca
  const cp = options.negocio?.colorPrimario || '#ff5500';

  // Modales
  const [showHeroModal, setShowHeroModal] = useState(false);
  const [editingHero, setEditingHero] = useState<Partial<HeroItemData> | null>(null);

  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<Partial<HighlightItemData> | null>(null);

  const [saving, setSaving] = useState(false);

  // Preview Mode
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [heroRes, highlightRes, optRes] = await Promise.all([
        fetch('/api/admin/hero-destacados/hero'),
        fetch('/api/admin/hero-destacados/highlight'),
        fetch('/api/admin/hero-destacados/options')
      ]);

      if (heroRes.ok) {
        const data = await heroRes.json();
        setHeroItems(data);
      }
      if (highlightRes.ok) {
        const data = await highlightRes.json();
        setHighlightItems(data);
      }
      if (optRes.ok) {
        const data = await optRes.json();
        setOptions(data);
      }
    } catch (error) {
      console.error(error);
      toast('error', 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Banner configurado en el perfil/configuración del negocio
  const existingBanner = (() => {
    if (!options.negocio) return null;
    let cfg = options.negocio.configuracion;
    if (typeof cfg === 'string') {
      try { cfg = JSON.parse(cfg); } catch (_) {}
    }
    return (
      cfg?.bannerUrl ||
      options.negocio.bannerUrl ||
      (Array.isArray(cfg?.bannerUrls) && cfg.bannerUrls[0]) ||
      null
    );
  })();

  const handleImportProfileBanner = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/hero-destacados/sync-banner', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al sincronizar banner de perfil');
      }
      toast('success', '¡Banner de perfil importado exitosamente como Hero!');
      await fetchData();
    } catch (err: any) {
      toast('error', err.message || 'Error al importar banner');
    } finally {
      setSaving(false);
    }
  };

  // ── ACCIONES HERO ──────────────────────────────────────────────────────────
  const handleOpenNewHero = () => {
    setEditingHero({
      type: 'IMAGE',
      sourceType: 'CUSTOM',
      buttonEnabled: false,
      isActive: true,
      priority: 1,
      actionType: 'NONE'
    });
    setShowHeroModal(true);
  };

  const handleEditHero = (item: HeroItemData) => {
    setEditingHero({ ...item });
    setShowHeroModal(true);
  };

  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHero) return;

    if (editingHero.buttonEnabled) {
      if (!editingHero.buttonText || editingHero.buttonText.trim() === '') {
        toast('error', 'Ingresa el texto del botón');
        return;
      }
      if (!editingHero.actionType || editingHero.actionType === 'NONE') {
        toast('error', 'Selecciona una acción válida para el botón');
        return;
      }
    }

    const heroToSave = { ...editingHero };
    if (heroToSave.buttonEnabled) {
      if (heroToSave.actionType === 'PROMOTION' && !heroToSave.actionValue && heroToSave.sourceId) {
        heroToSave.actionValue = heroToSave.sourceId;
      }
      if (heroToSave.actionType === 'PRODUCT' && !heroToSave.actionValue && heroToSave.sourceId) {
        heroToSave.actionValue = heroToSave.sourceId;
      }
      if (heroToSave.actionType === 'SERVICE' && !heroToSave.actionValue && heroToSave.sourceId) {
        heroToSave.actionValue = heroToSave.sourceId;
      }
    }

    setSaving(true);
    try {
      const isNew = !heroToSave.id;
      const url = isNew
        ? '/api/admin/hero-destacados/hero'
        : `/api/admin/hero-destacados/hero/${heroToSave.id}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heroToSave)
      });

      if (res.ok) {
        toast('success', isNew ? 'Elemento Hero creado' : 'Elemento Hero actualizado');
        setShowHeroModal(false);
        setEditingHero(null);
        await fetchData();
      } else {
        const err = await res.json();
        toast('error', err.error || 'Error al guardar');
      }
    } catch (err) {
      toast('error', 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHeroActive = async (item: HeroItemData) => {
    try {
      const res = await fetch(`/api/admin/hero-destacados/hero/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive })
      });
      if (res.ok) {
        toast('success', item.isActive ? 'Hero desactivado' : 'Hero activado');
        fetchData();
      }
    } catch {
      toast('error', 'Error de conexión');
    }
  };

  const handleDeleteHero = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este elemento Hero?')) return;
    try {
      const res = await fetch(`/api/admin/hero-destacados/hero/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('success', 'Hero eliminado');
        fetchData();
      }
    } catch {
      toast('error', 'Error al eliminar');
    }
  };

  const handleMoveHero = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === heroItems.length - 1)
    ) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newItems = [...heroItems];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const updated = newItems.map((item, idx) => ({ ...item, position: idx }));
    setHeroItems(updated);

    try {
      await fetch('/api/admin/hero-destacados/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'HERO',
          items: updated.map(i => ({ id: i.id, position: i.position }))
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // ── ACCIONES DESTACADOS ────────────────────────────────────────────────────
  const handleOpenNewHighlight = () => {
    setEditingHighlight({
      type: 'IMAGE',
      sourceType: 'CUSTOM',
      isActive: true,
      priority: 1
    });
    setShowHighlightModal(true);
  };

  const handleEditHighlight = (item: HighlightItemData) => {
    setEditingHighlight({ ...item });
    setShowHighlightModal(true);
  };

  const handleSaveHighlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHighlight) return;

    setSaving(true);
    try {
      const isNew = !editingHighlight.id;
      const url = isNew
        ? '/api/admin/hero-destacados/highlight'
        : `/api/admin/hero-destacados/highlight/${editingHighlight.id}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingHighlight)
      });

      if (res.ok) {
        toast('success', isNew ? 'Destacado creado' : 'Destacado actualizado');
        setShowHighlightModal(false);
        setEditingHighlight(null);
        await fetchData();
      } else {
        const err = await res.json();
        toast('error', err.error || 'Error al guardar');
      }
    } catch (err) {
      toast('error', 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHighlightActive = async (item: HighlightItemData) => {
    try {
      const res = await fetch(`/api/admin/hero-destacados/highlight/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive })
      });
      if (res.ok) {
        toast('success', item.isActive ? 'Destacado desactivado' : 'Destacado activado');
        fetchData();
      }
    } catch {
      toast('error', 'Error de conexión');
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este elemento destacado?')) return;
    try {
      const res = await fetch(`/api/admin/hero-destacados/highlight/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('success', 'Destacado eliminado');
        fetchData();
      }
    } catch {
      toast('error', 'Error al eliminar');
    }
  };

  const handleMoveHighlight = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === highlightItems.length - 1)
    ) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newItems = [...highlightItems];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const updated = newItems.map((item, idx) => ({ ...item, position: idx }));
    setHighlightItems(updated);

    try {
      await fetch('/api/admin/hero-destacados/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'HIGHLIGHT',
          items: updated.map(i => ({ id: i.id, position: i.position }))
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Helper para insignias de tipo
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'AUTOMATIC':
        return <span className="px-3 py-1 bg-purple-50 text-purple-700 font-black text-[10px] uppercase rounded-xl flex items-center gap-1"><Wand2 size={12} /> Automático</span>;
      case 'PROMOTION':
        return <span className="px-3 py-1 bg-amber-50 text-amber-700 font-black text-[10px] uppercase rounded-xl flex items-center gap-1"><Tag size={12} /> Promoción</span>;
      case 'PRODUCT':
        return <span style={{ backgroundColor: `${cp}15`, color: cp }} className="px-3 py-1 font-black text-[10px] uppercase rounded-xl flex items-center gap-1"><ShoppingBag size={12} /> Producto</span>;
      case 'SERVICE':
        return <span className="px-3 py-1 bg-blue-50 text-blue-700 font-black text-[10px] uppercase rounded-xl flex items-center gap-1"><Scissors size={12} /> Servicio</span>;
      case 'COMBO':
        return <span className="px-3 py-1 bg-rose-50 text-rose-700 font-black text-[10px] uppercase rounded-xl flex items-center gap-1"><Layers size={12} /> Combo</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 font-black text-[10px] uppercase rounded-xl flex items-center gap-1"><ImageIcon size={12} /> Imagen</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin mb-4" style={{ color: cp }} size={32} />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando Constructor Universal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Toast Notification */}
      {message && (
        <div
          className={`fixed bottom-8 right-8 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${
            message.type === 'success' ? 'text-white border-transparent' : 'bg-red-600 text-white border-red-500'
          }`}
          style={{ backgroundColor: message.type === 'success' ? cp : undefined }}
        >
          {message.type === 'success' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
          <span className="text-sm font-black tracking-wide">{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="ml-2 opacity-70 hover:opacity-100 text-lg">×</button>
        </div>
      )}

      {/* Header principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Sparkles style={{ color: cp }} size={32} />
            Hero y Destacados
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            Configura el contenido que aparecerá de forma destacada en la landing de tu negocio.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {existingBanner && (
            <button
              type="button"
              disabled={saving}
              onClick={handleImportProfileBanner}
              className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-2xs"
              title="Importar imagen y textos del banner del perfil como Hero"
            >
              <Sparkles size={16} className="text-amber-600" />
              {saving ? 'Importando...' : 'Importar Banner de Perfil'}
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenNewHero}
            style={{ backgroundColor: cp }}
            className="flex items-center gap-2 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:opacity-90 transition shadow-lg"
          >
            <Plus size={16} />
            Agregar Hero
          </button>
          <button
            type="button"
            onClick={handleOpenNewHighlight}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition shadow-lg shadow-slate-200"
          >
            <Plus size={16} />
            Agregar Destacado
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-100 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('hero')}
          style={{
            borderColor: activeTab === 'hero' ? cp : 'transparent',
            color: activeTab === 'hero' ? cp : undefined
          }}
          className={`pb-4 px-2 font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'hero' ? '' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Sparkles size={16} />
          Sección Hero ({heroItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('destacados')}
          style={{
            borderColor: activeTab === 'destacados' ? cp : 'transparent',
            color: activeTab === 'destacados' ? cp : undefined
          }}
          className={`pb-4 px-2 font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'destacados' ? '' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Layers size={16} />
          Sección Destacados ({highlightItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          style={{
            borderColor: activeTab === 'preview' ? cp : 'transparent',
            color: activeTab === 'preview' ? cp : undefined
          }}
          className={`pb-4 px-2 font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'preview' ? '' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Eye size={16} />
          Previsualización en Vivo
        </button>
      </div>

      {/* TAB HERO */}
      {activeTab === 'hero' && (
        <div className="space-y-4">
          {heroItems.length === 0 ? (
            existingBanner ? (
              <div className="bg-gradient-to-br from-amber-50/60 via-white to-amber-50/40 rounded-[2.5rem] border-2 border-dashed border-amber-300/80 p-8 sm:p-10 text-center flex flex-col items-center justify-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mb-4 shadow-2xs">
                  <Sparkles size={24} />
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider mb-2">
                  Banner Detectado en tu Perfil
                </span>
                <h3 className="text-lg sm:text-xl font-black text-gray-900">
                  Tu negocio ya tiene un banner configurado en su perfil
                </h3>
                <p className="text-xs font-medium text-gray-500 max-w-lg mt-1 mb-6 leading-relaxed">
                  Detectamos que tienes un banner asignado en la configuración general de tu negocio. Puedes importarlo directamente para activarlo como tu primer Hero interactivo con botón y enlace.
                </p>

                {/* Vista previa del banner detectado */}
                <div className="w-full max-w-md aspect-[16/9] rounded-2xl overflow-hidden shadow-md border border-gray-200/80 relative mb-6 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={existingBanner} alt="Banner Perfil" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-4 text-left">
                    <h4 className="text-white font-black text-sm uppercase tracking-tight line-clamp-1">
                      {options.negocio?.heroTitulo || options.negocio?.nombre || 'Banner de Portada'}
                    </h4>
                    <p className="text-white/80 font-medium text-[10px] line-clamp-2 mt-0.5">
                      {options.negocio?.heroSubtitulo || 'Banner configurado en el perfil'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleImportProfileBanner}
                    style={{ backgroundColor: cp }}
                    className="w-full sm:w-auto text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider hover:opacity-90 transition shadow-md flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} />
                    {saving ? 'Importando...' : '✨ Usar este Banner como mi Primer Hero'}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenNewHero}
                    className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition"
                  >
                    + Crear otro Hero desde Cero
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] border border-dashed border-gray-200 p-12 text-center flex flex-col items-center justify-center">
                <ImageIcon size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-black text-gray-900">No hay elementos Hero configurados</h3>
                <p className="text-xs font-medium text-gray-400 max-w-md mt-1 mb-6">
                  Agrega banners de imágenes, promociones o configura un Hero automático para la portada pública.
                </p>
                <button
                  type="button"
                  onClick={handleOpenNewHero}
                  style={{ backgroundColor: cp }}
                  className="text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:opacity-90 transition"
                >
                  + Crear primer Hero
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {heroItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-[2rem] border p-6 flex flex-col md:flex-row items-center gap-6 transition-all ${
                    item.isActive ? 'border-gray-100 shadow-sm' : 'border-gray-200 bg-gray-50/50 opacity-70'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-full md:w-48 aspect-video rounded-2xl overflow-hidden bg-gray-100 shrink-0 relative border">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.title || 'Hero'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2 text-center">
                        <Wand2 size={24} className="mb-1 text-purple-400" />
                        <span className="text-[10px] font-black uppercase">Automático</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      {getTypeBadge(item.type)}
                    </div>
                  </div>

                  {/* Detalle */}
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-black text-gray-900 text-base">
                        {item.title || (item.type === 'AUTOMATIC' ? 'Hero Automático Dinámico' : 'Hero sin título')}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleToggleHeroActive(item)}
                        style={{
                          backgroundColor: item.isActive ? `${cp}20` : undefined,
                          color: item.isActive ? cp : undefined
                        }}
                        className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                          item.isActive ? '' : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        <Power size={12} />
                        {item.isActive ? '🟢 Activo' : '⚪ Inactivo'}
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 font-medium line-clamp-2">
                      {item.description || (item.type === 'AUTOMATIC' ? 'Citiox seleccionará dinámicamente el contenido más relevante disponible.' : 'Sin descripción')}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-gray-400 font-bold flex-wrap pt-1">
                      <span>Posición: #{idx + 1}</span>
                      <span>Prioridad: {item.priority}</span>
                      {item.buttonEnabled && (
                        <span
                          style={{ color: cp, backgroundColor: `${cp}15`, borderColor: `${cp}30` }}
                          className="px-2 py-0.5 rounded-lg border font-extrabold"
                        >
                          Botón: "{item.buttonText}" ({item.actionType})
                        </span>
                      )}
                      {(item.startAt || item.endAt) && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Calendar size={12} />
                          {item.startAt ? new Date(item.startAt).toLocaleDateString() : 'Inicio'} - {item.endAt ? new Date(item.endAt).toLocaleDateString() : 'Fin'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex md:flex-col items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveHero(idx, 'up')}
                        disabled={idx === 0}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-30 text-gray-700"
                        title="Subir posición"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveHero(idx, 'down')}
                        disabled={idx === heroItems.length - 1}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-30 text-gray-700"
                        title="Bajar posición"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditHero(item)}
                        className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHero(item.id)}
                        className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition"
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
        </div>
      )}

      {/* TAB DESTACADOS */}
      {activeTab === 'destacados' && (
        <div className="space-y-4">
          {highlightItems.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border border-dashed border-gray-200 p-12 text-center flex flex-col items-center justify-center">
              <Layers size={48} className="text-gray-300 mb-4" />
              <h3 className="text-lg font-black text-gray-900">No hay elementos Destacados configurados</h3>
              <p className="text-xs font-medium text-gray-400 max-w-md mt-1 mb-6">
                Configura tarjetas destacadas de promociones, productos o servicios debajo de la sección Hero.
              </p>
              <button
                type="button"
                onClick={handleOpenNewHighlight}
                className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition"
              >
                + Crear primer Destacado
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {highlightItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-[2rem] border p-6 flex flex-col md:flex-row items-center gap-6 transition-all ${
                    item.isActive ? 'border-gray-100 shadow-sm' : 'border-gray-200 bg-gray-50/50 opacity-70'
                  }`}
                >
                  <div className="w-full md:w-36 aspect-square rounded-2xl overflow-hidden bg-gray-100 shrink-0 relative border">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.title || 'Destacado'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2 text-center">
                        <Layers size={24} className="mb-1 text-slate-400" />
                        <span className="text-[10px] font-black uppercase">Sin Imagen</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      {getTypeBadge(item.type)}
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-black text-gray-900 text-base">
                        {item.title || 'Destacado sin título'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleToggleHighlightActive(item)}
                        style={{
                          backgroundColor: item.isActive ? `${cp}20` : undefined,
                          color: item.isActive ? cp : undefined
                        }}
                        className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                          item.isActive ? '' : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        <Power size={12} />
                        {item.isActive ? '🟢 Activo' : '⚪ Inactivo'}
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 font-medium line-clamp-2">
                      {item.description || 'Sin descripción'}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-gray-400 font-bold pt-1">
                      <span>Posición: #{idx + 1}</span>
                      <span>Prioridad: {item.priority}</span>
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveHighlight(idx, 'up')}
                        disabled={idx === 0}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-30 text-gray-700"
                        title="Subir posición"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveHighlight(idx, 'down')}
                        disabled={idx === highlightItems.length - 1}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-30 text-gray-700"
                        title="Bajar posición"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditHighlight(item)}
                        className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHighlight(item.id)}
                        className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition"
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
        </div>
      )}

      {/* TAB PREVISUALIZACIÓN EN VIVO */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-gray-100">
            <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Modo de Previsualización:</span>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition ${
                  previewDevice === 'desktop' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
                }`}
              >
                <Monitor size={14} /> Escritorio
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition ${
                  previewDevice === 'mobile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
                }`}
              >
                <Smartphone size={14} /> Móvil
              </button>
            </div>
          </div>

          <div className={`mx-auto transition-all ${previewDevice === 'mobile' ? 'max-w-sm' : 'w-full'}`}>
            <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 space-y-6 shadow-2xl border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span style={{ color: cp }} className="text-[10px] font-black uppercase tracking-widest">Previsualización de Contenido Configurado</span>
                <span className="text-[10px] text-slate-500 font-bold">{previewDevice === 'mobile' ? 'Mobile View' : 'Desktop View'}</span>
              </div>

              {/* Hero Slider Mock */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Hero Banners Activos ({heroItems.filter(i => i.isActive).length})</h4>

                {heroItems.filter(i => i.isActive).length === 0 ? (
                  <div className="bg-slate-800/50 rounded-3xl p-8 text-center text-slate-500 text-xs font-bold border border-dashed border-slate-700">
                    No hay Hero activo para mostrar.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {heroItems.filter(i => i.isActive).map((h, i) => (
                      <div key={h.id} className="relative rounded-3xl overflow-hidden bg-slate-800 border border-slate-700 aspect-[16/8] flex flex-col justify-end p-6">
                        {h.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={h.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        )}
                        <div className="relative z-10 space-y-2">
                          <div className="flex items-center gap-2">
                            {getTypeBadge(h.type)}
                            <span className="text-[9px] font-black text-slate-400">#Slide {i + 1}</span>
                          </div>
                          {h.title && <h3 className="text-lg font-black text-white">{h.title}</h3>}
                          {h.description && <p className="text-xs text-slate-300 font-medium line-clamp-2">{h.description}</p>}
                          {h.buttonEnabled && h.buttonText && (
                            <div className="pt-2">
                              <span style={{ backgroundColor: cp }} className="inline-block text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md">
                                {h.buttonText} →
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Highlights Mock */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Destacados Activos ({highlightItems.filter(i => i.isActive).length})</h4>

                {highlightItems.filter(i => i.isActive).length === 0 ? (
                  <div className="bg-slate-800/50 rounded-3xl p-6 text-center text-slate-500 text-xs font-bold border border-dashed border-slate-700">
                    No hay destacados activos.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {highlightItems.filter(i => i.isActive).map((hl) => (
                      <div key={hl.id} className="bg-slate-800 rounded-2xl p-3 border border-slate-700 space-y-2">
                        <div className="aspect-square bg-slate-700 rounded-xl overflow-hidden">
                          {hl.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={hl.image} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <h5 className="text-xs font-black text-white truncate">{hl.title || 'Destacado'}</h5>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR / CREAR HERO */}
      {/* MODAL EDITAR / CREAR HERO - PANTALLA COMPLETA */}
      {showHeroModal && editingHero && (
        <div className="fixed inset-0 z-[9999] bg-[#FAFCFF] flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-200">
          
          {/* BARRA SUPERIOR STICKY */}
          <header className="h-16 sm:h-20 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 sm:px-10 flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                style={{ backgroundColor: cp }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight leading-tight">
                  {editingHero.id ? 'Editar Elemento Hero' : 'Nuevo Elemento Hero'}
                </h3>
                <p className="text-[11px] font-bold text-gray-400">
                  Configura el banner principal, imagen, textos de llamado a la acción y enlaces interactivos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => setShowHeroModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase text-gray-500 hover:bg-gray-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <X size={16} />
                <span className="hidden sm:inline">Cerrar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const form = document.getElementById('hero-fullscreen-form') as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
                disabled={saving}
                style={{ backgroundColor: cp }}
                className="px-6 py-2.5 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
              >
                {saving ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}
                <span>{saving ? 'Guardando...' : 'Guardar Hero'}</span>
              </button>
            </div>
          </header>

          {/* CONTENIDO PRINCIPAL SCROLLEABLE */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-8 bg-[#FAFCFF]">
            <form id="hero-fullscreen-form" onSubmit={handleSaveHero} className="max-w-6xl mx-auto pb-10">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* COLUMNA IZQUIERDA: CONFIGURACIÓN PRINCIPAL (7 columnas) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Tarjeta: Tipo y Fuente */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-150/80 shadow-xs space-y-5">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cp }} />
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        1. Tipo de Contenido y Origen
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        Tipo de Hero
                      </label>
                      <select
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl font-bold text-sm text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition"
                        value={editingHero.type || 'IMAGE'}
                        onChange={(e) => {
                          const newType = e.target.value;
                          let newSourceType = 'CUSTOM';
                          if (newType === 'PROMOTION') newSourceType = 'PROMOTION';
                          if (newType === 'PRODUCT') newSourceType = 'PRODUCT';
                          if (newType === 'SERVICE') newSourceType = 'SERVICE';
                          if (newType === 'COMBO') newSourceType = 'COMBO';

                          setEditingHero({
                            ...editingHero,
                            type: newType,
                            sourceType: newSourceType,
                            sourceId: null
                          });
                        }}
                      >
                        <option value="AUTOMATIC">🪄 Automático (Dinámico según promociones activas)</option>
                        <option value="IMAGE">🖼️ Imagen Personalizada de Banner</option>
                        <option value="PROMOTION">🏷️ Vincular a una Promoción</option>
                        <option value="PRODUCT">📦 Vincular a un Producto</option>
                        <option value="SERVICE">✂️ Vincular a un Servicio</option>
                        <option value="COMBO">🍱 Vincular a un Combo</option>
                      </select>
                    </div>

                    {/* Mensaje de ayuda si es Automático */}
                    {editingHero.type === 'AUTOMATIC' && (
                      <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl space-y-1">
                        <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                          <Wand2 size={14} /> Modo Automático Inteligente
                        </span>
                        <p className="text-[11px] text-purple-700 font-medium leading-relaxed">
                          Citiox seleccionará dinámicamente la mejor promoción o producto activo para mostrar. Puedes añadir una imagen o título opcional como fallback.
                        </p>
                      </div>
                    )}

                    {/* Selector de entidad si es PROMOTION, PRODUCT, SERVICE */}
                    {(editingHero.type === 'PROMOTION' || editingHero.type === 'PRODUCT' || editingHero.type === 'SERVICE') && (
                      <div className="space-y-2 pt-2 border-t border-gray-100">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          Seleccionar {editingHero.type === 'PROMOTION' ? 'Promoción' : editingHero.type === 'PRODUCT' ? 'Producto' : 'Servicio'} específica del negocio
                        </label>
                        <select
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl font-bold text-sm text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition"
                          value={editingHero.sourceId || ''}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            let imgUrl = editingHero.image;
                            let titleVal = editingHero.title;
                            let descVal = editingHero.description;
                            let actType = editingHero.actionType;
                            let actVal = editingHero.actionValue;
                            let btnEnabled = editingHero.buttonEnabled ?? true;
                            let btnText = editingHero.buttonText;

                            if (editingHero.type === 'PROMOTION') {
                              const promo = options.promotions.find(p => p.id === selectedId);
                              if (promo) {
                                imgUrl = promo.imagenUrl || imgUrl;
                                titleVal = promo.titulo || titleVal;
                                descVal = promo.descripcion || descVal;
                                actType = 'PROMOTION';
                                actVal = promo.id;
                                btnText = btnText || 'Ver Promoción';
                              }
                            } else if (editingHero.type === 'PRODUCT') {
                              const prod = options.products.find(p => p.id === selectedId);
                              if (prod) {
                                imgUrl = prod.imagenUrl || imgUrl;
                                titleVal = prod.nombre || titleVal;
                                descVal = prod.descripcion || descVal;
                                actType = 'PRODUCT';
                                actVal = prod.id;
                                btnText = btnText || 'Ver Producto';
                              }
                            } else if (editingHero.type === 'SERVICE') {
                              const srv = options.services.find(s => s.id === selectedId);
                              if (srv) {
                                titleVal = srv.nombre || titleVal;
                                actType = 'SERVICE';
                                actVal = srv.id;
                                btnText = btnText || 'Reservar Servicio';
                              }
                            }

                            setEditingHero({
                              ...editingHero,
                              sourceId: selectedId,
                              image: imgUrl,
                              title: titleVal,
                              description: descVal,
                              actionType: actType,
                              actionValue: actVal,
                              buttonEnabled: btnEnabled,
                              buttonText: btnText
                            });
                          }}
                        >
                          <option value="">-- Seleccionar de la lista --</option>
                          {editingHero.type === 'PROMOTION' && options.promotions.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.titulo} (${p.precioPromo}) {p.estado !== 'activa' ? `[${p.estado?.toUpperCase() || 'INACTIVA'}]` : ''}
                            </option>
                          ))}
                          {editingHero.type === 'PRODUCT' && options.products.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} (${p.precio})</option>
                          ))}
                          {editingHero.type === 'SERVICE' && options.services.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre} (${s.precio || '0'})</option>
                          ))}
                        </select>
                        {editingHero.type === 'PROMOTION' && editingHero.sourceId && (() => {
                          const selPromo = options.promotions.find(p => p.id === editingHero.sourceId);
                          if (selPromo && selPromo.estado !== 'activa') {
                            return (
                              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center gap-2 mt-2">
                                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                                <p className="text-[11px] font-bold text-amber-800">
                                  Aviso: Esta promoción está en estado <strong>{selPromo.estado?.toUpperCase() || 'INACTIVA'}</strong>. Para que tus clientes puedan verla y reservarla normalmente, actívala en Administración &gt; Promociones.
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Tarjeta: Imagen Principal */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-150/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cp }} />
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                          2. Imagen del Banner
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">Recomendado: Panorámica horizontal (16:9)</span>
                    </div>

                    <div className="w-full">
                      <ImageUploader
                        category="banner"
                        currentUrl={editingHero.image || ''}
                        onUploadSuccess={(media) => setEditingHero({ ...editingHero, image: media.url })}
                        onRemove={() => setEditingHero({ ...editingHero, image: null })}
                        label="Subir Imagen Banner Principal"
                        aspect="landscape"
                      />
                    </div>
                  </div>

                  {/* Tarjeta: Títulos y Textos */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-150/80 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cp }} />
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        3. Textos Informativos
                      </h4>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Título Principal (Opcional)</label>
                        <input
                          type="text"
                          placeholder="Ej: Oferta Especial de Verano"
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl font-bold text-sm text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition"
                          value={editingHero.title || ''}
                          onChange={(e) => setEditingHero({ ...editingHero, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Descripción o Subtítulo (Opcional)</label>
                        <textarea
                          placeholder="Ej: Descuento exclusivo del 20% reservando online"
                          rows={3}
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl font-bold text-sm text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition resize-none"
                          value={editingHero.description || ''}
                          onChange={(e) => setEditingHero({ ...editingHero, description: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta: Botón Interactivo de Acción */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-150/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cp }} />
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                          4. Botón de Acción Interactivo
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingHero({ ...editingHero, buttonEnabled: !editingHero.buttonEnabled })}
                        style={{ backgroundColor: editingHero.buttonEnabled ? cp : '#cbd5e1' }}
                        className="w-12 h-6 rounded-full transition-all relative cursor-pointer"
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                          editingHero.buttonEnabled ? 'left-[26px]' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {editingHero.buttonEnabled && (
                      <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Texto del Botón *</label>
                          <input
                            type="text"
                            placeholder="Ej: Comprar ahora, Ver servicio, Reservar cita"
                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl font-bold text-sm text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition"
                            value={editingHero.buttonText || ''}
                            onChange={(e) => setEditingHero({ ...editingHero, buttonText: e.target.value })}
                            required={editingHero.buttonEnabled}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Acción del Botón</label>
                            <select
                              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl font-bold text-sm text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition"
                              value={editingHero.actionType || 'NONE'}
                              onChange={(e) => {
                                const newAct = e.target.value;
                                let defaultVal = '';
                                if (newAct === 'PROMOTION' && options.promotions.length > 0) defaultVal = options.promotions[0].id;
                                if (newAct === 'PRODUCT' && options.products.length > 0) defaultVal = options.products[0].id;
                                if (newAct === 'SERVICE' && options.services.length > 0) defaultVal = options.services[0].id;
                                if (newAct === 'CATEGORY' && options.categories.length > 0) defaultVal = options.categories[0].id;
                                setEditingHero({ ...editingHero, actionType: newAct, actionValue: defaultVal });
                              }}
                            >
                              <option value="NONE">-- Seleccionar Acción --</option>
                              <option value="PROMOTION">Ir a Promoción</option>
                              <option value="PRODUCT">Ir a Producto</option>
                              <option value="SERVICE">Ir a Servicio</option>
                              {(options.negocio?.tipoNegocio === 'RESTAURANT' || options.negocio?.tipoNegocio === 'PINCHOS') && (
                                <option value="COMBO">Ir a Combo</option>
                              )}
                              <option value="CATEGORY">Ir a Categoría</option>
                              <option value="INTERNAL_URL">Ruta Interna (/ejemplo)</option>
                              <option value="EXTERNAL_URL">Enlace Externo (https://...)</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Destino Específico de la Acción</label>
                            {editingHero.actionType === 'PROMOTION' ? (
                              <select
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl font-bold text-sm text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition"
                                value={editingHero.actionValue || ''}
                                onChange={(e) => setEditingHero({ ...editingHero, actionValue: e.target.value })}
                              >
                                <option value="">-- Toda la sección de Promociones --</option>
                                {options.promotions.map(p => (
                                  <option key={p.id} value={p.id}>
                                    🎯 {p.titulo} (${p.precioPromo}) {p.estado !== 'activa' ? `[${p.estado?.toUpperCase() || 'INACTIVA'}]` : ''}
                                  </option>
                                ))}
                              </select>
                            ) : editingHero.actionType === 'PRODUCT' ? (
                              <select
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl font-bold text-sm text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition"
                                value={editingHero.actionValue || ''}
                                onChange={(e) => setEditingHero({ ...editingHero, actionValue: e.target.value })}
                              >
                                <option value="">-- Toda la sección de Productos --</option>
                                {options.products.map(p => (
                                  <option key={p.id} value={p.id}>🛍️ {p.nombre} (${p.precio})</option>
                                ))}
                              </select>
                            ) : editingHero.actionType === 'SERVICE' ? (
                              <select
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl font-bold text-sm text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition"
                                value={editingHero.actionValue || ''}
                                onChange={(e) => setEditingHero({ ...editingHero, actionValue: e.target.value })}
                              >
                                <option value="">-- Toda la sección de Servicios --</option>
                                {options.services.map(s => (
                                  <option key={s.id} value={s.id}>✂️ {s.nombre} (${s.precio || '0'})</option>
                                ))}
                              </select>
                            ) : editingHero.actionType === 'CATEGORY' ? (
                              <select
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl font-bold text-sm text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition"
                                value={editingHero.actionValue || ''}
                                onChange={(e) => setEditingHero({ ...editingHero, actionValue: e.target.value })}
                              >
                                <option value="">-- Todas las categorías --</option>
                                {options.categories.map(c => (
                                  <option key={c.id} value={c.id}>📁 {c.nombre}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder={
                                  editingHero.actionType === 'EXTERNAL_URL' 
                                    ? "Ej: https://wa.me/593999999999"
                                    : editingHero.actionType === 'INTERNAL_URL'
                                    ? "Ej: /servicios o /contacto"
                                    : "ID, slug o URL de destino"
                                }
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl font-bold text-sm text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition"
                                value={editingHero.actionValue || ''}
                                onChange={(e) => setEditingHero({ ...editingHero, actionValue: e.target.value })}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* COLUMNA DERECHA: PREVISUALIZACIÓN Y VIGENCIA (5 columnas) */}
                <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-4">
                  
                  {/* Tarjeta: Previsualización en Vivo */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-150/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Eye size={16} className="text-gray-500" />
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                          Vista Previa en Vivo
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                        {editingHero.isActive ? '🟢 Activo' : '⚪ Inactivo'}
                      </span>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 aspect-[16/9] flex flex-col justify-end p-5 shadow-inner">
                      {editingHero.image ? (
                        <img 
                          src={editingHero.image} 
                          alt="Preview" 
                          className="absolute inset-0 w-full h-full object-cover opacity-75"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center text-slate-600">
                          <ImageIcon size={36} className="opacity-30" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                      <div className="relative z-10 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          {getTypeBadge(editingHero.type || 'IMAGE')}
                        </div>
                        <h4 className="text-white font-black text-base line-clamp-1">
                          {editingHero.title || 'Título del Banner'}
                        </h4>
                        <p className="text-white/80 font-medium text-xs line-clamp-2 leading-snug">
                          {editingHero.description || 'Aquí se mostrará la descripción o mensaje promocional.'}
                        </p>
                        {editingHero.buttonEnabled && (
                          <div className="pt-1.5">
                            <span 
                              style={{ backgroundColor: cp }}
                              className="inline-flex items-center gap-1.5 text-white px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md"
                            >
                              <span>{editingHero.buttonText || 'Ver más'}</span>
                              <span>→</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta: Vigencia y Estado */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-150/80 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                      <Calendar size={16} className="text-gray-500" />
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        5. Publicación y Vigencia
                      </h4>
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                      <div>
                        <span className="text-xs font-black text-gray-900 uppercase">Estado del Banner</span>
                        <p className="text-[10px] text-gray-400 font-bold">
                          {editingHero.isActive ? 'Visible en la portada pública' : 'Oculto (Borrador)'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingHero({ ...editingHero, isActive: !editingHero.isActive })}
                        style={{ backgroundColor: editingHero.isActive ? cp : '#cbd5e1' }}
                        className="w-12 h-6 rounded-full transition-all relative cursor-pointer"
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                          editingHero.isActive ? 'left-[26px]' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          Fecha Inicio Vigencia (Opcional)
                        </label>
                        <input
                          type="date"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200/80 rounded-2xl font-bold text-xs text-gray-900 outline-none"
                          value={editingHero.startAt ? new Date(editingHero.startAt).toISOString().split('T')[0] : ''}
                          onChange={(e) => setEditingHero({ ...editingHero, startAt: e.target.value ? e.target.value : null })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          Fecha Fin Vigencia (Opcional)
                        </label>
                        <input
                          type="date"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200/80 rounded-2xl font-bold text-xs text-gray-900 outline-none"
                          value={editingHero.endAt ? new Date(editingHero.endAt).toISOString().split('T')[0] : ''}
                          onChange={(e) => setEditingHero({ ...editingHero, endAt: e.target.value ? e.target.value : null })}
                        />
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </form>
          </main>

          {/* BARRA INFERIOR STICKY */}
          <footer className="h-18 bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 sm:px-10 flex items-center justify-between shrink-0 z-20">
            <span className="text-xs text-gray-400 font-bold">
              {editingHero.id ? 'Editando banner existente' : 'Nuevo banner para la portada pública'}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowHeroModal(false)}
                className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-gray-500 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const form = document.getElementById('hero-fullscreen-form') as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
                disabled={saving}
                style={{ backgroundColor: cp }}
                className="px-8 py-2.5 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                <span>{saving ? 'Guardando...' : 'Guardar Hero'}</span>
              </button>
            </div>
          </footer>

        </div>
      )}

      {/* MODAL EDITAR / CREAR DESTACADO */}
      {showHighlightModal && editingHighlight && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] max-w-xl w-full p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Layers className="text-slate-900" size={20} />
                {editingHighlight.id ? 'Editar Destacado' : 'Nuevo Destacado'}
              </h3>
              <button type="button" onClick={() => setShowHighlightModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveHighlight} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tipo de Destacado</label>
                <select
                  className="w-full px-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm text-gray-900 outline-none"
                  value={editingHighlight.type || 'IMAGE'}
                  onChange={(e) => {
                    const newType = e.target.value;
                    let newSourceType = 'CUSTOM';
                    if (newType === 'PROMOTION') newSourceType = 'PROMOTION';
                    if (newType === 'PRODUCT') newSourceType = 'PRODUCT';
                    if (newType === 'SERVICE') newSourceType = 'SERVICE';

                    setEditingHighlight({
                      ...editingHighlight,
                      type: newType,
                      sourceType: newSourceType,
                      sourceId: null
                    });
                  }}
                >
                  <option value="IMAGE">🖼️ Imagen Personalizada</option>
                  <option value="PROMOTION">🏷️ Promoción</option>
                  <option value="PRODUCT">📦 Producto</option>
                  <option value="SERVICE">✂️ Servicio</option>
                  <option value="COMBO">🍱 Combo</option>
                </select>
              </div>

              {/* Selector de entidad */}
              {(editingHighlight.type === 'PROMOTION' || editingHighlight.type === 'PRODUCT' || editingHighlight.type === 'SERVICE') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Seleccionar recurso</label>
                  <select
                    className="w-full px-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm text-gray-900 outline-none"
                    value={editingHighlight.sourceId || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      let imgUrl = editingHighlight.image;
                      let titleVal = editingHighlight.title;
                      let descVal = editingHighlight.description;

                      if (editingHighlight.type === 'PROMOTION') {
                        const promo = options.promotions.find(p => p.id === selectedId);
                        if (promo) {
                          imgUrl = promo.imagenUrl || imgUrl;
                          titleVal = promo.titulo || titleVal;
                          descVal = promo.descripcion || descVal;
                        }
                      } else if (editingHighlight.type === 'PRODUCT') {
                        const prod = options.products.find(p => p.id === selectedId);
                        if (prod) {
                          imgUrl = prod.imagenUrl || imgUrl;
                          titleVal = prod.nombre || titleVal;
                          descVal = prod.descripcion || descVal;
                        }
                      } else if (editingHighlight.type === 'SERVICE') {
                        const srv = options.services.find(s => s.id === selectedId);
                        if (srv) {
                          titleVal = srv.nombre || titleVal;
                        }
                      }

                      setEditingHighlight({
                        ...editingHighlight,
                        sourceId: selectedId,
                        image: imgUrl,
                        title: titleVal,
                        description: descVal
                      });
                    }}
                  >
                    <option value="">-- Seleccionar de la lista --</option>
                    {editingHighlight.type === 'PROMOTION' && options.promotions.map(p => (
                      <option key={p.id} value={p.id}>{p.titulo}</option>
                    ))}
                    {editingHighlight.type === 'PRODUCT' && options.products.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                    {editingHighlight.type === 'SERVICE' && options.services.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Imagen */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Imagen Destacada</label>
                <ImageUploader
                  category="promotion"
                  currentUrl={editingHighlight.image || ''}
                  onUploadSuccess={(media) => setEditingHighlight({ ...editingHighlight, image: media.url })}
                  onRemove={() => setEditingHighlight({ ...editingHighlight, image: null })}
                  label="Subir Imagen Destacada"
                  aspect="square"
                />
              </div>

              {/* Título y Descripción Opcionales */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Título (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: Promoción de fin de semana"
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm text-gray-900 outline-none"
                    value={editingHighlight.title || ''}
                    onChange={(e) => setEditingHighlight({ ...editingHighlight, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Descripción (Opcional)</label>
                  <textarea
                    placeholder="Ej: Válido sólo por hoy"
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm text-gray-900 outline-none resize-none"
                    value={editingHighlight.description || ''}
                    onChange={(e) => setEditingHighlight({ ...editingHighlight, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                <span className="text-xs font-black text-gray-900 uppercase">Estado Activo</span>
                <button
                  type="button"
                  onClick={() => setEditingHighlight({ ...editingHighlight, isActive: !editingHighlight.isActive })}
                  style={{ backgroundColor: editingHighlight.isActive ? cp : '#cbd5e1' }}
                  className="w-12 h-6 rounded-full transition-all relative"
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    editingHighlight.isActive ? 'left-[26px]' : 'left-1'
                  }`} />
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowHighlightModal(false)}
                  className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-gray-500 hover:bg-gray-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Destacado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
