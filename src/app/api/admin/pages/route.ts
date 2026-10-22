import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getPagesAccess, readPageInput, uniquePageSlug, newPageId, pageError } from '@/lib/customPagesServer';

export const dynamic = 'force-dynamic';

/** Lista las páginas del negocio (la respuesta sigue siendo un arreglo, como antes). */
export async function GET() {
  try {
    const access = await getPagesAccess();
    if (!access.ok) return access.response;

    const pages = await prisma.page.findMany({
      where: { businessId: access.businessId },
      select: {
        id: true, businessId: true, title: true, slug: true, status: true, featuredImage: true,
        imageMediaId: true, posicion: true, orden: true, buttonText: true, createdAt: true, updatedAt: true,
        imageMedia: true,
      },
      orderBy: [{ orden: 'asc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json(
      pages.map((p) => ({
        ...p,
        status: String(p.status || 'draft').toLowerCase() === 'published' ? 'published' : 'draft',
        posicion: p.posicion || (p.slug === 'como-funciona' ? 'top' : 'bottom'),
        orden: p.orden ?? 1,
      }))
    );
  } catch (error) {
    console.error('[GET_PAGES_ERROR]', error);
    return pageError('No se pudieron cargar las páginas.', 500);
  }
}

export async function POST(req: Request) {
  try {
    const access = await getPagesAccess();
    if (!access.ok) return access.response;
    const { businessId } = access;

    const body = await req.json().catch(() => ({}));
    const { data, error } = await readPageInput(body, businessId, false);
    if (error) return pageError(error);

    const slug = await uniquePageSlug(businessId, data.slug || data.title!);
    const id = newPageId();
    const now = new Date();

    await prisma.page.create({
      data: {
        id,
        businessId,
        title: data.title!,
        slug,
        contentHtml: data.contentHtml!,
        featuredImage: data.featuredImage ?? null,
        imageMediaId: data.imageMediaId ?? null,
        buttonText: data.buttonText ?? null,
        buttonUrl: data.buttonUrl ?? null,
        status: data.status || 'draft',
        posicion: data.posicion || 'bottom',
        orden: data.orden ?? 1,
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json({ success: true, id, title: data.title, slug, status: data.status }, { status: 201 });
  } catch (error: any) {
    console.error('[POST_PAGES_ERROR]', error);
    if (error?.code === 'P2002') return pageError('Ya existe una página con esa dirección. Cambia el título o la dirección.', 409);
    return pageError('No se pudo crear la página.', 500);
  }
}
