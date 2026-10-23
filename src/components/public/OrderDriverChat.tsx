'use client';
/**
 * Chat del cliente con su repartidor (dentro de la página del pedido), en vivo.
 * Aparece solo mientras hay un repartidor asignado.
 */
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';

type Msg = { id: string; de: 'REPARTIDOR' | 'CLIENTE' | 'SISTEMA'; texto: string; at: string };

const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

export default function OrderDriverChat({ slug, orderId, color = '#0066FF', inline = false, onEstado }: { slug: string; orderId: string; color?: string; inline?: boolean; onEstado?: () => void }) {
    const [abierto, setAbierto] = useState(false);
    const [activo, setActivo] = useState(false);
    const [mensajes, setMensajes] = useState<Msg[]>([]);
    const [nombre, setNombre] = useState('Tu repartidor');
    const [nuevos, setNuevos] = useState(0);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fin = useRef<HTMLDivElement>(null);
    const url = `/api/public/${slug}/orders/${orderId}/chat`;

    const cargar = async (leer = false) => {
        try {
            const r = await fetch(`${url}${leer ? '?leer=1' : ''}`, { cache: 'no-store' });
            if (!r.ok) return;
            const d = await r.json();
            setActivo(Boolean(d.activo));
            setMensajes(d.mensajes || []);
            setNuevos(leer ? 0 : d.sinLeer || 0);
            if (d.repartidor?.nombre) setNombre(d.repartidor.nombre);
        } catch { /* sin conexión: se reintenta */ }
    };

    // En vivo: el servidor avisa al instante cuando hay un mensaje; la consulta periódica queda de respaldo
    const abiertoRef = useRef(abierto);
    abiertoRef.current = abierto;
    const onEstadoRef = useRef(onEstado);
    onEstadoRef.current = onEstado;
    useEffect(() => {
        let es: EventSource | null = null;
        try {
            es = new EventSource(`${url}/stream`);
            es.addEventListener('chat', (ev: MessageEvent) => {
                cargar(abiertoRef.current);
                try { if (JSON.parse(ev.data || '{}').tipo === 'estado') onEstadoRef.current?.(); } catch { /* */ }
            });
        } catch { es = null; }
        return () => { try { es?.close(); } catch { /* */ } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);
    useEffect(() => {
        cargar(abierto);
        const t = setInterval(() => { if (document.visibilityState === 'visible') cargar(abierto); }, abierto ? 15000 : 30000);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abierto, orderId]);

    useEffect(() => { if (abierto) fin.current?.scrollIntoView({ block: 'end' }); }, [abierto, mensajes.length]);

    useEffect(() => {
        if (!abierto) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
        window.addEventListener('keydown', k);
        return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', k); };
    }, [abierto]);

    const enviar = async () => {
        const t = texto.trim();
        if (!t || enviando) return;
        setEnviando(true); setError(null);
        try {
            const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: t }) });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.error || 'No se pudo enviar.');
            setTexto('');
            setMensajes(d.mensajes || []);
        } catch (e: any) { setError(e.message); } finally { setEnviando(false); }
    };

    if (!activo) return null;
    const primerNombre = nombre.split(' ')[0];

    return (
        <>
            {inline ? (
                <button type="button" onClick={() => setAbierto(true)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 active:bg-slate-50">
                    <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: color }}>
                        <MessageCircle className="size-5" />
                        {nuevos > 0 && <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">{nuevos}</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900">Escribir a {primerNombre}</span>
                        <span className="block truncate text-sm text-slate-500">{nuevos > 0 ? `${nuevos} ${nuevos === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}` : 'Tu repartidor · chat dentro de la app'}</span>
                    </span>
                </button>
            ) : (
                <button type="button" onClick={() => setAbierto(true)} aria-label={`Escribir a ${primerNombre}`}
                    className="fixed bottom-5 right-4 z-[90] flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-xl" style={{ background: color }}>
                    <MessageCircle className="size-5" /> Escribir a {primerNombre}
                    {nuevos > 0 && <span className="flex min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-slate-900">{nuevos}</span>}
                </button>
            )}

            {abierto && (
                <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Chat con ${nombre}`}>
                    <button type="button" aria-label="Cerrar" onClick={() => setAbierto(false)} className="absolute inset-0 bg-slate-900/50" />
                    <div className="relative flex h-[85dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[640px] sm:max-w-md sm:rounded-3xl">
                        <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                            <span className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: color }}>{primerNombre.charAt(0).toUpperCase()}</span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-slate-900">{nombre}</p>
                                <p className="text-xs text-slate-500">Tu repartidor · solo durante este pedido</p>
                            </div>
                            <button type="button" onClick={() => setAbierto(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X className="size-5" /></button>
                        </header>
                        <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-4">
                            {mensajes.length === 0 && (
                                <p className="mx-auto max-w-[30ch] py-10 text-center text-sm text-slate-500">Escríbele si necesitas darle una indicación, por ejemplo cómo llegar o a quién dejarle el pedido.</p>
                            )}
                            {mensajes.map((m) => m.de === 'SISTEMA' ? (
                                <p key={m.id} className="py-1 text-center text-xs text-slate-500">{m.texto} · {hora(m.at)}</p>
                            ) : (
                                <div key={m.id} className={`flex ${m.de === 'CLIENTE' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[15px] leading-snug ${m.de === 'CLIENTE' ? 'rounded-br-md text-white' : 'rounded-bl-md bg-white text-slate-900 ring-1 ring-slate-200'}`}
                                        style={m.de === 'CLIENTE' ? { background: color } : undefined}>
                                        <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                                        <p className={`mt-0.5 text-right text-[11px] ${m.de === 'CLIENTE' ? 'text-white/75' : 'text-slate-400'}`}>{hora(m.at)}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={fin} />
                        </div>
                        {error && <p className="bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
                        <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="flex items-end gap-2 border-t border-slate-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                            <textarea value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 500))} rows={1} placeholder="Escribe un mensaje"
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                                className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl bg-slate-100 px-4 py-2.5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" />
                            <button type="submit" disabled={!texto.trim() || enviando} aria-label="Enviar"
                                className="flex size-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40" style={{ background: color }}>
                                {enviando ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
