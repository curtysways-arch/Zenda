'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Save, Globe, EyeOff, Loader2, ExternalLink, Trash2, Link2, LayoutTemplate, ArrowUpToLine,
  ArrowDownToLine, Check, AlertCircle, Pencil, Sparkles,
} from 'lucide-react';
import WysiwygEditor from '@/components/admin/WysiwygEditor';
import ImageUploader from '@/components/ui/ImageUploader';
import { useConfirm } from '@/components/admin/ConfirmContext';
import { slugifyPageTitle, hasPageContent } from '@/lib/customPages';
import { usePagesContext, TemplateInfo } from './usePagesContext';

type Form = {
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published';
  posicion: 'top' | 'bottom';
  orden: number;
  featuredImage: string | null;
  imageMediaId: string | null;
  buttonText: string;
  buttonUrl: string;
};

const EMPTY: Form = {
  title: '', slug: '', content: '', status: 'draft', posicion: 'bottom', orden: 1,
  featuredImage: null, imageMediaId: null, buttonText: '', buttonUrl: '',
};

type Links = { canchas: { id: string; nombre: string }[]; promociones: { id: string; titulo?: string; title?: string }[]; cursos: { id: string; name: string }[] };

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100';

function Card({ title, hint, icon, children }: { title: string; hint?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start gap-2">
        {icon && <span className="mt-0.5 text-slate-400">{icon}</span>}
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {hint && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Editor de una página personalizada (crear y editar). Guarda sin salir del editor,
 * avisa si hay cambios sin guardar y permite partir de una plantilla.
 */
export default function PageEditor({ pageId }: { pageId?: string }) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { ctx } = usePagesContext();
  const isEditing = Boolean(pageId);

  const [form, setForm] = useState<Form>(EMPTY);
  const [savedSlug, setSavedSlug] = useState('');
  const [savedStatus, setSavedStatus] = useState<'draft' | 'published'>('draft');
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [links, setLinks] = useState<Links>({ canchas: [], promociones: [], cursos: [] });
  const [customUrl, setCustomUrl] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const noticeTimer = useRef<any>(null);

  const flash = useCallback((tone: 'ok' | 'error', text: string) => {
    setNotice({ tone, text });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), tone === 'ok' ? 3000 : 7000);
  }, []);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  // Cargar destinos para el botón y, si se edita, la página.
  useEffect(() => {
    fetch('/api/admin/pages/links').then((r) => (r.ok ? r.json() : null)).then((d) => d && setLinks(d)).catch(() => {});
    if (!pageId) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/pages/${pageId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar la página.');
        setForm({
          title: data.title || '',
          slug: data.slug || '',
          content: data.contentHtml || '',
          status: data.status === 'published' ? 'published' : 'draft',
          posicion: data.posicion === 'top' ? 'top' : 'bottom',
          orden: data.orden ?? 1,
          featuredImage: data.imageMedia?.url || data.featuredImage || null,
          imageMediaId: data.imageMediaId || null,
          buttonText: data.buttonText || '',
          buttonUrl: data.buttonUrl || '',
        });
        setSavedSlug(data.slug || '');
        setSavedStatus(data.status === 'published' ? 'published' : 'draft');
        setSlugTouched(true);
      } catch (e: any) {
        setLoadError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [pageId]);

  // Avisar antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  // En páginas nuevas, la dirección sigue al título hasta que la persona la edite.
  const effectiveSlug = slugTouched ? form.slug : slugifyPageTitle(form.title);

  const linkOptions = useMemo(() => {
    const opts: { group: string; value: string; label: string }[] = [
      { group: '', value: '', label: 'WhatsApp del negocio' },
      { group: '', value: '/', label: 'Página de inicio' },
      { group: '', value: '/servicios', label: 'Lista de servicios' },
      { group: '', value: '/promociones', label: 'Promociones' },
    ];
    links.canchas?.forEach((c) => opts.push({ group: 'Servicios', value: `/servicio/${c.id}`, label: c.nombre }));
    links.promociones?.forEach((p) => opts.push({ group: 'Promociones', value: `/promo/${p.id}`, label: p.titulo || p.title || 'Promoción' }));
    links.cursos?.forEach((c) => opts.push({ group: 'Cursos', value: `/cursos/${c.id}`, label: c.name }));
    return opts;
  }, [links]);

  const isKnownLink = linkOptions.some((o) => o.value === form.buttonUrl);
  const showCustom = customUrl || (!!form.buttonUrl && !isKnownLink);

  const publicBase = ctx?.negocio?.slug ? `/${ctx.negocio.slug}/pagina/` : '';
  const publicUrl = publicBase && savedSlug ? `${publicBase}${savedSlug}` : '';

  const applyTemplate = async (t: TemplateInfo) => {
    const hasWork = form.title.trim() || hasPageContent(form.content);
    if (hasWork) {
      const res = await confirm(`Se reemplazará el título y el contenido actual por la plantilla «${t.title}».`, { title: 'Usar plantilla', confirmText: 'Reemplazar', type: 'warning' });
      if (!(res === true || (typeof res === 'object' && res.confirmed))) return;
    }
    setForm((f) => ({
      ...f,
      title: t.title,
      content: t.html,
      posicion: t.posicion,
      buttonText: t.buttonText,
      buttonUrl: t.buttonUrl,
    }));
    if (!isEditing) setSlugTouched(false);
    setDirty(true);
  };

  const save = async (overrides: Partial<Form> = {}) => {
    const f = { ...form, ...overrides };
    if (!f.title.trim()) { flash('error', 'Escribe un título para la página.'); return null; }
    if (!hasPageContent(f.content)) { flash('error', 'La página no tiene contenido. Escribe algo o usa una plantilla.'); return null; }

    setSaving(true);
    try {
      const payload: any = {
        title: f.title,
        contentHtml: f.content,
        status: f.status,
        posicion: f.posicion,
        orden: Number(f.orden) || 1,
        featuredImage: f.featuredImage,
        imageMediaId: f.imageMediaId,
        buttonText: f.buttonText,
        buttonUrl: f.buttonUrl,
      };
      const wantedSlug = slugTouched ? f.slug : slugifyPageTitle(f.title);
      if (!isEditing || wantedSlug !== savedSlug) payload.slug = wantedSlug;

      const res = await fetch(isEditing ? `/api/admin/pages/${pageId}` : '/api/admin/pages', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');

      setForm((cur) => ({ ...cur, ...overrides, slug: data.slug || cur.slug }));
      setSavedSlug(data.slug || '');
      setSavedStatus(f.status);
      setSlugTouched(true);
      setEditingSlug(false);
      setDirty(false);
      flash('ok', f.status === 'published' ? 'Página guardada y publicada.' : 'Borrador guardado.');
      if (!isEditing && data.id) router.replace(`/admin/paginas/${data.id}`);
      return data.slug as string;
    } catch (e: any) {
      flash('error', e.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const openPreview = async () => {
    if (!ctx?.negocio?.slug) return;
    let slug = savedSlug;
    // Abrimos la ventana antes de esperar al guardado para que el navegador no la bloquee.
    const win = window.open('about:blank', '_blank');
    if (dirty || !slug) {
      const s = await save();
      if (!s) { win?.close(); return; }
      slug = s;
    }
    const url = `/${ctx.negocio.slug}/pagina/${slug}${form.status === 'published' ? '' : '?vista=previa'}`;
    if (win) win.location.href = url; else window.open(url, '_blank');
  };

  const leave = async () => {
    if (dirty) {
      const res = await confirm('Tienes cambios sin guardar. Si sales ahora se perderán.', { title: 'Salir sin guardar', confirmText: 'Salir sin guardar', type: 'warning' });
      if (!(res === true || (typeof res === 'object' && res.confirmed))) return;
    }
    setDirty(false);
    router.push('/admin/paginas');
  };

  const remove = async () => {
    const res = await confirm(`¿Eliminar «${form.title || 'esta página'}»? Esta acción no se puede deshacer.`, { title: 'Eliminar página', confirmText: 'Eliminar', type: 'danger' });
    if (!(res === true || (typeof res === 'object' && res.confirmed))) return;
    const r = await fetch(`/api/admin/pages/${pageId}`, { method: 'DELETE' });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      flash('error', d.error || 'No se pudo eliminar.');
      return;
    }
    setDirty(false);
    router.push('/admin/paginas');
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={36} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <AlertCircle className="mx-auto text-rose-500" />
        <p className="mt-2 font-semibold text-rose-900">{loadError}</p>
        <Link href="/admin/paginas" className="mt-4 inline-block text-sm font-semibold text-rose-700 underline">Volver a mis páginas</Link>
      </div>
    );
  }

  const templates = ctx?.templates || [];
  const showTemplates = !isEditing && templates.length > 0;
  const publishedChanged = isEditing && savedStatus !== form.status;

  const saveLabel = saving ? 'Guardando…' : form.status === 'published' ? (isEditing && savedStatus === 'published' ? 'Guardar cambios' : 'Publicar') : 'Guardar borrador';

  return (
    <div className="mx-auto max-w-6xl pb-28 md:pb-10">
      {/* Encabezado */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={leave} className="shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:text-slate-900" aria-label="Volver">
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{isEditing ? form.title || 'Editar página' : 'Nueva página'}</h1>
            <p className="text-xs text-slate-500">
              {dirty ? <span className="font-medium text-amber-600">Cambios sin guardar</span> : isEditing ? (savedStatus === 'published' ? 'Publicada · visible en tu sitio' : 'Borrador · solo tú la ves') : 'Aún no se ha guardado'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-0.5" role="radiogroup" aria-label="Estado">
            <button type="button" role="radio" aria-checked={form.status === 'draft'} onClick={() => set('status', 'draft')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${form.status === 'draft' ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:text-slate-800'}`}>
              <EyeOff size={13} /> Borrador
            </button>
            <button type="button" role="radio" aria-checked={form.status === 'published'} onClick={() => set('status', 'published')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${form.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-800'}`}>
              <Globe size={13} /> Publicada
            </button>
          </div>
          {ctx?.negocio?.slug && (
            <button type="button" onClick={openPreview} disabled={saving}
              className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:inline-flex">
              <ExternalLink size={15} /> {form.status === 'published' ? 'Ver' : 'Vista previa'}
            </button>
          )}
          <button type="button" onClick={() => save()} disabled={saving}
            className="hidden items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60 md:inline-flex"
            style={{ backgroundColor: 'var(--primary-color, #0f172a)' }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {saveLabel}
          </button>
        </div>
      </div>

      {notice && (
        <div role="status" className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${notice.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {notice.tone === 'ok' ? <Check size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      {publishedChanged && (
        <p className="mb-4 rounded-xl bg-slate-100 px-4 py-2.5 text-xs text-slate-600">
          {form.status === 'published' ? 'Al guardar, la página será visible para tus clientes.' : 'Al guardar, la página dejará de verse en tu sitio.'}
        </p>
      )}

      {showTemplates && (
        <section className="mb-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Empieza con una plantilla</h2>
            <span className="text-xs text-slate-500">· luego la ajustas a tu negocio</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {templates.map((t) => (
              <button key={t.key} type="button" onClick={() => applyTemplate(t)}
                className="w-56 shrink-0 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-400 hover:shadow-sm">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{t.title}</span>
                  {t.exists && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Ya la tienes</span>}
                </span>
                <span className="mt-1 block text-xs leading-snug text-slate-500">{t.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Columna principal */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <label htmlFor="page-title" className="text-xs font-semibold text-slate-500">Título</label>
            <input
              id="page-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ej: Quiénes somos"
              maxLength={140}
              className="mt-1 w-full border-0 bg-transparent p-0 text-2xl font-bold tracking-tight text-slate-900 outline-none placeholder:text-slate-300"
            />
            <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <Link2 size={13} className="shrink-0" />
              <span className="shrink-0">Dirección:</span>
              <span className="truncate font-mono text-slate-400">{publicBase || '/pagina/'}</span>
              {editingSlug || (!isEditing && slugTouched) ? (
                <input
                  autoFocus={editingSlug}
                  value={form.slug}
                  onChange={(e) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-')); }}
                  onBlur={() => setForm((f) => ({ ...f, slug: slugifyPageTitle(f.slug) || slugifyPageTitle(f.title) }))}
                  className="min-w-[8rem] flex-1 rounded-md border border-slate-300 px-1.5 py-0.5 font-mono text-slate-800 outline-none focus:border-slate-500"
                />
              ) : (
                <>
                  <span className="font-mono font-medium text-slate-800">{effectiveSlug || 'se-crea-con-el-titulo'}</span>
                  <button type="button" onClick={() => { setForm((f) => ({ ...f, slug: effectiveSlug })); setSlugTouched(true); setEditingSlug(true); }}
                    className="ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-slate-600 hover:bg-slate-100">
                    <Pencil size={11} /> Cambiar
                  </button>
                </>
              )}
            </div>
            {isEditing && editingSlug && savedStatus === 'published' && (
              <p className="mt-2 text-xs text-amber-700">Si cambias la dirección, los enlaces que ya compartiste dejarán de funcionar.</p>
            )}
          </div>

          <WysiwygEditor
            value={form.content}
            onChange={(html) => setForm((f) => ({ ...f, content: html }))}
            onUserEdit={() => setDirty(true)}
            onError={(m) => flash('error', m)}
          />
        </div>

        {/* Columna lateral */}
        <aside className="space-y-4">
          <Card title="Imagen de portada" hint="Se muestra arriba de la página y en la tarjeta de tu sitio. Horizontal, mínimo 1200 px de ancho.">
            <ImageUploader
              category="page"
              currentUrl={form.featuredImage || ''}
              onUploadSuccess={(media) => { setForm((f) => ({ ...f, featuredImage: media.url, imageMediaId: media.id })); setDirty(true); }}
              onRemove={() => { setForm((f) => ({ ...f, featuredImage: null, imageMediaId: null })); setDirty(true); }}
              label="Subir portada"
              aspect="landscape"
            />
          </Card>

          <Card title="Botón al final" hint="Invita a la persona a dar el siguiente paso. Déjalo vacío para no mostrar botón." icon={<Link2 size={15} />}>
            <div className="space-y-2.5">
              <input className={inputCls} placeholder="Texto, ej: Reservar ahora" value={form.buttonText} maxLength={60} onChange={(e) => set('buttonText', e.target.value)} />
              <select
                className={inputCls}
                value={showCustom ? '__custom' : form.buttonUrl}
                onChange={(e) => {
                  if (e.target.value === '__custom') { setCustomUrl(true); set('buttonUrl', ''); }
                  else { setCustomUrl(false); set('buttonUrl', e.target.value); }
                }}
              >
                {linkOptions.filter((o) => !o.group).map((o) => <option key={o.value || 'wa'} value={o.value}>{o.label}</option>)}
                {['Servicios', 'Promociones', 'Cursos'].map((g) => {
                  const items = linkOptions.filter((o) => o.group === g);
                  return items.length ? (
                    <optgroup key={g} label={g}>
                      {items.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </optgroup>
                  ) : null;
                })}
                <option value="__custom">Otro enlace…</option>
              </select>
              {showCustom && (
                <input className={inputCls} placeholder="https://…" value={form.buttonUrl} onChange={(e) => set('buttonUrl', e.target.value)} />
              )}
            </div>
          </Card>

          <Card title="Dónde aparece" hint="Las páginas publicadas se listan en tu sitio. En los diseños que las muestran como secciones, elige si van arriba o abajo." icon={<LayoutTemplate size={15} />}>
            <div className="grid grid-cols-2 gap-2">
              {([['top', 'Arriba', 'Debajo de la portada', ArrowUpToLine], ['bottom', 'Abajo', 'Después de los servicios', ArrowDownToLine]] as const).map(([value, label, desc, Icon]) => (
                <button key={value} type="button" onClick={() => set('posicion', value)}
                  className={`rounded-xl border p-2.5 text-left transition ${form.posicion === value ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><Icon size={14} /> {label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{desc}</span>
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-700">
              <span>Orden <span className="text-xs text-slate-500">(1 = primero)</span></span>
              <input type="number" min={1} max={999} value={form.orden} onChange={(e) => set('orden', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm outline-none focus:border-slate-400" />
            </label>
          </Card>

          {publicUrl && savedStatus === 'published' && (
            <Card title="Comparte esta página">
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-600">{typeof window !== 'undefined' ? window.location.origin : ''}{publicUrl}</code>
                <button type="button" className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}${publicUrl}`).then(() => flash('ok', 'Enlace copiado.')).catch(() => {}); }}>
                  Copiar
                </button>
              </div>
            </Card>
          )}

          {isEditing && (
            <button type="button" onClick={remove} className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50">
              <Trash2 size={15} /> Eliminar página
            </button>
          )}
        </aside>
      </div>

      {/* Barra fija en celular (sobre el menú inferior) */}
      <div className="fixed inset-x-0 bottom-16 z-[90] flex gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        {ctx?.negocio?.slug && (
          <button type="button" onClick={openPreview} disabled={saving} className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3.5 text-slate-700" aria-label="Vista previa">
            <ExternalLink size={18} />
          </button>
        )}
        <button type="button" onClick={() => save()} disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: 'var(--primary-color, #0f172a)' }}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {saveLabel}
        </button>
      </div>
    </div>
  );
}
