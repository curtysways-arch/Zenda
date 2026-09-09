"use client";

import { useState, useEffect } from "react";
import { 
    Zap, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    ArrowUpCircle, 
    Package, 
    TrendingUp,
    RefreshCw,
    Users,
    X,
    Plus,
    ShoppingBag,
    Store,
    Tag,
    MessageSquare,
    Key,
    Shield,
    Sparkles,
    Layers,
    Info,
    Check,
    Loader2
} from "lucide-react";
import UpgradeModal from "@/components/ui/UpgradeModal";
import { getFormattedPlanFeatures } from "@/lib/planFeaturesHelper";

interface PlanDashboardClientProps {
    data: any;
    allPlans: any[];
    currentPlanId?: string | null;
    businessName: string;
    businessId: string;
    tipoNegocio?: string;
    adminWhatsApp: string;
    annualDiscount: number;
}

export default function PlanDashboardClient({
    data,
    allPlans = [],
    currentPlanId,
    businessName,
    businessId,
    tipoNegocio = 'GENERAL',
    adminWhatsApp,
    annualDiscount = 0.20
}: PlanDashboardClientProps) {
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isRenewalModal, setIsRenewalModal] = useState(false);

    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

    // Estado para Add-ons canónicos
    const [addonsData, setAddonsData] = useState<{
        availableAddons: any[];
        activeSubscriptions: any[];
        pricingDetails: any;
    }>({ availableAddons: [], activeSubscriptions: [], pricingDetails: null });
    const [loadingAddons, setLoadingAddons] = useState(true);
    const [actionAddonCode, setActionAddonCode] = useState<string | null>(null);

    const fetchAddonsData = async () => {
        try {
            setLoadingAddons(true);
            const res = await fetch(`/api/admin/addons?businessId=${businessId}`);
            if (res.ok) {
                const json = await res.json();
                setAddonsData({
                    availableAddons: json.availableAddons || [],
                    activeSubscriptions: json.activeSubscriptions || [],
                    pricingDetails: json.pricingDetails || null
                });
            }
        } catch (e) {
            console.error("Error fetching addons data:", e);
        } finally {
            setLoadingAddons(false);
        }
    };

    useEffect(() => {
        fetchAddonsData();
    }, [businessId]);

    const handlePurchaseAddon = async (addonCode: string) => {
        try {
            setActionAddonCode(addonCode);
            const res = await fetch('/api/admin/addons/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addonCodeOrId: addonCode, quantity: 1 })
            });
            const resJson = await res.json();
            if (res.ok) {
                alert(resJson.message || 'Add-on contratado correctamente');
                await fetchAddonsData();
            } else {
                alert(resJson.error || 'Error al contratar Add-on');
            }
        } catch (e) {
            alert('Error de conexión');
        } finally {
            setActionAddonCode(null);
        }
    };

    const handleCancelAddon = async (subscriptionAddonId: string) => {
        if (!confirm('¿Deseas programar la cancelación de este Add-on para el final de tu ciclo de facturación? Mantendrás el beneficio hasta esa fecha.')) return;
        try {
            setActionAddonCode(subscriptionAddonId);
            const res = await fetch(`/api/admin/addons/${subscriptionAddonId}/cancel`, {
                method: 'POST'
            });
            const resJson = await res.json();
            if (res.ok) {
                alert(resJson.message || 'Cancelación programada para el final del ciclo');
                await fetchAddonsData();
            } else {
                alert(resJson.error || 'Error al solicitar cancelación');
            }
        } catch (e) {
            alert('Error de conexión');
        } finally {
            setActionAddonCode(null);
        }
    };

    const planName = data?.planName || 'Plan Pro';
    const planStatus = data?.planStatus || 'active';
    const startDate = data?.startDate;
    const endDate = data?.endDate;
    const lockedPrice = data?.lockedPrice;
    
    const limits = data?.limits || {};
    const safeLimits = {
        staff: limits?.staff || { used: 0, max: 10, percentage: 0 },
        appointments: limits?.appointments || { used: 0, max: 500, percentage: 0 },
        services: limits?.services || { used: 0, max: 20, percentage: 0 },
        locations: limits?.locations || { used: 0, max: 2, percentage: 0 }
    };

    const isRestaurant = tipoNegocio === 'RESTAURANTE' || tipoNegocio === 'BAR' || tipoNegocio === 'GASTRONOMIA' || tipoNegocio === 'ORDERS';
    const isCourt = tipoNegocio === 'SPORTS_COURTS' || tipoNegocio === 'CANCHAS' || tipoNegocio === 'SPORTS';

    const staffLabel = isRestaurant ? "Personal / Usuarios" : isCourt ? "Personal / Accesos" : "Profesionales";
    const usageLabel = isRestaurant ? "Órdenes del Mes" : isCourt ? "Reservas del Mes" : "Citas del Mes";

    // Calcular días restantes reales basados en la fecha de corte (endDate)
    let daysUntilExpiry: number | null = null;
    let showRenewal = false;

    if (endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        
        const diffTime = end.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        daysUntilExpiry = diffDays < 0 ? 0 : diffDays;
        
        // Mostrar alerta de renovación si faltan 7 días o menos, o si el plan ya expiró
        showRenewal = daysUntilExpiry <= 7 || planStatus === 'expired';
    } else {
        showRenewal = planStatus === 'expired';
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'trial': return { backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)', borderColor: 'color-mix(in srgb, var(--primary-color), transparent 85%)' };
            case 'active': return { backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)', borderColor: 'color-mix(in srgb, var(--primary-color), transparent 85%)' };
            case 'expired': return { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(185, 28, 28)', borderColor: 'rgba(239, 68, 68, 0.2)' };
            case 'pendiente': return { backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'rgb(194, 65, 12)', borderColor: 'rgba(249, 115, 22, 0.2)' };
            default: return { backgroundColor: 'rgb(241, 245, 249)', color: 'rgb(51, 65, 85)', borderColor: 'rgb(226, 232, 240)' };
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'trial': return 'Periodo de Prueba';
            case 'active': return 'Plan Activo';
            case 'expired': return 'Expirado';
            case 'pendiente': return 'En Verificación';
            default: return status;
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500 text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Mi Plan de Suscripción</h2>
                    <p className="text-slate-500 mt-1">Gestiona tu suscripción, controla tus límites y explora beneficios.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-extra-bold border flex items-center gap-2`}
                          style={getStatusStyle(planStatus)}>
                        <div className={`w-2 h-2 rounded-full animate-pulse`}
                             style={planStatus === 'active' || planStatus === 'trial' ? { backgroundColor: 'var(--primary-color)' } : { backgroundColor: 'rgb(239, 68, 68)' }} />
                        {getStatusLabel(planStatus).toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Banner de expiración / renovación */}
            {showRenewal && (
                <div className={`p-6 rounded-[2rem] border flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300`}
                     style={planStatus === 'expired' 
                         ? { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'rgb(185, 28, 28)' }
                         : { backgroundColor: 'rgba(249, 115, 22, 0.05)', borderColor: 'rgba(249, 115, 22, 0.2)', color: 'rgb(194, 65, 12)' }
                     }>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl flex-shrink-0 ${planStatus === 'expired' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h4 className="font-black uppercase tracking-widest text-xs mb-1">
                                {planStatus === 'expired' ? 'Suscripción Expirada' : 'Suscripción por Vencer'}
                            </h4>
                            <p className="text-sm font-bold opacity-90">
                                {planStatus === 'expired' 
                                    ? 'Tu acceso a las funciones de pago ha sido suspendido. Renueva tu plan para continuar operando sin interrupciones.'
                                    : `Tu suscripción vencerá en ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'día' : 'días'}. Renueva tu plan para asegurar la continuidad del servicio.`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (currentPlanId) {
                                setSelectedPlanId(currentPlanId);
                                setIsRenewalModal(true);
                                setIsUpgradeModalOpen(true);
                            }
                        }}
                        className={`px-6 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 flex-shrink-0 cursor-pointer`}
                        style={planStatus === 'expired'
                            ? { backgroundColor: 'rgb(185, 28, 28)', color: 'white' }
                            : { backgroundColor: 'rgb(194, 65, 12)', color: 'white' }
                        }
                    >
                        <RefreshCw size={16} />
                        Renovar Plan
                    </button>
                </div>
            )}

            {/* Card Principal */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 hover:border-slate-300">
                <div className="grid grid-cols-1 lg:grid-cols-12">
                    {/* Detalles del Plan */}
                    <div className="lg:col-span-4 p-8 lg:border-r border-slate-100 bg-slate-50/50">
                        <div className="p-4 bg-white rounded-2xl w-fit mb-8 shadow-sm border border-slate-100" style={{ color: 'var(--primary-color)' }}>
                            <Package size={32} />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--primary-color)' }}>Nivel de Cuenta</h3>
                        <h4 className="text-3xl lg:text-4xl font-black text-slate-900 mb-8">{planName}</h4>

                        <div className="space-y-5">
                             <div className="flex items-center gap-4 group/item">
                                <div className="p-2 bg-white rounded-xl text-slate-400 group-hover/item:text-slate-900 transition-colors shadow-sm">
                                    <Clock size={18} />
                                </div>
                                <div className="text-sm">
                                    <span className="block font-black text-slate-400 uppercase tracking-tighter text-[10px]">Inicia el</span>
                                    <span className="font-bold text-slate-700">{startDate ? new Date(startDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                             <div className="flex items-center gap-4 group/item">
                                <div className="p-2 bg-white rounded-xl text-slate-400 group-hover/item:text-slate-900 transition-colors shadow-sm">
                                    <Calendar size={18} />
                                </div>
                                <div className="text-sm">
                                    <span className="block font-black text-slate-400 uppercase tracking-tighter text-[10px]">Día de corte</span>
                                    <span className="font-bold text-slate-700">{endDate ? new Date(endDate).toLocaleDateString() : 'Plan de por vida'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 space-y-3">
                            {showRenewal && (
                                <button
                                    onClick={() => {
                                        if (currentPlanId) {
                                            setSelectedPlanId(currentPlanId);
                                            setIsRenewalModal(true);
                                            setIsUpgradeModalOpen(true);
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-3 py-4 font-black rounded-2xl transition-all shadow-md active:scale-95 border-2 border-dashed cursor-pointer"
                                    style={{ 
                                        borderColor: 'var(--primary-color)',
                                        color: 'var(--primary-color)',
                                        backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)'
                                    }}
                                >
                                    <RefreshCw size={22} />
                                    Renovar Plan
                                </button>
                            )}

                             <button
                                onClick={() => {
                                    const section = document.getElementById('available-plans-section');
                                    if (section) section.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="w-full flex items-center justify-center gap-3 py-4 text-white font-black rounded-2xl transition-all shadow-lg active:scale-95 cursor-pointer"
                                style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--primary-color), transparent 80%)' }}
                            >
                                <ArrowUpCircle size={22} />
                                Mejorar Plan
                            </button>
                        </div>
                    </div>

                    {/* Consumo y Límites */}
                    <div className="lg:col-span-8 p-8 md:p-10 flex flex-col justify-center bg-white">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                <TrendingUp size={24} className="text-slate-400" />
                                Uso Mensual
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="p-6 bg-slate-50 rounded-3xl group/metric hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-slate-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg transition-colors"
                                         style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}>
                                        <Users size={16} />
                                    </div>
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{staffLabel}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-900">{safeLimits.staff.used}</span>
                                    <span className="text-sm font-bold text-slate-400">/ {safeLimits.staff.max >= 999999 ? '∞' : safeLimits.staff.max}</span>
                                </div>
                                 <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
                                     <div 
                                        className={`h-full transition-all duration-1000`} 
                                        style={{ width: `${Math.min(safeLimits.staff.percentage, 100)}%`, backgroundColor: safeLimits.staff.percentage >= 90 ? 'rgb(244, 63, 94)' : 'var(--primary-color)' }} 
                                     />
                                </div>
                            </div>

                             <div className="p-6 bg-slate-50 rounded-3xl group/metric hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-slate-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg transition-colors"
                                         style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}>
                                        <Calendar size={16} />
                                    </div>
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{usageLabel}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-900">{safeLimits.appointments.used}</span>
                                    <span className="text-sm font-bold text-slate-400">/ {safeLimits.appointments.max >= 999999 ? '∞' : safeLimits.appointments.max}</span>
                                </div>
                                 <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
                                     <div 
                                        className={`h-full transition-all duration-1000`} 
                                        style={{ width: `${Math.min(safeLimits.appointments.percentage, 100)}%`, backgroundColor: safeLimits.appointments.percentage >= 90 ? 'rgb(244, 63, 94)' : 'var(--primary-color)' }} 
                                     />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════════════════════════
                SECCIÓN: RESUMEN FINANCIERO CONSOLIDADO & MIS ADD-ONS ACTIVOS
            ════════════════════════════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                                <Sparkles size={18} />
                            </span>
                            <h3 className="text-xl font-black text-slate-900">Resumen de Facturación Consolidada</h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                            Desglose de tu tarifa mensual contractual protegida y los módulos complementarios activos
                        </p>
                    </div>

                    {addonsData.pricingDetails && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-6 shrink-0">
                            <div>
                                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Plan Base</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-slate-900">
                                        ${Number(addonsData.pricingDetails.basePlanPrice ?? 0).toFixed(2)}
                                    </span>
                                    <span className="text-xs text-slate-400 font-bold">/m</span>
                                </div>
                                {addonsData.pricingDetails.isFounder && (
                                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block mt-0.5">
                                        ★ Tarifa Fundador
                                    </span>
                                )}
                            </div>

                            <div className="text-slate-300 font-black text-xl">+</div>

                            <div>
                                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Add-ons ({addonsData.pricingDetails.addons?.length || 0})</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-slate-900">
                                        +${Number(addonsData.pricingDetails.addonsTotal ?? 0).toFixed(2)}
                                    </span>
                                    <span className="text-xs text-slate-400 font-bold">/m</span>
                                </div>
                            </div>

                            <div className="text-slate-300 font-black text-xl">=</div>

                            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
                                <span className="block text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--primary-color)' }}>
                                    Total Mensual
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-slate-900">
                                        ${Number(addonsData.pricingDetails.effectiveTotalMonthly ?? 0).toFixed(2)}
                                    </span>
                                    <span className="text-xs text-slate-400 font-bold">/m</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Subsección: Mis Add-ons Contratados */}
                <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <Layers size={14} /> Mis Módulos y Extensiones Contratadas
                    </h4>

                    {loadingAddons ? (
                        <div className="py-8 text-center text-slate-400 space-y-2">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                            <p className="text-xs font-bold uppercase tracking-wider">Consultando add-ons del negocio...</p>
                        </div>
                    ) : addonsData.activeSubscriptions.length === 0 ? (
                        <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                            <p className="text-xs font-bold text-slate-500">
                                No tienes Add-ons adicionales contratados. Tu plan cuenta con los beneficios de base.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {addonsData.activeSubscriptions.map((sa: any) => {
                                const isPendingCancel = sa.cancelAtPeriodEnd;
                                const unitPrice = Number(sa.priceContracted ?? sa.addon?.priceMonthly ?? 0);
                                const qty = Number(sa.quantity || 1);
                                const totalPrice = (unitPrice * qty).toFixed(2);
                                return (
                                    <div
                                        key={sa.id}
                                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                                            isPendingCancel
                                                ? 'bg-amber-50/40 border-amber-200'
                                                : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    isPendingCancel 
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                }`}>
                                                    {isPendingCancel ? 'Cancela al corte' : 'Activo'}
                                                </span>
                                                <span className="font-mono font-black text-xs text-slate-900">
                                                    ${totalPrice}/m
                                                </span>
                                            </div>

                                            <div>
                                                <h5 className="font-black text-sm text-slate-900 leading-snug">
                                                    {sa.addon?.name || sa.addonCode}
                                                </h5>
                                                {qty > 1 && (
                                                    <span className="text-[11px] font-bold text-slate-500">
                                                        Cantidad: {qty} × ${unitPrice.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>

                                            {isPendingCancel && sa.effectiveUntil && (
                                                <p className="text-[11px] text-amber-700 font-medium">
                                                    Activo hasta: {new Date(sa.effectiveUntil).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>

                                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] font-mono text-slate-400">
                                                {sa.addon?.type === 'LIMIT' ? 'Extensión de Límite' : 'Capacidad Premium'}
                                            </span>

                                            {!isPendingCancel && (
                                                <button
                                                    onClick={() => handleCancelAddon(sa.id)}
                                                    disabled={actionAddonCode === sa.id}
                                                    className="text-xs font-black text-rose-600 hover:text-rose-700 hover:underline cursor-pointer disabled:opacity-50"
                                                >
                                                    {actionAddonCode === sa.id ? 'Procesando...' : 'Cancelar al corte'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════════════════════════
                SECCIÓN: MÓDULOS Y ADD-ONS DISPONIBLES PARA CONTRATAR
            ════════════════════════════════════════════════════════════════════════════════════════ */}
            <div className="pt-6 space-y-6">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                        Módulos y Add-ons Disponibles
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Potencia tu negocio incorporando módulos de venta, comunicaciones avanzadas o ampliaciones de límites sin necesidad de cambiar tu plan actual ni perder tus beneficios de Socio Fundador.
                    </p>
                </div>

                {loadingAddons ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
                        <p className="text-xs font-black uppercase tracking-widest">Cargando módulos disponibles...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {addonsData.availableAddons.map((item: any) => {
                            const addon = item.addon || item;
                            const addonCode = addon.code || item.code;
                            const addonId = addon.id || item.id || addonCode;
                            const isHiring = actionAddonCode === addonCode;
                            const isAvailable = item.available ?? addon.available ?? true;
                            const priceMonthly = Number(addon.priceMonthly ?? item.priceMonthly ?? 0);
                            const addonType = addon.type || item.type;
                            const addonName = addon.name || item.name;
                            const addonDesc = addon.description || item.description;
                            const targetKey = addon.targetKey || item.targetKey;
                            const amount = addon.amount ?? item.amount;
                            const ineligibilityReason = item.ineligibilityReason || addon.ineligibilityReason;

                            return (
                                <div
                                    key={addonId}
                                    className={`bg-white rounded-3xl p-6 border-2 transition-all flex flex-col justify-between ${
                                        isAvailable
                                            ? 'border-slate-200/80 hover:border-amber-400 hover:shadow-lg'
                                            : 'border-slate-200 bg-slate-50/40 opacity-75'
                                    }`}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                addonType === 'CAPABILITY'
                                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                            }`}>
                                                {addonType === 'CAPABILITY' ? '⚡ Módulo de Capacidad' : '📈 Extensión de Límite'}
                                            </span>

                                            <span className="font-mono font-black text-sm text-slate-900">
                                                ${priceMonthly.toFixed(2)}/mes
                                            </span>
                                        </div>

                                        <div>
                                            <h4 className="font-black text-base text-slate-900 leading-tight">
                                                {addonName}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                                                {addonDesc || 'Potencia tu negocio con este add-on.'}
                                            </p>
                                        </div>

                                        <div className="pt-2 text-xs space-y-1.5 border-t border-slate-100">
                                            <div className="flex justify-between text-slate-600 font-semibold">
                                                <span>Afecta:</span>
                                                <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                    {targetKey}
                                                </span>
                                            </div>
                                            {addonType === 'LIMIT' && (
                                                <div className="flex justify-between text-slate-600 font-semibold">
                                                    <span>Extensión:</span>
                                                    <span className="font-black text-emerald-600">+{amount} al límite</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-5 mt-4 border-t border-slate-100">
                                        {isAvailable ? (
                                            <button
                                                onClick={() => handlePurchaseAddon(addonCode)}
                                                disabled={isHiring}
                                                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                            >
                                                {isHiring ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" /> Contratando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-4 h-4" /> Agregar al Plan
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <div className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                                                <Check size={14} className="text-emerald-500" />
                                                {ineligibilityReason || 'Ya Activo en tu Plan'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Título de Planes Disponibles */}
             <div id="available-plans-section" className="pt-8 text-center">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2 italic underline" style={{ textDecorationColor: 'color-mix(in srgb, var(--primary-color), transparent 80%)' }}>Planes Disponibles</h3>
                <p className="text-slate-500 font-medium">Elige el plan que mejor se adapte a las necesidades de tu negocio.</p>
            </div>

            {/* Selector de periodo de facturación */}
            <div className="flex justify-center pt-8 pb-6">
                <div className="bg-slate-100 p-1.5 rounded-[1.5rem] flex items-center gap-1 border border-slate-200">
                     <button
                        onClick={() => setBillingPeriod('monthly')}
                        className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${billingPeriod === 'monthly' ? 'shadow-md bg-white text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setBillingPeriod('annual')}
                        className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${billingPeriod === 'annual' ? 'text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        style={billingPeriod === 'annual' ? { backgroundColor: 'var(--primary-color)' } : {}}
                    >
                        Anual
                        <span className="text-[9px] text-white px-2 py-0.5 rounded-full font-black" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>-{annualDiscount * 100}%</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                {allPlans.map((plan) => {
                    const isCurrent = plan.id === currentPlanId;
                    
                    const listMonthlyPrice = Number(plan.price || 0);
                    const listAnnualPrice = (listMonthlyPrice * 12 * (1 - annualDiscount)) / 12;
                    const displayListPrice = billingPeriod === 'monthly' ? listMonthlyPrice : listAnnualPrice;
                    const totalListAnnual = listMonthlyPrice * 12 * (1 - annualDiscount);

                    const hasLockedPrice = Boolean(isCurrent && lockedPrice !== null && lockedPrice !== undefined && Number(lockedPrice) < listMonthlyPrice);
                    const displayLockedPrice = hasLockedPrice 
                        ? (billingPeriod === 'monthly' ? Number(lockedPrice) : (Number(lockedPrice) * 12 * (1 - annualDiscount)) / 12)
                        : null;
                    const totalLockedAnnual = hasLockedPrice ? Number(lockedPrice) * 12 * (1 - annualDiscount) : null;

                    const currentPlan = allPlans.find(p => p.id === currentPlanId);
                    const currentPrice = Number(currentPlan?.price || 0);
                    const isSuperior = listMonthlyPrice > currentPrice;

                    return (
                         <div
                            key={plan.id}
                            className={`relative flex flex-col p-8 rounded-[2.5rem] border-2 transition-all duration-300 ${isCurrent
                                ? ''
                                : 'border-slate-100 bg-white hover:shadow-xl hover:-translate-y-1'
                                }`}
                            style={isCurrent ? { borderColor: 'var(--primary-color)', backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)' } : {}}
                        >
                             {isCurrent && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg"
                                     style={{ backgroundColor: 'var(--primary-color)' }}>
                                    Tu Plan Actual
                                </div>
                            )}

                            <div className="mb-6">
                                <h4 className="text-xl font-black text-slate-900 mb-1">{plan.name}</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                    {(() => {
                                        const usersLimit = plan.planLimits?.find((l: any) => l.limitKey === 'MAX_USERS')?.limitValue ?? (plan as any).maxStaff;
                                        if (usersLimit === -1 || usersLimit >= 999999) {
                                            return isRestaurant ? 'Usuarios Ilimitados' : 'Personal Ilimitado';
                                        }
                                        return `${usersLimit || 1} ${isRestaurant ? 'USUARIOS' : 'PROFESIONALES'}`;
                                    })()} • {plan.max_locations || 1} SEDE{(plan as any).max_locations > 1 ? 'S' : ''}
                                </p>
                            </div>

                            <div className="mb-8 border-b border-slate-50 pb-6">
                                <div className="flex flex-col gap-1">
                                    {hasLockedPrice && displayLockedPrice !== null ? (
                                        <div className="flex flex-col">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-slate-400 font-black line-through text-lg">${Number(displayListPrice ?? 0).toFixed(2)}</span>
                                                <span className="text-4xl font-black text-slate-900">${Number(displayLockedPrice ?? 0).toFixed(2)}</span>
                                                <span className="text-slate-400 font-bold text-sm">/mes</span>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-1">Tarifa Especial Congelada</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black text-slate-900">${Number(displayListPrice ?? 0).toFixed(2)}</span>
                                            <span className="text-slate-400 font-bold">/mes</span>
                                        </div>
                                    )}
                                </div>
                                 {billingPeriod === 'annual' && (
                                    <div className="mt-2 flex flex-col items-start">
                                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--primary-color)' }}>Facturado anualmente</span>
                                        <span className="text-xs font-bold text-slate-400 italic">
                                            ${Number(hasLockedPrice && totalLockedAnnual !== null ? totalLockedAnnual : totalListAnnual ?? 0).toFixed(2)} al año
                                        </span>
                                    </div>
                                )}
                            </div>

                             <div className="flex-1 space-y-3 mb-8 text-sm">
                                {getFormattedPlanFeatures(plan).map((feat, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        {feat.included ? (
                                            <div className="size-6 rounded-full border-2 border-indigo-500/30 bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600 mt-0.5 shadow-sm">
                                                <CheckCircle2 size={16} className="text-indigo-600 fill-indigo-100" />
                                            </div>
                                        ) : (
                                            <div className="size-6 rounded-full border-2 border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0 text-slate-300 mt-0.5">
                                                <X size={14} className="text-slate-300" />
                                            </div>
                                        )}
                                        <span className={`text-sm ${feat.included ? 'font-bold text-slate-900' : 'font-medium text-slate-400 opacity-60'}`}>
                                            <span className={`mr-2 ${feat.included ? '' : 'grayscale opacity-50'}`}>{feat.emoji}</span>
                                            {feat.text}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {isCurrent && billingPeriod === 'monthly' ? (
                                <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest text-center">
                                    Plan Actual (Mensual)
                                </div>
                             ) : (isCurrent && billingPeriod === 'annual') || isSuperior ? (
                                <button
                                    onClick={() => {
                                        setSelectedPlanId(plan.id);
                                        setIsUpgradeModalOpen(true);
                                    }}
                                    className="w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer"
                                    style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--primary-color), transparent 80%)' }}
                                >
                                    {isCurrent ? 'Pasar a Anual -20%' : 'Solicitar activación'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setSelectedPlanId(plan.id);
                                        setIsUpgradeModalOpen(true);
                                    }}
                                    className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 cursor-pointer"
                                >
                                    Cambiar Plan
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <UpgradeModal
                isOpen={isUpgradeModalOpen}
                onClose={() => {
                    setIsUpgradeModalOpen(false);
                    setSelectedPlanId(null);
                    setIsRenewalModal(false);
                }}
                planId={selectedPlanId || ''}
                planName={allPlans.find(p => p.id === selectedPlanId)?.name || ''}
                planPrice={allPlans.find(p => p.id === selectedPlanId)?.price || 0}
                isRenewal={isRenewalModal}
            />

        </div>
    );
}
