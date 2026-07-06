'use client';

import { useState, useEffect } from 'react';
import { 
    MessageSquare, Send, Calendar, Users, Info, AlertTriangle, CheckCircle, 
    Gift, Sparkles, Loader2, ArrowRight, TrendingUp, BarChart2, Bell, Check, Trophy 
} from 'lucide-react';
import { useConfirm } from '@/components/admin/ConfirmContext';

export default function ComunicacionAdminPage() {
    const { confirm } = useConfirm();
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');

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

    // Datos auxiliares
    const [clientes, setClientes] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [sending, setSending] = useState(false);

    // Cargar perfil del negocio para diseño HSL
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

    // Cargar historial de notificaciones
    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch('/api/admin/notifications?limit=15');
            if (res.ok) {
                const data = await res.json();
                setHistory(data.items || []);
            }
        } catch (err) {
            console.error("Error fetching notification history:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Cargar clientes para selección manual
    const fetchClients = async () => {
        setLoadingClients(true);
        try {
            const res = await fetch('/api/clientes');
            if (res.ok) {
                const data = await res.json();
                setClientes(data || []);
            }
        } catch (err) {
            console.error("Error fetching clients:", err);
        } finally {
            setLoadingClients(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        if (recipientType === 'USER') {
            fetchClients();
        }
    }, [recipientType]);

    // Manejar Envío
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
                actionType: categoria === 'PREMIOS' ? 'VER_PREMIO' : categoria === 'CAMPANAS' ? 'VER_CAMPANA' : 'VER_PERFIL',
                actionPayload: { screen: categoria === 'PREMIOS' ? 'reward' : categoria === 'CAMPANAS' ? 'campaign' : 'profile' }
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
                // Resetear
                setTitulo('');
                setDescripcion('');
                setScheduledFor('');
                setSpecificUserId('');
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
            prev.includes(channel) 
                ? prev.filter(c => c !== channel) 
                : [...prev, channel]
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
                {/* Formulario de Redacción */}
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
                                        // Ajustar tipo y icono por defecto
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

                            {/* Prioridad Visual */}
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
                                <label className="text-[10px] font-black text-slate-455 uppercase tracking-widest mb-2 pl-1">Destinatarios Segmentados</label>
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

                        {/* Canales de envío */}
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2.5 pl-1">Canales de Comunicación</label>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => toggleChannel('APP')}
                                    className={`px-4 py-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95`}
                                    style={channels.includes('APP') ? {
                                        backgroundColor: `${primaryColor}10`,
                                        borderColor: primaryColor,
                                        color: primaryColor
                                    } : {
                                        backgroundColor: '#f8fafc',
                                        borderColor: '#e2e8f0',
                                        color: '#64748b'
                                    }}
                                >
                                    <Bell size={14} />
                                    Centro Actividad App
                                </button>

                                <button
                                    type="button"
                                    onClick={() => toggleChannel('WHATSAPP')}
                                    className={`px-4 py-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95`}
                                    style={channels.includes('WHATSAPP') ? {
                                        backgroundColor: '#e8f5e9',
                                        borderColor: '#2e7d32',
                                        color: '#2e7d32'
                                    } : {
                                        backgroundColor: '#f8fafc',
                                        borderColor: '#e2e8f0',
                                        color: '#64748b'
                                    }}
                                >
                                    <MessageSquare size={14} />
                                    WhatsApp Oficial
                                </button>
                            </div>
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

                        {/* Descripción / Mensaje */}
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

                        {/* Programar para después */}
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

                        {/* Botón de Enviar */}
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

                {/* Previsualización en Tiempo Real */}
                <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white h-fit shadow-xl border border-slate-800 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl" />
                    
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-4">
                        📱 Vista Previa en Móvil
                    </h3>

                    <div className="bg-slate-850 rounded-[2rem] p-4 border border-slate-800 shadow-inner flex flex-col gap-3 relative">
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
                                <span className="text-[8px] font-black uppercase tracking-wider text-pink-450 block mb-0.5">{categoria}</span>
                                <h4 className="text-xs font-bold text-white uppercase tracking-tight truncate leading-none">
                                    {titulo || 'Escribe un Título...'}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1.5 break-words">
                                    {descripcion || 'Escribe el Contenido...'}
                                </p>
                            </div>
                        </div>

                        {/* Botón de acción simulado */}
                        <div className="border-t border-slate-800/50 pt-2.5 flex items-center justify-end">
                            <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-slate-800 text-white rounded-lg border border-slate-700">
                                Action Button
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Historial de Notificaciones Enviadas */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 pb-2">
                    <BarChart2 size={18} className="text-slate-700" />
                    Historial de Notificaciones & Tasa de Apertura (ROI)
                </h3>

                {loadingHistory ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-slate-400" size={24} style={{ color: primaryColor }} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando historial...</span>
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-slate-100 rounded-3xl">
                        <p className="text-xs text-slate-400 font-semibold">No se han registrado envíos de campañas de mensajería todavía.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    <th className="py-3 px-4">Fecha</th>
                                    <th className="py-3 px-4">Mensaje</th>
                                    <th className="py-3 px-4">Segmento</th>
                                    <th className="py-3 px-4">Despachados</th>
                                    <th className="py-3 px-4">Vistos (Aperturas)</th>
                                    <th className="py-3 px-4">Clics</th>
                                    <th className="py-3 px-4">Tasa de Apertura</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((n) => {
                                    const ctr = n.metricas.enviadas > 0 ? (n.metricas.vistas / n.metricas.enviadas * 100).toFixed(1) : '0.0';
                                    return (
                                        <tr key={n.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3.5 px-4 font-semibold text-slate-500 shrink-0">
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
                                            <td className="py-3.5 px-4 font-bold text-slate-700">
                                                {n.metricas.enviadas}
                                            </td>
                                            <td className="py-3.5 px-4 font-bold text-slate-700">
                                                {n.metricas.vistas}
                                            </td>
                                            <td className="py-3.5 px-4 font-bold text-slate-700">
                                                {n.metricas.clics}
                                            </td>
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
