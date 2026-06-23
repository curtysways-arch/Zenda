'use client';

import { useState, useEffect } from 'react';
import { Building2, Save, MapPin, Phone, Clock, DollarSign, Image as ImageIcon, Loader2, CheckCircle2, CreditCard, AlertCircle, Instagram, Facebook, Globe, Mail, Link2, ExternalLink, Settings, Sparkles, MessageCircle } from 'lucide-react';
import GalleryAdmin from '@/components/admin/GalleryAdmin';
import BannerGalleryAdmin from '@/components/admin/BannerGalleryAdmin';
import FeatureGate from '@/components/ui/FeatureGate';
import Link from 'next/link';
import ImageUploader from '@/components/ui/ImageUploader';
import ColorPaletteEditor from '@/components/admin/ColorPaletteEditor';

export default function NegocioConfigPage() {
    const [negocio, setNegocio] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        async function fetchNegocio() {
            try {
                const res = await fetch('/api/negocio');
                if (res.ok) {
                    const data = await res.json();
                    setNegocio(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        fetchNegocio();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/negocio', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(negocio),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Información actualizada correctamente' });
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.details || data.error || 'Error al actualizar la información' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de conexión' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando Información...</p>
            </div>
        );
    }

    if (!negocio) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                <AlertCircle className="text-red-500 mb-4" size={32} />
                <p className="text-gray-900 font-black uppercase tracking-widest text-sm">No se encontró información del negocio</p>
                <p className="text-gray-400 text-xs mt-2">Por favor, contacta al soporte técnico.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Perfil del Negocio</h1>
                <p className="text-gray-500 text-sm font-medium">Gestiona la identidad y horarios generales de tu complejo.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} className="text-red-500" />}
                    <span className="text-sm font-bold">{message.text}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Identidad Visual */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-10">
                    <div className="flex flex-col md:flex-row gap-10 items-start w-full">
                        <div className="w-full md:w-1/3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 mb-2 block">Logo del Complejo</label>
                            <ImageUploader
                                category="logo"
                                currentUrl={negocio.logoUrl || ''}
                                onUploadSuccess={(media) => setNegocio({ ...negocio, logoUrl: media.url })}
                                onRemove={() => setNegocio({ ...negocio, logoUrl: '' })}
                                label="Subir Logo"
                                aspect="square"
                            />
                        </div>
                        <div className="flex-1 space-y-6 w-full">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Nombre del Complejo</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input
                                        type="text"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                        value={negocio.nombre}
                                        onChange={e => setNegocio({ ...negocio, nombre: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Título Principal (Hero)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Tu lugar preferido para el deporte"
                                    className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                    value={negocio.heroTitulo || ''}
                                    onChange={e => setNegocio({ ...negocio, heroTitulo: e.target.value })}
                                />
                            </div>

                            <div className="space-y-4 pt-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Subtítulo (Frase destacada)</label>
                                <textarea
                                    placeholder='Ej: "Instalaciones de élite para jugadores que no aceptan menos."'
                                    className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900 resize-none h-24"
                                    value={negocio.heroSubtitulo || ''}
                                    onChange={e => setNegocio({ ...negocio, heroSubtitulo: e.target.value })}
                                />
                            </div>

                            <FeatureGate feature="custom_phrases" fallbackMessage="Actualiza a PRO para personalizar los textos de bienvenida.">
                                <div className="space-y-4 pt-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Mensaje de Bienvenida Personalizado (Subtítulo)</label>
                                    <textarea
                                        placeholder='Ej: "¿Lista para tu ritual de cuidado personal?"'
                                        className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900 resize-none h-24"
                                        value={negocio.mensajeBienvenida || ''}
                                        onChange={e => setNegocio({ ...negocio, mensajeBienvenida: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Saludo Inicial</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Hola"
                                            className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                            value={negocio.saludoTitulo || ''}
                                            onChange={e => setNegocio({ ...negocio, saludoTitulo: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Nombre Fallback (Si no hay cliente)</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Radiante"
                                            className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                            value={negocio.nombreFallback || ''}
                                            onChange={e => setNegocio({ ...negocio, nombreFallback: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 px-2 font-medium">Ejemplo: "{negocio.saludoTitulo || 'Hola'}, {negocio.nombreFallback || 'Radiante'}"</p>
                            </FeatureGate>

                            {/* PALETA DE COLORES - APP NATIVA */}
                            <div className="space-y-4 pt-6 border-t border-gray-100">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                        <Sparkles size={18} className="text-pink-500" />
                                        Diseño y Personalización Cromática
                                    </h3>
                                    <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-widest">Controla cada elemento visual de tu página pública</p>
                                </div>
                            </div>

                            <FeatureGate feature="custom_colors" fallbackMessage="Tu plan actual no permite personalizar la paleta de colores.">
                                <ColorPaletteEditor
                                    colors={{
                                        colorPrimario: negocio.colorPrimario,
                                        colorSecundario: negocio.colorSecundario,
                                        colorTexto: negocio.colorTexto,
                                        colorTerciario: negocio.colorTerciario,
                                        colorNeutral: negocio.colorNeutral,
                                        colorSubTexto: negocio.colorSubTexto,
                                    }}
                                    onChange={(updatedColors) => setNegocio({ ...negocio, ...updatedColors })}
                                    onSave={async (colorData) => {
                                        setSaving(true);
                                        setMessage(null);
                                        try {
                                            const res = await fetch('/api/negocio', {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(colorData),
                                            });
                                            if (res.ok) {
                                                const updated = await res.json();
                                                setNegocio((prev: any) => ({ ...prev, ...updated }));
                                                setMessage({ type: 'success', text: 'Paleta de colores guardada correctamente' });
                                            } else {
                                                setMessage({ type: 'error', text: 'Error al guardar los colores' });
                                            }
                                        } catch {
                                            setMessage({ type: 'error', text: 'Error de conexión' });
                                        } finally {
                                            setSaving(false);
                                            setTimeout(() => setMessage(null), 3000);
                                        }
                                    }}
                                    isSaving={saving}
                                    showHeader={false}
                                />
                            </FeatureGate>
                    </div>
                </div>
            </div>

                {/* Datos de Contacto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-8 space-y-6">
                        <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px] flex items-center gap-2">
                            <Phone size={14} className="text-emerald-500" />
                            Contacto y Ubicación
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">WhatsApp</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                    value={negocio.whatsapp || ''}
                                    onChange={e => setNegocio({ ...negocio, whatsapp: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ubicaciones (Sedes)</label>
                                    <Link href="/admin/config#ubicaciones-manager" className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-1">
                                        Administrar <Settings size={10} />
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {negocio.ubicaciones && negocio.ubicaciones.length > 0 ? (
                                        negocio.ubicaciones.map((ub: any) => (
                                            <div key={ub.id} className="flex flex-col gap-1 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{ub.nombre}</span>
                                                    {ub.mapUrl && (
                                                        <a href={ub.mapUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-600">
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                                {ub.direccion && (
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                                                        <MapPin size={12} className="shrink-0" />
                                                        <span className="truncate">{ub.direccion}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
                                            <p className="text-xs font-bold text-gray-400">Aún no hay sedes registradas</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2 pt-4 border-t border-gray-100">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Correo Electrónico (Contacto)</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input
                                        type="email"
                                        placeholder="contacto@ejemplo.com"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                        value={negocio.emailContacto || ''}
                                        onChange={e => setNegocio({ ...negocio, emailContacto: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-8 space-y-6">
                        <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px] flex items-center gap-2">
                            <Clock size={14} className="text-blue-500" />
                            Horarios y Tarifas
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Apertura</label>
                                    <input
                                        type="time"
                                        className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                        value={negocio.horarioApertura}
                                        onChange={e => setNegocio({ ...negocio, horarioApertura: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Cierre</label>
                                    <input
                                        type="time"
                                        className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                        value={negocio.horarioCierre}
                                        onChange={e => setNegocio({ ...negocio, horarioCierre: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* DÍAS DE ATENCIÓN */}
                            <div className="space-y-3 pt-2 border-t border-gray-50">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 block">Días de Atención</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: 'L', name: 'Lunes', value: 1 },
                                        { label: 'M', name: 'Martes', value: 2 },
                                        { label: 'M', name: 'Miércoles', value: 3 },
                                        { label: 'J', name: 'Jueves', value: 4 },
                                        { label: 'V', name: 'Viernes', value: 5 },
                                        { label: 'S', name: 'Sábado', value: 6 },
                                        { label: 'D', name: 'Domingo', value: 0 }
                                    ].map((day) => {
                                        const configJson = negocio.configuracion || {};
                                        const diasAtencion = Array.isArray(configJson.diasAtencion) 
                                            ? configJson.diasAtencion 
                                            : [1, 2, 3, 4, 5, 6, 0];
                                        
                                        const isSelected = diasAtencion.includes(day.value);
                                        
                                        const handleToggleDay = () => {
                                            let newDays = [...diasAtencion];
                                            if (isSelected) {
                                                newDays = newDays.filter((d: number) => d !== day.value);
                                            } else {
                                                newDays.push(day.value);
                                            }
                                            setNegocio({
                                                ...negocio,
                                                configuracion: {
                                                    ...configJson,
                                                    diasAtencion: newDays
                                                }
                                            });
                                        };

                                        return (
                                            <button
                                                key={day.value}
                                                type="button"
                                                onClick={handleToggleDay}
                                                className={`w-10 h-10 rounded-full font-black text-xs transition-all border-2 flex items-center justify-center ${
                                                    isSelected
                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                                        : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'
                                                }`}
                                                title={day.name}
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* CONTROL DE DISPONIBILIDAD SIMPLIFICADO */}
                            <div className="pt-2">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Estado del Negocio</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setNegocio({ ...negocio, statusOverride: 'AUTO' })}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${
                                                negocio.statusOverride === 'AUTO' 
                                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg' 
                                                : 'border-gray-100 bg-gray-50 text-gray-400 opacity-60'
                                            }`}
                                        >
                                            <Clock size={18} />
                                            <span className="text-[9px] font-black uppercase tracking-tight">Horario Automático</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNegocio({ ...negocio, statusOverride: 'CLOSED' })}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${
                                                negocio.statusOverride === 'CLOSED' 
                                                ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-lg' 
                                                : 'border-gray-100 bg-gray-50 text-gray-400 opacity-60'
                                            }`}
                                        >
                                            <AlertCircle size={18} />
                                            <span className="text-[9px] font-black uppercase tracking-tight">Cerrar Ahora (Manual)</span>
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-gray-400 px-2 font-medium italic">
                                        {negocio.statusOverride === 'AUTO' ? "El local se rige por tu horario de apertura y cierre programado." : "Has cerrado el local manualmente. Los clientes verán que estás cerrado independientemente del horario."}
                                    </p>

                                    {negocio.statusOverride === 'CLOSED' && (
                                        <div className="px-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <MessageCircle size={14} className="text-gray-400" />
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">¿Por qué está cerrado? (Opcional)</span>
                                                </div>
                                                <textarea
                                                    value={negocio.statusNote || ''}
                                                    onChange={(e) => setNegocio({ ...negocio, statusNote: e.target.value })}
                                                    placeholder="Ej: Cerrado por feriado, capacitación, etc..."
                                                    className="w-full text-xs font-bold p-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500/20 placeholder:text-gray-300"
                                                    rows={2}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer" onClick={() => setNegocio({ ...negocio, mostrarPrecios: !negocio.mostrarPrecios })}>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Mostrar Precios al Público</span>
                                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">Si se desactiva, no se verán precios en el catálogo.</p>
                                    </div>
                                    <button
                                        type="button"
                                        className={`w-10 h-5 rounded-full transition-all duration-300 relative ${negocio.mostrarPrecios ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 ${negocio.mostrarPrecios ? 'left-[22px]' : 'left-0.5'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Redes y Enlaces */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-10">
                    <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px] flex items-center gap-2 mb-8">
                        <Link2 size={14} className="text-emerald-500" />
                        Redes Sociales y Enlaces del Footer
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Izquierda: Redes */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-1.5"><Globe size={12} /> Sitio Web Oficial</label>
                                <input
                                    type="url"
                                    placeholder="https://tu-pagina.com"
                                    className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                    value={negocio.websiteUrl || ''}
                                    onChange={e => setNegocio({ ...negocio, websiteUrl: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-1.5"><Instagram size={12} /> Instagram URL</label>
                                <input
                                    type="url"
                                    placeholder="https://instagram.com/tu-perfil"
                                    className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-pink-500 outline-none transition-all text-sm font-bold text-gray-900"
                                    value={negocio.instagramUrl || ''}
                                    onChange={e => setNegocio({ ...negocio, instagramUrl: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-1.5"><Facebook size={12} /> Facebook URL</label>
                                <input
                                    type="url"
                                    placeholder="https://facebook.com/tu-pagina"
                                    className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all text-sm font-bold text-gray-900"
                                    value={negocio.facebookUrl || ''}
                                    onChange={e => setNegocio({ ...negocio, facebookUrl: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Derecha: Links Informativos */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Link F.A.Q</label>
                                <input
                                    type="url"
                                    placeholder="Link a preguntas frecuentes..."
                                    className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                    value={negocio.faqUrl || ''}
                                    onChange={e => setNegocio({ ...negocio, faqUrl: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Link Términos y Condiciones</label>
                                <input
                                    type="url"
                                    placeholder="Link a términos..."
                                    className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                    value={negocio.terminosUrl || ''}
                                    onChange={e => setNegocio({ ...negocio, terminosUrl: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Link Privacidad</label>
                                <input
                                    type="url"
                                    placeholder="Link a política de privacidad..."
                                    className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                    value={negocio.privacidadUrl || ''}
                                    onChange={e => setNegocio({ ...negocio, privacidadUrl: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>



                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-10">
                    <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px] flex items-center gap-2 mb-8">
                        <ImageIcon size={14} className="text-emerald-500" />
                        Imágenes de Portada (Carrusel)
                    </h3>
                    <BannerGalleryAdmin
                        onPrimaryChange={(url) => {
                            setNegocio((prev: any) => ({
                                ...prev,
                                configuracion: {
                                    ...(prev?.configuracion as any || {}),
                                    bannerUrl: url || undefined
                                }
                            }));
                        }}
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition shadow-xl shadow-emerald-100 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Guardar Todos los Cambios
                    </button>
                </div>
            </form>
        </div>
    );
}
