'use client';

import { useState, useEffect } from 'react';
import { Gift, Plus, Users, Award, History, ToggleLeft, ToggleRight, Check, Trash2, Edit2, Loader2, Calendar, UserCheck, ShieldAlert, Sparkles, Trophy, Settings, TrendingUp, BarChart2, PlusCircle, AlertCircle, Copy, Trash, ArrowLeft, Save, Coins } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Staff {
    id: string;
    name: string;
}

export default function ReferralClient({ staffList }: { staffList: Staff[] }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'campaigns' | 'rewards' | 'coupons' | 'points' | 'automations' | 'loyaltyRewards' | 'stats' | 'history'>('campaigns');
    const [activeView, setActiveView] = useState<'list' | 'create-coupon' | 'adjust-points' | 'create-automation' | 'create-loyalty-reward'>('list');

    // Stats de Citiox
    const [stats, setStats] = useState<any>({
        totalValidos: 0,
        totalPendientes: 0,
        campañasActivas: 0,
        premiosDisponibles: 0,
        premiosCanjeados: 0
    });

    // Stats de Fidelización avanzadas
    const [loyaltyStats, setLoyaltyStats] = useState<any>({
        summary: {
            totalCampanas: 0,
            totalReferidos: 0,
            totalPremiosDisponibles: 0,
            totalPremiosCanjeados: 0,
            ingresosGenerados: 0,
            roiEstimado: "0",
            puntosEntregados: 0,
            puntosCanjeados: 0
        },
        topReferrers: []
    });

    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [rewards, setRewards] = useState<any[]>([]);
    const [ranking, setRanking] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    
    // Estados de fidelización
    const [coupons, setCoupons] = useState<any[]>([]);
    const [automations, setAutomations] = useState<any[]>([]);
    const [pointsRankings, setPointsRankings] = useState<any[]>([]);
    const [loyaltyRewards, setLoyaltyRewards] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');

    // Estado del modal de entrega de premio (se queda como modal clásico de acción rápida en escritorio/móvil con scroll interno controlado)
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [selectedReward, setSelectedReward] = useState<any>(null);
    const [deliveryStaffId, setDeliveryStaffId] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');

    // Estado del formulario a pantalla completa de cupones
    const [couponCode, setCouponCode] = useState('');
    const [couponType, setCouponType] = useState('PORCENTAJE');
    const [couponValue, setCouponValue] = useState('');
    const [couponMaxUses, setCouponMaxUses] = useState('');
    const [couponDesc, setCouponDesc] = useState('');
    const [couponFin, setCouponFin] = useState('');

    // Estado del formulario a pantalla completa de ajuste de puntos
    const [pointsUserId, setPointsUserId] = useState('');
    const [pointsValue, setPointsValue] = useState('');
    const [pointsConcept, setPointsConcept] = useState('AJUSTE');
    const [pointsNotes, setPointsNotes] = useState('');
    const [usersList, setUsersList] = useState<any[]>([]);

    // Estado del formulario a pantalla completa de creación de automatizaciones
    const [autoName, setAutoName] = useState('');
    const [autoDesc, setAutoDesc] = useState('');
    const [autoTrigger, setAutoTrigger] = useState('CUMPLEANOS');
    const [autoMsg, setAutoMsg] = useState('');
    const [autoPoints, setAutoPoints] = useState('');

    // Estado del formulario de nuevo premio por puntos (Catálogo)
    const [rewardName, setRewardName] = useState('');
    const [rewardDesc, setRewardDesc] = useState('');
    const [rewardPoints, setRewardPoints] = useState('');
    const [rewardType, setRewardType] = useState('SERVICIO_GRATIS');
    const [rewardValue, setRewardValue] = useState('');
    const [rewardStock, setRewardStock] = useState('');
    const [rewardDeliveryType, setRewardDeliveryType] = useState('AUTOMATICO');
    const [rewardServiceId, setRewardServiceId] = useState('');
    const [rewardRecompensaImagenUrl, setRewardRecompensaImagenUrl] = useState('');
    const [servicesList, setServicesList] = useState<any[]>([]);

    useEffect(() => {
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (color) setPrimaryColor(color);
        fetchData();
        fetchUsers();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, campaignsRes, rewardsRes, historyRes, couponsRes, automationsRes, pointsRes, loyaltyStatsRes, loyaltyRewardsRes, servicesRes] = await Promise.all([
                fetch('/api/admin/referrals/stats').then(res => res.json()),
                fetch('/api/admin/referrals/campaigns').then(res => res.json()),
                fetch('/api/admin/referrals/rewards').then(res => res.json()),
                fetch('/api/admin/referrals/history').then(res => res.json()),
                fetch('/api/admin/loyalty/coupons').then(res => res.json()).catch(() => []),
                fetch('/api/admin/loyalty/automations').then(res => res.json()).catch(() => []),
                fetch('/api/admin/loyalty/points').then(res => res.json()).catch(() => []),
                fetch('/api/admin/loyalty/stats').then(res => res.json()).catch(() => null),
                fetch('/api/admin/loyalty/rewards').then(res => res.json()).catch(() => []),
                fetch('/api/services').then(res => res.json()).catch(() => [])
            ]);

            if (statsRes.stats) {
                setStats(statsRes.stats);
                setRanking(statsRes.topEmbajadores || []);
            }
            setCampaigns(campaignsRes || []);
            setRewards(rewardsRes || []);
            setHistory(historyRes || []);
            setCoupons(couponsRes || []);
            setAutomations(automationsRes || []);
            setPointsRankings(pointsRes || []);
            setLoyaltyRewards(loyaltyRewardsRes || []);
            setServicesList(servicesRes || []);
            if (loyaltyStatsRes && loyaltyStatsRes.summary) {
                setLoyaltyStats(loyaltyStatsRes);
            }
        } catch (err) {
            console.error("Error al cargar datos:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/usuarios');
            if (res.ok) {
                const data = await res.json();
                setUsersList(data || []);
            }
        } catch {}
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
                fetchData();
            } else {
                alert(data.error || "No se pudo eliminar la campaña.");
            }
        } catch (err) {
            console.error("Error al eliminar campaña:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!couponValue) return;
        setActionLoading('coupon');
        try {
            const res = await fetch('/api/admin/loyalty/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    codigo: couponCode || undefined,
                    tipo: couponType,
                    valor: parseFloat(couponValue),
                    maxUsos: couponMaxUses ? parseInt(couponMaxUses) : null,
                    descripcion: couponDesc || null,
                    fechaFin: couponFin ? new Date(couponFin).toISOString() : null
                })
            });

            if (res.ok) {
                setActiveView('list');
                setCouponCode('');
                setCouponValue('');
                setCouponMaxUses('');
                setCouponDesc('');
                setCouponFin('');
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Error al crear cupón.");
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleAdjustPoints = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pointsUserId || !pointsValue) return;
        setActionLoading('points');
        try {
            const res = await fetch('/api/admin/loyalty/points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: pointsUserId,
                    puntos: parseInt(pointsValue),
                    concepto: pointsConcept,
                    notas: pointsNotes || null
                })
            });

            if (res.ok) {
                setActiveView('list');
                setPointsUserId('');
                setPointsValue('');
                setPointsNotes('');
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Error al ajustar puntos.");
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreateAutomation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!autoName || (!autoMsg && !autoPoints)) return;
        setActionLoading('auto');
        
        const acciones: any[] = [];
        if (autoMsg) {
            acciones.push({ tipo: 'WHATSAPP', mensaje: autoMsg });
        }
        if (autoPoints) {
            acciones.push({ tipo: 'PUNTOS', cantidad: parseInt(autoPoints), notas: 'Bono por automatización' });
        }

        try {
            const res = await fetch('/api/admin/loyalty/automations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: autoName,
                    descripcion: autoDesc || null,
                    disparador: autoTrigger,
                    acciones
                })
            });

            if (res.ok) {
                setActiveView('list');
                setAutoName('');
                setAutoDesc('');
                setAutoMsg('');
                setAutoPoints('');
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Error al crear regla.");
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreateLoyaltyReward = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rewardName || !rewardPoints) return;
        setActionLoading('loyaltyReward');
        try {
            const res = await fetch('/api/admin/loyalty/rewards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: rewardName,
                    descripcion: rewardDesc || null,
                    costoPuntos: parseInt(rewardPoints),
                    tipo: rewardType,
                    deliveryType: rewardDeliveryType,
                    valor: rewardValue || null,
                    serviceId: rewardServiceId || null,
                    recompensaImagenUrl: rewardRecompensaImagenUrl || null,
                    cantidadTotal: rewardStock ? parseInt(rewardStock) : null
                })
            });

            if (res.ok) {
                setActiveView('list');
                setRewardName('');
                setRewardDesc('');
                setRewardPoints('');
                setRewardType('SERVICIO_GRATIS');
                setRewardValue('');
                setRewardStock('');
                setRewardDeliveryType('AUTOMATICO');
                setRewardServiceId('');
                setRewardRecompensaImagenUrl('');
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Error al crear premio por puntos.");
            }
        } catch (err) {
            console.error("Error creating loyalty reward:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteLoyaltyReward = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este premio del catálogo?")) return;
        setActionLoading(id);
        try {
            const res = await fetch(`/api/admin/loyalty/rewards/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Error al eliminar premio.");
            }
        } catch (err) {
            console.error("Error deleting loyalty reward:", err);
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
                fetchData();
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

    // ─── RENDERS DE VISTA A PANTALLA COMPLETA ─────────────────────────────────────

    // Formulario de Cupones a Pantalla Completa
    if (activeView === 'create-coupon') {
        return (
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 animate-in fade-in duration-300">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => setActiveView('list')}
                        className="size-11 bg-white hover:bg-slate-100 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-600 transition-colors shadow-sm cursor-pointer"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-2">
                            <PlusCircle style={{ color: primaryColor }} size={22} />
                            Crear Nuevo Cupón
                        </h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Define un código de descuento promocional para tu club
                        </p>
                    </div>
                </div>

                <form onSubmit={handleCreateCoupon} className="max-w-3xl bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Código del Cupón (Ej: ZENDA20)</label>
                            <input
                                type="text"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                placeholder="DEJAR VACÍO PARA GENERACIÓN AUTOMÁTICA"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Descuento</label>
                            <select
                                value={couponType}
                                onChange={(e) => setCouponType(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            >
                                <option value="PORCENTAJE">Porcentaje (%)</option>
                                <option value="FIJO">Monto Fijo ($)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor *</label>
                            <input
                                type="number"
                                required
                                min={1}
                                value={couponValue}
                                onChange={(e) => setCouponValue(e.target.value)}
                                placeholder="Ej: 15"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción</label>
                            <input
                                type="text"
                                value={couponDesc}
                                onChange={(e) => setCouponDesc(e.target.value)}
                                placeholder="Ej: 15% de descuento en tu primera reserva"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Límite Máximo de Usos</label>
                            <input
                                type="number"
                                value={couponMaxUses}
                                onChange={(e) => setCouponMaxUses(e.target.value)}
                                placeholder="Ej: 50 (Vacío para ilimitado)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha Límite (Expiración)</label>
                            <input
                                type="date"
                                value={couponFin}
                                onChange={(e) => setCouponFin(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setActiveView('list')}
                            className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-transform active:scale-95 cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={actionLoading === 'coupon'}
                            className="flex items-center gap-2 px-6 py-4 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                            style={{
                                backgroundColor: primaryColor,
                                boxShadow: `0 10px 15px -3px ${primaryColor}33`
                            }}
                        >
                            {actionLoading === 'coupon' ? (
                                <Loader2 className="animate-spin" size={14} />
                            ) : (
                                <Save size={14} />
                            )}
                            Guardar Cupón
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // Formulario de Ajuste de Puntos a Pantalla Completa
    if (activeView === 'adjust-points') {
        return (
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 animate-in fade-in duration-300">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => setActiveView('list')}
                        className="size-11 bg-white hover:bg-slate-100 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-600 transition-colors shadow-sm cursor-pointer"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-2">
                            <Trophy style={{ color: primaryColor }} size={22} />
                            Ajustar Puntos
                        </h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Modifica manualmente el saldo de puntos de un cliente
                        </p>
                    </div>
                </div>

                <form onSubmit={handleAdjustPoints} className="max-w-3xl bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Seleccionar Cliente *</label>
                            <select
                                required
                                value={pointsUserId}
                                onChange={(e) => setPointsUserId(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            >
                                <option value="">-- SELECCIONE CLIENTE --</option>
                                {usersList.map((u) => (
                                    <option key={u.id} value={u.id}>{u.nombre || 'Sin nombre'} ({u.phone || 'Sin teléfono'})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Cantidad de Puntos *</label>
                            <input
                                type="number"
                                required
                                value={pointsValue}
                                onChange={(e) => setPointsValue(e.target.value)}
                                placeholder="Ej: 100 o -50"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            />
                            <span className="text-[8px] text-slate-400 font-semibold block mt-1">Usa números negativos para deducir saldo</span>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Concepto de Ajuste</label>
                            <select
                                value={pointsConcept}
                                onChange={(e) => setPointsConcept(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            >
                                <option value="AJUSTE">Ajuste Manual</option>
                                <option value="BONO">Bono de Bienvenida</option>
                                <option value="CANJE">Canje de Premio</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Notas internas</label>
                            <input
                                type="text"
                                value={pointsNotes}
                                onChange={(e) => setPointsNotes(e.target.value)}
                                placeholder="Ej: Corrección por canje o cortesía en recepción"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setActiveView('list')}
                            className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-transform active:scale-95 cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={actionLoading === 'points'}
                            className="flex items-center gap-2 px-6 py-4 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                            style={{
                                backgroundColor: primaryColor,
                                boxShadow: `0 10px 15px -3px ${primaryColor}33`
                            }}
                        >
                            {actionLoading === 'points' ? (
                                <Loader2 className="animate-spin" size={14} />
                            ) : (
                                <Save size={14} />
                            )}
                            Aplicar Ajuste
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // Formulario de Creación de Automatizaciones a Pantalla Completa
    if (activeView === 'create-automation') {
        return (
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 animate-in fade-in duration-300">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => setActiveView('list')}
                        className="size-11 bg-white hover:bg-slate-100 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-600 transition-colors shadow-sm cursor-pointer"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-2">
                            <Settings style={{ color: primaryColor }} size={22} />
                            Nueva Regla de Automatización
                        </h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Define un disparador de fidelidad y sus acciones asociadas
                        </p>
                    </div>
                </div>

                <form onSubmit={handleCreateAutomation} className="max-w-3xl bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre de la Regla *</label>
                            <input
                                type="text"
                                required
                                value={autoName}
                                onChange={(e) => setAutoName(e.target.value)}
                                placeholder="Ej: Saludo de Cumpleaños por WhatsApp"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Disparador (Trigger) *</label>
                            <select
                                value={autoTrigger}
                                onChange={(e) => setAutoTrigger(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            >
                                <option value="CUMPLEANOS">Cumpleaños del cliente (Ejecución Diaria)</option>
                                <option value="PRIMER_VISITA">Primera visita completada</option>
                                <option value="INACTIVIDAD">Cliente inactivo (60 días sin visitas)</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Acción 1: Mensaje WhatsApp (Opcional)</label>
                            <textarea
                                value={autoMsg}
                                onChange={(e) => setAutoMsg(e.target.value)}
                                placeholder="Ej: ¡Hola {{nombre}}! Feliz cumpleaños te desea el equipo. Te obsequiamos un 15% DTO en tu próxima cita."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none min-h-[100px]"
                            />
                            <span className="text-[8px] text-slate-400 font-semibold block mt-1">Usa {"{{nombre}}"} para personalizar el mensaje</span>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Acción 2: Regalar Puntos de Bono (Opcional)</label>
                            <input
                                type="number"
                                value={autoPoints}
                                onChange={(e) => setAutoPoints(e.target.value)}
                                placeholder="Ej: 100"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setActiveView('list')}
                            className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-transform active:scale-95 cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={actionLoading === 'auto'}
                            className="flex items-center gap-2 px-6 py-4 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                            style={{
                                backgroundColor: primaryColor,
                                boxShadow: `0 10px 15px -3px ${primaryColor}33`
                            }}
                        >
                            {actionLoading === 'auto' ? (
                                <Loader2 className="animate-spin" size={14} />
                            ) : (
                                <Save size={14} />
                            )}
                            Activar Regla
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // Formulario de Recompensas por Puntos (Catálogo) a Pantalla Completa
    if (activeView === 'create-loyalty-reward') {
        return (
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 animate-in fade-in duration-300">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => setActiveView('list')}
                        className="size-11 bg-white hover:bg-slate-100 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-600 transition-colors shadow-sm cursor-pointer"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-2">
                            <Coins style={{ color: primaryColor }} size={22} />
                            Crear Premio de Catálogo
                        </h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Crea una recompensa que tus clientes puedan canjear a cambio de sus puntos
                        </p>
                    </div>
                </div>

                <form onSubmit={handleCreateLoyaltyReward} className="max-w-3xl bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre del Premio *</label>
                            <input
                                type="text"
                                required
                                value={rewardName}
                                onChange={(e) => setRewardName(e.target.value)}
                                placeholder="Ej: Limpieza Dental Gratis o 20% DTO en Masajes"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Costo en Puntos *</label>
                            <input
                                type="number"
                                required
                                min={1}
                                value={rewardPoints}
                                onChange={(e) => setRewardPoints(e.target.value)}
                                placeholder="Ej: 150"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Método de Entrega</label>
                            <select
                                value={rewardDeliveryType}
                                onChange={(e) => setRewardDeliveryType(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            >
                                <option value="AUTOMATICO">⚡ Automático (Digital)</option>
                                <option value="MANUAL">🎁 Manual (Entrega Física)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Premio</label>
                            <select
                                value={rewardType}
                                onChange={(e) => setRewardType(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            >
                                <option value="SERVICIO_GRATIS">Servicio Gratis</option>
                                <option value="CUPON">Cupón de Descuento</option>
                                <option value="PRODUCTO">Producto de Regalo</option>
                                <option value="REGALO">Regalo Físico / Sorpresa</option>
                                <option value="PUNTOS">Bono de Puntos</option>
                                <option value="CASHBACK">Cashback / Saldo</option>
                                <option value="BADGE">Insignia / Badge</option>
                                <option value="PERSONALIZADO">Otro / Personalizado</option>
                            </select>
                        </div>

                        {rewardType === 'SERVICIO_GRATIS' && (
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Asociar Servicio *</label>
                                <select
                                    required
                                    value={rewardServiceId}
                                    onChange={(e) => setRewardServiceId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                                >
                                    <option value="">Selecciona un servicio...</option>
                                    {servicesList.map((service) => (
                                        <option key={service.id} value={service.id}>
                                            {service.nombre} (${service.precio || 0})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {rewardType === 'CUPON' && (
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Asociar Cupón del Catálogo</label>
                                <select
                                    value={rewardValue}
                                    onChange={(e) => setRewardValue(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                                >
                                    <option value="">Selecciona un cupón...</option>
                                    {coupons.map((coupon) => (
                                        <option key={coupon.id} value={coupon.id}>
                                            {coupon.codigo} ({coupon.tipo === 'PORCENTAJE' ? `${coupon.valor}%` : `$${coupon.valor}`} DTO)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {rewardDeliveryType === 'MANUAL' && (
                            <div className="md:col-span-2">
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">URL de la Imagen del Premio Físico (Opcional)</label>
                                <input
                                    type="text"
                                    value={rewardRecompensaImagenUrl}
                                    onChange={(e) => setRewardRecompensaImagenUrl(e.target.value)}
                                    placeholder="Ej: https://tudominio.com/imagenes/peluche.png"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                                />
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción</label>
                            <input
                                type="text"
                                value={rewardDesc}
                                onChange={(e) => setRewardDesc(e.target.value)}
                                placeholder="Ej: Incluye valoración completa de cortesía"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            />
                        </div>

                        {rewardType !== 'CUPON' && rewardType !== 'SERVICIO_GRATIS' && (
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor Asociado (Opcional)</label>
                                <input
                                    type="text"
                                    value={rewardValue}
                                    onChange={(e) => setRewardValue(e.target.value)}
                                    placeholder="Ej: Valor del descuento, monto, etc."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Límite de Stock (Opcional)</label>
                            <input
                                type="number"
                                value={rewardStock}
                                onChange={(e) => setRewardStock(e.target.value)}
                                placeholder="Ej: 30 (Vacío para ilimitado)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setActiveView('list')}
                            className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-transform active:scale-95 cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={actionLoading === 'loyaltyReward'}
                            className="flex items-center gap-2 px-6 py-4 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                            style={{
                                backgroundColor: primaryColor,
                                boxShadow: `0 10px 15px -3px ${primaryColor}33`
                            }}
                        >
                            {actionLoading === 'loyaltyReward' ? (
                                <Loader2 className="animate-spin" size={14} />
                            ) : (
                                <Save size={14} />
                            )}
                            Crear Premio
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // ─── RENDER DE LA VISTA PRINCIPAL (LISTADOS) ──────────────────────────────────
    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 animate-in fade-in duration-300">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-2">
                        <Gift className="text-[var(--primary-color)]" size={24} style={{ color: primaryColor }} />
                        Fidelización y Marketing
                    </h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                        Crea campañas, administra puntos, cupones y automatizaciones inteligentes
                    </p>
                </div>
                
                <div className="flex gap-2">
                    {activeTab === 'campaigns' && (
                        <Link
                            href="/admin/referidos/nueva"
                            className="flex items-center justify-center gap-2 px-5 py-3.5 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 text-center"
                            style={{
                                backgroundColor: primaryColor,
                                boxShadow: `0 10px 15px -3px ${primaryColor}33`
                            }}
                        >
                            <Plus size={16} />
                            Crear Campaña
                        </Link>
                    )}
                    {activeTab === 'coupons' && (
                        <button
                            onClick={() => setActiveView('create-coupon')}
                            className="flex items-center justify-center gap-2 px-5 py-3.5 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 text-center cursor-pointer"
                            style={{
                                backgroundColor: primaryColor,
                                boxShadow: `0 10px 15px -3px ${primaryColor}33`
                            }}
                        >
                            <PlusCircle size={16} />
                            Crear Cupón
                        </button>
                    )}
                    {activeTab === 'points' && (
                        <button
                            onClick={() => setActiveView('adjust-points')}
                            className="flex items-center justify-center gap-2 px-5 py-3.5 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 text-center cursor-pointer"
                            style={{
                                backgroundColor: primaryColor,
                                boxShadow: `0 10px 15px -3px ${primaryColor}33`
                            }}
                        >
                            <Trophy size={16} />
                            Ajustar Puntos
                        </button>
                    )}
                    {activeTab === 'automations' && (
                        <button
                            onClick={() => setActiveView('create-automation')}
                            className="flex items-center justify-center gap-2 px-5 py-3.5 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 text-center cursor-pointer"
                            style={{
                                backgroundColor: primaryColor,
                                boxShadow: `0 10px 15px -3px ${primaryColor}33`
                            }}
                        >
                            <Settings size={16} />
                            Nueva Regla
                        </button>
                    )}
                    {activeTab === 'loyaltyRewards' && (
                        <button
                            onClick={() => setActiveView('create-loyalty-reward')}
                            className="flex items-center justify-center gap-2 px-5 py-3.5 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 text-center cursor-pointer"
                            style={{
                                backgroundColor: primaryColor,
                                boxShadow: `0 10px 15px -3px ${primaryColor}33`
                            }}
                        >
                            <Coins size={16} />
                            Crear Premio
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-6 mb-6 overflow-x-auto scrollbar-none">
                <button
                    onClick={() => setActiveTab('campaigns')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'campaigns' ? 'border-[var(--primary-color)] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                    style={{ borderColor: activeTab === 'campaigns' ? primaryColor : 'transparent' }}
                >
                    Campañas
                </button>
                <button
                    onClick={() => setActiveTab('rewards')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'rewards' ? 'border-[var(--primary-color)] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
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
                    onClick={() => setActiveTab('coupons')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'coupons' ? 'border-[var(--primary-color)] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                    style={{ borderColor: activeTab === 'coupons' ? primaryColor : 'transparent' }}
                >
                    Cupones
                </button>
                <button
                    onClick={() => setActiveTab('loyaltyRewards')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        activeTab === 'loyaltyRewards' ? 'border-[var(--primary-color)] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                    style={{ borderColor: activeTab === 'loyaltyRewards' ? primaryColor : 'transparent' }}
                >
                    Catálogo Puntos
                </button>
                <button
                    onClick={() => setActiveTab('points')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'points' ? 'border-[var(--primary-color)] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                    style={{ borderColor: activeTab === 'points' ? primaryColor : 'transparent' }}
                >
                    Puntos de Clientes
                </button>
                <button
                    onClick={() => setActiveTab('automations')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'automations' ? 'border-[var(--primary-color)] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                    style={{ borderColor: activeTab === 'automations' ? primaryColor : 'transparent' }}
                >
                    Automatizaciones
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'stats' ? 'border-[var(--primary-color)] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                    style={{ borderColor: activeTab === 'stats' ? primaryColor : 'transparent' }}
                >
                    Analíticas y ROI
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'history' ? 'border-[var(--primary-color)] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
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
                    <span className="text-[10px] font-black uppercase tracking-widest">Cargando datos...</span>
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
                                    Crea tu primera campaña de fidelización y define las reglas para empezar a fidelizar clientes.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {campaigns.map((camp) => (
                                    <div key={camp.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between relative hover:shadow-md transition-shadow">
                                        <button
                                            onClick={() => handleToggleActive(camp)}
                                            disabled={actionLoading === camp.id}
                                            className="absolute top-6 right-6 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                                        >
                                            {actionLoading === camp.id ? (
                                                <Loader2 className="animate-spin text-slate-450" size={20} />
                                            ) : camp.activa ? (
                                                <ToggleRight className="text-emerald-500" size={32} />
                                            ) : (
                                                <ToggleLeft className="text-slate-350" size={32} />
                                            )}
                                        </button>

                                        <div>
                                            <span className="text-[7.5px] font-black text-pink-500 uppercase tracking-widest px-2 py-0.5 rounded-md bg-pink-50 border border-pink-100 inline-block mb-3">
                                                {camp.tipoCampana || 'REFERIDOS'}
                                            </span>
                                            <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-tight mb-1 pr-10">
                                                {camp.nombre}
                                            </h3>
                                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mb-6">
                                                {camp.descripcion || 'Sin descripción'}
                                            </p>

                                            <div className="space-y-2.5 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                    <span className="text-slate-400">Meta:</span>
                                                    <span className="text-slate-800">{camp.referidosRequeridos} {camp.tipoCampana === 'GASTAR_DOLARES' ? 'Dólares' : 'Reservas'}</span>
                                                </div>
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                    <span className="text-slate-400">Recompensa:</span>
                                                    <span className="text-slate-855" style={{ color: primaryColor }}>{camp.valorRecompensa}</span>
                                                </div>
                                                {camp.valorIncentivo && (
                                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                        <span className="text-slate-400">Incentivo amigo:</span>
                                                        <span className="text-slate-700">{camp.valorIncentivo}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2.5 mt-6 pt-4 border-t border-slate-100">
                                            <Link
                                                href={`/admin/referidos/nueva?edit=${camp.id}`}
                                                className="flex-1 py-3 bg-slate-55 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-[8.5px] font-black uppercase tracking-widest text-slate-700 transition-colors text-center"
                                            >
                                                Editar
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteCampaign(camp.id)}
                                                className="px-3 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200/40 rounded-xl text-rose-600 transition-colors cursor-pointer"
                                            >
                                                <Trash size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* REWARDS TAB (PREMIOS PENDIENTES) */}
                    {activeTab === 'rewards' && (
                        rewards.length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Award className="mx-auto text-slate-300 mb-4" size={40} />
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">No hay canjes pendientes</h3>
                                <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto">
                                    Cuando tus clientes alcancen la meta o soliciten un canje por sus puntos, sus premios listos para entregar aparecerán aquí.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                            <th className="p-4 pl-6">Cliente</th>
                                            <th className="p-4">Premio</th>
                                            <th className="p-4">Origen</th>
                                            <th className="p-4">Fecha</th>
                                            <th className="p-4 text-right pr-6">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-100">
                                        {rewards.map((rew) => (
                                            <tr key={rew.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 pl-6">
                                                    <span className="block font-black text-slate-900 leading-none">{rew.Usuario?.nombre || 'Cliente'}</span>
                                                    <span className="text-[9px] text-slate-400 font-semibold mt-1 block">{rew.Usuario?.phone || 'Sin teléfono'}</span>
                                                </td>
                                                <td className="p-4 text-slate-900">{rew.Campaign?.valorRecompensa}</td>
                                                <td className="p-4">
                                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                                        rew.tipoOrigen === 'PUNTOS' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-pink-50 text-pink-600 border border-pink-100'
                                                    }`}>
                                                        {rew.tipoOrigen || 'REFERIDO'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-[10px] text-slate-400 font-semibold">
                                                    {new Date(rew.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                </td>
                                                <td className="p-4 text-right pr-6">
                                                    {rew.estado === 'DISPONIBLE' ? (
                                                        <button
                                                            onClick={() => openDeliveryModal(rew)}
                                                            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl text-[9px] font-black uppercase tracking-widest transition-transform active:scale-95 cursor-pointer"
                                                        >
                                                            Entregar
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-400 text-[9px] uppercase tracking-widest font-black">Entregado</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* COUPONS TAB (CUPONES) */}
                    {activeTab === 'coupons' && (
                        coupons.length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Gift className="mx-auto text-slate-300 mb-4" size={40} />
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">No tienes cupones creados</h3>
                                <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto mb-6">
                                    Crea cupones promocionales de descuento para compartirlos con tus clientes en su club de recompensas.
                                </p>
                                <button
                                    onClick={() => setActiveView('create-coupon')}
                                    className="inline-flex items-center gap-2 px-5 py-3 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer"
                                    style={{
                                        backgroundColor: primaryColor,
                                        boxShadow: `0 10px 15px -3px ${primaryColor}33`
                                    }}
                                >
                                    <PlusCircle size={16} />
                                    Crear mi Primer Cupón
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {coupons.map((coupon) => (
                                    <div key={coupon.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between relative hover:shadow-md transition-shadow">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-100">
                                                    {coupon.tipo === 'PORCENTAJE' ? `${coupon.valor}% DTO` : `$${coupon.valor} DTO`}
                                                </span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                    coupon.activa ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-150 text-slate-500'
                                                }`}>
                                                    {coupon.activa ? 'ACTIVO' : 'INACTIVO'}
                                                </span>
                                            </div>

                                            <h3 className="text-sm font-black text-slate-900 tracking-wider uppercase mb-1">
                                                CÓDIGO: <span style={{ color: primaryColor }}>{coupon.codigo}</span>
                                            </h3>
                                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mb-6">
                                                {coupon.descripcion || 'Sin descripción'}
                                            </p>

                                            <div className="space-y-2 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                    <span className="text-slate-400">Usos totales:</span>
                                                    <span className="text-slate-800">{coupon.usosActuales} / {coupon.maxUsos || 'Ilimitado'}</span>
                                                </div>
                                                {coupon.fechaFin && (
                                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                        <span className="text-slate-400">Vence:</span>
                                                        <span className="text-slate-800">{new Date(coupon.fechaFin).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* LOYALTY REWARDS TAB (CATÁLOGO DE PUNTOS) */}
                    {activeTab === 'loyaltyRewards' && (
                        loyaltyRewards.length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Coins className="mx-auto text-slate-300 mb-4" size={40} />
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">Catálogo de Puntos Vacío</h3>
                                <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto mb-6">
                                    Crea premios (como servicios gratuitos o regalos) que tus clientes puedan canjear a cambio de sus puntos.
                                </p>
                                <button
                                    onClick={() => setActiveView('create-loyalty-reward')}
                                    className="inline-flex items-center gap-2 px-5 py-3 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer"
                                    style={{
                                        backgroundColor: primaryColor,
                                        boxShadow: `0 10px 15px -3px ${primaryColor}33`
                                    }}
                                >
                                    <PlusCircle size={16} />
                                    Crear mi Primer Premio
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {loyaltyRewards.map((reward) => (
                                    <div key={reward.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between relative hover:shadow-md transition-shadow">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                                                    VALOR: {reward.costoPuntos} PUNTOS
                                                </span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                    reward.activa ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {reward.activa ? 'ACTIVO' : 'PAUSADO'}
                                                </span>
                                            </div>

                                            <h3 className="text-sm font-black text-slate-900 tracking-wider uppercase mb-1">
                                                {reward.nombre}
                                            </h3>
                                            <p className="text-[10px] text-slate-450 font-semibold leading-relaxed mb-6">
                                                {reward.descripcion || 'Sin descripción'}
                                            </p>

                                            <div className="space-y-2 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                    <span className="text-slate-400">Tipo de Premio:</span>
                                                    <span className="text-slate-800">{reward.tipo}</span>
                                                </div>
                                                {reward.cantidadTotal && (
                                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                        <span className="text-slate-400">Stock disponible:</span>
                                                        <span className="text-slate-850">{reward.cantidadDisponible} / {reward.cantidadTotal}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2.5 mt-6 pt-4 border-t border-slate-100">
                                            <button
                                                onClick={() => handleDeleteLoyaltyReward(reward.id)}
                                                className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200/40 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-600 transition-colors cursor-pointer text-center"
                                            >
                                                Eliminar Premio
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* POINTS TAB (PUNTOS Y BALANCE) */}
                    {activeTab === 'points' && (
                        pointsRankings.length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Trophy className="mx-auto text-slate-300 mb-4" size={40} />
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">No hay balances registrados</h3>
                                <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto mb-6">
                                    Los balances de puntos de tus clientes por asistir a citas y referir amigos aparecerán en esta lista.
                                </p>
                                <button
                                    onClick={() => setActiveView('adjust-points')}
                                    className="inline-flex items-center gap-2 px-5 py-3 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer"
                                    style={{
                                        backgroundColor: primaryColor,
                                        boxShadow: `0 10px 15px -3px ${primaryColor}33`
                                    }}
                                >
                                    <Trophy size={16} />
                                    Ajustar Puntos
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                            <th className="p-4 pl-6">Cliente</th>
                                            <th className="p-4">WhatsApp</th>
                                            <th className="p-4">Balance Acumulado</th>
                                            <th className="p-4">Última actualización</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-100">
                                        {pointsRankings.map((rank) => (
                                            <tr key={rank.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 pl-6 font-black text-slate-900">{rank.Usuario?.nombre || 'Cliente'}</td>
                                                <td className="p-4 text-slate-450">{rank.Usuario?.phone || 'Sin teléfono'}</td>
                                                <td className="p-4">
                                                    <span className="text-sm font-black text-slate-850" style={{ color: primaryColor }}>{rank.puntos}</span> pts
                                                </td>
                                                <td className="p-4 text-[10px] text-slate-400 font-semibold">
                                                    {new Date(rank.updatedAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* AUTOMATIONS TAB */}
                    {activeTab === 'automations' && (
                        automations.length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <Settings className="mx-auto text-slate-300 mb-4" size={40} />
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">No tienes automatizaciones creadas</h3>
                                <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto mb-6">
                                    Configura disparadores automáticos para enviar saludos por cumpleaños, obsequiar cupones o felicitar a tus clientes por WhatsApp.
                                </p>
                                <button
                                    onClick={() => setActiveView('create-automation')}
                                    className="inline-flex items-center gap-2 px-5 py-3 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer"
                                    style={{
                                        backgroundColor: primaryColor,
                                        boxShadow: `0 10px 15px -3px ${primaryColor}33`
                                    }}
                                >
                                    <PlusCircle size={16} />
                                    Crear mi Primera Regla
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {automations.map((rule) => (
                                    <div key={rule.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between relative hover:shadow-md transition-shadow">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                                                    DISPARADOR: {rule.disparador}
                                                </span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                    rule.activa ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {rule.activa ? 'ACTIVA' : 'PAUSADA'}
                                                </span>
                                            </div>

                                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight mb-1">
                                                {rule.nombre}
                                            </h3>
                                            <p className="text-[10px] text-slate-450 font-semibold leading-relaxed mb-6">
                                                {rule.descripcion || 'Sin descripción'}
                                            </p>

                                            <div className="space-y-2 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                    <span className="text-slate-400">Total ejecuciones:</span>
                                                    <span className="text-slate-800">{rule.totalRuns || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* STATS TAB */}
                    {activeTab === 'stats' && (
                        <div className="space-y-6">
                            {/* Resumen */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ingresos Generados</span>
                                    <h4 className="text-2xl font-black text-slate-900 mt-2">${loyaltyStats?.summary?.ingresosGenerados || 0}</h4>
                                </div>
                                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ROI Estimado</span>
                                    <h4 className="text-2xl font-black text-slate-900 mt-2" style={{ color: primaryColor }}>{loyaltyStats?.summary?.roiEstimated || loyaltyStats?.summary?.roiEstimado || "0"}%</h4>
                                </div>
                                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Puntos Otorgados</span>
                                    <h4 className="text-2xl font-black text-slate-900 mt-2 text-amber-500">{loyaltyStats?.summary?.puntosEntregados || 0} pts</h4>
                                </div>
                                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Premios Entregados</span>
                                    <h4 className="text-2xl font-black text-slate-900 mt-2 text-emerald-600">{loyaltyStats?.summary?.totalPremiosCanjeados || 0}</h4>
                                </div>
                            </div>

                            {/* Ranking de Embajadores */}
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                                    <Trophy size={16} className="text-amber-500 animate-bounce" />
                                    Clientes más Influyentes (Referidores Estrella)
                                </h3>

                                {!loyaltyStats?.topReferrers || loyaltyStats.topReferrers.length === 0 ? (
                                    <p className="text-xs text-slate-400 font-semibold">No se han registrado referidos válidos todavía.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {loyaltyStats.topReferrers.map((ref: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-b-0 last:pb-0">
                                                <div className="flex items-center gap-3">
                                                    <span className="size-6 bg-slate-50 text-slate-700 text-[10px] font-black rounded-full flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <span className="block text-xs font-black text-slate-800">{ref.nombre}</span>
                                                        <span className="text-[9px] text-slate-455 font-bold">{ref.telefono}</span>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black text-emerald-600">{ref.cantidad} recomendados</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                        history.length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                                <History className="mx-auto text-slate-300 mb-4" size={40} />
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">Historial vacío</h3>
                                <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto">
                                    El registro de todos los referidos y canjes procesados en tu negocio aparecerá aquí.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                            <th className="p-4 pl-6">Referidor</th>
                                            <th className="p-4">Invitado</th>
                                            <th className="p-4">Campaña</th>
                                            <th className="p-4">Estado</th>
                                            <th className="p-4 text-right pr-6">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-100">
                                        {history.map((ev) => (
                                            <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 pl-6">
                                                    <span className="block font-black text-slate-900 leading-none">{ev.Referrer?.nombre || 'Invitador'}</span>
                                                    <span className="text-[9px] text-slate-400 font-semibold mt-1 block">{ev.Referrer?.phone || ''}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="block font-black text-slate-800 leading-none">{ev.Referred?.nombre || 'Invitado'}</span>
                                                    <span className="text-[9px] text-slate-400 font-semibold mt-1 block">{ev.Referred?.phone || ''}</span>
                                                </td>
                                                <td className="p-4">{ev.Campaign?.nombre}</td>
                                                <td className="p-4">
                                                    <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                                        ev.estado === 'VALIDO' ? 'bg-emerald-50 text-emerald-600' : ev.estado === 'INVALIDO' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {ev.estado}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-[10px] text-slate-455 font-semibold text-right pr-6">
                                                    {new Date(ev.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                </div>
            )}

            {/* MODAL DE ENTREGA DE PREMIO (ACCIÓN RÁPIDA) */}
            {isDeliveryModalOpen && selectedReward && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-6 border border-slate-105 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center">
                        <div className="size-16 rounded-[1.8rem] bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 mb-6 shadow-sm">
                            <Check size={28} />
                        </div>

                        <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tight text-center leading-none mb-1">
                            Confirmar Entrega
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center mb-6">
                            Registra el canje físico del premio del cliente
                        </p>

                        <div className="w-full space-y-4 mb-6">
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Premio a entregar:</span>
                                <span className="text-xs font-black text-slate-800 uppercase tracking-tight block">{selectedReward.Campaign?.valorRecompensa}</span>
                                <span className="text-[9px] text-slate-455 font-semibold mt-2 block">Cliente: {selectedReward.Usuario?.nombre || 'Usuario'} ({selectedReward.Usuario?.phone})</span>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Profesional que entrega (Staff)</label>
                                <select
                                    value={deliveryStaffId}
                                    onChange={(e) => setDeliveryStaffId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                                    style={{ '--focus-color': primaryColor } as any}
                                >
                                    {staffList.map((st) => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Comentarios (opcional)</label>
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
                                    boxShadow: `0 10px 15px -3px ${primaryColor}33`
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
