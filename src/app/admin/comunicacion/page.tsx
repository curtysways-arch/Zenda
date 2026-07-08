'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    MessageSquare, Send, Bell, Gift, Trophy, Calendar,
    Sparkles, Loader2, BarChart2, Link2, X, ChevronDown,
    ExternalLink, Check
} from 'lucide-react';
import { useConfirm } from '@/components/admin/ConfirmContext';
import { getFcmToken } from '@/lib/firebase';

// ─── Selector de Link (igual al de páginas/contenido) ─────────────────────────
interface LinkOption {
    label: string;
    value: string;
    group?: string;
    isCustom?: boolean;
}

function LinkSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const [customUrl, setCustomUrl] = useState('');
    const [showCustom, setShowCustom] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [promotions, setPromotions] = useState<any[]>([]);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sRes, pRes] = await Promise.all([
                    fetch('/api/services'),
                    fetch('/api/admin/loyalty/rewards')
                ]);
                if (sRes.ok) setServices(await sRes.json());
                if (pRes.ok) {
                    const pData = await pRes.json();
                    setPromotions(pData?.rewards || []);
                }
            } catch {}
        };
        fetchData();
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const staticOptions: LinkOption[] = [
        { label: 'Sin enlace de destino', value: '', group: 'General' },
        { label: 'Página de Inicio', value: '/', group: 'General' },
        { label: 'Mis Reservas', value: '/mis-reservas', group: 'General' },
        { label: 'Mi Perfil y Puntos', value: '/perfil', group: 'General' },
        { label: 'Mis Referidos y Premios', value: '/referidos', group: 'General' },
        { label: 'Sección Servicios', value: '/servicios', group: 'General' },
        { label: 'Mis Notificaciones', value: '/notificaciones', group: 'General' },
    ];

    const allOptions = [
        ...staticOptions,
        ...services.map((s: any) => ({ label: s.nombre, value: `/servicio/${s.id}`, group: 'Servicios' })),
        ...promotions.map((p: any) => ({ label: p.nombre || p.titulo, value: `/promo/${p.id}`, group: 'Premios' })),
        { label: 'Escribir URL personalizada...', value: '__custom__', group: 'Personalizado', isCustom: true }
    ];

    const grouped = allOptions.reduce((acc: Record<string, LinkOption[]>, opt) => {
        const g = opt.group || 'General';
        if (!acc[g]) acc[g] = [];
        acc[g].push(opt);
        return acc;
    }, {});

    const selectedLabel = allOptions.find(o => o.value === value)?.label || (value ? value : 'Sin enlace');

    const handleSelect = (opt: LinkOption) => {
        if (opt.isCustom) {
            setShowCustom(true);
            setOpen(false);
        } else {
            onChange(opt.value);
            setShowCustom(false);
            setOpen(false);
        }
    };

    const handleCustomConfirm = () => {
        onChange(customUrl);
        setShowCustom(false);
    };

    return (
        <div ref={ref} className="relative">
            <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2 pl-1 block">
                Botón de Acción / Enlace de Destino (Opcional)
            </label>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none hover:border-slate-200 transition-colors"
            >
                <span className="flex items-center gap-2 text-slate-700 truncate">
                    <Link2 size={13} className="text-slate-400 shrink-0" />
                    {value ? selectedLabel : <span className="text-slate-400">Sin enlace de destino</span>}
                </span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                    <div className="max-h-60 overflow-y-auto py-2">
                        {Object.entries(grouped).map(([group, opts]) => (
                            <div key={group}>
                                <div className="px-4 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                                    {group}
                                </div>
                                {opts.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleSelect(opt)}
                                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 flex items-center justify-between transition-colors ${opt.isCustom ? 'text-blue-600' : 'text-slate-700'}`}
                                    >
                                        <span>{opt.label}</span>
                                        {value === opt.value && <Check size={12} className="text-emerald-500" />}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Input personalizado */}
            {showCustom && (
                <div className="mt-2 flex gap-2">
                    <input
                        type="url"
                        placeholder="https://..."
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-slate-300"
                    />
                    <button
                        type="button"
                        onClick={handleCustomConfirm}
                        className="px-3 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-black transition-colors hover:bg-emerald-100"
                    >
                        OK
                    </button>
                    <button type="button" onClick={() => setShowCustom(false)} className="p-2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Mostrar link seleccionado */}
            {value && (
                <div className="mt-1.5 flex items-center gap-1.5 pl-1">
                    <ExternalLink size={10} className="text-slate-400" />
                    <span className="text-[10px] text-slate-400 font-semibold truncate">{value}</span>
                    <button type="button" onClick={() => onChange('')} className="text-slate-300 hover:text-red-400 ml-auto">
                        <X size={10} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Página Principal ──────────────────────────────────────────────────────────

export default function ComunicacionAdminPage() {
    const { confirm } = useConfirm();
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');

    // Diagnóstico Push
    const [testPushState, setTestPushState] = useState<{
        permission: string;
        token: string;
        loadingToken: boolean;
        copied: boolean;
        sendingTest: boolean;
        statusMessage: { text: string; type: 'success' | 'error' } | null;
    }>({
        permission: 'default',
        token: '',
        loadingToken: false,
        copied: false,
        sendingTest: false,
        statusMessage: null
    });

    const loadDeviceToken = async () => {
        setTestPushState(prev => ({ ...prev, loadingToken: true, statusMessage: null }));
        try {
            const token = await getFcmToken();
            setTestPushState(prev => ({ ...prev, token: token || '', loadingToken: false }));
        } catch (err: any) {
            console.error('[PUSH TEST] Error:', err);
            setTestPushState(prev => ({ 
                ...prev, 
                loadingToken: false,
                statusMessage: { text: `Error al generar token: ${err.message || err}`, type: 'error' }
            }));
        }
    };

    const handleRequestPermission = async () => {
        if (typeof window === 'undefined') return;
        try {
            const perm = await Notification.requestPermission();
            setTestPushState(prev => ({ ...prev, permission: perm }));
            if (perm === 'granted') {
                await loadDeviceToken();
            } else if (perm === 'denied') {
                setTestPushState(prev => ({
                    ...prev,
                    statusMessage: { text: "Permisos denegados. Debes habilitarlos en la configuración de tu navegador.", type: 'error' }
                }));
            }
        } catch (err: any) {
            setTestPushState(prev => ({
                ...prev,
                statusMessage: { text: `Error al solicitar permisos: ${err.message || err}`, type: 'error' }
            }));
        }
    };

    const handleCopyToken = () => {
        if (!testPushState.token) return;
        navigator.clipboard.writeText(testPushState.token);
        setTestPushState(prev => ({ ...prev, copied: true }));
        setTimeout(() => setTestPushState(prev => ({ ...prev, copied: false })), 2000);
    };

    const handleRegenerateToken = async () => {
        await handleRequestPermission();
    };

    const handleSendTestPush = async () => {
        if (!testPushState.token) return;
        setTestPushState(prev => ({ ...prev, sendingTest: true, statusMessage: null }));
        try {
            const res = await fetch('/api/admin/notifications/test-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: testPushState.token })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setTestPushState(prev => ({
                    ...prev,
                    sendingTest: false,
                    statusMessage: { text: "¡Notificación de prueba enviada! Debería llegarte en unos segundos.", type: 'success' }
                }));
            } else {
                setTestPushState(prev => ({
                    ...prev,
                    sendingTest: false,
                    statusMessage: { text: `Error del servidor: ${data.error || 'Código ' + res.status}`, type: 'error' }
                }));
            }
        } catch (err: any) {
            setTestPushState(prev => ({
                ...prev,
                sendingTest: false,
                statusMessage: { text: `Error de red: ${err.message || err}`, type: 'error' }
            }));
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const perm = Notification.permission;
            setTestPushState(prev => ({ ...prev, permission: perm }));
            if (perm === 'granted') {
                loadDeviceToken();
            }
        }
    }, []);

    // Formulario
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [categoria, setCategoria] = useState('NOTICIAS');
    const [tipo, setTipo] = useState('NOTICIA');
    const [icono, setIcono] = useState('Bell');
    const [prioridad, setPrioridad] = useState('INFO');
    const [recipientType, setRecipientType] = useState('ALL');
    const [channels, setChannels] = useState<string[]>(['APP']);
    const [scheduledFor, setScheduledFor] = useState('');
    const [specificUserId, setSpecificUserId] = useState('');
    const [actionUrl, setActionUrl] = useState(''); // Link de destino

    // Datos auxiliares
    const [clientes, setClientes] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const fetchNegocio = async () => {
            try {
                const res = await fetch('/api/negocio');
                if (res.ok) {
                    const data = await res.json();
                    setPrimaryColor(data.colorPrimario || '#0ea5e9');
                }
            } catch {}
        };
        fetchNegocio();
    }, []);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch('/api/admin/notifications?limit=15');
            if (res.ok) {
                const data = await res.json();
                setHistory(data.items || []);
            }
        } catch {}
        finally { setLoadingHistory(false); }
    };

    const fetchClients = async () => {
        setLoadingClients(true);
        try {
            const res = await fetch('/api/clientes');
            if (res.ok) setClientes((await res.json()) || []);
        } catch {}
        finally { setLoadingClients(false); }
    };

    useEffect(() => { fetchHistory(); }, []);
    useEffect(() => { if (recipientType === 'USER') fetchClients(); }, [recipientType]);

    // Calcular actionType y actionPayload según link seleccionado
    const buildAction = () => {
        if (!actionUrl) return { actionType: 'VER_PERFIL', actionPayload: { screen: 'home' } };
        if (actionUrl.startsWith('/servicio/')) return { actionType: 'ABRIR_URL', actionPayload: { url: actionUrl, screen: 'service' } };
        if (actionUrl.startsWith('/referidos')) return { actionType: 'VER_CAMPANA', actionPayload: { screen: 'campaign' } };
        if (actionUrl.startsWith('/mis-reservas')) return { actionType: 'VER_RESERVA', actionPayload: { screen: 'appointment' } };
        if (actionUrl.startsWith('/notificaciones')) return { actionType: 'VER_PERFIL', actionPayload: { screen: 'notifications' } };
        return { actionType: 'ABRIR_URL', actionPayload: { url: actionUrl } };
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titulo || !descripcion) return;

        const isOk = await confirm(
            scheduledFor
                ? `¿Deseas programar este mensaje para el ${new Date(scheduledFor).toLocaleString()}?`
                : '¿Deseas enviar esta notificación ahora mismo a todos los destinatarios seleccionados?',
            {
                title: scheduledFor ? 'Programar Notificación' : 'Enviar Notificación',
                confirmText: scheduledFor ? 'Programar' : 'Enviar Ahora',
                type: 'info'
            }
        );
        if (!isOk) return;

        setSending(true);
        try {
            const { actionType, actionPayload } = buildAction();
            const payload: any = {
                tipo,
                categoria,
                titulo,
                descripcion,
                icono,
                prioridad,
                recipientType,
                channels,
                scheduledFor: scheduledFor || undefined,
                actionType,
                actionPayload
            };

            if (recipientType === 'USER' && specificUserId) {
                payload.userIds = [specificUserId];
            }

            const res = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setTitulo('');
                setDescripcion('');
                setScheduledFor('');
                setSpecificUserId('');
                setActionUrl('');
                fetchHistory();
                alert(scheduledFor ? 'Notificación programada con éxito' : 'Notificación enviada con éxito');
            } else {
                const errData = await res.json();
                alert(`Error: ${errData.error || 'No se pudo enviar'}`);
            }
        } catch (err) {
            console.error("Error sending notification:", err);
        } finally {
            setSending(false);
        }
    };

    const toggleChannel = (channel: string) => {
        setChannels(prev =>
            prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
        );
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Encabezado */}
            <div className="flex justify-between items-center">
                <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Canales y Mensajería</span>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                        <MessageSquare className="text-pink-500" />
                        Centro de Comunicación
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── Formulario ─────────────────────────────────────────────── */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 border-b border-slate-50 pb-4">
                        <Sparkles size={18} className="text-amber-500" />
                        Redactar Nueva Campaña de Notificación
                    </h3>

                    <form onSubmit={handleSend} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Categoría */}
                            <div className="flex flex-col">
                                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2 pl-1">Categoría</label>
                                <select
                                    value={categoria}
                                    onChange={(e) => {
                                        setCategoria(e.target.value);
                                        if (e.target.value === 'PREMIOS') { setTipo('PREMIO'); setIcono('Gift'); }
                                        else if (e.target.value === 'CAMPANAS') { setTipo('CAMPANA'); setIcono('Trophy'); }
                                        else if (e.target.value === 'RESERVAS') { setTipo('RESERVA'); setIcono('Calendar'); }
                                        else { setTipo('NOTICIA'); setIcono('Bell'); }
                                    }}
                                    className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-xs font-semibold focus:outline-none focus:border-slate-200"
                                >
                                    <option value="NOTICIAS">Noticias y Anuncios</option>
                                    <option value="PROMOCIONES">Promoción de Servicio</option>
                                    <option value="CAMPANAS">Campaña / Desafío</option>
                                    <option value="PREMIOS">Premio / Recompensa</option>
                                    <option value="SISTEMA">Aviso de Sistema</option>
                                </select>
                            </div>

                            {/* Prioridad */}
                            <div className="flex flex-col">
                                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2 pl-1">Prioridad / Enfoque</label>
                                <select
                                    value={prioridad}
                                    onChange={(e) => setPrioridad(e.target.value)}
                                    className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-xs font-semibold focus:outline-none focus:border-slate-200"
                                >
                                    <option value="INFO">Información (Azul)</option>
                                    <option value="SUCCESS">Éxito / Premio (Verde)</option>
                                    <option value="WARNING">Advertencia / Alerta (Naranja)</option>
                                    <option value="ERROR">Urgente / Cancelación (Rojo)</option>
                                </select>
                            </div>
                        </div>

                        {/* Destinatarios */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="flex flex-col">
                                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2 pl-1">Destinatarios Segmentados</label>
                                <select
                                    value={recipientType}
                                    onChange={(e) => setRecipientType(e.target.value)}
                                    className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-xs font-semibold focus:outline-none focus:border-slate-200"
                                >
                                    <option value="ALL">Todos los Clientes</option>
                                    <option value="VIP">Clientes VIP (Más de 5 citas)</option>
                                    <option value="INACTIVE">Clientes Inactivos (Sin citas hace 60 días)</option>
                                    <option value="NEW_CLIENTS">Nuevos Clientes (Últimos 30 días)</option>
                                    <option value="USER">Cliente Específico (Seleccionar)</option>
                                </select>
                            </div>

                            {recipientType === 'USER' && (
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2 pl-1">Seleccionar Cliente</label>
                                    {loadingClients ? (
                                        <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-center">
                                            <Loader2 className="animate-spin text-slate-400" size={16} />
                                        </div>
                                    ) : (
                                        <select
                                            value={specificUserId}
                                            onChange={(e) => setSpecificUserId(e.target.value)}
                                            className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-xs font-semibold focus:outline-none focus:border-slate-200"
                                        >
                                            <option value="">Selecciona un cliente...</option>
                                            {clientes.map(c => (
                                                <option key={c.id} value={c.usuarioId || c.id}>{c.nombre} ({c.telefono})</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Canales */}
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2.5 pl-1">Canales de Comunicación</label>
                            <div className="flex gap-3 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => toggleChannel('APP')}
                                    className="px-4 py-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
                                    style={channels.includes('APP') ? {
                                        backgroundColor: `${primaryColor}15`,
                                        borderColor: primaryColor,
                                        color: primaryColor
                                    } : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }}
                                >
                                    <Bell size={14} />
                                    App + Push
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleChannel('WHATSAPP')}
                                    className="px-4 py-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
                                    style={channels.includes('WHATSAPP') ? {
                                        backgroundColor: '#e8f5e9',
                                        borderColor: '#2e7d32',
                                        color: '#2e7d32'
                                    } : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }}
                                >
                                    <MessageSquare size={14} />
                                    WhatsApp Oficial
                                </button>
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium pl-1 mt-2">
                                "App + Push" envía al Centro de Actividad y dispara la notificación push en el celular del cliente.
                            </p>
                        </div>

                        {/* Título */}
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2 pl-1">Título del Mensaje</label>
                            <input
                                type="text"
                                placeholder="Ej: 🎉 ¡Feliz Cumpleaños! Reclama tu regalo..."
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-xs font-semibold focus:outline-none focus:border-slate-200"
                                maxLength={60}
                                required
                            />
                        </div>

                        {/* Descripción */}
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2 pl-1">Contenido / Descripción</label>
                            <textarea
                                placeholder="Escribe el cuerpo del mensaje. Puedes usar emojis."
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                className="bg-slate-50 border border-slate-100 rounded-3xl p-4 text-xs font-semibold focus:outline-none focus:border-slate-200 h-28 resize-none"
                                maxLength={250}
                                required
                            />
                        </div>

                        {/* ── SELECTOR DE LINK ───────────────────────────────── */}
                        <LinkSelector value={actionUrl} onChange={setActionUrl} />

                        {/* Programar */}
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2 pl-1">Programar Envío (Opcional)</label>
                            <input
                                type="datetime-local"
                                value={scheduledFor}
                                onChange={(e) => setScheduledFor(e.target.value)}
                                className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-xs font-semibold focus:outline-none focus:border-slate-200"
                            />
                            <span className="text-[9px] text-slate-400 font-medium pl-1 mt-1">Déjalo en blanco para enviar de forma inmediata.</span>
                        </div>

                        {/* Botón Enviar */}
                        <button
                            type="submit"
                            disabled={sending}
                            className="w-full py-4 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md hover:opacity-95 transition-opacity active:scale-99 flex items-center justify-center gap-2"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {sending ? (
                                <Loader2 className="animate-spin" size={14} />
                            ) : (
                                <>
                                    <Send size={14} />
                                    {scheduledFor ? 'Programar Notificación' : 'Despachar Notificación Ahora'}
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* ── Previsualización ─────────────────────────────────────── */}
                <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white h-fit shadow-xl border border-slate-800 space-y-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-4">
                        📱 Vista Previa en Móvil
                    </h3>

                    <div className="bg-slate-850 rounded-[2rem] p-4 border border-slate-800 flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Hoy</span>
                            <span className="text-[8px] text-slate-500 font-bold">Ahora</span>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                                {categoria === 'PREMIOS' ? <Gift size={16} className="text-emerald-400" /> :
                                    categoria === 'CAMPANAS' ? <Trophy size={16} className="text-amber-400" /> :
                                        categoria === 'RESERVAS' ? <Calendar size={16} className="text-sky-400" /> :
                                            <Bell size={16} className="text-slate-300" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[8px] font-black uppercase tracking-wider text-pink-400 block mb-0.5">{categoria}</span>
                                <h4 className="text-xs font-bold text-white uppercase tracking-tight truncate leading-none">
                                    {titulo || 'Escribe un Título...'}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1.5 break-words">
                                    {descripcion || 'Escribe el Contenido...'}
                                </p>
                            </div>
                        </div>
                        {actionUrl && (
                            <div className="border-t border-slate-800/50 pt-2.5 flex items-center justify-end gap-1.5">
                                <ExternalLink size={9} className="text-slate-500" />
                                <span className="text-[8px] font-bold text-slate-500 truncate">{actionUrl}</span>
                                <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-800 text-white rounded-lg border border-slate-700 ml-auto">
                                    Ir Ahora →
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Diagnóstico Push de este dispositivo ────────────────────────────── */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 pb-2">
                    <Sparkles size={18} className="text-emerald-500" />
                    Diagnóstico de Notificaciones Push de este Celular / Navegador
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Permiso del Navegador</span>
                        <span className="text-slate-800 flex items-center gap-2 font-bold uppercase">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                                testPushState.permission === 'granted' ? 'bg-emerald-500' : testPushState.permission === 'denied' ? 'bg-rose-500' : 'bg-amber-500'
                            }`} />
                            {testPushState.permission}
                        </span>
                        {testPushState.permission === 'denied' && (
                            <p className="text-[10px] text-rose-500 font-semibold mt-1 leading-normal">
                                Has bloqueado las notificaciones. Habilítalas presionando el candado de la barra de direcciones del navegador.
                            </p>
                        )}
                        {testPushState.permission === 'default' && (
                            <button 
                                onClick={handleRequestPermission}
                                className="mt-2 text-[10px] font-black uppercase text-emerald-600 bg-emerald-55/20 py-1.5 px-3 rounded-lg hover:bg-emerald-55/35 transition-colors self-start"
                            >
                                Solicitar Permisos
                            </button>
                        )}
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5 md:col-span-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Token de Notificación (FCM) de este Dispositivo</span>
                        <div className="flex gap-2 items-center min-w-0">
                            {testPushState.loadingToken ? (
                                <Loader2 className="animate-spin text-slate-400" size={16} />
                            ) : testPushState.token ? (
                                <>
                                    <span className="text-slate-700 font-mono truncate flex-1 bg-white border border-slate-100 px-2 py-1.5 rounded-md text-[10px]">
                                        {testPushState.token}
                                    </span>
                                    <button 
                                        type="button"
                                        onClick={handleCopyToken}
                                        className="text-[9px] font-black uppercase px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg whitespace-nowrap"
                                    >
                                        {testPushState.copied ? 'Copiado ✓' : 'Copiar'}
                                    </button>
                                </>
                            ) : (
                                <span className="text-slate-400">No generado</span>
                            )}
                        </div>
                        
                        <div className="flex gap-2 mt-2">
                            <button
                                type="button"
                                onClick={handleRegenerateToken}
                                className="text-[9px] font-black uppercase text-slate-700 bg-white border border-slate-200 py-1.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Activar / Re-registrar este dispositivo
                            </button>
                            
                            {testPushState.token && (
                                <button
                                    type="button"
                                    onClick={handleSendTestPush}
                                    disabled={testPushState.sendingTest}
                                    className="text-[9px] font-black uppercase text-white bg-emerald-500 py-1.5 px-4 rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                                >
                                    {testPushState.sendingTest ? <Loader2 className="animate-spin" size={12} /> : null}
                                    Probar Push Aquí
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {testPushState.statusMessage && (
                    <div className={`p-3.5 rounded-xl text-[10px] font-bold ${
                        testPushState.statusMessage.type === 'success' ? 'bg-emerald-55/10 border border-emerald-250/20 text-emerald-800' : 'bg-rose-55/10 border border-rose-250/20 text-rose-800'
                    }`}>
                        {testPushState.statusMessage.text}
                    </div>
                )}
            </div>

            {/* ── Historial ──────────────────────────────────────────────────── */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 pb-2">
                    <BarChart2 size={18} className="text-slate-700" />
                    Historial & Tasa de Apertura
                </h3>

                {loadingHistory ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-slate-400" size={24} style={{ color: primaryColor }} />
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-slate-100 rounded-3xl">
                        <p className="text-xs text-slate-400 font-semibold">No se han registrado envíos todavía.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    <th className="py-3 px-4">Fecha</th>
                                    <th className="py-3 px-4">Mensaje</th>
                                    <th className="py-3 px-4">Segmento</th>
                                    <th className="py-3 px-4">Enviadas</th>
                                    <th className="py-3 px-4">Vistas</th>
                                    <th className="py-3 px-4">Clics</th>
                                    <th className="py-3 px-4">Apertura</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((n) => {
                                    const ctr = n.metricas.enviadas > 0 ? (n.metricas.vistas / n.metricas.enviadas * 100).toFixed(1) : '0.0';
                                    return (
                                        <tr key={n.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3.5 px-4 font-semibold text-slate-500 whitespace-nowrap">
                                                {new Date(n.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="py-3.5 px-4 max-w-xs">
                                                <div className="font-black text-slate-900 uppercase tracking-tight truncate">{n.titulo}</div>
                                                <div className="text-[10px] text-slate-450 truncate font-semibold mt-0.5">{n.descripcion}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                                    {n.recipientType}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 font-bold text-slate-700">{n.metricas.enviadas}</td>
                                            <td className="py-3.5 px-4 font-bold text-slate-700">{n.metricas.vistas}</td>
                                            <td className="py-3.5 px-4 font-bold text-slate-700">{n.metricas.clics}</td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-slate-900">{ctr}%</span>
                                                    <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${Math.min(100, parseFloat(ctr))}%`,
                                                                backgroundColor: parseFloat(ctr) > 40 ? '#10b981' : parseFloat(ctr) > 15 ? primaryColor : '#f59e0b'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
