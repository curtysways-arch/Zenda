
import { getNegocioBySlug } from '@/lib/services';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { 
    ArrowLeft, Heart, MessageCircle, Share2, 
    Sparkles, ArrowLeftRight, Image as ImageIcon, 
    ChevronLeft, ChevronRight, X, Send,
    User, Calendar, Clock
} from 'lucide-react';
import PortfolioGrid from '@/components/public/PortfolioGrid';

export const dynamic = 'force-dynamic';

export default async function FullPortfolioPage({
    params
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const negocio = await getNegocioBySlug(slug);

    if (!negocio) notFound();

    const primaryColor = (negocio as any).colorPrimario || 'var(--primary)';
    const textColor = (negocio as any).colorTexto || '#000000';

    // Fetch all works
    let allResultados: any[] = [];
    try {
        allResultados = await prisma.$queryRawUnsafe(`
            SELECT r.*, 
                   s.nombre as service_nombre, 
                   st.name as staff_name, 
                   st.avatar as staff_avatar,
                   m.url as staff_media_url,
                   (SELECT COUNT(*) FROM LikeResultado l WHERE l.resultadoId = r.id) as likes_count,
                   (SELECT COUNT(*) FROM CommentResultado c WHERE c.resultadoId = r.id) as comments_count
            FROM Resultado r
            LEFT JOIN Cancha s ON r.serviceId = s.id
            LEFT JOIN Staff st ON r.staffId = st.id
            LEFT JOIN Media m ON st.imageMediaId = m.id
            WHERE r.businessId = '${negocio.id}' 
            AND r.published = true 
            ORDER BY r.featured DESC, r.createdAt DESC
        `);

        allResultados = allResultados.map(r => ({
            ...r,
            gallery: typeof r.gallery === 'string' ? JSON.parse(r.gallery) : (r.gallery || []),
            service: r.serviceId ? { nombre: r.service_nombre } : null,
            staff: r.staffId ? { 
                name: r.staff_name, 
                avatar: r.staff_avatar,
                imageMedia: r.staff_media_url ? { url: r.staff_media_url } : null
            } : null,
            likesCount: Number(r.likes_count || 0),
            commentsCount: Number(r.comments_count || 0)
        }));
    } catch (e) {
        console.error("Error loading portfolio:", e);
    }

    return (
        <main className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <Link href={`/${slug}`} className="flex items-center gap-3 text-slate-900 group">
                    <div className="size-10 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <ArrowLeft size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Volver a</span>
                        <span className="text-sm font-black uppercase tracking-tight">{negocio.nombre}</span>
                    </div>
                </Link>
                
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-500">
                        <Sparkles size={20} />
                    </div>
                </div>
            </header>

            <section className="px-6 py-8 text-center max-w-2xl mx-auto">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 block" style={{ color: primaryColor }}>PORTAFOLIO</span>
                <h1 className="text-5xl font-black tracking-tight leading-none" style={{ color: textColor }}>
                    Resultados
                </h1>
            </section>

            {/* Instagram Style Grid */}
            <section className="px-4 max-w-5xl mx-auto">
                <PortfolioGrid 
                    items={allResultados} 
                    slug={slug} 
                    primaryColor={primaryColor} 
                />
            </section>
        </main>
    );
}
