'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
    MessageSquare, Send, Bell, Loader2, Check, Lock, Zap, ShieldCheck, ArrowRight,
    Users, Search, X, Clock, CalendarClock, Smartphone, AlertTriangle, CheckCircle2,
    ChevronDown, RefreshCw, Sparkles,
} from 'lucide-react';
import { useConfirm } from '@/components/admin/ConfirmContext';
import { getFcmToken } from '@/lib/firebase';
import AddonCheckoutModal from '@/components/admin/AddonCheckoutModal';

// ── Tipos ──────────────────────────────────────────────────────────────
type Segment = 'ALL' | 'VIP' | 'INACTIVE' | 'NEW_CLIENTS' | 'BIRTHDAY' | 'USER';
type Channel = 'APP' | 'WHATSAPP';

const SEGMENTS: { id: Segment; label: string; hint: string }[] = [
    { id: 'ALL', label: 'Todos', hint: 'Toda tu lista de clientes' },
    { id: 'VIP', label: 'Frecuentes', hint: '5 visitas o más' },
    { id: 'INACTIVE', label: 'Te extrañan', hint: 'Sin visitas hace 60 días' },
    { id: 'NEW_CLIENTS', label: 'Nuevos', hint: 'Llegaron este mes' },
    { id: 'BIRTHDAY', label: 'Cumpleañeros', hint: 'Cumplen años este mes' },
    { id: 'USER', label: 'Elegir clientes', hint: 'Tú eliges a quién' },
];

const SEGMENT_LABEL: Record<string, string> = {
    ALL: 'Todos', VIP: 'Frecuentes', INACTIVE: 'Te extrañan', NEW_CLIENTS: 'Nuevos', BIRTHDAY: 'Cumpleañeros', USER: 'Elegidos',
};

const TEMPLATES: { label: string; categoria: string; titulo: string; mensaje: string; link: string; segmento?: Segment }[] = [
    { label: 'Promoción', categoria: 'PROMOCIONES', titulo: '🎁 Promoción solo esta semana', mensaje: 'Reserva esta semana y recibe un 15% de descuento en tu próximo servicio. ¡Cupos limitados!', link: '/promociones' },
    { label: 'Te extrañamos', categoria: 'CAMPANAS', titulo: '💛 ¡Te extrañamos!', mensaje: 'Hace tiempo no te vemos. Vuelve esta semana y te damos un detalle especial en tu visita.', link: '/servicios', segmento: 'INACTIVE' },
    { label: 'Cumpleaños', categoria: 'PREMIOS', titulo: '🎂 ¡Feliz cumpleaños!', mensaje: 'Este mes es especial: tienes un regalo esperándote en tu próxima visita. Reserva cuando quieras.', link: '/servicios', segmento: 'BIRTHDAY' },
    { label: 'Horarios libres', categoria: 'RECORDATORIOS', titulo: '📅 Tenemos horarios libres hoy', mensaje: 'Aún quedan espacios disponibles para hoy y mañana. Reserva en un minuto desde tu celular.', link: '/servicios' },
    { label: 'Novedad', categoria: 'NOTICIAS', titulo: '✨ Tenemos algo nuevo para ti', mensaje: 'Estrenamos un nuevo servicio que te va a encantar. Entra y conócelo.', link: '/servicios' },
];

const LINKS: { label: string; value: string }[] = [
    { label: 'Inicio de mi página', value: '' },
    { label: 'Reservar (servicios)', value: '/servicios' },
    { label: 'Promociones', value: '/promociones' },
    { label: 'Club: misiones', value: '/misiones' },
    { label: 'Mis premios', value: '/mis-premios' },
    { label: 'Mis reservas', value: '/mis-reservas' },
    { label: 'Invita a un amigo', value: '/referidos' },
];

interface Audience { total: number; conApp: number; conPush: number; conWhatsApp: number }

function formatDate(d: string | Date) {
    return new Date(d).toLocaleString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Página ─────────────────────────────────────────────────────────────
export default function ComunicacionAdminPage() {
    const { confirm } = useConfirm();

    // Plan / add-on
    const [planFeatures, setPlanFeatures] = useState<any>(null);
    const [loadingFeatures, setLoadingFeatures] = useState(true);
    const [commAddon, setCommAddon] = useState<any>(null);
    const [subscriptionDates, setSubscriptionDates] = useState<any>(null);
    const [isPendingApproval, setIsPendingApproval] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // Estado del centro
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Formulario
    const [segmento, setSegmento] = useState<Segment>('ALL');
    const [clienteIds, setClienteIds] = useState<string[]>([]);
    const [canales, setCanales] = useState<Channel[]>(['APP']);
    const [categoria, setCategoria] = useState('NOTICIAS');
    const [titulo, setTitulo] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [link, setLink] = useState('/servicios');
    const [customLink, setCustomLink] = useState('');
    const [cuando, setCuando] = useState<'AHORA' | 'PROGRAMAR'>('AHORA');
    const [scheduledFor, setScheduledFor] = useState('');

    const [audience, setAudience] = useState<Audience | null>(null);
    const [loadingAudience, setLoadingAudience] = useState(false);
    const [sending, setSending] = useState(false);
    const [testing, setTesting] = useState(false);
    const [flash, setFlash] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

    // Clientes para "Elegir clientes"
    const [clientes, setClientes] = useState<any[]>([]);
    const [clientQuery, setClientQuery] = useState('');
    const [services, setServices] = useState<any[]>([]);

    const negocio = data?.negocio;
    const primary = negocio?.colorPrimario || '#0ea5e9';
    const pushReady = Boolean(data?.canales?.push?.configurado);
    const wa = data?.canales?.whatsapp;
    const finalLink = link === '__custom__' ? customLink.trim() : link;

    // ── Carga ──
    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/comunicacion', { cache: 'no-store' });
            if (res.ok) setData(await res.json());
        } catch { /* sin conexión */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        load();
        (async () => {
            try {
                const [resFeat, resAddons, resServices] = await Promise.all([
                    fetch('/api/features'),
                    fetch('/api/admin/addons'),
                    fetch('/api/services'),
                ]);
                if (resFeat.ok) setPlanFeatures(await resFeat.json());
                if (resServices.ok) {
                    const s = await resServices.json();
                    setServices(Array.isArray(s) ? s : s?.services || []);
                }
                if (resAddons.ok) {
                    const addData = await resAddons.json();
                    if (addData.success) {
                        const found = (addData.availableAddons || []).find((a: any) => a.code === 'ADDON_COMMUNICATION_CENTER' || a.targetKey === 'COMMUNICATION_CENTER');
                        if (found) {
                            setCommAddon(found.addon || found);
                            if (found.isPendingPayment) setIsPendingApproval(true);
                        }
                        const pendingSub = (addData.activeSubscriptions || []).find((s: any) => s.addon?.code === 'ADDON_COMMUNICATION_CENTER' || s.addonCode === 'ADDON_COMMUNICATION_CENTER');
                        if (pendingSub && pendingSub.status === 'PENDING') setIsPendingApproval(true);
                        if (addData.pricingDetails) setSubscriptionDates({ startDate: addData.pricingDetails.startDate, endDate: addData.pricingDetails.endDate });
                    }
                }
            } catch { /* ignore */ }
            finally { setLoadingFeatures(false); }
        })();
    }, [load]);

    // Mientras haya campañas enviándose, refrescar resultados
    const sendingNow = (data?.historial || []).some((h: any) => h.stats?.estado === 'ENVIANDO');
    useEffect(() => {
        if (!sendingNow) return;
        const t = setInterval(load, 5000);
        return () => clearInterval(t);
    }, [sendingNow, load]);

    // Audiencia
    useEffect(() => {
        if (segmento === 'USER' && clienteIds.length === 0) { setAudience({ total: 0, conApp: 0, conPush: 0, conWhatsApp: 0 }); return; }
        let cancelled = false;
        setLoadingAudience(true);
        const t = setTimeout(async () => {
            try {
                const q = new URLSearchParams({ segmento });
                if (segmento === 'USER') q.set('ids', clienteIds.join(','));
                const res = await fetch(`/api/admin/comunicacion/audiencia?${q}`);
                if (res.ok && !cancelled) setAudience(await res.json());
            } catch { /* ignore */ }
            finally { if (!cancelled) setLoadingAudience(false); }
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [segmento, clienteIds]);

    useEffect(() => {
        if (segmento !== 'USER' || clientes.length) return;
        fetch('/api/clientes').then((r) => (r.ok ? r.json() : [])).then((d) => setClientes(Array.isArray(d) ? d : d?.clientes || [])).catch(() => {});
    }, [segmento, clientes.length]);

    const filteredClients = useMemo(() => {
        const q = clientQuery.trim().toLowerCase();
        const list = q ? clientes.filter((c) => `${c.nombre} ${c.telefono}`.toLowerCase().includes(q)) : clientes;
        return list.slice(0, 60);
    }, [clientes, clientQuery]);

    const recipients = useMemo(() => {
        if (!audience) return 0;
        const app = canales.includes('APP') ? audience.conApp : 0;
        const whats = canales.includes('WHATSAPP') ? audience.conWhatsApp : 0;
        return canales.includes('WHATSAPP') ? Math.max(whats, app) : app;
    }, [audience, canales]);

    const toggleCanal = (c: Channel) => setCanales((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

    const applyTemplate = (t: typeof TEMPLATES[number]) => {
        setTitulo(t.titulo);
        setMensaje(t.mensaje);
        setCategoria(t.categoria);
        setLink(t.link);
        if (t.segmento) setSegmento(t.segmento);
    };

    // ── Enviar ──
    const handleSend = async () => {
        setFlash(null);
        if (!titulo.trim() || !mensaje.trim()) { setFlash({ type: 'error', text: 'Escribe un título y un mensaje.' }); return; }
        if (!canales.length) { setFlash({ type: 'error', text: 'Elige por dónde enviarlo: App, WhatsApp o ambos.' }); return; }
        if (cuando === 'PROGRAMAR' && !scheduledFor) { setFlash({ type: 'error', text: 'Elige la fecha y hora del envío.' }); return; }
        if (!recipients) { setFlash({ type: 'error', text: 'Nadie de este grupo puede recibir el mensaje por los canales elegidos.' }); return; }

        const ok = await confirm(
            cuando === 'PROGRAMAR'
                ? `Se enviará el ${new Date(scheduledFor).toLocaleString('es-EC')} a ${recipients} clientes.`
                : `Se enviará ahora a ${recipients} clientes. Esto no se puede deshacer.`,
            { title: cuando === 'PROGRAMAR' ? '¿Programar mensaje?' : '¿Enviar mensaje?', confirmText: cuando === 'PROGRAMAR' ? 'Programar' : 'Enviar', type: 'info' },
        );
        if (!ok) return;

        setSending(true);
        try {
            const res = await fetch('/api/admin/comunicacion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titulo, mensaje, categoria, segmento, clienteIds, canales, link: finalLink,
                    scheduledFor: cuando === 'PROGRAMAR' ? new Date(scheduledFor).toISOString() : null,
                }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'No se pudo enviar');
            setFlash({ type: 'ok', text: d.programada ? 'Mensaje programado. Lo verás en el historial.' : 'Enviando… Los resultados aparecen abajo en unos segundos.' });
            setTitulo(''); setMensaje(''); setScheduledFor(''); setCuando('AHORA');
            await load();
        } catch (e: any) {
            setFlash({ type: 'error', text: e.message });
        } finally {
            setSending(false);
        }
    };

    const handleTestWhatsApp = async () => {
        setFlash(null);
        setTesting(true);
        try {
            const res = await fetch('/api/admin/comunicacion/prueba', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo: titulo || undefined, mensaje: mensaje || undefined, link: finalLink }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            setFlash({ type: 'ok', text: `Prueba enviada a tu WhatsApp (${d.enviadoA}).` });
        } catch (e: any) {
            setFlash({ type: 'error', text: e.message || 'No se pudo enviar la prueba.' });
        } finally {
            setTesting(false);
        }
    };

    // ── Plan ──
    if (loadingFeatures || loading) {
        return <div className="min-h-[400px] flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={28} /></div>;
    }

    if (planFeatures && planFeatures.communications_module === false) {
        const addonPrice = commAddon ? Number(commAddon.priceMonthly || 12).toFixed(2) : '12.00';
        return (
            <div className="max-w-4xl mx-auto py-12 px-6">
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-10 md:p-16 text-white shadow-2xl relative overflow-hidden border border-indigo-500/20 text-center space-y-8">
                    
                    {/* Background glow */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />

                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wide shadow-inner">
                        <Lock size={14} className="text-indigo-400" /> Módulo de Plan Superior / Add-on
                    </div>

                    <div className="space-y-4 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-3xl font-bold tracking-tight leading-tight text-white">
                            <span className="text-white block">Sistema de Comunicaciones</span>
                            <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent not-italic font-extrabold block mt-1">
                                Notificaciones Masivas
                            </span>
                        </h2>
                        <p className="text-slate-200 font-medium text-sm md:text-base leading-relaxed">
                            Envía anuncios importantes por WhatsApp y Notificaciones Push directas a la app de tus clientes. Segmenta por VIPs, clientes inactivos o toda tu base de datos.
                        </p>
                    </div>

                    {/* Ventajas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left pt-4">
                        <div className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl border border-white/15">
                            <Zap size={20} className="text-amber-400 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-white">Notificaciones Push Instantáneas</p>
                                <p className="text-xs text-slate-300 font-semibold">Directo a la pantalla de tus clientes</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl border border-white/15">
                            <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-white">Segmentación Inteligente</p>
                                <p className="text-xs text-slate-300 font-semibold">Todos, VIPs o Inactivos</p>
                            </div>
                        </div>
                    </div>

                    {/* CTA con Focus a la Integración */}
                    <div className="pt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                        {isPendingApproval ? (
                            <div className="px-6 py-4 bg-amber-500/20 border border-amber-400/40 rounded-2xl flex items-center gap-3 text-amber-300">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                                <div className="text-left">
                                    <span className="block text-xs font-bold uppercase tracking-wider">Pago en Revisión</span>
                                    <span className="block text-xs text-amber-200/80">Se activará tras confirmar tu transferencia.</span>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCheckoutOpen(true)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-wide transition-all shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                            >
                                <Zap size={16} />
                                Activar Add-on (${addonPrice}/mes)
                            </button>
                        )}
                        <Link
                            href="/admin/plan"
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-wide transition-all shadow-xl shadow-indigo-900/50 flex items-center justify-center gap-2 active:scale-95"
                        >
                            Ver Planes Completos
                            <ArrowRight size={16} />
                        </Link>
                        <a
                            href="https://wa.me/593968118444?text=Hola%20CitiOx,%20quisiera%20habilitar%20el%20módulo%20de%20comunicaciones%20para%20mi%20negocio"
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2"
                        >
                            Hablar con Asesor
                        </a>
                    </div>

                    <AddonCheckoutModal
                        isOpen={isCheckoutOpen}
                        onClose={() => setIsCheckoutOpen(false)}
                        addon={commAddon || {
                            code: 'ADDON_COMMUNICATION_CENTER',
                            name: 'Centro de Comunicaciones Masivas',
                            description: 'Campañas de difusión masiva y segmentada por WhatsApp y notificaciones Push.',
                            priceMonthly: 12.00,
                            type: 'CAPABILITY',
                            targetKey: 'COMMUNICATION_CENTER'
                        }}
                        subscriptionDates={subscriptionDates}
                        onSuccess={async () => {
                            setIsCheckoutOpen(false);
                            setIsPendingApproval(true);
                        }}
                    />

                </div>
            </div>
        );
    }

    const previewName = negocio?.nombre || 'Tu negocio';
    const previewTitle = titulo || 'Título de tu mensaje';
    const previewBody = (mensaje || 'Aquí va el texto que leerán tus clientes.').replace(/\{nombre\}/gi, 'Ana');

    return (
        <div className="max-w-6xl space-y-5 pb-16">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                        <span className="size-8 rounded-lg text-white flex items-center justify-center" style={{ backgroundColor: primary }}><MessageSquare size={17} /></span>
                        Mensajes a clientes
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Envía promociones y avisos por la app (notificación push) y por WhatsApp.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <StatusChip ok={pushReady} label={pushReady ? 'Push listo' : 'Push sin configurar'} />
                    <StatusChip ok={Boolean(wa?.conectado)} label={wa?.conectado ? `WhatsApp conectado · ${wa.enviadosHoy || 0}/${wa.limiteDiario} hoy` : 'WhatsApp desconectado'} />
                </div>
            </div>

            {flash && (
                <div className={`rounded-lg px-3 py-2.5 text-sm flex items-start gap-2 border ${flash.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    {flash.type === 'ok' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
                    <span className="flex-1">{flash.text}</span>
                    <button type="button" onClick={() => setFlash(null)} className="opacity-60 hover:opacity-100"><X size={15} /></button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
                {/* ── Redactar ── */}
                <section className="lg:col-span-3 bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {/* 1. A quién */}
                    <Step n={1} title="¿A quién?">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {SEGMENTS.map((s) => {
                                const active = segmento === s.id;
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setSegmento(s.id)}
                                        className={`text-left px-3 py-2 rounded-lg border transition ${active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'}`}
                                    >
                                        <span className="block text-sm font-semibold leading-tight">{s.label}</span>
                                        <span className={`block text-xs leading-tight mt-0.5 ${active ? 'text-white/70' : 'text-slate-500'}`}>{s.hint}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {segmento === 'USER' && (
                            <div className="mt-3 border border-slate-200 rounded-lg">
                                <label className="relative block border-b border-slate-100">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} placeholder="Buscar por nombre o teléfono" className="w-full !border-0 !pl-9 !py-2 !text-sm outline-none !rounded-t-lg" />
                                </label>
                                <ul className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                                    {filteredClients.length === 0 ? (
                                        <li className="px-3 py-4 text-sm text-slate-500 text-center">No hay clientes con esa búsqueda.</li>
                                    ) : filteredClients.map((c) => {
                                        const on = clienteIds.includes(c.id);
                                        return (
                                            <li key={c.id}>
                                                <button type="button" onClick={() => setClienteIds((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50">
                                                    <span className={`size-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300'}`}>{on && <Check size={11} />}</span>
                                                    <span className="text-sm text-slate-800 truncate flex-1">{c.nombre}</span>
                                                    <span className="text-xs text-slate-500 shrink-0">{c.telefono}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                                {clienteIds.length > 0 && (
                                    <div className="px-3 py-1.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                                        <span>{clienteIds.length} elegidos</span>
                                        <button type="button" onClick={() => setClienteIds([])} className="font-semibold hover:underline">Quitar todos</button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                            <Users size={15} className="text-slate-400" />
                            {loadingAudience || !audience ? (
                                <span className="text-slate-400">Calculando…</span>
                            ) : (
                                <span>
                                    <strong className="text-slate-900">{audience.total}</strong> clientes ·{' '}
                                    {audience.conApp} con cuenta en tu app · {audience.conPush} con notificaciones activas · {audience.conWhatsApp} con WhatsApp
                                </span>
                            )}
                        </div>
                    </Step>

                    {/* 2. Por dónde */}
                    <Step n={2} title="¿Por dónde?">
                        <div className="grid sm:grid-cols-2 gap-2">
                            <ChannelCard
                                active={canales.includes('APP')}
                                onClick={() => toggleCanal('APP')}
                                icon={<Bell size={16} />}
                                title="App y notificación push"
                                text={`Llega al centro de avisos de tu app${pushReady ? ' y como notificación al celular' : ''}. ${audience ? `${audience.conApp} clientes.` : ''}`}
                                warn={!pushReady ? 'Las notificaciones push aún no están configuradas en Citiox: solo llegará al centro de avisos de la app.' : undefined}
                            />
                            <ChannelCard
                                active={canales.includes('WHATSAPP')}
                                onClick={() => toggleCanal('WHATSAPP')}
                                icon={<MessageSquare size={16} />}
                                title="WhatsApp"
                                text={`Llega a todos los que tienen teléfono. Se envía poco a poco (máx. ${wa?.limiteDiario || 200} al día). ${audience ? `${audience.conWhatsApp} clientes.` : ''}`}
                                warn={!wa?.conectado ? 'El WhatsApp de Citiox está desconectado ahora: los mensajes no saldrán hasta que se reconecte.' : undefined}
                                tone="green"
                            />
                        </div>
                    </Step>

                    {/* 3. Mensaje */}
                    <Step n={3} title="Mensaje">
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            <span className="text-xs text-slate-500 self-center mr-1">Ideas:</span>
                            {TEMPLATES.map((t) => (
                                <button key={t.label} type="button" onClick={() => applyTemplate(t)} className="px-2.5 py-1 rounded-full border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50">
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-3">
                            <Field label="Título" count={`${titulo.length}/65`}>
                                <input value={titulo} onChange={(e) => setTitulo(e.target.value.slice(0, 65))} placeholder="Ej: 🎁 2x1 en masajes este viernes" className="w-full !px-3 !py-2 !text-sm !rounded-lg !border !border-slate-200 !bg-white" />
                            </Field>
                            <Field label="Texto" count={`${mensaje.length}/500`}>
                                <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value.slice(0, 500))} rows={4} placeholder="Cuéntales qué hay de nuevo. En WhatsApp puedes escribir {nombre} y se cambia por el nombre de cada cliente." className="w-full !px-3 !py-2 !text-sm !rounded-lg !border !border-slate-200 !bg-white resize-none" />
                            </Field>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <Field label="Al tocar el mensaje, abrir">
                                    <div className="relative">
                                        <select value={link} onChange={(e) => setLink(e.target.value)} className="w-full appearance-none !px-3 !py-2 !pr-8 !text-sm !rounded-lg !border !border-slate-200 !bg-white">
                                            {LINKS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                                            {services.length > 0 && (
                                                <optgroup label="Un servicio">
                                                    {services.slice(0, 50).map((s: any) => <option key={s.id} value={`/servicio/${s.id}`}>{s.nombre}</option>)}
                                                </optgroup>
                                            )}
                                            <option value="__custom__">Otro enlace…</option>
                                        </select>
                                        <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                    {link === '__custom__' && (
                                        <input value={customLink} onChange={(e) => setCustomLink(e.target.value)} placeholder="https://… o /pagina" className="mt-2 w-full !px-3 !py-2 !text-sm !rounded-lg !border !border-slate-200 !bg-white" />
                                    )}
                                </Field>
                                <Field label="Tipo de mensaje">
                                    <div className="relative">
                                        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full appearance-none !px-3 !py-2 !pr-8 !text-sm !rounded-lg !border !border-slate-200 !bg-white">
                                            <option value="NOTICIAS">Novedad</option>
                                            <option value="PROMOCIONES">Promoción</option>
                                            <option value="PREMIOS">Premio o regalo</option>
                                            <option value="CAMPANAS">Campaña</option>
                                            <option value="RECORDATORIOS">Recordatorio</option>
                                        </select>
                                        <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </Field>
                            </div>
                        </div>
                    </Step>

                    {/* 4. Cuándo */}
                    <Step n={4} title="¿Cuándo?">
                        <div className="flex flex-wrap items-center gap-2">
                            {(['AHORA', 'PROGRAMAR'] as const).map((c) => (
                                <button key={c} type="button" onClick={() => setCuando(c)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${cuando === c ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                                    {c === 'AHORA' ? <Send size={14} /> : <CalendarClock size={14} />}
                                    {c === 'AHORA' ? 'Ahora' : 'Programar'}
                                </button>
                            ))}
                            {cuando === 'PROGRAMAR' && (
                                <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="!px-3 !py-1.5 !text-sm !rounded-lg !border !border-slate-200 !bg-white" />
                            )}
                        </div>
                    </Step>

                    {/* Acciones */}
                    <div className="p-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between bg-slate-50/60 rounded-b-xl">
                        <button type="button" onClick={handleTestWhatsApp} disabled={testing || !wa?.conectado} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" title={!wa?.conectado ? 'WhatsApp desconectado' : 'Te llega a tu WhatsApp para ver cómo se ve'}>
                            {testing ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} />}
                            Enviarme una prueba
                        </button>
                        <button type="button" onClick={handleSend} disabled={sending} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold hover:brightness-110 disabled:opacity-60" style={{ backgroundColor: primary }}>
                            {sending ? <Loader2 size={15} className="animate-spin" /> : cuando === 'PROGRAMAR' ? <CalendarClock size={15} /> : <Send size={15} />}
                            {cuando === 'PROGRAMAR' ? 'Programar' : 'Enviar'} {recipients ? `a ${recipients} ${recipients === 1 ? 'cliente' : 'clientes'}` : ''}
                        </button>
                    </div>
                </section>

                {/* ── Vista previa ── */}
                <aside className="lg:col-span-2 space-y-4 lg:sticky lg:top-0">
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-slate-900 mb-3">Así lo verán</p>

                        {canales.includes('APP') && (
                            <div className="mb-4">
                                <p className="text-xs text-slate-500 mb-1.5">Notificación en el celular</p>
                                <div className="rounded-2xl bg-slate-100 p-3">
                                    <div className="bg-white/90 rounded-xl p-3 shadow-sm flex gap-2.5">
                                        <div className="size-9 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                                            {negocio?.logoUrl ? <img src={negocio.logoUrl} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: primary }}>{previewName.charAt(0)}</span>}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-slate-500 truncate">{previewName}</span>
                                                <span className="text-xs text-slate-400 shrink-0">ahora</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900 leading-tight truncate">{previewTitle}</p>
                                            <p className="text-xs text-slate-600 leading-snug line-clamp-3">{previewBody}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {canales.includes('WHATSAPP') && (
                            <div>
                                <p className="text-xs text-slate-500 mb-1.5">WhatsApp</p>
                                <div className="rounded-2xl p-3" style={{ backgroundColor: '#e7ded4' }}>
                                    <div className="bg-white rounded-lg rounded-tl-none p-2.5 shadow-sm max-w-[92%] text-[13px] text-slate-800 leading-snug whitespace-pre-line">
                                        {'Hola Ana 👋\n\n'}
                                        <strong>{previewTitle}</strong>
                                        {`\n\n${previewBody}\n\n👉 `}
                                        <span className="text-sky-700 break-all">citiox.com/{negocio?.slug || 'tu-negocio'}{finalLink && !finalLink.startsWith('http') ? finalLink : ''}</span>
                                        {`\n\n— ${previewName}`}
                                    </div>
                                </div>
                            </div>
                        )}

                        {canales.length === 0 && <p className="text-sm text-slate-500">Elige un canal para ver la vista previa.</p>}
                    </div>

                    <PushHelp pushReady={pushReady} />
                </aside>
            </div>

            {/* ── Historial ── */}
            <section className="bg-white border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-900">Mensajes enviados</h2>
                    <button type="button" onClick={load} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"><RefreshCw size={13} /> Actualizar</button>
                </div>
                {(data?.historial || []).length === 0 ? (
                    <div className="px-4 py-10 text-center">
                        <Sparkles className="mx-auto text-slate-300" size={24} />
                        <p className="text-sm text-slate-600 mt-2">Aún no has enviado mensajes. Empieza con una de las ideas de arriba.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {data.historial.map((h: any) => <HistoryRow key={h.id} h={h} />)}
                    </ul>
                )}
            </section>
        </div>
    );
}

// ── Componentes pequeños ────────────────────────────────────────────────

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2.5 flex items-center gap-2">
                <span className="size-5 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center justify-center">{n}</span>
                {title}
            </h3>
            {children}
        </div>
    );
}

function Field({ label, count, children }: { label: string; count?: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                {label}
                {count && <span className="font-normal text-slate-400">{count}</span>}
            </span>
            {children}
        </label>
    );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            <span className={`size-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {label}
        </span>
    );
}

function ChannelCard({ active, onClick, icon, title, text, warn, tone }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; text: string; warn?: string; tone?: 'green' }) {
    const accent = tone === 'green' ? '#16a34a' : '#0f172a';
    return (
        <button type="button" onClick={onClick} className="text-left p-3 rounded-lg border-2 transition" style={{ borderColor: active ? accent : '#e2e8f0', backgroundColor: active ? (tone === 'green' ? '#f0fdf4' : '#f8fafc') : '#fff' }}>
            <span className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span style={{ color: accent }}>{icon}</span>{title}
                </span>
                <span className={`size-4 rounded border flex items-center justify-center ${active ? 'text-white' : 'border-slate-300'}`} style={active ? { backgroundColor: accent, borderColor: accent } : undefined}>{active && <Check size={11} />}</span>
            </span>
            <span className="block text-xs text-slate-600 mt-1 leading-snug">{text}</span>
            {warn && active && <span className="block text-xs text-amber-700 mt-1.5 leading-snug">{warn}</span>}
        </button>
    );
}

function HistoryRow({ h }: { h: any }) {
    const s = h.stats || {};
    const estado = s.estado;
    const badge =
        estado === 'PROGRAMADA' ? { t: `Programado · ${h.scheduledFor ? formatDate(h.scheduledFor) : ''}`, c: 'bg-sky-50 text-sky-700' } :
        estado === 'ENVIANDO' ? { t: 'Enviando…', c: 'bg-amber-50 text-amber-700' } :
        estado === 'ERROR' ? { t: 'Error', c: 'bg-rose-50 text-rose-700' } :
        { t: 'Enviado', c: 'bg-emerald-50 text-emerald-700' };
    const waEstado: Record<string, string> = {
        SIN_CONEXION: 'no salió: WhatsApp desconectado',
        LIMITE: 'no salió: límite diario alcanzado',
        PENDIENTE: 'en espera',
        ENVIANDO: 'enviando…',
    };

    return (
        <li className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <div className="md:w-28 shrink-0 text-xs text-slate-500">{formatDate(h.createdAt)}</div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{h.titulo}</p>
                <p className="text-xs text-slate-500 truncate">{h.mensaje}</p>
            </div>
            <div className="text-xs text-slate-600 md:w-72 shrink-0 space-y-0.5">
                <p><Users size={12} className="inline -mt-0.5 mr-1 text-slate-400" />{SEGMENT_LABEL[s.segmento] || 'Clientes'} · {s.audiencia ?? '—'} clientes</p>
                {s.canales?.includes('APP') && (
                    <p><Bell size={12} className="inline -mt-0.5 mr-1 text-slate-400" />App: {s.app?.enviadas || 0} recibidos · {h.leidas} leídos · {s.app?.push || 0} push{s.app?.pushSinConfigurar ? ' (push sin configurar)' : ''}</p>
                )}
                {s.canales?.includes('WHATSAPP') && (
                    <p><MessageSquare size={12} className="inline -mt-0.5 mr-1 text-slate-400" />WhatsApp: {s.whatsapp?.enviados || 0} de {s.whatsapp?.total || 0}{s.whatsapp?.fallidos ? ` · ${s.whatsapp.fallidos} fallidos` : ''}{waEstado[s.whatsapp?.estado] ? ` · ${waEstado[s.whatsapp.estado]}` : ''}</p>
                )}
            </div>
            <span className={`self-start md:self-center text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.c}`}>{badge.t}</span>
        </li>
    );
}

/** Ayuda para probar las notificaciones push en el propio celular del dueño. */
function PushHelp({ pushReady }: { pushReady: boolean }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const test = async () => {
        setBusy(true);
        setMsg(null);
        try {
            if (!('Notification' in window)) throw new Error('Este navegador no permite notificaciones. En iPhone, primero agrega la app a tu pantalla de inicio.');
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') throw new Error('Permite las notificaciones en el candado de la barra de direcciones y vuelve a intentar.');
            const token = await getFcmToken();
            if (!token) throw new Error('No se pudo activar este celular para notificaciones.');
            const res = await fetch('/api/admin/notifications/test-push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
            const d = await res.json().catch(() => ({}));
            if (!res.ok || !d.success) throw new Error(d.error || 'El servidor no pudo enviar la notificación.');
            setMsg({ ok: true, text: 'Enviada. Debe llegarte en unos segundos.' });
        } catch (e: any) {
            setMsg({ ok: false, text: e.message || String(e) });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl">
            <button type="button" onClick={() => setOpen((v) => !v)} className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-slate-800">
                <span className="flex items-center gap-2"><Smartphone size={15} className="text-slate-400" /> Probar notificaciones en mi celular</span>
                <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-2.5 text-sm text-slate-600">
                    {!pushReady && <p className="text-amber-700 text-xs">El envío push aún no está configurado en Citiox (faltan las credenciales de Firebase del servidor).</p>}
                    <p className="text-xs">Te llegará una notificación de prueba a este navegador o celular.</p>
                    <button type="button" onClick={test} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-60">
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />} Enviar prueba aquí
                    </button>
                    {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.text}</p>}
                </div>
            )}
        </div>
    );
}
