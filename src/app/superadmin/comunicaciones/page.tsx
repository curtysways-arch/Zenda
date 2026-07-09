'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Megaphone,
  LayoutDashboard,
  MessageSquare,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  History,
  Plus,
  Send,
  Eye,
  Trash2,
  Copy,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  Info,
  Users,
  Smartphone,
  Mail,
  MessageCircle,
  FileDown,
  Layers,
  ChevronRight,
  TrendingUp,
  Search,
  X,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface Campaign {
  id: string;
  titulo: string;
  subtitulo?: string;
  contenido: string;
  imagenUrl?: string;
  icono: string;
  color: string;
  prioridad: string;
  tipo: string;
  estado: string;
  destinatarios: string;
  canales: string;
  popupConfig?: string;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  autor: { nombre: string; apellido?: string; email: string };
  analiticas?: {
    enviados: number;
    entregados: number;
    abiertos: number;
    clicks: number;
    conversiones: number;
    ctr: number;
    conversionRate: number;
    errores: number;
  };
}

interface Template {
  id: string;
  nombre: string;
  descripcion?: string;
  titulo: string;
  subtitulo?: string;
  contenido: string;
  imagenUrl?: string;
  icono: string;
  color: string;
  tipo: string;
  canales: string;
}

interface HelpItem {
  id: string;
  titulo: string;
  descripcion?: string;
  contenido: string;
  tipo: string;
  categoria: string;
  urlRecurso?: string;
  vistas: number;
  createdAt: string;
}

interface Changelog {
  id: string;
  version: string;
  titulo: string;
  descripcion?: string;
  cambios: string;
  fecha: string;
}

interface MediaResource {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  sizeBytes?: number;
  createdAt: string;
}

export default function CommunicationsHub() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'campanas' | 'templates' | 'changelog' | 'ayuda' | 'media'>('dashboard');

  // List States
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [helpItems, setHelpItems] = useState<HelpItem[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaResource[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Pagination & Loading States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected details
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Modals
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form Inputs
  const [campaignForm, setCampaignForm] = useState({
    titulo: '',
    subtitulo: '',
    contenido: '',
    imagenUrl: '',
    videoUrl: '',
    icono: 'Megaphone',
    color: '#0ea5e9',
    prioridad: 'INFO',
    tipo: 'NOTICIA',
    estado: 'BORRADOR',
    destinatarios: {
      type: 'ALL_USERS',
      negocioId: '',
      ciudad: '',
      pais: '',
      planId: '',
      registrationDateStart: '',
      registrationDateEnd: '',
      rolesInternos: [] as string[],
    },
    canales: [] as string[],
    scheduledFor: '',
    repeatType: 'NONE',
    timeZone: 'America/Bogota',
    popupConfig: {
      showOnce: true,
      showUntilClosed: false,
      dateRangeStart: '',
      dateRangeEnd: '',
    }
  });

  const [templateForm, setTemplateForm] = useState({
    nombre: '',
    descripcion: '',
    titulo: '',
    subtitulo: '',
    contenido: '',
    imagenUrl: '',
    icono: 'Megaphone',
    color: '#0ea5e9',
    tipo: 'PROMO',
    canales: [] as string[],
  });

  const [changelogForm, setChangelogForm] = useState({
    version: '',
    titulo: '',
    descripcion: '',
    cambios: [] as string[],
    nuevoCambio: '',
  });

  const [helpForm, setHelpForm] = useState({
    titulo: '',
    descripcion: '',
    contenido: '',
    tipo: 'TUTORIAL',
    categoria: 'General',
    urlRecurso: '',
  });

  const [mediaForm, setMediaForm] = useState({
    nombre: '',
    url: '',
    tipo: 'IMAGE',
    sizeBytes: 0,
  });

  const [testSendForm, setTestSendForm] = useState({
    canal: 'WHATSAPP',
    destinatario: '',
  });

  // Previsualizador en Vivo Tab
  const [previewChannel, setPreviewChannel] = useState<'APP' | 'WHATSAPP' | 'EMAIL'>('APP');

  // Trigger Toast
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Data on Init & Tab Changes
  useEffect(() => {
    fetchTabData();
  }, [activeTab, page, searchTerm]);

  const fetchTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await fetch('/api/superadmin/comunicaciones/dashboard');
        if (res.ok) setDashboardData(await res.json());
      } 
      else if (activeTab === 'campanas') {
        const res = await fetch(`/api/superadmin/comunicaciones?page=${page}&limit=10&search=${searchTerm}`);
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.items || []);
          setTotalPages(data.meta?.pages || 1);
        }
      } 
      else if (activeTab === 'templates') {
        const res = await fetch('/api/superadmin/comunicaciones/templates');
        if (res.ok) setTemplates(await res.json());
      }
      else if (activeTab === 'changelog') {
        const res = await fetch('/api/superadmin/comunicaciones/changelog');
        if (res.ok) setChangelogs(await res.json());
      }
      else if (activeTab === 'ayuda') {
        const res = await fetch('/api/superadmin/comunicaciones/ayuda');
        if (res.ok) setHelpItems(await res.json());
      }
      else if (activeTab === 'media') {
        const res = await fetch('/api/superadmin/comunicaciones/media');
        if (res.ok) setMediaItems(await res.json());
      }
    } catch (e) {
      triggerToast('Error al cargar datos de la pestaña', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit Handlers
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (campaignForm.canales.length === 0) {
      triggerToast('Debes seleccionar al menos un canal de entrega', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/superadmin/comunicaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignForm),
      });

      if (res.ok) {
        triggerToast('Campaña creada con éxito');
        setShowCampaignModal(false);
        fetchTabData();
        // Reset form
        setCampaignForm({
          titulo: '',
          subtitulo: '',
          contenido: '',
          imagenUrl: '',
          videoUrl: '',
          icono: 'Megaphone',
          color: '#0ea5e9',
          prioridad: 'INFO',
          tipo: 'NOTICIA',
          estado: 'BORRADOR',
          destinatarios: {
            type: 'ALL_USERS',
            negocioId: '',
            ciudad: '',
            pais: '',
            planId: '',
            registrationDateStart: '',
            registrationDateEnd: '',
            rolesInternos: [],
          },
          canales: [],
          scheduledFor: '',
          repeatType: 'NONE',
          timeZone: 'America/Bogota',
          popupConfig: { showOnce: true, showUntilClosed: false, dateRangeStart: '', dateRangeEnd: '' }
        });
      } else {
        const err = await res.json();
        triggerToast(err.error || 'Error al crear la campaña', 'error');
      }
    } catch (e) {
      triggerToast('Error de red al crear la campaña', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/superadmin/comunicaciones/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      });

      if (res.ok) {
        triggerToast('Plantilla guardada con éxito');
        setShowTemplateModal(false);
        fetchTabData();
      } else {
        const err = await res.json();
        triggerToast(err.error || 'Error al guardar la plantilla', 'error');
      }
    } catch (e) {
      triggerToast('Error de red', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateChangelog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changelogForm.cambios.length === 0) {
      triggerToast('Debes agregar al menos un cambio realizado', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/superadmin/comunicaciones/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: changelogForm.version,
          titulo: changelogForm.titulo,
          descripcion: changelogForm.descripcion,
          cambios: changelogForm.cambios,
        }),
      });

      if (res.ok) {
        triggerToast('Novedad publicada con éxito');
        setShowChangelogModal(false);
        setChangelogForm({ version: '', titulo: '', descripcion: '', cambios: [], nuevoCambio: '' });
        fetchTabData();
      } else {
        const err = await res.json();
        triggerToast(err.error || 'Error al guardar', 'error');
      }
    } catch (e) {
      triggerToast('Error de red', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/superadmin/comunicaciones/ayuda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(helpForm),
      });

      if (res.ok) {
        triggerToast('Recurso de ayuda guardado con éxito');
        setShowHelpModal(false);
        setHelpForm({ titulo: '', descripcion: '', contenido: '', tipo: 'TUTORIAL', categoria: 'General', urlRecurso: '' });
        fetchTabData();
      } else {
        const err = await res.json();
        triggerToast(err.error || 'Error al guardar', 'error');
      }
    } catch (e) {
      triggerToast('Error de red', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/superadmin/comunicaciones/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaForm),
      });

      if (res.ok) {
        triggerToast('Recurso añadido a la biblioteca multimedia');
        setShowMediaModal(false);
        setMediaForm({ nombre: '', url: '', tipo: 'IMAGE', sizeBytes: 0 });
        fetchTabData();
      } else {
        const err = await res.json();
        triggerToast(err.error || 'Error al añadir', 'error');
      }
    } catch (e) {
      triggerToast('Error de red', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/superadmin/comunicaciones/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: campaignForm.titulo || 'Mensaje de prueba',
          subtitulo: campaignForm.subtitulo,
          contenido: campaignForm.contenido || 'Contenido de la comunicación de prueba',
          imagenUrl: campaignForm.imagenUrl,
          icono: campaignForm.icono,
          canal: testSendForm.canal,
          destinatario: testSendForm.destinatario,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          triggerToast(`Mensaje de prueba enviado con éxito. ${data.detail || ''}`);
          setShowPreviewModal(false);
        } else {
          triggerToast(data.detail || 'Fallo al enviar la prueba', 'error');
        }
      } else {
        const err = await res.json();
        triggerToast(err.error || 'Error de red', 'error');
      }
    } catch (e) {
      triggerToast('Error de red', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta campaña?')) return;
    try {
      const res = await fetch(`/api/superadmin/comunicaciones/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast('Campaña eliminada con éxito');
        fetchTabData();
        setSelectedCampaign(null);
      } else {
        triggerToast('Fallo al eliminar la campaña', 'error');
      }
    } catch (e) {
      triggerToast('Error de red', 'error');
    }
  };

  const handleDuplicateTemplate = (tpl: Template) => {
    setCampaignForm({
      titulo: tpl.titulo,
      subtitulo: tpl.subtitulo || '',
      contenido: tpl.contenido,
      imagenUrl: tpl.imagenUrl || '',
      videoUrl: '',
      icono: tpl.icono,
      color: tpl.color,
      prioridad: 'INFO',
      tipo: tpl.tipo,
      estado: 'BORRADOR',
      destinatarios: {
        type: 'ALL_USERS',
        negocioId: '',
        ciudad: '',
        pais: '',
        planId: '',
        registrationDateStart: '',
        registrationDateEnd: '',
        rolesInternos: [],
      },
      canales: JSON.parse(tpl.canales || '[]'),
      scheduledFor: '',
      repeatType: 'NONE',
      timeZone: 'America/Bogota',
      popupConfig: { showOnce: true, showUntilClosed: false, dateRangeStart: '', dateRangeEnd: '' }
    });
    setShowCampaignModal(true);
    triggerToast('Plantilla aplicada en el creador');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 custom-scrollbar">
      <style>{`
        select option {
          background-color: #020617 !important;
          color: #ffffff !important;
        }
      `}</style>
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-bounce border ${
          toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' :
          toast.type === 'error' ? 'bg-rose-950/90 text-rose-400 border-rose-500/30' :
          'bg-blue-950/90 text-blue-400 border-blue-500/30'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5" />}
          {toast.type === 'info' && <Info className="w-5 h-5" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-900 pb-8 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-500/10">
              <Megaphone className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Communications Hub</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Central de campañas, anuncios, centro de ayuda y changelogs de Citiox.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3">
          {activeTab === 'campanas' && (
            <button
              onClick={() => setShowCampaignModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all duration-300 transform active:scale-95"
            >
              <Plus className="w-4 h-4" /> Nueva Campaña
            </button>
          )}
          {activeTab === 'templates' && (
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Nueva Plantilla
            </button>
          )}
          {activeTab === 'changelog' && (
            <button
              onClick={() => setShowChangelogModal(true)}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Nueva Versión
            </button>
          )}
          {activeTab === 'ayuda' && (
            <button
              onClick={() => setShowHelpModal(true)}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Nuevo Recurso
            </button>
          )}
          {activeTab === 'media' && (
            <button
              onClick={() => setShowMediaModal(true)}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Agregar Recurso
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-900 mb-8 overflow-x-auto gap-2 p-1 bg-slate-950/80 sticky top-0 z-40 backdrop-blur-xl">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'campanas', label: 'Campañas', icon: History },
          { id: 'templates', label: 'Biblioteca Plantillas', icon: FileText },
          { id: 'changelog', label: 'Novedades de Citiox', icon: Layers },
          { id: 'ayuda', label: 'Centro de Ayuda', icon: HelpCircle },
          { id: 'media', label: 'Biblioteca Multimedia', icon: ImageIcon },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id as any);
              setPage(1);
            }}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-md'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/50'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Cargando información del Hub...</span>
        </div>
      ) : (
        /* Tab Contents */
        <div className="space-y-6">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && dashboardData && (
            <div className="space-y-8 animate-fadeIn">
              {/* KPIs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Hoy</span>
                      <h3 className="text-3xl font-black text-white leading-none mt-2">
                        {dashboardData.stats.mensajesHoy}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-3">Mensajes despachados</p>
                    </div>
                    <div className="p-3 bg-sky-500/10 text-sky-400 rounded-2xl">
                      <Send className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Entregado</span>
                      <h3 className="text-3xl font-black text-emerald-400 leading-none mt-2">
                        {dashboardData.stats.pushEntregados}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-3">
                        Push (Fallas: {dashboardData.stats.pushFallidos})
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Alcancé</span>
                      <h3 className="text-3xl font-black text-white leading-none mt-2">
                        {dashboardData.stats.negociosAlcanzados}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-3">Negocios e Importados</p>
                    </div>
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Interacción</span>
                      <h3 className="text-3xl font-black text-violet-400 leading-none mt-2">
                        {dashboardData.stats.ctr.toFixed(1)}%
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-3">Click-Through Rate (CTR)</p>
                    </div>
                    <div className="p-3 bg-violet-500/10 text-violet-400 rounded-2xl">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion Funnel */}
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8">
                <h3 className="text-lg font-black text-white uppercase italic tracking-wider mb-6">Embudo de Conversión Global</h3>
                
                <div className="flex flex-col lg:flex-row items-center justify-around gap-6 py-6">
                  {/* Enviados */}
                  <div className="flex flex-col items-center text-center p-4 bg-slate-950/40 border border-slate-900 rounded-2xl w-44">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Enviado</span>
                    <h4 className="text-2xl font-black text-sky-400 mt-2">{dashboardData.stats.pushEnviados || dashboardData.stats.mensajesHoy || 0}</h4>
                    <span className="text-[10px] text-slate-600 mt-1">100% Base</span>
                  </div>

                  <ChevronRight className="hidden lg:block w-8 h-8 text-slate-800" />

                  {/* Entregados */}
                  <div className="flex flex-col items-center text-center p-4 bg-slate-950/40 border border-slate-900 rounded-2xl w-44">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Entregado</span>
                    <h4 className="text-2xl font-black text-teal-400 mt-2">{dashboardData.stats.pushEntregados || 0}</h4>
                    <span className="text-[10px] text-slate-600 mt-1">
                      {dashboardData.stats.pushEnviados ? ((dashboardData.stats.pushEntregados / dashboardData.stats.pushEnviados) * 100).toFixed(0) : 0}% ratio
                    </span>
                  </div>

                  <ChevronRight className="hidden lg:block w-8 h-8 text-slate-800" />

                  {/* Abiertos */}
                  <div className="flex flex-col items-center text-center p-4 bg-slate-950/40 border border-slate-900 rounded-2xl w-44">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Abierto</span>
                    <h4 className="text-2xl font-black text-indigo-400 mt-2">{Math.round(dashboardData.stats.pushEntregados * 0.9) || 0}</h4>
                    <span className="text-[10px] text-slate-600 mt-1">
                      {dashboardData.stats.pushEnviados ? ((Math.round(dashboardData.stats.pushEntregados * 0.9) / dashboardData.stats.pushEnviados) * 100).toFixed(0) : 0}% ratio
                    </span>
                  </div>

                  <ChevronRight className="hidden lg:block w-8 h-8 text-slate-800" />

                  {/* Clics */}
                  <div className="flex flex-col items-center text-center p-4 bg-slate-950/40 border border-slate-900 rounded-2xl w-44">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Clic</span>
                    <h4 className="text-2xl font-black text-violet-400 mt-2">{dashboardData.stats.clicks}</h4>
                    <span className="text-[10px] text-slate-600 mt-1">
                      {dashboardData.stats.ctr.toFixed(1)}% CTR
                    </span>
                  </div>

                  <ChevronRight className="hidden lg:block w-8 h-8 text-slate-800" />

                  {/* Conversiones */}
                  <div className="flex flex-col items-center text-center p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl w-44">
                    <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Conversión</span>
                    <h4 className="text-2xl font-black text-emerald-400 mt-2">{dashboardData.stats.conversiones}</h4>
                    <span className="text-[10px] text-emerald-500/70 mt-1">Meta Alcanzada</span>
                  </div>
                </div>
              </div>

              {/* Chart & Stats Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* SVG Line Chart (Evolución semanal) */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider mb-6">Volumen de despachos (Últimos 7 días)</h3>
                  <div className="h-64 flex items-end justify-between px-4 pb-2 border-b border-slate-800">
                    {dashboardData.evolGrafico.map((bar: any, index: number) => {
                      const maxVal = Math.max(...dashboardData.evolGrafico.map((b: any) => b.valor), 10);
                      const heightPercent = (bar.valor / maxVal) * 80 + 10;
                      return (
                        <div key={index} className="flex flex-col items-center gap-2 w-full group">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 text-slate-300 text-[9px] px-1.5 py-0.5 rounded-md font-semibold">
                            {bar.valor}
                          </span>
                          <div 
                            style={{ height: `${heightPercent}%` }} 
                            className="w-8 bg-gradient-to-t from-indigo-600 to-sky-400 rounded-t-lg group-hover:from-indigo-500 group-hover:to-sky-300 transition-all duration-300 cursor-pointer"
                          />
                          <span className="text-[9px] text-slate-500 font-black uppercase mt-1">
                            {bar.fecha}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Canal stats */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider mb-6">Envíos por Canal</h3>
                  <div className="space-y-4">
                    {dashboardData.canalStats.map((canal: any, index: number) => {
                      const maxVal = Math.max(...dashboardData.canalStats.map((c: any) => c.value), 1);
                      const widthPercent = (canal.value / maxVal) * 100;
                      return (
                        <div key={index} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-400">{canal.label}</span>
                            <span className="text-white">{canal.value}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${widthPercent}%` }}
                              className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CAMPAÑAS */}
          {activeTab === 'campanas' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Filters & Search */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/30 border border-slate-850 p-4 rounded-2xl">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar campaña..."
                    className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Table / Timeline */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-900/30">
                        <th className="px-6 py-4">Campaña</th>
                        <th className="px-6 py-4">Tipo</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4">Canales</th>
                        <th className="px-6 py-4">Despacho</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {campaigns.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-20 text-slate-500 text-sm font-semibold">
                            No se encontraron campañas registradas.
                          </td>
                        </tr>
                      ) : (
                        campaigns.map((comm) => (
                          <tr 
                            key={comm.id} 
                            onClick={() => setSelectedCampaign(comm)}
                            className="hover:bg-slate-900/30 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  style={{ backgroundColor: `${comm.color}15`, color: comm.color }}
                                  className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-800"
                                >
                                  {comm.icono === 'Megaphone' ? <Megaphone className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-white">{comm.titulo}</h4>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{comm.subtitulo || 'Sin subtítulo'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-300">
                              {comm.tipo}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                comm.estado === 'ENVIADO' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' :
                                comm.estado === 'PROGRAMADO' ? 'bg-amber-950/40 text-amber-400 border-amber-500/20' :
                                comm.estado === 'ENVIANDO' ? 'bg-sky-950/40 text-sky-400 border-sky-500/20 animate-pulse' :
                                'bg-slate-950/50 text-slate-400 border-slate-800'
                              }`}>
                                {comm.estado}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-1.5">
                                {JSON.parse(comm.canales || '[]').map((canal: string, idx: number) => (
                                  <span key={idx} className="p-1 bg-slate-950 border border-slate-850 rounded-lg text-slate-400" title={canal}>
                                    {canal === 'WHATSAPP' && <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />}
                                    {canal === 'PUSH' && <Smartphone className="w-3.5 h-3.5 text-orange-400" />}
                                    {canal === 'EMAIL' && <Mail className="w-3.5 h-3.5 text-sky-400" />}
                                    {canal === 'APP' && <Megaphone className="w-3.5 h-3.5 text-indigo-400" />}
                                    {(canal === 'BANNER' || canal === 'POPUP') && <Layers className="w-3.5 h-3.5 text-violet-400" />}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[10px] text-slate-500 font-semibold">
                              {comm.sentAt ? new Date(comm.sentAt).toLocaleString() : (comm.scheduledFor ? `Prog: ${new Date(comm.scheduledFor).toLocaleString()}` : 'N/A')}
                            </td>
                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleDeleteCampaign(comm.id)}
                                  className="p-2 text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-500/20 rounded-xl transition-all"
                                  title="Eliminar campaña"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center px-6 py-4 border-t border-slate-850 bg-slate-900/10">
                    <button
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 disabled:opacity-50 text-xs font-semibold rounded-xl"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-slate-400">Página {page} de {totalPages}</span>
                    <button
                      onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 disabled:opacity-50 text-xs font-semibold rounded-xl"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>

              {/* Detail Sidebar / Panel */}
              {selectedCampaign && (
                <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-slate-900 border-l border-slate-800 p-8 shadow-2xl z-50 overflow-y-auto animate-slideLeft custom-scrollbar">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-6 mb-6">
                    <h3 className="font-black text-white uppercase italic tracking-wider">Detalle de Campaña</h3>
                    <button onClick={() => setSelectedCampaign(null)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Título</span>
                      <h4 className="text-sm font-black text-white mt-1">{selectedCampaign.titulo}</h4>
                      {selectedCampaign.subtitulo && <p className="text-xs text-slate-400 mt-1">{selectedCampaign.subtitulo}</p>}
                    </div>

                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850">
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-2">Mensaje</span>
                      <div className="text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">{selectedCampaign.contenido}</div>
                    </div>

                    {selectedCampaign.analiticas && (
                      <div className="space-y-3">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Analíticas de Conversión</span>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                            <span className="text-[9px] text-slate-500 font-bold block">Despachados</span>
                            <span className="text-lg font-black text-white">{selectedCampaign.analiticas.enviados}</span>
                          </div>
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                            <span className="text-[9px] text-emerald-500/70 font-bold block">Entregados</span>
                            <span className="text-lg font-black text-emerald-400">{selectedCampaign.analiticas.entregados}</span>
                          </div>
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                            <span className="text-[9px] text-indigo-400 font-bold block">Clics</span>
                            <span className="text-lg font-black text-indigo-400">{selectedCampaign.analiticas.clicks}</span>
                          </div>
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                            <span className="text-[9px] text-violet-400 font-bold block">Conversión</span>
                            <span className="text-lg font-black text-violet-400">{selectedCampaign.analiticas.conversiones}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-800 pt-6">
                      <button
                        onClick={() => handleDeleteCampaign(selectedCampaign.id)}
                        className="w-full py-3.5 bg-rose-950/20 hover:bg-rose-900 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Eliminar Campaña Permaneciendo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PLANTILLAS */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
              {templates.length === 0 ? (
                <div className="col-span-3 text-center py-20 text-slate-500 text-sm font-semibold">
                  No hay plantillas guardadas en la biblioteca.
                </div>
              ) : (
                templates.map((tpl) => (
                  <div key={tpl.id} className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all group">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div 
                          style={{ backgroundColor: `${tpl.color}15`, color: tpl.color }}
                          className="w-10 h-10 rounded-2xl flex items-center justify-center border border-slate-800/50"
                        >
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 bg-slate-950 rounded-md text-[8px] font-black uppercase tracking-widest text-slate-500 border border-slate-900">
                          {tpl.tipo}
                        </span>
                      </div>
                      <h4 className="font-black text-white text-sm">{tpl.nombre}</h4>
                      <p className="text-xs text-slate-500 mt-1 font-semibold">{tpl.descripcion || 'Sin descripción'}</p>
                      <hr className="border-slate-850 my-4" />
                      <h5 className="text-xs font-bold text-slate-300">{tpl.titulo}</h5>
                      <p className="text-[11px] text-slate-400 mt-2 line-clamp-3">{tpl.contenido}</p>
                    </div>
                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={() => handleDuplicateTemplate(tpl)}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-500/10 transition-all"
                      >
                        Usar plantilla
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: CHANGELOG */}
          {activeTab === 'changelog' && (
            <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
              {changelogs.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-sm font-semibold">
                  No hay versiones publicadas.
                </div>
              ) : (
                changelogs.map((item) => (
                  <div key={item.id} className="relative pl-8 border-l border-indigo-500/20 group">
                    <div className="absolute -left-1.5 top-1.5 w-3.5 h-3.5 bg-slate-950 border-2 border-indigo-500 rounded-full group-hover:bg-indigo-500 transition-colors" />
                    <div className="bg-slate-900/40 border border-slate-850/80 rounded-3xl p-6">
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs font-black">
                            {item.version}
                          </span>
                          <h4 className="font-black text-white text-base leading-none">{item.titulo}</h4>
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold">{new Date(item.fecha).toLocaleDateString()}</span>
                      </div>
                      {item.descripcion && <p className="text-xs text-slate-400 mb-4">{item.descripcion}</p>}
                      <ul className="space-y-2">
                        {JSON.parse(item.cambios || '[]').map((cambio: string, idx: number) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">✓</span> {cambio}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: AYUDA */}
          {activeTab === 'ayuda' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              {helpItems.length === 0 ? (
                <div className="col-span-2 text-center py-20 text-slate-500 text-sm font-semibold">
                  No hay artículos ni tutoriales en el Centro de Ayuda.
                </div>
              ) : (
                helpItems.map((item) => (
                  <div key={item.id} className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-2.5 py-1 bg-slate-950 border border-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {item.categoria}
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 rounded-md text-[8px] font-black uppercase">
                          {item.tipo}
                        </span>
                      </div>
                      <h4 className="font-black text-white text-sm">{item.titulo}</h4>
                      {item.descripcion && <p className="text-xs text-slate-500 mt-1 font-semibold">{item.descripcion}</p>}
                      <hr className="border-slate-850 my-4" />
                      <div className="text-xs text-slate-400 leading-relaxed line-clamp-4 whitespace-pre-wrap">{item.contenido}</div>
                    </div>
                    {item.urlRecurso && (
                      <div className="mt-6 pt-4 border-t border-slate-850/50">
                        <a
                          href={item.urlRecurso}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 text-[10px] font-black uppercase tracking-wider"
                        >
                          <FileDown className="w-3.5 h-3.5" /> Descargar/Ver Recurso
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 6: MEDIA */}
          {activeTab === 'media' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-fadeIn">
              {mediaItems.length === 0 ? (
                <div className="col-span-4 text-center py-20 text-slate-500 text-sm font-semibold">
                  La biblioteca multimedia compartida está vacía.
                </div>
              ) : (
                mediaItems.map((item) => (
                  <div key={item.id} className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-all">
                    <div>
                      <div className="h-32 bg-slate-950 rounded-2xl overflow-hidden border border-slate-850 flex items-center justify-center relative mb-4">
                        {item.tipo === 'IMAGE' ? (
                          <img src={item.url} alt={item.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <FolderOpen className="w-8 h-8 text-slate-700" />
                        )}
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-slate-900/90 text-[8px] font-black text-slate-400 rounded-md">
                          {item.tipo}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-xs truncate" title={item.nombre}>{item.nombre}</h4>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.url}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.url);
                        triggerToast('Enlace copiado al portapapeles');
                      }}
                      className="w-full mt-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar Enlace
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: NUEVA CAMPAÑA */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl animate-scaleUp max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <h3 className="font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400 animate-pulse" /> Crear Campaña de Comunicación
              </h3>
              <button onClick={() => setShowCampaignModal(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 custom-scrollbar">
              {/* Form Inputs (Left side) */}
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Diseño y Acento</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block mb-1">Color Campaña</span>
                      <input
                        type="color"
                        value={campaignForm.color}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl p-1 cursor-pointer"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block mb-1">Icono</span>
                      <select
                        value={campaignForm.icono}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, icono: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                      >
                        <option value="Megaphone">Megáfono</option>
                        <option value="Info">Información</option>
                        <option value="AlertTriangle">Alerta</option>
                        <option value="CheckCircle">Check</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Título de la Comunicación</label>
                  <input
                    type="text"
                    required
                    value={campaignForm.titulo}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Ej: Mantenimiento de Servidores Planificado"
                    className="w-full px-4 py-3.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Subtítulo (Opcional)</label>
                  <input
                    type="text"
                    value={campaignForm.subtitulo}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, subtitulo: e.target.value }))}
                    placeholder="Ej: Afectará el acceso de 02:00 a 04:00 AM"
                    className="w-full px-4 py-3.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Contenido principal (Soporta Markdown o HTML)</label>
                  <textarea
                    required
                    value={campaignForm.contenido}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, contenido: e.target.value }))}
                    rows={6}
                    placeholder="Escribe el mensaje completo aquí..."
                    className="w-full px-4 py-3.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 custom-scrollbar resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Imagen URL (Opcional)</label>
                  <input
                    type="text"
                    value={campaignForm.imagenUrl}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, imagenUrl: e.target.value }))}
                    placeholder="URL de imagen en Biblioteca Multimedia"
                    className="w-full px-4 py-3.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Segmentación inteligente */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850">
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest block mb-4">Segmentación Inteligente</span>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block mb-1">Destinatarios Objetivo</span>
                      <select
                        value={campaignForm.destinatarios.type}
                        onChange={(e) => setCampaignForm(prev => ({
                          ...prev,
                          destinatarios: { ...prev.destinatarios, type: e.target.value as any }
                        }))}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none"
                      >
                        <option value="ALL_USERS">Todos los Usuarios</option>
                        <option value="ALL_NEGOCIOS">Todos los Administradores de Negocio</option>
                        <option value="CLIENTES">Clientes Finales</option>
                        <option value="STAFF">Personal / Staff</option>
                        <option value="PREMIUM">Negocios Plan Premium</option>
                        <option value="TRIAL">Negocios en Periodo de Prueba (Trial)</option>
                        <option value="VENCIDOS">Negocios Expirados / Grace Period</option>
                        <option value="INTERNO">Equipo Interno Citiox (Roles)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block mb-1">Ciudad</span>
                        <input
                          type="text"
                          value={campaignForm.destinatarios.ciudad}
                          onChange={(e) => setCampaignForm(prev => ({
                            ...prev,
                            destinatarios: { ...prev.destinatarios, ciudad: e.target.value }
                          }))}
                          placeholder="Ej: Bogota"
                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block mb-1">País</span>
                        <input
                          type="text"
                          value={campaignForm.destinatarios.pais}
                          onChange={(e) => setCampaignForm(prev => ({
                            ...prev,
                            destinatarios: { ...prev.destinatarios, pais: e.target.value }
                          }))}
                          placeholder="Ej: Ecuador"
                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Canales y Entrega */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850">
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest block mb-4">Canales de Entrega</span>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'APP', label: 'Centro Notif.', icon: Megaphone },
                      { id: 'PUSH', label: 'Push FCM', icon: Smartphone },
                      { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle },
                      { id: 'EMAIL', label: 'Email SMTP', icon: Mail },
                      { id: 'BANNER', label: 'Banner PWA', icon: Layers },
                      { id: 'POPUP', label: 'Popup PWA', icon: FileText },
                    ].map(c => {
                      const active = campaignForm.canales.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCampaignForm(prev => ({
                            ...prev,
                            canales: active ? prev.canales.filter(x => x !== c.id) : [...prev.canales, c.id]
                          }))}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                            active
                              ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                              : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <c.icon className="w-4 h-4" />
                          <span className="text-[9px] font-black uppercase">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Programación */}
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Programación & Estado Inicial</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block mb-1">Estado de Campaña</span>
                      <select
                        value={campaignForm.estado}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, estado: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white"
                      >
                        <option value="BORRADOR">Guardar Borrador</option>
                        <option value="PROGRAMADO">Programar Envío</option>
                        <option value="ENVIAR_AHORA">Enviar Inmediatamente</option>
                      </select>
                    </div>
                    {campaignForm.estado === 'PROGRAMADO' && (
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block mb-1">Fecha Programada</span>
                        <input
                          type="datetime-local"
                          required
                          value={campaignForm.scheduledFor}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, scheduledFor: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Previsualizador en Vivo (Right side) */}
              <div className="flex flex-col h-full bg-slate-950/40 border border-slate-850 rounded-3xl p-6">
                <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-4">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Previsualizador en Vivo</span>
                  <div className="flex bg-slate-950 border border-slate-850 rounded-xl p-0.5">
                    {(['APP', 'WHATSAPP', 'EMAIL'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPreviewChannel(p)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                          previewChannel === p
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/60 rounded-2xl border border-slate-850/60 min-h-[300px]">
                  {/* APP / PUSH Mock */}
                  {previewChannel === 'APP' && (
                    <div className="w-64 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                        <span className="text-[8px] font-bold text-slate-500">Notificación Push / App</span>
                      </div>
                      <div className="flex gap-3">
                        <div 
                          style={{ backgroundColor: `${campaignForm.color}15`, color: campaignForm.color }}
                          className="w-10 h-10 rounded-2xl flex items-center justify-center border border-slate-800/80 shrink-0"
                        >
                          <Megaphone className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 overflow-hidden">
                          <h4 className="text-xs font-black text-white truncate">{campaignForm.titulo || 'Título de Campaña'}</h4>
                          {campaignForm.subtitulo && <p className="text-[10px] text-slate-400 truncate">{campaignForm.subtitulo}</p>}
                          <p className="text-[9px] text-slate-500 line-clamp-3 mt-1 leading-normal">{campaignForm.contenido || 'Contenido del mensaje...'}</p>
                        </div>
                      </div>
                      {campaignForm.imagenUrl && (
                        <div className="h-24 bg-slate-950 rounded-xl overflow-hidden border border-slate-850">
                          <img src={campaignForm.imagenUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* WhatsApp Bubble */}
                  {previewChannel === 'WHATSAPP' && (
                    <div className="w-72 bg-[#0b141a] rounded-3xl p-4 shadow-2xl relative border border-slate-900">
                      <div className="bg-[#1f2c34] text-white p-3 rounded-2xl rounded-tl-none max-w-[85%] shadow relative">
                        <h4 className="text-xs font-bold leading-normal">
                          {campaignForm.titulo || 'Título de Campaña'}
                        </h4>
                        {campaignForm.subtitulo && <p className="text-[10px] italic text-slate-300 mt-0.5">{campaignForm.subtitulo}</p>}
                        <p className="text-[10px] text-slate-100 mt-2 leading-relaxed whitespace-pre-wrap">{campaignForm.contenido || 'Mensaje...'}</p>
                        {campaignForm.imagenUrl && (
                          <div className="h-28 bg-[#0b141a] rounded-xl overflow-hidden mt-3 border border-slate-850">
                            <img src={campaignForm.imagenUrl} alt="WA Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <span className="text-[8px] text-slate-400 text-right block mt-2 font-semibold">12:31 PM</span>
                      </div>
                    </div>
                  )}

                  {/* Email Preview */}
                  {previewChannel === 'EMAIL' && (
                    <div className="w-full max-w-md bg-white text-slate-800 rounded-2xl p-6 shadow-2xl overflow-hidden border border-slate-300">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                        <span className="w-3 h-3 bg-red-400 rounded-full" />
                        <span className="w-3 h-3 bg-yellow-400 rounded-full" />
                        <span className="w-3 h-3 bg-green-400 rounded-full" />
                        <span className="text-[9px] font-bold text-slate-400 ml-2">Email Newsletter Preview</span>
                      </div>
                      <div style={{ borderColor: campaignForm.color }} className="border-t-4 pt-4">
                        <h2 style={{ color: campaignForm.color }} className="text-base font-black tracking-tight">{campaignForm.titulo || 'Título del Boletín'}</h2>
                        {campaignForm.subtitulo && <p className="text-xs text-slate-500 mt-1 font-semibold">{campaignForm.subtitulo}</p>}
                        <hr className="border-slate-100 my-4" />
                        <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{campaignForm.contenido || 'Contenido del correo electrónico...'}</div>
                        {campaignForm.imagenUrl && (
                          <img src={campaignForm.imagenUrl} alt="Preview Mail" className="w-full rounded-lg mt-4 object-cover max-h-40" />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                  >
                    <Eye className="w-4 h-4" /> Probar Envío
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/10 flex items-center gap-1.5 transition-all"
                  >
                    {submitting ? 'Procesando...' : 'Crear Campaña'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PROBAR ENVÍO PREVIO */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
              <h4 className="font-black text-white uppercase italic tracking-wider">Enviar Vista Previa</h4>
              <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTestSend} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Canal de Prueba</label>
                <select
                  value={testSendForm.canal}
                  onChange={(e) => setTestSendForm(prev => ({ ...prev, canal: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="APP">Notificación Interna (Prueba UserId)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Destinatario de Prueba</label>
                <input
                  type="text"
                  required
                  value={testSendForm.destinatario}
                  onChange={(e) => setTestSendForm(prev => ({ ...prev, destinatario: e.target.value }))}
                  placeholder={testSendForm.canal === 'WHATSAPP' ? 'Escribe número con código (ej: +593987654321)' : (testSendForm.canal === 'EMAIL' ? 'correo@ejemplo.com' : 'ID del usuario de pruebas')}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all mt-4"
              >
                {submitting ? 'Enviando...' : 'Enviar Mensaje de Prueba'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: NUEVA PLANTILLA */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
              <h4 className="font-black text-white uppercase italic tracking-wider">Crear Plantilla de Comunicación</h4>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Nombre de la Plantilla</label>
                <input
                  type="text"
                  required
                  value={templateForm.nombre}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Plantilla de Bienvenida"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Descripción Corta</label>
                <input
                  type="text"
                  value={templateForm.descripcion}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Ej: Para nuevos negocios que ingresan a Citiox"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Título del Mensaje</label>
                  <input
                    type="text"
                    required
                    value={templateForm.titulo}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Ej: Bienvenido a Citiox, {{nombre}}"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Tipo de Contenido</label>
                  <select
                    value={templateForm.tipo}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                  >
                    <option value="NOTICIA">Noticia / Novedad</option>
                    <option value="PROMO">Promoción / Marketing</option>
                    <option value="MANTENIMIENTO">Mantenimiento</option>
                    <option value="SISTEMA">Alerta del Sistema</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">
                  Contenido (Soporta variables {"{{nombre}}"}, {"{{negocio}}"})
                </label>
                <textarea
                  required
                  value={templateForm.contenido}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, contenido: e.target.value }))}
                  rows={5}
                  placeholder="Escribe el cuerpo de la plantilla..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all mt-4"
              >
                {submitting ? 'Guardando...' : 'Crear Plantilla'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: NUEVA VERSIÓN CHANGELOG */}
      {showChangelogModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
              <h4 className="font-black text-white uppercase italic tracking-wider">Publicar Novedades (Changelog)</h4>
              <button onClick={() => setShowChangelogModal(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChangelog} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Versión</label>
                  <input
                    type="text"
                    required
                    value={changelogForm.version}
                    onChange={(e) => setChangelogForm(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="v2.5"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Título de la Versión</label>
                  <input
                    type="text"
                    required
                    value={changelogForm.titulo}
                    onChange={(e) => setChangelogForm(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Módulo de fidelización y mejoras"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Descripción General (Opcional)</label>
                <input
                  type="text"
                  value={changelogForm.descripcion}
                  onChange={(e) => setChangelogForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Detalles de la actualización..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Cambios realizados</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={changelogForm.nuevoCambio}
                    onChange={(e) => setChangelogForm(prev => ({ ...prev, nuevoCambio: e.target.value }))}
                    placeholder="Ej: ✓ Mejoras en reservas"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!changelogForm.nuevoCambio.trim()) return;
                      setChangelogForm(prev => ({
                        ...prev,
                        cambios: [...prev.cambios, prev.nuevoCambio.trim()],
                        nuevoCambio: '',
                      }));
                    }}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                  >
                    Agregar
                  </button>
                </div>
                <ul className="mt-3 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                  {changelogForm.cambios.map((c, idx) => (
                    <li key={idx} className="text-xs text-slate-400 flex items-center justify-between p-2 bg-slate-950 rounded-xl border border-slate-850">
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() => setChangelogForm(prev => ({ ...prev, cambios: prev.cambios.filter((_, i) => i !== idx) }))}
                        className="text-rose-400 hover:text-rose-300 font-bold"
                      >
                        x
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all mt-4"
              >
                {submitting ? 'Publicando...' : 'Publicar Versión'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: NUEVO RECURSO AYUDA */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
              <h4 className="font-black text-white uppercase italic tracking-wider">Crear Recurso en Centro de Ayuda</h4>
              <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHelp} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Título</label>
                <input
                  type="text"
                  required
                  value={helpForm.titulo}
                  onChange={(e) => setHelpForm(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ej: Cómo configurar el webhook de WhatsApp"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Tipo de Recurso</label>
                  <select
                    value={helpForm.tipo}
                    onChange={(e) => setHelpForm(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                  >
                    <option value="TUTORIAL">Tutorial</option>
                    <option value="MANUAL">Manual</option>
                    <option value="FAQ">FAQ</option>
                    <option value="DOC">Documentación</option>
                    <option value="RECURSO">Recurso descargable</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Categoría</label>
                  <select
                    value={helpForm.categoria}
                    onChange={(e) => setHelpForm(prev => ({ ...prev, categoria: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                  >
                    <option value="Reservas">Reservas</option>
                    <option value="Pagos">Pagos</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Configuracion">Configuración</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Enlace Externo (Opcional)</label>
                <input
                  type="text"
                  value={helpForm.urlRecurso}
                  onChange={(e) => setHelpForm(prev => ({ ...prev, urlRecurso: e.target.value }))}
                  placeholder="Ej: URL del video o del PDF en biblioteca"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Contenido / Guía paso a paso</label>
                <textarea
                  required
                  value={helpForm.contenido}
                  onChange={(e) => setHelpForm(prev => ({ ...prev, contenido: e.target.value }))}
                  rows={5}
                  placeholder="Detalla las instrucciones o la guía..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all mt-4"
              >
                {submitting ? 'Guardando...' : 'Crear Recurso'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: AGREGAR MEDIA */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
              <h4 className="font-black text-white uppercase italic tracking-wider">Agregar Recurso Multimedia</h4>
              <button onClick={() => setShowMediaModal(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMedia} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Nombre del Archivo</label>
                <input
                  type="text"
                  required
                  value={mediaForm.nombre}
                  onChange={(e) => setMediaForm(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Logo Citiox Vectorial"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">URL del Recurso</label>
                <input
                  type="text"
                  required
                  value={mediaForm.url}
                  onChange={(e) => setMediaForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="URL pública del recurso"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Tipo</label>
                  <select
                    value={mediaForm.tipo}
                    onChange={(e) => setMediaForm(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                  >
                    <option value="IMAGE">Imagen</option>
                    <option value="VIDEO">Video</option>
                    <option value="PDF">PDF</option>
                    <option value="LOGO">Logo</option>
                    <option value="ICON">Icono</option>
                    <option value="FILE">Archivo General</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Tamaño Bytes (Opcional)</label>
                  <input
                    type="number"
                    value={mediaForm.sizeBytes || ''}
                    onChange={(e) => setMediaForm(prev => ({ ...prev, sizeBytes: Number(e.target.value) }))}
                    placeholder="Ej: 1048576"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all mt-4"
              >
                {submitting ? 'Añadiendo...' : 'Añadir a la Biblioteca'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
