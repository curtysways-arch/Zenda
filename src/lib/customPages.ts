/**
 * Utilidades compartidas (cliente y servidor) del módulo de páginas personalizadas.
 * Nada de aquí toca la base de datos.
 */
import slugify from 'slugify';

export type PageStatus = 'draft' | 'published';
export type PagePosition = 'top' | 'bottom';

export function slugifyPageTitle(text: string) {
  const s = slugify(String(text || ''), { lower: true, strict: true, locale: 'es', trim: true });
  return s.slice(0, 80).replace(/-+$/g, '');
}

export function isPagePublished(status?: string | null) {
  const st = String(status || '').toLowerCase();
  return st === 'published' || st === 'publicado' || st === 'publicada';
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ',
  '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú', '&Ntilde;': 'Ñ',
  '&iquest;': '¿', '&iexcl;': '¡', '&uuml;': 'ü',
};

/** Texto plano de un HTML (para resúmenes y meta description). */
export function htmlToText(html?: string | null) {
  return String(html || '')
    .replace(/<(br|\/p|\/h[1-6]|\/li|\/div)\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z]+;|&#\d+;/g, (m) => ENTITIES[m] ?? (m.startsWith('&#') ? String.fromCharCode(Number(m.slice(2, -1))) : ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function pageExcerpt(html?: string | null, max = 160) {
  const text = htmlToText(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).replace(/[,.;:]$/, '') + '…';
}

/** true si el contenido tiene algo visible (texto, imagen o video). */
export function hasPageContent(html?: string | null) {
  return htmlToText(html).length > 0 || /<(img|iframe|video)\b/i.test(String(html || ''));
}

export function pageImage(page: any): string | null {
  return page?.imageMedia?.url || page?.featuredImage || null;
}

/**
 * Convierte el destino guardado del botón en un enlace que funcione dentro del sitio del negocio.
 * Las rutas internas se guardan sin el slug (ej. "/servicio/123") y aquí se les antepone.
 */
export function resolvePageButtonUrl(url: string | null | undefined, slug: string, whatsapp?: string | null) {
  let u = String(url || '').trim();
  if (!u) {
    const digits = String(whatsapp || '').replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : `/${slug}`;
  }
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (/^www\./i.test(u)) return `https://${u}`;
  if (u.startsWith('#')) return `/${slug}${u}`;
  if (!u.startsWith('/')) return `https://${u}`;
  if (u.startsWith('/cancha/')) u = u.replace('/cancha/', '/servicio/');
  if (u === `/${slug}` || u.startsWith(`/${slug}/`) || u.startsWith(`/${slug}#`)) return u;
  if (u === '/') return `/${slug}`;
  if (u.startsWith('/#')) return `/${slug}${u.slice(1)}`;
  return `/${slug}${u}`;
}

export function isExternalUrl(url: string) {
  return /^(https?:|mailto:|tel:)/i.test(url);
}

/**
 * Estilos para el HTML que produce el editor (Quill 2): títulos, listas con data-list,
 * alineaciones, tamaños, sangrías, citas, imágenes y videos.
 * `scope` es el selector del contenedor (ej. ".page-prose").
 */
export function pageProseCss(scope: string, accent: string) {
  const s = scope;
  return `
${s}{color:#334155;font-size:1.0625rem;line-height:1.75;overflow-wrap:anywhere}
${s} > :first-child{margin-top:0}
${s} h1,${s} h2,${s} h3,${s} h4{color:#0f172a;font-weight:700;letter-spacing:-0.02em;line-height:1.2;margin:2.2em 0 .6em}
${s} h1{font-size:2rem}${s} h2{font-size:1.6rem}${s} h3{font-size:1.25rem}${s} h4{font-size:1.1rem}
${s} p{margin:0 0 1.1em}
${s} p:empty,${s} p:has(> br:only-child){margin:0 0 .6em}
${s} a{color:${accent};font-weight:600;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
${s} strong,${s} b{color:#0f172a;font-weight:700}
${s} blockquote{margin:1.8em 0;padding:1.1em 1.4em;border-left:4px solid ${accent};background:#f8fafc;border-radius:0 1rem 1rem 0;color:#0f172a;font-size:1.1rem}
${s} ul,${s} ol{margin:0 0 1.2em;padding-left:1.4em}
${s} ul{list-style:disc}${s} ol{list-style:decimal}
${s} li{margin:.35em 0;padding-left:.25em}
${s} li::marker{color:${accent}}
${s} ol > li[data-list="bullet"]{list-style-type:disc}
${s} ol > li[data-list="ordered"]{list-style-type:decimal}
${s} li[data-list="checked"],${s} li[data-list="unchecked"]{list-style:none}
${s} li[data-list="checked"]::before{content:"☑ ";color:${accent}}
${s} li[data-list="unchecked"]::before{content:"☐ "}
${s} li > .ql-ui{display:none}
${s} img{display:block;max-width:100%;height:auto;border-radius:1rem;margin:1.6em auto}
${s} iframe,${s} video{display:block;width:100%;aspect-ratio:16/9;height:auto;border:0;border-radius:1rem;margin:1.6em 0}
${s} hr{border:0;border-top:1px solid #e2e8f0;margin:2em 0}
${s} table{width:100%;border-collapse:collapse;margin:1.4em 0;font-size:.95em}
${s} th,${s} td{border:1px solid #e2e8f0;padding:.5em .7em;text-align:left}
${s} .ql-align-center{text-align:center}${s} .ql-align-right{text-align:right}${s} .ql-align-justify{text-align:justify}
${s} .ql-size-small{font-size:.85em}${s} .ql-size-large{font-size:1.35em}${s} .ql-size-huge{font-size:1.9em;line-height:1.25}
${s} .ql-indent-1{padding-left:2em}${s} .ql-indent-2{padding-left:4em}${s} .ql-indent-3{padding-left:6em}
${s} li.ql-indent-1{margin-left:1.5em;padding-left:.25em}${s} li.ql-indent-2{margin-left:3em;padding-left:.25em}
`;
}
