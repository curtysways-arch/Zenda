'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, Plus, Trash2, Calendar, Clock, Loader2, Info, Users, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from 'next-auth/react';

export default function BloqueosPage() {
    const [bloqueos, setBloqueos] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { data: session } = useSession();
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        horaInicio: '08:00',
        horaFin: '09:00',
        staffId: '',
        motivo: 'Descanso / Almuerzo'
    });

    const fetchData = async () => {
        if (!session?.user) return;
        const negocioId = (session.user as any).negocioId;

        try {
            const [resBloqueos, resStaff] = await Promise.all([
                fetch('/api/bloqueos'),
                fetch(`/api/staff?negocioId=${negocioId}`)
            ]);
            const bData = await resBloqueos.json();
            const sData = await resStaff.json();

            setBloqueos(Array.isArray(bData) ? bData : []);
            setStaff(Array.isArray(sData) ? sData : []);

            if (Array.isArray(sData) && sData.length > 0) {
                setFormData(prev => ({ ...prev, staffId: sData[0].id }));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (session) {
            fetchData();
        }
    }, [session]);

    if (!mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/bloqueos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchData();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que quieres eliminar este bloqueo?')) return;
        try {
            await fetch(`/api/bloqueos/${id}`, { method: 'DELETE' });
            setBloqueos(prev => prev.filter(b => b.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando Bloqueos...</p>
            </div>
        );
    }

    const modalContent = isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300 light-theme">
            {/* Overlay con desenfoque real */}
            <div 
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-md" 
                onClick={() => setIsModalOpen(false)} 
            />
            
            {/* Modal / Bottom Sheet */}
            <div className="relative bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-500 border border-slate-100">
                {/* Handle lateral para móvil */}
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 sm:hidden" />
                
                <div className="p-6 sm:p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                            <Shield size={24} className="text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tight text-white !important">Nuevo Bloqueo</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Configuración Especialista</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(false)} 
                        className="size-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white"
                    >
                        <Plus size={24} className="rotate-45" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto hide-scrollbar flex-1 pb-10 sm:pb-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Día del Bloqueo</label>
                            <input
                                type="date"
                                required
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-slate-950 shadow-sm"
                                value={formData.fecha}
                                onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Especialista</label>
                            <div className="relative group">
                                <select
                                    required
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold appearance-none text-slate-950 pr-10 shadow-sm"
                                    value={formData.staffId}
                                    onChange={e => setFormData({ ...formData, staffId: e.target.value })}
                                >
                                    <option value="" className="text-slate-950">Seleccionar...</option>
                                    {staff.map(s => <option key={s.id} value={s.id} className="text-slate-950">{s.name}</option>)}
                                </select>
                                <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-emerald-500 transition-colors" size={18} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Hora Inicio</label>
                            <input
                                type="time"
                                required
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-slate-950 shadow-sm"
                                value={formData.horaInicio}
                                onChange={e => setFormData({ ...formData, horaInicio: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Hora Fin</label>
                            <input
                                type="time"
                                required
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-slate-950 shadow-sm"
                                value={formData.horaFin}
                                onChange={e => setFormData({ ...formData, horaFin: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Motivo Interno</label>
                        <textarea
                            rows={3}
                            placeholder="Ej: Licencia médica, descanso programado..."
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-slate-950 resize-none shadow-sm"
                            value={formData.motivo}
                            onChange={e => setFormData({ ...formData, motivo: e.target.value })}
                        />
                    </div>

                    <button
                        disabled={saving}
                        className="w-full py-5 bg-emerald-600 text-white font-black rounded-[2rem] text-sm uppercase tracking-[0.2em] hover:bg-emerald-700 transition shadow-xl shadow-emerald-500/20 disabled:opacity-50 mt-4 active:scale-95"
                    >
                        {saving ? 'Guardando...' : 'Crear Bloqueo'}
                    </button>
                </form>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative">
            {isModalOpen && createPortal(modalContent, document.body)}

            <div className="flex justify-between items-center px-2">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bloqueos de Agenda</h1>
                    <p className="text-slate-500 text-sm font-medium">Inhabilita horarios específicos para tus especialistas.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition shadow-xl shadow-slate-200 active:scale-95"
                >
                    <Plus size={20} />
                    Nuevo Bloqueo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bloqueos.map((bloqueo) => (
                    <div key={bloqueo.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden relative group transition-all hover:shadow-2xl hover:shadow-slate-200/60">
                        <div className="p-8 space-y-5">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
                                    <Shield size={24} />
                                </div>
                                <button
                                    onClick={() => handleDelete(bloqueo.id)}
                                    className="p-3 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 bg-slate-50 rounded-xl"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>

                            <div className="space-y-1">
                                <h3 className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Motivo</h3>
                                <p className="text-base font-bold text-slate-800">{bloqueo.motivo || 'Sin motivo especificado'}</p>
                            </div>

                            <div className="pt-5 border-t border-slate-50 grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialista</h4>
                                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <div className="size-2 rounded-full bg-emerald-500" />
                                        {bloqueo.staff?.name || 'General'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horario</h4>
                                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Clock size={16} className="text-emerald-500" />
                                        {bloqueo.horaInicio} - {bloqueo.horaFin}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {format(new Date(bloqueo.fecha), "EEEE d 'de' MMMM", { locale: es })}
                                </span>
                                <Calendar size={18} className="text-slate-300" />
                            </div>
                        </div>
                    </div>
                ))}

                {bloqueos.length === 0 && (
                    <div className="lg:col-span-3 py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                        <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Shield size={32} className="text-slate-200" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Cero Bloqueos</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">No hay horarios bloqueados activos</p>
                    </div>
                )}
            </div>
        </div>
    );
}
