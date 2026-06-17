import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
    Users, 
    Calendar, 
    Clock, 
    ChevronLeft, 
    MapPin, 
    CheckCircle2, 
    ArrowRight, 
    Sparkles, 
    Dribbble, 
    ShieldCheck,
    Coins
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { getNegocioBySlug } from '@/lib/services';
import EnrollmentClientWrapper from '@/components/public/EnrollmentClientWrapper';

interface CoursePageProps {
    params: Promise<{ slug: string; id: string }>;
}

export default async function CourseDetailPage({ params }: CoursePageProps) {
    const { slug, id } = await params;

    const negocio = await getNegocioBySlug(slug);
    if (!negocio) notFound();

    const rawCurso = await (prisma as any).course.findUnique({
        where: { id },
        include: {
            CourseSchedule: {
                include: { Service: { select: { nombre: true, Ubicacion: { select: { nombre: true } } } } }
            },
            _count: {
                select: { CourseEnrollment: { where: { status: 'approved' } } }
            }
        }
    });

    if (!rawCurso || rawCurso.businessId !== negocio.id) {
        notFound();
    }

    const curso = {
        ...rawCurso,
        schedules: rawCurso.CourseSchedule?.map((cs: any) => ({
            ...cs,
            service: {
                nombre: cs.Service?.nombre,
                ubicacion: cs.Service?.Ubicacion
            }
        })) || [],
        _count: {
            enrollments: rawCurso._count?.CourseEnrollment || 0
        }
    };

    const isFull = curso._count.enrollments >= curso.capacity;

    return (
        <main className="min-h-screen bg-neutral-50">
            {/* Header navigation - ULTRA GLASS */}
            <header 
                className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-2xl border-b border-gray-100 h-20 flex items-center bg-white/80 shadow-sm"
            >
                <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <Link
                            href={`/${slug}#cursos`}
                            className="size-12 rounded-2xl bg-gray-50 hover:bg-gray-100 text-slate-900 flex items-center justify-center transition-all border border-gray-100 hover:border-gray-200 active:scale-90"
                        >
                            <ChevronLeft size={24} strokeWidth={2.5} />
                        </Link>
                        <div className="space-y-0.5">
                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] leading-none opacity-60">{negocio.nombre}</p>
                            <h1 className="text-slate-900 font-black text-xl tracking-tighter uppercase leading-none truncate max-w-[180px] md:max-w-xs">{curso.name}</h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {negocio.logoUrl ? (
                            <img src={negocio.logoUrl} alt={negocio.nombre} className="h-10 w-10 rounded-xl object-contain border border-white/10 shadow-lg" />
                        ) : (
                            <div className="size-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: negocio.colorPrimario || '#1dc95c' }}>
                                <Sparkles size={20} className="text-white" />
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 pt-32 pb-12 md:pb-20">
                {/* Hero Info - TAKE FULL WIDTH AT TOP */}
                <div className="mb-12 space-y-8">
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <span 
                                className="text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg"
                                style={{ backgroundColor: negocio.colorPrimario || '#1dc95c', boxShadow: `0 10px 15px -3px ${negocio.colorPrimario || '#1dc95c'}33` }}
                            >
                                Formación Profesional
                            </span>
                            <span className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border border-slate-200 dark:border-white/10">
                                Pago {String(curso.payment_type).toUpperCase() === 'TOTAL' ? 'UNICO' : curso.payment_type}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9] italic uppercase">
                            {curso.name}
                        </h1>
                    </div>

                    {curso.imageUrl && (
                        <div className="rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 ring-1 ring-slate-100 dark:ring-white/5 bg-slate-50 dark:bg-slate-900/50 max-w-4xl mx-auto">
                            <img src={curso.imageUrl} alt={curso.name} className="w-full h-auto block" />
                        </div>
                    )}

                    {curso.description && (
                        <p 
                            className="text-xl md:text-2xl font-bold text-slate-500 leading-relaxed italic border-l-4 pl-8 py-4 max-w-4xl"
                            style={{ borderColor: negocio.colorPrimario || '#1dc95c' }}
                        >
                            "{curso.description}"
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* Right Column: Price & Stats (Order First on Mobile) */}
                    <div className="lg:col-span-4 space-y-8 order-first lg:order-last">
                        {/* Course Card Summary */}
                        <div className="sticky top-32 space-y-8">
                            <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
                                <div className="p-10 space-y-10">
                                    {/* Price Card */}
                                    <div 
                                        className="rounded-[2.5rem] p-10 text-white text-center shadow-2xl relative overflow-hidden group mb-6"
                                        style={{ backgroundColor: negocio.colorPrimario || '#1dc95c' }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 opacity-90 italic">Valor del Programa</p>
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="text-2xl font-bold opacity-80 mt-2">$</span>
                                            <h3 className="text-6xl font-black tracking-tighter italic leading-none">{curso.price.toLocaleString()}</h3>
                                        </div>
                                    </div>

                                    {/* Quick Stats */}
                                    {/* Exclusivity Message */}
                                    {!isFull && (
                                        <div className="flex items-center justify-center gap-2 py-2 mb-4 animate-pulse">
                                            <div className="size-1.5 rounded-full bg-red-500" />
                                            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">Inscripciones con cupo limitado</p>
                                        </div>
                                    )}

                                    {/* Duration - COMPACT */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 px-2">
                                            <Calendar size={14} style={{ color: negocio.colorPrimario || '#1dc95c' }} /> Periodo de Formación
                                        </h4>
                                        <div className="bg-white rounded-3xl p-6 border border-gray-100 flex items-center justify-between gap-2 shadow-sm">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Apertura</span>
                                                <span className="text-sm font-black text-slate-900 italic">
                                                    {curso.start_date ? new Date(curso.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Inmediata'}
                                                </span>
                                            </div>
                                            <div className="h-0.5 flex-1 bg-gray-50 relative mx-4">
                                                <div className="absolute inset-y-0 left-0 w-full rounded-full opacity-20" style={{ backgroundColor: negocio.colorPrimario || '#1dc95c' }} />
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Finalización</span>
                                                <span className="text-sm font-black text-slate-900 italic">
                                                    {curso.end_date ? new Date(curso.end_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Flexible'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sessions */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 px-2">
                                            <Clock size={14} style={{ color: negocio.colorPrimario || '#1dc95c' }} /> Cronograma de Sesiones
                                        </h4>
                                        <div className="space-y-2">
                                            {curso.schedules.map((s: any) => (
                                                <div key={s.id} className="group bg-white hover:border-gray-200 p-4 rounded-2xl border border-gray-100 transition-all flex items-center justify-between shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div 
                                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border shadow-sm transition-colors"
                                                            style={{ color: negocio.colorPrimario || '#1dc95c', borderColor: `${negocio.colorPrimario || '#1dc95c'}22`, backgroundColor: `${negocio.colorPrimario || '#1dc95c'}05` }}
                                                        >
                                                            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][s.day_of_week]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900 italic leading-tight">{s.start_time} - {s.end_time}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5" style={{ color: negocio.colorPrimario || '#1dc95c' }}>
                                                                <MapPin size={10} /> {s.title || 'Sesión de Formación'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <EnrollmentClientWrapper 
                                        course={curso} 
                                        businessSlug={slug}
                                        isFull={isFull}
                                        primaryColor={negocio.colorPrimario}
                                    />
                                    
                                    <p className="text-[9px] text-center text-slate-400 font-bold italic px-4 leading-relaxed">
                                        Al inscribirte, un asesor de {negocio.nombre} se pondrá en contacto para coordinar el pago.
                                    </p>
                                </div>
                            </div>

                            {/* Trust Badge */}
                            <div 
                                className="p-6 rounded-[2rem] border flex items-center gap-4 transition-all"
                                style={{ backgroundColor: `${negocio.colorPrimario || '#1dc95c'}11`, borderColor: `${negocio.colorPrimario || '#1dc95c'}22` }}
                            >
                                <div className="size-11 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg shrink-0">
                                    <ShieldCheck size={20} style={{ color: negocio.colorPrimario || '#1dc95c' }} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: negocio.colorPrimario || '#1dc95c' }}>Satisfacción Certificada</p>
                                    <p className="text-[9px] font-bold opacity-50 italic leading-tight text-slate-500">Un programa diseñado para elevar tu nivel profesional desde el primer día.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Left Column: Detailed Description */}
                    <div className="lg:col-span-8 space-y-12 order-last lg:order-first">
                        {/* Detailed Content */}
                        {curso.content ? (
                            <div className="prose prose-slate prose-lg md:prose-xl max-w-none break-words
                                prose-headings:text-slate-900 prose-headings:font-black
                                prose-p:leading-relaxed prose-p:text-slate-600
                                prose-strong:text-slate-900 prose-strong:font-black
                                prose-img:rounded-[2.5rem] prose-img:shadow-2xl
                                bg-white p-8 md:p-12 rounded-[3.5rem] border border-gray-100 shadow-sm"
                                dangerouslySetInnerHTML={{ __html: curso.content }}
                            />
                        ) : (
                            <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-sm">
                                <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                                <p className="text-slate-400 font-bold italic text-xs uppercase tracking-widest">No hay información detallada adicional para este curso.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

function FileText(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
    )
}
