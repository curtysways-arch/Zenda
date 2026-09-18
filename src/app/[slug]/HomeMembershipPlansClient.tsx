'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, ShieldCheck, MessageCircle } from 'lucide-react';

interface MembershipPlanItem {
    id: string;
    businessId: string;
    name: string;
    description?: string | null;
    price: number;
    currency: string;
    durationDays: number;
    featured?: boolean;
    benefits?: any;
}

interface HomeMembershipPlansClientProps {
    plans: MembershipPlanItem[];
    slug: string;
    primaryColor: string;
    textColor: string;
    whatsapp?: string | null;
    businessName?: string;
}

export default function HomeMembershipPlansClient({
    plans,
    slug,
    primaryColor,
    textColor,
    whatsapp,
    businessName
}: HomeMembershipPlansClientProps) {
    if (!plans || plans.length === 0) {
        return null;
    }

    const formatDuration = (days: number) => {
        if (days === 1) return 'Pase Diario';
        if (days === 7) return '1 Semana';
        if (days === 15) return 'Quincenal';
        if (days === 30) return 'Mensual (30 días)';
        if (days === 60) return 'Bimestral (60 días)';
        if (days === 90) return 'Trimestral (90 días)';
        if (days === 180) return 'Semestral (6 meses)';
        if (days === 365) return 'Anual (12 meses)';
        return `${days} días`;
    };

    const getCleanWhatsappUrl = (planName: string) => {
        const raw = whatsapp || '0991234567';
        const clean = raw.replace(/\D/g, '');
        const formatted = clean.startsWith('593')
            ? clean
            : clean.startsWith('0')
                ? `593${clean.slice(1)}`
                : `593${clean}`;
        const msg = encodeURIComponent(`¡Hola! Deseo adquirir el plan "${planName}" en ${businessName || 'el gimnasio'}. ¿Cuáles son los métodos de pago?`);
        return `https://wa.me/${formatted}?text=${msg}`;
    };

    const parseBenefits = (benefits: any): string[] => {
        if (!benefits) return [];
        if (Array.isArray(benefits)) return benefits.map(b => String(b));
        if (typeof benefits === 'string') {
            try {
                const parsed = JSON.parse(benefits);
                if (Array.isArray(parsed)) return parsed.map(b => String(b));
            } catch (_) {
                return benefits.split('\n').map(b => b.trim()).filter(Boolean);
            }
        }
        return [];
    };

    return (
        <section id="planes" className="px-6 mb-10 scroll-mt-24">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <span 
                        className="text-[10px] font-black uppercase tracking-widest mb-1.5 block"
                        style={{ color: primaryColor }}
                    >
                        MEMBRESÍAS & PASES
                    </span>
                    <h3 className="text-2xl font-black leading-none text-slate-900">
                        Planes de Entrenamiento
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1.5">
                        Acceso con carnet digital QR, sin contratos forzosos.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {plans.map((plan) => {
                    const benefitsList = parseBenefits(plan.benefits);
                    const isFeatured = !!plan.featured;

                    return (
                        <div
                            key={plan.id}
                            className={`relative bg-white rounded-[2.5rem] border shadow-sm p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-md ${
                                isFeatured 
                                    ? 'ring-2 ring-offset-2' 
                                    : 'border-slate-100 hover:border-slate-200'
                            }`}
                            style={{
                                borderColor: isFeatured ? primaryColor : undefined,
                                outlineColor: isFeatured ? primaryColor : undefined
                            }}
                        >
                            {/* Featured Badge */}
                            {isFeatured && (
                                <div 
                                    className="absolute -top-3.5 left-8 px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-md flex items-center gap-1.5"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Sparkles size={11} className="fill-current" />
                                    Más Popular
                                </div>
                            )}

                            <div>
                                {/* Header del Plan */}
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div>
                                        <h4 className="font-black text-xl text-slate-900 leading-tight">
                                            {plan.name}
                                        </h4>
                                        <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                            {formatDuration(plan.durationDays)}
                                        </span>
                                    </div>
                                </div>

                                {plan.description && (
                                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                                        {plan.description}
                                    </p>
                                )}

                                {/* Precio */}
                                <div className="my-5 pb-5 border-b border-slate-100">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                                            ${plan.price}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 uppercase">
                                            {plan.currency || 'USD'}
                                        </span>
                                        <span className="text-[11px] font-medium text-slate-400 ml-1">
                                            / {plan.durationDays === 1 ? 'día' : plan.durationDays <= 31 ? 'mes' : `${plan.durationDays} días`}
                                        </span>
                                    </div>
                                </div>

                                {/* Checklist de Beneficios */}
                                {benefitsList.length > 0 && (
                                    <div className="space-y-2.5 mb-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Lo que incluye:
                                        </p>
                                        <ul className="space-y-2">
                                            {benefitsList.map((benefit, bIdx) => (
                                                <li key={bIdx} className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                                                    <div 
                                                        className="size-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                                        style={{ 
                                                            backgroundColor: `${primaryColor}18`,
                                                            color: primaryColor 
                                                        }}
                                                    >
                                                        <Check size={10} strokeWidth={3} />
                                                    </div>
                                                    <span>{benefit}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Botón de Adquirir Plan */}
                            <div className="pt-2 space-y-2">
                                <a
                                    href={getCleanWhatsappUrl(plan.name)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <MessageCircle size={15} />
                                    Adquirir Membresía
                                </a>
                                <Link
                                    href={`/${slug}/mi-qr`}
                                    className="w-full py-2.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <ShieldCheck size={13} className="text-slate-400" />
                                    Acceso con Carnet QR
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
