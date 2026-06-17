'use client';

import { useState, useEffect } from 'react';
import { 
    MessageCircle, 
    RefreshCcw, 
    Power, 
    PowerOff, 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    QrCode, 
    Phone, 
    Clock, 
    ShieldCheck, 
    AlertTriangle,
    ChevronRight,
    Search,
    User
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function WhatsAppConfigPage() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState<any>(null);

    const fetchStatus = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const res = await fetch('/api/superadmin/whatsapp', { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                setStatus({ status: 'error', connected: false, error: errData.error || 'Servidor no responde' });
            } else {
                const data = await res.json();
                setStatus(data);
            }
        } catch (error: any) {
            console.error('Error fetching status:', error);
            setStatus({ status: 'offline', connected: false, error: 'Bot desconectado (Verifica el proceso)' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000); // Poll cada 3s
        return () => clearInterval(interval);
    }, []);

    const handleConnect = async () => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/superadmin/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'connect' })
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Iniciando conexión...' });
            } else {
                setMessage({ type: 'error', text: 'Error al iniciar conexión' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de red' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('¿Estás seguro de desconectar WhatsApp? Se cerrará la sesión actual.')) return;
        
        setActionLoading(true);
        try {
            const res = await fetch('/api/superadmin/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'disconnect' })
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'WhatsApp desconectado correctamente' });
            } else {
                setMessage({ type: 'error', text: 'Error al desconectar' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de red' });
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusColor = () => {
        if (!status) return 'text-slate-400';
        if (status.status === 'offline' || status.status === 'error') return 'text-rose-500';
        if (status.connected) return 'text-emerald-500';
        if (status.status === 'connecting' || status.hasQR) return 'text-amber-500';
        return 'text-rose-500';
    };

    const getStatusText = () => {
        if (!status) return 'Desconocido';
        if (status.status === 'offline' || status.status === 'error') return 'Fuera de Línea';
        if (status.connected) return 'Conectado';
        if (status.hasQR) return 'Esperando Escaneo';
        if (status.status === 'connecting') return 'Iniciando...';
        return 'Desconectado';
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-[2px] w-8 bg-emerald-500 rounded-full" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Configuración Global</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase leading-none">
                        WhatsApp <span className="text-emerald-500">Service</span>
                    </h1>
                    <p className="text-slate-500 dark:text-white/40 font-medium mt-4">Gestión centralizada del bot de mensajería para toda la plataforma.</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white/5 dark:bg-black/20 backdrop-blur-xl p-4 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl">
                    <div className={`size-3 rounded-full animate-pulse ${status?.connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className={`text-xs font-black uppercase tracking-widest ${getStatusColor()}`}>
                        {getStatusText()}
                    </span>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Status Console & Controls */}
                <div className="lg:col-span-12">
                    <div className="glass-card shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        
                        <div className="p-10 flex flex-col md:flex-row items-center gap-12 relative z-10">
                            
                            {/* Visual Indicator */}
                            <div className="relative group/icon">
                                <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full scale-150 group-hover/icon:opacity-100 transition-opacity opacity-50" />
                                <div className={`size-32 md:size-48 rounded-[3rem] border-4 border-dashed flex items-center justify-center transition-all duration-700 shadow-inner ${status?.connected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'}`}>
                                    {loading ? (
                                        <Loader2 size={48} className="animate-spin text-emerald-500" />
                                    ) : status?.connected ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <CheckCircle2 size={64} className="text-emerald-500 animate-in zoom-in duration-500" />
                                            <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Activo</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <XCircle size={64} className="text-rose-500/20" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inactivo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 space-y-8 text-center md:text-left">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center md:justify-start gap-4">
                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                                            {status?.connected ? 'SERVIDOR CONECTADO' : 'SISTEMA DESCONECTADO'}
                                        </h2>
                                        {status?.connected && (
                                            <div className="px-4 py-1.5 bg-emerald-500 text-white text-[9px] font-black rounded-lg shadow-lg shadow-emerald-500/20 uppercase tracking-widest animate-pulse">
                                                En Línea
                                            </div>
                                        )}
                                    </div>
                                    
                                    {status?.connectedTo ? (
                                        <div className="flex items-center justify-center md:justify-start gap-3 text-slate-600 dark:text-emerald-400 font-bold text-lg">
                                            <Phone size={20} />
                                            <span>+{status.connectedTo}</span>
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 dark:text-white/40 font-medium">
                                            El sistema de notificaciones está pausado. Conecta un número para activar OTP y alertas.
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
                                    {!status?.connected ? (
                                        <button 
                                            onClick={handleConnect}
                                            disabled={actionLoading || status?.hasQR}
                                            className="btn-premium btn-primary px-10 py-5 text-[11px] tracking-[0.3em] shadow-xl active:scale-95 disabled:opacity-50 flex items-center gap-3"
                                        >
                                            {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <Power size={20} />}
                                            {status?.hasQR ? 'ESCANEANDO...' : 'CONECTAR WHATSAPP'}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleDisconnect}
                                            disabled={actionLoading}
                                            className="btn-premium px-10 py-5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 text-[11px] tracking-[0.3em] active:scale-95 disabled:opacity-50 flex items-center gap-3 transition-all"
                                        >
                                            {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <PowerOff size={20} />}
                                            DESCONECTAR BOT
                                        </button>
                                    )}

                                    <button 
                                        onClick={fetchStatus}
                                        className="btn-premium px-6 py-5 bg-white shadow-xl text-slate-400 hover:text-emerald-500 flex items-center justify-center transition-all active:rotate-180 duration-700"
                                        title="Recargar estado"
                                    >
                                        <RefreshCcw size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QR Section */}
                {!status?.connected && (
                    <div className="lg:col-span-12 animate-in slide-in-from-top-10 duration-700">
                        <div className="glass-card shadow-2xl p-12 flex flex-col md:flex-row items-center gap-16 border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
                            {/* Background decoration for offline/disconnected state */}
                            {!status?.hasQR && (
                                <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-[2px] z-10 flex items-center justify-center p-8 text-center">
                                    <div className="max-w-md space-y-6">
                                        <div className="size-20 bg-slate-200 dark:bg-white/10 rounded-3xl mx-auto flex items-center justify-center text-slate-400">
                                            {status?.status === 'offline' ? <AlertTriangle size={40} /> : <QrCode size={40} />}
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                                {status?.status === 'offline' ? 'BOT FUERA DE LÍNEA' : 'CÓDIGO QR NO GENERADO'}
                                            </h4>
                                            <p className="text-sm text-slate-500 dark:text-white/40 font-medium">
                                                {status?.status === 'offline' 
                                                    ? 'El servidor central del bot no está respondiendo. Por favor, reinicia el servicio manualmete en el servidor.' 
                                                    : 'Haz clic en el botón de "CONECTAR WHATSAPP" arriba para generar un nuevo código de vinculación.'}
                                            </p>
                                        </div>
                                        {!status?.hasQR && status?.status !== 'offline' && (
                                            <button 
                                                onClick={handleConnect}
                                                disabled={actionLoading}
                                                className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                Generar QR ahora
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white p-10 rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border-8 border-slate-50 relative group/qr">
                                <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-[3.5rem] animate-pulse" />
                                {status?.qr ? (
                                    <QRCodeSVG value={status.qr} size={280} level="H" />
                                ) : (
                                    <div className="size-[280px] flex items-center justify-center text-slate-300">
                                        <Loader2 size={48} className="animate-spin" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-10">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <QrCode size={24} className="text-emerald-500" />
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Paso 1: Escaneo</span>
                                    </div>
                                    <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">VINCULAR DISPOSITIVO</h3>
                                    <p className="text-slate-500 dark:text-white/40 font-medium text-lg leading-relaxed">
                                        Abre WhatsApp en tu teléfono, ve a <strong>Ajustes &gt; Dispositivos vinculados</strong> y escanea este código para activar el bot central.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div className="bg-white/50 dark:bg-black/20 p-6 rounded-3xl border border-white/20 flex items-start gap-4">
                                        <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-500">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">Conexión Segura</p>
                                            <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1">Cifrado de extremo a extremo nativo.</p>
                                        </div>
                                    </div>
                                    <div className="bg-white/50 dark:bg-black/20 p-6 rounded-3xl border border-white/20 flex items-start gap-4">
                                        <div className="bg-amber-500/10 p-3 rounded-2xl text-amber-500">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">QR Dinámico</p>
                                            <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1">Se actualiza automáticamente cada 30s.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info Cards */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-10 space-y-6">
                        <div className="size-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <MessageCircle size={28} />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Mensajería Pro</h4>
                        <p className="text-xs text-slate-500 dark:text-white/40 leading-relaxed font-medium">
                            El bot manejará automáticamente el envío de OTP, confirmación de reservas y reporte de métricas sin costo adicional por mensaje.
                        </p>
                    </div>
                    <div className="glass-card p-10 space-y-6">
                        <div className="size-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <AlertTriangle size={28} />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Reconexión</h4>
                        <p className="text-xs text-slate-500 dark:text-white/40 leading-relaxed font-medium">
                            Si el bot se desconecta por inactividad, puedes reiniciarlo desde aquí sin necesidad de volver a escanear si la sesión persiste.
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-4 glass-card p-10 flex flex-col justify-between bg-slate-900 dark:bg-emerald-950 border-emerald-500/20 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                    <div className="space-y-6 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400">Estado de Servidor</span>
                        <h4 className="text-4xl font-black italic tracking-tighter leading-none">BOT<br/>CENTRAL</h4>
                        <div className="h-1 w-12 bg-emerald-500 rounded-full" />
                    </div>
                    <div className="pt-10 flex items-center justify-between relative z-10">
                        <div className="space-y-1">
                            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Latencia</p>
                            <p className="text-xl font-black italic">~150ms</p>
                        </div>
                        <div className="size-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <ChevronRight />
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {message && (
                <div className={`fixed bottom-10 right-10 p-6 rounded-[2.5rem] shadow-2xl z-[100] animate-in slide-in-from-bottom-5 duration-500 flex items-center gap-4 ${message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {message.type === 'success' ? <CheckCircle2 /> : <XCircle />}
                    <span className="text-[11px] font-black uppercase tracking-widest">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
                        <RefreshingCcw size={16} className="rotate-45" />
                    </button>
                </div>
            )}
        </div>
    );
}

function RefreshingCcw({ size, className }: { size: number, className: string }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24" />
            <path d="M21 3v9h-9" />
        </svg>
    );
}
