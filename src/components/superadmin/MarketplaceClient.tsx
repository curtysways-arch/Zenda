'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Award, Plus, Search, Filter, Package,
    Layers, Star, Download, Edit3, Trash2,
    CheckCircle2, Eye, EyeOff, RefreshCw,
    ChevronDown, X, Globe, Lock, Zap, Crown,
    Ticket, Gift
} from 'lucide-react';

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface TemplateMission {
    id: string;
    nombre: string;
    descripcion: string;
    triggerEvent: string;
    difficulty: string;
    xp: number;
    cantidadMeta: number;
    acciones: any[];
}

interface TemplateCoupon {
    codigo: string;
    tipo: 'PORCENTAJE' | 'FIJO';
    valor: number;
    descripcion: string;
}

interface TemplateReward {
    nombre: string;
    descripcion: string;
    costoPuntos: number;
    tipo: 'CUPON' | 'SERVICIO_GRATIS' | 'PRODUCTO' | 'REGALO' | 'PERSONALIZADO';
    deliveryType: 'AUTOMATICO' | 'MANUAL';
}

interface Template {
    id: string;
    nombre: string;
    descripcion: string;
    icono: string;
    color: string;
    categorias: string[];
    tags: string[];
    coupons?: TemplateCoupon[];
    rewards?: TemplateReward[];
    versionSemantica: string;
    estado: string;
    origenTipo: string;
    esPredeterminada: boolean;
    featured: boolean;
    gratuito: boolean;
    precio: number;
    installCount: number;
    rating: number;
    autor: string;
    empresa: string;
    Missions: TemplateMission[];
    createdAt: string;
    updatedAt: string;
}

// ─── Categorías del Marketplace ──────────────────────────────────────────────
const CATEGORIES = [
    { id: 'ALL', label: 'Todas', icon: '✦' },
    { id: 'BELLEZA', label: 'Belleza', icon: '💅' },
    { id: 'BARBERIA', label: 'Barbería', icon: '✂️' },
    { id: 'SPA', label: 'Spa', icon: '🧖' },
    { id: 'CLINICA', label: 'Clínica', icon: '🏥' },
    { id: 'RESTAURANTE', label: 'Restaurante', icon: '🍽️' },
    { id: 'GIMNASIO', label: 'Gimnasio', icon: '💪' },
    { id: 'HOTEL', label: 'Hotel', icon: '🏨' },
    { id: 'VETERINARIA', label: 'Veterinaria', icon: '🐾' },
    { id: 'GENERAL', label: 'General', icon: '⭐' },
];

const DIFFICULTY_COLORS: Record<string, string> = {
    EASY: '#22c55e',
    MEDIUM: '#f59e0b',
    HARD: '#ef4444',
    EPIC: '#8b5cf6',
    LEGENDARY: '#f97316',
};

// ─── Modal de Creación/Edición de Plantilla ──────────────────────────────────
function TemplateFormModal({
    template,
    onClose,
    onSaved,
}: {
    template?: Template | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEditing = !!template;
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'misiones' | 'catalogo'>('info');
    const [form, setForm] = useState({
        nombre: template?.nombre || '',
        descripcion: template?.descripcion || '',
        icono: template?.icono || 'Award',
        color: template?.color || '#ec4899',
        categorias: template?.categorias || [],
        tags: template?.tags || [],
        esPredeterminada: template?.esPredeterminada || false,
        featured: template?.featured || false,
        gratuito: template?.gratuito !== false,
        precio: template?.precio || 0,
    });
    const [missions, setMissions] = useState<Partial<TemplateMission>[]>(
        template?.Missions || []
    );
    const [coupons, setCoupons] = useState<TemplateCoupon[]>(
        template?.coupons || []
    );
    const [rewards, setRewards] = useState<TemplateReward[]>(
        template?.rewards || []
    );

    const [tagInput, setTagInput] = useState('');
    const [missionForm, setMissionForm] = useState<Partial<TemplateMission>>({});
    
    const [couponForm, setCouponForm] = useState<Partial<TemplateCoupon>>({
        codigo: '',
        tipo: 'PORCENTAJE',
        valor: 10,
        descripcion: '',
    });
    
    const [rewardForm, setRewardForm] = useState<Partial<TemplateReward>>({
        nombre: '',
        descripcion: '',
        costoPuntos: 200,
        tipo: 'PERSONALIZADO',
        deliveryType: 'MANUAL',
    });

    const toggleCategory = (cat: string) => {
        setForm(prev => ({
            ...prev,
            categorias: prev.categorias.includes(cat)
                ? prev.categorias.filter(c => c !== cat)
                : [...prev.categorias, cat]
        }));
    };

    const addTag = () => {
        if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
            setForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
            setTagInput('');
        }
    };

    const addMission = () => {
        if (!missionForm.nombre || !missionForm.triggerEvent) return;
        setMissions(prev => [...prev, { ...missionForm, id: crypto.randomUUID() }]);
        setMissionForm({});
    };

    const removeMission = (idx: number) => {
        setMissions(prev => prev.filter((_, i) => i !== idx));
    };

    const addCoupon = () => {
        if (!couponForm.codigo || !couponForm.valor) return;
        setCoupons(prev => [...prev, {
            codigo: couponForm.codigo!.toUpperCase().trim(),
            tipo: couponForm.tipo || 'PORCENTAJE',
            valor: Number(couponForm.valor),
            descripcion: couponForm.descripcion || '',
        }]);
        setCouponForm({ codigo: '', tipo: 'PORCENTAJE', valor: 10, descripcion: '' });
    };

    const removeCoupon = (idx: number) => {
        setCoupons(prev => prev.filter((_, i) => i !== idx));
    };

    const addReward = () => {
        if (!rewardForm.nombre || !rewardForm.costoPuntos) return;
        setRewards(prev => [...prev, {
            nombre: rewardForm.nombre!.trim(),
            descripcion: rewardForm.descripcion || '',
            costoPuntos: Number(rewardForm.costoPuntos),
            tipo: rewardForm.tipo || 'PERSONALIZADO',
            deliveryType: rewardForm.deliveryType || 'MANUAL',
        }]);
        setRewardForm({ nombre: '', descripcion: '', costoPuntos: 200, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' });
    };

    const removeReward = (idx: number) => {
        setRewards(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = { ...form, misiones: missions, coupons, rewards };
            const url = isEditing
                ? `/api/superadmin/plantillas/${template!.id}`
                : '/api/superadmin/plantillas';
            const method = isEditing ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success || data.template) {
                onSaved();
                onClose();
            } else {
                alert(data.error || 'Error al guardar la plantilla');
            }
        } catch {
            alert('Error de red al guardar la plantilla');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: form.color }}
                        >
                            <Award size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                                {isEditing ? 'Editar Plantilla' : 'Nueva Plantilla'}
                            </h2>
                            <p className="text-xs text-slate-400">Marketplace Oficial Citiox</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 px-8 shrink-0">
                    {[
                        { id: 'info', label: 'Información General' },
                        { id: 'misiones', label: `Misiones (${missions.length})` },
                        { id: 'catalogo', label: `Cupones (${coupons.length}) & Premios (${rewards.length})` }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors -mb-px ${
                                activeTab === tab.id
                                    ? 'border-pink-500 text-pink-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
                    {activeTab === 'info' && (
                        <>
                            {/* Nombre + Color */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-3">
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Nombre *</label>
                                    <input
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white dark:bg-slate-800 focus:outline-none focus:border-pink-400"
                                        value={form.nombre}
                                        onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                                        placeholder="Ej: Pack Belleza Premium"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Color</label>
                                    <input
                                        type="color"
                                        className="w-full h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
                                        value={form.color}
                                        onChange={e => setForm(prev => ({ ...prev, color: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Descripción *</label>
                                <textarea
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white dark:bg-slate-800 focus:outline-none focus:border-pink-400 resize-none"
                                    rows={3}
                                    value={form.descripcion}
                                    onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                                    placeholder="Describe el objetivo de esta plantilla..."
                                />
                            </div>

                            {/* Categorías */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">Categorías</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.filter(c => c.id !== 'ALL').map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => toggleCategory(cat.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                form.categorias.includes(cat.id)
                                                    ? 'bg-pink-500 text-white border-pink-500'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-pink-300'
                                            }`}
                                        >
                                            {cat.icon} {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Tags</label>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white dark:bg-slate-800 focus:outline-none focus:border-pink-400"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        placeholder="referidos, fidelidad, crecimiento..."
                                    />
                                    <button
                                        type="button"
                                        onClick={addTag}
                                        className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
                                    >
                                        + Agregar
                                    </button>
                                </div>
                                {form.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {form.tags.map((tag, i) => (
                                            <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-semibold">
                                                #{tag}
                                                <button onClick={() => setForm(prev => ({ ...prev, tags: prev.tags.filter((_, ti) => ti !== i) }))}>
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Opciones */}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { key: 'esPredeterminada', label: '⭐ Plantilla predeterminada', desc: 'Se sugiere a todos los negocios nuevos' },
                                    { key: 'featured', label: '🔥 Featured', desc: 'Aparece en la sección destacada' },
                                    { key: 'gratuito', label: '🆓 Gratuita', desc: 'Los negocios pueden instalarla sin costo' },
                                ].map(opt => (
                                    <label key={opt.key} className="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-pink-300 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={(form as any)[opt.key]}
                                            onChange={e => setForm(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                                            className="mt-0.5"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white">{opt.label}</p>
                                            <p className="text-[10px] text-slate-400">{opt.desc}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'misiones' && (
                        <>
                            {/* Lista de misiones */}
                            <div className="space-y-2">
                                {missions.map((m, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: DIFFICULTY_COLORS[m.difficulty || 'MEDIUM'] + '22' }}
                                        >
                                            <Award size={14} style={{ color: DIFFICULTY_COLORS[m.difficulty || 'MEDIUM'] }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{m.nombre}</p>
                                            <p className="text-[10px] text-slate-400 truncate">{m.triggerEvent} · {m.difficulty || 'MEDIUM'} · {m.xp || 0} XP</p>
                                        </div>
                                        <button onClick={() => removeMission(idx)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {missions.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-6">Aún no hay misiones en esta plantilla.</p>
                                )}
                            </div>

                            {/* Agregar misión */}
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3">
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">+ Nueva Misión</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs dark:bg-slate-800 dark:text-white focus:outline-none focus:border-pink-400"
                                        placeholder="Nombre de la misión"
                                        value={missionForm.nombre || ''}
                                        onChange={e => setMissionForm(prev => ({ ...prev, nombre: e.target.value }))}
                                    />
                                    <input
                                        className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs dark:bg-slate-800 dark:text-white focus:outline-none focus:border-pink-400"
                                        placeholder="Descripción breve"
                                        value={missionForm.descripcion || ''}
                                        onChange={e => setMissionForm(prev => ({ ...prev, descripcion: e.target.value }))}
                                    />
                                    <select
                                        className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs dark:bg-slate-800 dark:text-white focus:outline-none focus:border-pink-400"
                                        value={missionForm.triggerEvent || ''}
                                        onChange={e => setMissionForm(prev => ({ ...prev, triggerEvent: e.target.value }))}
                                    >
                                        <option value="">Evento disparador</option>
                                        <option value="BOOKING_COMPLETED">Reserva completada</option>
                                        <option value="REFERRAL_COMPLETED">Referido completado</option>
                                        <option value="FIRST_BOOKING">Primera reserva</option>
                                        <option value="REVIEW_SUBMITTED">Reseña enviada</option>
                                        <option value="PROFILE_COMPLETED">Perfil completado</option>
                                        <option value="PURCHASE">Compra realizada</option>
                                        <option value="CHECK_IN">Check-in</option>
                                        <option value="CUSTOM">Personalizado</option>
                                    </select>
                                    <select
                                        className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs dark:bg-slate-800 dark:text-white focus:outline-none focus:border-pink-400"
                                        value={missionForm.difficulty || 'MEDIUM'}
                                        onChange={e => setMissionForm(prev => ({ ...prev, difficulty: e.target.value }))}
                                    >
                                        <option value="EASY">⚡ Fácil</option>
                                        <option value="MEDIUM">🔥 Medio</option>
                                        <option value="HARD">💪 Difícil</option>
                                        <option value="EPIC">🌟 Épico</option>
                                        <option value="LEGENDARY">👑 Legendario</option>
                                    </select>
                                    <input
                                        type="number"
                                        className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs dark:bg-slate-800 dark:text-white focus:outline-none focus:border-pink-400"
                                        placeholder="XP"
                                        value={missionForm.xp || ''}
                                        onChange={e => setMissionForm(prev => ({ ...prev, xp: parseInt(e.target.value) || 0 }))}
                                    />
                                    <input
                                        type="number"
                                        className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs dark:bg-slate-800 dark:text-white focus:outline-none focus:border-pink-400"
                                        placeholder="Meta (cantidad)"
                                        value={missionForm.cantidadMeta || ''}
                                        onChange={e => setMissionForm(prev => ({ ...prev, cantidadMeta: parseInt(e.target.value) || 1 }))}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={addMission}
                                    className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
                                >
                                    + Agregar Misión
                                </button>
                            </div>
                        </>
                    )}

                    {activeTab === 'catalogo' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Panel de Cupones */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <Ticket size={14} className="text-pink-500" />
                                    Cupones de Descuento
                                </h3>

                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                    {coupons.map((cp, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-750">
                                            <div>
                                                <p className="text-xs font-black text-pink-600 dark:text-pink-400">{cp.codigo}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                                    {cp.tipo === 'PORCENTAJE' ? `${cp.valor}%` : `$${cp.valor}`} · {cp.descripcion}
                                                </p>
                                            </div>
                                            <button onClick={() => removeCoupon(idx)} className="text-red-400 hover:text-red-600 p-1">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                    {coupons.length === 0 && (
                                        <p className="text-[11px] text-slate-400 text-center py-6">No hay cupones configurados.</p>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 space-y-3">
                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-350">+ Nuevo Cupón</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-800 dark:text-white"
                                            placeholder="Código (Ej: CORTE10)"
                                            value={couponForm.codigo || ''}
                                            onChange={e => setCouponForm(prev => ({ ...prev, codigo: e.target.value }))}
                                        />
                                        <select
                                            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-800 dark:text-white"
                                            value={couponForm.tipo || 'PORCENTAJE'}
                                            onChange={e => setCouponForm(prev => ({ ...prev, tipo: e.target.value as any }))}
                                        >
                                            <option value="PORCENTAJE">Porcentaje (%)</option>
                                            <option value="FIJO">Fijo ($)</option>
                                        </select>
                                        <input
                                            type="number"
                                            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-800 dark:text-white"
                                            placeholder="Valor"
                                            value={couponForm.valor || ''}
                                            onChange={e => setCouponForm(prev => ({ ...prev, valor: Number(e.target.value) || 0 }))}
                                        />
                                        <input
                                            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-800 dark:text-white"
                                            placeholder="Descripción"
                                            value={couponForm.descripcion || ''}
                                            onChange={e => setCouponForm(prev => ({ ...prev, descripcion: e.target.value }))}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addCoupon}
                                        className="w-full py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors"
                                    >
                                        Añadir Cupón
                                    </button>
                                </div>
                            </div>

                            {/* Panel de Premios */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <Gift size={14} className="text-purple-500" />
                                    Premios Canjeables
                                </h3>

                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                    {rewards.map((rw, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-750">
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 dark:text-white">{rw.nombre}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                                    🏆 {rw.costoPuntos} pts · {rw.tipo} · Entrega {rw.deliveryType}
                                                </p>
                                            </div>
                                            <button onClick={() => removeReward(idx)} className="text-red-400 hover:text-red-600 p-1">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                    {rewards.length === 0 && (
                                        <p className="text-[11px] text-slate-400 text-center py-6">No hay premios configurados.</p>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 space-y-3">
                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-350">+ Nuevo Premio</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-800 dark:text-white"
                                            placeholder="Nombre del premio"
                                            value={rewardForm.nombre || ''}
                                            onChange={e => setRewardForm(prev => ({ ...prev, nombre: e.target.value }))}
                                        />
                                        <input
                                            type="number"
                                            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-800 dark:text-white"
                                            placeholder="Costo (Puntos)"
                                            value={rewardForm.costoPuntos || ''}
                                            onChange={e => setRewardForm(prev => ({ ...prev, costoPuntos: Number(e.target.value) || 0 }))}
                                        />
                                        <select
                                            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-800 dark:text-white"
                                            value={rewardForm.tipo || 'PERSONALIZADO'}
                                            onChange={e => setRewardForm(prev => ({ ...prev, tipo: e.target.value as any }))}
                                        >
                                            <option value="SERVICIO_GRATIS">Servicio Gratis</option>
                                            <option value="PRODUCTO">Producto</option>
                                            <option value="REGALO">Regalo</option>
                                            <option value="CUPON">Cupón de Descuento</option>
                                            <option value="PERSONALIZADO">Personalizado</option>
                                        </select>
                                        <select
                                            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-800 dark:text-white"
                                            value={rewardForm.deliveryType || 'MANUAL'}
                                            onChange={e => setRewardForm(prev => ({ ...prev, deliveryType: e.target.value as any }))}
                                        >
                                            <option value="MANUAL">Manual (En caja)</option>
                                            <option value="AUTOMATICO">Automático (Chat/App)</option>
                                        </select>
                                        <input
                                            className="col-span-2 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-800 dark:text-white"
                                            placeholder="Descripción del canje"
                                            value={rewardForm.descripcion || ''}
                                            onChange={e => setRewardForm(prev => ({ ...prev, descripcion: e.target.value }))}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addReward}
                                        className="w-full py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors"
                                    >
                                        Añadir Premio
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-8 py-5 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !form.nombre || !form.descripcion}
                        className="flex-1 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-50 transition-all hover:shadow-lg"
                        style={{ background: form.color || '#ec4899' }}
                    >
                        {saving ? '⏳ Guardando...' : isEditing ? '✓ Actualizar Plantilla' : '✓ Crear Plantilla'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Componente Principal: MarketplaceClient ────────────────────────────────
export default function MarketplaceClient({ initialTemplates }: { initialTemplates: Template[] }) {
    const [templates, setTemplates] = useState<Template[]>(initialTemplates);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [viewTemplate, setViewTemplate] = useState<Template | null>(null);

    const fetchTemplates = useCallback(async () => {
        try {
            setLoading(true);
            const url = activeCategory !== 'ALL'
                ? `/api/superadmin/plantillas?categoria=${activeCategory}`
                : '/api/superadmin/plantillas';
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) setTemplates(data.templates || []);
        } catch {
            console.error('Error al cargar plantillas');
        } finally {
            setLoading(false);
        }
    }, [activeCategory]);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta plantilla? Esta acción no se puede deshacer.')) return;
        try {
            setDeletingId(id);
            await fetch(`/api/superadmin/plantillas/${id}`, { method: 'DELETE' });
            await fetchTemplates();
        } catch {
            alert('Error al eliminar la plantilla');
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = templates.filter(t =>
        t.nombre.toLowerCase().includes(search.toLowerCase()) ||
        t.descripcion.toLowerCase().includes(search.toLowerCase()) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    );

    // Estadísticas del marketplace
    const totalInstalls = templates.reduce((sum, t) => sum + (t.installCount || 0), 0);
    const featuredCount = templates.filter(t => t.featured).length;
    const avgRating = templates.length > 0
        ? (templates.reduce((sum, t) => sum + (t.rating || 5), 0) / templates.length).toFixed(1)
        : '5.0';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-8">
            {/* ─── Header ─── */}
            <div className="mb-8">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/30">
                                <Package size={16} className="text-white" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-pink-500">Citiox Enterprise</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Marketplace de Plantillas
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                            Gestiona la Biblioteca Oficial de Citiox. Crea, edita y publica plantillas para los negocios.
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditingTemplate(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black text-white shadow-lg transition-all hover:scale-105 hover:shadow-pink-500/30"
                        style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
                    >
                        <Plus size={16} />
                        Nueva Plantilla
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {[
                        { label: 'Plantillas', value: templates.length, icon: Layers, color: '#ec4899' },
                        { label: 'Instalaciones', value: totalInstalls, icon: Download, color: '#8b5cf6' },
                        { label: 'Destacadas', value: featuredCount, icon: Crown, color: '#f59e0b' },
                        { label: 'Rating Promedio', value: avgRating, icon: Star, color: '#22c55e' },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: stat.color + '22' }}>
                                    <stat.icon size={17} style={{ color: stat.color }} />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── Filtros ─── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
                {/* Search */}
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:bg-slate-900 dark:text-white focus:outline-none focus:border-pink-400"
                        placeholder="Buscar plantillas, tags..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                {/* Category Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5 md:pb-0">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                activeCategory === cat.id
                                    ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Grid de Plantillas ─── */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw size={24} className="animate-spin text-pink-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filtered.map(tpl => (
                        <div
                            key={tpl.id}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all group"
                        >
                            {/* Color band */}
                            <div className="h-1.5 w-full" style={{ background: tpl.color }} />

                            <div className="p-6">
                                {/* Top row */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
                                            style={{ background: tpl.color + '22', border: `2px solid ${tpl.color}44` }}
                                        >
                                            <Award size={20} style={{ color: tpl.color }} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{tpl.nombre}</h3>
                                            <p className="text-[10px] text-slate-400 font-semibold">v{tpl.versionSemantica} · {tpl.autor}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {tpl.featured && (
                                            <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200">🔥 Featured</span>
                                        )}
                                        {tpl.esPredeterminada && (
                                            <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">⭐ Defecto</span>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4 line-clamp-2">
                                    {tpl.descripcion}
                                </p>

                                {/* Categories */}
                                {tpl.categorias?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {tpl.categorias.slice(0, 3).map((cat, i) => (
                                            <span key={i} className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                                                {cat}
                                            </span>
                                        ))}
                                        {tpl.categorias.length > 3 && (
                                            <span className="text-[8px] font-bold text-slate-400">+{tpl.categorias.length - 3}</span>
                                        )}
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-semibold mb-5">
                                    <span className="flex items-center gap-1"><Download size={10} /> {tpl.installCount || 0}</span>
                                    <span className="flex items-center gap-1"><Star size={10} /> {tpl.rating || 5.0}</span>
                                    <span className="flex items-center gap-1"><Layers size={10} /> {tpl.Missions?.length || 0} misiones</span>
                                    <span className="flex items-center gap-1">
                                        {tpl.gratuito ? <><Globe size={10} /> Gratis</> : <><Lock size={10} /> ${tpl.precio}</>}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 pt-4">
                                    <button
                                        onClick={() => setViewTemplate(tpl)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <Eye size={12} /> Ver
                                    </button>
                                    <button
                                        onClick={() => { setEditingTemplate(tpl); setShowModal(true); }}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                    >
                                        <Edit3 size={12} /> Editar
                                    </button>
                                    <div className="flex-1" />
                                    <button
                                        onClick={() => handleDelete(tpl.id)}
                                        disabled={deletingId === tpl.id}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 size={12} />
                                        {deletingId === tpl.id ? '...' : 'Eliminar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="col-span-full text-center py-20">
                            <p className="text-5xl mb-4">🏪</p>
                            <p className="text-slate-500 font-semibold">No hay plantillas que coincidan con tu búsqueda.</p>
                            <button
                                onClick={() => { setSearch(''); setActiveCategory('ALL'); }}
                                className="mt-3 text-sm text-pink-500 hover:underline font-bold"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal detalle de plantilla */}
            {viewTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: viewTemplate.color }}>
                                    <Award size={18} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{viewTemplate.nombre}</h3>
                                    <p className="text-xs text-slate-400">v{viewTemplate.versionSemantica} · {viewTemplate.installCount} instalaciones</p>
                                </div>
                            </div>
                            <button onClick={() => setViewTemplate(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">{viewTemplate.descripcion}</p>
                            <div>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Misiones ({viewTemplate.Missions?.length || 0})</p>
                                <div className="space-y-2">
                                    {(viewTemplate.Missions || []).map((m, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: DIFFICULTY_COLORS[m.difficulty] + '22' }}>
                                                <Award size={12} style={{ color: DIFFICULTY_COLORS[m.difficulty] }} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-slate-800 dark:text-white">{m.nombre}</p>
                                                <p className="text-[10px] text-slate-400">{m.triggerEvent} · {m.difficulty} · Meta: {m.cantidadMeta}</p>
                                            </div>
                                            <span className="text-[10px] font-bold text-purple-600">{m.xp} XP</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Cupones */}
                            {viewTemplate.coupons && viewTemplate.coupons.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Cupones ({viewTemplate.coupons.length})</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {viewTemplate.coupons.map((c, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-pink-100 dark:bg-pink-900/30 shrink-0">
                                                    <Ticket size={12} className="text-pink-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-pink-600 dark:text-pink-400 truncate">{c.codigo}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">
                                                        {c.tipo === 'PORCENTAJE' ? `${c.valor}%` : `$${c.valor}`} · {c.descripcion}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Premios */}
                            {viewTemplate.rewards && viewTemplate.rewards.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Premios ({viewTemplate.rewards.length})</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {viewTemplate.rewards.map((r, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 shrink-0">
                                                    <Gift size={12} className="text-purple-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{r.nombre}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">
                                                        🏆 {r.costoPuntos} pts · {r.tipo} · {r.deliveryType}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear/Editar */}
            {showModal && (
                <TemplateFormModal
                    template={editingTemplate}
                    onClose={() => { setShowModal(false); setEditingTemplate(null); }}
                    onSaved={fetchTemplates}
                />
            )}
        </div>
    );
}
