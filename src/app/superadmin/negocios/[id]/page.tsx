import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import BusinessDetailClient from "./BusinessDetailClient";
import {
    LayoutDashboard,
    ChevronLeft,
    Shield,
    Calendar,
    MapPin,
    Building2,
    Users
} from "lucide-react";
import Link from "next/link";

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const negocio = await (prisma.negocio as any).findUnique({
        where: { id },
        include: {
            Suscripcion: {
                include: { Plan: true }
            },
            SubscriptionHistory: {
                include: { 
                    Plan_SubscriptionHistory_plan_anterior_idToPlan: true, 
                    Plan_SubscriptionHistory_plan_nuevo_idToPlan: true 
                },
                orderBy: { fecha_cambio: 'desc' }
            },
            Payment: {
                orderBy: { fecha_pago: 'desc' }
            },
            Usuario: {
                select: {
                    id: true,
                    nombre: true,
                    email: true,
                    phone: true,
                    role: true,
                    createdAt: true
                }
            },

            _count: {
                select: {
                    Service: true,
                    Appointment: true,
                    Usuario: true,
                    Ubicacion: true
                }
            }
        }
    });

    if (!negocio) notFound();

    const fullNegocio = JSON.parse(JSON.stringify(negocio));

    const planes = await prisma.plan.findMany({
        where: { activo: true, id: { not: 'founder' } },
        orderBy: { price: 'asc' } as any
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Nav / Back */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <Link
                        href="/superadmin/negocios"
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                    >
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-indigo-100">
                                Gestión de Negocio
                            </span>
                            {fullNegocio.Suscripcion?.estado === 'trial' && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-amber-100">
                                    Periodo de Prueba
                                </span>
                            )}
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">
                            {fullNegocio.nombre}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href={`/${fullNegocio.slug}`}
                        target="_blank"
                        className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        <LayoutDashboard size={16} />
                        Página Pública
                    </Link>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-3 text-indigo-600">
                        <Building2 size={24} className="opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Servicios</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{fullNegocio._count?.Service || 0}</div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-3 text-emerald-600">
                        <Calendar size={24} className="opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Citas</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{fullNegocio._count?.Appointment || 0}</div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-3 text-amber-600">
                        <Users size={24} className="opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Usuarios</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{fullNegocio._count?.Usuario || 0}</div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-3 text-rose-600">
                        <MapPin size={24} className="opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ubicaciones</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{fullNegocio._count?.Ubicacion || 0}</div>
                </div>
            </div>

            <BusinessDetailClient negocio={fullNegocio} planes={JSON.parse(JSON.stringify(planes))} />
        </div>
    );
}
