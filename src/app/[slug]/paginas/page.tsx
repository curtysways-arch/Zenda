import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getNegocioBySlug } from '@/lib/services';
import { pageExcerpt } from '@/lib/customPages';

export const dynamic = 'force-dynamic';

function accentOf(negocio: any) {
  const c = String(negocio?.colorPrimario || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : '#0f766e';
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const negocio: any = await getNegocioBySlug(slug).catch(() => null);
  if (!negocio) return { title: 'Página no encontrada' };
  return { title: `Más sobre ${negocio.nombre}`, description: `Información, guías y preguntas frecuentes de ${negocio.nombre}.` };
}

export default async function PublicPagesListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const negocio: any = await getNegocioBySlug(slug);
  if (!negocio) notFound();

  const pages = await prisma.page.findMany({
    where: { businessId: negocio.id, status: { in: ['published', 'PUBLISHED'] } },
    include: { imageMedia: true },
    orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }],
  });

  const accent = accentOf(negocio);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={`/${slug}`} className="flex min-w-0 items-center gap-2.5">
            {negocio.logoUrl && <img src={negocio.logoUrl} alt="" className="size-9 shrink-0 rounded-full object-cover ring-1 ring-black/5" />}
            <span className="truncate font-semibold">{negocio.nombre}</span>
          </Link>
          <Link href={`/${slug}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <ArrowLeft size={16} /> Inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14">
        <p className="text-sm font-medium" style={{ color: accent }}>{negocio.nombre}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Conoce más</h1>
        <p className="mt-3 max-w-2xl text-slate-500">Todo lo que necesitas saber antes y después de visitarnos.</p>

        {pages.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-12 text-center">
            <FileText className="mx-auto text-slate-300" size={40} />
            <p className="mt-3 font-semibold text-slate-700">Pronto publicaremos contenido aquí.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {pages.map((p: any) => {
              const img = p.imageMedia?.url || p.featuredImage;
              return (
                <Link key={p.id} href={`/${slug}/pagina/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
                  {img ? (
                    <img src={img} alt="" className="aspect-[16/9] w-full object-cover" />
                  ) : (
                    <span className="flex aspect-[16/9] w-full items-end p-6" style={{ background: `linear-gradient(135deg, ${accent}26, ${accent}0a)` }}>
                      <span className="text-3xl font-bold leading-tight tracking-tight" style={{ color: accent }}>{p.title}</span>
                    </span>
                  )}
                  <span className="flex flex-1 flex-col p-6">
                    <span className="text-xl font-bold leading-snug">{p.title}</span>
                    <span className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">{pageExcerpt(p.contentHtml, 170)}</span>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: accent }}>
                      Leer <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
