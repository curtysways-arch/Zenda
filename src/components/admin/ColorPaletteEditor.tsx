'use client';

import { Loader2, Save, Palette } from 'lucide-react';

export interface NegocioColors {
    colorPrimario?: string;
    colorTexto?: string;
    colorSecundario?: string;
    colorTerciario?: string;
    colorNeutral?: string;
    colorSubTexto?: string;
    colorHeader?: string;
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
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{label}</label>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">{sublabel}</span>
            </div>
            <div className="flex gap-3 items-center">
                {/* Color Picker */}
                <div className="relative size-14 shrink-0 rounded-2xl overflow-hidden shadow-lg border-2 border-white ring-1 ring-slate-100 group cursor-pointer">
                    <input
                        type="color"
                        value={currentValue}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute inset-0 size-full scale-150 cursor-pointer bg-transparent border-none"
                    />
                </div>
                {/* Hex Input + Presets */}
                <div className="flex-1 space-y-2">
                    {/* Hex input editable */}
                    <input
                        type="text"
                        value={currentValue}
                        onChange={(e) => {
                            const val = e.target.value;
                            // Validate hex color format
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                                onChange(val);
                            }
                        }}
                        onBlur={(e) => {
                            // Ensure complete hex on blur
                            const val = e.target.value;
                            if (!/^#[0-9A-Fa-f]{6}$/.test(val)) {
                                onChange(defaultValue);
                            }
                        }}
                        maxLength={7}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition"
                        placeholder={defaultValue}
                    />
                    {/* Preset swatches */}
                    <div className="flex gap-1.5 flex-wrap">
                        {presets.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => onChange(color)}
                                title={color}
                                className={`size-6 rounded-full border-2 transition-all hover:scale-110 ${
                                    currentValue.toLowerCase() === color.toLowerCase()
                                        ? 'border-slate-700 scale-110 shadow-md'
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
    /** Si true, muestra título y descripción del bloque */
    showHeader?: boolean;
}

export default function ColorPaletteEditor({
    colors,
    onChange,
    onSave,
    isSaving = false,
    showHeader = true,
}: ColorPaletteEditorProps) {
    const isModoMarca = colors.colorPrimario === 'logo' || colors.colorPrimario === 'AUTO';

    const update = (field: keyof NegocioColors) => (value: string) => {
        onChange({ ...colors, [field]: value });
    };

    return (
        <div className="space-y-6">
            {showHeader && (
                <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Palette size={14} className="text-pink-500" />
                        Paleta de Colores de Marca
                    </h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight italic">
                        Personaliza todos los colores de tu página pública
                    </p>
                </div>
            )}

            {/* Selector de Modo de Marca */}
            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-2xl p-4.5 mb-4 select-none">
                <div className="pr-4">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block">✨ Modo de Marca (Recomendado)</label>
                    <span className="text-[9px] text-slate-400 font-bold leading-normal">
                        Analiza y autodetecta la paleta cromática desde tu logo.
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        if (isModoMarca) {
                            onChange({ ...colors, colorPrimario: '#EC4899' });
                        } else {
                            onChange({ ...colors, colorPrimario: 'logo' });
                        }
                    }}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none shrink-0 ${isModoMarca ? 'bg-pink-500' : 'bg-slate-200'}`}
                >
                    <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${isModoMarca ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
            </div>

            {isModoMarca ? (
                <div className="bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-200/40 rounded-2xl p-5 space-y-2.5 animate-in fade-in duration-300">
                    <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest block">✨ Inteligencia Cromática Activa</span>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                        Zenda está analizando tu logotipo en tiempo real para generar de manera inteligente y matemática el color primario, fondos, acentos y textos con contraste accesible (WCAG AA).
                    </p>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <ColorField
                        label="1. Color Principal"
                        sublabel="Botones y selección"
                        description="Afecta: Botón de reserva, ícono activo del menú, servicios seleccionados e indicadores de estado."
                        value={colors.colorPrimario || ''}
                        defaultValue="#EC4899"
                        presets={['#EC4899', '#1d4ed8', '#7c3aed', '#ea580c', '#10b981', '#111827']}
                        onChange={update('colorPrimario')}
                    />

                    <ColorField
                        label="2. Color de Barra Inferior"
                        sublabel="Fondo de navegación"
                        description="Afecta: El fondo de la barra de menú inferior (Inicio, Reservas, Perfil)."
                        value={colors.colorSecundario || ''}
                        defaultValue="#020617"
                        presets={['#020617', '#0f172a', '#1e1b4b', '#1c1917', '#14532d', '#450a0a']}
                        onChange={update('colorSecundario')}
                    />

                    <ColorField
                        label="3. Color de Títulos"
                        sublabel="Jerarquía visual"
                        description="Afecta: Títulos principales de secciones como 'Nuestros Servicios', nombres y encabezados."
                        value={colors.colorTexto || ''}
                        defaultValue="#1e293b"
                        presets={['#1e293b', '#0f172a', '#ffffff', '#f8fafc', '#374151', '#92400e']}
                        onChange={update('colorTexto')}
                    />

                    <ColorField
                        label="4. Color de Acentos"
                        sublabel="Detalles y calificación"
                        description="Afecta: Íconos destacados, etiquetas de categoría, estrellas de calificación y detalles decorativos."
                        value={colors.colorTerciario || ''}
                        defaultValue="#7B68EE"
                        presets={['#7B68EE', '#9f1239', '#eab308', '#ec4899', '#8b5cf6', '#14b8a6']}
                        onChange={update('colorTerciario')}
                    />

                    <ColorField
                        label="5. Color de Fondo"
                        sublabel="Lienzo principal"
                        description="Afecta: El color de fondo general de toda la aplicación y la cabecera superior donde aparece el logo."
                        value={colors.colorNeutral || ''}
                        defaultValue="#FFF5F5"
                        presets={['#FFF5F5', '#f8fafc', '#fdf4ff', '#fffbeb', '#f0fdf4', '#0f172a']}
                        onChange={update('colorNeutral')}
                    />

                    <ColorField
                        label="6. Color de Subtítulos"
                        sublabel="Texto secundario"
                        description="Afecta: Descripciones de servicios, subtítulos del hero, mensajes secundarios y detalles informativos."
                        value={colors.colorSubTexto || ''}
                        defaultValue="#475569"
                        presets={['#475569', '#64748b', '#94a3b8', '#ffffff', '#f1f5f9', '#1e293b']}
                        onChange={update('colorSubTexto')}
                    />

                    <ColorField
                        label="7. Color de Barra Superior"
                        sublabel="Header / Navegación alta"
                        description="Afecta: El fondo de la cabecera superior donde aparece tu logo. Por defecto adopta el color neutral."
                        value={colors.colorHeader || ''}
                        defaultValue="#ffffff"
                        presets={['#ffffff', '#f8fafc', '#0f172a', '#1e293b', '#111827', '#ec4899']}
                        onChange={update('colorHeader')}
                    />
                </div>
            )}

            <button
                type="button"
                onClick={() => onSave({
                    colorPrimario: colors.colorPrimario,
                    colorSecundario: isModoMarca ? undefined : colors.colorSecundario,
                    colorTexto: isModoMarca ? undefined : colors.colorTexto,
                    colorTerciario: isModoMarca ? undefined : colors.colorTerciario,
                    colorNeutral: isModoMarca ? undefined : colors.colorNeutral,
                    colorSubTexto: isModoMarca ? undefined : colors.colorSubTexto,
                    colorHeader: isModoMarca ? undefined : colors.colorHeader,
                })}
                disabled={isSaving}
                className="w-full py-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: isModoMarca ? '#EC4899' : (colors.colorPrimario || '#EC4899') }}
            >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar Paleta de Colores
            </button>
        </div>
    );
}
