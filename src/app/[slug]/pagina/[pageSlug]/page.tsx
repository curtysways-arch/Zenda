import { getNegocioBySlug } from '@/lib/services';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import {
    ChevronLeft,
    Calendar,
    Zap,
    Trophy,
    Home,
    User,
    ChevronRight,
    Sparkles,
    ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

export default async function PublicCustomPage({
    params,
}: {
    params: Promise<{ slug: string; pageSlug: string }>;
}) {
    const { slug, pageSlug } = await params;
    const negocio = await getNegocioBySlug(slug);

    if (!negocio) {
        notFound();
    }

    const page = await prisma.page.findFirst({
        where: {
            businessId: negocio.id,
            slug: pageSlug,
            status: 'published',
        },
    });

    if (!page) {
        notFound();
    }

    const primaryColor = (negocio as any).colorPrimario || '#000000';
    const secondaryColor = (negocio as any).colorSecundario || '#ffffff';

    let finalButtonUrl = page.buttonUrl || `https://wa.me/${negocio.whatsapp?.replace(/\D/g, '') || ''}`;
    
    // Autocorrección temporal para enlaces guardados con la estructura anterior
    if (finalButtonUrl.startsWith('/cancha/')) {
        finalButtonUrl = finalButtonUrl.replace('/cancha/', '/servicio/');
    }
    
    // Inyectar el slug del negocio en URLs relativas para evitar 404
    if (finalButtonUrl.startsWith('/') && !finalButtonUrl.startsWith(`/${slug}`)) {
        if (finalButtonUrl === '/') {
            finalButtonUrl = `/${slug}`;
        } else if (finalButtonUrl.startsWith('/#')) {
            finalButtonUrl = `/${slug}${finalButtonUrl.substring(1)}`;
        } else {
            finalButtonUrl = `/${slug}${finalButtonUrl}`;
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-black selection:text-white relative overflow-x-hidden pb-32">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                
                body { font-family: 'Plus Jakarta Sans', sans-serif; scroll-behavior: smooth; }

                /* Premium Prose Styling */
                .prose {
                    color: #334155;
                    font-size: 1.125rem;
                    line-height: 1.8;
                }
                .prose h1, .prose h2, .prose h3 {
                    color: #0f172a;
                    font-weight: 900;
                    letter-spacing: -0.04em;
                    margin-top: 3.5rem;
                    margin-bottom: 1.5rem;
                    line-height: 1.1;
                }
                .prose h2 { font-size: 2.25rem; }
                .prose h3 { font-size: 1.75rem; }
                .prose p { margin-bottom: 1.75rem; opacity: 0.9; }
                .prose a {
                    color: ${primaryColor};
                    text-decoration: none;
                    font-weight: 700;
                    border-bottom: 2px solid ${primaryColor}40;
                    transition: all 0.3s;
                }
                .prose a:hover {
                    border-bottom-color: ${primaryColor};
                }
                .prose strong { color: #0f172a; font-weight: 800; }
                .prose blockquote {
                    position: relative;
                    padding: 2.5rem 3rem;
                    margin: 4rem 0;
                    background: white;
                    border-radius: 2rem;
                    font-style: italic;
                    color: #0f172a;
                    font-size: 1.25rem;
                    line-height: 1.7;
                    box-shadow: 0 20px 40px -15px rgba(0,0,0,0.05);
                    border: 1px solid #f1f5f9;
                }
                .prose blockquote::before {
                    content: '"';
                    position: absolute;
                    top: -1.5rem;
                    left: 2rem;
                    font-size: 5rem;
                    font-weight: 900;
                    color: ${primaryColor}20;
                    font-family: serif;
                    line-height: 1;
                }
                .prose img {
                    border-radius: 2rem;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
                    margin: 4rem 0;
                    width: 100%;
                    height: auto;
                }
                .prose ul { margin: 2rem 0; padding-left: 1.5rem; list-style-type: none; }
                .prose ul li { position: relative; margin-bottom: 1rem; padding-left: 1.5rem; }
                .prose ul li::before {
                    content: '•';
                    position: absolute;
                    left: 0;
                    color: ${primaryColor};
                    font-weight: bold;
                    font-size: 1.5rem;
                    line-height: 1;
                    top: -0.25rem;
                }

                @keyframes float { 
                    0% { transform: translateY(0px); } 
                    50% { transform: translateY(-15px); } 
                    100% { transform: translateY(0px); } 
                }
                .float-anim { animation: float 6s ease-in-out infinite; }
            ` }} />

            {/* Header Flotante */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between pointer-events-none">
                <Link href={`/${slug}`} className="size-12 flex items-center justify-center text-slate-900 bg-white/90 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:scale-105 active:scale-95 transition-all border border-white pointer-events-auto">
                    <ChevronLeft size={24} strokeWidth={2.5} />
                </Link>
                <div className="px-5 py-2.5 bg-white/90 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white pointer-events-auto flex items-center gap-2">
                    <Sparkles size={14} style={{ color: primaryColor }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: primaryColor }}>
                        {negocio.nombre}
                    </span>
                </div>
            </header>

            {/* Portada Inmersiva */}
            <div className="relative w-full h-[60vh] md:h-[70vh] bg-slate-900 overflow-hidden">
                {page.featuredImage ? (
                    <img 
                        src={page.featuredImage} 
                        alt={page.title} 
                        className="w-full h-full object-cover opacity-80 scale-105 float-anim" 
                        style={{ animationDuration: '20s' }}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <Trophy size={100} className="text-white/10" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-900/40 to-slate-900/20" />
            </div>

            {/* Contenido Principal Overlap */}
            <main className="relative z-20 px-6 max-w-4xl mx-auto -mt-48">
                {/* Título de la Página */}
                <div className="text-center mb-16 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-[10px] font-black uppercase tracking-widest shadow-xl">
                        <Calendar size={12} />
                        {new Date(page.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tighter drop-shadow-2xl">
                        {page.title}
                    </h1>
                </div>

                {/* Contenedor del Artículo */}
                <div className="bg-white rounded-[3rem] md:rounded-[4rem] p-8 md:p-16 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 relative">
                    {/* El Artículo */}
                    <div
                        className="prose prose-slate max-w-none"
                        dangerouslySetInnerHTML={{ __html: page.contentHtml }}
                    />

                    {/* Botón de Acción */}
                    {(page.buttonText || page.buttonUrl) && (
                        <div className="flex justify-center">
                            <Link
                                href={finalButtonUrl}
                                className="inline-flex items-center gap-3 px-10 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {page.buttonText || 'Agendar Sesión'}
                                <ArrowUpRight size={18} />
                            </Link>
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom Nav App-like (solo móvil) */}
            <nav className="fixed bottom-4 left-4 right-4 z-50 bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-100 px-6 py-4 flex items-center justify-between shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] md:hidden">
                <Link href={`/${slug}`} className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                    <Home size={20} strokeWidth={2.5} className="text-slate-900" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">Inicio</span>
                </Link>
                <Link href={`/${slug}#servicios`} className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                    <Calendar size={20} strokeWidth={2.5} className="text-slate-900" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">Servicios</span>
                </Link>
                
                {/* Botón Central de Reserva */}
                <Link 
                    href={`/${slug}#reservar`}
                    className="relative -mt-10 group"
                >
                    <div className="absolute inset-0 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-all" style={{ backgroundColor: primaryColor }} />
                    <div 
                        className="size-16 rounded-full flex items-center justify-center text-white shadow-xl relative z-10 hover:scale-110 active:scale-95 transition-all border-4 border-white"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Calendar size={24} fill="currentColor" className="text-white/20" />
                    </div>
                </Link>

                <Link href={`/${slug}/portafolio`} className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                    <Sparkles size={20} strokeWidth={2.5} className="text-slate-900" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">Resultados</span>
                </Link>
                <Link href={`/${slug}/mis-reservas`} className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                    <User size={20} strokeWidth={2.5} className="text-slate-900" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">Perfil</span>
                </Link>
            </nav>
        </div>
    );
}
