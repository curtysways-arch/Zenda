import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import {
  getPagesAccess, findOwnedPage, readPageInput, uniquePageSlug, newPageId, pageError, MASTER_PAGE_SLUGS,
} from '@/lib/customPagesServer';
import { slugifyPageTitle } from '@/lib/customPages';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await getPagesAccess();
    if (!access.ok) return access.response;
    const { id } = await params;
    const page = await findOwnedPage(id, access.businessId);
    if (!page) return pageError('Página no encontrada.', 404);
    return NextResponse.json({
      ...page,
      status: String(page.status || '').toLowerCase() === 'published' ? 'published' : 'draft',
    });
  } catch (error) {
    console.error('[GET_PAGE_ID_ERROR]', error);
    return pageError('No se pudo cargar la página.', 500);
  }
}

/** Guarda cambios. PUT y PATCH aceptan solo los campos que se envían. */
async function update(req: Request, { params }: Ctx) {
  try {
    const access = await getPagesAccess();
    if (!access.ok) return access.response;
    const { businessId } = access;
    const { id } = await params;
    const page = await findOwnedPage(id, businessId);
    if (!page) return pageError('Página no encontrada.', 404);

    const body = await req.json().catch(() => ({}));
    const { data, error } = await readPageInput(body, businessId, true);
    if (error) return pageError(error);

    // La dirección (slug) no cambia al renombrar, para no romper enlaces ya compartidos.
    // Solo cambia si se envía una nueva explícitamente. Las secciones fijas conservan la suya.
    let slug = page.slug;
    if (data.slug !== undefined && !MASTER_PAGE_SLUGS.includes(page.slug)) {
      const wanted = slugifyPageTitle(data.slug || data.title || page.title);
      if (wanted && wanted !== page.slug) slug = await uniquePageSlug(businessId, wanted, page.id);
    }
    const { slug: _ignored, ...rest } = data;

    const updated = await prisma.page.update({
      where: { id: page.id },
      data: { ...rest, slug, updatedAt: new Date() },
      select: { id: true, slug: true, status: true, title: true },
    });
    return NextResponse.json({ success: true, ...updated });
  } catch (error: any) {
    console.error('[UPDATE_PAGE_ERROR]', error);
    if (error?.code === 'P2002') return pageError('Ya existe otra página con esa dirección.', 409);
    return pageError('No se pudieron guardar los cambios.', 500);
  }
}

export const PUT = update;
export const PATCH = update;

/** POST /api/admin/pages/:id → duplica la página como borrador. */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const access = await getPagesAccess();
    if (!access.ok) return access.response;
    const { businessId } = access;
    const { id } = await params;
    const page = await findOwnedPage(id, businessId);
    if (!page) return pageError('Página no encontrada.', 404);

    const title = `${page.title} (copia)`.slice(0, 140);
    const slug = await uniquePageSlug(businessId, `${page.slug}-copia`);
    const newId = newPageId();
    const now = new Date();
    await prisma.page.create({
      data: {
        id: newId,
        businessId,
        title,
        slug,
        contentHtml: page.contentHtml,
        featuredImage: page.featuredImage,
        imageMediaId: page.imageMediaId,
        buttonText: page.buttonText,
        buttonUrl: page.buttonUrl,
        status: 'draft',
        posicion: page.posicion || 'bottom',
        orden: (page.orden ?? 1) + 1,
        createdAt: now,
        updatedAt: now,
      },
    });
    return NextResponse.json({ success: true, id: newId, slug, title }, { status: 201 });
  } catch (error) {
    console.error('[DUPLICATE_PAGE_ERROR]', error);
    return pageError('No se pudo duplicar la página.', 500);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const access = await getPagesAccess();
    if (!access.ok) return access.response;
    const { id } = await params;
    const page = await findOwnedPage(id, access.businessId);
    if (!page) return pageError('Página no encontrada.', 404);
    await prisma.page.delete({ where: { id: page.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE_PAGE_ERROR]', error);
    return pageError('No se pudo eliminar la página.', 500);
  }
}
