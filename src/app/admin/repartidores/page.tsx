'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Truck, UserPlus, Loader2, Search, X, Check, ShieldCheck, Clock, PauseCircle, AlertTriangle, Phone,
    MessageCircle, Copy, RefreshCw, Bike, Car, Footprints, Sparkles, MapPin, Package, ChevronRight, FileText, ExternalLink, Ban,
} from 'lucide-react';
import { useConfirm } from '@/components/admin/ConfirmContext';

type Group = 'POR_REVISAR' | 'ACTIVO' | 'INVITADO' | 'PAUSADO' | 'RECHAZADO' | 'BLOQUEADO';

interface Driver {
    id: string; nombre: string; avatar: string | null; telefono: string; grupo: Group; estadoOperativo: string; origen: string; esperandoAceptacion?: boolean;
    vehiculo: { tipo: string; marca?: string; modelo?: string; color?: string; placa?: string; anio?: string };
    datos: Record<string, string | null>;
    documentos: Record<string, string | null>;
    motivoRechazo: string | null;
    invitacion: { estado: string; vence: string; vencida: boolean; url: string } | null;
    entregas: number; enCurso: number; actualizado: string;
}
interface Candidate { candidateId: string; nombre: string; avatar: string | null; vehiculo: string; ciudades: string[]; mismaCiudad: boolean; negocios: number; entregas: number; desde: string }

const TABS: { id: Group | 'EQUIPO'; label: string; groups: Group[] }[] = [
    { id: 'POR_REVISAR', label: 'Por revisar', groups: ['POR_REVISAR'] },
    { id: 'EQUIPO', label: 'Mi equipo', groups: ['ACTIVO', 'PAUSADO'] },
    { id: 'INVITADO', label: 'Invitados', groups: ['INVITADO', 'RECHAZADO'] },
    { id: 'BLOQUEADO', label: 'Bloqueados', groups: ['BLOQUEADO'] },
];

const VEHICLES: Record<string, { label: string; icon: React.ElementType }> = {
    MOTO: { label: 'Moto', icon: Bike }, AUTO: { label: 'Auto', icon: Car }, CAMION: { label: 'Camioneta', icon: Truck },
    BICICLETA: { label: 'Bicicleta', icon: Bike }, A_PIE: { label: 'A pie', icon: Footprints },
};

const DOCS: { key: string; label: string }[] = [
    { key: 'selfieUrl', label: 'Foto de perfil' },
    { key: 'cedulaFrenteUrl', label: 'Cédula (frente)' },
    { key: 'cedulaReversoUrl', label: 'Cédula (reverso)' },
    { key: 'licenciaUrl', label: 'Licencia' },
    { key: 'matriculaUrl', label: 'Matrícula' },
    { key: 'fotoVehiculoUrl', label: 'Vehículo' },
];

function daysLeft(d: string) {
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function RepartidoresPage() {
    const { confirm } = useConfirm();
    const [loading, setLoading] = useState(true);
    const [team, setTeam] = useState<Driver[]>([]);
    const [recs, setRecs] = useState<Candidate[]>([]);
    const [tab, setTab] = useState<Group | 'EQUIPO'>('EQUIPO');
    const [query, setQuery] = useState('');
    const [review, setReview] = useState<Driver | null>(null);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [result, setResult] = useState<{ title: string; text: string; whatsappUrl?: string | null; inviteUrl?: string } | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
    const [locked, setLocked] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/repartidores', { cache: 'no-store' });
            const d = await res.json();
            if (res.ok) { setTeam(d.equipo || []); setRecs(d.recomendados || []); }
            else if (d.code === 'DELIVERY_NOT_ENABLED') setLocked(true);
        } catch { /* sin conexión */ }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const counts = useMemo(() => {
        const c: Record<string, number> = {};
        for (const t of TABS) c[t.id] = team.filter((d) => t.groups.includes(d.grupo)).length;
        return c;
    }, [team]);

    // Al cargar, abrir "Por revisar" si hay pendientes
    useEffect(() => { if (!loading && counts.POR_REVISAR > 0) setTab('POR_REVISAR'); }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

    const list = useMemo(() => {
        const groups = TABS.find((t) => t.id === tab)?.groups || [];
        const q = query.trim().toLowerCase();
        return team.filter((d) => groups.includes(d.grupo) && (!q || `${d.nombre} ${d.telefono} ${d.vehiculo.placa || ''}`.toLowerCase().includes(q)));
    }, [team, tab, query]);

    const activos = team.filter((d) => d.grupo === 'ACTIVO').length;

    const act = async (body: any, okText?: string) => {
        setBusy(body.resourceId || body.candidateId || 'x');
        try {
            const res = await fetch('/api/admin/repartidores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'No se pudo completar');
            if (okText) setToast({ ok: true, text: okText });
            await load();
            return d;
        } catch (e: any) {
            setToast({ ok: false, text: e.message });
            return null;
        } finally {
            setBusy(null);
        }
    };

    const approve = async (d: Driver) => {
        const r = await act({ action: 'approve', resourceId: d.id }, `${d.nombre} ya es parte de tu equipo.`);
        if (r) { setReview(null); setResult({ title: '¡Repartidor aprobado!', text: `Avísale a ${d.nombre.split(' ')[0]} que ya puede entrar a su app de repartidor.`, whatsappUrl: r.whatsappUrl }); }
    };
    const reject = async (d: Driver, motivo: string) => {
        const r = await act({ action: 'reject', resourceId: d.id, motivo }, 'Le pediste corregir sus datos.');
        if (r) { setReview(null); setResult({ title: 'Corrección solicitada', text: `Envíale el motivo y su enlace para que corrija. Su registro vuelve a "Por revisar" cuando lo reenvíe.`, whatsappUrl: r.whatsappUrl }); }
    };
    const resend = async (d: Driver) => {
        const r = await act({ action: 'resend', resourceId: d.id });
        if (r) setResult({ title: 'Enlace renovado', text: `El enlace vale ${7} días. Envíalo por WhatsApp a ${d.nombre.split(' ')[0]}.`, whatsappUrl: r.whatsappUrl, inviteUrl: r.inviteUrl });
    };
    const remove = async (d: Driver) => {
        const ok = await confirm(`${d.nombre} dejará de estar en tu equipo. Si trabaja con otros negocios, seguirá allí.`, { title: '¿Quitar repartidor?', confirmText: 'Quitar', type: 'danger' });
        if (ok) await act({ action: 'remove', resourceId: d.id }, 'Repartidor quitado de tu equipo.');
    };
    const inviteCandidate = async (c: Candidate) => {
        const r = await act({ action: 'invite_recommended', candidateId: c.candidateId });
        if (r) setResult({ title: `Invitaste a ${r.nombre}`, text: 'Envíale la invitación por WhatsApp. Como ya está verificado en Citiox, solo tiene que aceptar: sus documentos aparecerán en "Por revisar" para que lo apruebes.', whatsappUrl: r.whatsappUrl, inviteUrl: r.inviteUrl });
    };

    if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-slate-400" size={26} /></div>;

    if (locked) {
        return (
            <div className="max-w-xl mx-auto py-10">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
                    <span className="mx-auto size-12 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Truck size={22} /></span>
                    <h1 className="mt-4 text-lg font-bold text-slate-900">Vende productos y envíalos a domicilio</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Tu tipo de negocio no incluye ventas online. Con el add-on <b>Venta de productos</b> tus clientes pueden comprar desde tu página
                        y elegir retiro en el local o envío a domicilio con tus propios repartidores.
                    </p>
                    <ul className="mt-4 text-left text-sm text-slate-600 space-y-1.5">
                        <li className="flex gap-2"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Tienda en tu página con carrito y pedidos</li>
                        <li className="flex gap-2"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Invita repartidores o recibe recomendados de la red Citiox</li>
                        <li className="flex gap-2"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Seguimiento de cada entrega y cobro en efectivo</li>
                    </ul>
                    <Link href="/admin/plan#addons" className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold">
                        Ver add-ons <ChevronRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl space-y-4 pb-16">
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                        <span className="size-8 rounded-lg bg-slate-900 text-white flex items-center justify-center"><Truck size={17} /></span>
                        Repartidores
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">{activos} activos en tu equipo · {counts.POR_REVISAR} por revisar · {counts.INVITADO} invitados</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/logistica" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        <Package size={15} /> Asignar entregas
                    </Link>
                    <button type="button" onClick={() => setInviteOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold">
                        <UserPlus size={15} /> Invitar repartidor
                    </button>
                </div>
            </div>

            {toast && (
                <div className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 border ${toast.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    {toast.ok ? <Check size={15} /> : <AlertTriangle size={15} />}
                    <span className="flex-1">{toast.text}</span>
                    <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100"><X size={14} /></button>
                </div>
            )}

            {/* Cómo funciona (solo si aún no tiene equipo) */}
            {team.length === 0 && (
                <section className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-900">Arma tu equipo de repartidores en 3 pasos</p>
                    <ol className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
                        {[
                            { n: 1, t: 'Invítalo', d: 'Escribe su celular y envíale el enlace por WhatsApp.' },
                            { n: 2, t: 'Se registra', d: 'Sube su cédula, licencia y fotos desde su celular.' },
                            { n: 3, t: 'Lo apruebas', d: 'Revisas sus documentos y ya puede recibir entregas.' },
                        ].map((s) => (
                            <li key={s.n} className="flex gap-2.5">
                                <span className="size-6 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">{s.n}</span>
                                <span><span className="block font-medium text-slate-900">{s.t}</span><span className="block text-slate-500 text-xs">{s.d}</span></span>
                            </li>
                        ))}
                    </ol>
                    <p className="text-xs text-slate-500 mt-3">Si el repartidor ya trabaja con otro negocio en Citiox, no vuelve a subir nada: solo revisas sus documentos.</p>
                </section>
            )}

            <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
                {/* Lista */}
                <section className="bg-white border border-slate-200 rounded-xl">
                    <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
                            {TABS.filter((t) => t.id !== 'BLOQUEADO' || counts.BLOQUEADO > 0).map((t) => {
                                const active = tab === t.id;
                                const urgent = t.id === 'POR_REVISAR' && counts.POR_REVISAR > 0;
                                return (
                                    <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                                        {t.label}
                                        <span className={`text-xs px-1.5 rounded-full ${urgent && !active ? 'bg-amber-500 text-white' : active ? 'text-white/70' : 'text-slate-400'}`}>{counts[t.id]}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <label className="relative sm:w-56">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nombre, celular o placa" className="w-full !pl-8 !pr-2 !py-1.5 !text-sm !rounded-lg !border !border-slate-200 !bg-white" />
                        </label>
                    </div>

                    {list.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <Truck className="mx-auto text-slate-300" size={26} />
                            <p className="text-sm text-slate-600 mt-2">
                                {tab === 'POR_REVISAR' ? 'No tienes registros por revisar.' : tab === 'EQUIPO' ? 'Aún no tienes repartidores aprobados.' : tab === 'INVITADO' ? 'No hay invitaciones pendientes.' : 'Nadie aquí.'}
                            </p>
                            {tab !== 'POR_REVISAR' && (
                                <button type="button" onClick={() => setInviteOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:underline"><UserPlus size={14} /> Invitar repartidor</button>
                            )}
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {list.map((d) => (
                                <DriverRow
                                    key={d.id}
                                    d={d}
                                    busy={busy === d.id}
                                    onReview={() => setReview(d)}
                                    onPause={() => act({ action: 'pause', resourceId: d.id }, `${d.nombre} quedó en pausa: no recibirá entregas.`)}
                                    onResume={() => act({ action: 'resume', resourceId: d.id }, `${d.nombre} vuelve a recibir entregas.`)}
                                    onResend={() => resend(d)}
                                    onRemove={() => remove(d)}
                                />
                            ))}
                        </ul>
                    )}
                </section>

                {/* Recomendados */}
                <aside className="bg-white border border-slate-200 rounded-xl">
                    <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><Sparkles size={15} className="text-amber-500" /> Recomendados por Citiox</p>
                        <p className="text-xs text-slate-500 mt-0.5">Repartidores ya verificados en otros negocios. No suben documentos de nuevo.</p>
                    </div>
                    {recs.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-slate-500 text-center">Por ahora no hay repartidores disponibles en la red.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
                            {recs.map((c) => {
                                const V = VEHICLES[c.vehiculo] || VEHICLES.MOTO;
                                return (
                                    <li key={c.candidateId} className="px-4 py-3 flex items-center gap-3">
                                        <Avatar src={c.avatar} name={c.nombre} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1">{c.nombre} <ShieldCheck size={13} className="text-emerald-600 shrink-0" /></p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate"><V.icon size={12} /> {V.label}{c.ciudades[0] ? ` · ${c.ciudades[0]}` : ''}</p>
                                            <p className="text-xs text-slate-400">{c.entregas} entregas · {c.negocios} {c.negocios === 1 ? 'negocio' : 'negocios'}</p>
                                        </div>
                                        <button type="button" onClick={() => inviteCandidate(c)} disabled={busy === c.candidateId} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
                                            {busy === c.candidateId ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />} Invitar
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </aside>
            </div>

            {inviteOpen && (
                <InviteModal
                    onClose={() => setInviteOpen(false)}
                    onDone={async (r) => {
                        setInviteOpen(false);
                        await load();
                        setTab('INVITADO');
                        setResult({
                            title: r.kind === 'JOIN' ? `${r.nombre} ya está verificado en Citiox` : `Invitación lista para ${r.nombre}`,
                            text: r.kind === 'JOIN'
                                ? 'Envíale la invitación por WhatsApp. Solo tiene que aceptar (no sube documentos otra vez) y aparecerá en "Por revisar" para que lo apruebes.'
                                : 'Envíale el enlace por WhatsApp. Cuando suba sus documentos aparecerá en "Por revisar".',
                            whatsappUrl: r.whatsappUrl,
                            inviteUrl: r.inviteUrl,
                        });
                    }}
                />
            )}

            {review && <ReviewDrawer d={review} busy={busy === review.id} onClose={() => setReview(null)} onApprove={() => approve(review)} onReject={(m) => reject(review, m)} />}

            {result && <ResultModal r={result} onClose={() => setResult(null)} />}
        </div>
    );
}

// ── Fila ───────────────────────────────────────────────────────────────
function DriverRow({ d, busy, onReview, onPause, onResume, onResend, onRemove }: { d: Driver; busy: boolean; onReview: () => void; onPause: () => void; onResume: () => void; onResend: () => void; onRemove: () => void }) {
    const V = VEHICLES[d.vehiculo.tipo] || VEHICLES.MOTO;
    const wa = d.telefono ? `https://wa.me/${d.telefono.replace(/\D/g, '').replace(/^0/, '593')}` : null;
    const btn = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold';

    let status: React.ReactNode = null;
    if (d.grupo === 'ACTIVO') status = <Badge tone="green">{d.enCurso > 0 ? `${d.enCurso} en curso` : 'Activo'}</Badge>;
    if (d.grupo === 'PAUSADO') status = <Badge tone="slate"><PauseCircle size={11} /> En pausa</Badge>;
    if (d.grupo === 'POR_REVISAR') status = <Badge tone="amber"><Clock size={11} /> Por revisar</Badge>;
    if (d.grupo === 'INVITADO') status = d.invitacion?.vencida ? <Badge tone="rose">Enlace vencido</Badge> : <Badge tone="sky">{d.esperandoAceptacion ? 'Esperando que acepte' : 'Esperando registro'} · {Math.max(0, daysLeft(d.invitacion?.vence || ''))} d</Badge>;
    if (d.grupo === 'RECHAZADO') status = <Badge tone="rose">Debe corregir</Badge>;
    if (d.grupo === 'BLOQUEADO') status = <Badge tone="rose"><Ban size={11} /> Bloqueado por Citiox</Badge>;

    return (
        <li className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar src={d.avatar} name={d.nombre} />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1.5">
                        {d.nombre}
                        {d.origen === 'RED_CITIOX' && <span title="Verificado en otro negocio de Citiox"><ShieldCheck size={13} className="text-emerald-600" /></span>}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1"><Phone size={11} />{d.telefono || '—'}</span>
                        <span className="inline-flex items-center gap-1"><V.icon size={11} />{V.label}{d.vehiculo.placa ? ` · ${d.vehiculo.placa}` : ''}</span>
                        {d.grupo === 'ACTIVO' || d.grupo === 'PAUSADO' ? <span>{d.entregas} entregas</span> : null}
                    </p>
                    {d.grupo === 'RECHAZADO' && d.motivoRechazo && <p className="text-xs text-rose-700 mt-0.5 truncate">Motivo: {d.motivoRechazo}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap md:justify-end">
                {status}
                {busy && <Loader2 size={14} className="animate-spin text-slate-400" />}
                {d.grupo === 'POR_REVISAR' && <button type="button" onClick={onReview} className={`${btn} bg-slate-900 text-white hover:bg-slate-800`}>Revisar documentos <ChevronRight size={13} /></button>}
                {d.grupo === 'ACTIVO' && <button type="button" onClick={onPause} className={`${btn} border border-slate-200 text-slate-700 hover:bg-slate-50`}><PauseCircle size={13} /> Pausar</button>}
                {d.grupo === 'PAUSADO' && <button type="button" onClick={onResume} className={`${btn} bg-slate-900 text-white hover:bg-slate-800`}>Reactivar</button>}
                {(d.grupo === 'INVITADO' || d.grupo === 'RECHAZADO') && <button type="button" onClick={onResend} className={`${btn} border border-slate-200 text-slate-700 hover:bg-slate-50`}><RefreshCw size={13} /> Reenviar enlace</button>}
                {(d.grupo === 'ACTIVO' || d.grupo === 'PAUSADO') && <button type="button" onClick={onReview} className={`${btn} border border-slate-200 text-slate-700 hover:bg-slate-50`}><FileText size={13} /> Ficha</button>}
                {wa && d.grupo !== 'BLOQUEADO' && <a href={wa} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50" title="Escribir por WhatsApp" aria-label="WhatsApp"><MessageCircle size={16} /></a>}
                <button type="button" onClick={onRemove} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Quitar del equipo" aria-label="Quitar del equipo"><X size={16} /></button>
            </div>
        </li>
    );
}

// ── Invitar ────────────────────────────────────────────────────────────
function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: (r: any) => void }) {
    const [telefono, setTelefono] = useState('');
    const [nombre, setNombre] = useState('');
    const [vehiculo, setVehiculo] = useState('MOTO');
    const [info, setInfo] = useState<any>(null);
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const digits = telefono.replace(/\D/g, '');
    useEffect(() => {
        setInfo(null);
        if (digits.length < 9) return;
        setChecking(true);
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/admin/repartidores?telefono=${encodeURIComponent(telefono)}`);
                const d = await res.json();
                setInfo(d);
                if (d.verificado && d.nombre) setNombre(d.nombre);
            } catch { /* ignore */ }
            finally { setChecking(false); }
        }, 350);
        return () => clearTimeout(t);
    }, [telefono]); // eslint-disable-line react-hooks/exhaustive-deps

    const enEquipo = info?.enMiEquipo;
    const submit = async () => {
        setError(null);
        if (digits.length < 9) return setError('Escribe un número de celular completo.');
        if (!info?.verificado && nombre.trim().length < 2) return setError('Escribe su nombre.');
        setSaving(true);
        try {
            const res = await fetch('/api/admin/repartidores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'invite', telefono, nombre, tipoVehiculo: vehiculo }) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            onDone(d);
        } catch (e: any) {
            setError(e.message || 'No se pudo invitar.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Invitar repartidor" onClose={onClose}>
            <div className="space-y-3">
                <label className="block">
                    <span className="text-sm font-medium text-slate-700">Celular del repartidor</span>
                    <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 0991234567" inputMode="tel" autoFocus className="mt-1 w-full !px-3 !py-2.5 !text-sm !rounded-lg !border !border-slate-200 !bg-white" />
                </label>

                {checking && <p className="text-xs text-slate-500 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Buscando en la red Citiox…</p>}
                {info?.existe && info.verificado && !enEquipo && !info.bloqueado && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900 flex gap-2">
                        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                        <span><strong>{info.nombre}</strong> ya está verificado en Citiox ({info.negocios} {info.negocios === 1 ? 'negocio' : 'negocios'}). Solo tiene que aceptar tu invitación, sin subir documentos otra vez; luego los revisas y lo apruebas.</span>
                    </div>
                )}
                {enEquipo && <p className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">Este número ya está en tu lista de repartidores.</p>}
                {info?.bloqueado && <p className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">Este repartidor está bloqueado en la red de Citiox.</p>}

                {!(info?.verificado) && (
                    <>
                        <label className="block">
                            <span className="text-sm font-medium text-slate-700">Nombre</span>
                            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan Pérez" className="mt-1 w-full !px-3 !py-2.5 !text-sm !rounded-lg !border !border-slate-200 !bg-white" />
                        </label>
                        <div>
                            <span className="text-sm font-medium text-slate-700">¿En qué reparte?</span>
                            <div className="mt-1 grid grid-cols-4 gap-1.5">
                                {['MOTO', 'AUTO', 'BICICLETA', 'A_PIE'].map((v) => {
                                    const V = VEHICLES[v];
                                    return (
                                        <button key={v} type="button" onClick={() => setVehiculo(v)} className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium ${vehiculo === v ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                                            <V.icon size={16} /> {V.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {error && <p className="text-sm text-rose-700">{error}</p>}

                <button type="button" onClick={submit} disabled={saving || Boolean(enEquipo) || Boolean(info?.bloqueado)} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-50">
                    {saving && <Loader2 size={15} className="animate-spin" />}
                    {info?.verificado ? 'Sumar a mi equipo' : 'Crear invitación'}
                </button>
                <p className="text-xs text-slate-500 text-center">Después podrás enviársela por WhatsApp con un toque.</p>
            </div>
        </Modal>
    );
}

// ── Revisión de documentos ─────────────────────────────────────────────
function ReviewDrawer({ d, busy, onClose, onApprove, onReject }: { d: Driver; busy: boolean; onClose: () => void; onApprove: () => void; onReject: (m: string) => void }) {
    const [rejecting, setRejecting] = useState(false);
    const [motivo, setMotivo] = useState('');
    const V = VEHICLES[d.vehiculo.tipo] || VEHICLES.MOTO;
    const reviewing = d.grupo === 'POR_REVISAR';
    const docs = DOCS.filter((x) => d.documentos[x.key]);
    const missing = DOCS.filter((x) => !d.documentos[x.key] && (x.key !== 'licenciaUrl' || ['MOTO', 'AUTO', 'CAMION'].includes(d.vehiculo.tipo)) && x.key !== 'matriculaUrl' && (x.key !== 'fotoVehiculoUrl' || d.vehiculo.tipo !== 'A_PIE'));
    const reasons = ['La foto de la cédula no se lee bien', 'Falta la licencia de conducir', 'La placa no coincide con el vehículo', 'La foto de perfil no muestra bien su cara'];

    return (
        <div className="fixed inset-0 z-[120] flex justify-end bg-slate-900/40" onClick={onClose}>
            <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
                    <Avatar src={d.avatar} name={d.nombre} size="lg" />
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">{d.nombre}</p>
                        <p className="text-xs text-slate-500">{d.telefono} · <V.icon size={11} className="inline -mt-0.5" /> {V.label}</p>
                        {d.origen === 'RED_CITIOX' && <p className="text-xs text-emerald-700 mt-0.5 flex items-center gap-1"><ShieldCheck size={12} /> Ya verificado en otro negocio de Citiox</p>}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <section>
                        <p className="text-sm font-semibold text-slate-900 mb-2">Documentos</p>
                        {docs.length === 0 ? <p className="text-sm text-slate-500">Aún no ha subido documentos.</p> : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {docs.map((x) => {
                                    const url = d.documentos[x.key]!;
                                    const isPdf = url.toLowerCase().endsWith('.pdf');
                                    return (
                                        <a key={x.key} href={url} target="_blank" rel="noopener noreferrer" className="group block rounded-lg border border-slate-200 overflow-hidden hover:border-slate-400">
                                            <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
                                                {isPdf ? <FileText size={24} className="text-slate-400" /> : <img src={url} alt={x.label} className="w-full h-full object-cover" />}
                                            </div>
                                            <p className="px-2 py-1.5 text-xs font-medium text-slate-700 flex items-center justify-between">{x.label}<ExternalLink size={11} className="text-slate-400 group-hover:text-slate-700" /></p>
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                        {reviewing && missing.length > 0 && (
                            <p className="mt-2 text-xs text-amber-700 flex items-center gap-1"><AlertTriangle size={12} /> Falta: {missing.map((m) => m.label).join(', ')}</p>
                        )}
                    </section>

                    <section className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <Info label="Cédula" value={d.datos.documento} />
                        <Info label="Fecha de nacimiento" value={d.datos.fechaNacimiento} />
                        <Info label="Dirección" value={d.datos.direccion} />
                        <Info label="Correo" value={d.datos.email} />
                        <Info label="Contacto de emergencia" value={d.datos.contactoEmergencia} />
                        <Info label="Vehículo" value={[d.vehiculo.marca, d.vehiculo.modelo, d.vehiculo.color, d.vehiculo.anio].filter(Boolean).join(' ') || null} />
                        <Info label="Placa" value={d.vehiculo.placa || null} />
                    </section>

                    {reviewing && rejecting && (
                        <section className="rounded-lg border border-slate-200 p-3 space-y-2">
                            <p className="text-sm font-semibold text-slate-900">¿Qué debe corregir?</p>
                            <div className="flex flex-wrap gap-1.5">
                                {reasons.map((r) => <button key={r} type="button" onClick={() => setMotivo(r)} className={`px-2 py-1 rounded-md border text-xs ${motivo === r ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{r}</button>)}
                            </div>
                            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="Escribe el motivo para el repartidor" className="w-full !px-3 !py-2 !text-sm !rounded-lg !border !border-slate-200 !bg-white resize-none" />
                            <p className="text-xs text-slate-500">Le reabrimos su enlace para que corrija sin empezar de cero.</p>
                        </section>
                    )}
                </div>

                {reviewing && (
                    <div className="px-5 py-3 border-t border-slate-200 flex gap-2">
                        {rejecting ? (
                            <>
                                <button type="button" onClick={() => setRejecting(false)} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700">Volver</button>
                                <button type="button" onClick={() => onReject(motivo)} disabled={busy || motivo.trim().length < 4} className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50">Pedir corrección</button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={() => setRejecting(true)} className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Pedir corrección</button>
                                <button type="button" onClick={onApprove} disabled={busy || docs.length === 0} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
                                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Aprobar y sumar al equipo
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Resultado (enviar por WhatsApp) ────────────────────────────────────
function ResultModal({ r, onClose }: { r: { title: string; text: string; whatsappUrl?: string | null; inviteUrl?: string }; onClose: () => void }) {
    const [copied, setCopied] = useState(false);
    return (
        <Modal title={r.title} onClose={onClose}>
            <p className="text-sm text-slate-600">{r.text}</p>
            <div className="mt-4 space-y-2">
                {r.whatsappUrl && (
                    <a href={r.whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={onClose} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                        <MessageCircle size={16} /> Enviar por WhatsApp
                    </a>
                )}
                {r.inviteUrl && (
                    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(r.inviteUrl!); setCopied(true); } catch { /* ignore */ } }} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Enlace copiado' : 'Copiar enlace'}
                    </button>
                )}
                <button type="button" onClick={onClose} className="w-full py-2 text-sm text-slate-500 hover:text-slate-900">Listo</button>
            </div>
        </Modal>
    );
}

// ── Piezas ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[130] bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 mb-3">
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Avatar({ src, name, size = 'md' }: { src: string | null; name: string; size?: 'md' | 'lg' }) {
    const cls = size === 'lg' ? 'size-12 text-base' : 'size-9 text-sm';
    return (
        <span className={`${cls} rounded-full bg-slate-100 text-slate-600 font-semibold flex items-center justify-center overflow-hidden shrink-0`}>
            {src && !src.toLowerCase().endsWith('.pdf') ? <img src={src} alt="" className="w-full h-full object-cover" /> : (name || '?').charAt(0).toUpperCase()}
        </span>
    );
}

function Badge({ tone, children }: { tone: 'green' | 'amber' | 'sky' | 'rose' | 'slate'; children: React.ReactNode }) {
    const t = { green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-800', sky: 'bg-sky-50 text-sky-700', rose: 'bg-rose-50 text-rose-700', slate: 'bg-slate-100 text-slate-600' }[tone];
    return <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${t}`}>{children}</span>;
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-slate-900">{value || <span className="text-slate-400">—</span>}</p>
        </div>
    );
}
