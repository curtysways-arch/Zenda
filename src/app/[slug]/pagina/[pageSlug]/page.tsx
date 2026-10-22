import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, Eye } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getNegocioBySlug } from '@/lib/services';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import {
  isPagePublished, pageExcerpt, pageImage, pageProseCss, resolvePageButtonUrl, isExternalUrl,
} from '@/lib/customPages';

export const dynamic = 'force-dynamic';

type Params = { slug: string; pageSlug: string };
type Search = { [key: string]: string | string[] | undefined };

function accentOf(negocio: any) {
  const c = String(negocio?.colorPrimario || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : '#0f766e';
}

/** Blanco o casi negro según qué se lea mejor sobre el color dado. */
function onColor(hex: string) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.4 ? '#0f172a' : '#ffffff';
}

async function canPreview(negocioId: string) {
  try {
    const session: any = await getEffectiveAdminSession();
    return Boolean(session?.user?.negocioId && session.user.negocioId === negocioId && !session.user.isDelegatedExpired);
  } catch {
    return false;
  }
}

async function loadPage(slug: string, pageSlug: string, wantsPreview: boolean) {
  const negocio: any = await getNegocioBySlug(slug);
  if (!negocio) return null;
  const page: any = await prisma.page.findFirst({
    where: { businessId: negocio.id, slug: decodeURIComponent(pageSlug) },
    include: { imageMedia: true },
  });
  if (!page) return null;
  const published = isPagePublished(page.status);
  if (!published && !(wantsPreview && (await canPreview(negocio.id)))) return null;
  return { negocio, page, published };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const data = await loadPage(slug, pageSlug, false).catch(() => null);
  if (!data) return { title: 'Página no encontrada' };
  const { negocio, page } = data;
  const description = pageExcerpt(page.contentHtml, 155);
  const image = pageImage(page) || negocio.logoUrl || undefined;
  return {
    title: `${page.title} · ${negocio.nombre}`,
    description,
    openGraph: { title: page.title, description, images: image ? [image] : undefined, type: 'article' },
  };
}

export default async function PublicCustomPage({ params, searchParams }: { params: Promise<Params>; searchParams?: Promise<Search> }) {
  const { slug, pageSlug } = await params;
  const sp = (await searchParams) || {};
  const data = await loadPage(slug, pageSlug, sp.vista === 'previa');
  if (!data) notFound();
  const { negocio, page, published } = data;

  const others = await prisma.page.findMany({
    where: { businessId: negocio.id, status: { in: ['published', 'PUBLISHED'] }, id: { not: page.id } },
    select: { id: true, slug: true, title: true, contentHtml: true, featuredImage: true, imageMedia: { select: { url: true } } },
    orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }],
    take: 3,
  }).catch(() => [] as any[]);

  const accent = accentOf(negocio);
  const accentInk = onColor(accent);
  const image = pageImage(page);
  const ctaHref = resolvePageButtonUrl(page.buttonUrl, slug, negocio.whatsapp);
  const ctaExternal = isExternalUrl(ctaHref);
  const ctaText = page.buttonText || '';
  const updated = new Date(page.updatedAt || page.createdAt).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });

  const Cta = ({ className, children }: { className: string; children: React.ReactNode }) =>
    ctaExternal ? (
      <a href={ctaHref} target="_blank" rel="noopener noreferrer" className={className} style={{ backgroundColor: accent, color: accentInk }}>{children}</a>
    ) : (
      <Link href={ctaHref} className={className} style={{ backgroundColor: accent, color: accentInk }}>{children}</Link>
    );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <style dangerouslySetInnerHTML={{ __html: pageProseCss('.page-prose', accent) }} />

      {!published && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950">
          <Eye size={16} /> Vista previa: esta página es un borrador y tus clientes aún no la ven.
        </div>
      )}

      <header className={`sticky ${published ? 'top-0' : 'top-9'} z-40 border-b border-slate-100 bg-white/90 backdrop-blur`}>
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={`/${slug}`} className="flex min-w-0 items-center gap-2.5">
            {negocio.logoUrl ? (
              <img src={negocio.logoUrl} alt="" className="size-9 shrink-0 rounded-full object-cover ring-1 ring-black/5" />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: accent, color: accentInk }}>
                {String(negocio.nombre || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate font-semibold">{negocio.nombre}</span>
          </Link>
          <Link href={`/${slug}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Volver al inicio</span><span className="sm:hidden">Inicio</span>
          </Link>
        </div>
      </header>

      <main className="pb-28 sm:pb-16">
        <div className="mx-auto max-w-3xl px-5 pt-10 sm:px-6 sm:pt-14">
          <p className="text-sm font-medium" style={{ color: accent }}>{negocio.nombre}</p>
          <h1 className="mt-2 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">{page.title}</h1>
          <p className="mt-4 text-sm text-slate-500">Actualizado el {updated}</p>
        </div>

        {image && (
          <div className="mx-auto mt-8 max-w-5xl px-4 sm:px-6">
            <img src={image} alt="" className="aspect-[16/9] w-full rounded-3xl object-cover sm:aspect-[21/9]" />
          </div>
        )}

        <article className="mx-auto mt-10 max-w-3xl px-5 sm:px-6">
          <div className="page-prose" dangerouslySetInnerHTML={{ __html: page.contentHtml || '' }} />
        </article>

        {ctaText && (
          <div className="mx-auto mt-12 max-w-3xl px-5 sm:px-6">
            <div className="flex flex-col items-start gap-4 rounded-3xl bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <p className="text-lg font-semibold leading-snug">¿Te ayudamos con algo más?</p>
              <Cta className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition hover:brightness-110 active:scale-[0.98]">
                {ctaText} <ArrowUpRight size={17} />
              </Cta>
            </div>
          </div>
        )}

        {others.length > 0 && (
          <section className="mx-auto mt-16 max-w-5xl px-5 sm:px-6">
            <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-10">
              <h2 className="text-xl font-bold tracking-tight">Sigue leyendo</h2>
              <Link href={`/${slug}/paginas`} className="text-sm font-medium" style={{ color: accent }}>Ver todas</Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {others.map((o: any) => {
                const img = o.imageMedia?.url || o.featuredImage;
                return (
                  <Link key={o.id} href={`/${slug}/pagina/${o.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 transition hover:border-slate-300 hover:shadow-sm">
                    {img ? (
                      <img src={img} alt="" className="aspect-[16/9] w-full object-cover" />
                    ) : (
                      <span className="flex aspect-[16/9] w-full items-end p-4" style={{ background: `linear-gradient(135deg, ${accent}26, ${accent}0a)` }}>
                        <span className="text-lg font-bold leading-tight" style={{ color: accent }}>{o.title}</span>
                      </span>
                    )}
                    <span className="flex flex-1 flex-col p-4">
                      <span className="font-semibold leading-snug">{o.title}</span>
                      <span className="mt-1 line-clamp-2 text-sm text-slate-500">{pageExcerpt(o.contentHtml, 110)}</span>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium" style={{ color: accent }}>
                        Leer <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {ctaText && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
          <Cta className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold">
            {ctaText} <ArrowUpRight size={17} />
          </Cta>
        </div>
      )}
    </div>
  );
}
