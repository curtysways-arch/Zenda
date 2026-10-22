'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, FileText, Trash2, Pencil, ExternalLink, Copy, Globe, EyeOff, Loader2, Sparkles, Check,
  AlertCircle, ArrowUpToLine, ArrowDownToLine,
} from 'lucide-react';
import { useConfirm } from '@/components/admin/ConfirmContext';
import { usePagesContext } from '@/components/admin/pages/usePagesContext';

interface PageRow {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  posicion?: 'top' | 'bottom';
  orden?: number;
  featuredImage?: string | null;
  imageMedia?: { url?: string } | null;
  updatedAt: string;
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PaginasAdmin() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { ctx, reload: reloadCtx } = usePagesContext();
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [publishNow, setPublishNow] = useState(true);
  const [creating, setCreating] = useState(false);

  const flash = (tone: 'ok' | 'error', text: string) => {
    setNotice({ tone, text });
    setTimeout(() => setNotice(null), tone === 'ok' ? 3000 : 6000);
  };

  const fetchPages = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pages', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar las páginas.');
      setPages(Array.isArray(data) ? data : []);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const available = useMemo(() => (ctx?.templates || []).filter((t) => !t.exists), [ctx]);

  // Preseleccionar todas las plantillas disponibles cuando aún no hay páginas.
  useEffect(() => {
    if (!loading && pages.length === 0 && available.length) setPicked(available.map((t) => t.key));
  }, [loading, pages.length, available]);

  const ok = (res: any) => res === true || (typeof res === 'object' && res?.confirmed);

  const toggleStatus = async (p: PageRow) => {
    const next = p.status === 'published' ? 'draft' : 'published';
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/pages/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo cambiar el estado.');
      setPages((list) => list.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
      flash('ok', next === 'published' ? `«${p.title}» ya se ve en tu sitio.` : `«${p.title}» quedó como borrador.`);
    } catch (e: any) {
      flash('error', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const duplicate = async (p: PageRow) => {
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/pages/${p.id}`, { method: 'POST' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo duplicar.');
      router.push(`/admin/paginas/${d.id}`);
    } catch (e: any) {
      flash('error', e.message);
      setBusyId(null);
    }
  };

  const remove = async (p: PageRow) => {
    if (!ok(await confirm(`¿Eliminar «${p.title}»? Esta acción no se puede deshacer.`, { title: 'Eliminar página', confirmText: 'Eliminar', type: 'danger' }))) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/pages/${p.id}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo eliminar.');
      setPages((list) => list.filter((x) => x.id !== p.id));
      reloadCtx();
    } catch (e: any) {
      flash('error', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const createFromTemplates = async () => {
    if (!picked.length) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/pages/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: picked, status: publishNow ? 'published' : 'draft' }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudieron crear las páginas.');
      const n = d.created?.length || 0;
      flash('ok', n === 1 ? 'Se creó 1 página. Revísala y ajústala a tu negocio.' : `Se crearon ${n} páginas. Revísalas y ajústalas a tu negocio.`);
      setPicked([]);
      await Promise.all([fetchPages(), reloadCtx()]);
    } catch (e: any) {
      flash('error', e.message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = pages.filter((p) =>
    (filter === 'all' || p.status === filter) &&
    p.title.toLowerCase().includes(query.trim().toLowerCase())
  );
  const counts = {
    all: pages.length,
    published: pages.filter((p) => p.status === 'published').length,
    draft: pages.filter((p) => p.status !== 'published').length,
  };
  const siteSlug = ctx?.negocio?.slug;

  const templatePicker = available.length > 0 && (
    <section className={`rounded-2xl border p-5 ${pages.length === 0 ? 'border-slate-200 bg-white' : 'border-dashed border-slate-300 bg-slate-50/60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Sparkles size={17} className="text-slate-500" />
            {pages.length === 0 ? 'Empieza con páginas listas para tu negocio' : 'Páginas sugeridas'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">Elige las que quieras: se crean con un texto base que luego ajustas en el editor.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} className="size-4 rounded border-slate-300" />
          Publicarlas de una vez
        </label>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {available.map((t) => {
          const on = picked.includes(t.key);
          return (
            <button key={t.key} type="button" aria-pressed={on}
              onClick={() => setPicked((s) => (on ? s.filter((k) => k !== t.key) : [...s, t.key]))}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${on ? 'border-slate-900 bg-white ring-1 ring-slate-900' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}>
                {on && <Check size={13} strokeWidth={3} />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">{t.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-500">{t.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={createFromTemplates} disabled={!picked.length || creating}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          style={{ backgroundColor: 'var(--primary-color, #0f172a)' }}>
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {picked.length ? `Crear ${picked.length} ${picked.length === 1 ? 'página' : 'páginas'}` : 'Elige una plantilla'}
        </button>
        {pages.length === 0 && (
          <Link href="/admin/paginas/nueva" className="text-sm font-medium text-slate-600 underline-offset-2 hover:underline">o empieza una en blanco</Link>
        )}
      </div>
    </section>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Páginas</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">Contenido propio para tu sitio: quiénes son, preguntas frecuentes, políticas, guías. Cada página tiene su propia dirección para compartir.</p>
        </div>
        <div className="flex items-center gap-2">
          {siteSlug && counts.published > 0 && (
            <a href={`/${siteSlug}/paginas`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <ExternalLink size={15} /> Ver en mi sitio
            </a>
          )}
          <Link href="/admin/paginas/nueva"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            style={{ backgroundColor: 'var(--primary-color, #0f172a)' }}>
            <Plus size={17} /> Nueva página
          </Link>
        </div>
      </div>

      {notice && (
        <div role="status" className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${notice.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {notice.tone === 'ok' ? <Check size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          {notice.text}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={() => { setLoading(true); fetchPages(); }} className="font-semibold underline">Reintentar</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : pages.length === 0 ? (
        <>
          {templatePicker || (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
              <FileText className="mx-auto text-slate-300" size={40} />
              <h2 className="mt-3 font-semibold text-slate-900">Aún no tienes páginas</h2>
              <p className="mt-1 text-sm text-slate-500">Crea tu primera página para contar más sobre tu negocio.</p>
              <Link href="/admin/paginas/nueva" className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--primary-color, #0f172a)' }}>
                <Plus size={16} /> Crear página
              </Link>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {([['all', 'Todas'], ['published', 'Publicadas'], ['draft', 'Borradores']] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setFilter(k)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${filter === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                  {label} <span className="text-xs text-slate-400">{counts[k]}</span>
                </button>
              ))}
            </div>
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar páginas…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400" />
            </div>
          </div>

          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {filtered.length === 0 && (
              <li className="px-6 py-12 text-center text-sm text-slate-500">No hay páginas que coincidan.</li>
            )}
            {filtered.map((p) => {
              const img = p.imageMedia?.url || p.featuredImage;
              const live = p.status === 'published';
              const busy = busyId === p.id;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:flex-nowrap">
                  <Link href={`/admin/paginas/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 text-slate-400">
                      {img ? <img src={img} alt="" className="size-full object-cover" /> : <FileText size={20} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">{p.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        <span className="truncate font-mono">/pagina/{p.slug}</span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-0.5">
                          {p.posicion === 'top' ? <ArrowUpToLine size={11} /> : <ArrowDownToLine size={11} />}
                          {p.posicion === 'top' ? 'Arriba' : 'Abajo'} #{p.orden ?? 1}
                        </span>
                        <span aria-hidden>·</span>
                        <span>{timeAgo(p.updatedAt)}</span>
                      </span>
                    </span>
                  </Link>

                  <button type="button" onClick={() => toggleStatus(p)} disabled={busy}
                    title={live ? 'Pasar a borrador' : 'Publicar'}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${live ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                    {busy ? <Loader2 size={12} className="animate-spin" /> : live ? <Globe size={12} /> : <EyeOff size={12} />}
                    {live ? 'Publicada' : 'Borrador'}
                  </button>

                  <div className="flex shrink-0 items-center gap-0.5">
                    {siteSlug && (
                      <a href={`/${siteSlug}/pagina/${p.slug}${live ? '' : '?vista=previa'}`} target="_blank" rel="noopener noreferrer"
                        title={live ? 'Ver en el sitio' : 'Vista previa'} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                        <ExternalLink size={17} />
                      </a>
                    )}
                    <Link href={`/admin/paginas/${p.id}`} title="Editar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                      <Pencil size={17} />
                    </Link>
                    <button type="button" onClick={() => duplicate(p)} disabled={busy} title="Duplicar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                      <Copy size={17} />
                    </button>
                    <button type="button" onClick={() => remove(p)} disabled={busy} title="Eliminar" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {templatePicker}
        </>
      )}
    </div>
  );
}
