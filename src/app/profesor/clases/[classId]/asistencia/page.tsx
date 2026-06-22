
import { getProfessorSession } from "@/lib/professorAuth";
import prisma from "@/lib/prisma";
import AttendanceManager from "@/components/professor/AttendanceManager";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AttendancePage({ params }: { params: Promise<{ classId: string }> }) {
    const { classId } = await params;
    const session = await getProfessorSession();
    const userId = session?.userId as string;

    const cls = await prisma.course_classes.findUnique({
        where: { id: classId },
        include: {
            Course: {
                include: {
                    CourseEnrollment: {
                        where: { status: 'approved' }
                    }
                }
            },
            course_attendance: true
        }
    });

    if (!cls || cls.Course.instructor_id !== userId) {
        redirect('/profesor');
    }

    const students = cls.Course.CourseEnrollment.map(enr => {
        const attendance = cls.course_attendance.find(a => a.user_id === enr.id);
        return {
            enrollmentId: enr.id,
            name: enr.student_name || "Alumno",
            status: attendance?.status || 'pending'
        };
    });

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
            <div className="space-y-6">
                <Link 
                    href={`/profesor/cursos/${cls.course_id}/clases`}
                    className="inline-flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-emerald-500 transition-colors group"
                >
                    <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver a clases
                </Link>
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-tight">Pasar Lista</h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                        <p className="text-slate-500 font-medium italic">Curso: <span className="text-emerald-600 font-black uppercase tracking-tight">{cls.Course.name}</span></p>
                        <div className="size-1 rounded-full bg-slate-200 hidden sm:block" />
                        <p className="text-slate-500 font-medium italic">Módulo: <span className="text-slate-900 font-black uppercase tracking-tight">{cls.title}</span></p>
                    </div>
                </div>
            </div>

            <AttendanceManager classId={classId} initialStudents={students} />
        </div>
    );
}
