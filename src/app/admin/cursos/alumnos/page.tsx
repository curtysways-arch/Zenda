'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Search, Loader2, Phone, Mail, User, ArrowLeft, Trash2, Edit2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import StudentModal from '@/components/admin/cursos/StudentModal';

export default function StudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    const fetchStudents = async () => {
        try {
            const res = await fetch('/api/admin/cursos/alumnos');
            if (res.ok) {
                const data = await res.json();
                setStudents(data);
            }
        } catch (error) {
            console.error("Error fetching students", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.phone && s.phone.includes(searchTerm))
    );

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro quieres eliminar este alumno?')) return;
        try {
            const res = await fetch(`/api/admin/cursos/alumnos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchStudents();
            }
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Link href="/admin/cursos" className="text-emerald-600 font-bold text-xs flex items-center gap-1 hover:underline mb-2">
                        <ArrowLeft size={14} /> Volver a Cursos
                    </Link>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3 uppercase">
                        <Users className="text-emerald-600" size={32} />
                        Base de Alumnos
                    </h1>
                    <p className="text-gray-500 font-medium italic">Gestiona la base de datos de inscritos en tu academia.</p>
                </div>
                <button
                    onClick={() => { setSelectedStudent(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                    <Plus size={18} />
                    Registrar Alumno
                </button>
            </div>

            <div className="bg-white p-4 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-3">
                <Search className="text-gray-400 ml-2" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nombre, correo o teléfono..."
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-emerald-600" size={40} />
                    <p className="text-gray-400 font-bold animate-pulse">Cargando alumnos...</p>
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="bg-white rounded-[3rem] border-2 border-dashed border-gray-100 p-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300">
                        <User size={40} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase">Sin alumnos registrados</h3>
                        <p className="text-gray-400 font-bold max-w-xs mx-auto italic">Comienza registrando a tu primer estudiante para inscribirlo en cursos.</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Alumno</th>
                                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contacto</th>
                                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cursos Activos</th>
                                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-6">
                                            <p className="font-black text-gray-900 uppercase text-sm">{student.name}</p>
                                        </td>
                                        <td className="p-6 space-y-1">
                                            {student.phone && (
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                    <Phone size={12} className="text-emerald-500" /> {student.phone}
                                                </div>
                                            )}
                                            {student.email && (
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                    <Mail size={12} className="text-emerald-500" /> {student.email}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-wrap gap-1">
                                                {student.enrollments.length > 0 ? (
                                                    student.enrollments.map((en: any) => (
                                                        <span key={en.id} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded-full">
                                                            {en.course.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-300 italic">Ninguno</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right space-x-2">
                                            <button
                                                onClick={() => { setSelectedStudent(student); setIsModalOpen(true); }}
                                                className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(student.id)}
                                                className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <StudentModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchStudents}
                    student={selectedStudent}
                />
            )}
        </div>
    );
}
