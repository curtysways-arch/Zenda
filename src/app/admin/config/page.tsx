'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Save, Info, Loader2, CheckCircle2, RotateCcw, Plus, Trash2, MapPin, ExternalLink, Edit2, X, Car, Bus, ShieldCheck, Accessibility, Store, ArrowRight } from 'lucide-react';
import MobileBusiness from '@/components/admin/mobile/MobileBusiness';
import FeatureGate from '@/components/ui/FeatureGate';
import ImageUploader from '@/components/ui/ImageUploader';
import { useSession } from 'next-auth/react';
import ProductsConfig from '@/components/admin/ProductsConfig';

import { DEFAULT_CONFIGS, DEFAULT_CONFIGS_GYM, DEFAULT_CONFIGS_DENTAL, DEFAULT_CONFIGS_LAUNDRY, getDefaultConfigs } from '@/lib/constants/defaultConfigs';
import BusinessLocationPicker from '@/components/admin/BusinessLocationPicker';
import { isGymBusiness } from '@/modules/gym/utils/gymHelper';
import GymAccessConfigSection from '@/components/admin/gym/GymAccessConfigSection';
import PhoneInput from '@/components/ui/PhoneInput';

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
    const [activeTab, setActiveTab] = useState<string>('mensajes');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam) {
                setActiveTab(tabParam);
            }
        }
    }, []);

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

    let cfg: any = {};
    if (typeof negocio?.configuracion === 'string') {
        try { cfg = JSON.parse(negocio.configuracion); } catch { cfg = {}; }
    } else {
        cfg = negocio?.configuracion || {};
    }
    const caps = cfg.activeCapabilities || cfg.capabilities || {};
    const effectiveCaps = cfg.effectiveCapabilities || {};

    const activeTipo = (negocio?.tipoNegocio || cfg.tipoNegocio || tipoNegocio || '').toUpperCase().trim();
    const blueprintId = (cfg.blueprintId || '').toUpperCase().trim();
    const slugUpper = (negocio?.slug || '').toUpperCase().trim();
    const nameUpper = (negocio?.nombre || '').toUpperCase().trim();

    const isGym = isGymBusiness(negocio) || 
        ['GIMNASIO', 'GYM', 'FITNESS'].includes(activeTipo) ||
        blueprintId === 'GYM' || blueprintId === 'GIMNASIO' ||
        nameUpper.includes('VORTEX') || nameUpper.includes('FITNESS') || nameUpper.includes('GYM') ||
        slugUpper.includes('gym') || slugUpper.includes('fitness');

    const isDental = activeTipo === 'ODONTOLOGIA' || activeTipo === 'DENTAL' || activeTipo === 'DENTISTA' ||
        blueprintId === 'DENTAL' || blueprintId === 'DENTISTA' ||
        nameUpper.includes('DENTAL') || nameUpper.includes('ODONTOL') || nameUpper.includes('DENTISTA') ||
        slugUpper.includes('dental') || slugUpper.includes('odontol') || slugUpper.includes('dentista');

    const isShoeCareOrLaundry = activeTipo === 'SHOE_CARE' || activeTipo === 'LAVANDERIA' || activeTipo === 'ORDENES-SERVICIO' ||
        blueprintId === 'SHOE_CARE' || blueprintId === 'LAVANDERIA' ||
        nameUpper.includes('LAVADO') || nameUpper.includes('WASH') || nameUpper.includes('SHOE') || nameUpper.includes('BUBBLE') ||
        slugUpper.includes('lavado') || slugUpper.includes('wash') || slugUpper.includes('shoe') || slugUpper.includes('bubble');

    const isStoreOrProducts =
        activeTipo === 'PRODUCTOS' ||
        activeTipo === 'TIENDA' ||
        activeTipo === 'STORE' ||
        activeTipo === 'ECOMMERCE' ||
        blueprintId === 'STORE';

    const currentDefaults = isGym 
        ? DEFAULT_CONFIGS_GYM 
        : isDental 
            ? DEFAULT_CONFIGS_DENTAL 
            : isShoeCareOrLaundry 
                ? DEFAULT_CONFIGS_LAUNDRY 
                : DEFAULT_CONFIGS;

    const getConfigValue = (clave: string): string => {
        const val = configs[clave];
        if (isGym) {
            if (!val) return (DEFAULT_CONFIGS_GYM as any)[clave] || '';
            const lower = val.toLowerCase();
            if (clave === 'PENDING_MSG' && (lower.includes('solicitud de cita') || lower.includes('cita en'))) {
                return DEFAULT_CONFIGS_GYM.PENDING_MSG;
            }
            if (clave === 'CONFIRMATION_MSG' && (lower.includes('cita en') || val.includes('💆') || lower.includes('servicio:'))) {
                return DEFAULT_CONFIGS_GYM.CONFIRMATION_MSG;
            }
            if (clave === 'REMINDER_DAY_MSG' && (lower.includes('cita en') || lower.includes('tienes una cita'))) {
                return DEFAULT_CONFIGS_GYM.REMINDER_DAY_MSG;
            }
            if (clave === 'REMINDER_2H_MSG' && (lower.includes('es tu cita') || lower.includes('cita en'))) {
                return DEFAULT_CONFIGS_GYM.REMINDER_2H_MSG;
            }
            return val;
        }
        if (isDental) {
            if (!val) return (DEFAULT_CONFIGS_DENTAL as any)[clave] || '';
            if (clave === 'CONFIRMATION_MSG' && val.includes('💆')) {
                return DEFAULT_CONFIGS_DENTAL.CONFIRMATION_MSG;
            }
            return val;
        }
        if (isShoeCareOrLaundry) {
            if (!val) return (DEFAULT_CONFIGS_LAUNDRY as any)[clave] || '';
            const lower = val.toLowerCase();
            if (clave === 'PENDING_MSG' && (lower.includes('solicitud de cita') || lower.includes('cita en') || lower.includes('solicita una reserva'))) {
                return DEFAULT_CONFIGS_LAUNDRY.PENDING_MSG;
            }
            if (clave === 'CONFIRMATION_MSG' && (lower.includes('cita en') || val.includes('💆') || lower.includes('tu cita'))) {
                return DEFAULT_CONFIGS_LAUNDRY.CONFIRMATION_MSG;
            }
            if (clave === 'REMINDER_DAY_MSG' && (lower.includes('tienes una cita') || lower.includes('cita en'))) {
                return DEFAULT_CONFIGS_LAUNDRY.REMINDER_DAY_MSG;
            }
            if (clave === 'REMINDER_2H_MSG' && (lower.includes('es tu cita') || lower.includes('cita en'))) {
                return DEFAULT_CONFIGS_LAUNDRY.REMINDER_2H_MSG;
            }
            return val;
        }
        return val !== undefined ? val : ((DEFAULT_CONFIGS as any)[clave] || '');
    };

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
            const valorToSave = configs[clave] !== undefined ? configs[clave] : getConfigValue(clave);
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clave, valor: valorToSave }),
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
        const defVal = (currentDefaults as any)[clave] || '';
        setConfigs(prev => ({ ...prev, [clave]: defVal }));
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
                <p className="text-gray-400 font-bold uppercase tracking-wide text-xs">Cargando Configuración...</p>
            </div>
        );
    }

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

    const isRestaurant = ['RESTAURANTE', 'GASTRONOMIA', 'RESTAURANT', 'BAR'].includes(activeTipo) ||
        nameUpper.includes('BURGER') || nameUpper.includes('PARRILLA');

    const hasDeliveryAddon = Boolean(
        effectiveCaps.DELIVERY ?? effectiveCaps.delivery ?? caps.delivery ?? caps.DELIVERY ?? cfg.deliveryEnabled
    );

    const showDeliveryLogistics = (isShoeCareOrLaundry || isRestaurant || hasDeliveryAddon) && !isGym && !isDental;

    const getSubtitle = () => {
        if (isGym) return 'Personaliza los métodos de acceso de socios, mensajes de membresías y parámetros de tu Gimnasio.';
        if (isDental) return 'Personaliza los mensajes a pacientes, recordatorios de citas odontológicas y parámetros de tu Clínica Dental.';
        if (isRestaurant) return 'Personaliza los mensajes de pedidos, atención y parámetros operativos de tu Restaurante.';
        if (isShoeCareOrLaundry) return 'Personaliza las órdenes de servicio, mensajes de retiro y entrega, logística y parámetros operativos de tu Lavandería.';
        return 'Mensajes automáticos de WhatsApp y reglas de tus reservas.';
    };

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
                    isGym={isGym}
                    isDental={isDental}
                    isShoeCareOrLaundry={isShoeCareOrLaundry}
                />
            </div>

            {/* VISTA ESCRITORIO */}
            <div className="hidden md:block space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                            Ajustes generales
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">
                            {getSubtitle()}
                        </p>
                    </div>

                    {isGym && (
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                            <button
                                type="button"
                                onClick={() => setActiveTab('accesos')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
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
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
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
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
 activeTab === 'todos'
 ? 'bg-white text-gray-900 shadow-sm border border-slate-200/60'
 : 'text-slate-600 hover:text-slate-900'
 }`}
                            >
                                Ver Todo
                            </button>
                        </div>
                    )}

                    {isShoeCareOrLaundry && (
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                            <button
                                type="button"
                                onClick={() => setActiveTab('mensajes')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
 activeTab === 'mensajes'
 ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
 : 'text-slate-600 hover:text-slate-900'
 }`}
                            >
                                <MessageSquare size={14} className="text-indigo-600" />
                                Mensajes & Avisos
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('logistica')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
 activeTab === 'logistica'
 ? 'bg-white text-purple-600 shadow-sm border border-slate-200/60'
 : 'text-slate-600 hover:text-slate-900'
 }`}
                            >
                                <Car size={14} className="text-purple-600" />
                                Tarifas & Retiro
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('flujo')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
 activeTab === 'flujo'
 ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/60'
 : 'text-slate-600 hover:text-slate-900'
 }`}
                            >
                                <ShieldCheck size={14} className="text-emerald-600" />
                                Flujo & WhatsApp
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('todos')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
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
                {(activeTab === 'mensajes' || activeTab === 'todos' || (!isGym && !isShoeCareOrLaundry)) && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 gap-8">
                            <MessageConfigItem
                                title={
                                    isShoeCareOrLaundry
                                        ? 'Orden de Servicio Recibida (Pendiente de Retiro)'
                                        : isDental 
                                        ? 'Cita Odontológica Solicitada (Pendiente)' 
                                        : isGym 
                                        ? 'Bienvenida al Socio (Nuevo Registro)' 
                                        : 'Reserva Recibida (Pendiente)'
                                }
                                description={
                                    isShoeCareOrLaundry
                                        ? 'Mensaje enviado inmediatamente después de que el cliente solicita el servicio de lavandería o retiro a domicilio.'
                                        : isDental 
                                        ? 'Mensaje enviado inmediatamente después de que el paciente solicita su cita dental.' 
                                        : isGym 
                                        ? 'Mensaje enviado al socio al registrar su cuenta o darse de alta en el gimnasio.' 
                                        : 'Mensaje enviado inmediatamente después de que el cliente solicita una reserva.'
                                }
                                clave="PENDING_MSG"
                                value={getConfigValue('PENDING_MSG')}
                                onChange={(val: any) => setConfigs(prev => ({ ...prev, PENDING_MSG: val }))}
                                onSave={() => handleSave('PENDING_MSG')}
                                onReset={() => handleReset('PENDING_MSG')}
                                isSaving={saving === 'PENDING_MSG'}
                                isGym={isGym}
                                isDental={isDental}
                                isShoeCareOrLaundry={isShoeCareOrLaundry}
                            />

                            <MessageConfigItem
                                title={
                                    isShoeCareOrLaundry
                                        ? 'Orden Confirmada / En Proceso de Lavado'
                                        : isDental 
                                        ? 'Cita Odontológica Confirmada' 
                                        : isGym 
                                        ? 'Membresía Activada / Confirmada' 
                                        : 'Reserva Confirmada'
                                }
                                description={
                                    isShoeCareOrLaundry
                                        ? 'Mensaje enviado cuando la orden ha sido recibida y confirmada en planta o taller.'
                                        : isDental 
                                        ? 'Mensaje enviado cuando confirmas la cita del paciente.' 
                                        : isGym 
                                        ? 'Mensaje enviado al socio al activar o renovar su membresía.' 
                                        : 'Mensaje enviado cuando cambias el estado de la reserva a \'CONFIRMADA\'.'
                                }
                                clave="CONFIRMATION_MSG"
                                value={getConfigValue('CONFIRMATION_MSG')}
                                onChange={(val: any) => setConfigs(prev => ({ ...prev, CONFIRMATION_MSG: val }))}
                                onSave={() => handleSave('CONFIRMATION_MSG')}
                                onReset={() => handleReset('CONFIRMATION_MSG')}
                                isSaving={saving === 'CONFIRMATION_MSG'}
                                isGym={isGym}
                                isDental={isDental}
                                isShoeCareOrLaundry={isShoeCareOrLaundry}
                            />
                        </div>

                        {/* --- RECORDATORIOS --- */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
                            <div className="p-8 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-gray-900 leading-tight uppercase tracking-tight">
                                            {isShoeCareOrLaundry
                                                ? 'Recordatorios de Retiro y Entrega'
                                                : isGym 
                                                ? 'Recordatorios de Clases y Entrenamientos' 
                                                : isDental 
                                                ? 'Recordatorios de Citas Odontológicas' 
                                                : 'Recordatorios Automáticos'}
                                        </h3>
                                        <p className="text-gray-400 text-sm">
                                            {isShoeCareOrLaundry
                                                ? 'Configura los avisos automáticos sobre retiros de prendas y entregas a domicilio.'
                                                : isGym 
                                                ? 'Configura los mensajes que se enviarán a los socios sobre sus clases agendadas.' 
                                                : isDental 
                                                ? 'Configura los mensajes que se enviarán antes de la consulta odontológica.' 
                                                : 'Configura los mensajes que se enviarán antes de la cita.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Recordatorio del Día */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold uppercase tracking-wide block" style={{ color: 'var(--primary-color)' }}>
                                                {isShoeCareOrLaundry
                                                    ? 'Aviso del Día (Retiro / Entrega de Prendas)'
                                                    : isGym 
                                                    ? 'Recordatorio de la Mañana (Clases del Día)' 
                                                    : 'Recordatorio del Día'}
                                            </label>
                                            <button 
                                                onClick={() => setConfigs(prev => ({ ...prev, REMINDER_DAY_ENABLED: (prev.REMINDER_DAY_ENABLED === '0' ? '1' : '0') }))}
                                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${configs.REMINDER_DAY_ENABLED === '0' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
                                            >
                                                {configs.REMINDER_DAY_ENABLED === '0' ? 'Desactivado' : 'Activado'}
                                            </button>
                                        </div>
                                        
                                        <div className={`space-y-4 transition-opacity duration-300 ${configs.REMINDER_DAY_ENABLED === '0' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">Hora de envío</label>
                                                <input
                                                    type="time"
                                                    value={configs.REMINDER_DAY_TIME || currentDefaults.REMINDER_DAY_TIME}
                                                    onChange={(e) => setConfigs(prev => ({ ...prev, REMINDER_DAY_TIME: e.target.value }))}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 outline-none transition-all"
                                                    style={ { '--tw-ring-color': primaryColor } as any }
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">Mensaje</label>
                                                <textarea
                                                    className="w-full p-4 bg-gray-50 border border-transparent rounded-xl outline-none transition-all text-sm font-medium min-h-[100px] resize-none leading-relaxed text-gray-700"
                                                    value={getConfigValue('REMINDER_DAY_MSG')}
                                                    onChange={(e) => setConfigs(prev => ({ ...prev, REMINDER_DAY_MSG: e.target.value }))}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button onClick={async () => { await handleSave('REMINDER_DAY_ENABLED'); await handleSave('REMINDER_DAY_TIME'); await handleSave('REMINDER_DAY_MSG'); }} disabled={saving !== null} className="text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wide transition shadow-md" style={{ backgroundColor: 'var(--primary-color)' }}>
                                                    Guardar
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recordatorio 2 Horas */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold uppercase tracking-wide block" style={{ color: 'var(--primary-color)' }}>
                                                {isShoeCareOrLaundry
                                                    ? 'Aviso Próximo de Retiro (2 Horas Antes)'
                                                    : isGym 
                                                    ? 'Recordatorio 2 Horas Antes de la Clase' 
                                                    : 'Recordatorio 2 Horas Antes'}
                                            </label>
                                            <button 
                                                onClick={() => setConfigs(prev => ({ ...prev, REMINDER_2H_ENABLED: (prev.REMINDER_2H_ENABLED === '0' ? '1' : '0') }))}
                                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${configs.REMINDER_2H_ENABLED === '0' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
                                            >
                                                {configs.REMINDER_2H_ENABLED === '0' ? 'Desactivado' : 'Activado'}
                                            </button>
                                        </div>
                                        
                                        <div className={`space-y-4 transition-opacity duration-300 ${configs.REMINDER_2H_ENABLED === '0' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block text-transparent select-none">Espaciador</label>
                                                <div className="w-full px-4 py-3 bg-transparent rounded-xl text-sm font-bold text-gray-400 flex items-center h-[46px]">
                                                    {isShoeCareOrLaundry
                                                        ? 'Se envía 2 horas antes de la recolección o entrega'
                                                        : isGym 
                                                        ? 'Se envía 2 horas antes de iniciar la clase' 
                                                        : 'Se envía 2 horas antes de la cita'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">Mensaje</label>
                                                <textarea
                                                    className="w-full p-4 bg-gray-50 border border-transparent rounded-xl outline-none transition-all text-sm font-medium min-h-[100px] resize-none leading-relaxed text-gray-700"
                                                    value={getConfigValue('REMINDER_2H_MSG')}
                                                    onChange={(e) => setConfigs(prev => ({ ...prev, REMINDER_2H_MSG: e.target.value }))}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button onClick={async () => { await handleSave('REMINDER_2H_ENABLED'); await handleSave('REMINDER_2H_MSG'); }} disabled={saving !== null} className="text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wide transition shadow-md" style={{ backgroundColor: 'var(--primary-color)' }}>
                                                    Guardar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Flujo de Órdenes / Reservas */}
                {!isGym && (activeTab === 'flujo' || activeTab === 'todos' || (!isShoeCareOrLaundry && activeTab === 'mensajes')) && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-gray-900 leading-tight uppercase tracking-tight">
                                        {isShoeCareOrLaundry ? 'Flujo de Órdenes de Servicio' : 'Flujo de Reservas'}
                                    </h3>
                                    <p className="text-gray-400 text-sm">
                                        {isShoeCareOrLaundry
                                            ? 'Configura el comportamiento y validación de nuevas solicitudes de retiro y lavado.'
                                            : 'Configura el comportamiento del sistema de reservas.'}
                                    </p>
                                </div>
                                <div className="p-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}>
                                    <RotateCcw size={18} className="cursor-pointer" onClick={() => handleReset('BOOKING_TIMEOUT')} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="text-xs font-bold uppercase tracking-wide block" style={{ color: 'var(--primary-color)' }}>
                                                {isShoeCareOrLaundry ? 'Autoconfirmar Órdenes Recibidas' : 'Autoconfirmar Reservas'}
                                            </label>
                                            <button 
                                                onClick={() => setConfigs(prev => ({ ...prev, BOOKING_TIMEOUT: (prev.BOOKING_TIMEOUT === '0' ? '15' : '0') }))}
                                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${configs.BOOKING_TIMEOUT === '0' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}
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
                                            <div className="w-16 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-900 text-lg shadow-inner">
                                                {configs.BOOKING_TIMEOUT === '0' ? '--' : (configs.BOOKING_TIMEOUT || DEFAULT_CONFIGS.BOOKING_TIMEOUT)}
                                            </div>
                                        </div>
                                        {configs.BOOKING_TIMEOUT === '0' && (
                                            <p className="text-xs text-gray-400 font-bold mt-3">
                                                {isShoeCareOrLaundry
                                                    ? 'Las solicitudes de servicio pasarán directamente a confirmadas para asignación inmediata a repartidores.'
                                                    : 'Las reservas pasarán directamente a confirmadas sin tiempo de espera.'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => handleSave('BOOKING_TIMEOUT')}
                                        disabled={saving === 'BOOKING_TIMEOUT'}
                                        className="flex items-center gap-2 text-white px-8 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wide transition shadow-lg disabled:opacity-50"
                                        style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--primary-color), transparent 80%)' }}
                                    >
                                        {saving === 'BOOKING_TIMEOUT' ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        Guardar Configuración
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* WhatsApp Oficial */}
                {(activeTab === 'flujo' || activeTab === 'todos' || (!isShoeCareOrLaundry && activeTab === 'mensajes')) && (
                    <FeatureGate feature="whatsapp_notifications" fallbackMessage="Actualiza tu plan para activar notificaciones automáticas por WhatsApp.">
                        <WhatsAppConfigSection 
                            negocio={negocio} 
                            onSave={handleSaveNegocio} 
                            isSaving={saving === 'NEGOCIO'} 
                            primaryColor={primaryColor} 
                            isGym={isGym}
                            isShoeCareOrLaundry={isShoeCareOrLaundry}
                        />
                    </FeatureGate>
                )}

                {/* Tarifas de Logística (Retiro & Entrega a Domicilio) */}
                {showDeliveryLogistics && (activeTab === 'logistica' || activeTab === 'todos' || !isShoeCareOrLaundry) && (
                    <DeliveryLogisticsConfigSection 
                        configs={configs}
                        onSaveConfig={handleSave}
                        primaryColor={primaryColor}
                        isShoeCareOrLaundry={isShoeCareOrLaundry}
                    />
                )}

                {/* Banner Sucursales / Ubicaciones */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
                    <div className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/60 shrink-0">
                                <Store size={28} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 leading-tight tracking-tight text-lg">
                                    Gestión de Sucursales y Ubicaciones
                                </h3>
                                <p className="text-gray-500 text-sm mt-1 max-w-xl">
                                    Ahora puedes administrar todas tus sedes físicas, cajas registradoras, fotos de fachada, enlaces de Google Maps y características (parqueadero, transporte, zona segura, acceso fácil) desde el módulo centralizado de Sucursales.
                                </p>
                            </div>
                        </div>

                        <Link
                            href="/admin/sucursales"
                            className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs uppercase tracking-wide shadow-lg transition-all active:scale-95 shrink-0"
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

function WhatsAppConfigSection({ negocio, onSave, isSaving, primaryColor, isGym, isShoeCareOrLaundry }: any) {
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
                        <h3 className="font-bold text-gray-900 leading-tight uppercase tracking-tight">Canal de WhatsApp</h3>
                        <p className="text-gray-400 text-sm">
                            {isShoeCareOrLaundry
                                ? 'Configura el número oficial de WhatsApp de tu lavandería para confirmaciones de servicio, retiros y soporte.'
                                : isGym 
                                ? 'Configura el número oficial de WhatsApp de tu gimnasio para notificaciones a socios y soporte.' 
                                : 'Configura el número donde recibirás las notificaciones de reservas.'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">Número de WhatsApp Oficial</label>
                                <PhoneInput
                                    value={localWhatsapp}
                                    onChange={(val) => setLocalWhatsapp(val)}
                                    placeholder="099 123 4567"
                                    darkMode={false}
                                />
                                <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-tight">Selecciona tu país e ingresa el número oficial</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pb-1">
                        <button 
                            onClick={() => onSave({ whatsapp: localWhatsapp })}
                            disabled={isSaving}
                            className="px-10 py-4 rounded-2xl text-white text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
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

function DeliveryLogisticsConfigSection({ configs, onSaveConfig, primaryColor, isShoeCareOrLaundry }: any) {
    const [baseCost, setBaseCost] = useState(configs.costoEnvio || '1.50');
    const [kmCost, setKmCost] = useState(configs.costoEnvioPorKm || '0.30');
    const [minOrder, setMinOrder] = useState(configs.montoMinimoPedido || '0.00');
    const [branches, setBranches] = useState<any[]>([]);
    const [loadingBranches, setLoadingBranches] = useState(true);

    useEffect(() => {
        if (configs.costoEnvio !== undefined) setBaseCost(configs.costoEnvio);
        if (configs.costoEnvioPorKm !== undefined) setKmCost(configs.costoEnvioPorKm);
        if (configs.montoMinimoPedido !== undefined) setMinOrder(configs.montoMinimoPedido);
    }, [configs]);

    useEffect(() => {
        let isSubscribed = true;
        fetch('/api/admin/sucursales?includeInactive=false')
            .then(res => res.ok ? res.json() : { branches: [] })
            .then(data => {
                if (isSubscribed && data.branches) {
                    setBranches(data.branches);
                }
            })
            .catch(err => console.error('Error fetching branches in delivery config:', err))
            .finally(() => {
                if (isSubscribed) setLoadingBranches(false);
            });
        return () => { isSubscribed = false; };
    }, []);

    const activeBranch = branches.find(b => b.isMain) || branches[0];

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden p-8 space-y-6">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                    <h3 className="font-bold text-gray-900 leading-tight uppercase tracking-tight flex items-center gap-2">
                        <Car size={20} className="text-purple-600" />
                        {isShoeCareOrLaundry ? 'Tarifas de Logística (Retiro & Entrega de Prendas a Domicilio)' : 'Tarifas de Logística (Retiro & Entrega a Domicilio)'}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                        {isShoeCareOrLaundry
                            ? 'Configura el costo base de retiro/entrega y el recargo por distancia GPS para los servicios de lavandería a domicilio.'
                            : 'Configura el costo base de retiro/entrega y el recargo dinámico por distancia GPS desde tu local.'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">Tarifa Base Retiro & Entrega ($)</label>
                    <input
                        type="number"
                        step="0.10"
                        value={baseCost}
                        onChange={(e) => setBaseCost(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">Tarifa mínima fija aplicada a solicitudes a domicilio.</p>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">Costo por Kilómetro Adicional ($/km)</label>
                    <input
                        type="number"
                        step="0.05"
                        value={kmCost}
                        onChange={(e) => setKmCost(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">Multiplicador sumado por cada km desde el local al cliente.</p>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">Monto Mínimo de Pedido ($)</label>
                    <input
                        type="number"
                        step="1.00"
                        value={minOrder}
                        onChange={(e) => setMinOrder(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">Monto mínimo en servicios para permitir delivery ($0 para desactivar).</p>
                </div>
            </div>

            {/* Ubicación Oficial de la Sucursal para Delivery */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block">
                            Ubicación Geográfica de Origen (Sucursal Activa)
                        </label>
                        <p className="text-xs text-slate-500 mt-0.5">
                            El punto de partida para el cálculo de distancia y delivery se administra exclusivamente desde Sucursales.
                        </p>
                    </div>
                    <Link
                        href="/admin/sucursales"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                    >
                        <Store size={14} />
                        Administrar en Sucursales
                        <ArrowRight size={14} />
                    </Link>
                </div>

                {loadingBranches ? (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 text-xs text-slate-400">
                        <Loader2 size={16} className="animate-spin text-purple-600" />
                        Cargando información de la sucursal...
                    </div>
                ) : activeBranch ? (
                    <div className="p-5 bg-gradient-to-br from-purple-50/60 to-indigo-50/40 rounded-2xl border border-purple-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-purple-600 text-white">
                                    <MapPin size={14} />
                                </span>
                                <span className="text-sm font-bold text-slate-900">{activeBranch.name}</span>
                                {activeBranch.isMain && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 uppercase">
                                        Matriz
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-600 pl-8">
                                {activeBranch.address || 'Sin dirección descriptiva registrada'}
                            </p>
                            {activeBranch.latitude && activeBranch.longitude && (
                                <p className="text-xs font-mono text-purple-800 pl-8">
                                    GPS: {Number(activeBranch.latitude).toFixed(6)}, {Number(activeBranch.longitude).toFixed(6)}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {activeBranch.mapUrl && (
                                <a
                                    href={activeBranch.mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-2 rounded-xl text-xs font-semibold text-purple-700 bg-white border border-purple-200 hover:bg-purple-50 transition flex items-center gap-1.5 shadow-xs"
                                >
                                    <ExternalLink size={13} />
                                    Ver en Google Maps
                                </a>
                            )}
                            <Link
                                href="/admin/sucursales"
                                className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition flex items-center gap-1.5 shadow-xs"
                            >
                                Cambiar Ubicación
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                        <span>No tienes una sucursal activa configurada. Registra una para activar el delivery geolocalizado.</span>
                        <Link href="/admin/sucursales" className="font-bold underline ml-2">
                            Crear Sucursal
                        </Link>
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-2">
                <button
                    onClick={async () => {
                        await onSaveConfig('costoEnvio', baseCost);
                        await onSaveConfig('costoEnvioPorKm', kmCost);
                        await onSaveConfig('montoMinimoPedido', minOrder);
                        alert('✅ Parámetros de tarifa de envío guardados con éxito');
                    }}
                    className="px-8 py-4 rounded-2xl text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Save size={16} />
                    Guardar Tarifas de Envío
                </button>
            </div>
        </div>
    );
}

function MessageConfigItem({ title, description, value, onChange, onSave, onReset, isSaving, isGym, isDental, isShoeCareOrLaundry }: any) {
    const variables = isShoeCareOrLaundry ? [
        { tag: '{{nombre}}', desc: 'Nombre del cliente' },
        { tag: '{{negocio}}', desc: 'Nombre de lavandería' },
        { tag: '{{servicio}}', desc: 'Prendas / Servicios' },
        { tag: '{{fecha}}', desc: 'Fecha de retiro / entrega' },
        { tag: '{{hora}}', desc: 'Horario' },
        { tag: '{{link_reserva}}', desc: 'Enlace de rastreo de orden' },
        { tag: '{{telefono_negocio}}', desc: 'WhatsApp de atención' }
    ] : isGym ? [
        { tag: '{{nombre}}', desc: 'Nombre del socio' },
        { tag: '{{negocio}}', desc: 'Nombre del gimnasio' },
        { tag: '{{servicio}}', desc: 'Plan o Membresía' },
        { tag: '{{fecha}}', desc: 'Fecha o Vigencia' },
        { tag: '{{link_reserva}}', desc: 'Carnet QR / Enlace de acceso' },
        { tag: '{{telefono_negocio}}', desc: 'WhatsApp del Gym' }
    ] : isDental ? [
        { tag: '{{nombre}}', desc: 'Nombre del paciente' },
        { tag: '{{negocio}}', desc: 'Nombre de la clínica' },
        { tag: '{{servicio}}', desc: 'Tratamiento / Consulta' },
        { tag: '{{fecha}}', desc: 'Fecha de la cita' },
        { tag: '{{hora}}', desc: 'Hora' },
        { tag: '{{link_reserva}}', desc: 'Detalles de la cita' },
        { tag: '{{telefono_negocio}}', desc: 'WhatsApp' }
    ] : [
        { tag: '{{nombre}}', desc: 'Nombre del cliente' },
        { tag: '{{negocio}}', desc: 'Nombre del negocio' },
        { tag: '{{servicio}}', desc: 'Servicio agendado' },
        { tag: '{{fecha}}', desc: 'Fecha' },
        { tag: '{{hora}}', desc: 'Hora' },
        { tag: '{{link_reserva}}', desc: 'Enlace de reserva' },
        { tag: '{{telefono_negocio}}', desc: 'WhatsApp' }
    ];

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
            <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h3 className="font-bold text-gray-900 leading-tight">{title}</h3>
                        <p className="text-gray-400 text-sm">{description}</p>
                    </div>
                    <button 
                        onClick={onReset} 
                        title="Restablecer mensaje predeterminado"
                        className="p-2 text-gray-400 hover:text-[var(--primary-color)] transition rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                        <RotateCcw size={18} />
                    </button>
                </div>
                <textarea
                    className="w-full p-6 bg-gray-50 border border-slate-100 rounded-2xl outline-none transition-all text-sm font-medium min-h-[130px] resize-none leading-relaxed text-gray-700 focus:bg-white focus:ring-2 focus:ring-[var(--primary-color)]/20"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />

                {/* Variables Dinámicas */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Variables disponibles (haz clic para insertar):
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {variables.map((v) => (
                            <button
                                key={v.tag}
                                type="button"
                                onClick={() => onChange(value ? `${value} ${v.tag}` : v.tag)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                                title={`Insertar ${v.tag} (${v.desc})`}
                            >
                                <code className="text-indigo-600 font-bold">{v.tag}</code>
                                <span className="text-xs text-slate-400 font-normal">({v.desc})</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 text-white px-8 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wide shadow-lg disabled:opacity-50 transition active:scale-95 cursor-pointer"
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
