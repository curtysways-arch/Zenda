'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Users, Calendar, Clock, ChevronRight, ArrowRight, CheckCircle, PlusCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublicCoursesSectionProps {
    cursosActivos: any[];
    businessSlug: string;
    primaryColor?: string;
    tertiaryColor?: string;
    textColor?: string;
    showPrices?: boolean;
}

export default function PublicCoursesSection({ 
    cursosActivos, 
    businessSlug,
    primaryColor = 'var(--primary)',
    tertiaryColor = '#7B68EE',
    textColor = '#000000',
    showPrices = true
}: PublicCoursesSectionProps) {
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [isIdModalOpen, setIsIdModalOpen] = useState(false);
    const [userEnrollments, setUserEnrollments] = useState<string[]>([]);
    const router = useRouter();

    const getAlphaColor = (color: string, alphaHex: string, alphaPercent: string) => {
        if (color.startsWith('var(')) {
            return `color-mix(in srgb, ${color} ${alphaPercent}%, transparent)`;
        }
        return `${color}${alphaHex}`;
    };

    useEffect(() => {
        const checkEnrollments = async () => {
            const localEnrolled = JSON.parse(localStorage.getItem('enrolled_courses') || '[]');
            setUserEnrollments(localEnrolled);

            try {
                const res = await fetch(`/api/${businessSlug}/perfil`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.enrollments) {
                        const serverEnrolled = data.enrollments.map((e: any) => e.courseId);
                        setUserEnrollments(prev => Array.from(new Set([...prev, ...serverEnrolled])));
                    }
                }
            } catch (error) {
                console.error("Error checking enrollments:", error);
            }
        };

        checkEnrollments();

        window.addEventListener('storage', checkEnrollments);
        window.addEventListener('course_enrolled', checkEnrollments);
        return () => {
            window.removeEventListener('storage', checkEnrollments);
            window.removeEventListener('course_enrolled', checkEnrollments);
        };
    }, [businessSlug]);

    const handleCourseClick = (e: React.MouseEvent, curso: any) => {
        e.preventDefault();
        router.push(`/${businessSlug}/cursos/${curso.id}`);
    };

    if (!cursosActivos || cursosActivos.length === 0) return null;

    return (
        <section id="cursos" className="px-6 mb-20">
            <div className="flex flex-col gap-2 mb-10">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                    <h3 className="text-3xl font-black tracking-tighter italic uppercase" style={{ color: textColor }}>
                        Academia & Formación
                    </h3>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-5">Programas profesionales certificados</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {cursosActivos.map((curso: any) => {
                    const isFull = curso._count.enrollments >= curso.capacity;
                    const isEnrolled = userEnrollments.includes(curso.id);

                    return (
                        <div 
                            key={curso.id} 
                            onClick={(e) => handleCourseClick(e, curso)}
                            className="group bg-white rounded-[3rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col cursor-pointer relative transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] hover:-translate-y-1 active:scale-[0.98]"
                        >
                            {/* Hero Image Area */}
                            <div className="relative h-64 w-full overflow-hidden bg-slate-50">
                                {curso.imageUrl ? (
                                    <div 
                                        className="w-full h-full bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                                        style={{ backgroundImage: `url(${curso.imageUrl})` }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                                        <GraduationCap className="text-slate-200" size={80} />
                                    </div>
                                )}
                                
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />

                                {/* Floating Badges */}
                                <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
                                    <div className="bg-white/90 backdrop-blur-xl shadow-lg text-slate-900 text-[8px] font-black px-4 py-2 rounded-full uppercase tracking-[0.2em] border border-white/20">
                                        {String(curso.payment_type).toUpperCase() === 'TOTAL' || String(curso.payment_type).toUpperCase() === 'ONE_TIME' 
                                            ? 'Certificación' 
                                            : 'Programa Mensual'}
                                    </div>
                                    <div className={cn(
                                        "bg-white/90 backdrop-blur-xl shadow-lg px-4 py-2 rounded-full flex items-center gap-2 border border-white/20",
                                        isFull ? 'text-rose-500' : 'text-slate-900'
                                    )}>
                                        <Users size={12} className={isFull ? 'text-rose-500' : 'text-slate-400'} />
                                        <span className="text-[10px] font-black">
                                            {isFull ? 'COMPLETO' : `${curso._count.enrollments}/${curso.capacity}`}
                                        </span>
                                    </div>
                                </div>

                                {/* Content on Image */}
                                <div className="absolute bottom-6 left-6 right-6 z-10">
                                     <h4 className="text-2xl font-black text-white leading-tight tracking-tighter uppercase italic group-hover:translate-x-1 transition-transform">
                                        {curso.name}
                                    </h4>
                                    {curso.coach && (
                                        <p className="text-white/70 text-[10px] font-bold mt-2 uppercase tracking-widest flex items-center gap-2">
                                            <Sparkles size={12} style={{ color: primaryColor }} />
                                            Por: {curso.coach}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="p-8 flex-1 flex flex-col gap-6">
                                {/* Schedules */}
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Próximas Sesiones</p>
                                    <div className="flex flex-wrap gap-2">
                                        {curso.schedules.slice(0, 3).map((s: any) => (
                                            <div key={s.id} 
                                                className="px-4 py-1.5 rounded-2xl text-[9px] font-black border transition-colors"
                                                style={{ 
                                                    backgroundColor: getAlphaColor(primaryColor, '08', '8'),
                                                    borderColor: getAlphaColor(primaryColor, '15', '15'),
                                                    color: primaryColor
                                                }}
                                            >
                                                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][s.day_of_week]} • {s.start_time}
                                            </div>
                                        ))}
                                        {curso.schedules.length > 3 && (
                                             <div className="bg-slate-50 text-slate-400 px-4 py-1.5 rounded-2xl text-[9px] font-black border border-slate-100">
                                                 +{curso.schedules.length - 3} más
                                             </div>
                                        )}
                                    </div>
                                </div>

                                {/* Description Preview */}
                                {curso.description && (
                                    <p className="text-sm text-slate-500 font-medium line-clamp-2 italic leading-relaxed">
                                        "{curso.description}"
                                    </p>
                                )}

                                {/* Footer Action */}
                                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between gap-4">
                                    <div className="text-slate-900">
                                        {showPrices && (
                                            <>
                                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] leading-none mb-1.5">Inversión</p>
                                                <div className="flex items-baseline gap-0.5">
                                                    <span className="text-sm font-bold opacity-40" style={{ color: primaryColor }}>$</span>
                                                    <p className="text-3xl font-black tracking-tighter italic" style={{ color: primaryColor }}>{curso.price.toLocaleString()}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div
                                        className={cn(
                                            "h-14 px-8 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-xl",
                                            isEnrolled 
                                                ? "bg-slate-100 text-slate-400 shadow-none" 
                                                : "text-white"
                                        )}
                                        style={!isEnrolled ? { backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${getAlphaColor(primaryColor, '40', '25')}` } : {}}
                                    >
                                        {isEnrolled ? (
                                            <>INSCRITO <CheckCircle size={18} /></>
                                        ) : (
                                            <>RESERVAR <ArrowRight size={18} strokeWidth={3} /></>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

        </section>
    );
}
