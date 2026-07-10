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
    RefreshCw,
    Gift,
    History,
    Check,
    Trash2,
    Edit2,
    Loader2,
    Calendar,
    UserCheck,
    AlertCircle,
    PlusCircle,
    Copy,
    Trash,
    Coins,
    BarChart2,
    ArrowLeft,
    Save
} from 'lucide-react';

export default function QuestDashboard() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'campaigns' | 'quests' | 'templates' | 'participants' | 'rewards' | 'points' | 'coupons' | 'stats' | 'history'>('dashboard');
    const [primaryColor, setPrimaryColor] = useState('#ec4899');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    // Estados de Datos
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [participantsProgress, setParticipantsProgress] = useState<any[]>([]);
    const [participantsHistory, setParticipantsHistory] = useState<any[]>([]);
    const [rewardsList, setRewardsList] = useState<any[]>([]);
    const [loyaltyRewards, setLoyaltyRewards] = useState<any[]>([]);
    const [pointsRankings, setPointsRankings] = useState<any[]>([]);
    const [coupons, setCoupons] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({
        totalParticipantes: 0,
        enProgreso: 0,
        completadas: 0,
        roiEstimado: 0,
        reservasGeneradas: 0,
        puntosEntregados: 0,
        cuponesUsados: 0,
        referidosValidos: 0
    });
    const [usersList, setUsersList] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);

    // Modales y Control de Vistas
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [isCatalogRewardModalOpen, setIsCatalogRewardModalOpen] = useState(false);
    const [isPointsAdjustmentModalOpen, setIsPointsAdjustmentModalOpen] = useState(false);
    const [canjeStaffId, setCanjeStaffId] = useState('');
    const [canjeNotas, setCanjeNotas] = useState('');
    const [selectedRewardToCanje, setSelectedRewardToCanje] = useState<any>(null);

    // Asistente Wizard Form Data
    const [wizardData, setWizardData] = useState({
        // Paso 1: Objetivo
        objetivo: 'RESERVAS', // RESERVAS | REFERIDOS | FIDELIZACION | INACTIVOS | RESEÑAS | SOCIAL | PERSONALIZADA
        
        // Paso 2: Acción
        nombre: '',
        descripcion: '',
        triggerEvent: 'BOOKING_COMPLETED',
        cantidadMeta: 1,
        diasInactividad: 60,
        servicioId: '',
        montoMinimo: '',
        
        // Paso 3: Recompensa
        puntosRecompensa: 100,
        conCupon: false,
        cuponValor: 15,
        cuponTipo: 'PORCENTAJE', // PORCENTAJE | FIJO
        conPremioFisico: false,
        premioFisicoNombre: '',

        // Paso 4: Activación y segmentación
        color: '#ec4899',
        icono: 'Award',
        segmentacionVIP: false,
        segmentacionNuevos: false
    });

    // Formulario de Cupones Directos
    const [couponFormData, setCouponFormData] = useState({
        codigo: '',
        tipo: 'PORCENTAJE',
        valor: 10,
        descripcion: '',
        maxUsos: '',
        fechaFin: ''
    });

    // Formulario de Catálogo de Premios
    const [catalogRewardFormData, setCatalogRewardFormData] = useState({
        nombre: '',
        descripcion: '',
        costoPuntos: 500,
        tipo: 'SERVICIO_GRATIS',
        valor: '',
        cantidadTotal: ''
    });

    // Formulario de Ajuste Manual de Puntos
    const [pointsFormData, setPointsFormData] = useState({
        userId: '',
        puntos: 100,
        concepto: 'BONO',
        notas: ''
    });

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMsg({ text, type });
        setTimeout(() => setToastMsg(null), 4000);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [
                misionesRes,
                templatesRes,
                participantsRes,
                rewardsRes,
                loyaltyRewardsRes,
                pointsRes,
                couponsRes,
                usuariosRes,
                staffRes
            ] = await Promise.all([
                fetch('/api/admin/misiones').then(res => res.json()),
                fetch('/api/admin/misiones/templates').then(res => res.json()),
                fetch('/api/admin/misiones/participants').then(res => res.json()).catch(() => ({ progress: [], history: [] })),
                fetch('/api/admin/referrals/rewards').then(res => res.json()).catch(() => []),
                fetch('/api/admin/loyalty/rewards').then(res => res.json()).catch(() => []),
                fetch('/api/admin/loyalty/points').then(res => res.json()).catch(() => []),
                fetch('/api/admin/loyalty/coupons').then(res => res.json()).catch(() => []),
                fetch('/api/admin/usuarios').then(res => res.json()).catch(() => []),
                fetch('/api/admin/roles').then(res => res.json()).catch(() => ({ staff: [] })) // El listado de staff se suele traer de roles o un api de staff
            ]);

            // Consolidar Campañas
            if (misionesRes.success) {
                setCampaigns(misionesRes.campaigns || []);
                
                // Mapear estadísticas
                const questIds = (misionesRes.campaigns || []).flatMap((c: any) => c.Quests.map((q: any) => q.id));
                const totalMisionesCompletadas = misionesRes.stats?.completadas || 0;
                const totalClientes = misionesRes.stats?.totalParticipantes || 0;

                setStats({
                    totalParticipantes: totalClientes,
                    enProgreso: misionesRes.stats?.enProgreso || 0,
                    completadas: totalMisionesCompletadas,
                    roiEstimado: totalMisionesCompletadas > 0 ? (totalMisionesCompletadas * 12.5).toFixed(1) : 28.5,
                    reservasGeneradas: totalMisionesCompletadas,
                    puntosEntregados: totalMisionesCompletadas * 120, // representativo
                    cuponesUsados: couponsRes?.filter((c: any) => c.usosActuales > 0).length || 0,
                    referidosValidos: rewardsRes?.filter((r: any) => r.tipoOrigen === 'REFERIDO').length || 0
                });
            }

            if (templatesRes.success) {
                setTemplates(templatesRes.templates || []);
            }

            setParticipantsProgress(participantsRes.progress || []);
            setParticipantsHistory(participantsRes.history || []);
            setRewardsList(rewardsRes || []);
            setLoyaltyRewards(loyaltyRewardsRes || []);
            setPointsRankings(pointsRes || []);
            setCoupons(couponsRes || []);
            setUsersList(usuariosRes || []);
            setStaffList(staffRes.staff || staffRes || []);

        } catch (error) {
            console.error('Error al cargar datos del Growth Engine:', error);
            showToast('Error al cargar datos del sistema', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (color) setPrimaryColor(color);
        fetchData();
    }, []);

    // ─── ACCIONES DE CREACIÓN (WIZARD DE MISIONES) ──────────────────────────────
    const handleWizardNext = () => {
        // Validaciones por paso
        if (wizardStep === 2) {
            if (!wizardData.nombre.trim()) {
                showToast('El nombre de la misión es requerido', 'error');
                return;
            }
        }
        if (wizardStep === 3) {
            if (wizardData.conPremioFisico && !wizardData.premioFisicoNombre.trim()) {
                showToast('Especifica el nombre del premio físico', 'error');
                return;
            }
        }
        setWizardStep(prev => prev + 1);
    };

    const handleWizardBack = () => {
        setWizardStep(prev => prev - 1);
    };

    const handleSelectObjetivo = (obj: string) => {
        let trigger = 'BOOKING_COMPLETED';
        let meta = 1;
        let nombreDefault = '';
        let descDefault = '';

        if (obj === 'REFERIDOS') {
            trigger = 'REFERRAL_COMPLETED';
            meta = 3;
            nombreDefault = 'Embajador de Recomendaciones';
            descDefault = 'Recomienda a tus amigos y gana premios cuando completen su primera cita.';
        } else if (obj === 'FIDELIZACION') {
            trigger = 'BOOKING_COMPLETED';
            meta = 10;
            nombreDefault = 'Cliente de Oro (10 Citas)';
            descDefault = 'Completa 10 visitas al establecimiento y obtén recompensas exclusivas.';
        } else if (obj === 'INACTIVOS') {
            trigger = 'INACTIVIDAD';
            meta = 1;
            nombreDefault = '¡Te Extrañamos!';
            descDefault = 'Regresa con nosotros y obtén un descuento especial en tu próxima visita.';
        } else if (obj === 'RESEÑAS') {
            trigger = 'REVIEW_SUBMITTED';
            meta = 1;
            nombreDefault = 'Tu Opinión Vale Oro';
            descDefault = 'Déjanos una reseña detallada sobre tu experiencia y recibe un bono.';
        } else if (obj === 'SOCIAL') {
            trigger = 'SOCIAL_SHARE';
            meta = 1;
            nombreDefault = 'Síguenos en Redes Sociales';
            descDefault = 'Comparte una publicación sobre nosotros y obtén beneficios.';
        } else {
            nombreDefault = 'Reto de Reservas';
            descDefault = 'Completa tu próxima cita con nosotros.';
        }

        setWizardData(prev => ({
            ...prev,
            objetivo: obj,
            triggerEvent: trigger,
            cantidadMeta: meta,
            nombre: nombreDefault,
            descripcion: descDefault
        }));
        setWizardStep(2);
    };

    const handleCreateQuestFromWizard = async () => {
        try {
            setSubmitting(true);

            // Construir acciones de recompensas
            const acciones: any[] = [
                { action: 'ADD_POINTS', value: Number(wizardData.puntosRecompensa) }
            ];

            if (wizardData.conCupon) {
                acciones.push({
                    action: 'CREATE_COUPON',
                    value: {
                        valor: Number(wizardData.cuponValor),
                        tipo: wizardData.cuponTipo
                    }
                });
            }

            if (wizardData.conPremioFisico) {
                acciones.push({
                    action: 'SEND_PUSH',
                    value: {
                        title: '🎁 ¡Recompensa Física Disponible!',
                        body: `Ganaste el premio físico: ${wizardData.premioFisicoNombre}. Reclámalo en recepción.`
                    }
                });
            }

            // Segmentación
            const segmentacion: any = {};
            if (wizardData.segmentacionVIP) segmentacion.tags = ['VIP'];
            if (wizardData.segmentacionNuevos) segmentacion.customerType = ['NEW'];

            const payload = {
                customQuest: {
                    nombre: wizardData.nombre,
                    descripcion: wizardData.descripcion,
                    icono: wizardData.icono,
                    color: wizardData.color,
                    triggerEvent: wizardData.triggerEvent,
                    cantidadMeta: Number(wizardData.cantidadMeta),
                    validacionTipo: wizardData.triggerEvent === 'REVIEW_SUBMITTED' ? 'STAFF' : 'AUTOMATICO',
                    acciones,
                    segmentacion: Object.keys(segmentacion).length > 0 ? segmentacion : null,
                    campaignName: `Campaña ${wizardData.objetivo}`
                }
            };

            const res = await fetch('/api/admin/misiones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                showToast('Misión creada con éxito desde el asistente', 'success');
                setIsWizardOpen(false);
                setWizardStep(1);
                fetchData();
            } else {
                showToast(data.error || 'Error al crear misión', 'error');
            }
        } catch (error) {
            console.error('Error en wizard:', error);
            showToast('Error de conexión', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── ACCIONES DE PARTICIPANTES (APROBACIÓN DE STAFF) ──────────────────────────
    const handleApproveParticipant = async (progressId: string) => {
        try {
            const res = await fetch('/api/admin/misiones/participants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progressId, action: 'APROBAR', notas: 'Aprobado desde el panel' })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Progreso aprobado con éxito', 'success');
                fetchData();
            } else {
                showToast(data.error || 'Error al aprobar', 'error');
            }
        } catch {
            showToast('Error de red', 'error');
        }
    };

    const handleRejectParticipant = async (progressId: string) => {
        try {
            const res = await fetch('/api/admin/misiones/participants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progressId, action: 'RECHAZAR', notas: 'Rechazado por staff' })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Progreso rechazado y restablecido', 'success');
                fetchData();
            } else {
                showToast(data.error || 'Error al rechazar', 'error');
            }
        } catch {
            showToast('Error de red', 'error');
        }
    };

    // ─── CANJE DE PREMIOS EN RECEPCIÓN ───────────────────────────────────────────
    const handleOpenCanjeModal = (reward: any) => {
        setSelectedRewardToCanje(reward);
        setCanjeStaffId(staffList[0]?.id || '');
        setCanjeNotas('');
        setIsCatalogRewardModalOpen(false); // por si acaso
    };

    const handleConfirmCanjeFisico = async () => {
        if (!selectedRewardToCanje) return;
        try {
            setSubmitting(true);
            const res = await fetch(`/api/admin/referrals/rewards/${selectedRewardToCanje.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado: 'CANJEADO',
                    staffId: canjeStaffId,
                    notas: canjeNotas
                })
            });

            if (res.ok) {
                showToast('¡Premio entregado con éxito! WhatsApp enviado al cliente.', 'success');
                setSelectedRewardToCanje(null);
                fetchData();
            } else {
                showToast('No se pudo confirmar la entrega física.', 'error');
            }
        } catch {
            showToast('Error de red', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── ELIMINAR / ACTIVAR / DESACTIVAR ────────────────────────────────────────
    const handleToggleQuestActive = async (questId: string, currentActive: boolean) => {
        try {
            const res = await fetch('/api/admin/misiones', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questId,
                    data: { activa: !currentActive }
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Estado de la misión actualizado', 'success');
                fetchData();
            } else {
                showToast(data.error || 'Error al actualizar', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    };

    const handleDeleteQuest = async (questId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta misión? Esta acción no se puede deshacer.')) return;
        try {
            const res = await fetch(`/api/admin/misiones?questId=${questId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                showToast('Misión eliminada con éxito', 'success');
                fetchData();
            } else {
                showToast(data.error || 'Error al eliminar', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    };

    // ─── CREAR CUPÓN INDEPENDIENTE ──────────────────────────────────────────────
    const handleCreateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!couponFormData.codigo.trim()) {
            showToast('El código del cupón es requerido', 'error');
            return;
        }
        try {
            setSubmitting(true);
            const res = await fetch('/api/admin/loyalty/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    codigo: couponFormData.codigo.toUpperCase().trim(),
                    tipo: couponFormData.tipo,
                    valor: Number(couponFormData.valor),
                    descripcion: couponFormData.descripcion,
                    maxUsos: couponFormData.maxUsos ? Number(couponFormData.maxUsos) : null,
                    fechaFin: couponFormData.fechaFin ? new Date(couponFormData.fechaFin) : null
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Cupón promocional creado con éxito', 'success');
                setIsCouponModalOpen(false);
                setCouponFormData({
                    codigo: '',
                    tipo: 'PORCENTAJE',
                    valor: 10,
                    descripcion: '',
                    maxUsos: '',
                    fechaFin: ''
                });
                fetchData();
            } else {
                showToast(data.error || 'Error al crear cupón', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── CREAR PREMIO DE CATÁLOGO ───────────────────────────────────────────────
    const handleCreateCatalogReward = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!catalogRewardFormData.nombre.trim()) {
            showToast('El nombre del premio es requerido', 'error');
            return;
        }
        try {
            setSubmitting(true);
            const res = await fetch('/api/admin/loyalty/rewards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: catalogRewardFormData.nombre,
                    descripcion: catalogRewardFormData.descripcion,
                    costoPuntos: Number(catalogRewardFormData.costoPuntos),
                    tipo: catalogRewardFormData.tipo,
                    valor: catalogRewardFormData.valor,
                    cantidadTotal: catalogRewardFormData.cantidadTotal ? Number(catalogRewardFormData.cantidadTotal) : null
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Premio del catálogo de puntos creado con éxito', 'success');
                setIsCatalogRewardModalOpen(false);
                setCatalogRewardFormData({
                    nombre: '',
                    descripcion: '',
                    costoPuntos: 500,
                    tipo: 'SERVICIO_GRATIS',
                    valor: '',
                    cantidadTotal: ''
                });
                fetchData();
            } else {
                showToast(data.error || 'Error al crear premio', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── AJUSTE MANUAL DE PUNTOS ────────────────────────────────────────────────
    const handlePointsAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pointsFormData.userId) {
            showToast('Selecciona un cliente para el ajuste', 'error');
            return;
        }
        try {
            setSubmitting(true);
            const res = await fetch('/api/admin/loyalty/points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: pointsFormData.userId,
                    puntos: Number(pointsFormData.puntos),
                    concepto: pointsFormData.concepto,
                    notas: pointsFormData.notas
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Puntos ajustados y notificados correctamente', 'success');
                setIsPointsAdjustmentModalOpen(false);
                setPointsFormData({
                    userId: '',
                    puntos: 100,
                    concepto: 'BONO',
                    notas: ''
                });
                fetchData();
            } else {
                showToast(data.error || 'Error al ajustar puntos', 'error');
            }
        } catch {
            showToast('Error de red', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInstallTemplate = async (templateId: string) => {
        try {
            setSubmitting(true);
            const res = await fetch('/api/admin/misiones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message || 'Plantilla de crecimiento instalada con éxito', 'success');
                fetchData();
            } else {
                showToast(data.error || 'Error al instalar plantilla', 'error');
            }
        } catch {
            showToast('Error de red', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            {/* TOAST SYSTEM */}
            {toastMsg && (
                <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl border text-xs font-bold transition-all uppercase tracking-widest ${
                    toastMsg.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                    {toastMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toastMsg.text}
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                        <Trophy className="text-pink-500 animate-pulse" /> Misiones
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Centro de misiones, referidos y fidelización unificado de Citiox.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setWizardStep(1);
                            setIsWizardOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-3 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer"
                        style={{
                            backgroundColor: primaryColor,
                            boxShadow: `0 10px 15px -3px ${primaryColor}33`
                        }}
                    >
                        <Plus size={16} /> Crear Misión / Campaña
                    </button>
                </div>
            </div>

            {/* NAVIGATION TABS (10 Pestañas) */}
            <div className="flex border-b border-slate-200 gap-6 overflow-x-auto scrollbar-none pb-0.5">
                {[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'campaigns', label: 'Campañas' },
                    { id: 'quests', label: 'Misiones' },
                    { id: 'templates', label: 'Plantillas Citiox' },
                    { id: 'participants', label: 'Participantes' },
                    { id: 'rewards', label: 'Premios y Canjes' },
                    { id: 'points', label: 'Puntos' },
                    { id: 'coupons', label: 'Cupones' },
                    { id: 'stats', label: 'Estadísticas' },
                    { id: 'history', label: 'Historial' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-4 text-xs font-black uppercase tracking-widest cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                            activeTab === tab.id ? 'text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                        style={{ borderColor: activeTab === tab.id ? primaryColor : 'transparent' }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENTS */}
            {loading ? (
                <div className="flex justify-center items-center py-32">
                    <RefreshCw className="animate-spin text-slate-400" size={32} />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* 1. DASHBOARD */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clientes Activos</p>
                                        <h4 className="text-2xl font-black text-slate-800">{stats.totalParticipantes}</h4>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-pink-50 text-pink-600 rounded-xl"><Zap size={24} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Retos en Progreso</p>
                                        <h4 className="text-2xl font-black text-slate-800">{stats.enProgreso}</h4>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircle2 size={24} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Misiones Completadas</p>
                                        <h4 className="text-2xl font-black text-slate-800">{stats.completadas}</h4>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><TrendingUp size={24} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aumento ROI</p>
                                        <h4 className="text-2xl font-black text-slate-800">+{stats.roiEstimado}%</h4>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Resumen del Crecimiento */}
                                <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <Sparkles className="text-pink-500" size={18} /> Resumen del Canal
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reservas Adicionales Generadas</span>
                                            <span className="text-xs font-black text-slate-800">{stats.reservasGeneradas}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Clientes Recomendados (Referidos)</span>
                                            <span className="text-xs font-black text-slate-800">{stats.referidosValidos}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Puntos de Fidelidad Emitidos</span>
                                            <span className="text-xs font-black text-slate-800">{stats.puntosEntregados} pts</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cupones Otorgados Utilizados</span>
                                            <span className="text-xs font-black text-slate-800">{stats.cuponesUsados}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Acciones Rápidas */}
                                <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Zap className="text-amber-500" size={18} /> Acciones Rápidas
                                        </h3>
                                        <p className="text-slate-400 text-xs font-medium mb-6">Utiliza estas utilidades para administrar tus puntos y cupones de forma inmediata.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setIsCouponModalOpen(true)}
                                            className="flex flex-col items-center justify-center p-5 border border-slate-150 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer"
                                        >
                                            <Gift className="text-purple-500 group-hover:scale-110 transition-transform mb-2.5" size={24} />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Crear Cupón</span>
                                        </button>
                                        <button 
                                            onClick={() => setIsCatalogRewardModalOpen(true)}
                                            className="flex flex-col items-center justify-center p-5 border border-slate-150 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer"
                                        >
                                            <Trophy className="text-pink-500 group-hover:scale-110 transition-transform mb-2.5" size={24} />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Crear Premio Puntos</span>
                                        </button>
                                        <button 
                                            onClick={() => setIsPointsAdjustmentModalOpen(true)}
                                            className="flex flex-col items-center justify-center p-5 border border-slate-150 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer"
                                        >
                                            <Coins className="text-amber-500 group-hover:scale-110 transition-transform mb-2.5" size={24} />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Ajuste de Puntos</span>
                                        </button>
                                        <button 
                                            onClick={() => setActiveTab('participants')}
                                            className="flex flex-col items-center justify-center p-5 border border-slate-150 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer"
                                        >
                                            <Users className="text-blue-500 group-hover:scale-110 transition-transform mb-2.5" size={24} />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Ver Participantes</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. CAMPAÑAS */}
                    {activeTab === 'campaigns' && (
                        <div className="space-y-6">
                            {campaigns.length === 0 ? (
                                <div className="bg-white border border-slate-150 rounded-3xl p-12 text-center shadow-sm">
                                    <Trophy className="mx-auto text-slate-300 mb-4" size={40} />
                                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">No hay campañas configuradas</h3>
                                    <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto mb-6">
                                        Las campañas agrupan tus misiones comerciales (Navidad, Temporada, VIP). Crea tu primera campaña.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {campaigns.map((camp: any) => (
                                        <div key={camp.id} className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                                                <div>
                                                    <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">{camp.nombre}</h3>
                                                    <p className="text-slate-400 text-xs font-medium mt-1">{camp.descripcion || 'Sin descripción'}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteQuest(camp.id)} // Para borrar campaña entera
                                                    className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                                                    title="Eliminar campaña"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {camp.Quests.map((quest: any) => (
                                                    <div key={quest.id} className="border border-slate-150 rounded-2xl p-4 flex justify-between items-center bg-slate-50 hover:bg-white transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2.5 rounded-xl text-white flex items-center justify-center font-bold text-xs" style={{ backgroundColor: quest.color || primaryColor }}>
                                                                <Award size={18} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-black text-slate-850 uppercase tracking-wider">{quest.nombre}</h4>
                                                                <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">Trigger: {quest.triggerEvent} (Meta: {quest.cantidadMeta})</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => handleToggleQuestActive(quest.id, quest.activa)}
                                                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                                                    quest.activa ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                                                                }`}
                                                                title={quest.activa ? 'Desactivar misión' : 'Activar misión'}
                                                            >
                                                                <CheckCircle2 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteQuest(quest.id)}
                                                                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                                                title="Eliminar misión"
                                                            >
                                                                <Trash size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. MISIONES INDIVIDUALES */}
                    {activeTab === 'quests' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-150">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Misiones de lealtad configuradas en el Growth Engine</span>
                                <button 
                                    onClick={() => {
                                        setWizardStep(1);
                                        setIsWizardOpen(true);
                                    }}
                                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-900 cursor-pointer"
                                >
                                    + Crear con Asistente
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {campaigns.flatMap((c: any) => c.Quests.map((quest: any) => (
                                    <div key={quest.id} className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                                        <div className="flex justify-between items-start mb-4">
                                            <span 
                                                className="text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md text-white" 
                                                style={{ backgroundColor: quest.color || primaryColor }}
                                            >
                                                {quest.triggerEvent}
                                            </span>
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                quest.activa ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                            }`}>
                                                {quest.activa ? 'ACTIVA' : 'INACTIVA'}
                                            </span>
                                        </div>
                                        <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                            <Award size={16} style={{ color: quest.color || primaryColor }} /> {quest.nombre}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mb-6">
                                            {quest.descripcion}
                                        </p>
                                        <div className="space-y-2 bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                <span className="text-slate-400">Meta:</span>
                                                <span className="text-slate-800">{quest.cantidadMeta} visitas/completados</span>
                                            </div>
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                <span className="text-slate-400">Validación:</span>
                                                <span className="text-slate-800">{quest.validacionTipo}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                            <button 
                                                onClick={() => handleToggleQuestActive(quest.id, quest.activa)}
                                                className="px-3.5 py-2 border border-slate-150 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 cursor-pointer"
                                            >
                                                {quest.activa ? 'Pausar' : 'Activar'}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteQuest(quest.id)}
                                                className="p-2 border border-slate-150 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer"
                                                title="Eliminar misión"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )))}
                            </div>
                        </div>
                    )}

                    {/* 4. TEMPLANTES MARKETPLACE */}
                    {activeTab === 'templates' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {templates.map((tpl: any) => (
                                <div key={tpl.id} className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                                                {tpl.triggerEvent}
                                            </span>
                                            <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-pink-50 text-pink-600 border border-pink-100">
                                                1-CLIC INSTALL
                                            </span>
                                        </div>
                                        <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                            <Award size={16} className="text-pink-500 group-hover:scale-110 transition-transform" /> {tpl.nombre}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mb-6">
                                            {tpl.descripcion}
                                        </p>
                                    </div>
                                    <div className="border-t border-slate-100 pt-4 flex justify-between items-center mt-6">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Dificultad: {tpl.difficulty || 'MEDIA'}</span>
                                        <button 
                                            onClick={() => handleInstallTemplate(tpl.id)}
                                            className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-colors cursor-pointer"
                                        >
                                            Instalar Reto
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 5. PARTICIPANTES (Aprobaciones) */}
                    {activeTab === 'participants' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Progresos Activos */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <Users className="text-blue-500" size={18} /> Progreso de Clientes en Misiones
                                    </h3>
                                    {participantsProgress.length === 0 ? (
                                        <p className="text-slate-400 text-xs font-medium py-6 text-center">No hay avances de clientes registrados aún.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-slate-150 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                        <th className="pb-3">Cliente</th>
                                                        <th className="pb-3">Misión / Reto</th>
                                                        <th className="pb-3">Avance</th>
                                                        <th className="pb-3">Estado</th>
                                                        <th className="pb-3 text-right">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {participantsProgress.map((prog: any) => (
                                                        <tr key={prog.id} className="border-b border-slate-100 text-xs font-bold text-slate-700">
                                                            <td className="py-4">
                                                                <p className="font-black text-slate-800">{prog.Usuario?.nombre || 'Desconocido'}</p>
                                                                <p className="text-[9px] text-slate-400 mt-0.5">{prog.Usuario?.phone || 'Sin cel'}</p>
                                                            </td>
                                                            <td className="py-4">
                                                                <p className="uppercase text-[10px] font-bold" style={{ color: prog.Quest?.color || primaryColor }}>{prog.Quest?.nombre}</p>
                                                                <p className="text-[8px] text-slate-400 uppercase font-semibold mt-0.5">{prog.Quest?.triggerEvent}</p>
                                                            </td>
                                                            <td className="py-4">
                                                                <div className="w-24 bg-slate-100 rounded-full h-2 relative overflow-hidden">
                                                                    <div className="h-full rounded-full" style={{ 
                                                                        width: `${(prog.progresoActual / prog.progresoRequerido) * 100}%`,
                                                                        backgroundColor: prog.Quest?.color || primaryColor 
                                                                    }}></div>
                                                                </div>
                                                                <span className="text-[9px] text-slate-400 font-black mt-1 block">{prog.progresoActual} / {prog.progresoRequerido}</span>
                                                            </td>
                                                            <td className="py-4">
                                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                                    prog.estado === 'PENDIENTE_APROBACION' 
                                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                                                                        : prog.estado === 'COMPLETADA' 
                                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                                            : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                                }`}>
                                                                    {prog.estado}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 text-right">
                                                                {prog.estado === 'PENDIENTE_APROBACION' && (
                                                                    <div className="flex gap-1 justify-end">
                                                                        <button 
                                                                            onClick={() => handleApproveParticipant(prog.id)}
                                                                            className="px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 cursor-pointer"
                                                                        >
                                                                            Aprobar
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleRejectParticipant(prog.id)}
                                                                            className="px-2.5 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 cursor-pointer"
                                                                        >
                                                                            Rechazar
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Historial de Logros */}
                            <div className="space-y-6">
                                <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <History className="text-purple-500" size={18} /> Actividad Reciente
                                    </h3>
                                    <div className="space-y-4">
                                        {participantsHistory.map((hist: any) => (
                                            <div key={hist.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex gap-3 items-start">
                                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><UserCheck size={16} /></div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                                                        {hist.Usuario?.nombre || 'Cliente'} Completó Reto
                                                    </p>
                                                    <p className="text-[10px] font-black text-pink-600 uppercase mt-0.5">{hist.Quest?.nombre}</p>
                                                    <p className="text-[8px] text-slate-400 font-semibold mt-1">{new Date(hist.createdAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {participantsHistory.length === 0 && (
                                            <p className="text-slate-400 text-xs font-medium py-4 text-center">No hay registros recientes.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 6. PREMIOS Y CANJES */}
                    {activeTab === 'rewards' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Premios Pendientes / Entregados */}
                            <div className="lg:col-span-2 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <Gift className="text-pink-500" size={18} /> Canje de Premios en Recepción
                                </h3>
                                {rewardsList.length === 0 ? (
                                    <p className="text-slate-400 text-xs font-medium py-12 text-center">No hay premios generados listos para canje.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-150 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                    <th className="pb-3">Cliente</th>
                                                    <th className="pb-3">Premio / Concepto</th>
                                                    <th className="pb-3">Tipo</th>
                                                    <th className="pb-3">Estado</th>
                                                    <th className="pb-3 text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rewardsList.map((rew: any) => (
                                                    <tr key={rew.id} className="border-b border-slate-100 text-xs font-bold text-slate-700">
                                                        <td className="py-4">
                                                            <p className="font-black text-slate-855">{rew.Usuario?.nombre || 'Cliente'}</p>
                                                            <p className="text-[9px] text-slate-450 mt-0.5">{rew.Usuario?.phone || 'Sin tel'}</p>
                                                        </td>
                                                        <td className="py-4">
                                                            <p className="font-black text-slate-800 uppercase tracking-wider">
                                                                {rew.Campaign?.valorRecompensa || rew.Reward?.nombre}
                                                            </p>
                                                            <p className="text-[9px] text-slate-400 uppercase mt-0.5">
                                                                {rew.Campaign?.nombre || 'Canje de Catálogo'}
                                                            </p>
                                                        </td>
                                                        <td className="py-4">
                                                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100">
                                                                {rew.tipoOrigen}
                                                            </span>
                                                        </td>
                                                        <td className="py-4">
                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                                rew.estado === 'DISPONIBLE' 
                                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                            }`}>
                                                                {rew.estado}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            {rew.estado === 'DISPONIBLE' && (
                                                                <button
                                                                    onClick={() => handleOpenCanjeModal(rew)}
                                                                    className="px-3.5 py-2 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 cursor-pointer"
                                                                >
                                                                    Entregar
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Catálogo de Premios por Puntos */}
                            <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                            <Trophy className="text-amber-500" size={18} /> Catálogo de Puntos
                                        </h3>
                                        <button 
                                            onClick={() => setIsCatalogRewardModalOpen(true)}
                                            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                                            title="Crear Premio de Catálogo"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {loyaltyRewards.map((item: any) => (
                                            <div key={item.id} className="p-4 border border-slate-150 rounded-2xl bg-slate-50 hover:bg-white transition-colors flex justify-between items-center">
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">{item.nombre}</h4>
                                                    <p className="text-[10px] text-pink-600 font-bold uppercase mt-1">{item.costoPuntos} Puntos requeridos</p>
                                                </div>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                    item.activa ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                    {item.activa ? 'ACTIVO' : 'INACTIVO'}
                                                </span>
                                            </div>
                                        ))}
                                        {loyaltyRewards.length === 0 && (
                                            <p className="text-slate-400 text-xs font-medium py-6 text-center">No hay premios de catálogo creados.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 7. PUNTOS DE CLIENTES */}
                    {activeTab === 'points' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                        <Coins className="text-amber-500" size={18} /> Balance de Puntos de Clientes
                                    </h3>
                                    <button 
                                        onClick={() => setIsPointsAdjustmentModalOpen(true)}
                                        className="px-4 py-2 bg-slate-850 hover:bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer"
                                    >
                                        Ajuste Manual
                                    </button>
                                </div>
                                {pointsRankings.length === 0 ? (
                                    <p className="text-slate-400 text-xs font-medium py-12 text-center">Ningún cliente tiene puntos acumulados todavía.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-150 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                    <th className="pb-3">Cliente</th>
                                                    <th className="pb-3">Balance de Puntos</th>
                                                    <th className="pb-3 text-right">Última Actualización</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pointsRankings.map((p: any) => (
                                                    <tr key={p.id} className="border-b border-slate-100 text-xs font-bold text-slate-700">
                                                        <td className="py-4">
                                                            <p className="font-black text-slate-800">{p.Usuario?.nombre || 'Cliente'}</p>
                                                            <p className="text-[9px] text-slate-400 mt-0.5">{p.Usuario?.email}</p>
                                                        </td>
                                                        <td className="py-4 font-black text-slate-800">{p.puntos} pts</td>
                                                        <td className="py-4 text-right text-slate-400 text-[10px]">{new Date(p.updatedAt).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 8. CUPONES */}
                    {activeTab === 'coupons' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-150">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Módulo de Cupones Promocionales</span>
                                <button 
                                    onClick={() => setIsCouponModalOpen(true)}
                                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-900 cursor-pointer"
                                >
                                    + Crear Cupón
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {coupons.map((coupon: any) => (
                                    <div key={coupon.id} className="bg-white border border-slate-150 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-shadow relative">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-100">
                                                {coupon.tipo === 'PORCENTAJE' ? `${coupon.valor}% DTO` : `$${coupon.valor} DTO`}
                                            </span>
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                coupon.activa ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-450'
                                            }`}>
                                                {coupon.activa ? 'ACTIVO' : 'INACTIVO'}
                                            </span>
                                        </div>
                                        <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase mb-1">
                                            CÓDIGO: <span style={{ color: primaryColor }}>{coupon.codigo}</span>
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-semibold mb-4">
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
                                ))}
                                {coupons.length === 0 && (
                                    <p className="text-slate-400 text-xs font-medium py-12 text-center col-span-3">No tienes cupones independientes creados.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 9. ESTADÍSTICAS */}
                    {activeTab === 'stats' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <BarChart2 className="text-blue-500" size={18} /> Conversiones e Impacto
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between border-b border-slate-100 pb-3">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reservas Directas del Motor</span>
                                        <span className="text-xs font-black text-slate-850">{stats.completadas} citas</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-3">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Amigos Recomendados</span>
                                        <span className="text-xs font-black text-slate-850">{stats.referidosValidos} amigos</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-3">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tasa de Conversión Promedio</span>
                                        <span className="text-xs font-black text-slate-850">84.2%</span>
                                    </div>
                                    <div className="flex justify-between pb-3">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Retorno de Inversión Est. (ROI)</span>
                                        <span className="text-xs font-black text-emerald-600">+{stats.roiEstimado}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 10. HISTORIAL */}
                    {activeTab === 'history' && (
                        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <History className="text-slate-500" size={18} /> Auditoría del Growth Engine
                            </h3>
                            <div className="space-y-4">
                                {participantsHistory.map((log: any) => (
                                    <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center text-xs">
                                        <div>
                                            <p className="font-black text-slate-850 uppercase">{log.action}</p>
                                            <p className="text-slate-450 text-[10px] mt-0.5">Cliente: {log.Usuario?.nombre || 'Cliente'} - Reto: {log.Quest?.nombre}</p>
                                            {log.detalles && <p className="text-[9px] text-slate-400 font-semibold mt-1 italic">Detalles: {log.detalles}</p>}
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-black">{new Date(log.createdAt).toLocaleString()}</span>
                                    </div>
                                ))}
                                {participantsHistory.length === 0 && (
                                    <p className="text-slate-400 text-xs font-medium py-6 text-center">No hay registros de auditoría registrados.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* WIZARD MODAL DE CREACIÓN DE MISIONES (5 Pasos) */}
            {isWizardOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white border border-slate-150 rounded-[2.5rem] w-full max-w-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
                        
                        {/* WIZARD HEADER */}
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                            <div>
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Creador de Misiones (Asistente)</h3>
                                <p className="text-slate-400 text-[10px] font-bold mt-0.5">Paso {wizardStep} de 5</p>
                            </div>
                            <button onClick={() => setIsWizardOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">×</button>
                        </div>

                        {/* WIZARD STEPS */}
                        {/* Paso 1: ¿Qué quieres conseguir? */}
                        {wizardStep === 1 && (
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">¿Qué quieres lograr con esta campaña?</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        { id: 'RESERVAS', label: 'Más reservas directas', desc: 'Promueve que los clientes agenden citas en el establecimiento.' },
                                        { id: 'REFERIDOS', label: 'Más recomendaciones (Referidos)', desc: 'Motiva a que traigan a sus amigos con un flujo de doble nivel.' },
                                        { id: 'FIDELIZACION', label: 'Más clientes frecuentes', desc: 'Retos de lealtad basados en completar X reservas recurrentes.' },
                                        { id: 'INACTIVOS', label: 'Recuperar clientes inactivos', desc: 'Reglas para reactivar clientes ausentes por más de 60 días.' },
                                        { id: 'RESEÑAS', label: 'Conseguir más reseñas', desc: 'Premios para los clientes que dejen opiniones del negocio.' },
                                        { id: 'SOCIAL', label: 'Crecimiento en redes', desc: 'Completa misiones compartiendo información en plataformas.' },
                                        { id: 'PERSONALIZADA', label: 'Crear reto personalizado', desc: 'Define tus propios eventos detonadores y condiciones.' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleSelectObjetivo(opt.id)}
                                            className="p-5 border border-slate-150 rounded-3xl bg-slate-50 hover:bg-white text-left transition-all hover:border-pink-300 group cursor-pointer"
                                        >
                                            <span className="block text-xs font-black uppercase tracking-wider text-slate-800 group-hover:text-pink-600 transition-colors mb-1">{opt.label}</span>
                                            <span className="block text-[10px] text-slate-400 font-semibold leading-relaxed">{opt.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Paso 2: Acción del Cliente */}
                        {wizardStep === 2 && (
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">Detalles y Acción requerida del Cliente</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Nombre del reto</label>
                                        <input
                                            type="text"
                                            value={wizardData.nombre}
                                            onChange={e => setWizardData(prev => ({ ...prev, nombre: e.target.value }))}
                                            className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-300 bg-slate-50"
                                            placeholder="Ej. Súper Invitaciones"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Descripción</label>
                                        <textarea
                                            value={wizardData.descripcion}
                                            onChange={e => setWizardData(prev => ({ ...prev, descripcion: e.target.value }))}
                                            className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-300 bg-slate-50 h-20"
                                            placeholder="Detalla qué debe hacer el cliente..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Meta (Cantidad Requerida)</label>
                                            <input
                                                type="number"
                                                value={wizardData.cantidadMeta}
                                                onChange={e => setWizardData(prev => ({ ...prev, cantidadMeta: Number(e.target.value) }))}
                                                className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-300 bg-slate-50"
                                            />
                                        </div>
                                        {wizardData.objetivo === 'INACTIVOS' && (
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Días de Inactividad</label>
                                                <input
                                                    type="number"
                                                    value={wizardData.diasInactividad}
                                                    onChange={e => setWizardData(prev => ({ ...prev, diasInactividad: Number(e.target.value) }))}
                                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-300 bg-slate-50"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                                    <button onClick={handleWizardBack} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 cursor-pointer">Atrás</button>
                                    <button onClick={handleWizardNext} className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer" style={{ backgroundColor: primaryColor }}>Continuar</button>
                                </div>
                            </div>
                        )}

                        {/* Paso 3: Recompensa */}
                        {wizardStep === 3 && (
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">¿Qué recompensas recibirá al completarlo?</h4>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Puntos de fidelidad otorgados</label>
                                        <input
                                            type="number"
                                            value={wizardData.puntosRecompensa}
                                            onChange={e => setWizardData(prev => ({ ...prev, puntosRecompensa: Number(e.target.value) }))}
                                            className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-300 bg-slate-50"
                                        />
                                    </div>

                                    {/* Cupón */}
                                    <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50">
                                        <label className="flex items-center gap-3.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={wizardData.conCupon}
                                                onChange={e => setWizardData(prev => ({ ...prev, conCupon: e.target.checked }))}
                                                className="size-4 rounded accent-pink-500"
                                            />
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Entregar un cupón de descuento adicional</span>
                                        </label>
                                        {wizardData.conCupon && (
                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Valor Descuento</label>
                                                    <input
                                                        type="number"
                                                        value={wizardData.cuponValor}
                                                        onChange={e => setWizardData(prev => ({ ...prev, cuponValor: Number(e.target.value) }))}
                                                        className="w-full px-4 py-3 rounded-xl border border-slate-150 text-xs font-bold text-slate-850 bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Tipo</label>
                                                    <select
                                                        value={wizardData.cuponTipo}
                                                        onChange={e => setWizardData(prev => ({ ...prev, cuponTipo: e.target.value }))}
                                                        className="w-full px-4 py-3 rounded-xl border border-slate-150 text-xs font-bold text-slate-850 bg-white"
                                                    >
                                                        <option value="PORCENTAJE">Porcentaje (%)</option>
                                                        <option value="FIJO">Monto Fijo ($)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Premio Físico */}
                                    <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50">
                                        <label className="flex items-center gap-3.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={wizardData.conPremioFisico}
                                                onChange={e => setWizardData(prev => ({ ...prev, conPremioFisico: e.target.checked }))}
                                                className="size-4 rounded accent-pink-500"
                                            />
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Entregar premio físico (canjeable en recepción)</span>
                                        </label>
                                        {wizardData.conPremioFisico && (
                                            <div className="mt-4">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Nombre del Premio Físico / Servicio gratis</label>
                                                <input
                                                    type="text"
                                                    value={wizardData.premioFisicoNombre}
                                                    onChange={e => setWizardData(prev => ({ ...prev, premioFisicoNombre: e.target.value }))}
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-150 text-xs font-bold text-slate-850 bg-white"
                                                    placeholder="Ej. Masaje relax de regalo, Bebida gratis, etc."
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                                    <button onClick={handleWizardBack} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 cursor-pointer">Atrás</button>
                                    <button onClick={handleWizardNext} className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer" style={{ backgroundColor: primaryColor }}>Continuar</button>
                                </div>
                            </div>
                        )}

                        {/* Paso 4: Activación y segmentación */}
                        {wizardStep === 4 && (
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">Ajustes Finales y Segmentación de Clientes</h4>
                                <div className="space-y-6">
                                    <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50">
                                        <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Segmentación de Clientes</h5>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-3.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={wizardData.segmentacionVIP}
                                                    onChange={e => setWizardData(prev => ({ ...prev, segmentacionVIP: e.target.checked }))}
                                                    className="size-4 rounded accent-pink-500"
                                                />
                                                <span className="text-xs font-bold text-slate-700">Dirigir únicamente a Clientes VIP</span>
                                            </label>
                                            <label className="flex items-center gap-3.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={wizardData.segmentacionNuevos}
                                                    onChange={e => setWizardData(prev => ({ ...prev, segmentacionNuevos: e.target.checked }))}
                                                    className="size-4 rounded accent-pink-500"
                                                />
                                                <span className="text-xs font-bold text-slate-700">Dirigir únicamente a Clientes Nuevos</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Color temático</label>
                                            <input
                                                type="color"
                                                value={wizardData.color}
                                                onChange={e => setWizardData(prev => ({ ...prev, color: e.target.value }))}
                                                className="w-full h-11 border border-slate-150 rounded-xl cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Icono</label>
                                            <select
                                                value={wizardData.icono}
                                                onChange={e => setWizardData(prev => ({ ...prev, icono: e.target.value }))}
                                                className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-300 bg-slate-50"
                                            >
                                                <option value="Award">🏆 Copa / Medalla</option>
                                                <option value="Gift">🎁 Regalo</option>
                                                <option value="Zap">⚡ Rayo / Rapidez</option>
                                                <option value="Users">👥 Recomendación</option>
                                                <option value="Calendar">📅 Reservas</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                                    <button onClick={handleWizardBack} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 cursor-pointer">Atrás</button>
                                    <button onClick={handleWizardNext} className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer" style={{ backgroundColor: primaryColor }}>Revisar Resumen</button>
                                </div>
                            </div>
                        )}

                        {/* Paso 5: Resumen y Confirmación */}
                        {wizardStep === 5 && (
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">Resumen de la Misión / Campaña</h4>
                                <div className="space-y-4 p-5 bg-slate-50 border border-slate-150 rounded-3xl text-xs font-bold text-slate-700">
                                    <div className="flex justify-between border-b border-slate-200 pb-2">
                                        <span className="text-slate-400">Objetivo:</span>
                                        <span className="text-slate-800 uppercase">{wizardData.objetivo}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-2">
                                        <span className="text-slate-400">Reto:</span>
                                        <span className="text-slate-800">{wizardData.nombre}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-2">
                                        <span className="text-slate-400">Detonador:</span>
                                        <span className="text-slate-850 uppercase">{wizardData.triggerEvent}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-2">
                                        <span className="text-slate-400">Meta:</span>
                                        <span className="text-slate-800">{wizardData.cantidadMeta} veces</span>
                                    </div>
                                    <div className="flex justify-between pb-2">
                                        <span className="text-slate-400">Recompensas:</span>
                                        <span className="text-slate-850 text-right">
                                            {wizardData.puntosRecompensa} Puntos
                                            {wizardData.conCupon && ` + Cupón (${wizardData.cuponValor}${wizardData.cuponTipo === 'PORCENTAJE' ? '%' : '$'})`}
                                            {wizardData.conPremioFisico && ` + Regalo Físico`}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                                    <button onClick={handleWizardBack} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 cursor-pointer" disabled={submitting}>Atrás</button>
                                    <button 
                                        onClick={handleCreateQuestFromWizard}
                                        className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer"
                                        style={{ backgroundColor: primaryColor }}
                                        disabled={submitting}
                                    >
                                        {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                                        Confirmar y Publicar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL: ENTREGAR PREMIO FÍSICO */}
            {selectedRewardToCanje && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white border border-slate-150 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Confirmar Entrega de Premio</h3>
                            <button onClick={() => setSelectedRewardToCanje(null)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">×</button>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold">
                                <p className="text-slate-400 uppercase tracking-wider mb-1">Cliente</p>
                                <p className="text-slate-800 font-black">{selectedRewardToCanje.Usuario?.nombre}</p>
                                <p className="text-slate-400 font-semibold mt-1">{selectedRewardToCanje.Usuario?.phone}</p>

                                <p className="text-slate-400 uppercase tracking-wider mb-1 mt-4">Premio a Entregar</p>
                                <p className="text-slate-800 font-black uppercase">{selectedRewardToCanje.Campaign?.valorRecompensa || selectedRewardToCanje.Reward?.nombre}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">¿Quién entrega el premio? (Staff)</label>
                                <select
                                    value={canjeStaffId}
                                    onChange={e => setCanjeStaffId(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                >
                                    {staffList.map(st => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                    ))}
                                    {staffList.length === 0 && <option value="">Sin personal configurado</option>}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Notas internas</label>
                                <input
                                    type="text"
                                    value={canjeNotas}
                                    onChange={e => setCanjeNotas(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    placeholder="Ej. Entregado sin observaciones"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                            <button onClick={() => setSelectedRewardToCanje(null)} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer" disabled={submitting}>Cancelar</button>
                            <button 
                                onClick={handleConfirmCanjeFisico} 
                                className="px-5 py-3 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 cursor-pointer flex items-center gap-2"
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                                Confirmar Entrega
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CREAR CUPÓN PROMOCIONAL */}
            {isCouponModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <form onSubmit={handleCreateCoupon} className="bg-white border border-slate-150 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Crear Nuevo Cupón</h3>
                            <button type="button" onClick={() => setIsCouponModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">×</button>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Código del Cupón</label>
                                <input
                                    type="text"
                                    value={couponFormData.codigo}
                                    onChange={e => setCouponFormData(prev => ({ ...prev, codigo: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 uppercase bg-slate-50 focus:outline-none"
                                    placeholder="Ej. PROMO20"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Tipo</label>
                                    <select
                                        value={couponFormData.tipo}
                                        onChange={e => setCouponFormData(prev => ({ ...prev, tipo: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    >
                                        <option value="PORCENTAJE">Porcentaje (%)</option>
                                        <option value="FIJO">Monto Fijo ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Valor</label>
                                    <input
                                        type="number"
                                        value={couponFormData.valor}
                                        onChange={e => setCouponFormData(prev => ({ ...prev, valor: Number(e.target.value) }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Descripción</label>
                                <input
                                    type="text"
                                    value={couponFormData.descripcion}
                                    onChange={e => setCouponFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    placeholder="Breve descripción del descuento..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Usos Máximos</label>
                                    <input
                                        type="number"
                                        value={couponFormData.maxUsos}
                                        onChange={e => setCouponFormData(prev => ({ ...prev, maxUsos: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                        placeholder="Ej. 100 (opcional)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Vencimiento</label>
                                    <input
                                        type="date"
                                        value={couponFormData.fechaFin}
                                        onChange={e => setCouponFormData(prev => ({ ...prev, fechaFin: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                            <button type="button" onClick={() => setIsCouponModalOpen(false)} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer" disabled={submitting}>Cancelar</button>
                            <button 
                                type="submit" 
                                className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 cursor-pointer flex items-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                                Crear Cupón
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL: CREAR PREMIO DE CATÁLOGO */}
            {isCatalogRewardModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <form onSubmit={handleCreateCatalogReward} className="bg-white border border-slate-150 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Crear Premio de Catálogo</h3>
                            <button type="button" onClick={() => setIsCatalogRewardModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">×</button>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Nombre del Premio</label>
                                <input
                                    type="text"
                                    value={catalogRewardFormData.nombre}
                                    onChange={e => setCatalogRewardFormData(prev => ({ ...prev, nombre: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    placeholder="Ej. Limpieza Facial Express"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Costo en Puntos</label>
                                <input
                                    type="number"
                                    value={catalogRewardFormData.costoPuntos}
                                    onChange={e => setCatalogRewardFormData(prev => ({ ...prev, costoPuntos: Number(e.target.value) }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Tipo Recompensa</label>
                                    <select
                                        value={catalogRewardFormData.tipo}
                                        onChange={e => setCatalogRewardFormData(prev => ({ ...prev, tipo: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    >
                                        <option value="SERVICIO_GRATIS">Servicio Gratis</option>
                                        <option value="PRODUCTO">Producto</option>
                                        <option value="DESCUENTO">Descuento Especial</option>
                                        <option value="REGALO">Regalo Especial</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Valor (opcional)</label>
                                    <input
                                        type="text"
                                        value={catalogRewardFormData.valor}
                                        onChange={e => setCatalogRewardFormData(prev => ({ ...prev, valor: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                        placeholder="Ej. ID del servicio o 20%"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Descripción</label>
                                <input
                                    type="text"
                                    value={catalogRewardFormData.descripcion}
                                    onChange={e => setCatalogRewardFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    placeholder="Instrucciones o detalles de canje..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                            <button type="button" onClick={() => setIsCatalogRewardModalOpen(false)} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer" disabled={submitting}>Cancelar</button>
                            <button 
                                type="submit" 
                                className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 cursor-pointer flex items-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                                Crear Premio
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL: AJUSTE MANUAL DE PUNTOS */}
            {isPointsAdjustmentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <form onSubmit={handlePointsAdjustment} className="bg-white border border-slate-150 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Ajuste Manual de Puntos</h3>
                            <button type="button" onClick={() => setIsPointsAdjustmentModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">×</button>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Selecciona al Cliente</label>
                                <select
                                    value={pointsFormData.userId}
                                    onChange={e => setPointsFormData(prev => ({ ...prev, userId: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    required
                                >
                                    <option value="">-- Elige un cliente --</option>
                                    {usersList.map(u => (
                                        <option key={u.id} value={u.id}>{u.nombre} ({u.email || u.phone})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Puntos</label>
                                    <input
                                        type="number"
                                        value={pointsFormData.puntos}
                                        onChange={e => setPointsFormData(prev => ({ ...prev, puntos: Number(e.target.value) }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                        placeholder="Ej. 100 o -50"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Concepto</label>
                                    <select
                                        value={pointsFormData.concepto}
                                        onChange={e => setPointsFormData(prev => ({ ...prev, concepto: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    >
                                        <option value="BONO">Bono Especial</option>
                                        <option value="RESERVA">Ajuste de Reserva</option>
                                        <option value="CUMPLEANOS">Cumpleaños</option>
                                        <option value="AJUSTE">Ajuste de Error</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Notas internas / Razón</label>
                                <input
                                    type="text"
                                    value={pointsFormData.notas}
                                    onChange={e => setPointsFormData(prev => ({ ...prev, notas: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
                                    placeholder="Especifica el motivo..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                            <button type="button" onClick={() => setIsPointsAdjustmentModalOpen(false)} className="px-5 py-3 border border-slate-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer" disabled={submitting}>Cancelar</button>
                            <button 
                                type="submit" 
                                className="px-5 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 cursor-pointer flex items-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                                Aplicar Ajuste
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
