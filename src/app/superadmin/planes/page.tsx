import prisma from "@/lib/prisma";
import {
    Package,
    Users,
    Calendar,
    MapPin,
    Clock,
    FileText,
    Dribbble,
    Star,
    Tags,
    Zap
} from "lucide-react";
import PlanCardActions from "@/components/superadmin/PlanCardActions";
import CreatePlanButton from "@/components/superadmin/CreatePlanButton";

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
                                <div className="flex gap-2">
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
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center gap-4 text-slate-600 font-medium text-sm">
                                    <div className="p-1.5 bg-amber-50 rounded-lg">
                                        <Zap size={16} className="text-amber-500" />
                                    </div>
                                    <span>{plan.max_reservations_per_month} citas/mes</span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-600 font-medium text-sm">
                                    <div className="p-1.5 bg-indigo-50 rounded-lg">
                                        <Calendar size={16} className="text-indigo-500" />
                                    </div>
                                    <span>Hasta {plan.max_fields} servicios</span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-600 font-medium text-sm">
                                    <div className="p-1.5 bg-emerald-50 rounded-lg">
                                        <MapPin size={16} className="text-emerald-500" />
                                    </div>
                                    <span>Hasta {plan.max_locations} {plan.max_locations === 1 ? 'sede' : 'sedes'}</span>
                                </div>
                                <div className={`flex items-center gap-4 font-medium text-sm ${plan.tournaments_enabled ? 'text-slate-600' : 'text-slate-300'}`}>
                                    <div className={`p-1.5 rounded-lg ${plan.tournaments_enabled ? 'bg-amber-50' : 'bg-slate-50'}`}>
                                        <Star size={16} className={plan.tournaments_enabled ? 'text-amber-500' : 'text-slate-300'} />
                                    </div>
                                    <span>Portafolio de Trabajos {plan.tournaments_enabled ? 'Habilitado' : 'No incluido'}</span>
                                </div>
                                <div className={`flex items-center gap-4 font-medium text-sm ${plan.automatic_discounts_enabled ? 'text-slate-600' : 'text-slate-300'}`}>
                                    <div className={`p-1.5 rounded-lg ${plan.automatic_discounts_enabled ? 'bg-orange-50' : 'bg-slate-50'}`}>
                                        <Tags size={16} className={plan.automatic_discounts_enabled ? 'text-orange-500' : 'text-slate-300'} />
                                    </div>
                                    <span>Módulo de Promociones {plan.automatic_discounts_enabled ? 'Habilitado' : 'No incluido'}</span>
                                </div>
                                <div className={`flex items-center gap-4 font-medium text-sm ${plan.courses_module ? 'text-slate-600' : 'text-slate-300'}`}>
                                    <div className={`p-1.5 rounded-lg ${plan.courses_module ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                                        <Dribbble size={16} className={plan.courses_module ? 'text-emerald-500' : 'text-slate-300'} />
                                    </div>
                                    <span>Programas / Cursos {plan.courses_module ? 'Habilitados' : 'No incluido'}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-50 flex items-center gap-2">
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
