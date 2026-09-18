'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    Download, FileSpreadsheet, ChevronDown, Check, 
    Utensils, ShoppingBag, Scissors, Dribbble, Store, Sparkles, Package
} from 'lucide-react';

export interface BusinessTypeOption {
    key: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    color: string;
}

export const BUSINESS_TYPES: BusinessTypeOption[] = [
    { 
        key: 'RESTAURANTE', 
        label: 'Restaurante / Gastronomía', 
        description: 'Platos, hamburguesas, pinchos, bebidas y combos con costos de empaque',
        icon: Utensils,
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
    },
    { 
        key: 'TIENDA_MODA', 
        label: 'Tienda / Moda & Calzado', 
        description: 'Ropa, zapatillas y accesorios con variantes de talla, color y marca',
        icon: ShoppingBag,
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40'
    },
    { 
        key: 'SHOE_CARE', 
        label: 'Calzado / Shoe Care & Lavado', 
        description: 'Kits de limpieza, repelentes, cepillos y artículos de cuidado',
        icon: Sparkles,
        color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40'
    },
    { 
        key: 'BELLEZA_SPA', 
        label: 'Belleza / Spa & Barbería', 
        description: 'Ceras moldeadoras, serums faciales, aceites de barba y cosméticos',
        icon: Scissors,
        color: 'text-pink-600 bg-pink-50 dark:bg-pink-950/40'
    },
    { 
        key: 'DEPORTES_CANCHAS', 
        label: 'Canchas & Deportes', 
        description: 'Alquiler de balones, palas de pádel, bebidas hidratantes y tubos',
        icon: Dribbble,
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
    },
    { 
        key: 'MINIMARKET', 
        label: 'Minimarket & Abarrotes', 
        description: 'Café, snacks, despensa y productos con código de barras',
        icon: Store,
        color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40'
    },
    { 
        key: 'GENERAL', 
        label: 'Comercio General', 
        description: 'Plantilla universal para cualquier catálogo comercial estándar',
        icon: Package,
        color: 'text-slate-600 bg-slate-100 dark:bg-slate-800'
    }
];

export default function TemplateDownloadButton({
    className = "",
    size = "normal"
}: {
    className?: string;
    size?: "small" | "normal";
}) {
    const [open, setOpen] = useState(false);
    const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
    const [detectedType, setDetectedType] = useState<string>('TIENDA_MODA');
    const [businessName, setBusinessName] = useState<string>('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function detectBiz() {
            try {
                const res = await fetch('/api/negocio');
                if (res.ok) {
                    const data = await res.json();
                    if (data.nombre) setBusinessName(data.nombre);
                    const rawType = (data.tipoNegocio || (data.configuracion && (typeof data.configuracion === 'string' ? JSON.parse(data.configuracion).tipoNegocio : data.configuracion.tipoNegocio)) || '').toUpperCase();
                    
                    if (rawType.includes('RESTAURANT') || rawType.includes('GASTRONOMIA') || rawType.includes('PINCHOS') || rawType.includes('BAR') || rawType.includes('BURGER')) {
                        setDetectedType('RESTAURANTE');
                    } else if (rawType.includes('SHOE') || rawType.includes('LAVADO') || rawType.includes('LAVANDERIA')) {
                        setDetectedType('SHOE_CARE');
                    } else if (rawType.includes('SPA') || rawType.includes('BELLEZA') || rawType.includes('ESTETICA') || rawType.includes('BARBER')) {
                        setDetectedType('BELLEZA_SPA');
                    } else if (rawType.includes('CANCHA') || rawType.includes('SPORT') || rawType.includes('PADEL')) {
                        setDetectedType('DEPORTES_CANCHAS');
                    } else if (rawType.includes('MINIMARKET') || rawType.includes('SUPER') || rawType.includes('FARMACIA')) {
                        setDetectedType('MINIMARKET');
                    } else if (rawType.includes('TIENDA') || rawType.includes('STORE') || rawType.includes('ROPA') || rawType.includes('MODA')) {
                        setDetectedType('TIENDA_MODA');
                    }
                }
            } catch (err) {
                console.error('Error detectando tipo de negocio:', err);
            }
        }
        detectBiz();
    }, []);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeMeta = BUSINESS_TYPES.find(b => b.key === detectedType) || BUSINESS_TYPES[1];

    const downloadUrl = (typeKey: string) => 
        `/api/admin/catalog/import/template?format=${format}&tipoNegocio=${typeKey}`;

    return (
        <div className={`relative inline-flex items-center ${className}`} ref={dropdownRef}>
            <div className="inline-flex rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                {/* Botón Principal: Descargar plantilla detectada */}
                <a
                    href={downloadUrl(detectedType)}
                    className={`inline-flex items-center gap-2 font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 ${
                        size === 'small' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-xs'
                    }`}
                    title={`Descargar plantilla oficial para ${activeMeta.label}`}
                >
                    <FileSpreadsheet size={size === 'small' ? 14 : 16} className="text-emerald-600" />
                    <span>Descargar Plantilla ({activeMeta.label.split('/')[0].trim()})</span>
                </a>

                {/* Botón Desplegable para seleccionar otro tipo de negocio o formato */}
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className={`border-l border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 px-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${
                        size === 'small' ? 'py-1.5' : 'py-2.5'
                    }`}
                    title="Ver más plantillas por industria"
                >
                    <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Menú Desplegable con todos los tipos de negocio */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 md:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">Plantillas por Tipo de Negocio</span>
                            <span className="text-[10px] text-slate-400">Selecciona la industria que mejor describa tus productos:</span>
                        </div>

                        {/* Selector de formato .xlsx vs .csv */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                            <button
                                type="button"
                                onClick={() => setFormat('xlsx')}
                                className={`px-2 py-0.5 rounded-md transition-all ${format === 'xlsx' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                            >
                                Excel
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormat('csv')}
                                className={`px-2 py-0.5 rounded-md transition-all ${format === 'csv' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                            >
                                CSV
                            </button>
                        </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 py-1">
                        {BUSINESS_TYPES.map((b) => {
                            const Icon = b.icon;
                            const isSelected = b.key === detectedType;

                            return (
                                <a
                                    key={b.key}
                                    href={downloadUrl(b.key)}
                                    onClick={() => setOpen(false)}
                                    className={`flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group text-left ${
                                        isSelected ? 'bg-primary-50/40 dark:bg-primary-950/20' : ''
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${b.color}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary-600 transition-colors">
                                                {b.label}
                                            </span>
                                            {isSelected && (
                                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                                                    <Check size={12} /> Tu Negocio
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                            {b.description}
                                        </p>
                                    </div>
                                    <Download size={14} className="text-slate-300 group-hover:text-primary-600 shrink-0 mt-1 transition-colors" />
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
