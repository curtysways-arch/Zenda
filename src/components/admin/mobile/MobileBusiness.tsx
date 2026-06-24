'use client';

import { useState } from 'react';
import { 
    MessageSquare, 
    Settings, 
    MapPin, 
    Tag, 
    Save, 
    RotateCcw, 
    Plus, 
    ChevronRight,
    Loader2,
    CheckCircle2,
    X,
    Info,
    ExternalLink,
    Pencil,
    Trash2,
    Scissors,
    Palette,
    Image,
    TrendingUp,
    Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { DEFAULT_CONFIGS } from '@/app/admin/config/page';
import ColorPaletteEditor from '@/components/admin/ColorPaletteEditor';

interface MobileBusinessProps {
    configs: any;
    negocio: any;
    ubicaciones: any[];
    primaryColor: string;
    onSaveConfig: (clave: string) => void;
    onResetConfig: (clave: string) => void;
    onConfigChange: (clave: string, value: string) => void;
    onSaveNegocio: (data: any) => void;
    onDeleteUbicacion: (id: string) => void;
    onEditUbicacion: (u: any) => void;
    onNewUbicacion: () => void;
    saving: string | null;
}

export default function MobileBusiness({ 
    configs, 
    negocio,
    ubicaciones, 
    primaryColor, 
    onSaveConfig, 
    onResetConfig, 
    onConfigChange,
    onSaveNegocio,
    onDeleteUbicacion,
    onEditUbicacion,
    onNewUbicacion,
    saving 
}: MobileBusinessProps) {
    const [activeTab, setActiveTab] = useState('MESSAGES'); // MESSAGES, CATALOG, BRANDING, BRANCHES, DISCOUNTS, FLOW
    const [localNegocio, setLocalNegocio] = useState<any>(negocio);

    // Sincronizar localNegocio cuando negocio cambie (al cargar)
    useState(() => {
        if (negocio) setLocalNegocio(negocio);
    });

    const handleLocalNegocioChange = (field: string, value: any) => {
        setLocalNegocio((prev: any) => ({ ...prev, [field]: value }));
    };

    const [branchForm, setBranchForm] = useState<{ id?: string, nombre: string, direccion: string, mapUrl: string } | null>(null);
    const [isSavingBranch, setIsSavingBranch] = useState(false);
    const [expandedDay, setExpandedDay] = useState(false);
    const [expanded2H, setExpanded2H] = useState(false);

    const handleSaveBranch = async () => {
        if (!branchForm || !branchForm.nombre.trim()) return;
        setIsSavingBranch(true);
        try {
            const url = branchForm.id ? `/api/config/ubicaciones/${branchForm.id}` : '/api/config/ubicaciones';
            const method = branchForm.id ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: branchForm.nombre.trim(),
                    direccion: branchForm.direccion.trim() || null,
                    mapUrl: branchForm.mapUrl.trim() || null
                })
            });
            if (res.ok) {
                window.location.reload();
            }
        } catch (e) {
            console.error(e);
            setIsSavingBranch(false);
        }
    };

    return (
        <div className="flex flex-col bg-slate-50 min-h-screen animate-in fade-in duration-500 pb-32">
            {/* Header / Tabs */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-100 p-5 space-y-5">
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
                    Mi <span style={{ color: primaryColor }}>Negocio</span>
                </h2>

                <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-5 px-5">
                    {[
                        { id: 'MESSAGES', label: 'Mensajes', icon: MessageSquare },
                        { id: 'CATALOG', label: 'Gestión', icon: Scissors },
                        { id: 'BRANDING', label: 'Identidad', icon: Palette },
                        { id: 'BRANCHES', label: 'Sucursales', icon: MapPin },
                        { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
                        { id: 'FLOW', label: 'Flujo', icon: Settings }
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                activeTab === tab.id ? "text-white shadow-lg" : "bg-slate-50 text-slate-400 border border-slate-100"
                            )}
                            style={activeTab === tab.id ? { backgroundColor: primaryColor } : {}}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-5 space-y-6">
                {activeTab === 'WHATSAPP' && (
                    <WhatsAppTab 
                        negocio={localNegocio} 
                        primaryColor={primaryColor}
                        onSave={onSaveNegocio}
                        onChange={handleLocalNegocioChange}
                        saving={saving === 'NEGOCIO'}
                    />
                )}
                {activeTab === 'BRANDING' && localNegocio && (
                    <div className="space-y-6">
                        {/* Colores unificados con ColorPaletteEditor */}
                        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                            <ColorPaletteEditor
                                colors={{
                                    colorPrimario: localNegocio.colorPrimario,
                                    colorSecundario: localNegocio.colorSecundario,
                                    colorTexto: localNegocio.colorTexto,
                                    colorTerciario: localNegocio.colorTerciario,
                                    colorNeutral: localNegocio.colorNeutral,
                                    colorSubTexto: localNegocio.colorSubTexto,
                                }}
                                onChange={(updatedColors) =>
                                    setLocalNegocio((prev: any) => ({ ...prev, ...updatedColors }))
                                }
                                onSave={(colorData) =>
                                    onSaveNegocio(colorData)
                                }
                                isSaving={saving === 'NEGOCIO'}
                                showHeader={true}
                            />
                        </div>

                        {/* Textos y Títulos */}
                        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Scissors size={14} style={{ color: primaryColor }} /> Textos y Branding
                            </h4>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Nombre Fallback (No logueado)</label>
                                    <input 
                                        type="text" 
                                        value={localNegocio.nombreFallback || ''}
                                        onChange={(e) => handleLocalNegocioChange('nombreFallback', e.target.value)}
                                        placeholder="Ej: Invitada"
                                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Título de Saludo</label>
                                    <input 
                                        type="text" 
                                        value={localNegocio.saludoTitulo || ''}
                                        onChange={(e) => handleLocalNegocioChange('saludoTitulo', e.target.value)}
                                        placeholder="Ej: Hola, ¿Qué tal hoy?"
                                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Mensaje de Bienvenida (Home)</label>
                                    <textarea 
                                        value={localNegocio.mensajeBienvenida || ''}
                                        onChange={(e) => handleLocalNegocioChange('mensajeBienvenida', e.target.value)}
                                        placeholder="Descripción corta debajo del saludo..."
                                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-medium min-h-[80px]"
                                    />
                                </div>
                                <div className="border-t border-slate-50 pt-5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Título Hero (Principal)</label>
                                    <input 
                                        type="text" 
                                        value={localNegocio.heroTitulo || ''}
                                        onChange={(e) => handleLocalNegocioChange('heroTitulo', e.target.value)}
                                        placeholder="Ej: Reserva tu tratamiento"
                                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Hero Subtítulo</label>
                                    <input 
                                        type="text" 
                                        value={localNegocio.heroSubtitulo || ''}
                                        onChange={(e) => handleLocalNegocioChange('heroSubtitulo', e.target.value)}
                                        placeholder="Ej: Los mejores profesionales a tu servicio"
                                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">URL del Logo</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={localNegocio.logoUrl || ''}
                                            onChange={(e) => handleLocalNegocioChange('logoUrl', e.target.value)}
                                            placeholder="https://..."
                                            className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold"
                                        />
                                        {localNegocio.logoUrl && (
                                            <div className="size-11 rounded-xl bg-slate-50 border border-slate-100 p-1.5 flex items-center justify-center">
                                                <img src={localNegocio.logoUrl} className="size-full object-contain" alt="Logo" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => onSaveNegocio({ 
                                    nombreFallback: localNegocio.nombreFallback,
                                    saludoTitulo: localNegocio.saludoTitulo, 
                                    mensajeBienvenida: localNegocio.mensajeBienvenida,
                                    heroTitulo: localNegocio.heroTitulo,
                                    heroSubtitulo: localNegocio.heroSubtitulo,
                                    logoUrl: localNegocio.logoUrl 
                                })}
                                disabled={saving === 'NEGOCIO'}
                                className="w-full py-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {saving === 'NEGOCIO' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Guardar Datos de Marca
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'MESSAGES' && (
                    <div className="space-y-6">
                        <MessageItem 
                            title="Reserva Pendiente"
                            clave="PENDING_MSG"
                            value={configs.PENDING_MSG || DEFAULT_CONFIGS.PENDING_MSG}
                            onChange={(val) => onConfigChange('PENDING_MSG', val)}
                            onSave={() => onSaveConfig('PENDING_MSG')}
                            onReset={() => onResetConfig('PENDING_MSG')}
                            isSaving={saving === 'PENDING_MSG'}
                            primaryColor={primaryColor}
                        />
                        <MessageItem 
                            title="Confirmación"
                            clave="CONFIRMATION_MSG"
                            value={configs.CONFIRMATION_MSG || DEFAULT_CONFIGS.CONFIRMATION_MSG}
                            onChange={(val) => onConfigChange('CONFIRMATION_MSG', val)}
                            onSave={() => onSaveConfig('CONFIRMATION_MSG')}
                            onReset={() => onResetConfig('CONFIRMATION_MSG')}
                            isSaving={saving === 'CONFIRMATION_MSG'}
                            primaryColor={primaryColor}
                        />

                        {/* --- RECORDATORIOS --- */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest pl-4">
                                Recordatorios Automáticos
                            </h4>

                            {/* Recordatorio del Día */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                                <div 
                                    onClick={() => setExpandedDay(!expandedDay)}
                                    className="p-6 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 bg-slate-50 rounded-2xl flex items-center justify-center" style={{ color: primaryColor }}>
                                            <MessageSquare size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 uppercase italic leading-none">Recordatorio del Día</h4>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Toque para {expandedDay ? 'cerrar' : 'editar'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-bold ${configs.REMINDER_DAY_ENABLED === '0' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                            {configs.REMINDER_DAY_ENABLED === '0' ? 'OFF' : 'ON'}
                                        </span>
                                        <ChevronRight size={18} className={cn("text-slate-300 transition-transform", expandedDay && "rotate-90")} />
                                    </div>
                                </div>

                                {expandedDay && (
                                    <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                            <span className="text-[9px] font-black uppercase text-slate-500">¿Habilitar Recordatorio?</span>
                                            <button 
                                                onClick={() => onConfigChange('REMINDER_DAY_ENABLED', configs.REMINDER_DAY_ENABLED === '0' ? '1' : '0')}
                                                className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${configs.REMINDER_DAY_ENABLED === '0' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
                                            >
                                                {configs.REMINDER_DAY_ENABLED === '0' ? 'Desactivado' : 'Activado'}
                                            </button>
                                        </div>
                                        <div className={`space-y-4 transition-opacity duration-300 ${configs.REMINDER_DAY_ENABLED === '0' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                            <div>
                                                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Hora de envío</label>
                                                <input
                                                    type="time"
                                                    value={configs.REMINDER_DAY_TIME || DEFAULT_CONFIGS.REMINDER_DAY_TIME}
                                                    onChange={(e) => onConfigChange('REMINDER_DAY_TIME', e.target.value)}
                                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2"
                                                    style={ { '--tw-ring-color': primaryColor } as any }
                                                />
                                            </div>
                                            <textarea
                                                value={configs.REMINDER_DAY_MSG || DEFAULT_CONFIGS.REMINDER_DAY_MSG}
                                                onChange={(e) => onConfigChange('REMINDER_DAY_MSG', e.target.value)}
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs font-medium text-slate-700 leading-relaxed min-h-[100px] focus:ring-2"
                                                style={ { '--tw-ring-color': primaryColor } as any }
                                            />
                                            <button 
                                                onClick={() => { onSaveConfig('REMINDER_DAY_ENABLED'); onSaveConfig('REMINDER_DAY_TIME'); onSaveConfig('REMINDER_DAY_MSG'); }}
                                                disabled={saving !== null}
                                                className="w-full py-3 rounded-xl text-white text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-md"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                Guardar Día
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Recordatorio 2 Horas */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                                <div 
                                    onClick={() => setExpanded2H(!expanded2H)}
                                    className="p-6 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 bg-slate-50 rounded-2xl flex items-center justify-center" style={{ color: primaryColor }}>
                                            <MessageSquare size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 uppercase italic leading-none">Recordatorio 2 Horas</h4>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Toque para {expanded2H ? 'cerrar' : 'editar'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-bold ${configs.REMINDER_2H_ENABLED === '0' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                            {configs.REMINDER_2H_ENABLED === '0' ? 'OFF' : 'ON'}
                                        </span>
                                        <ChevronRight size={18} className={cn("text-slate-300 transition-transform", expanded2H && "rotate-90")} />
                                    </div>
                                </div>

                                {expanded2H && (
                                    <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                            <span className="text-[9px] font-black uppercase text-slate-500">¿Habilitar Recordatorio?</span>
                                            <button 
                                                onClick={() => onConfigChange('REMINDER_2H_ENABLED', configs.REMINDER_2H_ENABLED === '0' ? '1' : '0')}
                                                className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${configs.REMINDER_2H_ENABLED === '0' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
                                            >
                                                {configs.REMINDER_2H_ENABLED === '0' ? 'Desactivado' : 'Activado'}
                                            </button>
                                        </div>
                                        <div className={`space-y-4 transition-opacity duration-300 ${configs.REMINDER_2H_ENABLED === '0' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                            <p className="text-[10px] font-bold text-slate-400 italic">Se envía 2 horas antes de la cita</p>
                                            <textarea
                                                value={configs.REMINDER_2H_MSG || DEFAULT_CONFIGS.REMINDER_2H_MSG}
                                                onChange={(e) => onConfigChange('REMINDER_2H_MSG', e.target.value)}
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs font-medium text-slate-700 leading-relaxed min-h-[100px] focus:ring-2"
                                                style={ { '--tw-ring-color': primaryColor } as any }
                                            />
                                            <button 
                                                onClick={() => { onSaveConfig('REMINDER_2H_ENABLED'); onSaveConfig('REMINDER_2H_MSG'); }}
                                                disabled={saving !== null}
                                                className="w-full py-3 rounded-xl text-white text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-md"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                Guardar 2 Horas
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                            <h4 className="flex items-center gap-2 text-[10px] font-black text-blue-700 uppercase tracking-[0.2em] mb-4">
                                <Info size={14} /> Guía Rápida
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {['nombre', 'fecha', 'hora', 'negocio'].map(v => (
                                    <span key={v} className="bg-white px-3 py-1.5 rounded-xl text-[10px] font-black text-blue-600 border border-blue-200 shadow-sm">
                                        {"{{"}{v}{"}}"}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'CATALOG' && (
                    <div className="grid grid-cols-1 gap-3">
                        <CatalogLink 
                            href="/admin/servicios" 
                            label="Catálogo de Servicios" 
                            desc="Define precios y duraciones"
                            icon={<Scissors size={20} />} 
                            color={primaryColor} 
                        />
                        <CatalogLink 
                            href="/admin/staff" 
                            label="Gestión de Staff" 
                            desc="Horarios y profesionales"
                            icon={<Users size={20} />} 
                            color="#3b82f6" 
                        />
                        <CatalogLink 
                            href="/admin/promociones" 
                            label="Promociones" 
                            desc="Ofertas y marketing"
                            icon={<Tag size={20} />} 
                            color="#f59e0b" 
                        />
                        <CatalogLink 
                            href="/admin/cursos" 
                            label="Cursos y Formación" 
                            desc="Gestión académica"
                            icon={<TrendingUp size={20} />} 
                            color="#8b5cf6" 
                        />
                    </div>
                )}

                {activeTab === 'BRANCHES' && (
                    <div className="space-y-4">
                        {branchForm ? (
                            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 animate-in zoom-in-95 duration-200">
                                <div className="space-y-1 flex justify-between items-start">
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <MapPin size={14} style={{ color: primaryColor }} /> {branchForm.id ? 'Editar' : 'Nueva'} Sucursal
                                        </h4>
                                    </div>
                                    <button onClick={() => setBranchForm(null)} className="text-slate-400 p-1.5 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X size={16} /></button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Nombre *</label>
                                        <input type="text" value={branchForm.nombre} onChange={e => setBranchForm({...branchForm, nombre: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold" placeholder="Ej: Sede Norte" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Dirección</label>
                                        <input type="text" value={branchForm.direccion} onChange={e => setBranchForm({...branchForm, direccion: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold" placeholder="Ej: Av. Principal 123" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">URL Google Maps (Opcional)</label>
                                        <input type="text" value={branchForm.mapUrl} onChange={e => setBranchForm({...branchForm, mapUrl: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold" placeholder="https://maps.app.goo.gl/..." />
                                    </div>
                                    <button 
                                        onClick={handleSaveBranch}
                                        disabled={isSavingBranch || !branchForm.nombre.trim()}
                                        className="w-full py-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-4"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {isSavingBranch ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        Guardar Sucursal
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {ubicaciones.map((u) => (
                                    <div key={u.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-2xl flex items-center justify-center text-white font-black" style={{ backgroundColor: primaryColor }}>
                                                    {u.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 uppercase italic leading-none">{u.nombre}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1">{u.direccion || 'Sin dirección'}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => setBranchForm({ id: u.id, nombre: u.nombre, direccion: u.direccion || '', mapUrl: u.mapUrl || '' })} className="size-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center border border-slate-100 active:scale-95 transition-transform">
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={() => onDeleteUbicacion(u.id)} className="size-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center border border-rose-100 active:scale-95 transition-transform">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        {u.mapUrl && (
                                            <a 
                                                href={u.mapUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-600 border border-slate-100"
                                            >
                                                <MapPin size={12} /> Ver Ubicación <ExternalLink size={10} />
                                            </a>
                                        )}
                                    </div>
                                ))}
                                <button 
                                    onClick={() => setBranchForm({ nombre: '', direccion: '', mapUrl: '' })}
                                    className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:bg-slate-100 transition-colors"
                                >
                                    <Plus size={16} /> Agregar Nueva Sucursal
                                </button>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'FLOW' && (
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Tiempo de Espera</h4>
                                    <p className="text-[9px] text-slate-400 font-bold mt-1">Confirmación máxima (minutos)</p>
                                </div>
                                <span className="text-2xl font-black italic" style={{ color: primaryColor }}>{configs.BOOKING_TIMEOUT || 10}</span>
                            </div>
                            <input 
                                type="range" 
                                min="5" 
                                max="60" 
                                step="5" 
                                value={configs.BOOKING_TIMEOUT || 10}
                                onChange={(e) => onConfigChange('BOOKING_TIMEOUT', e.target.value)}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                style={ { '--primary-color': primaryColor, accentColor: primaryColor } as any }
                            />
                            <div className="flex justify-end">
                                <button 
                                    onClick={() => onSaveConfig('BOOKING_TIMEOUT')}
                                    disabled={saving === 'BOOKING_TIMEOUT'}
                                    className="px-6 py-3 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg disabled:opacity-50"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {saving === 'BOOKING_TIMEOUT' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                )}


            </div>
        </div>
    );
}

function CatalogLink({ href, label, desc, icon, color }: any) {
    return (
        <Link 
            href={href}
            className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm active:scale-[0.98] transition-all group"
        >
            <div className="flex items-center gap-4">
                <div 
                    className="size-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${color}10`, color: color }}
                >
                    {icon}
                </div>
                <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase italic leading-none">{label}</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{desc}</p>
                </div>
            </div>
            <ChevronRight size={18} className="text-slate-200 group-hover:text-slate-900 transition-colors" />
        </Link>
    );
}

function MessageItem({ title, value, onChange, onSave, onReset, isSaving, primaryColor }: any) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div 
                onClick={() => setExpanded(!expanded)}
                className="p-6 flex items-center justify-between"
            >
                <div className="flex items-center gap-4">
                    <div className="size-10 bg-slate-50 rounded-2xl flex items-center justify-center" style={{ color: primaryColor }}>
                        <MessageSquare size={18} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase italic leading-none">{title}</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Toque para {expanded ? 'cerrar' : 'editar'}</p>
                    </div>
                </div>
                <ChevronRight size={18} className={cn("text-slate-300 transition-transform", expanded && "rotate-90")} />
            </div>

            {expanded && (
                <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2">
                    <textarea 
                        className="w-full bg-slate-50 border-none rounded-3xl p-6 text-sm font-medium text-slate-700 leading-relaxed min-h-[180px] focus:ring-2"
                        style={ { '--tw-ring-color': primaryColor } as any }
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={onSave}
                            disabled={isSaving}
                            className="flex-1 py-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Guardar
                        </button>
                        <button 
                            onClick={onReset}
                            className="size-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100"
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function WhatsAppTab({ negocio, primaryColor, onSave, onChange, saving }: any) {
    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-700">
            {/* Canal de WhatsApp */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare size={14} style={{ color: primaryColor }} /> Canal de Comunicación
                    </h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight italic">Configura el número oficial para recibir y enviar mensajes</p>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Número de WhatsApp (con código de país)</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={negocio.whatsapp || ''}
                                onChange={(e) => onChange('whatsapp', e.target.value)}
                                placeholder="Ej: 593959997521"
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-black tracking-widest"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 rounded-lg">
                                <CheckCircle2 size={10} />
                                <span className="text-[8px] font-black uppercase">Sincronizado</span>
                            </div>
                        </div>
                        <p className="text-[8px] text-slate-400 font-bold mt-2 uppercase tracking-tight">Incluye código de país sin el signo +</p>
                    </div>
                </div>

                <button 
                    onClick={() => onSave({ 
                        whatsapp: negocio.whatsapp
                    })}
                    disabled={saving}
                    className="w-full py-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Actualizar WhatsApp
                </button>
            </div>
        </div>
    );
}
