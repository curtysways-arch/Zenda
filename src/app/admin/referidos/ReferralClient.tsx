'use client';

import { useState, useEffect } from 'react';
import { Gift, Plus, Users, Award, History, ToggleLeft, ToggleRight, Check, Trash2, Edit2, Loader2, Calendar, UserCheck, ShieldAlert, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Staff {
    id: string;
    name: string;
}

export default function ReferralClient({ staffList }: { staffList: Staff[] }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'campaigns' | 'rewards' | 'ranking' | 'history'>('campaigns');
    const [stats, setStats] = useState<any>({
        totalValidos: 0,
        totalPendientes: 0,
        campañasActivas: 0,
        premiosDisponibles: 0,
        premiosCanjeados: 0
    });
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [rewards, setRewards] = useState<any[]>([]);
    const [ranking, setRanking] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');

    // Estado del modal de entrega de premio
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [selectedReward, setSelectedReward] = useState<any>(null);
    const [deliveryStaffId, setDeliveryStaffId] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');

    useEffect(() => {
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (color) setPrimaryColor(color);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, campaignsRes, rewardsRes, historyRes] = await Promise.all([
                fetch('/api/admin/referrals/stats').then(res => res.json()),
                fetch('/api/admin/referrals/campaigns').then(res => res.json()),
                fetch('/api/admin/referrals/rewards').then(res => res.json()),
                fetch('/api/admin/referrals/history').then(res => res.json())
            ]);

            if (statsRes.stats) {
                setStats(statsRes.stats);
                setRanking(statsRes.topEmbajadores || []);
            }
            setCampaigns(campaignsRes || []);
            setRewards(rewardsRes || []);
            setHistory(historyRes || []);
        } catch (err) {
            console.error("Error al cargar datos:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (campaign: any) => {
        setActionLoading(campaign.id);
        try {
            const res = await fetch(`/api/admin/referrals/campaigns/${campaign.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activa: !campaign.activa })
            });
            if (res.ok) {
                const updated = await res.json();
                setCampaigns(prev => prev.map(c => c.id === campaign.id ? updated : c));
                // Recargar estadísticas
                const statsRes = await fetch('/api/admin/referrals/stats').then(res => res.json());
                if (statsRes.stats) setStats(statsRes.stats);
            }
        } catch (err) {
            console.error("Error al cambiar estado de campaña:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteCampaign = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta campaña?")) return;
        setActionLoading(id);
        try {
            const res = await fetch(`/api/admin/referrals/campaigns/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok) {
                setCampaigns(prev => prev.filter(c => c.id !== id));
                fetchData(); // Recargar todo
            } else {
                alert(data.error || "No se pudo eliminar la campaña.");
            }
        } catch (err) {
            console.error("Error al eliminar campaña:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const openDeliveryModal = (reward: any) => {
        setSelectedReward(reward);
        setDeliveryStaffId(staffList[0]?.id || '');
        setDeliveryNotes('');
        setIsDeliveryModalOpen(true);
    };

    const handleDeliverReward = async () => {
        if (!selectedReward) return;
        setActionLoading(selectedReward.id);
        try {
            const res = await fetch(`/api/admin/referrals/rewards/${selectedReward.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado: 'CANJEADO',
                    staffId: deliveryStaffId || null,
                    notas: deliveryNotes
                })
            });

            if (res.ok) {
                setIsDeliveryModalOpen(false);
                setSelectedReward(null);
                fetchData(); // Recargar todas las tablas y conteos
            } else {
                const data = await res.json();
                alert(data.error || "No se pudo entregar el premio.");
            }
        } catch (err) {
            console.error("Error al entregar premio:", err);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-2">
                        <Gift className="text-[var(--primary-color)]" size={24} style={{ color: primaryColor }} />
                        Recompensas por Referidos
                    </h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                        Crea campañas de recomendación y premia a tus clientes más fieles
                    </p>
                </div>
                <Link
                    href="/admin/referidos/nueva"
                    className="flex items-center justify-center gap-2 px-5 py-3.5 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 text-center self-start"
                    style={{
                        backgroundColor: primaryColor,
                        boxShadow: `0 10px 15px -3px ${primaryColor}33`
                    }}
                >
                    <Plus size={16} />
                    Crear Campaña
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[110px]">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[9px] font-black uppercase tracking-widest">Referidos Válidos</span>
                        <UserCheck size={18} style={{ color: primaryColor }} />
                    </div>
                    <span className="text-2xl font-black text-slate-900 mt-2">{loading ? '...' : stats.totalValidos}</span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[110px]">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[9px] font-black uppercase tracking-widest">En Progreso</span>
                        <Users size={18} className="text-amber-500" />
                    </div>
                    <span className="text-2xl font-black text-slate-900 mt-2">{loading ? '...' : stats.totalPendientes}</span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[110px]">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[9px] font-black uppercase tracking-widest">Premios por Entregar</span>
                        <Award size={18} className="text-rose-500" />
                    </div>
                    <span className="text-2xl font-black text-rose-600 mt-2">{loading ? '...' : stats.premiosDisponibles}</span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[110px]">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[9px] font-black uppercase tracking-widest">Premios Entregados</span>
                        <Check size={18} className="text-emerald-500" />
                    </div>
                    <span className="text-2xl font-black text-emerald-600 mt-2">{loading ? '...' : stats.premiosCanjeados}</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-6 mb-6 overflow-x-auto scrollbar-none">
                <button
                    onClick={() => setActiveTab('campaigns')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'campaigns'
                            ? 'border-[var(--primary-color)] text-slate-900'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                    style={{ borderColor: activeTab === 'campaigns' ? primaryColor : 'transparent' }}
                >
                    Campañas
                </button>
                <button
                    onClick={() => setActiveTab('rewards')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'rewards'
                            ? 'border-[var(--primary-color)] text-slate-900'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                    style={{ borderColor: activeTab === 'rewards' ? primaryColor : 'transparent' }}
                >
                    Premios Pendientes
                    {stats.premiosDisponibles > 0 && (
                        <span className="size-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black">
                            {stats.premiosDisponibles}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('ranking')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'ranking'
                            ? 'border-[var(--primary-color)] text-slate-900'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                    style={{ borderColor: activeTab === 'ranking' ? primaryColor : 'transparent' }}
                >
                    Top Embajadores
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'history'
                            ? 'border-[var(--primary-color)] text-slate-900'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                    style={{ borderColor: activeTab === 'history' ? primaryColor : 'transparent' }}
                >
                    Historial
                </button>
            </div>

            {/* Tab Contents */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="animate-spin mb-4" size={32} style={{ color: primaryColor }} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Cargando módulo...</span>
                </div>
            ) : (
                <div className="animate-in fade-in duration-300">
                    {/* CAMPAIGNS TAB */}
                    {activeTab === 'campaigns' && (
                        campaigns.length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Gift className="mx-auto text-slate-300 mb-4" size={40} />
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">No tienes campañas creadas</h3>
                                <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto mb-6">
                                    Crea tu primera campaña de referidos y define un premio atractivo para empezar a recibir nuevos clientes.
                                </p>
                                <Link
                                    href="/admin/referidos/nueva"
                                    className="inline-flex items-center gap-2 px-5 py-3 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95"
                                    style={{
                                        backgroundColor: primaryColor,
                                        boxShadow: `0 10px 15px -3px ${primaryColor}33`
                                    }}
                                >
                                    <Plus size={16} />
                                    Crear Campaña
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {campaigns.map((camp) => (
                                    <div key={camp.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between relative hover:shadow-md transition-shadow">
                                        
                                        {/* Status indicator top right */}
                                        <button
                                            onClick={() => handleToggleActive(camp)}
                                            disabled={actionLoading === camp.id}
                                            className="absolute top-6 right-6 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                                        >
                                            {camp.activa ? (
                                                <ToggleRight className="text-emerald-500" size={32} />
                                            ) : (
                                                <ToggleLeft className="text-slate-300" size={32} />
                                            )}
                                        </button>

                                        <div>
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full inline-block mb-3 ${
                                                camp.activa ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {camp.activa ? 'Activa' : 'Inactiva'}
                                            </span>

                                            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-1 truncate pr-8">
                                                {camp.nombre}
                                            </h3>
                                            <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-4 min-h-[33px] line-clamp-2">
                                                {camp.descripcion || 'Sin descripción.'}
                                            </p>

                                            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 mb-4 border border-slate-100">
                                                <div className="flex items-center justify-between text-xs font-semibold">
                                                    <span className="text-slate-400">Meta referidos:</span>
                                                    <span className="text-slate-800 font-bold">{camp.referidosRequeridos} personas</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs font-semibold">
                                                    <span className="text-slate-400">Premio referidor:</span>
                                                    <span className="text-rose-600 font-black">{camp.valorRecompensa}</span>
                                                </div>
                                                {camp.tipoIncentivo && (
                                                    <div className="flex items-center justify-between text-xs font-semibold pt-1.5 border-t border-slate-200/50">
                                                        <span className="text-slate-400 flex items-center gap-1">
                                                            <Sparkles size={12} className="text-amber-500" />
                                                            Incentivo invitado:
                                                        </span>
                                                        <span className="text-amber-600 font-black">{camp.valorIncentivo}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                                🏆 Canjes: {camp.premiosEntregados} {camp.limitePremios ? `/ ${camp.limitePremios}` : ''}
                                            </span>
                                            
                                            <div className="flex gap-2">
                                                <Link
                                                    href={`/admin/referidos/nueva?edit=${camp.id}`}
                                                    className="size-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-colors"
                                                >
                                                    <Edit2 size={14} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteCampaign(camp.id)}
                                                    disabled={actionLoading === camp.id}
                                                    className="size-9 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* REWARDS TAB */}
                    {activeTab === 'rewards' && (
                        rewards.filter(r => r.estado === 'DISPONIBLE').length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Award className="mx-auto text-slate-300 mb-4" size={40} />
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">No hay premios pendientes</h3>
                                <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto">
                                    Aquí aparecerán los clientes que completen la meta de referidos para que les entregues su premio físico o digital.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                <th className="py-4 px-6">Cliente</th>
                                                <th className="py-4 px-6">Contacto</th>
                                                <th className="py-4 px-6">Campaña / Meta</th>
                                                <th className="py-4 px-6">Premio ganado</th>
                                                <th className="py-4 px-6">Fecha Ganado</th>
                                                <th className="py-4 px-6 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                            {rewards.filter(r => r.estado === 'DISPONIBLE').map((rew) => (
                                                <tr key={rew.id} className="hover:bg-slate-50/50">
                                                    <td className="py-4 px-6">
                                                        <span className="font-bold text-slate-900">{rew.Usuario?.nombre}</span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="font-medium text-slate-500">{rew.Usuario?.phone}</span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="font-bold text-slate-800">{rew.Campaign?.nombre}</span>
                                                        <span className="text-[10px] text-slate-400 block mt-0.5">Meta: {rew.Campaign?.referidosRequeridos} invitados</span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full font-black text-[10px] tracking-wide inline-block uppercase">
                                                            {rew.Campaign?.valorRecompensa}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-slate-400">
                                                        {new Date(rew.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <button
                                                            onClick={() => openDeliveryModal(rew)}
                                                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-sm shadow-emerald-500/20 active:scale-95 cursor-pointer"
                                                        >
                                                            Entregar Premio
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}

                    {/* RANKING TAB */}
                    {activeTab === 'ranking' && (
                        ranking.length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Award className="mx-auto text-slate-300 mb-4" size={40} />
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">Aún no hay embajadores</h3>
                                <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto">
                                    El ranking se completará con los clientes que registren sus primeros referidos completados válidos en el sistema.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                <th className="py-4 px-6 w-20">Puesto</th>
                                                <th className="py-4 px-6">Cliente Embajador</th>
                                                <th className="py-4 px-6">Contacto</th>
                                                <th className="py-4 px-6">Referidos Válidos</th>
                                                <th className="py-4 px-6">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                            {ranking.map((emb, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="py-4 px-6">
                                                        <span className={`size-7 rounded-full flex items-center justify-center font-black text-[11px] ${
                                                            idx === 0 ? 'bg-amber-100 text-amber-700' :
                                                            idx === 1 ? 'bg-slate-200 text-slate-700' :
                                                            idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="font-bold text-slate-900">{emb.nombre}</span>
                                                    </td>
                                                    <td className="py-4 px-6 text-slate-500">
                                                        {emb.phone}
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="font-black text-slate-900 text-sm">{emb.count}</span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                                                            Líder
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                        history.length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <History className="mx-auto text-slate-300 mb-4" size={40} />
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">Historial vacío</h3>
                                <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto">
                                    Aquí aparecerán todos los registros e invitaciones que realicen los clientes en el sistema.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                <th className="py-4 px-6">Fecha</th>
                                                <th className="py-4 px-6">Quién Invitó (Referidor)</th>
                                                <th className="py-4 px-6">Quién Fue Invitado (Referido)</th>
                                                <th className="py-4 px-6">Campaña / Premio</th>
                                                <th className="py-4 px-6">Estado</th>
                                                <th className="py-4 px-6">Seguridad (IP)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                            {history.map((evt) => (
                                                <tr key={evt.id} className="hover:bg-slate-50/50">
                                                    <td className="py-4 px-6 text-slate-400 font-medium">
                                                        {new Date(evt.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                        <span className="text-[10px] block text-slate-300 font-bold">{new Date(evt.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="font-bold text-slate-900 block">{evt.referrerName}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">{evt.referrerPhone}</span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="font-bold text-slate-900 block">{evt.referredName}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">{evt.referredPhone}</span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="font-semibold text-slate-700 block truncate max-w-[150px]">{evt.campaignName}</span>
                                                        <span className="text-[9px] text-rose-500 font-black tracking-wide uppercase">{evt.rewardValue}</span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                                            evt.estado === 'VALIDO' ? 'bg-emerald-50 text-emerald-600' :
                                                            evt.estado === 'PENDIENTE' ? 'bg-amber-50 text-amber-600' :
                                                            'bg-rose-50 text-rose-600'
                                                        }`}>
                                                            {evt.estado}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-[10px] text-slate-400 font-medium font-mono">
                                                        {evt.ip}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}

            {/* MODAL DE ENTREGA DE PREMIO */}
            {isDeliveryModalOpen && selectedReward && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-6 lg:p-8 border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-300">
                        
                        <h3 className="text-lg font-black text-slate-950 uppercase italic tracking-tighter mb-2 mt-2">
                            Canjear Recompensa
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mb-6">
                            Completa los detalles para marcar el premio como entregado. Esto enviará un mensaje al cliente.
                        </p>

                        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-4 mb-6">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Premio a Entregar</div>
                            <div className="text-base font-black text-rose-600">{selectedReward.Campaign?.valorRecompensa}</div>
                            <div className="text-xs font-bold text-slate-800 mt-1">{selectedReward.Campaign?.nombre}</div>
                            <div className="text-xs font-semibold text-slate-500 mt-3 border-t border-slate-200/50 pt-2 flex items-center justify-between">
                                <span>Ganador:</span>
                                <span className="font-bold text-slate-900">{selectedReward.Usuario?.nombre} ({selectedReward.Usuario?.phone})</span>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Entregado por (Personal)</label>
                                <select
                                    value={deliveryStaffId}
                                    onChange={(e) => setDeliveryStaffId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                                    style={{ '--focus-color': primaryColor } as any}
                                >
                                    {staffList.map(staff => (
                                        <option key={staff.id} value={staff.id}>{staff.name}</option>
                                    ))}
                                    {staffList.length === 0 && (
                                        <option value="">No hay personal configurado</option>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Notas opcionales</label>
                                <textarea
                                    value={deliveryNotes}
                                    onChange={(e) => setDeliveryNotes(e.target.value)}
                                    placeholder="Detalles sobre el canje (ej. físico, cupón, etc.)"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors min-h-[80px]"
                                    style={{ '--focus-color': primaryColor } as any}
                                />
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <button
                                onClick={() => {
                                    setIsDeliveryModalOpen(false);
                                    setSelectedReward(null);
                                }}
                                className="px-5 py-4 bg-slate-100 hover:bg-slate-200 rounded-2xl font-black text-[10px] text-slate-700 uppercase tracking-widest transition-all cursor-pointer active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeliverReward}
                                disabled={actionLoading === selectedReward.id}
                                className="flex items-center justify-center gap-2 px-5 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                style={{
                                    backgroundColor: primaryColor,
                                    boxShadow: `0 10px 15px -3px ${primaryColor}33, 0 4px 6px -4px ${primaryColor}33`
                                }}
                            >
                                {actionLoading === selectedReward.id ? (
                                    <Loader2 className="animate-spin" size={14} />
                                ) : (
                                    <Check size={14} />
                                )}
                                Confirmar Canje
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
