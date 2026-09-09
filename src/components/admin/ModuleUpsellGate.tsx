'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Sparkles, 
    Lock, 
    Zap, 
    Check, 
    ArrowRight, 
    Loader2, 
    ShieldCheck, 
    CreditCard,
    Clock,
    AlertCircle,
    LucideIcon
} from 'lucide-react';
import AddonCheckoutModal from '@/components/admin/AddonCheckoutModal';

export interface BenefitItem {
    title: string;
    desc: string;
    icon?: LucideIcon;
}

export interface StatItem {
    value: string;
    label: string;
}

export interface ModuleUpsellGateProps {
    children: React.ReactNode;
    capabilityKey: string;
    addonCode?: string;
    title: string;
    subtitle: string;
    badgeText?: string;
    icon?: LucideIcon;
    benefits?: BenefitItem[];
    stats?: StatItem[];
    recommendedPlanName?: string;
}

export default function ModuleUpsellGate({
    children,
    capabilityKey,
    addonCode,
    title,
    subtitle,
    badgeText = 'Módulo Profesional Citiox',
    icon: IconComponent,
    benefits = [],
    stats = [],
    recommendedPlanName = 'Plan Pro'
}: ModuleUpsellGateProps) {
    const [loading, setLoading] = useState(true);
    const [isAllowed, setIsAllowed] = useState(false);
    const [addon, setAddon] = useState<any>(null);
    const [subscriptionDates, setSubscriptionDates] = useState<any>(null);
    const [isPendingPayment, setIsPendingPayment] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [primaryColor, setPrimaryColor] = useState<string>('#0ea5e9');

    const checkEntitlements = async () => {
        try {
            const [resEnt, resNeg, resAddons] = await Promise.all([
                fetch('/api/admin/entitlements'),
                fetch('/api/negocio'),
                fetch('/api/admin/addons')
            ]);

            if (resNeg.ok) {
                const negData = await resNeg.json();
                if (negData.colorPrimario) setPrimaryColor(negData.colorPrimario);
            }

            let allowed = false;
            if (resEnt.ok) {
                const entData = await resEnt.json();
                const caps = entData?.entitlements?.capabilities || {};
                
                // Normalización de claves (mayúsculas, minúsculas y alias)
                const targetKeyUpper = capabilityKey.toUpperCase();
                const targetKeyLower = capabilityKey.toLowerCase();
                
                if (caps[targetKeyUpper] === true || caps[targetKeyLower] === true) {
                    allowed = true;
                } else if (targetKeyUpper === 'COMMUNICATION_CENTER' && (caps.communications || caps.whatsapp_campaigns)) {
                    allowed = true;
                } else if (targetKeyUpper === 'LOYALTY' && (caps.loyalty || caps.loyalty_module)) {
                    allowed = true;
                } else if (targetKeyUpper === 'KITCHEN' && caps.kitchen) {
                    allowed = true;
                } else if (targetKeyUpper === 'COURSES' && caps.courses) {
                    allowed = true;
                } else if (targetKeyUpper === 'DELIVERY' && caps.delivery) {
                    allowed = true;
                }
            }

            setIsAllowed(allowed);

            if (!allowed && resAddons.ok) {
                const addonsData = await resAddons.json();
                if (addonsData.success) {
                    // Buscar add-on asociado
                    const foundAddon = (addonsData.availableAddons || []).find((a: any) => 
                        (addonCode && a.code === addonCode) || 
                        (a.targetKey && a.targetKey.toUpperCase() === capabilityKey.toUpperCase())
                    );
                    
                    if (foundAddon) {
                        setAddon(foundAddon.addon || foundAddon);
                        if (foundAddon.isPendingPayment) {
                            setIsPendingPayment(true);
                        }
                    }

                    // Verificar contratos activos o pendientes
                    const pendingContract = (addonsData.activeSubscriptions || []).find((sa: any) => 
                        (addonCode && sa.addon?.code === addonCode) ||
                        (sa.addon?.targetKey && sa.addon.targetKey.toUpperCase() === capabilityKey.toUpperCase())
                    );

                    if (pendingContract && pendingContract.status === 'PENDING') {
                        setIsPendingPayment(true);
                    }

                    if (addonsData.pricingDetails) {
                        setSubscriptionDates({
                            startDate: addonsData.pricingDetails.startDate,
                            endDate: addonsData.pricingDetails.endDate
                        });
                    }
                }
            }
        } catch (err) {
            console.error('[ModuleUpsellGate] Error al verificar permisos:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkEntitlements();
    }, [capabilityKey, addonCode]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Comprobando permisos del módulo...
                </p>
            </div>
        );
    }

    if (isAllowed) {
        return <>{children}</>;
    }

    const priceMonthly = addon ? Number(addon.priceMonthly || 0) : null;

    return (
        <div className="max-w-5xl mx-auto px-4 py-10 space-y-10 animate-in fade-in duration-300">
            
            {/* Cabecera Hero del Módulo */}
            <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-100/60">
                {/* Fondo decorativo con gradiente */}
                <div 
                    className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
                    style={{ backgroundColor: primaryColor }}
                />

                <div className="relative z-10 max-w-2xl space-y-4">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-black uppercase tracking-wider shadow-sm">
                        <Lock size={12} className="text-amber-400" />
                        <span>{badgeText}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {IconComponent && (
                            <div 
                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <IconComponent size={28} />
                            </div>
                        )}
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                            {title}
                        </h1>
                    </div>

                    <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed">
                        {subtitle}
                    </p>
                </div>

                {/* Métricas o Impacto (si se proporcionan) */}
                {stats.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-100">
                        {stats.map((st, idx) => (
                            <div key={idx} className="space-y-1">
                                <span className="block text-2xl md:text-3xl font-black text-slate-900">
                                    {st.value}
                                </span>
                                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    {st.label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Beneficios y Capacidades del Módulo */}
            {benefits.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Sparkles size={16} style={{ color: primaryColor }} /> 
                            Qué puedes hacer con esta integración
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {benefits.map((b, idx) => {
                            const BenefitIcon = b.icon || Check;
                            return (
                                <div 
                                    key={idx}
                                    className="p-6 bg-white border border-slate-200/80 rounded-2xl flex items-start gap-4 hover:border-slate-300 hover:shadow-md transition-all"
                                >
                                    <div 
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `color-mix(in srgb, ${primaryColor} 12%, transparent)`, color: primaryColor }}
                                    >
                                        <BenefitIcon size={20} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-black text-slate-900">
                                            {b.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                            {b.desc}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Caja de Activación In-situ (Focus a la Integración) */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-8 md:p-10 shadow-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-3 max-w-xl text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs">
                        <Zap size={14} className="text-amber-400" />
                        Activación Rápida
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-white">
                        Habilita {title} en tu negocio
                    </h3>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                        Puedes añadirlo como un Add-on complementario a tu plan actual sin alterar tu cuota ni perder tus beneficios de Socio Fundador, o bien mejorar tu plan.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto shrink-0">
                    {isPendingPayment ? (
                        <div className="w-full sm:w-auto px-6 py-4 bg-amber-500/20 border border-amber-400/40 rounded-2xl flex items-center gap-3 text-amber-300">
                            <Clock className="w-5 h-5 animate-pulse shrink-0" />
                            <div className="text-left">
                                <span className="block text-xs font-black uppercase tracking-wider">Pago en Revisión</span>
                                <span className="block text-[11px] text-amber-200/80">Se activará tras confirmar tu transferencia.</span>
                            </div>
                        </div>
                    ) : addon ? (
                        <button
                            onClick={() => setIsCheckoutOpen(true)}
                            className="w-full sm:w-auto px-8 py-4 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                            style={{ 
                                backgroundColor: primaryColor,
                                boxShadow: `0 10px 25px -5px color-mix(in srgb, ${primaryColor} 40%, transparent)`
                            }}
                        >
                            <Zap size={16} />
                            Activar Add-on {priceMonthly ? `($${priceMonthly.toFixed(2)}/mes)` : ''}
                        </button>
                    ) : null}

                    <Link
                        href="/admin/plan"
                        className="w-full sm:w-auto px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 text-center"
                    >
                        <span>Ver Todos los Planes</span>
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </div>

            {/* Modal de Checkout In-situ si el usuario decide contratar el Add-on */}
            {addon && (
                <AddonCheckoutModal
                    isOpen={isCheckoutOpen}
                    onClose={() => setIsCheckoutOpen(false)}
                    addon={addon}
                    subscriptionDates={subscriptionDates}
                    onSuccess={async () => {
                        setIsCheckoutOpen(false);
                        setIsPendingPayment(true);
                        await checkEntitlements();
                    }}
                />
            )}

        </div>
    );
}
