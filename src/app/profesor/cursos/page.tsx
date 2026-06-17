
import { getProfessorSession } from "@/lib/professorAuth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, Users, Calendar, BookOpen } from "lucide-react";

export default async function ProfessorCourses() {
    const session = await getProfessorSession();
    const userId = session?.userId as string;

    const courses = await prisma.course.findMany({
        where: { instructor_id: userId },
        include: {
            _count: {
                select: { enrollments: true }
            }
        }
    });

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 leading-tight">
                        Mis <span className="text-emerald-500">Cursos</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 text-lg italic">Gestiona tus programas y alumnos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.map((course) => (
                    <div key={course.id} className="group bg-white rounded-[3rem] border border-slate-100 p-8 space-y-8 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 relative overflow-hidden border-b-8 border-b-emerald-500">
                        <div className="space-y-4">
                            <div className="size-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <BookOpen size={32} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors">
                                {course.name}
                            </h3>
                            <p className="text-slate-500 text-sm font-medium line-clamp-3 leading-relaxed">
                                {course.description || "Sin descripción proporcionada para este curso."}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Users size={12} className="text-blue-500" /> Alumnos
                                </p>
                                <p className="text-xl font-black text-slate-900">{course._count.enrollments}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Calendar size={12} className="text-emerald-500" /> Inicio
                                </p>
                                <p className="text-sm font-black text-slate-900 truncate uppercase mt-1">
                                    {course.start_date ? new Date(course.start_date).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : 'Próximamente'}
                                </p>
                            </div>
                        </div>

                        <Link 
                            href={`/profesor/cursos/${course.id}/clases`}
                            className="flex items-center justify-center gap-3 w-full bg-slate-900 hover:bg-emerald-600 text-white font-black py-5 rounded-[1.5rem] uppercase tracking-[0.2em] text-[10px] transition-all duration-300 shadow-xl shadow-slate-900/10 active:scale-95"
                        >
                            Ver Clases <ArrowRight size={16} />
                        </Link>
                    </div>
                ))}

                {courses.length === 0 && (
                    <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-50 flex flex-col items-center gap-6">
                        <div className="p-8 bg-slate-50 rounded-full text-slate-200">
                            <BookOpen size={64} />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest italic max-w-xs leading-loose">
                            No tienes cursos asignados actualmente.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
