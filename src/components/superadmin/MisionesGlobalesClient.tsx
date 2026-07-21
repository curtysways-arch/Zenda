'use client';

import { useState } from 'react';
import { 
    Trophy, 
    Plus, 
    Trash2, 
    Edit2, 
    CheckCircle2, 
    X, 
    Save, 
    Sparkles, 
    Zap, 
    Users, 
    Calendar,
    Briefcase,
    Crown,
    Link,
    Smartphone,
    UserCheck,
    Coins,
    Award
} from 'lucide-react';
import { GlobalMissionType, GlobalRewardType } from '@prisma/client';

interface GlobalMission {
    id: string;
    titulo: string;
    descripcion: string;
    tipo: GlobalMissionType;
    objetivo: number;
    recompensaTipo: GlobalRewardType;
    recompensaValor: any;
    fechaInicio: string | null;
    fechaFin: string | null;
    activa: boolean;
    prioridad: number;
    icono: string | null;
    color: string | null;
}

export default function MisionesGlobalesClient({ initialMissions }: { initialMissions: GlobalMission[] }) {
    const [missions, setMissions] = useState<GlobalMission[]>(initialMissions);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMission, setEditingMission] = useState<GlobalMission | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Form states
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [tipo, setTipo] = useState<GlobalMissionType>(GlobalMissionType.COMPLETED_RESERVATIONS);
    const [objetivo, setObjetivo] = useState(10);
    const [recompensaTipo, setRecompensaTipo] = useState<GlobalRewardType>(GlobalRewardType.FREE_DAYS);
    const [recompensaValorInput, setRecompensaValorInput] = useState(''); // e.g. "15" for days, "100" for diamonds, JSON string for custom
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [activa, setActiva] = useState(true);
    const [prioridad, setPrioridad] = useState(0);
    const [icono, setIcono] = useState('Trophy');
    const [color, setColor] = useState('#3b82f6');

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleOpenCreate = () => {
        setEditingMission(null);
        setTitulo('');
        setDescripcion('');
        setTipo(GlobalMissionType.COMPLETED_RESERVATIONS);
        setObjetivo(10);
        setRecompensaTipo(GlobalRewardType.FREE_DAYS);
        setRecompensaValorInput('15');
        setFechaInicio('');
        setFechaFin('');
        setActiva(true);
        setPrioridad(0);
        setIcono('Trophy');
        setColor('#3b82f6');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (m: GlobalMission) => {
        setEditingMission(m);
        setTitulo(m.titulo);
        setDescripcion(m.descripcion);
        setTipo(m.tipo);
        setObjetivo(m.objetivo);
        setRecompensaTipo(m.recompensaTipo);
        
        // Parse valor to input string
        let valString = '';
        if (m.recompensaValor) {
            if (m.recompensaTipo === GlobalRewardType.FREE_DAYS) valString = String(m.recompensaValor.dias || '');
            else if (m.recompensaTipo === GlobalRewardType.DIAMONDS) valString = String(m.recompensaValor.diamantes || '');
            else if (m.recompensaTipo === GlobalRewardType.CREDITS) valString = String(m.recompensaValor.creditos || '');
            else if (m.recompensaTipo === GlobalRewardType.BADGE) valString = String(m.recompensaValor.badge || '');
            else if (m.recompensaTipo === GlobalRewardType.UNLOCK_FEATURE) valString = String(m.recompensaValor.feature || '');
            else valString = JSON.stringify(m.recompensaValor);
        }
        setRecompensaValorInput(valString);

        setFechaInicio(m.fechaInicio ? m.fechaInicio.split('T')[0] : '');
        setFechaFin(m.fechaFin ? m.fechaFin.split('T')[0] : '');
        setActiva(m.activa);
        setPrioridad(m.prioridad);
        setIcono(m.icono || 'Trophy');
        setColor(m.color || '#3b82f6');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Build reward value JSON
            let recompensaValor: any = {};
            if (recompensaTipo === GlobalRewardType.FREE_DAYS) {
                recompensaValor = { dias: parseInt(recompensaValorInput) || 0 };
            } else if (recompensaTipo === GlobalRewardType.DIAMONDS) {
                recompensaValor = { diamantes: parseInt(recompensaValorInput) || 0 };
            } else if (recompensaTipo === GlobalRewardType.CREDITS) {
                recompensaValor = { creditos: parseFloat(recompensaValorInput) || 0 };
            } else if (recompensaTipo === GlobalRewardType.BADGE) {
                recompensaValor = { badge: recompensaValorInput };
            } else if (recompensaTipo === GlobalRewardType.UNLOCK_FEATURE) {
                recompensaValor = { feature: recompensaValorInput };
            } else {
                try {
                    recompensaValor = recompensaValorInput ? JSON.parse(recompensaValorInput) : {};
                } catch {
                    recompensaValor = { valor: recompensaValorInput };
                }
            }

            const payload = {
                titulo,
                descripcion,
                tipo,
                objetivo: parseInt(String(objetivo)) || 1,
                recompensaTipo,
                recompensaValor,
                fechaInicio: fechaInicio ? new Date(fechaInicio).toISOString() : null,
                fechaFin: fechaFin ? new Date(fechaFin).toISOString() : null,
                activa,
                prioridad: parseInt(String(prioridad)) || 0,
                icono,
                color
            };

            const url = editingMission 
                ? `/api/superadmin/misiones-globales/${editingMission.id}`
                : '/api/superadmin/misiones-globales';

            const method = editingMission ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                showToast(editingMission ? 'Misión actualizada' : 'Misión creada con éxito');
                
                // Refresh list
                const resList = await fetch('/api/superadmin/misiones-globales');
                const listData = await resList.json();
                if (listData.success) {
                    setMissions(listData.missions);
                }
                
                setIsModalOpen(false);
            } else {
                showToast(data.error || 'Error procesando la solicitud', 'error');
            }
        } catch (err: any) {
            showToast(err.message || 'Error de conexión', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta misión global de Citiox? Todos los progresos de los negocios serán eliminados.')) return;

        try {
            const res = await fetch(`/api/superadmin/misiones-globales/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                showToast('Misión eliminada correctamente');
                setMissions(missions.filter(m => m.id !== id));
            } else {
                showToast('Error al eliminar misión', 'error');
            }
        } catch (err: any) {
            showToast('Error al conectar con la API', 'error');
        }
    };

    const handleToggleActive = async (m: GlobalMission) => {
        try {
            const res = await fetch(`/api/superadmin/misiones-globales/${m.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activa: !m.activa })
            });

            if (res.ok) {
                showToast(m.activa ? 'Misión desactivada' : 'Misión activada');
                setMissions(missions.map(x => x.id === m.id ? { ...x, activa: !x.activa } : x));
            } else {
                showToast('Error al actualizar estado', 'error');
            }
        } catch (err) {
            showToast('Error de conexión', 'error');
        }
    };

    // Helper to render lucide icon dynamically
    const renderIcon = (name: string, col: string) => {
        const style = { color: col };
        switch (name) {
            case 'Zap': return <Zap size={20} style={style} />;
            case 'Users': return <Users size={20} style={style} />;
            case 'Calendar': return <Calendar size={20} style={style} />;
            case 'Briefcase': return <Briefcase size={20} style={style} />;
            case 'Crown': return <Crown size={20} style={style} />;
            case 'Link': return <Link size={20} style={style} />;
            case 'Smartphone': return <Smartphone size={20} style={style} />;
            case 'UserCheck': return <UserCheck size={20} style={style} />;
            case 'Coins': return <Coins size={20} style={style} />;
            case 'Award': return <Award size={20} style={style} />;
            default: return <Trophy size={20} style={style} />;
        }
    };

    return (
        <div className="space-y-6">
            {/* TOAST PANEL */}
            {toast && (
                <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl border text-xs font-black transition-all uppercase tracking-widest ${
                    toast.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <X size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Misiones Globales de Citiox</h2>
                    <p className="text-slate-500 mt-1">Configura campañas corporativas oficiales para incentivar la adopción y retención de todos los negocios de la plataforma.</p>
                </div>
                <button 
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                    <Plus size={16} /> Nueva Misión
                </button>
            </div>

            {/* LISTING GRID */}
            {missions.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-16 text-center shadow-sm">
                    <Trophy className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">No hay misiones globales configuradas</h3>
                    <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto mb-6">
                        Comienza agregando retos de plataforma como "Registrar tus primeras 10 reservas" con recompensas automatizadas.
                    </p>
                    <button 
                        onClick={handleOpenCreate}
                        className="px-6 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-250 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                    >
                        Agregar Misión
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {missions.map((m) => {
                        const rewardText = m.recompensaTipo === GlobalRewardType.FREE_DAYS 
                            ? `+${m.recompensaValor?.dias || 0} Días de Plan gratis`
                            : m.recompensaTipo === GlobalRewardType.DIAMONDS
                            ? `+${m.recompensaValor?.diamantes || 0} Diamantes`
                            : m.recompensaTipo === GlobalRewardType.CREDITS
                            ? `+$${m.recompensaValor?.creditos || 0} de Saldo`
                            : m.recompensaTipo === GlobalRewardType.BADGE
                            ? `Insignia: ${m.recompensaValor?.badge || ''}`
                            : m.recompensaTipo === GlobalRewardType.UNLOCK_FEATURE
                            ? `Desbloquea: ${m.recompensaValor?.feature || ''}`
                            : 'Promoción';

                        return (
                            <div key={m.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                                <div className="p-6 border-b border-slate-50 dark:border-white/5 relative overflow-hidden flex-1">
                                    <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500" style={{ backgroundColor: m.color || '#3b82f6' }} />

                                    <div className="relative z-10 flex items-center justify-between mb-4">
                                        <div className="p-3 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-white/5" style={{ backgroundColor: `${m.color}15` }}>
                                            {renderIcon(m.icono || 'Trophy', m.color || '#3b82f6')}
                                        </div>
                                        <div className="flex gap-2">
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${m.activa ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                                {m.activa ? 'Activa' : 'Pausada'}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-base font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tight">{m.titulo}</h3>
                                    <p className="text-[11px] text-slate-400 font-medium line-clamp-3 min-h-[48px] mb-4">{m.descripcion}</p>

                                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <span>Misión</span>
                                            <span className="text-slate-800 dark:text-slate-350">{m.tipo} (Meta: {m.objetivo})</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <span>Premio</span>
                                            <span className="text-indigo-600 dark:text-indigo-400 font-black flex items-center gap-1">
                                                <Sparkles size={12} /> {rewardText}
                                            </span>
                                        </div>
                                        {m.fechaFin && (
                                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                <span>Expiración</span>
                                                <span>{new Date(m.fechaFin).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleToggleActive(m)}
                                            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 font-black text-[9px] uppercase tracking-widest rounded-xl border border-slate-200 dark:border-white/5 cursor-pointer active:scale-95 transition-all"
                                        >
                                            {m.activa ? 'Pausar' : 'Activar'}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleOpenEdit(m)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={15} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(m.id)}
                                            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CREATION/EDITION SLIDE/MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-white/5 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Trophy className="text-emerald-500" /> {editingMission ? 'Editar Misión Global' : 'Nueva Misión Global'}
                            </h3>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* TITULO */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Título</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={titulo}
                                        onChange={(e) => setTitulo(e.target.value)}
                                        placeholder="Ej: Consigue tus primeras 10 reservas"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                                    />
                                </div>

                                {/* DESCRIPCION */}
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Descripción</label>
                                    <textarea 
                                        required
                                        value={descripcion}
                                        onChange={(e) => setDescripcion(e.target.value)}
                                        placeholder="Describe brevemente la misión y los requisitos para completarla."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                                    />
                                </div>

                                {/* TIPO DE MISION */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tipo de Misión</label>
                                    <select 
                                        value={tipo}
                                        onChange={(e) => setTipo(e.target.value as GlobalMissionType)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                                    >
                                        <option value={GlobalMissionType.COMPLETED_RESERVATIONS} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Reservas Completadas</option>
                                        <option value={GlobalMissionType.FIRST_RESERVATIONS} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Primeras Reservas</option>
                                        <option value={GlobalMissionType.CLIENTS_REGISTERED} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Clientes Registrados</option>
                                        <option value={GlobalMissionType.SERVICES_CREATED} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Servicios Creados</option>
                                        <option value={GlobalMissionType.STAFF_CREATED} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Personal Creado</option>
                                        <option value={GlobalMissionType.PROFILE_COMPLETED} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Perfil Completo</option>
                                        <option value={GlobalMissionType.LOYALTY_ENABLED} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Club / Fidelización Activa</option>
                                        <option value={GlobalMissionType.REFERRALS} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Negocios Invitados</option>
                                        <option value={GlobalMissionType.APP_DOWNLOAD} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Descarga de App</option>
                                        <option value={GlobalMissionType.CONSECUTIVE_RESERVATIONS} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Reservas Consecutivas</option>
                                    </select>
                                </div>

                                {/* META / OBJETIVO */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Objetivo (Meta Numérica)</label>
                                    <input 
                                        type="number" 
                                        required
                                        min={1}
                                        value={objetivo}
                                        onChange={(e) => setObjetivo(parseInt(e.target.value) || 1)}
                                        placeholder="Ej: 10"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                                    />
                                </div>

                                {/* TIPO DE RECOMPENSA */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tipo de Recompensa</label>
                                    <select 
                                        value={recompensaTipo}
                                        onChange={(e) => setRecompensaTipo(e.target.value as GlobalRewardType)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                                    >
                                        <option value={GlobalRewardType.FREE_DAYS} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Días Gratis (Suscripción)</option>
                                        <option value={GlobalRewardType.DIAMONDS} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Diamantes Citiox</option>
                                        <option value={GlobalRewardType.CREDITS} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Créditos / Saldo Citiox</option>
                                        <option value={GlobalRewardType.BADGE} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Insignia Especial</option>
                                        <option value={GlobalRewardType.UNLOCK_FEATURE} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Desbloquear Función</option>
                                        <option value={GlobalRewardType.PROMOTION} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Promoción Especial</option>
                                    </select>
                                </div>

                                {/* VALOR DE LA RECOMPENSA */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Valor del Premio</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={recompensaValorInput}
                                        onChange={(e) => setRecompensaValorInput(e.target.value)}
                                        placeholder={
                                            recompensaTipo === GlobalRewardType.FREE_DAYS ? "Ej: 15 (días)"
                                            : recompensaTipo === GlobalRewardType.DIAMONDS ? "Ej: 500 (diamantes)"
                                            : recompensaTipo === GlobalRewardType.CREDITS ? "Ej: 20 (saldo)"
                                            : recompensaTipo === GlobalRewardType.BADGE ? "Ej: Socio Citiox VIP"
                                            : "Ej: Modulo Marketing"
                                        }
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                                    />
                                </div>

                                {/* ICONO */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Icono de la Misión</label>
                                    <select 
                                        value={icono}
                                        onChange={(e) => setIcono(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                                    >
                                        <option value="Trophy" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Trofeo (Trophy)</option>
                                        <option value="Zap" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Rayo (Zap)</option>
                                        <option value="Users" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Usuarios (Users)</option>
                                        <option value="Calendar" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Calendario (Calendar)</option>
                                        <option value="Briefcase" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Maletín (Briefcase)</option>
                                        <option value="Crown" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Corona (Crown)</option>
                                        <option value="Link" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Enlace (Link)</option>
                                        <option value="Smartphone" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Móvil (Smartphone)</option>
                                        <option value="UserCheck" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Verificación (UserCheck)</option>
                                        <option value="Coins" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Monedas (Coins)</option>
                                        <option value="Award" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">Medalla (Award)</option>
                                    </select>
                                </div>

                                {/* COLOR */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Color Temático (Hex / Tailwind)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="color" 
                                            value={color}
                                            onChange={(e) => setColor(e.target.value)}
                                            className="w-12 h-10 p-0 border border-slate-200 dark:border-white/5 rounded-xl cursor-pointer"
                                        />
                                        <input 
                                            type="text" 
                                            required
                                            value={color}
                                            onChange={(e) => setColor(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* PRIORIDAD / ORDEN */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Prioridad de Visualización</label>
                                    <input 
                                        type="number" 
                                        value={prioridad}
                                        onChange={(e) => setPrioridad(parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                                    />
                                </div>

                                {/* FECHAS */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fecha Inicio (Opcional)</label>
                                    <input 
                                        type="date" 
                                        value={fechaInicio}
                                        onChange={(e) => setFechaInicio(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fecha Fin (Opcional)</label>
                                    <input 
                                        type="date" 
                                        value={fechaFin}
                                        onChange={(e) => setFechaFin(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                                    />
                                </div>

                                {/* ACTIVA */}
                                <div className="flex items-center gap-3 pt-4 md:col-span-2">
                                    <input 
                                        type="checkbox" 
                                        id="chk-activa"
                                        checked={activa}
                                        onChange={(e) => setActiva(e.target.checked)}
                                        className="size-4 text-emerald-600 focus:ring-emerald-500 border-slate-350 rounded cursor-pointer"
                                    />
                                    <label htmlFor="chk-activa" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Campaña Activa (Disponible de inmediato)</label>
                                </div>
                            </div>

                            {/* SUBMIT BUTTON */}
                            <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer"
                                >
                                    <Save size={16} /> {submitting ? 'Procesando...' : editingMission ? 'Guardar Cambios' : 'Crear Misión'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
