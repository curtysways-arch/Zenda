import { getProfessorSession } from "@/lib/professorAuth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, Star } from "lucide-react";

export default async function GenericCourseSelector({ 
    title, 
    subtitle, 
    nextPath 
}: { 
    title: string, 
    subtitle: string, 
    nextPath: string 
}) {
    const session = await getProfessorSession();
    const userId = session?.userId as string;

    const courses = await prisma.course.findMany({
        where: { instructor_id: userId },
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* 🏷️ COMPACT SECTION HEADER */}
            <div className="px-2 space-y-1">
                <div className="flex items-center gap-1.5 grayscale opacity-30">
                    <div className="h-0.5 w-6 bg-slate-900" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Selector</span>
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mt-1 italic leading-none">
                    {title}
                </h1>
                <p className="text-slate-400 font-bold mt-2 text-[10px] italic uppercase tracking-widest">{subtitle}</p>
            </div>

            {/* 📋 "MINIMAL APP" MISSION LIST */}
            <div className="grid gap-2">
                {courses.map((course) => (
                    <Link 
                        key={course.id}
                        href={nextPath.replace('[courseId]', course.id)}
                        className="group p-5 bg-white rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-all active:scale-[0.98] border-l-4 border-l-emerald-500 shadow-sm overflow-hidden"
                    >
                        <div className="flex items-center gap-5">
                            <div className="size-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner relative overflow-hidden">
                                <BookOpen size={20} strokeWidth={3} />
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                    <Star size={8} className="text-emerald-500 fill-emerald-500" />
                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest italic leading-none">PROGRAMA</span>
                                </div>
                                <h3 className="font-black uppercase tracking-widest text-sm text-slate-900 group-hover:text-emerald-600 transition-colors leading-none italic">
                                    {course.name}
                                </h3>
                            </div>
                        </div>

                        <div className="size-9 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                            <ChevronRight size={18} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </Link>
                ))}

                {courses.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-3xl border border-dotted border-slate-200 flex flex-col items-center gap-4">
                        <div className="p-6 bg-slate-50 rounded-2xl text-slate-200">
                            <BookOpen size={40} strokeWidth={2} />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] italic leading-none">
                            NO TIENES PROGRAMAS REGISTRADOS
                        </p>
                    </div>
                )}
            </div>

            <div className="pt-6 flex flex-col items-center opacity-5">
                <span className="text-[8px] font-black tracking-[1em] italic uppercase">SPA MINI v2</span>
            </div>
        </div>
    );
}
