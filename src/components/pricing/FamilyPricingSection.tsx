import Link from 'next/link';
import { Check, Star } from 'lucide-react';

interface FamilyPricingSectionProps {
    familyCode: string;
    familyName: string;
    familyThemeColor?: string;
    plans: any[];
    registerTipo: string;
}

export default function FamilyPricingSection({
    familyName,
    familyThemeColor = '#4f46e5',
    plans,
    registerTipo
}: FamilyPricingSectionProps) {
    if (!plans || plans.length === 0) return null;

    return (
        <section id="planes" className="py-20 bg-slate-50 border-t border-slate-200/80">
            <div className="max-w-7xl mx-auto px-6">
                
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
                    <span 
                        style={{ color: familyThemeColor }}
                        className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white border border-slate-200 shadow-2xs inline-block"
                    >
                        Planes Transparentes para {familyName}
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                        Elige el plan ideal para tu negocio
                    </h2>
                    <p className="text-slate-600 text-sm font-medium">
                        Sin comisiones abusivas por venta. 15 días de prueba gratuita. Cancela cuando quieras.
                    </p>
                </div>

                <div className={`grid grid-cols-1 gap-8 max-w-5xl mx-auto items-stretch ${
                    plans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-3'
                }`}>
                    {plans.map((plan: any) => {
                        const isFeatured = plan.featured;
                        const entitlements = plan.planEntitlements?.filter((pe: any) => pe.enabled) || [];

                        return (
                            <div
                                key={plan.id}
                                className={`rounded-3xl p-8 border flex flex-col justify-between transition-all relative ${
                                    isFeatured
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xl scale-105 z-10'
                                        : 'bg-white text-slate-900 border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md'
                                }`}
                            >
                                {isFeatured && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                                        <Star size={11} className="fill-slate-950" />
                                        MÁS POPULAR
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            isFeatured ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {plan.name}
                                        </span>
                                        <h3 className={`text-2xl font-black ${isFeatured ? 'text-white' : 'text-slate-900'}`}>
                                            {plan.name}
                                        </h3>
                                        <p className={`text-xs font-medium ${isFeatured ? 'text-slate-300' : 'text-slate-500'}`}>
                                            {plan.description || `Ideal para potenciar tu ${familyName.toLowerCase()}`}
                                        </p>
                                    </div>

                                    <div className="pt-2">
                                        <span className={`text-4xl font-black ${isFeatured ? 'text-white' : 'text-slate-950'}`}>
                                            ${plan.price}
                                        </span>
                                        <span className={`text-xs font-bold ${isFeatured ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {' '}/ {plan.billingPeriod || 'mes'}
                                        </span>
                                    </div>

                                    <ul className={`space-y-2.5 text-xs font-bold pt-4 border-t ${
                                        isFeatured ? 'border-white/10 text-slate-200' : 'border-slate-100 text-slate-700'
                                    }`}>
                                        {entitlements.map((pe: any) => (
                                            <li key={pe.id} className="flex items-center gap-2.5">
                                                <Check size={15} className="text-emerald-500 shrink-0" />
                                                <span className="truncate">{pe.module?.name || pe.module?.code}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="pt-8">
                                    <Link
                                        href={`/register?tipo=${registerTipo}&plan=${plan.slug || plan.id}`}
                                        className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-center transition-all block active:scale-95 shadow-md ${
                                            isFeatured
                                                ? 'bg-white text-slate-950 hover:bg-slate-100'
                                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                                        }`}
                                    >
                                        Comenzar Prueba Gratis &rarr;
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}
