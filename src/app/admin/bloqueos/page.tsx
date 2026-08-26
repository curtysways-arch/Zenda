'use client';

import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Calendar, Clock, Loader2, Dribbble } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from 'next-auth/react';

export default function BloqueosPage() {
    const [bloqueos, setBloqueos] = useState<any[]>([]);
    const [canchas, setCanchas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { data: session } = useSession();
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        horaInicio: '08:00',
        horaFin: '09:00',
        canchaId: '',
        motivo: 'Mantenimiento'
    });

    const fetchData = async () => {
        if (!session?.user) return;
        const negocioId = (session.user as any).negocioId;

        try {
            const [resBloqueos, resCanchas] = await Promise.all([
                fetch('/api/bloqueos'),
                fetch(`/api/canchas?negocioId=${negocioId}`)
            ]);
            const bData = await resBloqueos.json();
            const cData = await resCanchas.json();

            setBloqueos(Array.isArray(bData) ? bData : []);
            setCanchas(Array.isArray(cData) ? cData : []);

            if (Array.isArray(cData) && cData.length > 0) {
                setFormData(prev => ({ ...prev, canchaId: cData[0].id }));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchData();
        }
    }, [session]);

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

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-900 font-sans animate-in fade-in duration-500 text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">
                        GESTIÓN OPERATIVA
                    </span>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-3">
                        <Shield className="text-emerald-600" size={32} />
                        Bloqueos de Horario
                    </h1>
                    <p className="text-slate-500 font-bold text-xs">Inhabilita horarios específicos de tus canchas por mantenimiento o eventos.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                    <Plus size={18} />
                    NUEVO BLOQUEO
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bloqueos.map((bloqueo) => {
                    const canchaNombre = bloqueo.cancha?.nombre || bloqueo.Service?.nombre || 'General';
                    return (
                        <div key={bloqueo.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden relative group">
                            <div className="p-8 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                                        <Shield size={20} />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(bloqueo.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div>
                                    <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px] mb-2">Motivo</h3>
                                    <p className="text-sm font-bold text-gray-700">{bloqueo.motivo || 'Sin motivo especificado'}</p>
                                </div>

                                <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cancha</h4>
                                        <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                                            <Dribbble size={12} className="text-emerald-500" />
                                            {canchaNombre}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Horario</h4>
                                        <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                                            <Clock size={12} className="text-emerald-500" />
                                            {bloqueo.horaInicio} - {bloqueo.horaFin}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-2">
                                    <Calendar size={14} className="text-gray-400" />
                                    <span className="text-[10px] font-black text-gray-500 uppercase">
                                        {format(new Date(bloqueo.fecha), "EEEE d 'de' MMMM", { locale: es })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {bloqueos.length === 0 && (
                    <div className="lg:col-span-3 py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                        <Shield size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No hay horarios bloqueados</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 text-slate-900">
                        <div className="p-8 bg-gray-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                    <Shield size={20} className="text-red-400" />
                                </div>
                                <h2 className="text-lg font-black uppercase tracking-tight">Nuevo Bloqueo</h2>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-white/40 hover:text-white transition">Cerrar</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Fecha</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                        value={formData.fecha}
                                        onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Cancha</label>
                                    <select
                                        required
                                        className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold appearance-none text-gray-900"
                                        value={formData.canchaId}
                                        onChange={e => setFormData({ ...formData, canchaId: e.target.value })}
                                    >
                                        {canchas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Hora Inicio</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                        value={formData.horaInicio}
                                        onChange={e => setFormData({ ...formData, horaInicio: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Hora Fin</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                        value={formData.horaFin}
                                        onChange={e => setFormData({ ...formData, horaFin: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Motivo</label>
                                <input
                                    placeholder="Ej: Mantenimiento Preventivo"
                                    className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-bold text-gray-900"
                                    value={formData.motivo}
                                    onChange={e => setFormData({ ...formData, motivo: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-emerald-700 transition shadow-xl shadow-emerald-100 disabled:opacity-50 mt-4 cursor-pointer"
                            >
                                {saving ? 'Guardando...' : 'Crear Bloqueo de Horario'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
