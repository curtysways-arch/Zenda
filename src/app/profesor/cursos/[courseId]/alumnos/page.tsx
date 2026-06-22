
import { getProfessorSession } from "@/lib/professorAuth";
import prisma from "@/lib/prisma";
import { ArrowRight, Phone, User, Mail, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CourseStudents({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = await params;
    const session = await getProfessorSession();
    const userId = session?.userId as string;

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            CourseEnrollment: {
                where: { status: 'approved' }
            }
        }
    });

    if (!course || course.instructor_id !== userId) {
        redirect('/profesor');
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-6">
                <Link 
                    href={`/profesor/cursos`}
                    className="inline-flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-emerald-500 transition-colors group"
                >
                    <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver a cursos
                </Link>
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-tight">Alumnos <span className="text-blue-500">Inscritos</span></h1>
                    <p className="text-slate-500 font-medium italic mt-2">Curso: <span className="text-slate-900 font-black uppercase tracking-tight">{course.name}</span></p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {course.CourseEnrollment.map((enr) => (
                    <div key={enr.id} className="group bg-white p-8 rounded-[3.5rem] border border-slate-100 flex flex-col gap-8 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 relative overflow-hidden">
                        <div className="flex items-center gap-6">
                            <div className="size-20 rounded-[2rem] bg-slate-900 text-white flex items-center justify-center font-black text-3xl shadow-xl shadow-slate-900/10 group-hover:scale-110 transition-transform duration-500">
                                {enr.student_name?.charAt(0)}
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-black uppercase tracking-tight text-2xl text-slate-900 leading-tight group-hover:text-blue-600 transition-colors truncate max-w-[180px] md:max-w-[250px]">
                                    {enr.student_name}
                                </h3>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        <User size={12} /> {enr.student_age} años
                                    </span>
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        Alumno
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <a 
                                href={`tel:${enr.guardian_phone}`}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-slate-50 text-slate-400 hover:text-white hover:bg-emerald-500 transition-all duration-300 border border-slate-100 group/btn"
                            >
                                <Phone size={24} className="group-hover/btn:scale-110 transition-transform" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Llamar</span>
                            </a>
                            <a 
                                href={`mailto:${enr.guardian_email}`}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-slate-50 text-slate-400 hover:text-white hover:bg-blue-500 transition-all duration-300 border border-slate-100 group/btn"
                            >
                                <Mail size={24} className="group-hover/btn:scale-110 transition-transform" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Email</span>
                            </a>
                        </div>
                    </div>
                ))}

                {course.CourseEnrollment.length === 0 && (
                    <div className="col-span-full py-24 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-50 flex flex-col items-center gap-6">
                        <div className="p-8 bg-slate-50 rounded-full text-slate-200">
                            <Users size={64} />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-[0.2em] italic max-w-xs leading-loose">
                            No hay alumnos confirmados en este curso todavía.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
