'use client';

/**
 * Resumen del club para el dueño. Responde tres preguntas, en este orden:
 *  1. ¿Qué premios tengo que entregar?  (con buscador por el código que dicta el cliente)
 *  2. ¿Cómo va mi club?                   (cifras de los últimos 30 días)
 *  3. ¿A quién le escribo hoy?            (clientes a punto de ganar un premio, con WhatsApp listo)
 */

import { useCallback, useEffect, useState } from 'react';
import { Check, Gift, Loader2, MessageCircle, Search, Sparkles, Trophy, Users } from 'lucide-react';

type Pendiente = {
    id: string;
    tipoOrigen: 'PUNTOS' | 'REFERIDO';
    premio: string;
    cliente: string;
    telefono: string | null;
    estado: string;
    codigo: string | null;
    fecha?: string;
};

type Cerca = {
    userId: string;
    nombre: string | null;
    telefono: string | null;
    puntos: number;
    nivel: string | null;
    nivelColor: string | null;
    puedeCanjear: string | null;
    siguiente: string | null;
    falta: number | null;
    pctSiguiente: number;
};

type Data = {
    negocio: string;
    slug: string;
    kpis: { socios: number; activos30: number; puntos30: number; canjes30: number; porEntregar: number };
    porEntregar: Pendiente[];
    cerca: Cerca[];
    premios: number;
};

const ESTADO: Record<string, { label: string; cls: string }> = {
    SOLICITADO: { label: 'Lo pidió', cls: 'bg-amber-50 text-amber-800' },
    LISTO_PARA_RETIRAR: { label: 'Listo, esperando al cliente', cls: 'bg-emerald-50 text-emerald-800' },
    PENDIENTE_ENTREGA: { label: 'Aún no lo pide', cls: 'bg-slate-100 text-slate-600' },
};

const fmt = (n: number) => Math.round(n).toLocaleString('es-EC');

function waLink(phone: string | null, text: string) {
    let d = String(phone || '').replace(/\D/g, '');
    if (!d) return null;
    if (d.startsWith('0')) d = `593${d.slice(1)}`;
    else if (d.length === 9) d = `593${d}`;
    return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

export default function ClubResumen({ primaryColor }: { primaryColor: string }) {
    const brand = primaryColor || '#ec4899';
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmar, setConfirmar] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [codigo, setCodigo] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [hallado, setHallado] = useState<Pendiente | null>(null);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const load = useCallback(async () => {
        try {
            const r = await fetch('/api/admin/loyalty/resumen', { cache: 'no-store' });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            setData(d);
            setError(null);
        } catch (e: any) {
            setError(e.message || 'No se pudo cargar el resumen.');
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const entregar = async (p: Pendiente) => {
        if (confirmar !== p.id) { setConfirmar(p.id); return; }
        setBusy(p.id);
        setMsg(null);
        try {
            const r = await fetch('/api/admin/loyalty/resumen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'ENTREGAR', id: p.id, tipoOrigen: p.tipoOrigen }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            setMsg({ ok: true, text: `Entregado: ${p.premio} a ${p.cliente}.` });
            if (hallado?.id === p.id) { setHallado(null); setCodigo(''); }
            await load();
        } catch (e: any) {
            setMsg({ ok: false, text: e.message || 'No se pudo entregar.' });
        } finally {
            setBusy(null);
            setConfirmar(null);
        }
    };

    const buscar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!codigo.trim()) return;
        setBuscando(true);
        setHallado(null);
        setMsg(null);
        try {
            const r = await fetch('/api/admin/loyalty/resumen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'BUSCAR', codigo }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            setHallado(d);
        } catch (e: any) {
            setMsg({ ok: false, text: e.message || 'No encontramos ese código.' });
        } finally {
            setBuscando(false);
        }
    };

    if (error) {
        return <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-4 py-3">{error} <button onClick={load} className="underline font-medium">Reintentar</button></p>;
    }
    if (!data) {
        return <div className="py-10 flex justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
    }

    const { kpis } = data;
    const hallPendiente = hallado && ['SOLICITADO', 'LISTO_PARA_RETIRAR', 'PENDIENTE_ENTREGA'].includes(hallado.estado);

    const Row = ({ p }: { p: Pendiente }) => {
        const est = ESTADO[p.estado] || { label: p.estado, cls: 'bg-slate-100 text-slate-600' };
        return (
            <li className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
                <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 max-sm:hidden"><Gift className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{p.premio}</p>
                    <p className="text-sm text-slate-500">
                        {p.cliente}{p.telefono ? ` · ${p.telefono}` : ''}{p.codigo ? <> · <span className="font-mono">{p.codigo}</span></> : null}
                    </p>
                </div>
                <span className={`self-start sm:self-auto text-xs font-semibold px-2.5 py-1 rounded-full ${est.cls}`}>{est.label}</span>
                <button
                    onClick={() => entregar(p)}
                    disabled={busy === p.id}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 ${confirmar === p.id ? 'bg-emerald-700' : 'bg-emerald-600'}`}
                >
                    {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmar === p.id ? '¿Confirmar entrega?' : 'Entregar'}
                </button>
            </li>
        );
    };

    return (
        <div className="space-y-6">
            {/* 1. Por entregar */}
            <section className="bg-white rounded-2xl border border-slate-200">
                <div className="px-4 sm:px-5 pt-4 pb-3 flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Premios por entregar</h2>
                        <p className="text-sm text-slate-500">
                            {kpis.porEntregar === 0 ? 'No tienes premios pendientes.' : `${kpis.porEntregar} ${kpis.porEntregar === 1 ? 'premio espera' : 'premios esperan'} a su dueño.`}
                            {' '}Si el cliente trae el QR, escanéalo con la cámara.
                        </p>
                    </div>
                    <form onSubmit={buscar} className="flex gap-2 w-full sm:w-auto">
                        <label htmlFor="club-codigo" className="sr-only">Código del cliente</label>
                        <input
                            id="club-codigo"
                            value={codigo}
                            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                            placeholder="Código, ej. PX-F7L2NB"
                            className="flex-1 sm:w-56 min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                        <button disabled={buscando || !codigo.trim()} className="px-3.5 rounded-xl bg-slate-900 text-white disabled:opacity-50 flex items-center gap-1.5 text-sm font-semibold">
                            {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Buscar
                        </button>
                    </form>
                </div>

                {msg && (
                    <p className={`mx-4 sm:mx-5 mb-3 text-sm rounded-xl px-3 py-2 ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{msg.text}</p>
                )}

                {hallado && (
                    <div className="mx-4 sm:mx-5 mb-3 rounded-xl ring-2 ring-slate-900/10">
                        {hallPendiente ? (
                            <ul><Row p={hallado} /></ul>
                        ) : (
                            <p className="px-4 py-3 text-sm text-slate-600">
                                <b>{hallado.premio}</b> de {hallado.cliente}: {hallado.estado === 'ENTREGADO' ? 'ya fue entregado.' : `estado ${hallado.estado.toLowerCase().replace(/_/g, ' ')}.`}
                            </p>
                        )}
                    </div>
                )}

                {data.porEntregar.length > 0 && (
                    <ul className="border-t border-slate-100 divide-y divide-slate-100">
                        {data.porEntregar.map((p) => <Row key={`${p.tipoOrigen}-${p.id}`} p={p} />)}
                    </ul>
                )}
            </section>

            {/* 2. Cifras */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Clientes en el club', value: fmt(kpis.socios), hint: 'Con cuenta de puntos' },
                    { label: 'Volvieron a sumar', value: fmt(kpis.activos30), hint: 'Últimos 30 días' },
                    { label: 'Puntos entregados', value: fmt(kpis.puntos30), hint: 'Últimos 30 días' },
                    { label: 'Premios canjeados', value: fmt(kpis.canjes30), hint: 'Últimos 30 días' },
                ].map((k) => (
                    <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-4">
                        <p className="text-sm text-slate-500">{k.label}</p>
                        <p className="text-3xl font-bold text-slate-900 tabular-nums mt-1">{k.value}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{k.hint}</p>
                    </div>
                ))}
            </section>

            {/* 3. A punto de ganar */}
            <section className="bg-white rounded-2xl border border-slate-200">
                <div className="px-4 sm:px-5 pt-4 pb-3">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Sparkles className="w-5 h-5" style={{ color: brand }} /> A punto de ganar un premio</h2>
                    <p className="text-sm text-slate-500">Un mensaje a tiempo los trae de vuelta. Escríbeles con un toque.</p>
                </div>
                {data.premios === 0 ? (
                    <p className="px-5 pb-5 text-sm text-slate-500">Crea premios con puntos para ver aquí a los clientes que están cerca de ganarlos.</p>
                ) : data.cerca.length === 0 ? (
                    <p className="px-5 pb-5 text-sm text-slate-500 flex items-center gap-2"><Users className="w-4 h-4" /> Todavía nadie está cerca de un premio. A medida que tus clientes sumen puntos aparecerán aquí.</p>
                ) : (
                    <ul className="border-t border-slate-100 divide-y divide-slate-100">
                        {data.cerca.map((c) => {
                            const quien = c.nombre || c.telefono || 'Cliente';
                            const texto = c.puedeCanjear
                                ? `Hola${c.nombre ? ` ${c.nombre.split(' ')[0]}` : ''}, tienes ${fmt(c.puntos)} puntos en ${data.negocio} y ya te alcanza para "${c.puedeCanjear}". ¡Te esperamos para canjearlo!`
                                : `Hola${c.nombre ? ` ${c.nombre.split(' ')[0]}` : ''}, te faltan solo ${fmt(c.falta || 0)} puntos para "${c.siguiente}" en ${data.negocio}. ¡En tu próxima visita lo ganas!`;
                            const wa = waLink(c.telefono, texto);
                            return (
                                <li key={c.userId} className="px-4 sm:px-5 py-3.5 flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0" style={{ backgroundColor: c.nivelColor || brand }}>
                                        {quien.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/g, '').slice(0, 1).toUpperCase() || '·'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-900 truncate">
                                            {quien}
                                            {c.nivel && <span className="ml-2 text-xs font-medium text-slate-500">{c.nivel}</span>}
                                        </p>
                                        {c.puedeCanjear ? (
                                            <p className="text-sm text-emerald-700 flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Ya puede canjear {c.puedeCanjear} · {fmt(c.puntos)} pts</p>
                                        ) : (
                                            <>
                                                <p className="text-sm text-slate-500">Le faltan {fmt(c.falta || 0)} pts para {c.siguiente}</p>
                                                <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-xs">
                                                    <div className="h-full rounded-full" style={{ width: `${c.pctSiguiente}%`, backgroundColor: brand }} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {wa ? (
                                        <a href={wa} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-[#25D366] text-white">
                                            <MessageCircle className="w-4 h-4" /> <span className="max-sm:hidden">Escribirle</span>
                                        </a>
                                    ) : (
                                        <span className="text-xs text-slate-400">Sin teléfono</span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <p className="text-xs text-slate-400 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Las entregas quedan registradas con tu usuario y la hora.</p>
        </div>
    );
}
