'use client';
/**
 * RECIBIR EN EL LOCAL — el ingreso de artículos en el mostrador.
 * Pensado para hacerlo rápido con el cliente enfrente:
 *   1. Cliente (busca por celular; si ya vino, se completa solo)
 *   2. Qué deja: toca un servicio y se agrega; detalle y fotos por artículo
 *   3. Cuándo está lista y cómo se entrega
 * A la derecha (abajo en celular) el ticket se arma en vivo con el total y el botón para crear la orden.
 * Al crearla: comprobante por WhatsApp y ticket para imprimir y pegar a los artículos.
 * Usa el mismo endpoint de siempre (POST /api/shoe-care/orders).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Minus, Trash2, Camera, Loader2, Check, MessageCircle, X, Search, Store, Truck, AlertCircle,
  UserRound, Printer, PencilLine, ReceiptText, ShieldCheck,
} from 'lucide-react';
import { wordsFor, tipoArticuloOf } from '@/lib/laundry/wording';
import { money } from './flow';
import { brandVars, btnPrimary, btnSecondary } from './shared';

type Svc = { id: string; nombre: string; precio: number };
type Line = { key: string; tipo: string; cantidad: number; servicioId: string; detalle: string; fotos: string[] };
type Client = { id: string; nombre: string; telefono: string; email?: string; direccion?: string };

const TYPES_ZAPATOS = ['Zapatos', 'Botas', 'Tacones', 'Mochila', 'Gorra', 'Otro'];
const TYPES_ROPA = ['Prenda', 'Edredón', 'Terno', 'Vestido', 'Cortinas', 'Otro'];
const TYPES_AMBOS = ['Zapatos', 'Botas', 'Prenda', 'Edredón', 'Mochila', 'Otro'];

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--lb)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--lb)_15%,transparent)]';
const label = 'text-sm font-medium text-slate-700';
const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? 'border-[var(--lb)] bg-[var(--lb)] text-[var(--lb-ink)]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`;

function localDateKey(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-CA');
}

/** Adivina el tipo de artículo por el nombre del servicio (para no tener que tocarlo casi nunca). */
function guessType(name: string, types: string[]) {
  const n = name.toLowerCase();
  const rules: [RegExp, string][] = [[/bota/, 'Botas'], [/tac[oó]n/, 'Tacones'], [/mochila|bolso/, 'Mochila'], [/gorra/, 'Gorra'], [/edred|cobij|plum/, 'Edredón'], [/terno|traje/, 'Terno'], [/vestido/, 'Vestido'], [/cortina/, 'Cortinas'], [/zapat|sneaker|tenis|calzado/, 'Zapatos'], [/prenda|ropa|camis|pantal|chaqueta/, 'Prenda']];
  for (const [re, t] of rules) if (re.test(n) && types.includes(t)) return t;
  return types[0];
}

function Step({ n, title, hint, children, id }: { n: number; title: string; hint?: string; children: React.ReactNode; id: string }) {
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 sm:p-5" aria-labelledby={id}>
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--lb)] text-sm font-bold text-[var(--lb-ink)]">{n}</span>
        <div className="min-w-0">
          <h2 id={id} className="font-semibold leading-7 text-slate-900">{title}</h2>
          {hint && <p className="text-sm text-slate-500">{hint}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function LaundryIntake({ negocio }: { negocio: any }) {
  const negocioId: string = negocio?.id;
  const brand: string = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(negocio?.colorPrimario || '')) ? negocio.colorPrimario : '#0e7490';
  const tipoArt = tipoArticuloOf(negocio);
  const w = wordsFor(negocio);
  const types = tipoArt === 'ZAPATOS' ? TYPES_ZAPATOS : tipoArt === 'ROPA' ? TYPES_ROPA : TYPES_AMBOS;

  const [services, setServices] = useState<Svc[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingSvc, setLoadingSvc] = useState(true);
  const [svcQuery, setSvcQuery] = useState('');

  // Cliente
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');
  const [picked, setPicked] = useState<Client | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);

  // Artículos
  const [lines, setLines] = useState<Line[]>([]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoTarget = useRef<string | null>(null);
  const [nota, setNota] = useState('');
  const [showNota, setShowNota] = useState(false);

  // Entrega
  const [entrega, setEntrega] = useState<'LOCAL' | 'DOMICILIO'>('LOCAL');
  const [dia, setDia] = useState<number | 'otro'>(2);
  const [fechaOtra, setFechaOtra] = useState(localDateKey(3));
  const [hora, setHora] = useState('17:00');
  const [direccion, setDireccion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [costoEnvio, setCostoEnvio] = useState('0');

  // Pago
  const [pagaAhora, setPagaAhora] = useState(false);
  const [metodo, setMetodo] = useState('EFECTIVO');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [created, setCreated] = useState<any>(null);

  useEffect(() => {
    if (!negocioId) return;
    fetch(`/api/services?negocioId=${negocioId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setServices((Array.isArray(d) ? d : []).filter((s: any) => s.estaActivo !== false).map((s: any) => ({ id: s.id, nombre: s.nombre, precio: Number(s.precio) || 0 }))))
      .catch(() => {})
      .finally(() => setLoadingSvc(false));
    fetch(`/api/shoe-care/clients?negocioId=${negocioId}`).then((r) => (r.ok ? r.json() : [])).then((d) => setClients(Array.isArray(d) ? d : [])).catch(() => {});
  }, [negocioId]);

  // Desde la ficha de un cliente: /admin/recepciones?telefono=...&nombre=...
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    const sp = new URLSearchParams(window.location.search);
    const tel = sp.get('telefono') || '';
    if (!tel) { prefilled.current = true; return; }
    const digits = tel.replace(/\D/g, '').replace(/^593/, '0');
    const match = clients.find((c) => String(c.telefono).replace(/\D/g, '').replace(/^593/, '0') === digits);
    if (match) { pick(match); prefilled.current = true; return; }
    setTelefono(tel); setNombre(sp.get('nombre') || '');
    if (clients.length) prefilled.current = true;
  }, [clients]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearErr = (k: string) => setErrors((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });

  const suggestions = useMemo(() => {
    const t = telefono.replace(/\D/g, '');
    const n = nombre.trim().toLowerCase();
    if (picked || (t.length < 3 && n.length < 2)) return [];
    return clients.filter((c) => (t.length >= 3 && String(c.telefono).replace(/\D/g, '').includes(t)) || (n.length >= 2 && String(c.nombre).toLowerCase().includes(n))).slice(0, 5);
  }, [clients, telefono, nombre, picked]);

  const pick = (c: Client) => {
    setPicked(c); setTelefono(c.telefono); setNombre(c.nombre);
    if (c.direccion && !direccion) setDireccion(c.direccion);
    setShowSuggest(false); clearErr('telefono'); clearErr('nombre');
  };
  const unpick = () => { setPicked(null); setTelefono(''); setNombre(''); setTimeout(() => document.getElementById('tel')?.focus(), 30); };

  const svcOf = (id: string) => services.find((s) => s.id === id);
  const shownServices = useMemo(() => {
    const q = svcQuery.trim().toLowerCase();
    return q ? services.filter((s) => s.nombre.toLowerCase().includes(q)) : services;
  }, [services, svcQuery]);

  /** Tocar un servicio: suma uno si el último artículo es igual y no tiene detalle; si no, agrega otro. */
  const addService = (s: Svc) => {
    clearErr('lines');
    setLines((ls) => {
      const last = ls[ls.length - 1];
      if (last && last.servicioId === s.id && !last.detalle.trim() && !last.fotos.length) {
        return ls.map((l) => (l.key === last.key ? { ...l, cantidad: Math.min(50, l.cantidad + 1) } : l));
      }
      return [...ls, { key: `l${Date.now()}${Math.random()}`, tipo: guessType(s.nombre, types), cantidad: 1, servicioId: s.id, detalle: '', fotos: [] }];
    });
  };
  const setLine = (k: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...patch } : l)));
  const countOf = (svcId: string) => lines.filter((l) => l.servicioId === svcId).reduce((s, l) => s + l.cantidad, 0);

  const subtotal = lines.reduce((s, l) => s + (svcOf(l.servicioId)?.precio || 0) * l.cantidad, 0);
  const envio = entrega === 'DOMICILIO' ? Math.max(0, Number(costoEnvio) || 0) : 0;
  const total = subtotal + envio;
  const piezas = lines.reduce((s, l) => s + l.cantidad, 0);
  const fotosCount = lines.reduce((s, l) => s + l.fotos.length, 0);
  const aCotizar = lines.some((l) => !(svcOf(l.servicioId)?.precio));

  const fechaKey = dia === 'otro' ? fechaOtra : localDateKey(dia);
  const fechaRaw = new Date(`${fechaKey}T12:00:00`).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
  const fechaLabel = fechaRaw.charAt(0).toUpperCase() + fechaRaw.slice(1);

  const openCamera = (lineKey: string) => { photoTarget.current = lineKey; fileRef.current?.click(); };
  const uploadPhotos = async (files: FileList | null) => {
    const key = photoTarget.current;
    if (!files?.length || !key) return;
    setUploadingKey(key);
    try {
      for (const f of Array.from(files).slice(0, 6)) {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('category', 'reception');
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const d = await res.json().catch(() => ({}));
        if (res.ok && d.url) setLines((ls) => ls.map((l) => (l.key === key ? { ...l, fotos: [...l.fotos, d.url] } : l)));
        else setSubmitError(d.error || 'No se pudo subir una foto.');
      }
    } finally {
      setUploadingKey(null);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (telefono.replace(/\D/g, '').length < 7) e.telefono = 'Escribe el celular del cliente.';
    if (!nombre.trim()) e.nombre = 'Escribe el nombre del cliente.';
    if (!lines.length) e.lines = `Toca un servicio para agregar ${w.lasCosas}.`;
    if (entrega === 'DOMICILIO' && !direccion.trim()) e.direccion = 'Escribe la dirección de entrega.';
    setErrors(e);
    if (Object.keys(e).length) setTimeout(() => document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    setSubmitError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const [h, m] = hora.split(':').map(Number);
      const [y, mo, d] = fechaKey.split('-').map(Number);
      const lista = new Date(y, mo - 1, d, h || 17, m || 0);
      const articulos = lines.map((l) => {
        const s = svcOf(l.servicioId);
        return {
          tipo: l.tipo, variante: l.detalle.trim() || l.tipo, cantidad: l.cantidad,
          servicioId: l.servicioId, servicioNombre: s?.nombre || 'Servicio', precioUnitario: s?.precio || 0,
          extras: [], observaciones: l.detalle.trim(), fotos: l.fotos,
        };
      });
      const res = await fetch('/api/shoe-care/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId,
          modo: entrega === 'DOMICILIO' ? 'DESPACHO_SOLO' : 'LOCAL',
          nombreCliente: nombre.trim(),
          telefonoCliente: telefono.trim(),
          emailCliente: picked?.email || null,
          direccionCliente: entrega === 'DOMICILIO' ? direccion.trim() : null,
          referenciaCliente: entrega === 'DOMICILIO' ? referencia.trim() || null : null,
          cantidadPares: piezas,
          articulos,
          observaciones: nota.trim(),
          fotosRecepcion: lines.flatMap((l) => l.fotos),
          fechaEstimadaEntrega: lista.toISOString(),
          ...(entrega === 'DOMICILIO' ? { costoEnvio: envio } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la orden.');

      let pagado = false;
      if (pagaAhora) {
        const p = await fetch(`/api/shoe-care/orders/${data.id}/pay`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metodoPago: metodo, monto: Number(data.total ?? total), entregar: false }),
        }).catch(() => null);
        pagado = Boolean(p?.ok);
      }
      setCreated({
        ...data, pagado, fechaLabel, hora, entrega, direccion: direccion.trim(), cliente: nombre.trim(), telefono: telefono.trim(),
        items: lines.map((l) => ({ nombre: svcOf(l.servicioId)?.nombre || 'Servicio', tipo: l.tipo, cantidad: l.cantidad, precio: svcOf(l.servicioId)?.precio || 0, detalle: l.detalle.trim() })),
        subtotal, envio, totalLocal: total, recibido: new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      setSubmitError(e.message || 'No se pudo crear la orden.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setCreated(null); setTelefono(''); setNombre(''); setPicked(null); setLines([]); setNota(''); setShowNota(false);
    setEntrega('LOCAL'); setDia(2); setHora('17:00'); setDireccion(''); setReferencia(''); setCostoEnvio('0'); setPagaAhora(false); setErrors({}); setSubmitError('');
  };

  /* ── Orden creada: comprobante + ticket ── */
  if (created) {
    const phone = String(created.telefonoCliente || created.telefono).replace(/\D/g, '');
    const wa = phone.startsWith('0') && phone.length === 10 ? `593${phone.slice(1)}` : phone;
    const totalFinal = Number(created.total ?? created.totalLocal);
    const msg = [
      `Hola ${created.cliente.split(' ')[0]} 👋`,
      `Recibimos ${w.tusCosas} en *${negocio?.nombre || 'nuestro local'}*.`,
      ``,
      `Orden: *#${created.numeroPedido}*`,
      ...created.items.map((it: any) => `• ${it.cantidad} × ${it.nombre}${it.detalle ? ` (${it.detalle})` : ''}`),
      `Lista: *${created.fechaLabel}, ${created.hora}*`,
      `Total: *${money(totalFinal)}*${created.pagado ? ' (pagado)' : ''}`,
      negocio?.slug ? `\nSigue tu orden: https://citiox.com/${negocio.slug}/pedidos/${created.id}` : '',
    ].filter((x) => x !== '').join('\n');
    return (
      <div className="mx-auto max-w-4xl py-4" style={brandVars(brand)}>
        <style>{`@media print{body *{visibility:hidden!important}#lav-ticket,#lav-ticket *{visibility:visible!important}#lav-ticket{position:absolute;left:0;top:0;width:72mm;box-shadow:none!important;border:0!important;margin:0!important;padding:4mm!important}}`}</style>
        <div className="grid items-start gap-5 md:grid-cols-[1fr_320px]">
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200/80 sm:p-8">
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={26} strokeWidth={2.5} /></span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Orden #{created.numeroPedido} registrada</h1>
            <p className="mt-1 text-slate-600">{created.cliente} · {piezas} {piezas === 1 ? 'artículo' : 'artículos'} · {money(totalFinal)} {created.pagado ? '· pagada' : '· por cobrar'}</p>
            <p className="mt-1 text-sm text-slate-500">Estará lista el {created.fechaLabel.toLowerCase()}, {created.hora}.</p>
            <ol className="mt-6 space-y-2 text-sm">
              <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">1</span> Envíale el comprobante al cliente por WhatsApp.</li>
              <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">2</span> Imprime el ticket y pégalo a {w.lasCosas} con el número #{created.numeroPedido}.</li>
            </ol>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {wa && (
                <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-[15px] font-semibold text-white hover:brightness-105">
                  <MessageCircle size={18} /> Enviar por WhatsApp
                </a>
              )}
              <button onClick={() => window.print()} className={`${btnSecondary} py-3 text-[15px]`}><Printer size={17} /> Imprimir ticket</button>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
              <button onClick={reset} className={btnPrimary}><Plus size={16} /> Recibir otra orden</button>
              <Link href={`/admin/ordenes-servicio?etapa=revisar&orden=${created.id}`} className={btnSecondary}>Ver la orden</Link>
            </div>
          </div>

          {/* Ticket imprimible */}
          <div id="lav-ticket" className="rounded-2xl bg-white p-5 font-mono text-[13px] leading-snug text-slate-900 shadow-sm ring-1 ring-slate-200">
            <p className="text-center text-base font-bold">{negocio?.nombre}</p>
            {(negocio?.whatsapp || negocio?.telefono) && <p className="text-center text-xs">{negocio.whatsapp || negocio.telefono}</p>}
            <p className="mt-3 text-center text-3xl font-bold">#{created.numeroPedido}</p>
            <p className="text-center text-xs">Recibido {created.recibido}</p>
            <div className="my-3 border-t border-dashed border-slate-400" />
            <p><b>{created.cliente}</b></p>
            <p>{created.telefono}</p>
            <div className="my-3 border-t border-dashed border-slate-400" />
            {created.items.map((it: any, i: number) => (
              <div key={i} className="mb-1.5">
                <div className="flex justify-between gap-2"><span>{it.cantidad} × {it.nombre}</span><span>{it.precio ? money(it.precio * it.cantidad) : '—'}</span></div>
                {(it.detalle || it.tipo) && <p className="text-xs text-slate-600">{it.tipo}{it.detalle ? ` · ${it.detalle}` : ''}</p>}
              </div>
            ))}
            {created.envio > 0 && <div className="flex justify-between"><span>Envío</span><span>{money(created.envio)}</span></div>}
            <div className="my-3 border-t border-dashed border-slate-400" />
            <div className="flex justify-between text-base font-bold"><span>TOTAL</span><span>{money(totalFinal)}</span></div>
            <p className="mt-1 text-center text-xs font-bold uppercase">{created.pagado ? 'Pagado' : 'Por cobrar'}</p>
            <div className="my-3 border-t border-dashed border-slate-400" />
            <p>Lista: <b>{created.fechaLabel}, {created.hora}</b></p>
            <p>{created.entrega === 'DOMICILIO' ? `Entrega a domicilio: ${created.direccion}` : 'Retira en el local con este ticket'}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Ticket en vivo (resumen) ── */
  const ticket = (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
      <div className="flex items-center gap-2 border-b border-dashed border-slate-200 px-4 py-3">
        <ReceiptText size={17} className="text-slate-400" />
        <p className="font-semibold text-slate-900">Orden nueva</p>
        <span className="ml-auto text-xs text-slate-500">{piezas} {piezas === 1 ? 'artículo' : 'artículos'}</span>
      </div>
      <div className="space-y-3 px-4 py-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Cliente</p>
          <p className={`font-medium ${nombre ? 'text-slate-900' : 'text-slate-400'}`}>{nombre || 'Sin cliente todavía'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Artículos</p>
          {lines.length === 0 ? <p className="text-slate-400">Aún no agregas nada</p> : (
            <ul className="mt-1 space-y-1">
              {lines.map((l) => {
                const s = svcOf(l.servicioId);
                return (
                  <li key={l.key} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate text-slate-700">{l.cantidad} × {s?.nombre}</span>
                    <span className="shrink-0 tabular-nums text-slate-900">{s?.precio ? money(s.precio * l.cantidad) : 'a cotizar'}</span>
                  </li>
                );
              })}
              {envio > 0 && <li className="flex justify-between gap-3"><span className="text-slate-700">Envío</span><span className="tabular-nums">{money(envio)}</span></li>}
            </ul>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-500">Lista</p>
          <p className="text-slate-900">{fechaLabel}, {hora} · {entrega === 'LOCAL' ? 'retira en el local' : 'a domicilio'}</p>
        </div>
      </div>
      <div className="border-t border-dashed border-slate-200 px-4 py-3">
        <div className="flex items-end justify-between">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-2xl font-bold tabular-nums text-slate-900">{money(total)}</span>
        </div>
        {aCotizar && lines.length > 0 && <p className="mt-1 text-xs text-amber-700">Hay servicios sin precio: los cotizas después.</p>}
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <span className="text-sm font-medium text-slate-800">Pagó ahora</span>
          <input type="checkbox" checked={pagaAhora} onChange={(e) => setPagaAhora(e.target.checked)} className="size-5 accent-[var(--lb)]" />
        </label>
        {pagaAhora && (
          <div className="mt-2 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Forma de pago">
            {[['EFECTIVO', 'Efectivo'], ['TRANSFERENCIA', 'Transf.'], ['TARJETA', 'Tarjeta']].map(([k, t]) => (
              <button key={k} type="button" role="radio" aria-checked={metodo === k} onClick={() => setMetodo(k)}
                className={`rounded-lg border py-2 text-xs font-semibold ${metodo === k ? 'border-[var(--lb)] bg-[color-mix(in_srgb,var(--lb)_8%,white)] text-slate-900 ring-1 ring-[var(--lb)]' : 'border-slate-200 text-slate-600'}`}>{t}</button>
            ))}
          </div>
        )}
        {!pagaAhora && <p className="mt-2 text-xs text-slate-500">Queda “por cobrar”: lo cobras al entregar.</p>}
        <button onClick={submit} disabled={saving || loadingSvc || !services.length} className={`${btnPrimary} mt-3 w-full py-3 text-[15px]`}>
          {saving ? <><Loader2 size={17} className="animate-spin" /> Creando…</> : <>Crear orden</>}
        </button>
      </div>
    </div>
  );

  /* ── Formulario ── */
  return (
    <div className="mx-auto max-w-6xl pb-40 lg:pb-10" style={brandVars(brand)}>
      <div className="mb-5 flex items-center gap-3">
        <Link href="/admin/ordenes-servicio" className="rounded-xl p-2 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50" aria-label="Volver a órdenes"><ArrowLeft size={18} /></Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Recibir en el local</h1>
          <p className="text-sm text-slate-500">Registra {w.lasCosas} que el cliente deja en el mostrador.</p>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(e) => { uploadPhotos(e.target.files); e.target.value = ''; }} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {/* 1. Cliente */}
          <Step n={1} id="cli" title="Cliente" hint={picked ? undefined : 'Busca por celular: si ya vino antes, se completa solo.'}>
            {picked ? (
              <div className="flex items-center gap-3 rounded-xl bg-[color-mix(in_srgb,var(--lb)_7%,white)] p-3 ring-1 ring-[color-mix(in_srgb,var(--lb)_25%,white)]">
                <span className="flex size-10 items-center justify-center rounded-full bg-[var(--lb)] font-semibold text-[var(--lb-ink)]">{picked.nombre.charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{picked.nombre}</p>
                  <p className="text-sm text-slate-600">{picked.telefono} · <span className="text-emerald-700">cliente frecuente</span></p>
                </div>
                <button onClick={unpick} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-white">Cambiar</button>
              </div>
            ) : (
              <div className="relative grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="tel" className={label}>Celular (WhatsApp)</label>
                  <div className="relative mt-1.5">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input id="tel" inputMode="tel" autoComplete="off" value={telefono} placeholder="0991234567"
                      onChange={(e) => { setTelefono(e.target.value); setShowSuggest(true); clearErr('telefono'); }}
                      onFocus={() => setShowSuggest(true)} onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                      className={`${field} pl-9 ${errors.telefono ? 'border-rose-400' : ''}`} aria-invalid={!!errors.telefono} />
                  </div>
                  {errors.telefono && <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-rose-600"><AlertCircle size={14} /> {errors.telefono}</p>}
                </div>
                <div>
                  <label htmlFor="nom" className={label}>Nombre</label>
                  <input id="nom" autoComplete="off" value={nombre} placeholder="Nombre y apellido"
                    onChange={(e) => { setNombre(e.target.value); setShowSuggest(true); clearErr('nombre'); }}
                    onFocus={() => setShowSuggest(true)} onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                    className={`${field} mt-1.5 ${errors.nombre ? 'border-rose-400' : ''}`} aria-invalid={!!errors.nombre} />
                  {errors.nombre && <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-rose-600"><AlertCircle size={14} /> {errors.nombre}</p>}
                </div>
                {showSuggest && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200" role="listbox">
                    <li className="px-4 pb-1 pt-2.5 text-xs font-medium text-slate-500">Clientes que ya vinieron</li>
                    {suggestions.map((c) => (
                      <li key={c.id}>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
                          <span className="flex items-center gap-2 font-medium text-slate-900"><UserRound size={15} className="text-slate-400" />{c.nombre}</span>
                          <span className="text-sm text-slate-500">{c.telefono}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Step>

          {/* 2. Qué deja */}
          <Step n={2} id="art" title="Qué deja" hint={`Toca el servicio para agregarlo. Toca otra vez para sumar uno más.`}>
            {loadingSvc ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-xl bg-slate-100" />)}</div>
            ) : services.length === 0 ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Aún no tienes servicios. <Link href="/admin/servicios" className="font-semibold underline">Créalos en Servicios y precios</Link> para poder recibir órdenes.
              </p>
            ) : (
              <>
                {services.length > 9 && (
                  <div className="relative mb-3">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={svcQuery} onChange={(e) => setSvcQuery(e.target.value)} placeholder="Buscar servicio" className={`${field} py-2.5 pl-9 text-sm`} aria-label="Buscar servicio" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {shownServices.map((s) => {
                    const n = countOf(s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => addService(s)}
                        className={`relative flex min-h-[68px] flex-col justify-between rounded-xl border p-3 text-left transition active:scale-[0.98] ${n ? 'border-[var(--lb)] bg-[color-mix(in_srgb,var(--lb)_6%,white)] ring-1 ring-[var(--lb)]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                        <span className="line-clamp-2 pr-6 text-sm font-medium leading-snug text-slate-900">{s.nombre}</span>
                        <span className="mt-1 text-sm tabular-nums text-slate-500">{s.precio ? money(s.precio) : 'a cotizar'}</span>
                        <span className={`absolute right-2 top-2 flex size-6 items-center justify-center rounded-full text-xs font-bold ${n ? 'bg-[var(--lb)] text-[var(--lb-ink)]' : 'bg-slate-100 text-slate-500'}`}>{n || <Plus size={13} />}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {errors.lines && <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm text-rose-600"><AlertCircle size={14} /> {errors.lines}</p>}

            {lines.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium text-slate-700">En esta orden</p>
                <ul className="space-y-2.5">
                  {lines.map((l, i) => {
                    const s = svcOf(l.servicioId);
                    return (
                      <li key={l.key} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900">{s?.nombre}</p>
                            <p className="text-sm tabular-nums text-slate-500">{s?.precio ? `${money(s.precio)} c/u · ${money(s.precio * l.cantidad)}` : 'Precio a cotizar'}</p>
                          </div>
                          <div className="flex items-center rounded-xl border border-slate-200">
                            <button type="button" onClick={() => (l.cantidad <= 1 ? setLines((ls) => ls.filter((x) => x.key !== l.key)) : setLine(l.key, { cantidad: l.cantidad - 1 }))} className="flex size-10 items-center justify-center text-slate-600" aria-label={l.cantidad <= 1 ? 'Quitar' : 'Uno menos'}>
                              {l.cantidad <= 1 ? <Trash2 size={16} /> : <Minus size={16} />}
                            </button>
                            <span className="min-w-[2rem] text-center font-semibold tabular-nums" aria-live="polite">{l.cantidad}</span>
                            <button type="button" onClick={() => setLine(l.key, { cantidad: Math.min(50, l.cantidad + 1) })} className="flex size-10 items-center justify-center text-slate-600" aria-label="Uno más"><Plus size={16} /></button>
                          </div>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Tipo del artículo ${i + 1}`}>
                          {types.map((t) => (
                            <button key={t} type="button" role="radio" aria-checked={l.tipo === t} onClick={() => setLine(l.key, { tipo: t })} className={`${chip(l.tipo === t)} px-2.5 py-1 text-xs`}>{t}</button>
                          ))}
                        </div>
                        <div className="mt-2.5 flex gap-2">
                          <div className="relative min-w-0 flex-1">
                            <PencilLine size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={l.detalle} onChange={(e) => setLine(l.key, { detalle: e.target.value })} placeholder="Color, marca o daños (ej. blancos Nike, mancha en la punta)" className={`${field} py-2.5 pl-9 text-sm`} aria-label={`Detalle del artículo ${i + 1}`} />
                          </div>
                          <button type="button" onClick={() => openCamera(l.key)} disabled={uploadingKey === l.key} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:border-[var(--lb)] hover:text-[var(--lb)] disabled:opacity-60" aria-label={`Foto del artículo ${i + 1}`}>
                            {uploadingKey === l.key ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}<span className="hidden sm:inline">Foto</span>
                          </button>
                        </div>
                        {l.fotos.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {l.fotos.map((u, k) => (
                              <div key={u} className="relative size-16 overflow-hidden rounded-lg ring-1 ring-slate-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={u} alt={`Foto ${k + 1}`} className="size-full object-cover" />
                                <button type="button" onClick={() => setLine(l.key, { fotos: l.fotos.filter((x) => x !== u) })} className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-slate-900/75 text-white" aria-label="Quitar foto"><X size={11} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className={`mt-3 flex items-center gap-1.5 text-xs ${fotosCount ? 'text-emerald-700' : 'text-slate-500'}`}>
                  <ShieldCheck size={14} /> {fotosCount ? `${fotosCount} ${fotosCount === 1 ? 'foto guardada' : 'fotos guardadas'}: quedan en la orden por si hay un reclamo.` : 'Toma una foto de cada artículo: te protege si hay un reclamo.'}
                </p>
              </div>
            )}

            {showNota || nota ? (
              <div className="mt-4">
                <label htmlFor="nota" className={label}>Nota interna</label>
                <textarea id="nota" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. el cliente pide cuidado especial con la gamuza" className={`${field} mt-1.5 resize-none text-sm`} autoFocus={showNota && !nota} />
              </div>
            ) : (
              <button type="button" onClick={() => setShowNota(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"><Plus size={15} /> Agregar nota interna</button>
            )}
          </Step>

          {/* 3. Entrega */}
          <Step n={3} id="ent" title="Cuándo está lista y cómo se entrega">
            <div className="flex flex-wrap gap-2">
              {([[0, 'Hoy'], [1, 'Mañana'], [2, 'En 2 días'], [3, 'En 3 días'], ['otro', 'Otra fecha']] as const).map(([k, t]) => (
                <button key={String(k)} type="button" aria-pressed={dia === k} onClick={() => setDia(k as any)} className={chip(dia === k)}>{t}</button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {dia === 'otro' && <input type="date" value={fechaOtra} min={localDateKey(0)} onChange={(e) => setFechaOtra(e.target.value)} className={`${field} !w-auto py-2.5`} aria-label="Fecha" />}
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={`${field} !w-auto py-2.5`} aria-label="Hora" />
              <span className="text-sm text-slate-500">{fechaLabel}</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Forma de entrega">
              {([['LOCAL', Store, 'Retira en el local', 'Viene a buscarlo'], ['DOMICILIO', Truck, 'A domicilio', 'Lo lleva un repartidor']] as const).map(([k, Icon, t, sub]) => (
                <button key={k} type="button" role="radio" aria-checked={entrega === k} onClick={() => setEntrega(k)}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${entrega === k ? 'border-[var(--lb)] bg-[color-mix(in_srgb,var(--lb)_7%,white)] ring-1 ring-[var(--lb)]' : 'border-slate-200 hover:border-slate-300'}`}>
                  <Icon size={18} className={`mt-0.5 shrink-0 ${entrega === k ? 'text-[var(--lb)]' : 'text-slate-400'}`} />
                  <span><span className="block text-sm font-semibold text-slate-900">{t}</span><span className="block text-xs text-slate-500">{sub}</span></span>
                </button>
              ))}
            </div>

            {entrega === 'DOMICILIO' && (
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_140px]">
                <div className="sm:col-span-3">
                  <label htmlFor="dir" className={label}>Dirección de entrega</label>
                  <input id="dir" value={direccion} onChange={(e) => { setDireccion(e.target.value); clearErr('direccion'); }} placeholder="Calle, número y sector" className={`${field} mt-1.5 ${errors.direccion ? 'border-rose-400' : ''}`} />
                  {errors.direccion && <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-rose-600"><AlertCircle size={14} /> {errors.direccion}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="ref" className={label}>Referencia</label>
                  <input id="ref" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ej. casa verde, 2do piso" className={`${field} mt-1.5`} />
                </div>
                <div>
                  <label htmlFor="env" className={label}>Envío ($)</label>
                  <input id="env" inputMode="decimal" value={costoEnvio} onChange={(e) => setCostoEnvio(e.target.value.replace(/[^\d.]/g, ''))} className={`${field} mt-1.5`} />
                </div>
              </div>
            )}
          </Step>

          {submitError && <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 p-3.5 text-sm text-rose-700 ring-1 ring-rose-200"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {submitError}</p>}

          {/* En celular, el ticket va al final */}
          <div className="lg:hidden">{ticket}</div>
        </div>

        {/* En computadora, el ticket acompaña a la derecha */}
        <aside className="sticky top-4 hidden lg:block">{ticket}</aside>
      </div>

      {/* Barra fija en celular */}
      <div className="fixed inset-x-0 bottom-16 z-[60] border-t border-slate-200 bg-white/95 backdrop-blur md:bottom-0 md:left-64 lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">{piezas} {piezas === 1 ? 'artículo' : 'artículos'}{pagaAhora ? ' · pagado' : ''}</p>
            <p className="text-xl font-bold tabular-nums text-slate-900">{money(total)}</p>
          </div>
          <button onClick={submit} disabled={saving || loadingSvc || !services.length} className={`${btnPrimary} px-6 py-3 text-[15px]`}>
            {saving ? <><Loader2 size={17} className="animate-spin" /> Creando…</> : <>Crear orden</>}
          </button>
        </div>
      </div>
    </div>
  );
}
