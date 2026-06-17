import prisma from "@/lib/prisma";
import {
    TrendingUp,
    Users,
    Calendar,
    Building2,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Download,
    Trophy,
    Activity
} from "lucide-react";

export default async function MetricasPage() {
    // 1. Estadísticas de Negocios
    const totalNegocios = await prisma.negocio.count();
    const negociosConSuscripcion = await prisma.suscripcion.count({ where: { estado: 'ACTIVA' } });
    const tasaConversion = totalNegocios > 0 ? (negociosConSuscripcion / totalNegocios * 100).toFixed(1) : 0;

    // 2. Top Negocios por volumen de Reservas
    const topNegocios = await prisma.negocio.findMany({
        take: 5,
        include: {
            _count: {
                select: { Appointment: true }
            },
            Suscripcion: {
                include: { Plan: true }
            }
        },
        orderBy: {
            Appointment: {
                _count: 'desc'
            }
        }
    });

    // 3. Distribución de Planes
    const planesCount = await prisma.plan.findMany({
        include: {
            _count: {
                select: { Suscripcion: true }
            }
        }
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Métricas de Rendimiento</h2>
                    <p className="text-slate-500 mt-1">Análisis detallado del crecimiento y uso de la plataforma.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm">
                        <Download size={18} />
                        Exportar Reporte
                    </button>
                    <select className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold border-none outline-none cursor-pointer hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                        <option>Últimos 30 días</option>
                        <option>Últimos 90 días</option>
                        <option>Año Completo</option>
                    </select>
                </div>
            </div>

            {/* Top Cards Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <TrendingUp size={24} />
                        </div>
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                            <ArrowUpRight size={14} /> 12%
                        </span>
                    </div>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Tasa de Conversión</p>
                    <h3 className="text-3xl font-extrabold text-slate-900">{tasaConversion}%</h3>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Users size={24} />
                        </div>
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                            <ArrowUpRight size={14} /> 8%
                        </span>
                    </div>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Crecimiento Mensual</p>
                    <h3 className="text-3xl font-extrabold text-slate-900">+{Math.ceil(totalNegocios * 0.1)} Nuevos</h3>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <Activity size={24} />
                        </div>
                        <span className="flex items-center gap-1 text-rose-600 text-xs font-bold bg-rose-50 px-2 py-1 rounded-lg">
                            <ArrowDownRight size={14} /> 3%
                        </span>
                    </div>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Churn Rate</p>
                    <h3 className="text-3xl font-extrabold text-slate-900">2.4%</h3>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-3 bg-fuchsia-50 text-fuchsia-600 rounded-2xl">
                            <Download size={24} />
                        </div>
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                            <ArrowUpRight size={14} /> 25%
                        </span>
                    </div>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Descargas App</p>
                    <h3 className="text-3xl font-extrabold text-slate-900">1.2k</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Negocios - Reservas */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-lg">
                            <Trophy size={20} className="text-amber-500" />
                            Centros con Mayor Actividad
                        </h3>
                    </div>
                    <div className="p-6 space-y-6">
                        {topNegocios.map((negocio, index) => (
                            <div key={negocio.id} className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-amber-100 text-amber-600' :
                                    index === 1 ? 'bg-slate-200 text-slate-600' :
                                        index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                                    }`}>
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-slate-900">{negocio.nombre}</span>
                                        <span className="text-sm font-extrabold text-slate-700">{negocio._count.Appointment} citas</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 transition-all"
                                            style={{ width: `${(negocio._count.Appointment / (topNegocios[0]._count.Appointment || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {topNegocios.length === 0 && (
                            <div className="text-center py-8 text-slate-400 font-medium italic">
                                Datos insuficientes para generar el ranking.
                            </div>
                        )}
                    </div>
                </div>

                {/* Distribución de Planes */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-lg">
                            <Activity size={20} className="text-indigo-600" />
                            Popularidad de Planes
                        </h3>
                    </div>
                    <div className="p-8 flex-1 flex flex-col justify-center gap-8">
                        {planesCount.map((plan) => (
                            <div key={plan.id} className="space-y-3">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                        <span className="font-bold text-slate-700">{plan.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-slate-400 font-medium">{plan._count.Suscripcion} negocios</span>
                                        <span className="font-extrabold text-slate-900">{((plan._count.Suscripcion / (negociosConSuscripcion || 1)) * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div className="w-full h-4 bg-slate-100 rounded-xl overflow-hidden p-1">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg transition-all shadow-sm"
                                        style={{ width: `${((plan._count.Suscripcion / (negociosConSuscripcion || 1)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
