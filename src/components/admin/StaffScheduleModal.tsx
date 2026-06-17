'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Calendar, Save, Loader2, Plus, Trash2, Copy, AlertCircle } from 'lucide-react';

interface Break {
    start: string;
    end: string;
}

interface Schedule {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breaks: Break[];
    active: boolean;
}

interface Exception {
    date: string;
    type: 'off' | 'custom';
    customStart?: string;
    customEnd?: string;
    reason?: string;
}

interface StaffScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffId: string;
    staffName: string;
}

const DAYS = [
    { id: 0, name: 'Domingo' },
    { id: 1, name: 'Lunes' },
    { id: 2, name: 'Martes' },
    { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' },
    { id: 5, name: 'Viernes' },
    { id: 6, name: 'Sábado' },
];

export default function StaffScheduleModal({ isOpen, onClose, staffId, staffName }: StaffScheduleModalProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [exceptions, setExceptions] = useState<Exception[]>([]);
    const [activeTab, setActiveTab] = useState<'weekly' | 'exceptions'>('weekly');

    useEffect(() => {
        if (isOpen) {
            fetchSchedule();
        }
    }, [isOpen, staffId]);

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/staff/${staffId}/schedule`);
            if (res.ok) {
                const data = await res.json();
                
                // Initialize weekly schedule for all days if not present
                const fullSchedules = DAYS.map(day => {
                    const existing = data.schedules.find((s: any) => s.dayOfWeek === day.id);
                    return {
                        dayOfWeek: day.id,
                        startTime: existing?.startTime || '09:00',
                        endTime: existing?.endTime || '18:00',
                        breaks: existing?.breaks ? JSON.parse(existing.breaks) : [],
                        active: existing ? existing.active : (day.id !== 0 && day.id !== 6) // Default off on weekends
                    };
                });
                
                setSchedules(fullSchedules);
                setExceptions(data.exceptions.map((e: any) => ({
                    ...e,
                    date: e.date.split('T')[0]
                })));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/staff/${staffId}/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedules, exceptions })
            });
            if (res.ok) {
                // Si tienes un sistema de toasts, úsalo aquí. Por ahora, un pequeño timeout antes de cerrar.
                onClose();
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.error || 'No se pudo guardar'}`);
            }
        } catch (error) {
            console.error(error);
            alert('Error crítico de conexión');
        } finally {
            setSaving(false);
        }
    };

    const updateSchedule = (dayIndex: number, field: keyof Schedule, value: any) => {
        setSchedules(prev => prev.map((s, i) => i === dayIndex ? { ...s, [field]: value } : s));
    };

    const addBreak = (dayIndex: number) => {
        setSchedules(prev => prev.map((s, i) => i === dayIndex ? { 
            ...s, 
            breaks: [...s.breaks, { start: '13:00', end: '14:00' }]
        } : s));
    };

    const removeBreak = (dayIndex: number, breakIndex: number) => {
        setSchedules(prev => prev.map((s, i) => i === dayIndex ? { 
            ...s, 
            breaks: s.breaks.filter((_, bi) => bi !== breakIndex)
        } : s));
    };

    const updateBreak = (dayIndex: number, breakIndex: number, field: keyof Break, value: string) => {
        setSchedules(prev => prev.map((s, i) => i === dayIndex ? { 
            ...s, 
            breaks: s.breaks.map((b, bi) => bi === breakIndex ? { ...b, [field]: value } : b)
        } : s));
    };

    const copyToAllDays = (dayIndex: number) => {
        const base = schedules[dayIndex];
        setSchedules(prev => prev.map(s => ({
            ...s,
            startTime: base.startTime,
            endTime: base.endTime,
            breaks: JSON.parse(JSON.stringify(base.breaks)),
            active: base.active
        })));
    };

    if (!isOpen) return null;

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                input[type="time"], input[type="text"], select {
                    color: #0f172a !important;
                    background-color: #ffffff !important;
                    color-scheme: light;
                }
                input::placeholder {
                    color: #64748b !important;
                }
            `}} />
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                            <Clock size={28} style={{ color: 'var(--primary-color)' }} />
                            Agenda de {staffName}
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configura horarios, descansos y excepciones</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white hover:text-rose-500 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-8 pt-4 gap-4 bg-slate-50">
                    <button 
                        onClick={() => setActiveTab('weekly')}
                        className={`px-6 py-3 rounded-t-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'weekly' ? 'bg-white border-x border-t border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        style={activeTab === 'weekly' ? { color: 'var(--primary-color)' } : {}}
                    >
                        Horario Semanal
                    </button>
                    <button 
                        onClick={() => setActiveTab('exceptions')}
                        className={`px-6 py-3 rounded-t-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'exceptions' ? 'bg-white border-x border-t border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        style={activeTab === 'exceptions' ? { color: 'var(--primary-color)' } : {}}
                    >
                        Días Libres / Excepciones
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary-color)' }} />
                            <p className="text-slate-400 font-black uppercase tracking-widest">Cargando agenda...</p>
                        </div>
                    ) : activeTab === 'weekly' ? (
                        <div className="space-y-4">
                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                                <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                <p className="text-sm text-amber-700 font-medium">Esta configuración define el horario habitual. Puedes usar el botón de copiar para aplicar un horario a toda la semana.</p>
                            </div>
                            
                            {schedules.map((s, idx) => (
                                <div key={s.dayOfWeek} className={`p-6 rounded-[2rem] border-2 transition-all ${s.active ? 'border-slate-100 bg-white shadow-sm' : 'border-slate-50 bg-slate-50/50 opacity-60'}`}>
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                        <div className="w-40 flex items-center gap-4">
                                            <input 
                                                type="checkbox" 
                                                checked={s.active} 
                                                onChange={(e) => updateSchedule(idx, 'active', e.target.checked)}
                                                className="size-6 rounded-lg cursor-pointer"
                                                style={ { accentColor: 'var(--primary-color)' } as any }
                                            />
                                            <span className="font-black text-slate-700 uppercase tracking-tight">{DAYS[s.dayOfWeek].name}</span>
                                        </div>

                                        {s.active ? (
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input 
                                                            type="time" 
                                                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none transition-all"
                                                            style={ { '--tw-border-opacity': '1', borderColor: 'transparent' } as any }
                                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                                            onBlur={(e) => e.target.style.borderColor = 'rgb(226, 232, 240)'}
                                                            value={s.startTime}
                                                            onChange={(e) => updateSchedule(idx, 'startTime', e.target.value)}
                                                        />
                                                    </div>
                                                    <span className="text-slate-300 font-bold">a</span>
                                                    <div className="relative">
                                                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input 
                                                            type="time" 
                                                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none transition-all"
                                                            style={ { '--tw-border-opacity': '1', borderColor: 'transparent' } as any }
                                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                                            onBlur={(e) => e.target.style.borderColor = 'rgb(226, 232, 240)'}
                                                            value={s.endTime}
                                                            onChange={(e) => updateSchedule(idx, 'endTime', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descansos / Almuerzo</span>
                                                        <button 
                                                            onClick={() => addBreak(idx)}
                                                            className="flex items-center gap-1 text-[10px] font-black uppercase transition-all"
                                                            style={{ color: 'var(--primary-color)' }}
                                                        >
                                                            <Plus size={12} /> Añadir descanso
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {s.breaks.map((b, bIdx) => (
                                                            <div key={bIdx} className="flex items-center gap-1 bg-white border border-slate-200 p-1 pl-3 rounded-lg group">
                                                                <input 
                                                                    type="time" 
                                                                    value={b.start}
                                                                    className="text-xs font-bold outline-none bg-transparent"
                                                                    onChange={(e) => updateBreak(idx, bIdx, 'start', e.target.value)}
                                                                />
                                                                <span className="text-slate-300">-</span>
                                                                <input 
                                                                    type="time" 
                                                                    value={b.end}
                                                                    className="text-xs font-bold outline-none bg-transparent"
                                                                    onChange={(e) => updateBreak(idx, bIdx, 'end', e.target.value)}
                                                                />
                                                                <button onClick={() => removeBreak(idx, bIdx)} className="p-1 text-slate-300 hover:text-rose-500">
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {s.breaks.length === 0 && <span className="text-xs text-slate-300 italic font-medium">Sin descansos</span>}
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => copyToAllDays(idx)}
                                                    className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all group"
                                                    title="Copiar a toda la semana"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-slate-400 text-xs font-black uppercase tracking-widest">Día no laborable</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6">
                             {/* Exceptions section placeholder - will expand if needed */}
                             <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400">
                                <Calendar size={48} className="mx-auto opacity-20 mb-4" />
                                <p className="font-black uppercase tracking-widest text-sm">Gestiona días de vacaciones o cambios puntuales</p>
                                 <button 
                                    className="mt-4 px-6 py-3 text-white rounded-full text-xs font-black uppercase tracking-widest transition-all"
                                    style={{ backgroundColor: 'var(--primary-color)' }}
                                >
                                    Próximamente: Añadir Excepción
                                </button>
                             </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 flex items-center justify-end gap-4 bg-slate-50">
                    <button 
                        onClick={onClose}
                        className="px-8 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-3 text-white font-black px-10 py-5 rounded-[2rem] shadow-xl disabled:opacity-50 transition-all active:scale-95 uppercase tracking-widest text-xs"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
        </>
    );
}
