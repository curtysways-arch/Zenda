'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Check, ExternalLink, Loader2, Palette, ShoppingBag, Clock, X, Sparkles } from 'lucide-react';

type Design = {
    id: string;
    nombre: string;
    descripcion: string;
    destacados: string[];
    precio: number;
    etiqueta?: string;
    portada: string;
    activo: boolean;
    puedeUsar: boolean;
    comprado: boolean;
    pendiente: boolean;
};

type Data = { slug: string; isDemo: boolean; disponible: boolean; activo: string; designs: Design[] };

export default function DisenoPaginaPage() {
    const [data, setData] = useState<Data | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [buying, setBuying] = useState<Design | null>(null);
    const [metodo, setMetodo] = useState<'TRANSFERENCIA' | 'TARJETA'>('TRANSFERENCIA');
    const [referencia, setReferencia] = useState('');

    const load = async () => {
        try {
            const res = await fetch('/api/admin/landing-designs', { cache: 'no-store' });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'No se pudieron cargar los diseños');
            setData(d);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const post = async (body: any) => {
        setBusy(body.id);
        setError(null);
        setNotice(null);
        try {
            const res = await fetch('/api/admin/landing-designs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'No se pudo completar la acción');
            if (body.action === 'activar') setNotice('¡Listo! Tus clientes ya ven el nuevo diseño.');
            if (body.action === 'comprar') setNotice('Recibimos tu solicitud. Te escribiremos por WhatsApp con los datos de pago y, al confirmarlo, el diseño se activa solo.');
            setBuying(null);
            setReferencia('');
            await load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-slate-400" size={28} /></div>;
    }

    return (
        <div className="max-w-6xl space-y-5 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                        <span className="size-8 rounded-lg bg-slate-900 text-white flex items-center justify-center"><Palette size={17} /></span>
                        Diseño de mi página
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                        Elige cómo se ve la página que visitan tus clientes. Tus servicios, fotos, precios y reservas se mantienen: solo cambia el diseño.
                    </p>
                </div>
                {data?.slug && (
                    <a href={`/${data.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 w-fit">
                        <ExternalLink size={15} /> Ver mi página
                    </a>
                )}
            </div>

            {data?.isDemo && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-900">
                    Este es un negocio demo: puedes usar todos los diseños gratis para mostrarlos.
                </div>
            )}
            {notice && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900 flex items-center gap-2"><Check size={16} /> {notice}</div>
            )}
            {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">{error}</div>}

            {data && !data.disponible ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                    <Sparkles className="mx-auto text-slate-300" size={32} />
                    <p className="mt-3 font-semibold text-slate-900">Pronto habrá diseños para tu tipo de negocio</p>
                    <p className="text-sm text-slate-500 mt-1">Estamos preparando nuevas opciones. Te avisaremos cuando estén listas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {data?.designs.map((d) => (
                        <article key={d.id} className={`rounded-2xl bg-white overflow-hidden flex flex-col border-2 ${d.activo ? 'border-emerald-400' : 'border-slate-200'}`}>
                            {/* Vista previa en vivo con los datos del negocio */}
                            <div className="relative h-[280px] bg-slate-100 overflow-hidden">
                                <div className="absolute inset-0 flex justify-center pt-4">
                                    <div className="w-[200px] h-[410px] rounded-[1.75rem] bg-slate-900 p-1.5 shadow-xl">
                                        <div className="w-full h-full rounded-[1.6rem] overflow-hidden bg-white relative">
                                            <iframe
                                                src={`/${data.slug}?diseno=${d.id}`}
                                                title={`Vista previa ${d.nombre}`}
                                                loading="lazy"
                                                className="absolute top-0 left-0 w-[390px] h-[800px] origin-top-left border-0 pointer-events-none"
                                                style={{ transform: 'scale(0.486)' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-3 left-3 flex gap-2">
                                    {d.activo && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-500 text-white rounded-full px-2.5 py-1"><Check size={12} /> En uso</span>}
                                    {d.etiqueta && !d.activo && <span className="text-xs font-semibold bg-slate-900 text-white rounded-full px-2.5 py-1">{d.etiqueta}</span>}
                                </div>
                                <a
                                    href={`/${data.slug}?diseno=${d.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-white/95 text-slate-800 rounded-full px-3 py-1.5 shadow"
                                >
                                    <ExternalLink size={13} /> Ver completa
                                </a>
                            </div>

                            <div className="p-4 flex flex-col flex-1">
                                <div className="flex items-start justify-between gap-3">
                                    <h2 className="text-lg font-bold text-slate-900">{d.nombre}</h2>
                                    <span className="text-sm font-semibold text-slate-900 shrink-0">
                                        {d.precio === 0 ? 'Gratis' : d.comprado ? 'Comprado' : data.isDemo ? 'Gratis en demo' : `$${d.precio} · pago único`}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">{d.descripcion}</p>
                                <ul className="mt-2.5 space-y-1">
                                    {d.destacados.map((t) => (
                                        <li key={t} className="text-sm text-slate-700 flex items-start gap-2"><Check size={15} className="text-emerald-600 mt-0.5 shrink-0" /> {t}</li>
                                    ))}
                                </ul>
                                <div className="mt-auto pt-4">
                                    {d.activo ? (
                                        <div className="w-full text-center py-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold">Es tu diseño actual</div>
                                    ) : d.puedeUsar ? (
                                        <button
                                            onClick={() => post({ action: 'activar', id: d.id })}
                                            disabled={busy === d.id}
                                            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
                                        >
                                            {busy === d.id && <Loader2 size={15} className="animate-spin" />} Usar este diseño
                                        </button>
                                    ) : d.pendiente ? (
                                        <div className="w-full text-center py-2.5 rounded-xl bg-amber-50 text-amber-800 text-sm font-semibold inline-flex items-center justify-center gap-2"><Clock size={15} /> Compra en revisión</div>
                                    ) : (
                                        <button
                                            onClick={() => { setBuying(d); setError(null); }}
                                            className="w-full py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                                        >
                                            <ShoppingBag size={15} /> Comprar por ${d.precio}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {/* Compra */}
            {buying && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setBuying(null)}>
                    <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Comprar diseño</p>
                                <h3 className="text-xl font-bold text-slate-900">{buying.nombre} · ${buying.precio}</h3>
                            </div>
                            <button onClick={() => setBuying(null)} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><X size={18} /></button>
                        </div>
                        <p className="text-sm text-slate-600 mt-3">Es un pago único: el diseño queda tuyo y puedes volver a usarlo cuando quieras.</p>

                        <p className="text-sm font-semibold text-slate-900 mt-5 mb-2">¿Cómo prefieres pagar?</p>
                        <div className="grid grid-cols-2 gap-2">
                            {(['TRANSFERENCIA', 'TARJETA'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMetodo(m)}
                                    className={`py-2.5 rounded-xl border-2 text-sm font-semibold ${metodo === m ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]' : 'border-slate-200 text-slate-700'}`}
                                >
                                    {m === 'TRANSFERENCIA' ? 'Transferencia' : 'Tarjeta'}
                                </button>
                            ))}
                        </div>
                        <label className="block mt-4">
                            <span className="text-sm text-slate-700">Número de comprobante (opcional)</span>
                            <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Si ya pagaste, escríbelo aquí" className="mt-1 w-full !py-2.5 text-sm" />
                        </label>
                        <p className="text-xs text-slate-500 mt-3">Te escribiremos por WhatsApp con los datos de pago. Cuando lo confirmemos, el diseño se activa solo en tu página.</p>
                        <button
                            onClick={() => post({ action: 'comprar', id: buying.id, metodoPago: metodo, referencia })}
                            disabled={busy === buying.id}
                            className="mt-5 w-full py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052cc] text-white font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
                        >
                            {busy === buying.id && <Loader2 size={16} className="animate-spin" />} Enviar solicitud de compra
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
