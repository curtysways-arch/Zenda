'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
    Award, 
    Sparkles, 
    TrendingUp, 
    Users, 
    Plus, 
    CheckCircle2, 
    Zap,
    Download,
    Trophy,
    RefreshCw
} from 'lucide-react';
import { AlertCircle } from 'lucide-react';

export default function QuestDashboard() {
    const { data: session } = useSession();
    const [stats, setStats] = useState<any>(null);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        triggerEvent: 'BOOKING_COMPLETED',
        cantidadMeta: 1,
        puntosRecompensa: 100,
        color: '#ec4899',
        icono: 'Award'
    });

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMsg({ text, type });
        setTimeout(() => setToastMsg(null), 4000);
    };

    const handleCreateCustomQuest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombre.trim()) {
            showToast('El nombre de la misión es requerido', 'error');
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch('/api/admin/misiones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customQuest: {
                        nombre: formData.nombre,
                        descripcion: formData.descripcion,
                        icono: formData.icono,
                        color: formData.color,
                        triggerEvent: formData.triggerEvent,
                        cantidadMeta: Number(formData.cantidadMeta),
                        validacionTipo: 'AUTOMATICO',
                        acciones: [
                            { action: 'ADD_POINTS', value: Number(formData.puntosRecompensa) }
                        ],
                        campaignName: 'Misiones del Negocio'
                    }
                })
            });
            const data = await res.json();
            
            if (data.success) {
                showToast('Misión creada con éxito', 'success');
                setIsModalOpen(false);
                setFormData({
                    nombre: '',
                    descripcion: '',
                    triggerEvent: 'BOOKING_COMPLETED',
                    cantidadMeta: 1,
                    puntosRecompensa: 100,
                    color: '#ec4899',
                    icono: 'Award'
                });
                fetchData();
            } else {
                showToast(data.error || 'Error al crear la misión', 'error');
            }
        } catch (error) {
            console.error('Error creating custom quest:', error);
            showToast('Error de conexión', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [misionesRes, templatesRes] = await Promise.all([
                fetch('/api/admin/misiones'),
                fetch('/api/admin/misiones/templates')
            ]);
            
            const misionesData = await misionesRes.json();
            const templatesData = await templatesRes.json();

            if (misionesData.success) {
                setStats(misionesData.stats);
                setCampaigns(misionesData.campaigns);
            }
            if (templatesData.success) {
                setTemplates(templatesData.templates);
            }
        } catch (error) {
            console.error('Error fetching quests:', error);
            showToast('Error al cargar datos de misiones', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInstallTemplate = async (templateId: string) => {
        try {
            setInstalling(templateId);
            const res = await fetch('/api/admin/misiones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId })
            });
            const data = await res.json();
            
            if (data.success) {
                showToast(data.message || 'Plantilla instalada con éxito', 'success');
                fetchData(); // Recargar datos
            } else {
                showToast(data.error || 'Error al instalar plantilla', 'error');
            }
        } catch (error) {
            console.error('Error installing template:', error);
            showToast('Error de conexión', 'error');
        } finally {
            setInstalling(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <RefreshCw className="animate-spin text-slate-400" size={24} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                        <Trophy className="text-fuchsia-500" /> Motor de Misiones
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Gamifica la experiencia de tus clientes y aumenta la retención (Growth Engine).</p>
                </div>
            </div>

            {/* 1. MÉTRICAS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Participantes</p>
                        <h4 className="text-2xl font-black text-slate-800">{stats?.totalParticipantes || 0}</h4>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Zap size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">En Progreso</p>
                        <h4 className="text-2xl font-black text-slate-800">{stats?.enProgreso || 0}</h4>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completadas</p>
                        <h4 className="text-2xl font-black text-slate-800">{stats?.completadas || 0}</h4>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-fuchsia-50 text-fuchsia-600 rounded-xl">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aumento Est. ROI</p>
                        <h4 className="text-2xl font-black text-slate-800">+{stats?.roiEstimado || 0}%</h4>
                    </div>
                </div>
            </div>

            {/* 2. MARKETPLACE DE PLANTILLAS */}
            <div>
                <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Sparkles className="text-amber-500" size={20} /> Marketplace de Campañas
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {templates.map((tpl) => {
                        const isInstalled = campaigns.some(c => c.nombre === `Campaña ${tpl.nombre}`);
                        return (
                            <div key={tpl.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg transition-shadow">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div 
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"
                                            style={{ backgroundColor: `${tpl.color}15`, color: tpl.color }}
                                        >
                                            <Award size={24} />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                            tpl.difficulty === 'FACIL' ? 'bg-green-100 text-green-700' : 
                                            tpl.difficulty === 'MEDIA' ? 'bg-amber-100 text-amber-700' : 
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {tpl.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="font-black text-slate-800 text-lg mb-2">{tpl.nombre}</h3>
                                    <p className="text-sm text-slate-500 mb-4">{tpl.descripcion}</p>
                                    <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                            <TrendingUp size={14} className="text-green-500" /> {tpl.benefits}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleInstallTemplate(tpl.id)}
                                    disabled={isInstalled || installing === tpl.id}
                                    className={`w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                        isInstalled 
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                            : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                                    }`}
                                >
                                    {installing === tpl.id ? (
                                        <><RefreshCw size={18} className="animate-spin" /> Instalando...</>
                                    ) : isInstalled ? (
                                        <><CheckCircle2 size={18} /> Instalada</>
                                    ) : (
                                        <><Download size={18} /> Instalar (1-clic)</>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. MIS MISIONES ACTIVAS */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-black text-slate-800">Mis Campañas Activas</h2>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                        <Plus size={16} /> Crear Personalizada
                    </button>
                </div>
                
                {campaigns.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-12 text-center">
                        <Award className="mx-auto text-slate-300 mb-3" size={48} />
                        <h3 className="text-lg font-black text-slate-700 mb-1">Aún no tienes campañas</h3>
                        <p className="text-sm text-slate-500">Instala una plantilla del marketplace para comenzar.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {campaigns.map(camp => (
                            <div key={camp.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-800 text-lg">{camp.nombre}</h3>
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                                        Activa
                                    </span>
                                </div>
                                <div className="grid gap-3">
                                    {camp.Quests?.map((q: any) => (
                                        <div key={q.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                    style={{ backgroundColor: `${q.color}20`, color: q.color }}
                                                >
                                                    <Award size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-800">{q.nombre}</h4>
                                                    <p className="text-xs text-slate-500">Meta: {q.cantidadMeta} | Tipo: {q.validacionTipo}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Trigger</span>
                                                <p className="text-xs font-bold text-slate-700">{q.triggerEvent}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: Crear Misión Personalizada */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col gap-6 animate-in zoom-in-95 duration-200">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                <Plus className="text-fuchsia-500 animate-pulse" /> Crear Misión
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Personalizada desde Cero</p>
                        </div>

                        <form onSubmit={handleCreateCustomQuest} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nombre de la Misión</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Invita un Amigo a Masaje"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-fuchsia-400 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Descripción</label>
                                <textarea
                                    placeholder="Ej: Tus amigos deben agendar su primera cita usando tu código."
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-fuchsia-400 transition-colors h-20 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Evento Detonador (Trigger)</label>
                                    <select
                                        value={formData.triggerEvent}
                                        onChange={e => setFormData({ ...formData, triggerEvent: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-fuchsia-400 transition-colors"
                                    >
                                        <option value="BOOKING_COMPLETED">Cita Completada</option>
                                        <option value="USER_REGISTERED">Registro de Usuario</option>
                                        <option value="REFERRAL_COMPLETED">Referido Exitoso</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Meta (Repeticiones)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={formData.cantidadMeta}
                                        onChange={e => setFormData({ ...formData, cantidadMeta: Math.max(1, Number(e.target.value)) })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-fuchsia-400 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Recompensa (Puntos)</label>
                                    <input
                                        type="number"
                                        min="10"
                                        required
                                        value={formData.puntosRecompensa}
                                        onChange={e => setFormData({ ...formData, puntosRecompensa: Math.max(10, Number(e.target.value)) })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-fuchsia-400 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Color Temático</label>
                                    <div className="flex gap-2 items-center h-[46px]">
                                        {['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'].map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color: c })}
                                                className={`size-6 rounded-full border-2 transition-all ${
                                                    formData.color === c ? 'border-slate-850 scale-110 shadow-md' : 'border-transparent opacity-60'
                                                }`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest border-0 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest border-0 transition-all flex items-center justify-center gap-2"
                                >
                                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : 'Crear Misión'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Component */}
            {toastMsg && (
                <div className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-xl transition-all duration-300 transform scale-100 ${
                    toastMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                    {toastMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="text-xs font-black uppercase tracking-widest">{toastMsg.text}</span>
                </div>
            )}
        </div>
    );
}
