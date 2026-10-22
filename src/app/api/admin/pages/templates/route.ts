import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getPagesAccess, uniquePageSlug, newPageId, pageError, sanitizePageHtml } from '@/lib/customPagesServer';
import { detectPageKind, templatesFor, getPageTemplate, fillTemplate } from '@/lib/pageTemplates';
import { slugifyPageTitle } from '@/lib/customPages';

export const dynamic = 'force-dynamic';

async function loadNegocio(businessId: string) {
  return prisma.negocio.findUnique({
    where: { id: businessId },
    select: { id: true, nombre: true, slug: true, whatsapp: true, tipoNegocio: true, configuracion: true, isDemo: true },
  });
}

/**
 * GET — datos del negocio para el editor (nombre, dirección pública) y las plantillas sugeridas
 * con su contenido ya personalizado.
 */
export async function GET() {
  try {
    const access = await getPagesAccess();
    if (!access.ok) return access.response;
    const negocio = await loadNegocio(access.businessId);
    if (!negocio) return pageError('Negocio no encontrado.', 404);

    const kind = detectPageKind(negocio);
    const existing = await prisma.page.findMany({ where: { businessId: negocio.id }, select: { slug: true } });
    const used = new Set(existing.map((p) => p.slug));

    return NextResponse.json({
      negocio: { nombre: negocio.nombre, slug: negocio.slug, whatsapp: negocio.whatsapp, isDemo: Boolean((negocio as any).isDemo) },
      kind,
      templates: templatesFor(kind).map((t) => ({
        key: t.key,
        title: t.title,
        description: t.description,
        posicion: t.posicion,
        buttonText: t.buttonText || '',
        buttonUrl: t.buttonUrl || '',
        html: fillTemplate(t.html, { negocio: negocio.nombre }),
        exists: used.has(slugifyPageTitle(t.title)),
      })),
    });
  } catch (error) {
    console.error('[GET_PAGE_TEMPLATES_ERROR]', error);
    return pageError('No se pudieron cargar las plantillas.', 500);
  }
}

/** POST { keys: string[], status?: 'draft'|'published' } — crea varias páginas a partir de plantillas. */
export async function POST(req: Request) {
  try {
    const access = await getPagesAccess();
    if (!access.ok) return access.response;
    const negocio = await loadNegocio(access.businessId);
    if (!negocio) return pageError('Negocio no encontrado.', 404);

    const body = await req.json().catch(() => ({}));
    const keys: string[] = Array.isArray(body.keys) ? body.keys.filter((k: any) => typeof k === 'string').slice(0, 20) : [];
    if (!keys.length) return pageError('Elige al menos una plantilla.');
    const status = body.status === 'published' ? 'published' : 'draft';

    const existing = await prisma.page.findMany({ where: { businessId: negocio.id }, select: { slug: true, orden: true } });
    const used = new Set(existing.map((p) => p.slug));
    let orden = existing.reduce((m, p) => Math.max(m, p.orden ?? 0), 0);

    const created: { id: string; title: string; slug: string }[] = [];
    for (const key of keys) {
      const t = getPageTemplate(key);
      if (!t || used.has(slugifyPageTitle(t.title))) continue;
      const slug = await uniquePageSlug(negocio.id, t.title);
      const id = newPageId();
      const now = new Date();
      orden += 1;
      await prisma.page.create({
        data: {
          id,
          businessId: negocio.id,
          title: t.title,
          slug,
          contentHtml: sanitizePageHtml(fillTemplate(t.html, { negocio: negocio.nombre })),
          buttonText: t.buttonText || null,
          buttonUrl: t.buttonUrl || null,
          status,
          posicion: t.posicion,
          orden,
          createdAt: now,
          updatedAt: now,
        },
      });
      used.add(slug);
      created.push({ id, title: t.title, slug });
    }

    return NextResponse.json({ success: true, created }, { status: 201 });
  } catch (error) {
    console.error('[POST_PAGE_TEMPLATES_ERROR]', error);
    return pageError('No se pudieron crear las páginas.', 500);
  }
}
