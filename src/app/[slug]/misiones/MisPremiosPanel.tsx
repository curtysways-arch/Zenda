'use client';

/**
 * "Mis premios" del cliente: todo lo que ya ganó y cómo usarlo.
 *
 * Un solo botón por premio. Los premios que entrega el local ("Usar en el local") se solicitan
 * y muestran el QR en el mismo paso; antes había que pedir el retiro y luego buscar el código.
 */

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, ChevronDown, Clock, Copy, Gift, Loader2, PackageCheck, QrCode, RefreshCw, Sparkles, Ticket, Wallet, X } from 'lucide-react';

const GOLD = '#F2B33D';
const INK = '#1E1B2E';

type Item = {
    id: string;
    tipoOrigen: 'CUPON' | 'PUNTOS' | 'REFERIDO';
    rewardType?: string;
    nombre: string;
    descripcion?: string;
    codigo?: string;
    descuento?: number;
    tipoDescuento?: string;
    claimCode?: string;
    claimToken?: string;
    claimSignature?: string;
    claimTokenExpiresAt?: string;
    fechaExpiracion?: string;
    fechaAsignacion?: string;
    fechaEntrega?: string;
    estado: string;
    isManual?: boolean;
    questId?: string | null;
    recompensaImagenUrl?: string | null;
};

export type MineData = { disponibles: Item[]; pendientesEntrega: Item[]; entregados: Item[]; vencidos: Item[] };

const fecha = (d?: string) => (d ? new Date(d).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }) : '');
const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const expired = (d?: string) => !!d && new Date(d).getTime() < Date.now();

function kind(p: Item): 'cupon' | 'servicio' | 'local' {
    if (p.tipoOrigen === 'CUPON' || p.rewardType === 'CUPON') return 'cupon';
    if (!p.isManual && (p.rewardType === 'SERVICIO_GRATIS' || p.rewardType === 'SERVICIO')) return 'servicio';
    return 'local';
}

export default function MisPremiosPanel({
    slug, brand, mine, history, cashback, focusQuestId, onChanged, onGoPremios,
}: {
    slug: string;
    brand: string;
    mine: MineData | null;
    history: any[] | null;
    cashback: number;
    focusQuestId?: string | null;
    onChanged: () => Promise<MineData | null>;
    onGoPremios: () => void;
}) {
    const [qr, setQr] = useState<Item | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [showUsed, setShowUsed] = useState(false);

    // Si llegó desde un aviso (?questId=…), resaltar ese premio
    useEffect(() => {
        if (!focusQuestId || !mine) return;
        const hit = [...mine.pendientesEntrega, ...mine.disponibles].find((p) => p.questId === focusQuestId);
        if (hit) setTimeout(() => document.getElementById(`premio-${hit.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }, [focusQuestId, mine]);

    if (!mine) {
        return <div className="py-10 flex justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
    }

    const listos = [...mine.pendientesEntrega, ...mine.disponibles].sort((a, b) => {
        const rank = (p: Item) => (p.estado === 'LISTO_PARA_RETIRAR' ? 0 : p.estado === 'SOLICITADO' ? 1 : 2);
        return rank(a) - rank(b);
    });
    const usados = mine.entregados || [];
    const vencidos = mine.vencidos || [];

    const copy = (code: string) => {
        navigator.clipboard?.writeText(code).catch(() => {});
        setCopied(code);
        setTimeout(() => setCopied(null), 1600);
    };

    /** Usar en el local: si aún no se pidió, se pide; si el código venció, se renueva. Luego se muestra el QR. */
    const useAtStore = async (p: Item) => {
        setErr(null);
        if ((p.estado === 'SOLICITADO' || p.estado === 'LISTO_PARA_RETIRAR') && p.claimToken && !expired(p.claimTokenExpiresAt)) {
            setQr(p);
            return;
        }
        setBusy(p.id);
        try {
            const renew = p.estado === 'SOLICITADO' || p.estado === 'LISTO_PARA_RETIRAR';
            const r = await fetch(`/api/public/${slug}/loyalty/${renew ? 'regenerar' : 'solicitar'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ redemptionId: p.id, tipoOrigen: p.tipoOrigen }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) {
                setErr(d.error || 'No pudimos preparar tu código. Intenta otra vez.');
                return;
            }
            const fresh = await onChanged();
            const hit = fresh ? [...fresh.pendientesEntrega, ...fresh.disponibles].find((x) => x.id === p.id && x.tipoOrigen === p.tipoOrigen) : null;
            setQr(hit || { ...p, estado: renew ? p.estado : 'SOLICITADO' });
        } catch {
            setErr('Sin conexión. Revisa tu internet e intenta otra vez.');
        } finally {
            setBusy(null);
        }
    };

    const qrUrl = qr?.claimToken && typeof window !== 'undefined'
        ? `${window.location.origin}/reward/${qr.claimToken}?sig=${qr.claimSignature || ''}`
        : null;

    return (
        <div className="space-y-5">
            {cashback > 0 && (
                <section className="rounded-2xl p-4 flex items-center gap-3 text-white" style={{ backgroundColor: INK }}>
                    <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: GOLD, color: INK }}>
                        <Wallet className="w-5 h-5" />
                    </span>
                    <div className="flex-1">
                        <p className="text-2xl font-extrabold tabular-nums leading-none">{money(cashback)}</p>
                        <p className="text-sm text-white/70 mt-1">Saldo a favor. Se descuenta cuando pagas en el local.</p>
                    </div>
                </section>
            )}

            {err && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{err}</p>}

            <section>
                <h2 className="text-sm font-semibold text-slate-500 mb-2">Listos para usar</h2>
                {listos.length === 0 ? (
                    <div className="text-center py-8 px-6 bg-white rounded-2xl ring-1 ring-slate-200">
                        <span className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center"><Ticket className="w-6 h-6" /></span>
                        <p className="mt-3 font-semibold">Aún no tienes premios</p>
                        <p className="mt-1 text-sm text-slate-500">Canjea tus puntos o completa misiones para ganar el primero.</p>
                        <button onClick={onGoPremios} className="mt-4 px-5 py-2.5 rounded-xl text-white font-semibold" style={{ backgroundColor: brand }}>Ver premios</button>
                    </div>
                ) : (
                    <ul className="space-y-2.5">
                        {listos.map((p) => {
                            const k = kind(p);
                            const code = p.codigo || p.claimCode;
                            const listo = p.estado === 'LISTO_PARA_RETIRAR';
                            const preparando = p.estado === 'SOLICITADO';
                            const codigoVencido = (preparando || listo) && expired(p.claimTokenExpiresAt);
                            const vence = p.fechaExpiracion;
                            const focused = focusQuestId && p.questId === focusQuestId;
                            return (
                                <li
                                    key={`${p.tipoOrigen}-${p.id}`}
                                    id={`premio-${p.id}`}
                                    className={`bg-white rounded-2xl overflow-hidden flex ${listo || focused ? 'ring-2' : 'ring-1 ring-slate-200'}`}
                                    style={listo || focused ? { ['--tw-ring-color' as any]: listo ? '#10b981' : brand } : undefined}
                                >
                                    {/* Talón del ticket */}
                                    <div className="w-[76px] shrink-0 flex flex-col items-center justify-center text-center px-1 border-r-2 border-dashed border-slate-200" style={{ backgroundColor: k === 'cupon' ? `color-mix(in srgb, ${brand} 12%, white)` : '#FEF6E4' }}>
                                        {k === 'cupon' && p.descuento ? (
                                            <>
                                                <span className="text-xl font-extrabold leading-none" style={{ color: brand }}>
                                                    {p.tipoDescuento === 'PORCENTAJE' ? `${p.descuento}%` : money(p.descuento)}
                                                </span>
                                                <span className="text-xs text-slate-500 mt-1">menos</span>
                                            </>
                                        ) : p.recompensaImagenUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={p.recompensaImagenUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                                        ) : (
                                            <Gift className="w-7 h-7" style={{ color: '#B7791F' }} />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 p-3.5">
                                        <p className="font-semibold leading-snug">{p.nombre}</p>
                                        <p className="text-sm text-slate-500 mt-0.5">
                                            {k === 'cupon' && 'Escribe el código al reservar o dáselo al pagar.'}
                                            {k === 'servicio' && 'Se aplica cuando reservas ese servicio.'}
                                            {k === 'local' && (listo
                                                ? 'Ya está listo. Pásalo a retirar.'
                                                : preparando
                                                    ? (codigoVencido ? 'Tu código venció. Renuévalo para retirarlo.' : 'El local lo está preparando.')
                                                    : 'Muestra el código en el local para recibirlo.')}
                                            {vence && <> Vence {fecha(vence)}.</>}
                                        </p>

                                        {listo && (
                                            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                                                <PackageCheck className="w-4 h-4" /> Listo para retirar
                                            </p>
                                        )}

                                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                            {k !== 'local' && code && (
                                                <button onClick={() => copy(code)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-sm font-mono tracking-wide">
                                                    {code} {copied === code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                                </button>
                                            )}
                                            {k === 'local' && (
                                                <button
                                                    onClick={() => useAtStore(p)}
                                                    disabled={busy === p.id}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                                                    style={{ backgroundColor: listo ? '#059669' : brand }}
                                                >
                                                    {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : codigoVencido ? <RefreshCw className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                                                    {codigoVencido ? 'Renovar código' : preparando || listo ? 'Mostrar código' : 'Usar en el local'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {(usados.length > 0 || vencidos.length > 0) && (
                <section>
                    <button onClick={() => setShowUsed((v) => !v)} className="w-full flex items-center justify-between py-1 text-sm font-semibold text-slate-500">
                        <span>Usados y vencidos ({usados.length + vencidos.length})</span>
                        <ChevronDown className={`w-4 h-4 transition ${showUsed ? 'rotate-180' : ''}`} />
                    </button>
                    {showUsed && (
                        <ul className="mt-2 bg-white rounded-2xl ring-1 ring-slate-200 divide-y divide-slate-100">
                            {usados.map((p) => (
                                <li key={`u-${p.tipoOrigen}-${p.id}`} className="px-4 py-2.5 text-sm flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600" />
                                    <span className="flex-1 text-slate-700">{p.nombre}</span>
                                    <span className="text-xs text-slate-400">{fecha(p.fechaEntrega || p.fechaAsignacion)}</span>
                                </li>
                            ))}
                            {vencidos.map((p) => (
                                <li key={`v-${p.tipoOrigen}-${p.id}`} className="px-4 py-2.5 text-sm flex items-center gap-2 text-slate-400">
                                    <Clock className="w-4 h-4" />
                                    <span className="flex-1 line-through">{p.nombre}</span>
                                    <span className="text-xs">Venció</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            <section>
                <h2 className="text-sm font-semibold text-slate-500 mb-2">Movimientos de puntos</h2>
                {history === null ? (
                    <div className="py-6 flex justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
                ) : history.length === 0 ? (
                    <p className="text-sm text-slate-500 bg-white rounded-2xl ring-1 ring-slate-200 p-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 shrink-0" style={{ color: GOLD }} /> Todavía no tienes movimientos. Tu primera visita ya suma.
                    </p>
                ) : (
                    <ul className="bg-white rounded-2xl ring-1 ring-slate-200 divide-y divide-slate-100">
                        {history.slice(0, 20).map((h: any) => (
                            <li key={h.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{h.label}</p>
                                    <p className="text-xs text-slate-500 truncate">{fecha(h.fecha)}{h.notas ? ` · ${h.notas}` : ''}</p>
                                </div>
                                <span className={`font-bold tabular-nums ${h.puntos >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {h.puntos >= 0 ? '+' : ''}{Math.round(h.puntos).toLocaleString('es-EC')}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Hoja con el código QR */}
            {qr && (
                <div className="fixed inset-0 z-[10000] bg-black/55 flex items-end sm:items-center justify-center" onClick={() => setQr(null)}>
                    <div role="dialog" aria-modal="true" className="relative w-full sm:max-w-sm bg-white rounded-t-[28px] sm:rounded-[28px] p-6 pb-9 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setQr(null)} aria-label="Cerrar" className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                            <X className="w-4 h-4" />
                        </button>
                        <p className="text-sm text-slate-500">Muestra esto en el local</p>
                        <h3 className="text-lg font-bold mt-0.5 px-6">{qr.nombre}</h3>
                        <div className="mt-4 mx-auto w-fit p-4 rounded-3xl" style={{ backgroundColor: '#FEF6E4' }}>
                            {qrUrl ? (
                                <div className="bg-white p-3 rounded-2xl">
                                    <QRCodeSVG value={qrUrl} size={200} fgColor={INK} level="H" />
                                </div>
                            ) : (
                                <div className="w-[224px] h-[224px] flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
                            )}
                        </div>
                        {qr.claimCode && (
                            <p className="mt-4 text-2xl font-extrabold font-mono tracking-[0.12em]">{qr.claimCode}</p>
                        )}
                        <p className="mt-1 text-sm text-slate-500">
                            Si no pueden escanear, dicta el código.
                            {qr.claimTokenExpiresAt && <> Válido hasta el {fecha(qr.claimTokenExpiresAt)}.</>}
                        </p>
                        <button onClick={() => setQr(null)} className="mt-5 w-full py-3.5 rounded-2xl font-semibold bg-slate-100 text-slate-700">Listo</button>
                    </div>
                </div>
            )}
        </div>
    );
}
