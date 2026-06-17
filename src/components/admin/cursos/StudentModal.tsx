'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, Info, User, Phone, Mail, Calendar, UserPlus } from 'lucide-react';
import PhoneInput from '../../ui/PhoneInput';

interface StudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    student?: any;
}

export default function StudentModal({ isOpen, onClose, onSuccess, student }: StudentModalProps) {
    const isEdit = !!student;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        age: '',
        representative_name: '',
        phone: '',
        email: ''
    });

    useEffect(() => {
        if (student) {
            setFormData({
                name: student.name,
                age: student.age?.toString() || '',
                representative_name: student.representative_name || '',
                phone: student.phone || '',
                email: student.email || ''
            });
        }
    }, [student]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(isEdit ? `/api/admin/cursos/alumnos/${student.id}` : '/api/admin/cursos/alumnos', {
                method: isEdit ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                setError(data.error || 'Error al guardar');
            }
        } catch (err: any) {
            setError('Error de conexión: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col scale-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white relative">
                    <UserPlus className="absolute -top-4 -left-4 text-emerald-50/50" size={100} />
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3 uppercase">
                            {isEdit ? 'Editar Alumno' : 'Registrar Nuevo Alumno'}
                        </h2>
                        <p className="text-gray-400 font-bold italic text-sm">Completa la información del estudiante.</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-all relative z-10">
                        <X size={24} className="text-gray-400 hover:text-gray-900" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in shake duration-500">
                            <AlertCircle size={20} />
                            <p className="text-sm font-bold leading-tight">{error}</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Nombre del Alumno */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <User size={14} className="text-emerald-500" /> Nombre Completo del Alumno
                            </label>
                            <input
                                required
                                type="text"
                                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-sm font-black text-gray-700 shadow-sm"
                                placeholder="Nombre completo"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Edad */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                    <Calendar size={14} className="text-emerald-500" /> Edad (Años)
                                </label>
                                <input
                                    type="number"
                                    className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-black text-gray-700 shadow-sm"
                                    placeholder="Ej: 12"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                />
                            </div>

                            {/* Representante */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                    <Info size={14} className="text-emerald-500" /> Nombre del Representante
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-black text-gray-700 shadow-sm"
                                    placeholder="Padre, madre o tutor"
                                    value={formData.representative_name}
                                    onChange={(e) => setFormData({ ...formData, representative_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Teléfono */}
                                <PhoneInput
                                    label="Teléfono de Contacto"
                                    value={formData.phone}
                                    onChange={(val) => setFormData({ ...formData, phone: val })}
                                    placeholder="Número de teléfono"
                                    className="w-full"
                                />

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                    <Mail size={14} className="text-emerald-500" /> Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-black text-gray-700 shadow-sm"
                                    placeholder="ejemplo@correo.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-3 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {isEdit ? 'Actualizar Alumno' : 'Registrar Alumno'}
                    </button>
                </div>
            </div>
        </div>
    );
}
