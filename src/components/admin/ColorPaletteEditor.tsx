'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Loader2, 
    Save, 
    Palette, 
    ChevronLeft, 
    Sparkles, 
    Gem, 
    Coins, 
    Clock, 
    HelpCircle, 
    Sliders,
    Award,
    Calendar,
    User,
    Gift
} from 'lucide-react';
import { generateTheme } from '@/lib/themeGenerator';

export interface NegocioColors {
    colorPrimario?: string;
    colorTexto?: string;
    colorSecundario?: string;
    colorTerciario?: string;
    colorNeutral?: string;
    colorSubTexto?: string;
    colorHeader?: string;
    modoAvanzadoColores?: boolean;
}

interface ColorFieldProps {
    label: string;
    sublabel: string;
    description: string;
    value: string;
    defaultValue: string;
    presets: string[];
    onChange: (value: string) => void;
}

function ColorField({ label, sublabel, description, value, defaultValue, presets, onChange }: ColorFieldProps) {
    const currentValue = value || defaultValue;

    return (
        <div className="space-y-2.5">
            <div className="flex justify-between items-end">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{label}</label>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">{sublabel}</span>
            </div>
            <div className="flex gap-3 items-center">
                {/* Color Picker Box */}
                <div className="relative size-12 shrink-0 rounded-2xl overflow-hidden shadow-md border-2 border-white ring-1 ring-slate-100 group cursor-pointer">
                    <input
                        type="color"
                        value={currentValue}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute inset-0 size-full scale-150 cursor-pointer bg-transparent border-none"
                    />
                </div>
                {/* Hex Input & Presets */}
                <div className="flex-1 space-y-1.5">
                    <input
                        type="text"
                        value={currentValue}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                                onChange(val);
                            }
                        }}
                        onBlur={(e) => {
                            const val = e.target.value;
                            if (!/^#[0-9A-Fa-f]{6}$/.test(val)) {
                                onChange(defaultValue);
                            }
                        }}
                        maxLength={7}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition"
                        placeholder={defaultValue}
                    />
                    <div className="flex gap-1 flex-wrap">
                        {presets.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => onChange(color)}
                                title={color}
                                className={`size-5 rounded-full border-2 transition-all hover:scale-110 ${
                                    currentValue.toLowerCase() === color.toLowerCase()
                                        ? 'border-slate-700 scale-110 shadow-sm'
                                        : 'border-white shadow-sm hover:border-slate-300'
                                }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
            </div>
            <p className="text-[9px] text-slate-400 font-medium leading-tight italic">{description}</p>
        </div>
    );
}

interface ColorPaletteEditorProps {
    colors: NegocioColors;
    onChange: (colors: NegocioColors) => void;
    onSave: (colors: NegocioColors) => void;
    isSaving?: boolean;
    showHeader?: boolean;
}

export default function ColorPaletteEditor({
    colors,
    onChange,
    onSave,
    isSaving = false,
    showHeader = true,
}: ColorPaletteEditorProps) {
    
    const [showAdvanced, setShowAdvanced] = useState(colors.modoAvanzadoColores === true);

    // Sincronizar el estado local si cambian los props del negocio
    useEffect(() => {
        setShowAdvanced(colors.modoAvanzadoColores === true);
    }, [colors.modoAvanzadoColores]);

    const update = (field: keyof NegocioColors) => (value: string) => {
        onChange({ ...colors, [field]: value });
    };

    // Calcular el tema en tiempo real para la vista previa
    const previewTheme = useMemo(() => {
        const prim = colors.colorPrimario || '#EC4899';
        const sec = colors.colorSecundario || undefined;
        
        let theme;
        if (showAdvanced) {
            theme = generateTheme(prim, sec, colors.colorNeutral || undefined);
            if (colors.colorTerciario) theme.accentColor = colors.colorTerciario;
            if (colors.colorTexto) theme.textPrimary = colors.colorTexto;
            if (colors.colorSubTexto) theme.textSecondary = colors.colorSubTexto;
        } else {
            theme = generateTheme(prim, sec);
        }
        return theme;
    }, [colors, showAdvanced]);

    // Calcular el color de fondo del header del simulador
    const headerBgSim = useMemo(() => {
        if (showAdvanced && colors.colorHeader) {
            return colors.colorHeader;
        }
        return previewTheme.surfaceColor;
    }, [showAdvanced, colors.colorHeader, previewTheme.surfaceColor]);

    const handleToggleAdvanced = () => {
        const nextState = !showAdvanced;
        setShowAdvanced(nextState);
        onChange({
            ...colors,
            modoAvanzadoColores: nextState,
            // Si volvemos al modo simple, limpiamos los colores manuales avanzados para que tome la autogeneración
            colorTerciario: nextState ? colors.colorTerciario || '#7B68EE' : undefined,
            colorNeutral: nextState ? colors.colorNeutral || '#FFF5F5' : undefined,
            colorTexto: nextState ? colors.colorTexto || '#ffffff' : undefined,
            colorSubTexto: nextState ? colors.colorSubTexto || '#475569' : undefined,
            colorHeader: nextState ? colors.colorHeader || '#ffffff' : undefined,
        });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
            {/* PANEL DE CONFIGURACIÓN */}
            <div className="flex-1 min-w-0 space-y-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 p-6 md:p-8">
                {showHeader && (
                    <div className="space-y-1">
                        <h4 className="text-base font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <Palette size={18} className="text-pink-500" />
                            🎨 Personalización de colores
                        </h4>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-tight italic">
                            Define la identidad visual de tu marca
                        </p>
                    </div>
                )}

                {/* MODO RECOMENDADO / SIMPLE */}
                <div className="space-y-6">
                    <ColorField
                        label="Color Principal"
                        sublabel="Botones, Acentos y Selección"
                        description="Define el color de marca de tu negocio. Se usará para los botones principales, estados activos e íconos destacados."
                        value={colors.colorPrimario || ''}
                        defaultValue="#EC4899"
                        presets={['#EC4899', '#1d4ed8', '#7c3aed', '#ea580c', '#10b981', '#111827']}
                        onChange={update('colorPrimario')}
                    />

                    <ColorField
                        label="Color Secundario (Opcional)"
                        sublabel="Barra inferior y Navegación"
                        description="Se utiliza como fondo para el menú de navegación inferior. Si no lo seleccionas, se autogenerará un tono complementario."
                        value={colors.colorSecundario || ''}
                        defaultValue="#020617"
                        presets={['#020617', '#0f172a', '#1e1b4b', '#1c1917', '#14532d', '#450a0a']}
                        onChange={update('colorSecundario')}
                    />
                </div>

                {/* BOTÓN MODO AVANZADO */}
                <div className="pt-2">
                    <button
                        type="button"
                        onClick={handleToggleAdvanced}
                        className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-slate-600 transition"
                    >
                        <Sliders size={12} className="text-slate-500" />
                        {showAdvanced ? 'Ocultar Configuración Avanzada' : 'Personalizar Colores Avanzados'}
                    </button>
                </div>

                {/* CAMPOS AVANZADOS (OCULTOS POR DEFECTO) */}
                {showAdvanced && (
                    <div className="space-y-6 pt-6 border-t border-slate-100 animate-in fade-in duration-300">
                        <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest block">⚙️ Modo Avanzado Activo</span>
                        
                        <ColorField
                            label="Color de Títulos"
                            sublabel="Títulos y Encabezados"
                            description="Color de los textos principales y títulos de las secciones."
                            value={colors.colorTexto || ''}
                            defaultValue="#1e293b"
                            presets={['#1e293b', '#0f172a', '#ffffff', '#f8fafc', '#374151', '#92400e']}
                            onChange={update('colorTexto')}
                        />

                        <ColorField
                            label="Color de Acentos"
                            sublabel="Detalles y Badges"
                            description="Color para badges secundarios, estrellas de calificación y pequeños detalles."
                            value={colors.colorTerciario || ''}
                            defaultValue="#7B68EE"
                            presets={['#7B68EE', '#9f1239', '#eab308', '#ec4899', '#8b5cf6', '#14b8a6']}
                            onChange={update('colorTerciario')}
                        />

                        <ColorField
                            label="Color de Fondo"
                            sublabel="Fondo de la App"
                            description="Fondo general detrás de los componentes de la aplicación."
                            value={colors.colorNeutral || ''}
                            defaultValue="#FFF5F5"
                            presets={['#FFF5F5', '#f8fafc', '#fdf4ff', '#fffbeb', '#f0fdf4', '#0f172a']}
                            onChange={update('colorNeutral')}
                        />

                        <ColorField
                            label="Color de Subtítulos"
                            sublabel="Textos Descriptivos"
                            description="Color para párrafos descriptivos y subtítulos informativos."
                            value={colors.colorSubTexto || ''}
                            defaultValue="#475569"
                            presets={['#475569', '#64748b', '#94a3b8', '#ffffff', '#f1f5f9', '#1e293b']}
                            onChange={update('colorSubTexto')}
                        />

                        <ColorField
                            label="Color de Barra Superior"
                            sublabel="Fondo del Header"
                            description="Fondo de la barra de título superior. En el modo simple adopta el color neutral."
                            value={colors.colorHeader || ''}
                            defaultValue="#ffffff"
                            presets={['#ffffff', '#f8fafc', '#0f172a', '#1e293b', '#111827', '#ec4899']}
                            onChange={update('colorHeader')}
                        />
                    </div>
                )}

                {/* BOTÓN GUARDAR */}
                <button
                    type="button"
                    onClick={() => onSave({
                        colorPrimario: colors.colorPrimario,
                        colorSecundario: colors.colorSecundario,
                        colorTexto: showAdvanced ? colors.colorTexto : undefined,
                        colorTerciario: showAdvanced ? colors.colorTerciario : undefined,
                        colorNeutral: showAdvanced ? colors.colorNeutral : undefined,
                        colorSubTexto: showAdvanced ? colors.colorSubTexto : undefined,
                        colorHeader: showAdvanced ? colors.colorHeader : undefined,
                        modoAvanzadoColores: showAdvanced,
                    })}
                    disabled={isSaving}
                    className="w-full py-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-opacity"
                    style={{ backgroundColor: colors.colorPrimario || '#EC4899' }}
                >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Guardar Paleta de Colores
                </button>
            </div>

            {/* VISTA PREVIA - SIMULADOR INTERACTIVO */}
            <div className="w-[280px] shrink-0 flex flex-col items-center mx-auto lg:mx-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">📱 Vista Previa en Tiempo Real</span>
                
                {/* Contenedor Teléfono */}
                <div 
                    className="relative w-[280px] h-[550px] bg-slate-50 border-[7px] border-slate-900 rounded-[2.5rem] shadow-2xl overflow-y-auto flex flex-col font-sans select-none scrollbar-none"
                    style={{ backgroundColor: previewTheme.backgroundColor }}
                >
                    {/* Altavoz y Cámara Frontal Ficticios */}
                    <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-b-xl z-50 flex items-center justify-center gap-1.5">
                        <div className="w-10 h-1 bg-slate-800 rounded-full" />
                        <div className="w-2 h-2 bg-slate-800 rounded-full" />
                    </div>

                    {/* 1. Header Superior */}
                    <div 
                        className="pt-6 pb-3 px-4 border-b flex items-center justify-between shrink-0"
                        style={{ 
                            backgroundColor: headerBgSim, 
                            borderColor: previewTheme.borderColor 
                        }}
                    >
                        <button className="p-1 rounded-full bg-slate-100/50 border-0 flex items-center justify-center">
                            <ChevronLeft size={14} style={{ color: previewTheme.textPrimary }} />
                        </button>
                        <span className="font-black text-[10px] uppercase tracking-wider" style={{ color: previewTheme.textPrimary }}>
                            Club de Fidelización
                        </span>
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                            <User size={10} style={{ color: previewTheme.textPrimary }} />
                        </div>
                    </div>

                    {/* Pantalla Contenido */}
                    <div className="p-3.5 space-y-4 flex-1 overflow-y-auto">
                        
                        {/* Saludo */}
                        <div className="flex gap-2 items-center bg-white/20 p-2.5 rounded-2xl border border-white/30">
                            <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden">
                                <User size={18} className="text-pink-400" />
                            </div>
                            <div className="text-left">
                                <p className="font-black text-[11px] leading-tight" style={{ color: previewTheme.textPrimary }}>¡Hola, Carlos Caicedo! 👋</p>
                                <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: previewTheme.textSecondary }}>Gana diamantes y canjea premios</p>
                            </div>
                        </div>

                        {/* Tarjeta de Balance Fiel (Diamantes y Cashback) */}
                        <div 
                            className="relative overflow-hidden rounded-[1.8rem] p-3.5 text-white shadow-md flex flex-col justify-between min-h-[96px]"
                            style={{ background: `linear-gradient(135deg, ${previewTheme.primaryColor} 0%, ${previewTheme.primaryHover} 100%)` }}
                        >
                            <div className="grid grid-cols-2 gap-2">
                                {/* Diamantes */}
                                <div className="flex gap-2 items-center">
                                    <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center shadow-inner">
                                        <Gem size={14} className="text-white" />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-[6.5px] font-black text-white/70 uppercase tracking-widest block leading-none">DIAMANTES</span>
                                        <div className="flex items-center gap-0.5 mt-0.5">
                                            <span className="text-xl font-black leading-none">434</span>
                                            <span className="text-[14px] leading-none">💎</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Cashback */}
                                <div className="flex gap-2 items-center border-l border-white/10 pl-2.5">
                                    <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center shadow-inner">
                                        <Coins size={14} className="text-white" />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-[6.5px] font-black text-white/70 uppercase tracking-widest block leading-none">CASHBACK</span>
                                        <div className="flex items-center gap-0.5 mt-0.5">
                                            <span className="text-xl font-black leading-none">$10.00</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[7.5px] font-black text-white/80 uppercase tracking-widest">
                                <span className="flex items-center gap-0.5"><HelpCircle size={8} /> Beneficios activos</span>
                                <span className="flex items-center gap-0.5"><Clock size={8} /> Ver Historial</span>
                            </div>
                        </div>

                        {/* Nivel */}
                        <div className="p-3 bg-white rounded-2xl border flex items-center justify-between shadow-sm" style={{ borderColor: previewTheme.borderColor, backgroundColor: previewTheme.surfaceColor }}>
                            <div className="flex gap-2.5 items-center">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: previewTheme.primaryColor }}>
                                    <Award size={14} />
                                </div>
                                <div className="text-left">
                                    <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-widest block">RANGO ACTUAL</span>
                                    <span className="font-black text-[10px]" style={{ color: previewTheme.textPrimary }}>NIVEL ÉLITE</span>
                                </div>
                            </div>
                            <span className="text-[7.5px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border" style={{ borderColor: previewTheme.primaryColor, color: previewTheme.primaryColor, backgroundColor: previewTheme.primaryBg }}>
                                Beneficios
                            </span>
                        </div>

                        {/* Canje de Premios / Promociones */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <span className="font-black text-[8.5px] uppercase tracking-wider" style={{ color: previewTheme.textPrimary }}>🔥 Canjea Diamantes</span>
                                <span className="text-[7.5px] font-black" style={{ color: previewTheme.primaryColor }}>Ver Todo</span>
                            </div>

                            {/* Card Premio */}
                            <div className="p-2.5 bg-white rounded-2xl border flex items-center justify-between shadow-sm gap-2" style={{ borderColor: previewTheme.borderColor, backgroundColor: previewTheme.surfaceColor }}>
                                <div className="flex gap-2 items-center">
                                    <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border" style={{ borderColor: previewTheme.borderColor }}>
                                        <Gift size={16} style={{ color: previewTheme.primaryColor }} />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-[6.5px] font-black px-1.5 py-0.5 rounded-full text-white inline-block mb-1" style={{ backgroundColor: previewTheme.accentColor }}>
                                            200 DIAMANTES
                                        </span>
                                        <p className="font-black text-[9px] leading-tight" style={{ color: previewTheme.textPrimary }}>Masaje Corporal</p>
                                    </div>
                                </div>
                                <button className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest border-0 text-white rounded-xl active:scale-95 transition" style={{ backgroundColor: previewTheme.primaryColor }}>
                                    Canjear
                                </button>
                            </div>
                        </div>

                        {/* Botón de Reservar Turno */}
                        <div className="pt-1.5">
                            <button 
                                className="w-full py-3 text-[9px] font-black uppercase tracking-widest text-white rounded-2xl shadow-md border-0 active:scale-[0.98] transition"
                                style={{ backgroundColor: previewTheme.primaryColor }}
                            >
                                Reservar Cita
                            </button>
                        </div>
                    </div>

                    {/* 2. Barra de Navegación Inferior */}
                    <div 
                        className="h-12 border-t flex items-center justify-around shrink-0 px-2"
                        style={{ 
                            backgroundColor: previewTheme.primaryDark, 
                            borderColor: previewTheme.primaryDark 
                        }}
                    >
                        <div className="flex flex-col items-center gap-0.5">
                            <Calendar size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                            <span className="text-[6.5px] font-bold" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Agenda</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                            <Sparkles size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                            <span className="text-[6.5px] font-bold" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Servicios</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                            <div className="p-1 rounded-full bg-white">
                                <Gift size={13} style={{ color: previewTheme.primaryColor }} />
                            </div>
                            <span className="text-[6.5px] font-black" style={{ color: previewTheme.textOnPrimary }}>Premios</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                            <User size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                            <span className="text-[6.5px] font-bold" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Perfil</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
