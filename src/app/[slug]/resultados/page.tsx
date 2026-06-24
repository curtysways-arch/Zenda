import prisma from '@/lib/prisma';
import { getNegocioBySlug } from '@/lib/services';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Camera, Sparkles, User, Scissors, Calendar, ArrowLeft } from 'lucide-react';
import BeforeAfterSlider from '@/components/public/BeforeAfterSlider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ResultInteraction from '@/components/public/ResultInteraction';

export const dynamic = 'force-dynamic';


interface ResultadosPublicPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export default async function ResultadosPublicPage({ params }: ResultadosPublicPageProps) {
    const { slug } = await params;
    const negocio = await getNegocioBySlug(slug);

    if (!negocio) return notFound();

    const resultados = await prisma.resultado.findMany({
        where: { businessId: negocio.id, published: true },
        include: {
      Service: true,
      Staff: { include: { imageMedia: true } },
    },
    orderBy: { date: 'desc' },
    });

    const primaryColor = (negocio as any).colorPrimario || '#10b981';
    const textColor = (negocio as any).colorTexto || '#111827';

    return (
        <div className="min-h-screen bg-[#FFF5F5] dark:bg-slate-950 pb-20">
            {/* Header / Banner */}
            <header className="relative h-[40vh] overflow-hidden flex items-center justify-center text-center px-6">
                <div className="absolute inset-0 bg-slate-950">
                    <img 
                        src={negocio.logoUrl || 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=1200'} 
                        className="w-full h-full object-cover opacity-30 grayscale blur-sm"
                        alt={negocio.nombre}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950" />
                </div>
                
                <div className="relative z-10 space-y-4">
                    <Link 
                        href={`/${slug}`}
                        className="inline-flex items-center gap-2 p-2 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/80 hover:bg-white/20 transition-all text-[10px] font-black uppercase tracking-widest mb-6"
                    >
                        <ArrowLeft size={14} />
                        Volver
                    </Link>
                    <div className="flex flex-col items-center">
                        <span className="text-emerald-400 font-black text-xs uppercase tracking-[0.4em] mb-2">Portfolio</span>
                        <h1 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter leading-none">Nuestros Resultados</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-12">
                    {resultados.map((res) => (
                        <div key={res.id} className="group bg-white rounded-[3.5rem] border border-slate-100/60 shadow-2xl p-6 md:p-10 space-y-8 animate-in slide-in-from-bottom duration-500">
                            {/* Comparador Interactivo */}
                            <div className="relative">
                                <BeforeAfterSlider
                                    beforeImg={res.beforeImage}
                                    afterImg={res.afterImage}
                                />
                                {res.featured && (
                                    <div className="absolute -top-4 -right-4 size-16 bg-amber-400 rounded-full flex items-center justify-center text-white shadow-2xl border-4 border-white rotate-12 group-hover:rotate-0 transition-transform">
                                        <Sparkles size={24} />
                                    </div>
                                )}
                            </div>

                            {/* Información detallada */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                {res.Service?.nombre || 'Especial'}
                                            </span>
                                            <div className="h-px w-8 bg-slate-100" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {format(new Date(res.date), "MMM yyyy", { locale: es })}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-900 leading-tight tracking-tight uppercase italic">{res.title}</h2>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Realizado por</p>
                                        <div className="flex items-center gap-3 justify-end">
                                            <p className="text-sm font-black text-slate-900 uppercase italic leading-none">{res.Staff?.name || 'Profesional'}</p>
                                            <div className="size-10 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-xl overflow-hidden">
                                                 {(res.Staff?.imageMedia || res.Staff?.avatar) 
                                                     ? <img src={(res.Staff.imageMedia as any)?.url ?? res.Staff.avatar} className="w-full h-full object-cover" /> 
                                                     : <User size={18} />}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {res.description && (
                                    <p className="text-slate-500 font-medium leading-relaxed border-l-4 border-slate-100 pl-6 py-1 italic">
                                        "{res.description}"
                                    </p>
                                )}

                                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                    <Link
                                        href={`/${slug}/?serviceId=${res.serviceId}&staffId=${res.staffId}#reservar`}
                                        className="flex-1 py-5 px-8 rounded-full bg-slate-950 text-white font-black text-sm uppercase italic tracking-widest flex items-center justify-between group/btn hover:bg-emerald-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                                    >
                                        Reservar este Servicio
                                        <ChevronRight size={18} className="group-hover/btn:translate-x-2 transition-transform duration-500" />
                                    </Link>
                                    <div className="hidden sm:flex size-16 rounded-full border-2 border-slate-100 items-center justify-center text-slate-300">
                                        <Camera size={20} />
                                    </div>
                                </div>

                                {/* Componente de Interacción (Likes / Comentarios) */}
                                <ResultInteraction 
                                    resultadoId={res.id} 
                                    businessSlug={slug}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {resultados.length === 0 && (
                    <div className="py-20 text-center bg-white/50 backdrop-blur-md rounded-[4rem] border-2 border-dashed border-slate-200">
                        <Camera size={64} className="mx-auto text-slate-200 mb-6" />
                        <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter">Próximamente más resultados</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Estamos capturando nuestros mejores trabajos</p>
                    </div>
                )}
            </main>
        </div>
    );
}
