'use client';

import { useState, useEffect } from 'react';
import { 
    Award, 
    ShieldCheck, 
    Users, 
    DollarSign, 
    CheckCircle2, 
    AlertTriangle, 
    Save, 
    RefreshCw,
    ExternalLink,
    Lock
} from 'lucide-react';

interface FounderProgramProps {
    familyId: string;
    familyName: string;
    familyCode: string;
    plans: any[];
    initialProgram?: any;
    onProgramUpdated?: (updatedProgram: any) => void;
}

export default function FamilyFounderTab({
    familyId,
    familyName,
    familyCode,
    plans,
    initialProgram,
    onProgramUpdated
}: FounderProgramProps) {
    const [program, setProgram] = useState({
        enabled: initialProgram?.enabled ?? false,
        maxMembers: initialProgram?.maxMembers ?? 25,
        currentMembers: initialProgram?.currentMembers ?? 0,
        founderPrice: initialProgram?.founderPrice ?? 10.0,
        currency: initialProgram?.currency ?? 'USD',
        billingPeriod: initialProgram?.billingPeriod ?? 'monthly',
        lifetimePrice: initialProgram?.lifetimePrice ?? true,
        founderPlanId: initialProgram?.founderPlanId ?? ''
    });

    const [founders, setFounders] = useState<any[]>([]);
    const [loadingFounders, setLoadingFounders] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Cargar programa actualizado y fundadores
    const loadFounders = async () => {
        setLoadingFounders(true);
        try {
            const res = await fetch(`/api/superadmin/familias/${familyId}/founders`);
            if (res.ok) {
                const data = await res.json();
                setFounders(data.founders || []);
            }
        } catch (err) {
            console.error("Error al cargar fundadores:", err);
        } finally {
            setLoadingFounders(false);
        }
    };

    useEffect(() => {
        if (initialProgram) {
            setProgram({
                enabled: initialProgram.enabled ?? false,
                maxMembers: initialProgram.maxMembers ?? 25,
                currentMembers: initialProgram.currentMembers ?? 0,
                founderPrice: initialProgram.founderPrice ?? 10.0,
                currency: initialProgram.currency ?? 'USD',
                billingPeriod: initialProgram.billingPeriod ?? 'monthly',
                lifetimePrice: initialProgram.lifetimePrice ?? true,
                founderPlanId: initialProgram.founderPlanId ?? ''
            });
        }
        loadFounders();
    }, [familyId, initialProgram]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveMessage(null);

        try {
            const res = await fetch(`/api/superadmin/familias/${familyId}/founder-program`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(program)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al guardar programa fundador');
            }

            setSaveMessage({ type: 'success', text: 'Configuración de Socios Fundadores actualizada correctamente' });
            if (onProgramUpdated) onProgramUpdated(data);
            loadFounders();
        } catch (err: any) {
            setSaveMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    const cuposRestantes = Math.max(0, program.maxMembers - program.currentMembers);
    const porcentajeOcupado = program.maxMembers > 0 
        ? Math.min(100, Math.round((program.currentMembers / program.maxMembers) * 100))
        : 0;

    return (
        <div className="space-y-8">
            {/* Header del Programa Fundador */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-3xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="size-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <Award size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                    Programa Socios Fundadores — {familyName}
                                </h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    program.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {program.enabled ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium mt-1">
                                Programa comercial exclusivo por familia con asignación atómica de cupos y precio congelado de por vida (<span className="font-mono font-bold text-slate-800">lockedPrice</span>).
                            </p>
                        </div>
                    </div>

                    {/* Stats rápidos */}
                    <div className="flex items-center gap-3">
                        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 text-center shadow-xs">
                            <span className="block text-[10px] font-black uppercase text-slate-400">Cupos Asignados</span>
                            <span className="text-lg font-black text-slate-900">{program.currentMembers} / {program.maxMembers}</span>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 text-center shadow-xs">
                            <span className="block text-[10px] font-black uppercase text-slate-400">Precio Fundador</span>
                            <span className="text-lg font-black text-amber-600">${program.founderPrice} <span className="text-xs text-slate-400 font-bold">{program.currency}</span></span>
                        </div>
                    </div>
                </div>

                {/* Barra de progreso de cupos */}
                <div className="mt-5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-600">Disponibilidad de Cupos Fundadores</span>
                        <span className="text-slate-900 font-extrabold">{cuposRestantes} cupos disponibles ({porcentajeOcupado}% asignado)</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200/70 rounded-full overflow-hidden p-0.5">
                        <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500 shadow-xs"
                            style={{ width: `${porcentajeOcupado}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Formulario de Configuración */}
            <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                    <div>
                        <h4 className="text-base font-black text-slate-900 tracking-tight">
                            Reglas Comerciales del Programa Fundador
                        </h4>
                        <p className="text-xs text-slate-500">
                            Configura cupos, precio preferencial y plan base para los nuevos negocios de esta vertical.
                        </p>
                    </div>

                    {/* Toggle Habilitar */}
                    <label className="relative inline-flex items-center cursor-pointer gap-2.5">
                        <input
                            type="checkbox"
                            checked={program.enabled}
                            onChange={e => setProgram({ ...program, enabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                        <span className="text-xs font-black text-slate-800">
                            {program.enabled ? 'Programa Habilitado' : 'Programa Deshabilitado'}
                        </span>
                    </label>
                </div>

                {saveMessage && (
                    <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
                        saveMessage.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                        {saveMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        {saveMessage.text}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Cupo Máximo */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Cupo Máximo Histórico
                        </label>
                        <input
                            type="number"
                            min={program.currentMembers}
                            value={program.maxMembers}
                            onChange={e => setProgram({ ...program, maxMembers: parseInt(e.target.value) || 0 })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold !text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                        />
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                            Mínimo permitido: {program.currentMembers} (socios actuales)
                        </p>
                    </div>

                    {/* Precio Fundador */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Precio Fundador ($)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">$</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={program.founderPrice}
                                onChange={e => setProgram({ ...program, founderPrice: parseFloat(e.target.value) || 0 })}
                                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold !text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                            Será el valor congelado en <span className="font-mono">lockedPrice</span>
                        </p>
                    </div>

                    {/* Moneda & Periodo */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Moneda / Frecuencia
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={program.currency}
                                onChange={e => setProgram({ ...program, currency: e.target.value })}
                                className="w-full px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold !text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                            >
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="COP">COP</option>
                                <option value="MXN">MXN</option>
                            </select>
                            <select
                                value={program.billingPeriod}
                                onChange={e => setProgram({ ...program, billingPeriod: e.target.value })}
                                className="w-full px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold !text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                            >
                                <option value="monthly">Mensual</option>
                                <option value="annual">Anual</option>
                                <option value="lifetime">Único (Vitalicio)</option>
                            </select>
                        </div>
                    </div>

                    {/* Plan Base Asignado */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Plan Base Asignado
                        </label>
                        <select
                            value={program.founderPlanId || ''}
                            onChange={e => setProgram({ ...program, founderPlanId: e.target.value })}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold !text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                        >
                            <option value="">Plan por Defecto de la Familia</option>
                            {plans.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (${p.price}) {p.isDefault ? '— (Default)' : ''}
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                            Plan que hereda las capacidades
                        </p>
                    </div>
                </div>

                {/* Switch de Precio Vitalicio */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3">
                        <Lock size={18} className="text-amber-600" />
                        <div>
                            <span className="text-xs font-extrabold text-slate-800 block">
                                Congelar Precio de Por Vida (Lifetime Guarantee)
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                                El negocio mantendrá este precio contractual independientemente de futuras alzas tarifarias de la plataforma.
                            </span>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={program.lifetimePrice}
                            onChange={e => setProgram({ ...program, lifetimePrice: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                    >
                        {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? 'Guardando...' : 'Guardar Reglas Fundadores'}
                    </button>
                </div>
            </form>

            {/* Tabla de Socios Fundadores Asignados */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h4 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <ShieldCheck size={18} className="text-amber-500" />
                            Socios Fundadores Registrados ({founders.length})
                        </h4>
                        <p className="text-xs text-slate-500">
                            Negocios activos con posición contractual y precio protegido asignado en esta familia.
                        </p>
                    </div>

                    <button
                        onClick={loadFounders}
                        disabled={loadingFounders}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors cursor-pointer"
                        title="Recargar listado"
                    >
                        <RefreshCw size={16} className={loadingFounders ? 'animate-spin' : ''} />
                    </button>
                </div>

                {loadingFounders ? (
                    <div className="text-center py-10 text-xs font-bold text-slate-400">
                        Cargando socios fundadores...
                    </div>
                ) : founders.length === 0 ? (
                    <div className="text-center py-12 space-y-2">
                        <Users size={36} className="mx-auto text-slate-300" />
                        <p className="text-sm font-bold text-slate-600">No hay socios fundadores registrados en esta familia</p>
                        <p className="text-xs text-slate-400">
                            Los nuevos negocios que se registren en esta vertical tomarán los cupos automáticamente mientras el programa esté habilitado.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    <th className="py-3 px-3">Cupo #</th>
                                    <th className="py-3 px-3">Negocio</th>
                                    <th className="py-3 px-3">Tipo</th>
                                    <th className="py-3 px-3">Plan Base</th>
                                    <th className="py-3 px-3">Locked Price</th>
                                    <th className="py-3 px-3">Precio Efectivo</th>
                                    <th className="py-3 px-3">Estado</th>
                                    <th className="py-3 px-3">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {founders.map((f: any) => (
                                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3 px-3 font-mono font-black text-amber-600">
                                            #{f.founderPosition || '—'}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="font-bold text-slate-900">{f.businessName}</div>
                                            <div className="text-[11px] text-slate-400">{f.businessSlug} • {f.businessPhone || f.businessEmail || 'Sin contacto'}</div>
                                        </td>
                                        <td className="py-3 px-3 text-slate-600 font-medium">
                                            {f.businessType}
                                        </td>
                                        <td className="py-3 px-3 font-semibold text-slate-800">
                                            {f.planName}
                                        </td>
                                        <td className="py-3 px-3">
                                            {f.lockedPrice !== null && f.lockedPrice !== undefined ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                                                    <Lock size={10} /> ${f.lockedPrice} {f.currency}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 font-medium">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 font-black text-slate-900">
                                            ${f.effectivePrice} {f.currency}
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                ['activa', 'active'].includes(f.status)
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : f.status === 'trial'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {f.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-slate-400 text-[11px] font-medium">
                                            {new Date(f.startDate || f.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
