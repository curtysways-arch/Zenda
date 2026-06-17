
import { getProfessorSession } from "@/lib/professorAuth";
import prisma from "@/lib/prisma";
import { Plus, Calendar, UserCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function CourseClasses({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = await params;
    const session = await getProfessorSession();
    const userId = session?.userId as string;

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            course_classes: {
                orderBy: { class_date: 'desc' }
            }
        }
    });

    if (!course || course.instructor_id !== userId) {
        return <div>No autorizado</div>;
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <Link 
                        href="/profesor/clases" 
                        className="inline-flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4 hover:text-emerald-500 transition-colors group"
                    >
                        <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver a cursos
                    </Link>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-tight">
                        {course.name}
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 italic">Gestión de clases y asistencia diaria.</p>
                </div>
                
                <Link 
                    href={`/profesor/cursos/${courseId}/clases/nueva`}
                    className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black px-8 py-5 rounded-[2rem] shadow-2xl shadow-emerald-500/30 uppercase tracking-[0.2em] text-xs transition-all active:scale-95 shrink-0"
                >
                    <Plus size={20} strokeWidth={3} /> Nueva Clase
                </Link>
            </div>

            <div className="grid gap-6">
                {course.course_classes.map((cls) => (
                    <div key={cls.id} className="group bg-white p-6 md:p-8 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 relative overflow-hidden shadow-sm">
                        <div className="flex items-center gap-6">
                            <div className="size-16 rounded-[2rem] bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all duration-500 group-hover:scale-110">
                                <Calendar size={28} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="font-black uppercase tracking-tight text-xl text-slate-900 group-hover:text-emerald-600 transition-colors">
                                    {cls.title || "Clase Programada"}
                                </h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                    <span className="inline-block size-2 rounded-full bg-emerald-500" />
                                    {new Date(cls.class_date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        <Link 
                            href={`/profesor/clases/${cls.id}/asistencia`}
                            className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-emerald-600 text-white font-black px-8 py-5 rounded-2xl uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl shadow-slate-900/10 active:scale-95 group/btn"
                        >
                            <UserCheck size={18} /> Tomar Asistencia <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                ))}

                {course.course_classes.length === 0 && (
                    <div className="py-24 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-50 flex flex-col items-center gap-6">
                        <div className="p-8 bg-slate-50 rounded-full text-slate-200">
                            <Calendar size={64} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-slate-400 font-black uppercase tracking-[0.2em] italic">No hay clases registradas.</p>
                            <p className="text-slate-300 text-xs font-medium">Comienza creando tu primera sesión.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
