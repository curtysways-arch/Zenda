import { NextResponse } from 'next/server';
import DOMPurify from 'isomorphic-dompurify';
import prisma from '@/lib/prisma';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { slugifyPageTitle, hasPageContent } from '@/lib/customPages';

const CUSTOMER_ROLES = ['CLIENTE', 'CLIENT', 'CUSTOMER', 'USUARIO_FINAL'];

/** Slugs que la landing usa para inyectar secciones fijas: se conservan al editar. */
export const MASTER_PAGE_SLUGS = ['como-funciona', 'por-que-elegirnos'];

export function pageError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Sesión del panel (incluye acceso delegado del superadmin) y negocio actual. */
export async function getPagesAccess(): Promise<{ ok: boolean; businessId: string; response: NextResponse }> {
  const fail = (message: string, status: number) => ({ ok: false, businessId: '', response: pageError(message, status) });
  const session = await getEffectiveAdminSession();
  const user: any = session?.user;
  if (!user) return fail('Tu sesión expiró. Vuelve a iniciar sesión.', 401);
  if (user.isDelegatedExpired) return fail('El acceso delegado expiró.', 401);
  if (CUSTOMER_ROLES.includes(String(user.role || user.rol || '').toUpperCase())) return fail('No tienes permiso para esta sección.', 403);
  const businessId = user.negocioId;
  if (!businessId) return fail('No se encontró tu negocio en la sesión.', 400);
  return { ok: true, businessId: String(businessId), response: null as any };
}

export async function findOwnedPage(id: string, businessId: string) {
  const page = await prisma.page.findUnique({ where: { id: String(id || '').trim() }, include: { imageMedia: true } });
  if (!page || page.businessId !== businessId) return null;
  return page;
}

/** Devuelve un slug libre dentro del negocio: "mi-pagina", "mi-pagina-2", … */
export async function uniquePageSlug(businessId: string, wanted: string, excludeId?: string) {
  const base = slugifyPageTitle(wanted) || 'pagina';
  const taken = await prisma.page.findMany({
    where: { businessId, slug: { startsWith: base }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { slug: true },
  });
  const used = new Set(taken.map((p) => p.slug));
  if (!used.has(base)) return base;
  for (let i = 2; i < 500; i++) {
    const s = `${base}-${i}`;
    if (!used.has(s)) return s;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const VIDEO_HOSTS = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//i;

export function sanitizePageHtml(html: string) {
  const clean = DOMPurify.sanitize(String(html || ''), {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['target', 'allowfullscreen', 'frameborder', 'data-list'],
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
  }) as unknown as string;
  // Solo se permiten videos incrustados de YouTube o Vimeo.
  return clean.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>|<iframe\b[^>]*\/?>/gi, (tag) => {
    const src = /src="([^"]+)"/i.exec(tag)?.[1] || '';
    return VIDEO_HOSTS.test(src) ? tag : '';
  });
}

function cleanStr(v: unknown, max: number) {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

function cleanButtonUrl(v: unknown) {
  const s = cleanStr(v, 500);
  if (!s || s === 'CUSTOM') return null;
  if (/^(javascript|data|vbscript):/i.test(s.replace(/\s/g, ''))) return null;
  return s;
}

function cleanImageUrl(v: unknown) {
  const s = cleanStr(v, 1000);
  if (!s) return null;
  return /^(https?:\/\/|\/)/i.test(s) ? s : null;
}

export type PageInput = {
  title?: string;
  slug?: string | null;
  contentHtml?: string;
  status?: 'draft' | 'published';
  posicion?: 'top' | 'bottom';
  orden?: number;
  featuredImage?: string | null;
  imageMediaId?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
};

/**
 * Lee y valida el cuerpo de la petición. Con `partial` solo devuelve los campos presentes.
 * Devuelve `error` con un mensaje listo para mostrar.
 */
export async function readPageInput(body: any, businessId: string, partial: boolean): Promise<{ data: PageInput; error?: string }> {
  const data: PageInput = {};
  const has = (k: string) => body && Object.prototype.hasOwnProperty.call(body, k);

  if (!partial || has('title')) {
    const title = cleanStr(body?.title, 140);
    if (!title) return { data, error: 'Escribe un título para la página.' };
    data.title = title;
  }
  if (!partial || has('contentHtml')) {
    const html = sanitizePageHtml(body?.contentHtml);
    if (!hasPageContent(html)) return { data, error: 'La página no tiene contenido. Escribe algo o usa una plantilla.' };
    if (html.length > 400_000) return { data, error: 'El contenido es demasiado largo. Divide la página en varias.' };
    data.contentHtml = html;
  }
  if (has('slug')) data.slug = cleanStr(body.slug, 120);
  if (!partial || has('status')) data.status = String(body?.status || '').toLowerCase() === 'published' ? 'published' : 'draft';
  if (!partial || has('posicion')) data.posicion = body?.posicion === 'top' ? 'top' : 'bottom';
  if (!partial || has('orden')) data.orden = Math.min(Math.max(Math.round(Number(body?.orden) || 1), 1), 999);
  if (!partial || has('buttonText')) data.buttonText = cleanStr(body?.buttonText, 60);
  if (!partial || has('buttonUrl')) data.buttonUrl = cleanButtonUrl(body?.buttonUrl);
  if (!partial || has('featuredImage')) data.featuredImage = cleanImageUrl(body?.featuredImage);

  if (!partial || has('imageMediaId')) {
    const mediaId = cleanStr(body?.imageMediaId, 100);
    if (mediaId) {
      const media: any = await prisma.media.findUnique({ where: { id: mediaId } });
      const owner = media?.businessId ?? media?.negocioId ?? null;
      if (!media || (owner && owner !== businessId)) return { data, error: 'La imagen de portada no es válida. Súbela de nuevo.' };
      data.imageMediaId = mediaId;
      if (!data.featuredImage && media.url) data.featuredImage = media.url;
    } else {
      data.imageMediaId = null;
    }
  }
  return { data };
}

export function newPageId() {
  return `cm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}
