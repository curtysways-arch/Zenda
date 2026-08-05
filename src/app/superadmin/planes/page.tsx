import prisma from "@/lib/prisma";
import {
    Package,
    Users,
    MapPin,
    Clock,
    FileText,
    Dribbble,
    Star,
    Tags,
    Zap,
    MessageSquare,
    CheckCircle2,
    X
} from "lucide-react";
import PlanCardActions from "@/components/superadmin/PlanCardActions";
import CreatePlanButton from "@/components/superadmin/CreatePlanButton";
import { getFormattedPlanFeatures } from "@/lib/planFeaturesHelper";

export default async function PlanesPage() {
    const planes = await (prisma.plan as any).findMany({
        where: { id: { not: 'founder' } },
        include: {
            _count: {
                select: { Suscripcion: true }
            }
        },
        orderBy: { price: 'asc' }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Planes de Suscripción</h2>
                    <p className="text-slate-500 mt-1">Configura los niveles de precios y límites del sistema.</p>
                </div>
                <CreatePlanButton />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {planes.map((plan: any) => (
                    <div key={plan.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-indigo-200 transition-all group hover:shadow-xl hover:shadow-indigo-500/5">
                        <div className="p-8 border-b border-slate-50 relative overflow-hidden">
                            {/* Decorative background circle */}
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />

                            <div className="relative z-10 flex items-center justify-between mb-6">
                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                    <Package size={24} />
                                </div>
                                <div className="flex gap-2 flex-wrap justify-end">
                                    {(() => {
                                        const feats = plan.features ? (typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features) : {};
                                        const tipo = (feats as any)?.tipo_negocio || 'TODOS';
                                        const tipoLabels: Record<string, string> = {
                                            SPORTS_COURTS: '🏓 Canchas',
                                            RESERVA: '💆 Spa & Citas',
                                            PRODUCTOS: '🛒 Ecommerce',
                                            ACADEMIA: '🎓 Academias',
                                            TODOS: '🌐 Universal'
                                        };
                                        return (
                                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-[10px] font-black uppercase tracking-widest border border-purple-200">
                                                {tipoLabels[tipo] || tipo}
                                            </span>
                                        );
                                    })()}
                                    {plan.trial_days > 0 && (
                                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                            {plan.trial_days} Días Trial
                                        </span>
                                    )}
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${plan.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {plan.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2 relative z-10">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-4xl font-extrabold text-slate-900">${plan.price}</span>
                                <span className="text-slate-500 font-medium">/ mes</span>
                            </div>
                            {plan.description && (
                                <p className="text-sm text-slate-500 mt-4 line-clamp-2 italic">
                                    "{plan.description}"
                                </p>
                            )}
                        </div>

                        <div className="p-8 space-y-4 flex-1 bg-white">
                            <div className="space-y-3">
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
                                        <span className={`text-sm ${feat.included ? 'font-bold text-slate-900' : 'font-medium text-slate-400 opacity-50'}`}>
                                            <span className={`mr-2 ${feat.included ? '' : 'grayscale opacity-50'}`}>{feat.emoji}</span>
                                            {feat.text}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 rounded-lg">
                                    <Users size={16} className="text-blue-500" />
                                </div>
                                <span className="text-sm text-slate-500 font-medium">{plan._count.Suscripcion} negocios con este plan</span>
                            </div>
                        </div>

                        <PlanCardActions plan={plan} />
                    </div>
                ))}

                {planes.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="p-4 bg-slate-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                            <Package size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No hay planes creados</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-8">Empieza por crear los diferentes niveles de precios que ofrecerás a tus clientes.</p>
                        <CreatePlanButton />
                    </div>
                )}
            </div>
        </div>
    );
}
