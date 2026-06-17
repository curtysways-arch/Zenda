import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import prisma from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getNegocioBySlug } from '@/lib/services';
import { Trophy } from 'lucide-react';

export default async function MiCursoPage(
    props: { params: Promise<{ slug: string; enrollmentId: string }> }
) {
    const params = await props.params;
    const { slug, enrollmentId } = params;
    const negocio = await getNegocioBySlug(slug);

    // Verify session using customer_token
    const cookieStore = await cookies();
    const token = cookieStore.get("customer_token")?.value;

    if (!token) {
        redirect(`/${slug}`);
    }

    let telefono = "";
    try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
        const verification = await jwtVerify(token, secret);
        telefono = verification.payload.telefono as string;
    } catch (e) {
        redirect(`/${slug}`);
    }

    // Fetch enrollment
    const enrollment = await prisma.courseEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
            Student: true,
            Course: {
                include: {
                    // @ts-ignore
                    course_classes: {
                        orderBy: { class_date: 'asc' }
                    }
                }
            }
        }
    }) as any;

    if (!enrollment) {
        notFound();
    }

    // Fetch attendances separately to be safe with relation names
    const attModel = (prisma as any).courseAttendance || (prisma as any).CourseAttendance;
    const attendances = await attModel.findMany({
        where: { user_id: enrollmentId }
    });

    const course = (enrollment as any).course;
    const classes = (course as any).course_classes || [];
    const attendanceMap = attendances.reduce((acc, curr) => {
        acc[curr.class_id] = curr.status;
        return acc;
    }, {} as Record<string, string>);

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans pb-20 md:pb-0">
            {/* Header navigation - ULTRA GLASS */}
            <header className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-2xl border-b border-white/5 h-20 flex items-center bg-slate-950/80">
                <div className="max-w-4xl mx-auto w-full px-6 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <Link
                            href={`/${slug}/perfil`}
                            className="size-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all border border-white/10 hover:border-white/20 active:scale-90"
                        >
                            <ChevronLeft size={24} strokeWidth={2.5} />
                        </Link>
                        <div className="space-y-0.5">
                            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em] leading-none">{negocio?.nombre || 'Complex'}</p>
                            <h1 className="text-white font-black text-xl tracking-tighter uppercase leading-none truncate max-w-[180px] md:max-w-xs">Mi Curso</h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {negocio?.logoUrl ? (
                            <img src={negocio.logoUrl} alt={negocio.nombre} className="h-10 w-10 rounded-xl object-contain border border-white/10 shadow-lg" />
                        ) : (
                            <Trophy size={20} className="text-emerald-500" />
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 pt-32 pb-12">
                <div className="space-y-8 animate-in fade-in duration-700">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase leading-none text-emerald-500">
                            {course.name}
                        </h1>
                        <p className="text-white/40 font-medium mt-2">
                            Alumno: {enrollment.student_name || enrollment.student?.name || '---'}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                        <div className="p-8">
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Clases del curso</h3>
                            
                            {classes.length === 0 ? (
                                <p className="text-sm font-medium text-slate-400 italic text-center py-6">
                                    No hay clases registradas.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {classes.map(cls => {
                                        const status = attendanceMap[cls.id];
                                        const isPast = new Date(cls.class_date) < new Date();
                                        return (
                                            <div key={cls.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 dark:text-white text-sm uppercase">
                                                        {cls.title}
                                                    </span>
                                                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                        <Calendar size={12} />
                                                        {new Date(cls.class_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div>
                                                    {status === 'present' ? (
                                                        <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">
                                                            <CheckCircle2 size={14} /> Presente
                                                        </span>
                                                    ) : status === 'absent' ? (
                                                        <span className="flex items-center gap-1.5 bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">
                                                            <XCircle size={14} /> Ausente
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">
                                                            <Clock size={14} /> {isPast ? "Sin Registro" : "Pronto"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
