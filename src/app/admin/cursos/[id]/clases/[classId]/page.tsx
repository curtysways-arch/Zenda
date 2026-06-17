'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Calendar, Loader2, Save, Users, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function ClassAttendancePage({ params }: { params: Promise<{ id: string; classId: string }> }) {
    const { id: courseId, classId } = use(params);
    const [classData, setClassData] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [attendances, setAttendances] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        try {
            const classRes = await fetch(`/api/admin/cursos/${courseId}/clases/${classId}`);
            if (classRes.ok) {
                setClassData(await classRes.json());
            }

            const attRes = await fetch(`/api/admin/cursos/${courseId}/clases/${classId}/asistencia`);
            if (attRes.ok) {
                const { enrollments: evs, attendances: atts } = await attRes.json();
                setEnrollments(evs);
                
                const attMap: Record<string, string> = {};
                atts.forEach((a: any) => {
                    attMap[a.user_id] = a.status;
                });
                setAttendances(attMap);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [courseId, classId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = Object.entries(attendances).map(([user_id, status]) => ({
                user_id, status
            }));

            const res = await fetch(`/api/admin/cursos/${courseId}/clases/${classId}/asistencia`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attendances: payload })
            });

            if (res.ok) {
                alert('Asistencia guardada correctamente.');
            } else {
                alert('Hubo un error al guardar la asistencia.');
            }
        } catch {
            alert('Error de conexión.');
        } finally {
            setSaving(false);
        }
    };

    const setStatus = (enrollmentId: string, status: string) => {
        setAttendances(prev => ({ ...prev, [enrollmentId]: status }));
    };

    if (loading) return (
        <div className="flex justify-center py-40">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
        </div>
    );

    if (!classData) return (
        <div className="p-8 text-center text-gray-500">
            <p>Clase no encontrada.</p>
            <Link href={`/admin/cursos/${courseId}?tab=clases`} className="text-emerald-500 hover:underline mt-4 inline-block">Volver</Link>
        </div>
    );

    const totalStudents = enrollments.length;
    const presentCount = Object.values(attendances).filter(v => v === 'present').length;
    const absentCount = Object.values(attendances).filter(v => v === 'absent').length;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <Link href={`/admin/cursos/${courseId}?tab=clases`} className="text-emerald-600 font-bold text-xs flex items-center gap-1 hover:underline mb-2">
                        <ArrowLeft size={14} /> Volver a Clases
                    </Link>
                    <h1 className="text-2xl font-black text-gray-900 uppercase">
                        Clase: <span className="text-emerald-600">{classData.title}</span>
                    </h1>
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2 mt-1">
                        <Calendar size={14} />
                        {new Date(classData.class_date).toLocaleString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-200 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Guardar Cambios
                </button>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex flex-wrap gap-6 justify-center md:justify-start">
                <div className="text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inscritos</p>
                    <p className="text-2xl font-black text-gray-900">{totalStudents}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Presentes</p>
                    <p className="text-2xl font-black text-emerald-500">{presentCount}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ausentes</p>
                    <p className="text-2xl font-black text-red-500">{absentCount}</p>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                    <Users className="text-gray-400" size={20} />
                    <h3 className="font-black text-gray-900 uppercase">Lista de Alumnos</h3>
                </div>
                {enrollments.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 font-bold italic">
                        No hay alumnos aprobados en este curso.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {enrollments.map(enrollment => {
                            const name = enrollment.student_name || enrollment.student?.name || 'N/A';
                            const status = attendances[enrollment.id];

                            return (
                                <div key={enrollment.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${status === 'present' ? 'bg-emerald-100 text-emerald-600' : status === 'absent' ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
                                            {name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 uppercase text-sm">{name}</p>
                                            <p className="text-xs font-bold text-gray-400">ID: {enrollment.id.slice(-6).toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                        <button
                                            onClick={() => setStatus(enrollment.id, 'present')}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${status === 'present' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-500/20' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
                                        >
                                            <CheckCircle2 size={14} /> Presente
                                        </button>
                                        <button
                                            onClick={() => setStatus(enrollment.id, 'absent')}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${status === 'absent' ? 'bg-white text-red-500 shadow-sm ring-1 ring-red-500/20' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
                                        >
                                            <XCircle size={14} /> Ausente
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
