'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Save, Info, Loader2, CheckCircle2, RotateCcw, Plus, Trash2, MapPin, ExternalLink, Edit2, X, Car, Bus, ShieldCheck, Accessibility, Store, ArrowRight } from 'lucide-react';
import MobileBusiness from '@/components/admin/mobile/MobileBusiness';
import FeatureGate from '@/components/ui/FeatureGate';
import ImageUploader from '@/components/ui/ImageUploader';
import { useSession } from 'next-auth/react';
import ProductsConfig from '@/components/admin/ProductsConfig';

import { DEFAULT_CONFIGS } from '@/lib/constants/defaultConfigs';
import BusinessLocationPicker from '@/components/admin/BusinessLocationPicker';
import { isGymBusiness } from '@/modules/gym/utils/gymHelper';
import GymAccessConfigSection from '@/components/admin/gym/GymAccessConfigSection';

export default function ConfigMensajesPage() {
    const { data: session } = useSession();
    const tipoNegocio = (session?.user as any)?.tipoNegocio || 'RESERVA';
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

    const activeTipo = (negocio?.tipoNegocio || tipoNegocio || '').toUpperCase();
    const blueprintId = (typeof negocio?.configuracion === 'string'
        ? (() => { try { return JSON.parse(negocio.configuracion).blueprintId; } catch { return undefined; } })()
        : negocio?.configuracion?.blueprintId);

    const isStoreOrProducts =
        activeTipo === 'PRODUCTOS' ||
        activeTipo === 'TIENDA' ||
        activeTipo === 'STORE' ||
        activeTipo === 'ECOMMERCE' ||
        blueprintId === 'STORE';

    if (isStoreOrProducts) {
        return (
            <ProductsConfig 
                negocio={negocio} 
                onSaveNegocio={handleSaveNegocio} 
                saving={saving === 'NEGOCIO'} 
                message={message} 
            />
        );
    }

    const isGym = isGymBusiness(negocio) || 
        ['GIMNASIO', 'GYM', 'FITNESS'].includes((negocio?.tipoNegocio || tipoNegocio || '').toUpperCase()) ||
        (negocio?.nombre || '').toUpperCase().includes('VORTEX') ||
        (negocio?.nombre || '').toUpperCase().includes('FITNESS') ||
        (negocio?.nombre || '').toUpperCase().includes('GYM');

    const [activeTab, setActiveTab] = useState<string>('accesos');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam) {
                setActiveTab(tabParam);
            } else if (isGym) {
                setActiveTab('accesos');
            } else {
                setActiveTab('todos');
            }
        }
    }, [isGym]);

    return (
        <>
            {/* VISTA MÓVIL */}
            <div className="md:hidden -mx-5 -mt-5 space-y-4">
                {isGym && (
                    <div className="p-4">
                        <GymAccessConfigSection negocio={negocio} primaryColor={primaryColor} />
                    </div>
                )}
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Configuración de Negocio</h1>
                        <p className="text-gray-500 text-sm font-medium">
                            {isGym ? 'Personaliza los métodos de acceso de socios, mensajes y parámetros de tu Gimnasio.' : 'Personaliza los mensajes y parámetros operativos de tu Negocio.'}
                        </p>
                    </div>

                    {isGym && (
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                            <button
                                type="button"
                                onClick={() => setActiveTab('accesos')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                                    activeTab === 'accesos'
                                        ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/60'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Acceso de Socios
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('mensajes')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                                    activeTab === 'mensajes'
                                        ? 'bg-white text-gray-900 shadow-sm border border-slate-200/60'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Mensajes
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('todos')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                                    activeTab === 'todos'
                                        ? 'bg-white text-gray-900 shadow-sm border border-slate-200/60'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Ver Todo
                            </button>
                        </div>
                    )}
                </div>

                {message && (
                    <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? '' : 'bg-red-50 text-red-700 border border-red-100'}`}
                         style={message.type === 'success' ? { backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)', color: 'var(--primary-color)', border: '1px solid color-mix(in srgb, var(--primary-color), transparent 90%)' } : {}}>
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <RotateCcw size={20} />}
                        <span className="text-sm font-bold">{message.text}</span>
                    </div>
                )}

                {/* 1. SECCIÓN DE ACCESO DE SOCIOS (EN PRIMER LUGAR PARA GIMNASIOS) */}
                {isGym && (activeTab === 'accesos' || activeTab === 'todos') && (
                    <div className="animate-in fade-in duration-300">
                        <GymAccessConfigSection 
                            negocio={negocio} 
                            primaryColor={primaryColor} 
                        />
                    </div>
                )}

                {/* 2. MENSAJES Y OPERACIONES */}
                {(activeTab === 'mensajes' || activeTab === 'todos' || !isGym) && (
                    <div className="space-y-8 animate-in fade-in duration-300">
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
                    </div>
                )}

                <DeliveryLogisticsConfigSection 
                    configs={configs}
                    onSaveConfig={handleSave}
                    primaryColor={primaryColor}
                />

                {/* Banner Sucursales / Ubicaciones */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
                    <div className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/60 shrink-0">
                                <Store size={28} />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 leading-tight uppercase tracking-tight text-lg">
                                    Gestión de Sucursales y Ubicaciones
                                </h3>
                                <p className="text-gray-500 text-sm mt-1 max-w-xl">
                                    Ahora puedes administrar todas tus sedes físicas, cajas registradoras, fotos de fachada, enlaces de Google Maps y características (parqueadero, transporte, zona segura, acceso fácil) desde el módulo centralizado de Sucursales.
                                </p>
                            </div>
                        </div>

                        <Link
                            href="/admin/sucursales"
                            className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 shrink-0"
                        >
                            Ir a Sucursales
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
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

function DeliveryLogisticsConfigSection({ configs, onSaveConfig, primaryColor }: any) {
    const [baseCost, setBaseCost] = useState(configs.costoEnvio || '1.50');
    const [kmCost, setKmCost] = useState(configs.costoEnvioPorKm || '0.30');
    const [minOrder, setMinOrder] = useState(configs.montoMinimoPedido || '0.00');
    const [lat, setLat] = useState(configs.latitudNegocio || '-0.180653');
    const [lng, setLng] = useState(configs.longitudNegocio || '-78.467838');

    useEffect(() => {
        if (configs.costoEnvio !== undefined) setBaseCost(configs.costoEnvio);
        if (configs.costoEnvioPorKm !== undefined) setKmCost(configs.costoEnvioPorKm);
        if (configs.montoMinimoPedido !== undefined) setMinOrder(configs.montoMinimoPedido);
        if (configs.latitudNegocio !== undefined) setLat(configs.latitudNegocio);
        if (configs.longitudNegocio !== undefined) setLng(configs.longitudNegocio);
    }, [configs]);

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden p-8 space-y-6">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                    <h3 className="font-black text-gray-900 leading-tight uppercase tracking-tight flex items-center gap-2">
                        <Car size={20} className="text-purple-600" />
                        Tarifas de Logística (Retiro & Entrega a Domicilio)
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">Configura el costo base de retiro/entrega y el recargo dinámico por distancia GPS desde tu local.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Tarifa Base Retiro & Entrega ($)</label>
                    <input
                        type="number"
                        step="0.10"
                        value={baseCost}
                        onChange={(e) => setBaseCost(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Tarifa mínima fija aplicada a solicitudes a domicilio.</p>
                </div>

                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Costo por Kilómetro Adicional ($/km)</label>
                    <input
                        type="number"
                        step="0.05"
                        value={kmCost}
                        onChange={(e) => setKmCost(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Multiplicador sumado por cada km desde el local al cliente.</p>
                </div>

                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Monto Mínimo de Pedido ($)</label>
                    <input
                        type="number"
                        step="1.00"
                        value={minOrder}
                        onChange={(e) => setMinOrder(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Monto mínimo en servicios para permitir delivery ($0 para desactivar).</p>
                </div>
            </div>

            {/* Coordenadas GPS del Local */}
            <div className="pt-4 border-t border-gray-100">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Ubicación Geográfica del Local (Mapa GPS)
                </label>
                <BusinessLocationPicker
                    lat={lat}
                    lng={lng}
                    primaryColor={primaryColor}
                    onChange={(newLat, newLng) => {
                        setLat(newLat);
                        setLng(newLng);
                    }}
                />
            </div>

            <div className="flex justify-end pt-2">
                <button
                    onClick={async () => {
                        await onSaveConfig('costoEnvio', baseCost);
                        await onSaveConfig('costoEnvioPorKm', kmCost);
                        await onSaveConfig('montoMinimoPedido', minOrder);
                        await onSaveConfig('latitudNegocio', lat);
                        await onSaveConfig('longitudNegocio', lng);
                        alert('✅ Parámetros de tarifa de envío y distancia guardados con éxito');
                    }}
                    className="px-8 py-4 rounded-2xl text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Save size={16} />
                    Guardar Tarifas de Envío
                </button>
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
