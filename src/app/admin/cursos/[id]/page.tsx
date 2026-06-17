'use client';

import { useState, useEffect, use } from 'react';
import {
    ArrowLeft, GraduationCap, Users, Calendar, Clock, CheckCircle2, XCircle,
    Loader2, Phone, Mail, UserCheck, UserX, FileText, Edit2, Trash2
} from 'lucide-react';
import Link from 'next/link';
import CourseModal from '@/components/admin/cursos/CourseModal';
import CourseClassesTab from '@/components/admin/cursos/CourseClassesTab';

interface Enrollment {
    id: string;
    status: string;
    enrollment_date: string;
    comments?: string;
    student_name?: string;
    student_age?: number;
    guardian_name?: string;
    guardian_phone?: string;
    guardian_email?: string;
    student?: {
        name: string;
        age?: number;
        representative_name?: string;
        phone?: string;
        email?: string;
    } | null;
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    approved: { label: 'Aprobado', color: 'bg-slate-900 text-white border-slate-900', icon: CheckCircle2 },
    rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [course, setCourse] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'inscripciones' | 'alumnos' | 'clases'>('inscripciones');
    const [filterStatus, setFilterStatus] = useState<string>('pending');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const tab = urlParams.get('tab');
            if (tab === 'inscripciones' || tab === 'alumnos' || tab === 'clases') {
                setActiveTab(tab as 'inscripciones' | 'alumnos' | 'clases');
            }
        }
    }, []);

    const fetchCourse = async () => {
        try {
            const res = await fetch(`/api/admin/cursos/${id}`);
            if (res.ok) {
                const data = await res.json();
                setCourse(data);
            }
        } catch { }
    };

    const fetchEnrollments = async () => {
        try {
            const params = new URLSearchParams({ courseId: id });
            if (filterStatus !== 'all') params.set('status', filterStatus);
            const res = await fetch(`/api/admin/cursos/inscripciones?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setEnrollments(data);
            }
        } catch { }
    };

    useEffect(() => {
        Promise.all([fetchCourse(), fetchEnrollments()]).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchEnrollments();
    }, [filterStatus]);

    const handleAction = async (enrollmentId: string, status: 'approved' | 'rejected') => {
        setActionLoading(enrollmentId + status);
        try {
            const res = await fetch(`/api/admin/cursos/inscripciones/${enrollmentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchEnrollments();
                fetchCourse();
            } else {
                const data = await res.json();
                alert(data.error || 'Error al actualizar');
            }
        } catch {
            alert('Error al actualizar');
        } finally {
            setActionLoading(null);
        }
    };

    const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="animate-spin" size={40} style={{ color: 'var(--primary-color)' }} />
                <p className="text-gray-400 font-bold animate-pulse">Cargando curso...</p>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500">Curso no encontrado.</p>
                <Link href="/admin/cursos" className="font-bold mt-4 inline-block hover:underline" style={{ color: 'var(--primary-color)' }}>← Volver</Link>
            </div>
        );
    }

    const approvedCount = course._count?.enrollments ?? 0;
    const pendingCount = enrollments.filter(e => e.status === 'pending').length;
    const isFull = approvedCount >= course.capacity;

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                    <Link href="/admin/cursos" className="font-bold text-xs flex items-center gap-1 hover:underline mb-2" style={{ color: 'var(--primary-color)' }}>
                        <ArrowLeft size={14} /> Volver a Cursos
                    </Link>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3 uppercase">
                        <GraduationCap className="shrink-0" size={32} style={{ color: 'var(--primary-color)' }} />
                        {course.name}
                    </h1>
                    {course.coach && <p className="font-bold italic" style={{ color: 'var(--primary-color)' }}>Entrenador: {course.coach}</p>}
                </div>
                <button
                    onClick={() => setIsEditOpen(true)}
                    className="flex items-center gap-2 bg-white border border-gray-200 text-slate-800 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm self-start"
                >
                    <Edit2 size={16} />
                    Editar Curso
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estado</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${course.status === 'active' ? '' : 'bg-gray-100 text-gray-500'}`} style={course.status === 'active' ? { backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' } : {}}>
                        {course.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
                <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cupos</p>
                    <p className={`text-2xl font-black ${isFull ? 'text-red-500' : 'text-gray-900'}`}>
                        {approvedCount} <span className="text-sm text-gray-400">/ {course.capacity}</span>
                    </p>
                </div>
                <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pendientes</p>
                    <p className={`text-2xl font-black ${pendingCount > 0 ? 'text-amber-500' : 'text-gray-900'}`}>
                        {pendingCount}
                    </p>
                </div>
                <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Precio</p>
                    <p className="text-2xl font-black" style={{ color: 'var(--primary-color)' }}>${course.price?.toLocaleString()}</p>
                </div>
            </div>

            {/* Schedules */}
            {course.schedules?.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Calendar size={14} style={{ color: 'var(--primary-color)' }} /> Horarios Semanales
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {course.schedules.map((s: any) => (
                            <div key={s.id} className="px-4 py-2 rounded-xl text-sm font-black" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)', border: '1px solid color-mix(in srgb, var(--primary-color), transparent 80%)', color: 'var(--primary-color)' }}>
                                {DAYS[s.day_of_week]} · {s.start_time} – {s.end_time}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-100 flex gap-2 overflow-x-auto pb-1">
                {(['inscripciones', 'alumnos', 'clases'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { 
                            setActiveTab(tab); 
                            setFilterStatus(tab === 'inscripciones' ? 'pending' : 'approved'); 
                            window.history.replaceState(null, '', `?tab=${tab}`);
                        }}
                        className={`px-6 py-3 font-black text-sm uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? '' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        style={activeTab === tab ? { borderColor: 'var(--primary-color)', color: 'var(--primary-color)' } : {}}
                    >
                        {tab === 'inscripciones' ? (
                            <span className="flex items-center gap-2">
                                Inscripciones
                                {pendingCount > 0 && <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingCount}</span>}
                            </span>
                        ) : tab === 'alumnos' ? 'Alumnos' : 'Clases'}
                    </button>
                ))}
            </div>

            {/* Clases Tab */}
            {activeTab === 'clases' && (
                <CourseClassesTab courseId={id} />
            )}

            {/* Inscripciones Tab */}
            {activeTab === 'inscripciones' && (
                <div className="space-y-4">
                    {/* Filter */}
                    <div className="flex gap-2 flex-wrap">
                        {(['pending', 'approved', 'rejected', 'all'] as const).map(s => {
                            const cfg = s === 'all'
                                ? { label: 'Todas', color: 'bg-slate-100 text-slate-700 border-slate-200' }
                                : STATUS_CFG[s];
                            return (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`px-4 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'ring-2 ring-offset-1 ring-current ' + cfg.color : 'bg-white ' + cfg.color}`}
                                >
                                    {cfg.label}
                                </button>
                            );
                        })}
                    </div>

                    {enrollments.length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 p-16 text-center">
                            <Users size={40} className="text-gray-200 mx-auto mb-4" />
                            <p className="font-black text-gray-400 uppercase">Sin inscripciones en este estado</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {enrollments.map(enrollment => {
                                if (!enrollment) return null;
                                const cfg = STATUS_CFG[enrollment.status] || STATUS_CFG.pending;
                                const StatusIcon = cfg.icon;
                                const isPending = enrollment.status === 'pending';

                                const studentName = enrollment.student_name || enrollment.student?.name || 'N/A';
                                const studentAge = enrollment.student_age || enrollment.student?.age;
                                const guardianName = enrollment.guardian_name || enrollment.student?.representative_name;
                                const guardianPhone = enrollment.guardian_phone || enrollment.student?.phone;
                                const guardianEmail = enrollment.guardian_email || enrollment.student?.email;

                                return (
                                    <div key={enrollment.id} className={`bg-white rounded-[2rem] border shadow-sm ${isPending ? 'border-amber-200' : 'border-gray-100'}`}>
                                        <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                                            {/* Avatar */}
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${isPending ? 'bg-amber-100 text-amber-600' : enrollment.status === 'approved' ? 'bg-slate-100 text-slate-800' : 'bg-red-100 text-red-500'}`}>
                                                {studentName.charAt(0).toUpperCase()}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-black text-gray-900 uppercase text-sm">{studentName}</p>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase ${cfg.color}`}>
                                                        <StatusIcon size={10} />
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-3 mt-1">
                                                    {guardianPhone && (
                                                        <a href={`tel:${guardianPhone}`} className="flex items-center gap-1 text-[11px] font-bold hover:underline" style={{ color: 'var(--primary-color)' }}>
                                                            <Phone size={11} /> {guardianPhone}
                                                        </a>
                                                    )}
                                                    {guardianEmail && (
                                                        <a href={`mailto:${guardianEmail}`} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline">
                                                            <Mail size={11} /> {guardianEmail}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-gray-400 font-bold whitespace-nowrap">
                                                {new Date(enrollment.enrollment_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>

                                            {isPending && (
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleAction(enrollment.id, 'approved')}
                                                        disabled={actionLoading !== null}
                                                        className="flex items-center gap-1.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-slate-200"
                                                    >
                                                        {actionLoading === enrollment.id + 'approved' ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                                                        Aprobar
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(enrollment.id, 'rejected')}
                                                        disabled={actionLoading !== null}
                                                        className="flex items-center gap-1.5 bg-white hover:bg-red-50 disabled:opacity-50 text-red-500 border border-red-200 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                                                    >
                                                        {actionLoading === enrollment.id + 'rejected' ? <Loader2 size={13} className="animate-spin" /> : <UserX size={13} />}
                                                        Rechazar
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {enrollment.comments && (
                                            <div className="px-5 pb-4">
                                                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-start gap-2">
                                                    <FileText size={13} className="text-slate-400 mt-0.5 shrink-0" />
                                                    <p className="text-xs font-medium text-slate-600 italic">"{enrollment.comments}"</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Alumnos Tab */}
            {activeTab === 'alumnos' && (
                <div className="space-y-3">
                    {enrollments.length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 p-16 text-center">
                            <Users size={40} className="text-gray-200 mx-auto mb-4" />
                            <p className="font-black text-gray-400 uppercase">Sin alumnos aprobados</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Alumno</th>
                                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contacto</th>
                                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Inscrito el</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {enrollments.map(e => {
                                        const sName = e.student_name || e.student?.name || 'N/A';
                                        const sAge = e.student_age || e.student?.age;
                                        const gName = e.guardian_name || e.student?.representative_name;
                                        const gPhone = e.guardian_phone || e.student?.phone;
                                        const gEmail = e.guardian_email || e.student?.email;

                                        return (
                                            <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-5 font-black text-gray-900 uppercase text-sm">{sName}</td>
                                                <td className="p-5 space-y-1">
                                                    {gPhone && (
                                                        <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
                                                            <Phone size={11} style={{ color: 'var(--primary-color)' }} /> {gPhone}
                                                        </div>
                                                    )}
                                                    {gEmail && (
                                                        <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
                                                            <Mail size={11} className="text-blue-500" /> {gEmail}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-5 text-[11px] font-bold text-gray-400">
                                                    {new Date(e.enrollment_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Edit Modal */}
            {isEditOpen && (
                <CourseModal
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    onSuccess={() => { fetchCourse(); setIsEditOpen(false); }}
                    course={course}
                />
            )}
        </div>
    );
}
