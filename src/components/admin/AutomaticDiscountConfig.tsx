'use client';

import { useState, useEffect } from 'react';
import { Percent, Clock, Calendar, Zap, Save, Loader2, CheckCircle2, ChevronDown, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function AutomaticDiscountConfig() {
    const { data: session } = useSession();
    const [services, setServices] = useState<any[]>([]);
    const [allConfigs, setAllConfigs] = useState<any[]>([]);
    const [selectedMapping, setSelectedMapping] = useState<'all' | string>('all');

    const [config, setConfig] = useState({
        enabled: false,
        discountPercentage: 0,
        daysOfWeek: "",
        startTime: "00:00",
        endTime: "23:59",
        hoursBefore: 0,
        serviceId: null as string | null
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [planEnabled, setPlanEnabled] = useState(true);
    const [planMessage, setPlanMessage] = useState("");

    const days = [
        { id: "1", label: "Lunes" },
        { id: "2", label: "Martes" },
        { id: "3", label: "Miércoles" },
        { id: "4", label: "Jueves" },
        { id: "5", label: "Viernes" },
        { id: "6", label: "Sábado" },
        { id: "0", label: "Domingo" },
    ];

    useEffect(() => {
        async function fetchData() {
            if (!session?.user) return;
            try {
                const negocioId = (session.user as any).negocioId;

                // Fetch services
                const resServices = await fetch(`/api/services?negocioId=${negocioId}`);
                if (resServices.ok) {
                    const servicesData = await resServices.json();
                    setServices(servicesData);
                }

                // Fetch configs
                const resConfigs = await fetch('/api/admin/automatic-discounts');
                if (resConfigs.ok) {
                    const data = await resConfigs.json();
                    const configsData = data.discounts || (Array.isArray(data) ? data : []);
                    const isPlanEnabled = data.planEnabled ?? true;

                    setAllConfigs(configsData);
                    setPlanEnabled(isPlanEnabled);
                    setPlanMessage(data.planMessage || "");

                    // Inicializar con el general (serviceId: null)
                    const general = configsData.find((c: any) => c.serviceId === null);
                    if (general) {
                        setConfig(general);
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [session]);

    // Calendario de actualización al cambiar selección
    useEffect(() => {
        if (loading) return;

        const serviceId = selectedMapping === 'all' ? null : selectedMapping;
        const existing = allConfigs.find((c: any) => c.serviceId === serviceId);

        if (existing) {
            setConfig({
                ...existing,
                serviceId: serviceId // Asegurar que coincida
            });
        } else {
            setConfig({
                enabled: false,
                discountPercentage: 0,
                daysOfWeek: "",
                startTime: "00:00",
                endTime: "23:59",
                hoursBefore: 0,
                serviceId: serviceId
            });
        }
    }, [selectedMapping, allConfigs, loading]);

    const handleToggleDay = (dayId: string) => {
        const currentDays = config.daysOfWeek ? config.daysOfWeek.split(',') : [];
        let newDays;
        if (currentDays.includes(dayId)) {
            newDays = currentDays.filter(d => d !== dayId);
        } else {
            newDays = [...currentDays, dayId];
        }
        setConfig(prev => ({ ...prev, daysOfWeek: newDays.sort().join(',') }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/automatic-discounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'Promoción guardada correctamente' });

                // Actualizar cache local
                setAllConfigs(prev => {
                    const filtered = prev.filter(c => c.serviceId !== (data.serviceId || null));
                    return [...filtered, data];
                });
            } else {
                setMessage({ type: 'error', text: data.error || 'Error al guardar la promoción' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error de conexión: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin" size={24} style={{ color: 'var(--primary-color)' }} />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden relative">
            {!planEnabled && (
                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-8 text-center">
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 max-w-md animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                            <Zap size={40} />
                        </div>
                        <h4 className="text-2xl font-black text-gray-900 mb-3 uppercase tracking-tight">Función Premium</h4>
                        <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                            {planMessage || "El módulo de optimización de agenda no está incluido en tu plan actual."}
                        </p>
                        <a
                            href="/admin/plan"
                            className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                        >
                            Ver Planes Disponibles
                        </a>
                    </div>
                </div>
            )}
            <div className="p-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Optimización de Agenda</h3>
                            <p className="text-gray-400 text-sm font-medium italic">Maximiza la ocupación de tus especialistas durante horas de baja demanda.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                        <span className="text-[10px] font-black uppercase tracking-widest px-3"
                              style={config.enabled ? { color: 'var(--primary-color)' } : { color: 'rgb(156, 163, 175)' }}>
                            {config.enabled ? 'Activo' : 'Inactivo'}
                        </span>
                        <button
                            onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                            className={`w-12 h-6 rounded-full transition-all relative ${config.enabled ? '' : 'bg-gray-200'}`}
                            style={config.enabled ? { backgroundColor: 'var(--primary-color)' } : {}}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.enabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Scope Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                            Aplicar promoción a:
                        </label>
                        <div className="flex gap-2 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <button
                                onClick={() => setSelectedMapping('all')}
                                className={`flex-1 px-4 py-3 rounded-xl text-xs font-black transition-all ${selectedMapping === 'all'
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                Todos los servicios
                            </button>
                            <button
                                onClick={() => {
                                    if (services.length > 0) {
                                        const firstServiceId = services[0].id;
                                        setSelectedMapping(firstServiceId);
                                    }
                                }}
                                className={`flex-1 px-4 py-3 rounded-xl text-xs font-black transition-all ${selectedMapping !== 'all'
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                Un servicio específico
                            </button>
                        </div>
                    </div>

                    {selectedMapping !== 'all' && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                Seleccionar Servicio:
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedMapping}
                                    onChange={(e) => setSelectedMapping(e.target.value)}
                                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl focus:border-rose-500 outline-none transition-all text-sm font-bold text-slate-700 appearance-none shadow-sm shadow-slate-100"
                                >
                                    {services.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Error/Success Feedback */}
                {message && (
                    <div className={`p-5 rounded-[2rem] flex items-start gap-4 animate-in zoom-in-95 duration-300 ${message.type === 'success'
                        ? ''
                        : 'bg-red-50 text-red-700 border border-red-100 shadow-sm shadow-red-50'
                        }`}
                        style={message.type === 'success' ? { backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)', color: 'var(--primary-color)', border: '1px solid color-mix(in srgb, var(--primary-color), transparent 90%)' } : {}}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                             style={message.type === 'success' ? { backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)' } : { backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div className="pt-2">
                            <p className="text-xs font-black uppercase tracking-tight mb-0.5">
                                {message.type === 'success' ? 'Éxito' : 'Hubo un problema'}
                            </p>
                            <span className="text-xs font-bold leading-relaxed opacity-80">{message.text}</span>
                        </div>
                    </div>
                )}

                {/* Config Form */}
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-500 ${config.enabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none scale-[0.99]'}`}>
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                <Percent size={14} className="text-orange-500" /> Porcentaje de Descuento
                            </label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={config.discountPercentage}
                                    onChange={(e) => setConfig(prev => ({ ...prev, discountPercentage: Number(e.target.value) }))}
                                    className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all text-sm font-black text-gray-700 pr-12"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-300 text-sm group-focus-within:text-rose-500">%</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                    <Clock size={14} className="text-orange-500" /> Desde
                                </label>
                                <input
                                    type="time"
                                    value={config.startTime}
                                    onChange={(e) => setConfig(prev => ({ ...prev, startTime: e.target.value }))}
                                    className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all text-sm font-bold text-gray-700"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                    <Clock size={14} className="text-orange-500" /> Hasta
                                </label>
                                <input
                                    type="time"
                                    value={config.endTime}
                                    onChange={(e) => setConfig(prev => ({ ...prev, endTime: e.target.value }))}
                                    className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all text-sm font-bold text-gray-700"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                <Zap size={14} className="text-rose-500" /> Aplicar solo si falta menos de:
                            </label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    min="0"
                                    value={config.hoursBefore}
                                    onChange={(e) => setConfig(prev => ({ ...prev, hoursBefore: Number(e.target.value) }))}
                                    className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all text-sm font-black text-gray-700 pr-16"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-300 text-[10px] uppercase group-focus-within:text-rose-500">HORAS</span>
                            </div>
                        </div>
                    </div>

                    {/* Días */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={14} className="text-rose-500" /> Días de la Semana
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {days.map(day => {
                                const active = config.daysOfWeek.split(',').includes(day.id);
                                return (
                                    <button
                                        key={day.id}
                                        onClick={() => handleToggleDay(day.id)}
                                        className={`px-5 py-3 rounded-2xl text-xs font-black transition-all border-2 ${active
                                            ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-100 scale-105'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-rose-200'
                                            }`}
                                    >
                                        {day.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="p-6 bg-rose-50/50 rounded-[2.5rem] border border-rose-100/50 text-rose-700 mt-4 relative overflow-hidden">
                            <Zap className="absolute -bottom-2 -right-2 text-rose-100" size={80} strokeWidth={4} />
                            <p className="text-[11px] font-bold leading-relaxed relative z-10">
                                <span className="uppercase text-[9px] block mb-2 text-rose-400 tracking-wider">Cómo funciona:</span>
                                El sistema aplicará automáticamente el <strong className="text-rose-600">{config.discountPercentage}%</strong> de descuento a los horarios que estén libres dentro del rango de <strong className="text-rose-600">{config.startTime} a {config.endTime}</strong>{selectedMapping !== 'all' ? ` en el servicio seleccionado` : ` en todos los servicios`}{config.hoursBefore > 0 ? (
                                    <>, siempre y cuando la reserva se realice faltando <strong className="text-rose-600">{config.hoursBefore} horas</strong> o menos para el inicio de la sesión.</>
                                ) : (
                                    <>, sin restricción de tiempo de reserva (siempre activo).</>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Save */}
                <div className="flex justify-end pt-6 border-t border-gray-50">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-3 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 active:scale-95 group"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save className="group-hover:scale-110 transition-transform" size={16} />}
                        Guardar Configuración
                    </button>
                </div>
            </div>
        </div>
    );
}
