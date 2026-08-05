'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Briefcase, 
  Dribbble, 
  Sparkles, 
  ShoppingBag, 
  Shirt, 
  Utensils, 
  Calendar,
  Layers,
  Zap,
  Palette,
  Layout,
  Tag,
  Sliders,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  Info
} from 'lucide-react';

const CAPABILITIES_LIST = [
  { id: 'booking', name: 'Booking & Agenda', desc: 'Reserva de franjas y recursos' },
  { id: 'orders', name: 'Order & Pedidos', desc: 'Catálogo, carritos y comandas' },
  { id: 'service', name: 'Service Cycle', desc: 'Ciclo de trabajo físico (Recibir -> Lavar -> Entregar)' },
  { id: 'crm', name: 'CRM & Clientes', desc: 'Ficha de clientes e historial' },
  { id: 'inventory', name: 'Inventario', desc: 'Control de stock y insumos' },
  { id: 'loyalty', name: 'Fidelización & Puntos', desc: 'Premios, cashback y niveles' },
  { id: 'academy', name: 'Academia & Cursos', desc: 'Gestión de alumnos y asistencias' },
  { id: 'memberships', name: 'Membresías & Pases', desc: 'Acceso por suscripciones recurrentes' },
  { id: 'giftcards', name: 'Tarjetas de Regalo', desc: 'Gift cards y cupones' },
  { id: 'ai_assistant', name: 'Asistente IA', desc: 'Respuestas automáticas de IA' },
  { id: 'whatsapp', name: 'Notificaciones WhatsApp', desc: 'Recordatorios e interacciones por WhatsApp' }
];

const LANDING_THEMES = [
  { id: 'modern', name: 'Landing Modern (Estándar)' },
  { id: 'sports-v2', name: 'Landing Sports Club v2 (Canchas)' },
  { id: 'laundry-minimal', name: 'Landing Minimal (Lavado & Servicios)' },
  { id: 'restaurant-modern', name: 'Landing Gastro (Restaurante)' },
  { id: 'ecommerce-modern', name: 'Landing E-commerce (Tienda)' }
];

const ADMIN_THEMES = [
  { id: 'sidebar', name: 'Sidebar Standard (Recomendado)' },
  { id: 'sports-admin', name: 'Sports Admin Grid (Canchas)' },
  { id: 'service-kanban', name: 'Service Kanban Board (Órdenes)' },
  { id: 'restaurant-admin', name: 'KDS Kitchen Monitor (Cocina)' },
  { id: 'compact', name: 'Compact Dashboard' }
];

export default function EditBusinessTypePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [tipo, setTipo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'states' | 'capabilities' | 'themes' | 'profiles' | 'labels'>('general');
  const [toast, setToast] = useState<string | null>(null);

  // Estados locales para formularios
  const [generalForm, setGeneralForm] = useState<any>({});
  const [statesList, setStatesList] = useState<any[]>([]);
  const [capsList, setCapsList] = useState<string[]>([]);
  const [profilesList, setProfilesList] = useState<any[]>([]);
  const [labelsForm, setLabelsForm] = useState({ recurso: '', reserva: '', cliente: '', agenda: '' });

  // Nuevo estado para agregar
  const [newState, setNewState] = useState({ name: '', color: '#3B82F6', icon: 'Circle', tipo: 'NORMAL' });
  const [newProfile, setNewProfile] = useState({ name: '', description: '' });

  const fetchTipo = async () => {
    try {
      const res = await fetch(`/api/superadmin/tipos-negocio/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTipo(data);
        setGeneralForm({
          name: data.name || '',
          description: data.description || '',
          icon: data.icon || 'Briefcase',
          color: data.color || '#6366f1',
          resourceType: data.resourceType || 'HUMAN',
          landingThemeId: data.landingThemeId || 'modern',
          adminThemeId: data.adminThemeId || 'sidebar'
        });
        setStatesList(data.states || []);
        setCapsList(data.capabilities?.map((c: any) => c.capability) || []);
        setProfilesList(data.profiles || []);
        setLabelsForm(data.uiLabels || { recurso: 'Recurso', reserva: 'Reserva', cliente: 'Cliente', agenda: 'Agenda' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchTipo();
  }, [id]);

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Guardar General
  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/tipos-negocio/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generalForm)
      });
      if (res.ok) {
        showNotification('Información general guardada');
        fetchTipo();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Guardar Estados
  const handleSaveStates = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/tipos-negocio/${id}/states`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ states: statesList })
      });
      if (res.ok) {
        showNotification('Máquina de estados actualizada');
        fetchTipo();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Guardar Capabilities
  const handleSaveCaps = async (updatedCaps: string[]) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/tipos-negocio/${id}/capabilities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capabilities: updatedCaps })
      });
      if (res.ok) {
        showNotification('Capabilities actualizadas');
        fetchTipo();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleCapability = (capId: string) => {
    const exists = capsList.includes(capId);
    const updated = exists ? capsList.filter(c => c !== capId) : [...capsList, capId];
    setCapsList(updated);
    handleSaveCaps(updated);
  };

  // Agregar Estado
  const handleAddState = () => {
    if (!newState.name.trim()) return;
    const slug = newState.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    setStatesList(prev => [
      ...prev,
      {
        name: newState.name,
        slug,
        color: newState.color,
        icon: newState.icon,
        tipo: newState.tipo,
        sortOrder: prev.length + 1
      }
    ]);
    setNewState({ name: '', color: '#3B82F6', icon: 'Circle', tipo: 'NORMAL' });
  };

  // Eliminar Estado
  const handleRemoveState = (index: number) => {
    setStatesList(prev => prev.filter((_, i) => i !== index));
  };

  // Reordenar Estado
  const handleMoveState = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= statesList.length) return;
    const copy = [...statesList];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setStatesList(copy);
  };

  // Crear Perfil
  const handleAddProfile = async () => {
    if (!newProfile.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/tipos-negocio/${id}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile)
      });
      if (res.ok) {
        setNewProfile({ name: '', description: '' });
        showNotification('Perfil comercial creado');
        fetchTipo();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Guardar Labels
  const handleSaveLabels = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/tipos-negocio/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...generalForm, uiLabels: labelsForm })
      });
      if (res.ok) {
        showNotification('Etiquetas de interfaz guardadas');
        fetchTipo();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Deducir Core Engines activos
  const activeEngines = [];
  if (capsList.includes('booking')) activeEngines.push('BookingEngine');
  if (capsList.includes('orders')) activeEngines.push('OrderEngine');
  if (capsList.includes('service')) activeEngines.push('ServiceEngine');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 bg-emerald-500 text-slate-950 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl z-50 animate-bounce">
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/superadmin/tipos-negocio" className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-2xl transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">{tipo?.name}</h1>
              <span className="text-[10px] font-mono font-black uppercase px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                {tipo?.slug}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Configuración y gobernanza de la vertical de negocio</p>
          </div>
        </div>

        {/* Engine Inference Indicator */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl text-xs">
          <span className="text-[10px] font-black uppercase text-slate-400">Core Engines Deducidos:</span>
          {activeEngines.map(eng => (
            <span key={eng} className="text-[10px] font-mono font-black bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30">
              ⚙️ {eng}
            </span>
          ))}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        {[
          { id: 'general', name: 'General & Core', icon: Briefcase },
          { id: 'states', name: 'State Machine (Estados)', icon: Layers },
          { id: 'capabilities', name: 'Capabilities Checklist', icon: Zap },
          { id: 'themes', name: 'Temas Visuales', icon: Palette },
          { id: 'profiles', name: 'Perfiles Comerciales', icon: Tag },
          { id: 'labels', name: 'UI Labels & Texto', icon: Sliders }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                isActive 
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800'
              }`}
            >
              <Icon size={16} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* TAB 1: GENERAL */}
      {activeTab === 'general' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6 max-w-3xl">
          <h2 className="text-lg font-black text-white uppercase italic">Información General del Business Type</h2>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Nombre</label>
              <input 
                type="text"
                value={generalForm.name}
                onChange={e => setGeneralForm({ ...generalForm, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Descripción</label>
              <textarea 
                rows={3}
                value={generalForm.description}
                onChange={e => setGeneralForm({ ...generalForm, description: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Tipo de Recurso (OperableResource)</label>
                <select
                  value={generalForm.resourceType}
                  onChange={e => setGeneralForm({ ...generalForm, resourceType: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                >
                  <option value="HUMAN">HUMAN (Profesional)</option>
                  <option value="INFRASTRUCTURE">INFRASTRUCTURE (Cancha/Sala/Mesa)</option>
                  <option value="EQUIPMENT">EQUIPMENT (Equipo/Vehículo)</option>
                  <option value="PHYSICAL_ITEM">PHYSICAL_ITEM (Prenda/Calzado)</option>
                  <option value="NONE">NONE (Sin recurso asignable)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Color Identificador</label>
                <input 
                  type="color"
                  value={generalForm.color}
                  onChange={e => setGeneralForm({ ...generalForm, color: e.target.value })}
                  className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSaveGeneral}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Guardar Cambios General
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: STATE MACHINE */}
      {activeTab === 'states' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white uppercase italic">Constructor de Máquina de Estados (State Machine)</h2>
                <p className="text-xs text-slate-400">Define la secuencia ordenada del flujo operativo. Los engines ejecutan sobre estos estados sin código hardcodeado.</p>
              </div>
              <button
                onClick={handleSaveStates}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Guardar Flujo de Estados
              </button>
            </div>

            {/* List of States */}
            <div className="space-y-3">
              {statesList.map((st, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-xs font-mono font-black text-slate-400 w-6">{idx + 1}</span>
                  
                  <input 
                    type="color" 
                    value={st.color || '#3B82F6'} 
                    onChange={e => {
                      const copy = [...statesList];
                      copy[idx].color = e.target.value;
                      setStatesList(copy);
                    }}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />

                  <input 
                    type="text" 
                    value={st.name} 
                    onChange={e => {
                      const copy = [...statesList];
                      copy[idx].name = e.target.value;
                      copy[idx].slug = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_');
                      setStatesList(copy);
                    }}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white"
                  />

                  <select
                    value={st.tipo || 'NORMAL'}
                    onChange={e => {
                      const copy = [...statesList];
                      copy[idx].tipo = e.target.value;
                      setStatesList(copy);
                    }}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300"
                  >
                    <option value="INICIAL">🟢 INICIAL</option>
                    <option value="NORMAL">🔵 NORMAL</option>
                    <option value="FINAL">⚫ FINAL</option>
                    <option value="CANCELACION">🔴 CANCELACIÓN</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <button onClick={() => handleMoveState(idx, 'up')} className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg">
                      <ChevronUp size={16} />
                    </button>
                    <button onClick={() => handleMoveState(idx, 'down')} className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg">
                      <ChevronDown size={16} />
                    </button>
                    <button onClick={() => handleRemoveState(idx)} className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Form to Add State */}
            <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
              <input 
                type="text" 
                placeholder="Nombre del nuevo estado..." 
                value={newState.name}
                onChange={e => setNewState({ ...newState, name: e.target.value })}
                className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
              />
              <select
                value={newState.tipo}
                onChange={e => setNewState({ ...newState, tipo: e.target.value })}
                className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
              >
                <option value="INICIAL">INICIAL</option>
                <option value="NORMAL">NORMAL</option>
                <option value="FINAL">FINAL</option>
                <option value="CANCELACION">CANCELACIÓN</option>
              </select>
              <button
                onClick={handleAddState}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Plus size={16} />
                Agregar Estado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CAPABILITIES */}
      {activeTab === 'capabilities' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6 max-w-4xl">
          <div>
            <h2 className="text-lg font-black text-white uppercase italic">Capabilities Activas</h2>
            <p className="text-xs text-slate-400">Selecciona las capacidades técnicas que habilita esta vertical de negocio. Activan vistas y deducen el Core Engine sin código redundante.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CAPABILITIES_LIST.map(cap => {
              const isChecked = capsList.includes(cap.id);
              return (
                <div 
                  key={cap.id}
                  onClick={() => toggleCapability(cap.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                    isChecked 
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                    isChecked ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-700'
                  }`}>
                    {isChecked && <CheckCircle2 size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wide text-white">{cap.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{cap.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: TEMAS VISUALES */}
      {activeTab === 'themes' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6 max-w-3xl">
          <div>
            <h2 className="text-lg font-black text-white uppercase italic">Temas Visuales (Desacoplados)</h2>
            <p className="text-xs text-slate-400">Asigna la apariencia estética del Landing y del Dashboard sin alterar la lógica de negocio.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Landing Theme (Página Pública)</label>
              <div className="grid grid-cols-1 gap-3">
                {LANDING_THEMES.map(theme => (
                  <div 
                    key={theme.id}
                    onClick={() => setGeneralForm({ ...generalForm, landingThemeId: theme.id })}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      generalForm.landingThemeId === theme.id 
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold">{theme.name}</span>
                    {generalForm.landingThemeId === theme.id && <CheckCircle2 size={18} className="text-emerald-400" />}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Admin Theme (Dashboard)</label>
              <div className="grid grid-cols-1 gap-3">
                {ADMIN_THEMES.map(theme => (
                  <div 
                    key={theme.id}
                    onClick={() => setGeneralForm({ ...generalForm, adminThemeId: theme.id })}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      generalForm.adminThemeId === theme.id 
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold">{theme.name}</span>
                    {generalForm.adminThemeId === theme.id && <CheckCircle2 size={18} className="text-emerald-400" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSaveGeneral}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Guardar Temas Visuales
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PERFILES COMERCIALES */}
      {activeTab === 'profiles' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6 max-w-4xl">
          <div>
            <h2 className="text-lg font-black text-white uppercase italic">Perfiles Comerciales (Sub-Rubros)</h2>
            <p className="text-xs text-slate-400">Especialidades comerciales disponibles dentro de esta vertical para rápida selección en el Wizard.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profilesList.map(prof => (
              <div key={prof.id} className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white">{prof.name}</h4>
                  <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-2 py-0.5 rounded">ID: {prof.id.slice(0, 8)}</span>
                </div>
                <p className="text-xs text-slate-400">{prof.description || 'Sin descripción'}</p>
              </div>
            ))}
          </div>

          {/* Form to Add Profile */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-400">Agregar Nuevo Perfil Comercial</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Nombre (Ej: Club de Tenis)" 
                value={newProfile.name}
                onChange={e => setNewProfile({ ...newProfile, name: e.target.value })}
                className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
              />
              <input 
                type="text" 
                placeholder="Descripción corta..." 
                value={newProfile.description}
                onChange={e => setNewProfile({ ...newProfile, description: e.target.value })}
                className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAddProfile}
                disabled={saving}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Plus size={16} />
                Agregar Perfil Comercial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: UI LABELS */}
      {activeTab === 'labels' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6 max-w-3xl">
          <div>
            <h2 className="text-lg font-black text-white uppercase italic">UI Labels (Vocabulario de la Interfaz)</h2>
            <p className="text-xs text-slate-400">Personaliza cómo se nombran las entidades principales en la interfaz del cliente y del administrador.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Nombre de Recurso</label>
              <input 
                type="text" 
                placeholder="Ej: Cancha / Profesional / Mesa"
                value={labelsForm.recurso}
                onChange={e => setLabelsForm({ ...labelsForm, recurso: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Nombre de Reserva / Ticket</label>
              <input 
                type="text" 
                placeholder="Ej: Reserva / Cita / Orden"
                value={labelsForm.reserva}
                onChange={e => setLabelsForm({ ...labelsForm, reserva: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Nombre de Cliente</label>
              <input 
                type="text" 
                placeholder="Ej: Jugador / Paciente / Cliente"
                value={labelsForm.cliente}
                onChange={e => setLabelsForm({ ...labelsForm, cliente: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Nombre de Vista Admin</label>
              <input 
                type="text" 
                placeholder="Ej: Tablero de Canchas / Agenda"
                value={labelsForm.agenda}
                onChange={e => setLabelsForm({ ...labelsForm, agenda: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSaveLabels}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Guardar Vocabulario UI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
