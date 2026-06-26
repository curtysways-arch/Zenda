"use client";

import { useEffect, useState } from "react";
import { 
    Zap, 
    Calendar, 
    MapPin, 
    Trophy, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    ArrowUpCircle, 
    Package, 
    TrendingUp,
    RefreshCw,
    Users
} from "lucide-react";
import Link from "next/link";
import UpgradeModal from "@/components/ui/UpgradeModal";


interface PlanDashboardClientProps {
    data: any;
    allPlans: any[];
    currentPlanId?: string | null;
    businessName: string;
    businessId: string;
    adminWhatsApp: string;
    annualDiscount: number;
}

export default function PlanDashboardClient({
    data,
    allPlans,
    currentPlanId,
    businessName,
    businessId,
    adminWhatsApp,
    annualDiscount = 0.20
}: PlanDashboardClientProps) {
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isRenewalModal, setIsRenewalModal] = useState(false);

    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
    const { planName, planStatus, startDate, endDate, lockedPrice, limits } = data;

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
        // Si no hay endDate (plan de por vida), solo mostramos si está expirado
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
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
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
                        className={`px-6 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 flex-shrink-0`}
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
                        <h4 className="text-4xl font-black text-slate-900 mb-8">{planName}</h4>

                        <div className="space-y-5">
                             <div className="flex items-center gap-4 group/item">
                                <div className="p-2 bg-white rounded-xl text-slate-400 group-hover/item:text-slate-900 transition-colors shadow-sm"
                                     onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-color)'}
                                     onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156, 163, 175)'}>
                                    <Clock size={18} />
                                </div>
                                <div className="text-sm">
                                    <span className="block font-black text-slate-400 uppercase tracking-tighter text-[10px]">Inicia el</span>
                                    <span className="font-bold text-slate-700">{startDate ? new Date(startDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                             <div className="flex items-center gap-4 group/item">
                                <div className="p-2 bg-white rounded-xl text-slate-400 group-hover/item:text-slate-900 transition-colors shadow-sm"
                                     onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-color)'}
                                     onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156, 163, 175)'}>
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
                                    className="w-full flex items-center justify-center gap-3 py-4 font-black rounded-2xl transition-all shadow-md active:scale-95 border-2 border-dashed"
                                    style={{ 
                                        borderColor: 'var(--primary-color)',
                                        color: 'var(--primary-color)',
                                        backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--primary-color), transparent 90%)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--primary-color), transparent 95%)';
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
                                className="w-full flex items-center justify-center gap-3 py-4 text-white font-black rounded-2xl transition-all shadow-lg active:scale-95"
                                style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--primary-color), transparent 80%)' }}
                                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                            >
                                <ArrowUpCircle size={22} />
                                Mejorar Plan
                            </button>
                        </div>
                    </div>

                    {/* Consumo y Límites */}
                    <div className="lg:col-span-8 p-10 flex flex-col justify-center bg-white">
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
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Profesionales</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-900">{limits.staff.used}</span>
                                    <span className="text-sm font-bold text-slate-400">/ {limits.staff.max >= 999999 ? '∞' : limits.staff.max}</span>
                                </div>
                                 <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
                                     <div 
                                        className={`h-full transition-all duration-1000`} 
                                        style={{ width: `${Math.min(limits.staff.percentage, 100)}%`, backgroundColor: limits.staff.percentage >= 90 ? 'rgb(244, 63, 94)' : 'var(--primary-color)' }} 
                                     />
                                </div>
                            </div>

                             <div className="p-6 bg-slate-50 rounded-3xl group/metric hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-slate-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg transition-colors"
                                         style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}>
                                        <Calendar size={16} />
                                    </div>
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Citas del Mes</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-900">{limits.appointments.used}</span>
                                    <span className="text-sm font-bold text-slate-400">/ {limits.appointments.max >= 999999 ? '∞' : limits.appointments.max}</span>
                                </div>
                                 <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
                                     <div 
                                        className={`h-full transition-all duration-1000`} 
                                        style={{ width: `${Math.min(limits.appointments.percentage, 100)}%`, backgroundColor: limits.appointments.percentage >= 90 ? 'rgb(244, 63, 94)' : 'var(--primary-color)' }} 
                                     />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Título de Planes Disponibles */}
             <div id="available-plans-section" className="pt-8 text-center">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2 italic underline" style={{ textDecorationColor: 'color-mix(in srgb, var(--primary-color), transparent 80%)' }}>Planes Disponibles</h3>
                <p className="text-slate-500 font-medium">Elige el plan que mejor se adapte a las necesidades de tu complejo.</p>
            </div>

            {/* Selector de periodo de facturación */}
            <div className="flex justify-center pt-12 pb-6">
                <div className="bg-slate-100 p-1.5 rounded-[1.5rem] flex items-center gap-1 border border-slate-200">
                     <button
                        onClick={() => setBillingPeriod('monthly')}
                        className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${billingPeriod === 'monthly' ? 'shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        style={billingPeriod === 'monthly' ? { backgroundColor: 'white', color: 'var(--primary-color)' } : {}}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setBillingPeriod('annual')}
                        className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${billingPeriod === 'annual' ? 'text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
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
                    
                    // Cálculo de precio dinámico (usar lockedPrice si es el plan actual y el negocio tiene precio especial congelado)
                    const monthlyPrice = (isCurrent && lockedPrice !== null && lockedPrice !== undefined)
                        ? lockedPrice
                        : plan.price;
                    const annualPrice = (monthlyPrice * 12 * (1 - annualDiscount)) / 12; // Efectivo mensual pagando anual
                    const displayPrice = billingPeriod === 'monthly' ? monthlyPrice : annualPrice;
                    const totalAnnual = monthlyPrice * 12 * (1 - annualDiscount);

                    const currentPlan = allPlans.find(p => p.id === currentPlanId);
                    const currentPrice = currentPlan?.price || 0;
                    const isSuperior = plan.price > currentPrice;

                    return (
                         <div
                            key={plan.id}
                            className={`relative flex flex-col p-8 rounded-[2.5rem] border-2 transition-all duration-300 ${isCurrent
                                ? ''
                                : 'border-slate-100 bg-white hover:shadow-xl hover:-translate-y-1'
                                }`}
                            style={isCurrent ? { borderColor: 'var(--primary-color)', backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)' } : {}}
                            onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                            onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.borderColor = 'rgb(241, 245, 249)'; }}
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
                                    {(plan as any).maxStaff >= 999999 ? 'Personal Ilimitado' : `${(plan as any).maxStaff} PROFESIONAL${(plan as any).maxStaff > 1 ? 'ES' : ''}`} • {plan.max_locations} SEDE{(plan as any).max_locations > 1 ? 'S' : ''}
                                </p>
                            </div>

                            <div className="mb-8 border-b border-slate-50 pb-6">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-slate-900">${displayPrice.toFixed(2)}</span>
                                    <span className="text-slate-400 font-bold">/mes</span>
                                </div>
                                 {billingPeriod === 'annual' && (
                                    <div className="mt-2 flex flex-col items-start">
                                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--primary-color)' }}>Facturado anualmente</span>
                                        <span className="text-xs font-bold text-slate-400 italic">${totalAnnual.toFixed(2)} al año</span>
                                    </div>
                                )}
                            </div>

                             <div className="flex-1 space-y-3 mb-8 text-sm font-medium text-slate-600">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={16} style={{ color: 'var(--primary-color)' }} />
                                    <span>{((plan as any).maxAppointmentsMonthly ?? (plan as any).max_reservations_per_month ?? 40) >= 999999 ? 'Citas ilimitadas' : `${(plan as any).maxAppointmentsMonthly ?? (plan as any).max_reservations_per_month ?? 40} citas mensuales`}</span>
                                </div>
                                {(() => {
                                    const getFeatureLabel = (key: string): string => {
                                        const labels: Record<string, string> = {
                                            whatsapp_notifications: "Notificaciones por WhatsApp",
                                            whatsapp_otp: "Seguridad OTP por WhatsApp",
                                            whatsapp_reminders: "Recordatorios automáticos",
                                            whatsapp_campaigns: "Campañas masivas",
                                            custom_colors: "Colores personalizados",
                                            custom_logo: "Logo propio",
                                            custom_phrases: "Frases personalizadas",
                                            remove_zenda_branding: "Sin marca de agua de CitiOx",
                                            analytics: "Reportes Avanzados",
                                            automation: "Automatizaciones",
                                            tournaments_module: "Módulo de Torneos",
                                            courses_module: "Módulo de Academia/Cursos",
                                            automatic_discounts: "Descuentos Automáticos",
                                            multi_staff: "Agenda Multi-profesional",
                                            multi_branch: "Múltiples Sucursales"
                                        };
                                        return labels[key] || key.replace(/_/g, ' ');
                                    };

                                    const features = (plan as any).features;
                                    if (!features) return [];
                                    
                                    let parsedFeatures = features;
                                    if (typeof features === 'string') {
                                        try {
                                            parsedFeatures = JSON.parse(features);
                                        } catch (e) {
                                            return [];
                                        }
                                    }

                                    let finalFeaturesList: string[] = [];
                                    if (Array.isArray(parsedFeatures)) {
                                        finalFeaturesList = parsedFeatures.map(f => getFeatureLabel(f));
                                    } else if (typeof parsedFeatures === 'object') {
                                        finalFeaturesList = Object.entries(parsedFeatures)
                                            .filter(([_, val]) => val === true)
                                            .map(([key]) => getFeatureLabel(key));
                                    }

                                    return finalFeaturesList.map((featLabel) => (
                                        <div key={featLabel} className="flex items-center gap-2">
                                            <CheckCircle2 size={16} style={{ color: 'var(--primary-color)' }} />
                                            <span className="capitalize">{featLabel}</span>
                                        </div>
                                    ));
                                })()}
                            </div>

                            {/* Lógica de botón corregida: permitir cambio a ANUAL aunque sea el mismo plan */}
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
                                    className="w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                    style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--primary-color), transparent 80%)' }}
                                    onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                                >
                                    {isCurrent ? 'Pasar a Anual -20%' : 'Solicitar activación'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setSelectedPlanId(plan.id);
                                        setIsUpgradeModalOpen(true);
                                    }}
                                    className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95"
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
