import { getProfessorSession } from "@/lib/professorAuth";
import prisma from "@/lib/prisma";
import { BookOpen, Users, Calendar, ArrowRight, UserCircle, Activity } from "lucide-react";
import Link from "next/link";

export default async function ProfessorDashboard() {
    const session = await getProfessorSession();
    const userId = session?.userId as string;

    if (!userId) return null;

    // Obtener estadísticas compactas
    const coursesCount = await prisma.course.count({ where: { instructor_id: userId } });
    const enrollmentsCount = await prisma.courseEnrollment.count({ where: { course: { instructor_id: userId } } });

    // Detección dinámica de slug desde la sesión o DB
    let businessSlug = (session as any)?.slug || "";
    
    if (!businessSlug) {
        try {
            const user = await prisma.usuario.findFirst({
                where: { id: userId },
                select: { negocio: { select: { slug: true } } }
            });
            businessSlug = user?.negocio?.slug || "";
        } catch (e) {}
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            {/* 👑 COMPACT HEADER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="space-y-1">
                    <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none italic">
                        ¡Hola, <span className="text-emerald-500 italic uppercase">Profesor!</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] italic flex items-center gap-1.5 leading-none">
                        <Activity size={10} className="text-emerald-500" /> Resumen General
                    </p>
                </div>

                <Link 
                    href={businessSlug ? `/${businessSlug}` : "/"}
                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-slate-900/10 active:scale-95 text-xs font-black uppercase tracking-widest italic"
                >
                    <UserCircle size={16} strokeWidth={3} />
                    Regresar
                </Link>
            </div>

            {/* 📊 MINIMAL STATS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <BookOpen size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Programas</p>
                        <p className="text-3xl font-black text-slate-900 italic mt-1 leading-none">{coursesCount}</p>
                    </div>
                    <div className="absolute bottom-0 right-0 h-1 w-full bg-blue-500/20" />
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Users size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Alumnos</p>
                        <p className="text-3xl font-black text-slate-900 italic mt-1 leading-none">{enrollmentsCount}</p>
                    </div>
                    <div className="absolute bottom-0 right-0 h-1 w-full bg-emerald-500/20" />
                </div>

                <div className="hidden md:flex bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden group hover:scale-[1.02] transition-transform flex-col">
                    <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Calendar size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Estado</p>
                        <p className="text-lg font-black text-slate-900 italic mt-1 leading-none uppercase">En línea</p>
                    </div>
                    <div className="absolute bottom-0 right-0 h-1 w-full bg-purple-500/20" />
                </div>
            </div>

            {/* 📋 MINI ACTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link 
                    href="/profesor/clases"
                    className="group bg-slate-900 rounded-3xl p-6 text-white flex items-center justify-between hover:bg-emerald-600 transition-all active:scale-95 shadow-xl shadow-slate-900/10"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl">
                            <Calendar size={20} strokeWidth={3} />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest italic">Sesiones</p>
                            <h2 className="text-sm font-black uppercase tracking-widest italic">Gestionar Clases</h2>
                        </div>
                    </div>
                    <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link 
                    href="/profesor/asistencia"
                    className="group bg-white rounded-3xl p-6 text-slate-900 border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 rounded-xl text-blue-500">
                            <Activity size={20} strokeWidth={3} />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Lista</p>
                            <h2 className="text-sm font-black uppercase tracking-widest italic">Pasar Asistencia</h2>
                        </div>
                    </div>
                    <ArrowRight size={18} strokeWidth={3} className="text-slate-300 group-hover:translate-x-1 group-hover:text-blue-500 transition-all" />
                </Link>
            </div>

            <div className="pt-10 flex flex-col items-center opacity-10">
                <span className="text-[8px] font-black tracking-[1.5em] italic uppercase">PROFESSOR MINI APP</span>
            </div>
        </div>
    );
}
