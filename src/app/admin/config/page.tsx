'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Save, Info, Loader2, CheckCircle2, RotateCcw, Plus, Trash2, MapPin, ExternalLink, Edit2, X, Car, Bus, ShieldCheck, Accessibility } from 'lucide-react';
import MobileBusiness from '@/components/admin/mobile/MobileBusiness';
import FeatureGate from '@/components/ui/FeatureGate';
import ImageUploader from '@/components/ui/ImageUploader';

export const DEFAULT_CONFIGS = {
    CONFIRMATION_MSG: '✅ ¡Hola {{nombre}}! Tu cita en *{{negocio}}* ha sido *CONFIRMADA*. 💆\n\n✨ *Servicio:* {{servicio}}\n📅 *Fecha:* {{fecha}}\n⏰ *Hora:* {{hora}}\n\n📲 *Consulta los detalles aquí:*\n{{link_reserva}}\n\n¡Te esperamos!',
    PENDING_MSG: '👋 ¡Hola {{nombre}}! Hemos recibido tu solicitud de cita en *{{negocio}}* para el {{fecha}} a las {{hora}}.\n\n⏳ *Estado:* Pendiente de confirmación.\n\n📲 *Contacto directo:* \nhttps://wa.me/{{telefono_negocio}}\n\nTe notificaremos por aquí lo antes posible.',
    REMINDER_MSG: '⏰ Recordatorio: Tienes una cita hoy en *{{negocio}}* a las {{hora}}. ¡Te esperamos! 💆',
    BOOKING_TIMEOUT: '10',
    REMINDER_DAY_ENABLED: '1',
    REMINDER_DAY_TIME: '08:00',
    REMINDER_DAY_MSG: '☀️ ¡Buen día {{nombre}}! Te recordamos que hoy tienes una cita en *{{negocio}}* a las {{hora}}. ¡Te esperamos!',
    REMINDER_2H_ENABLED: '1',
    REMINDER_2H_MSG: '⏰ ¡Hola {{nombre}}! En 2 horas es tu cita en *{{negocio}}*. ¡Nos vemos pronto!'
};

export default function ConfigMensajesPage() {
    const [configs, setConfigs] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');
    const [ubicaciones, setUbicaciones] = useState<any[]>([]);
    const [negocio, setNegocio] = useState<any>(null);

    const fetchConfigs = async () => {
        try {
            const [res, uRes, nRes] = await Promise.all([
                fetch('/api/config'),
                fetch('/api/config/ubicaciones'),
                fetch('/api/negocio')
            ]);
            
            if (res.ok) {
                const data = await res.json();
                const configMap: Record<string, string> = {};
                data.forEach((c: any) => {
                    configMap[c.clave] = c.valor;
                });
                setConfigs(configMap);
            }

            if (uRes.ok) setUbicaciones(await uRes.json());
            if (nRes.ok) {
                const nData = await nRes.json();
                setNegocio(nData);
                if (nData.colorPrimario) setPrimaryColor(nData.colorPrimario);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();

        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (color) setPrimaryColor(color);
    }, []);

    const handleSaveNegocio = async (data: any) => {
        setSaving('NEGOCIO');
        setMessage(null);
        try {
            const res = await fetch('/api/negocio', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Datos del negocio actualizados' });
                const updated = await res.json();
                setNegocio(updated);
                if (updated.colorPrimario) {
                    setPrimaryColor(updated.colorPrimario);
                    document.documentElement.style.setProperty('--primary-color', updated.colorPrimario);
                }
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: 'Error al actualizar negocio' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de conexión' });
        } finally {
            setSaving(null);
        }
    };

    const handleSave = async (clave: string) => {
        setSaving(clave);
        setMessage(null);
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clave, valor: configs[clave] || DEFAULT_CONFIGS[clave as keyof typeof DEFAULT_CONFIGS] }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: 'Error al guardar la configuración' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de conexión' });
        } finally {
            setSaving(null);
        }
    };

    const handleReset = (clave: string) => {
        setConfigs(prev => ({ ...prev, [clave]: DEFAULT_CONFIGS[clave as keyof typeof DEFAULT_CONFIGS] }));
    };

    const handleDeleteUbicacion = async (id: string) => {
        if (!confirm('¿Eliminar esta ubicación?')) return;
        try {
            const res = await fetch(`/api/config/ubicaciones/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setUbicaciones(prev => prev.filter(u => u.id !== id));
            }
        } catch (e) { console.error(e); }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin mb-4" size={32} style={{ color: 'var(--primary-color)' }} />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando Configuración...</p>
            </div>
        );
    }

    return (
        <>
            {/* VISTA MÓVIL */}
            <div className="md:hidden -mx-5 -mt-5">
                <MobileBusiness 
                    configs={configs}
                    negocio={negocio}
                    ubicaciones={ubicaciones}
                    primaryColor={primaryColor}
                    onSaveConfig={handleSave}
                    onResetConfig={handleReset}
                    onConfigChange={(clave, val) => setConfigs(prev => ({ ...prev, [clave]: val }))}
                    onSaveNegocio={handleSaveNegocio}
                    onDeleteUbicacion={handleDeleteUbicacion}
                    onEditUbicacion={(u) => {
                        const el = document.getElementById('ubicaciones-manager');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    onNewUbicacion={() => {
                        const el = document.getElementById('ubicaciones-manager');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    saving={saving}
                />
            </div>

            {/* VISTA ESCRITORIO */}
            <div className="hidden md:block space-y-8 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Configuración de Negocio</h1>
                    <p className="text-gray-500 text-sm font-medium">Personaliza los mensajes y parámetros operativos de tu Spa.</p>
                </div>

                {message && (
                    <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? '' : 'bg-red-50 text-red-700 border border-red-100'}`}
                         style={message.type === 'success' ? { backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)', color: 'var(--primary-color)', border: '1px solid color-mix(in srgb, var(--primary-color), transparent 90%)' } : {}}>
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <RotateCcw size={20} />}
                        <span className="text-sm font-bold">{message.text}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-8">
                    <MessageConfigItem
                        title="Reserva Recibida (Pendiente)"
                        description="Mensaje enviado inmediatamente después de que el cliente solicita una reserva."
                        clave="PENDING_MSG"
                        value={configs.PENDING_MSG || DEFAULT_CONFIGS.PENDING_MSG}
                        onChange={(val: any) => setConfigs(prev => ({ ...prev, PENDING_MSG: val }))}
                        onSave={() => handleSave('PENDING_MSG')}
                        onReset={() => handleReset('PENDING_MSG')}
                        isSaving={saving === 'PENDING_MSG'}
                    />

                    <MessageConfigItem
                        title="Reserva Confirmada"
                        description="Mensaje enviado cuando cambias el estado de la reserva a 'CONFIRMADA'."
                        clave="CONFIRMATION_MSG"
                        value={configs.CONFIRMATION_MSG || DEFAULT_CONFIGS.CONFIRMATION_MSG}
                        onChange={(val: any) => setConfigs(prev => ({ ...prev, CONFIRMATION_MSG: val }))}
                        onSave={() => handleSave('CONFIRMATION_MSG')}
                        onReset={() => handleReset('CONFIRMATION_MSG')}
                        isSaving={saving === 'CONFIRMATION_MSG'}
                    />
                </div>

                {/* --- RECORDATORIOS --- */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
                    <div className="p-8 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h3 className="font-black text-gray-900 leading-tight uppercase tracking-tight">Recordatorios Automáticos</h3>
                                <p className="text-gray-400 text-sm">Configura los mensajes que se enviarán antes de la cita.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Recordatorio del Día */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: 'var(--primary-color)' }}>
                                        Recordatorio del Día
                                    </label>
                                    <button 
                                        onClick={() => setConfigs(prev => ({ ...prev, REMINDER_DAY_ENABLED: (prev.REMINDER_DAY_ENABLED === '0' ? '1' : '0') }))}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all shadow-sm ${configs.REMINDER_DAY_ENABLED === '0' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
                                    >
                                        {configs.REMINDER_DAY_ENABLED === '0' ? 'Desactivado' : 'Activado'}
                                    </button>
                                </div>
                                
                                <div className={`space-y-4 transition-opacity duration-300 ${configs.REMINDER_DAY_ENABLED === '0' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Hora de envío</label>
                                        <input
                                            type="time"
                                            value={configs.REMINDER_DAY_TIME || DEFAULT_CONFIGS.REMINDER_DAY_TIME}
                                            onChange={(e) => setConfigs(prev => ({ ...prev, REMINDER_DAY_TIME: e.target.value }))}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 outline-none transition-all"
                                            style={ { '--tw-ring-color': primaryColor } as any }
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Mensaje</label>
                                        <textarea
                                            className="w-full p-4 bg-gray-50 border border-transparent rounded-xl outline-none transition-all text-sm font-medium min-h-[100px] resize-none leading-relaxed text-gray-700"
                                            value={configs.REMINDER_DAY_MSG || DEFAULT_CONFIGS.REMINDER_DAY_MSG}
                                            onChange={(e) => setConfigs(prev => ({ ...prev, REMINDER_DAY_MSG: e.target.value }))}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={async () => { await handleSave('REMINDER_DAY_ENABLED'); await handleSave('REMINDER_DAY_TIME'); await handleSave('REMINDER_DAY_MSG'); }} disabled={saving !== null} className="text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition shadow-md" style={{ backgroundColor: 'var(--primary-color)' }}>
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Recordatorio 2 Horas */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: 'var(--primary-color)' }}>
                                        Recordatorio 2 Horas Antes
                                    </label>
                                    <button 
                                        onClick={() => setConfigs(prev => ({ ...prev, REMINDER_2H_ENABLED: (prev.REMINDER_2H_ENABLED === '0' ? '1' : '0') }))}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all shadow-sm ${configs.REMINDER_2H_ENABLED === '0' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
                                    >
                                        {configs.REMINDER_2H_ENABLED === '0' ? 'Desactivado' : 'Activado'}
                                    </button>
                                </div>
                                
                                <div className={`space-y-4 transition-opacity duration-300 ${configs.REMINDER_2H_ENABLED === '0' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block text-transparent select-none">Espaciador</label>
                                        <div className="w-full px-4 py-3 bg-transparent rounded-xl text-sm font-bold text-gray-400 flex items-center h-[46px]">
                                            Se envía 2 horas antes de la cita
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Mensaje</label>
                                        <textarea
                                            className="w-full p-4 bg-gray-50 border border-transparent rounded-xl outline-none transition-all text-sm font-medium min-h-[100px] resize-none leading-relaxed text-gray-700"
                                            value={configs.REMINDER_2H_MSG || DEFAULT_CONFIGS.REMINDER_2H_MSG}
                                            onChange={(e) => setConfigs(prev => ({ ...prev, REMINDER_2H_MSG: e.target.value }))}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={async () => { await handleSave('REMINDER_2H_ENABLED'); await handleSave('REMINDER_2H_MSG'); }} disabled={saving !== null} className="text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition shadow-md" style={{ backgroundColor: 'var(--primary-color)' }}>
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
                    <div className="p-8 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h3 className="font-black text-gray-900 leading-tight uppercase tracking-tight">Flujo de Reservas</h3>
                                <p className="text-gray-400 text-sm">Configura el comportamiento del sistema de reservas.</p>
                            </div>
                            <div className="p-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}>
                                <RotateCcw size={18} className="cursor-pointer" onClick={() => handleReset('BOOKING_TIMEOUT')} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: 'var(--primary-color)' }}>
                                            Autoconfirmar Reservas
                                        </label>
                                        <button 
                                            onClick={() => setConfigs(prev => ({ ...prev, BOOKING_TIMEOUT: (prev.BOOKING_TIMEOUT === '0' ? '15' : '0') }))}
                                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all shadow-sm ${configs.BOOKING_TIMEOUT === '0' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}
                                        >
                                            {configs.BOOKING_TIMEOUT === '0' ? 'Activado' : 'Desactivado'}
                                        </button>
                                    </div>
                                    <div className={`flex items-center gap-4 transition-opacity duration-300 ${configs.BOOKING_TIMEOUT === '0' ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                                        <input
                                            type="range"
                                            min="5"
                                            max="60"
                                            step="5"
                                            value={configs.BOOKING_TIMEOUT === '0' ? '15' : (configs.BOOKING_TIMEOUT || DEFAULT_CONFIGS.BOOKING_TIMEOUT)}
                                            onChange={(e) => setConfigs(prev => ({ ...prev, BOOKING_TIMEOUT: e.target.value }))}
                                            className="flex-1"
                                            style={{ accentColor: 'var(--primary-color)' }}
                                        />
                                        <div className="w-16 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center font-black text-gray-900 text-lg shadow-inner">
                                            {configs.BOOKING_TIMEOUT === '0' ? '--' : (configs.BOOKING_TIMEOUT || DEFAULT_CONFIGS.BOOKING_TIMEOUT)}
                                        </div>
                                    </div>
                                    {configs.BOOKING_TIMEOUT === '0' && (
                                        <p className="text-[10px] text-gray-400 font-bold mt-3">
                                            Las reservas pasarán directamente a confirmadas sin tiempo de espera.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => handleSave('BOOKING_TIMEOUT')}
                                    disabled={saving === 'BOOKING_TIMEOUT'}
                                    className="flex items-center gap-2 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-lg disabled:opacity-50"
                                    style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--primary-color), transparent 80%)' }}
                                >
                                    {saving === 'BOOKING_TIMEOUT' ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    Guardar Configuración
                                </button>
                            </div>
                        </div>
                    </div>
                </div>


                <FeatureGate feature="whatsapp_notifications" fallbackMessage="Actualiza tu plan para activar notificaciones automáticas por WhatsApp.">
                    <WhatsAppConfigSection 
                        negocio={negocio} 
                        onSave={handleSaveNegocio} 
                        isSaving={saving === 'NEGOCIO'} 
                        primaryColor={primaryColor} 
                    />
                </FeatureGate>



                <UbicacionesManager />
            </div>
        </>
    );
}

function WhatsAppConfigSection({ negocio, onSave, isSaving, primaryColor }: any) {
    const [localWhatsapp, setLocalWhatsapp] = useState(negocio?.whatsapp || '');
    const [localNotifications, setLocalNotifications] = useState(negocio?.whatsapp_notifications || false);

    useEffect(() => {
        setLocalWhatsapp(negocio?.whatsapp || '');
        setLocalNotifications(negocio?.whatsapp_notifications || false);
    }, [negocio]);

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
            <div className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h3 className="font-black text-gray-900 leading-tight uppercase tracking-tight">Canal de WhatsApp</h3>
                        <p className="text-gray-400 text-sm">Configura el número donde recibirás las notificaciones de reservas.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Número del Negocio</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        value={localWhatsapp}
                                        onChange={(e) => setLocalWhatsapp(e.target.value)}
                                        placeholder="Ej: 593959997521"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 outline-none transition-all"
                                        style={ { '--tw-ring-color': primaryColor } as any }
                                    />
                                    <MessageSquare size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-tight">Incluye código de país sin el signo +</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pb-1">
                        <button 
                            onClick={() => onSave({ whatsapp: localWhatsapp })}
                            disabled={isSaving}
                            className="px-10 py-4 rounded-2xl text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Guardar WhatsApp
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


function UbicacionesManager() {
    const [ubicaciones, setUbicaciones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [nombre, setNombre] = useState("");
    const [direccion, setDireccion] = useState("");
    const [mapUrl, setMapUrl] = useState("");
    const [telefono, setTelefono] = useState("");
    const [horario, setHorario] = useState("");
    const [imagenUrl, setImagenUrl] = useState("");
    
    // Características booleanas (Toggles)
    const [tieneParqueadero, setTieneParqueadero] = useState(false);
    const [tieneTransporte, setTieneTransporte] = useState(false);
    const [tieneZonaSegura, setTieneZonaSegura] = useState(false);
    const [tieneAccesoFacil, setTieneAccesoFacil] = useState(false);

    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
 
    const fetchUbicaciones = async () => {
        try {
            const res = await fetch('/api/config/ubicaciones');
            if (res.ok) setUbicaciones(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
 
    useEffect(() => { fetchUbicaciones(); }, []);
 
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
 
        if (!nombre.trim()) {
            setError("El nombre de la sede es obligatorio");
            return;
        }
 
        setAdding(true);
        try {
            const url = editId ? `/api/config/ubicaciones/${editId}` : '/api/config/ubicaciones';
            const method = editId ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    nombre: nombre.trim(), 
                    direccion: direccion.trim() || null, 
                    mapUrl: mapUrl.trim() || null,
                    telefono: telefono.trim() || null,
                    horario: horario.trim() || null,
                    imagenUrl: imagenUrl.trim() || null,
                    tieneParqueadero,
                    tieneTransporte,
                    tieneZonaSegura,
                    tieneAccesoFacil
                }),
            });
            
            const data = await res.json();
            
            if (res.ok) {
                setSuccess(editId ? "Ubicación actualizada correctamente" : "Ubicación creada correctamente");
                if (!editId) {
                    setNombre("");
                    setDireccion("");
                    setMapUrl("");
                    setTelefono("");
                    setHorario("");
                    setImagenUrl("");
                    setTieneParqueadero(false);
                    setTieneTransporte(false);
                    setTieneZonaSegura(false);
                    setTieneAccesoFacil(false);
                }
                fetchUbicaciones();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(data.error || "Error al guardar los cambios");
            }
        } catch { 
            setError("Error de conexión con el servidor"); 
        } finally { 
            setAdding(false); 
        }
    };
 
    const startEdit = (u: any) => {
        setEditId(u.id);
        setNombre(u.nombre);
        setDireccion(u.direccion || "");
        setMapUrl(u.mapUrl || "");
        setTelefono(u.telefono || "");
        setHorario(u.horario || "");
        setImagenUrl(u.imagenUrl || "");
        setTieneParqueadero(u.tieneParqueadero ?? false);
        setTieneTransporte(u.tieneTransporte ?? false);
        setTieneZonaSegura(u.tieneZonaSegura ?? false);
        setTieneAccesoFacil(u.tieneAccesoFacil ?? false);
        
        const element = document.getElementById('ubicaciones-manager');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
 
    const cancelEdit = () => {
        setEditId(null);
        setNombre("");
        setDireccion("");
        setMapUrl("");
        setTelefono("");
        setHorario("");
        setImagenUrl("");
        setTieneParqueadero(false);
        setTieneTransporte(false);
        setTieneZonaSegura(false);
        setTieneAccesoFacil(false);
    };
 
    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta ubicación?')) return;
        try {
            const res = await fetch(`/api/config/ubicaciones/${id}`, { method: 'DELETE' });
            if (res.ok) fetchUbicaciones();
        } catch (e) { console.error(e); }
    };

    return (
        <div id="ubicaciones-manager" className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
            <div className="p-8 space-y-6">
                <div className="space-y-1">
                    <h3 className="font-black text-gray-900 leading-tight uppercase tracking-tight">Sucursales / Ubicaciones</h3>
                    <p className="text-gray-400 text-sm">Gestiona las sucursales físicas de tu negocio.</p>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-xs font-black flex items-center gap-2">
                        <X size={16} /> {error}
                    </div>
                )}

                {success && (
                    <div className="p-4 border-2 rounded-2xl text-xs font-black flex items-center gap-2"
                         style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)', borderColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}>
                        <CheckCircle2 size={16} /> {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Nombre *</label>
                            <input
                                type="text" value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Sucursal Centro..."
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:border-[var(--primary-color)] transition-colors text-sm font-bold text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Dirección</label>
                            <input
                                type="text" value={direccion}
                                onChange={(e) => setDireccion(e.target.value)}
                                placeholder="Av. Mariscal Sucre N54-127"
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:border-[var(--primary-color)] transition-colors text-sm font-bold text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Link Google Maps</label>
                            <input
                                type="text" value={mapUrl}
                                onChange={(e) => setMapUrl(e.target.value)}
                                placeholder="https://maps..."
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:border-[var(--primary-color)] transition-colors text-sm font-bold text-gray-900"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Teléfono de contacto</label>
                            <input
                                type="text" value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                placeholder="099 123 4567"
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:border-[var(--primary-color)] transition-colors text-sm font-bold text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Horario de Atención</label>
                            <input
                                type="text" value={horario}
                                onChange={(e) => setHorario(e.target.value)}
                                placeholder="Lun - Dom 8:00 AM - 11:00 PM"
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:border-[var(--primary-color)] transition-colors text-sm font-bold text-gray-900"
                            />
                        </div>
                    </div>

                    {/* Imagen de Fachada / Local */}
                    <div className="p-4 bg-white rounded-2xl border border-gray-100/60">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Imagen de la Fachada (Opcional)</label>
                        <ImageUploader 
                            category="page"
                            currentUrl={imagenUrl}
                            onUploadSuccess={(media) => setImagenUrl(media.url)}
                            onRemove={() => setImagenUrl('')}
                            label="Subir foto de la sucursal"
                            aspect="landscape"
                        />
                    </div>

                    {/* Características de la ubicación con Toggles */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Características de la Ubicación</label>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Toggle Parqueadero */}
                            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-150 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-pink-50 text-pink-500 rounded-xl border border-pink-100/50">
                                        <Car size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">Parqueadero Disponible</p>
                                        <p className="text-[9px] text-gray-400 font-medium">Estacionamiento propio o convenio</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTieneParqueadero(!tieneParqueadero)}
                                    className={`w-11 h-6 rounded-full transition-all duration-300 relative border border-transparent ${tieneParqueadero ? 'bg-pink-500' : 'bg-gray-200'}`}
                                >
                                    <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 shadow-sm ${tieneParqueadero ? 'left-5.5' : 'left-0.5'}`} />
                                </button>
                            </div>

                            {/* Toggle Transporte */}
                            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-150 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl border border-indigo-100/50">
                                        <Bus size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">Transporte Cercano</p>
                                        <p className="text-[9px] text-gray-400 font-medium">Paradas de bus o metro a pocos metros</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTieneTransporte(!tieneTransporte)}
                                    className={`w-11 h-6 rounded-full transition-all duration-300 relative border border-transparent ${tieneTransporte ? 'bg-pink-500' : 'bg-gray-200'}`}
                                >
                                    <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 shadow-sm ${tieneTransporte ? 'left-5.5' : 'left-0.5'}`} />
                                </button>
                            </div>

                            {/* Toggle Zona Segura */}
                            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-150 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl border border-emerald-100/50">
                                        <ShieldCheck size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">Zona Segura</p>
                                        <p className="text-[9px] text-gray-400 font-medium">Sector vigilado, seguro y bien iluminado</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTieneZonaSegura(!tieneZonaSegura)}
                                    className={`w-11 h-6 rounded-full transition-all duration-300 relative border border-transparent ${tieneZonaSegura ? 'bg-pink-500' : 'bg-gray-200'}`}
                                >
                                    <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 shadow-sm ${tieneZonaSegura ? 'left-5.5' : 'left-0.5'}`} />
                                </button>
                            </div>

                            {/* Toggle Acceso Fácil */}
                            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-150 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-50 text-amber-500 rounded-xl border border-amber-100/50">
                                        <Accessibility size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">Acceso Fácil</p>
                                        <p className="text-[9px] text-gray-400 font-medium">Rampas de acceso, planta baja o ascensor</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTieneAccesoFacil(!tieneAccesoFacil)}
                                    className={`w-11 h-6 rounded-full transition-all duration-300 relative border border-transparent ${tieneAccesoFacil ? 'bg-pink-500' : 'bg-gray-200'}`}
                                >
                                    <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 shadow-sm ${tieneAccesoFacil ? 'left-5.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        {editId && (
                            <button type="button" onClick={cancelEdit} className="px-6 py-3 text-gray-400 font-bold uppercase text-[10px] hover:text-gray-600 transition-colors">Cancelar</button>
                        )}
                        <button type="submit" disabled={adding}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50 active:scale-[0.99] transition-all"
                        >
                            {editId ? 'Guardar Cambios' : 'Agregar Sucursal'}
                        </button>
                    </div>
                </form>
 
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ubicaciones.map((u: any) => (
                        <div key={u.id} className="bg-white rounded-3xl border border-gray-150 overflow-hidden shadow-sm hover:shadow-md transition relative flex flex-col justify-between">
                            {/* Fachada si existe */}
                            {u.imagenUrl ? (
                                <div className="w-full h-32 relative overflow-hidden bg-slate-100">
                                    <img 
                                        src={u.imagenUrl} 
                                        alt={u.nombre}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-12 bg-slate-50 border-b border-slate-100" />
                            )}
                            
                            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="font-black text-slate-800 uppercase text-sm tracking-tight block">{u.nombre}</span>
                                            {u.direccion && <p className="text-[10px] text-gray-400 font-semibold">{u.direccion}</p>}
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => startEdit(u)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition"><Edit2 size={13} /></button>
                                            <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"><Trash2 size={13} /></button>
                                        </div>
                                    </div>
                                    
                                    {(u.telefono || u.horario) && (
                                        <div className="pt-2 border-t border-slate-100 text-[9px] text-slate-400 font-bold space-y-1">
                                            {u.telefono && <p>📞 {u.telefono}</p>}
                                            {u.horario && <p>⏰ {u.horario}</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Chips de características configuradas */}
                                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                                    {u.tieneParqueadero && (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 text-[8px] font-black uppercase">
                                            <Car size={8} /> Parqueadero
                                        </span>
                                    )}
                                    {u.tieneTransporte && (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase">
                                            <Bus size={8} /> Transporte
                                        </span>
                                    )}
                                    {u.tieneZonaSegura && (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase">
                                            <ShieldCheck size={8} /> Segura
                                        </span>
                                    )}
                                    {u.tieneAccesoFacil && (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[8px] font-black uppercase">
                                            <Accessibility size={8} /> Acceso
                                        </span>
                                    )}
                                    {!u.tieneParqueadero && !u.tieneTransporte && !u.tieneZonaSegura && !u.tieneAccesoFacil && (
                                        <span className="text-[8px] text-slate-300 font-bold italic">Sin características definidas</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MessageConfigItem({ title, description, value, onChange, onSave, onReset, isSaving }: any) {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
            <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h3 className="font-black text-gray-900 leading-tight">{title}</h3>
                        <p className="text-gray-400 text-sm">{description}</p>
                    </div>
                    <button onClick={onReset} className="p-2 text-gray-400 hover:text-[var(--primary-color)] transition"><RotateCcw size={18} /></button>
                </div>
                <textarea
                    className="w-full p-6 bg-gray-50 border border-transparent rounded-2xl outline-none transition-all text-sm font-medium min-h-[120px] resize-none leading-relaxed text-gray-700"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                <div className="flex justify-end">
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
}
