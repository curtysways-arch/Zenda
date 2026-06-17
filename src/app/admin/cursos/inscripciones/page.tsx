'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Users, Search, Loader2, CheckCircle2, XCircle, Clock,
    ArrowLeft, Phone, Mail, FileText, Filter, ChevronDown,
    GraduationCap, RefreshCw, AlertTriangle, UserCheck, UserX
} from 'lucide-react';
import Link from 'next/link';

type EnrollmentStatus = 'pending' | 'approved' | 'rejected' | 'all';

interface Enrollment {
    id: string;
    status: string;
    createdAt: string;
    comments?: string;
    student: {
        name: string;
        age?: number;
        representative_name?: string;
        phone?: string;
        email?: string;
    };
    course: {
        id: string;
        name: string;
        capacity: number;
    };
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    approved: { label: 'Aprobado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

export default function InscripcionesPage() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<EnrollmentStatus>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
    const [filterCourse, setFilterCourse] = useState('all');

    const fetchEnrollments = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterStatus !== 'all') params.set('status', filterStatus);
            if (filterCourse !== 'all') params.set('courseId', filterCourse);

            const res = await fetch(`/api/admin/cursos/inscripciones?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setEnrollments(data);
            }
        } catch (error) {
            console.error('Error fetching enrollments:', error);
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterCourse]);

    const fetchCourses = async () => {
        try {
            const res = await fetch('/api/admin/cursos');
            if (res.ok) {
                const data = await res.json();
                setCourses(data.map((c: any) => ({ id: c.id, name: c.name })));
            }
        } catch { }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        fetchEnrollments();
    }, [fetchEnrollments]);

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        setActionLoading(id + status);
        try {
            const res = await fetch(`/api/admin/cursos/inscripciones/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchEnrollments();
            } else {
                const data = await res.json();
                alert(data.error || 'Error al actualizar');
            }
        } catch {
            alert('Error al actualizar la inscripción');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta inscripción?')) return;
        try {
            await fetch(`/api/admin/cursos/inscripciones/${id}`, { method: 'DELETE' });
            fetchEnrollments();
        } catch { }
    };

    const filtered = enrollments.filter(e => {
        const term = searchTerm.toLowerCase();
        return (
            e.student.name.toLowerCase().includes(term) ||
            (e.student.email || '').toLowerCase().includes(term) ||
            (e.student.phone || '').includes(term) ||
            e.course.name.toLowerCase().includes(term)
        );
    });

    const pendingCount = enrollments.filter(e => e.status === 'pending').length;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Link href="/admin/cursos" className="text-emerald-600 font-bold text-xs flex items-center gap-1 hover:underline mb-2">
                        <ArrowLeft size={14} /> Volver a Cursos
                    </Link>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3 uppercase">
                        <Users className="text-emerald-600" size={32} />
                        Inscripciones
                        {pendingCount > 0 && (
                            <span className="bg-amber-500 text-white text-sm px-3 py-1 rounded-full font-black animate-pulse">
                                {pendingCount}
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-500 font-medium italic">Revisa y gestiona las solicitudes de inscripción a tus cursos.</p>
                </div>
                <button
                    onClick={fetchEnrollments}
                    className="flex items-center gap-2 bg-white border border-gray-200 text-slate-700 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm self-start"
                >
                    <RefreshCw size={16} />
                    Actualizar
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Status Filter */}
                <div className="flex gap-2 flex-wrap">
                    {(['pending', 'approved', 'rejected', 'all'] as EnrollmentStatus[]).map(s => {
                        const cfg = s === 'all'
                            ? { label: 'Todas', color: 'bg-slate-100 text-slate-700 border-slate-200' }
                            : STATUS_LABELS[s];
                        const isActive = filterStatus === s;
                        return (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${isActive ? (s === 'all' ? 'bg-slate-800 text-white border-slate-800' : cfg.color + ' ring-2 ring-offset-1 ring-current') : 'bg-white ' + cfg.color}`}
                            >
                                {cfg.label}
                            </button>
                        );
                    })}
                </div>

                {/* Course Filter */}
                <div className="relative ml-auto">
                    <select
                        value={filterCourse}
                        onChange={e => setFilterCourse(e.target.value)}
                        className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                        <option value="all">Todos los cursos</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-3">
                <Search className="text-gray-400 ml-2" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por alumno, teléfono, correo o curso..."
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-700"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-emerald-600" size={40} />
                    <p className="text-gray-400 font-bold animate-pulse">Cargando inscripciones...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-[3rem] border-2 border-dashed border-gray-100 p-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300">
                        <Users size={40} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase">Sin inscripciones</h3>
                        <p className="text-gray-400 font-bold max-w-xs mx-auto italic mt-1">
                            {filterStatus === 'pending' ? 'No hay solicitudes pendientes por revisar.' : 'No se encontraron resultados.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(enrollment => {
                        const cfg = STATUS_LABELS[enrollment.status] || STATUS_LABELS.pending;
                        const StatusIcon = cfg.icon;
                        const isPending = enrollment.status === 'pending';

                        return (
                            <div
                                key={enrollment.id}
                                className={`bg-white rounded-[2rem] border shadow-sm transition-all ${isPending ? 'border-amber-200 shadow-amber-50' : 'border-gray-100'}`}
                            >
                                <div className="p-6 flex flex-col md:flex-row md:items-center gap-4">
                                    {/* Avatar + Info */}
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 font-black text-xl ${isPending ? 'bg-amber-100 text-amber-600' : enrollment.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                            {enrollment.student.name.charAt(0).toUpperCase()}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-black text-gray-900 uppercase text-sm truncate">{enrollment.student.name}</h3>
                                            </div>

                                            <div className="flex flex-wrap gap-3 mt-1.5">
                                                {enrollment.student.phone && (
                                                    <a href={`tel:${enrollment.student.phone}`} className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline">
                                                        <Phone size={11} /> {enrollment.student.phone}
                                                    </a>
                                                )}
                                                {enrollment.student.email && (
                                                    <a href={`mailto:${enrollment.student.email}`} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline">
                                                        <Mail size={11} /> {enrollment.student.email}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Course + Date */}
                                    <div className="flex flex-col gap-1 min-w-[180px]">
                                        <div className="flex items-center gap-2">
                                            <GraduationCap size={14} className="shrink-0" style={{ color: 'var(--primary-color)' }} />
                                            <span className="text-sm font-black text-gray-800 truncate">{enrollment.course.name}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-5">
                                            {new Date(enrollment.createdAt).toLocaleDateString('es-ES', {
                                                day: '2-digit', month: 'short', year: 'numeric'
                                            })}
                                        </p>
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border w-fit ${cfg.color}`}>
                                            <StatusIcon size={11} />
                                            {cfg.label}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {isPending && (
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                onClick={() => handleAction(enrollment.id, 'approved')}
                                                disabled={actionLoading !== null}
                                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-100 disabled:opacity-50"
                                            >
                                                {actionLoading === enrollment.id + 'approved'
                                                    ? <Loader2 size={14} className="animate-spin" />
                                                    : <UserCheck size={14} />
                                                }
                                                Aprobar
                                            </button>
                                            <button
                                                onClick={() => handleAction(enrollment.id, 'rejected')}
                                                disabled={actionLoading !== null}
                                                className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-500 border border-red-200 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                                            >
                                                {actionLoading === enrollment.id + 'rejected'
                                                    ? <Loader2 size={14} className="animate-spin" />
                                                    : <UserX size={14} />
                                                }
                                                Rechazar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Comments */}
                                {enrollment.comments && (
                                    <div className="px-6 pb-5">
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start gap-2">
                                            <FileText size={14} className="text-slate-400 mt-0.5 shrink-0" />
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
    );
}
