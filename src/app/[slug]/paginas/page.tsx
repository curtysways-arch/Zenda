import { getNegocioBySlug } from '@/lib/services';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ArrowRight, FileText } from 'lucide-react';

export default async function PublicPagesListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const negocio = await getNegocioBySlug(slug);

  if (!negocio) {
    notFound();
  }

  const pages = await prisma.page.findMany({
    where: {
      businessId: negocio.id,
      status: 'published',
    },
    orderBy: { orden: 'asc' },
  });

  const primaryColor = (negocio as any).colorPrimario || '#00c7b1';
  const businessImage = negocio.logoUrl || '/icon.png';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft size={18} />
            <span>Volver a {negocio.nombre}</span>
          </Link>

          <span
            className="text-xs font-extrabold px-3 py-1 rounded-full text-white uppercase tracking-wider"
            style={{ backgroundColor: primaryColor }}
          >
            Páginas &amp; Guías
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-12 space-y-8">
        <div className="space-y-3">
          <span
            className="text-xs font-bold uppercase tracking-wide block"
            style={{ color: primaryColor }}
          >
            Contenido Informativo
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight">
            Artículos, Guías y Recomendaciones
          </h1>
          <p className="text-base text-slate-500 max-w-2xl">
            Conoce a fondo nuestros tratamientos, preguntas frecuentes y cuidados especiales recomendados por nuestros especialistas.
          </p>
        </div>

        {pages.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-700">No hay páginas publicadas</h3>
            <p className="text-xs text-slate-400">Pronto publicaremos nuevo contenido aquí.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pages.map((p) => {
              const snippet = p.contentHtml
                ? p.contentHtml.replace(/<[^>]*>?/gm, '').slice(0, 160) + '...'
                : 'Descubre todos los detalles y recomendaciones de nuestros profesionales.';
              const imgUrl = p.featuredImage || businessImage;

              return (
                <Link
                  key={p.id}
                  href={`/${slug}/pagina/${p.slug}`}
                  className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative w-full h-52 overflow-hidden bg-slate-100">
                      <img
                        src={imgUrl}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider">
                        Guía
                      </div>
                    </div>

                    <div className="p-6 space-y-2">
                      <h2 className="text-xl font-bold text-slate-900 group-hover:text-sky-600 transition-colors leading-snug">
                        {p.title}
                      </h2>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        {snippet}
                      </p>
                    </div>
                  </div>

                  <div
                    className="p-6 pt-0 flex items-center justify-between text-xs font-bold"
                    style={{ color: primaryColor }}
                  >
                    <span className="uppercase tracking-wider">Leer artículo</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
