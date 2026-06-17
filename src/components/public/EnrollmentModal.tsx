'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, User, Phone, Mail, Calendar, Info, Clock, CheckCircle, Loader2, AlertCircle, Plus, Trash2, Users, ChevronRight } from 'lucide-react';
import PhoneInput from '../ui/PhoneInput';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface EnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: any;
    businessSlug: string;
    primaryColor?: string;
}

export default function EnrollmentModal({ 
    isOpen, 
    onClose, 
    course, 
    businessSlug,
    primaryColor = '#10b981'
}: EnrollmentModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [students, setStudents] = useState([{ name: '' }]);
    const [formData, setFormData] = useState({
        representative_name: '',
        phone: '',
        email: '',
        comments: ''
    });

    // 🕒 PRE-RELLENAR DATOS DEL USUARIO
    useEffect(() => {
        if (isOpen) {
            const fetchProfile = async () => {
                try {
                    const res = await fetch(`/api/${businessSlug}/perfil`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data) {
                            setFormData(prev => ({
                                ...prev,
                                representative_name: data.nombre || prev.representative_name,
                                phone: data.telefono || prev.phone,
                                email: data.email || prev.email
                            }));
                            
                            // Si es la primera vez y no hay nombre en el participante, ponemos el del usuario
                            setStudents(prev => {
                                const newStudents = [...prev];
                                if (newStudents.length > 0 && !newStudents[0].name && data.nombre) {
                                    newStudents[0].name = data.nombre;
                                }
                                return newStudents;
                            });
                        }
                    } else {
                        // Si falla el perfil (no logged), intentamos con localStorage para invitados
                        const storedPhone = localStorage.getItem('user_phone');
                        const storedName = localStorage.getItem('user_name');
                        if (storedPhone) {
                            setFormData(prev => ({ ...prev, phone: storedPhone, representative_name: storedName || prev.representative_name }));
                            if (storedName) {
                                setStudents(prev => {
                                    const newStudents = [...prev];
                                    if (newStudents.length > 0 && !newStudents[0].name) {
                                        newStudents[0].name = storedName;
                                    }
                                    return newStudents;
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error fetching profile:", e);
                }
            };
            fetchProfile();
        }
    }, [isOpen, businessSlug]);

    const addStudent = () => {
        setStudents([...students, { name: '' }]);
    };

    const removeStudent = (index: number) => {
        if (students.length === 1) return;
        setStudents(students.filter((_, i) => i !== index));
    };

    const updateStudent = (index: number, field: string, value: string) => {
        const newStudents = [...students];
        newStudents[index] = { ...newStudents[index], [field]: value };
        setStudents(newStudents);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validaciones básicas
        const hasEmptyNames = students.some(s => !s.name.trim());
        if (hasEmptyNames || !formData.representative_name || !formData.phone) {
            setError("Por favor, completa todos los campos obligatorios.");
            setLoading(false);
            return;
        }

        try {
            const payload = {
                ...formData,
                studentList: students
            };

            const res = await fetch(`/api/${businessSlug}/cursos/${course.id}/inscribir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (res.ok) {
                // Guardar en cache local para sesión de invitado
                if (data.userId && data.userPhone) {
                    localStorage.setItem('user_id', data.userId);
                    localStorage.setItem('user_phone', data.userPhone);
                    localStorage.setItem('user_name', formData.representative_name);
                    localStorage.setItem('guest_session', 'true');
                    
                    // Guardar ID del curso inscrito
                    const enrolled = JSON.parse(localStorage.getItem('enrolled_courses') || '[]');
                    if (!enrolled.includes(course.id)) {
                        enrolled.push(course.id);
                        localStorage.setItem('enrolled_courses', JSON.stringify(enrolled));
                    }
                    window.dispatchEvent(new Event('course_enrolled'));
                }

                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    // Redirigir a la pantalla de detalle de inscripción
                    router.push(`/${businessSlug}/cursos/inscripcion/${data.enrollmentId}`);
                    onClose();
                    setStudents([{ name: '' }]);
                    setFormData({ representative_name: '', phone: '', email: '', comments: '' });
                }, 2000);
            } else {
                setError(data.detail || data.error || 'Error al procesar inscripción');
            }
        } catch (err) {
            setError('Error de conexión. Inténtelo más tarde.');
        } finally {
            setLoading(false);
        }
    };

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const totalPrice = course.price * students.length;

    const modalContent = (
        <div className="fixed inset-0 z-[2000000] bg-white flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden shadow-2xl">
            <div className="w-full h-full flex flex-col relative text-slate-900 bg-white">
                {/* Header Spa - Simple & Clean */}
                <div className="px-6 pt-10 pb-6 border-b border-slate-100 flex items-start justify-between shrink-0 bg-white sticky top-0 z-50">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>INSCRIPCIÓN</span>
                            <div className="h-px flex-1 bg-slate-100 min-w-[20px]" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                            {course.name}
                        </h2>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] pt-1" style={{ color: primaryColor }}>
                            CUPOS LIMITADOS DISPONIBLES
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-3 bg-slate-50 hover:bg-slate-100 active:scale-90 rounded-full transition-all border border-slate-100 text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 bg-white pb-32">
                    {success ? (
                        <div className="py-20 text-center space-y-6 flex flex-col items-center animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-inner" style={{ backgroundColor: `${primaryColor}10` }}>
                                <CheckCircle size={40} style={{ color: primaryColor }} strokeWidth={3} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">¡LISTO!</h3>
                                <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto leading-relaxed">
                                    Hemos recibido la inscripción para <span className="font-bold" style={{ color: primaryColor }}>{students.length} alumno(s)</span>. 
                                    Te contactaremos pronto.
                                </p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="px-8 py-3 rounded-full font-bold text-[10px] uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg"
                            >
                                VOLVER
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-12">
                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 animate-in fade-in duration-300">
                                    <AlertCircle size={18} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                                </div>
                            )}

                            {/* SECCIÓN ALUMNOS */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: '#000000' }}>
                                        <Users size={14} /> DATOS DE PARTICIPANTES
                                    </h4>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-3 py-1 rounded-full">
                                        {students.length} DE {course.capacity - (course._count?.enrollments || 0)} CUPOS
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {students.map((student, index) => (
                                        <div key={index} className="p-6 bg-slate-100/50 rounded-3xl border border-slate-100 space-y-6 relative group animate-in slide-in-from-bottom-2 duration-300">
                                            {students.length > 1 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => removeStudent(index)}
                                                    className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label 
                                                        className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1"
                                                        style={{ color: '#000000' }}
                                                    >
                                                        NOMBRE DEL PARTICIPANTE
                                                    </label>
                                                    <input
                                                        required
                                                        type="text"
                                                        placeholder="Nombre completo"
                                                        className="w-full px-5 py-4 bg-white border border-slate-200 focus:border-opacity-100 rounded-2xl outline-none text-sm font-bold shadow-sm transition-all placeholder:text-slate-400"
                                                        style={{ color: '#000000', borderColor: 'rgba(0,0,0,0.1)' }}
                                                        value={student.name}
                                                        onChange={(e) => updateStudent(index, 'name', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button 
                                        type="button"
                                        onClick={addStudent}
                                        className="w-full py-4 rounded-2xl border border-dashed border-slate-200 text-slate-500 hover:border-slate-400 transition-all font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 bg-slate-50/50"
                                        style={{ color: '#64748b' }}
                                    >
                                        <Plus size={14} /> AÑADIR OTRO PARTICIPANTE
                                    </button>
                                </div>
                            </div>

                            {/* REPRESENTANTE */}
                            <div className="space-y-6 pt-6 border-t border-slate-50">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: '#000000' }}>
                                    <User size={14} /> DATOS DE CONTACTO
                                </h4>

                                <div className="space-y-6 p-6 bg-slate-100/50 rounded-3xl border border-slate-100">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: '#000000' }}>TU NOMBRE</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Tu nombre completo"
                                            className="w-full px-5 py-4 bg-white border border-slate-200 focus:border-opacity-100 rounded-2xl outline-none text-sm font-bold shadow-sm transition-all placeholder:text-slate-400"
                                            style={{ color: '#000000', borderColor: 'rgba(0,0,0,0.1)' }}
                                            value={formData.representative_name}
                                            onChange={(e) => setFormData({ ...formData, representative_name: e.target.value })}
                                        />
                                    </div>
                                    <PhoneInput
                                        label="TELÉFONO DE CONTACTO"
                                        value={formData.phone}
                                        onChange={(val) => setFormData({ ...formData, phone: val })}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </form>
                )}
            </div>

            {/* Floating Footer - Like the screenshot */}
            {!success && (
                <div className="shrink-0 p-6 bg-white border-t border-slate-100 flex flex-col items-center gap-4 sticky bottom-0 z-[60] pb-10">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">VALOR DEL PROGRAMA</span>
                        <span className="text-4xl font-black tracking-tight leading-none" style={{ color: primaryColor }}>${totalPrice.toLocaleString()}</span>
                    </div>
                    
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full h-16 text-white rounded-full flex items-center justify-center gap-3 font-black text-[13px] uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-xl"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 20px 25px -5px ${primaryColor}40` }}
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                        INSCRIBIRSE <ChevronRight size={20} strokeWidth={4} />
                    </button>
                </div>
            )}
        </div>
    </div>
);

    return createPortal(modalContent, document.body);
}
