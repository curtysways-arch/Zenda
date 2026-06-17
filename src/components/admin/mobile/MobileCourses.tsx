'use client';

import { useState } from 'react';
import { 
    Plus, 
    GraduationCap, 
    Users, 
    Clock, 
    Calendar, 
    ChevronRight, 
    Search,
    MoreVertical,
    Star,
    Zap,
    DollarSign,
    Edit2,
    Trash2
} from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import Link from 'next/link';

interface MobileCoursesProps {
    courses: any[];
    primaryColor: string;
    onNew: () => void;
    onEdit: (course: any) => void;
    onDelete: (id: string) => void;
}

export default function MobileCourses({ courses, primaryColor, onNew, onEdit, onDelete }: MobileCoursesProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCourses = courses.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.coach && c.coach.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 animate-in fade-in duration-500 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-100 p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Cursos</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Capacitaciones y Talleres</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/admin/cursos/inscripciones" className="size-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 active:scale-90 transition-all">
                            <Users size={20} />
                        </Link>
                        <button 
                            onClick={onNew}
                            className="size-12 rounded-2xl text-white shadow-xl flex items-center justify-center active:scale-90 transition-all"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Plus size={24} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                        type="text"
                        placeholder="BUSCAR CURSO..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 transition-all shadow-inner"
                        style={{ '--tw-ring-color': primaryColor } as any}
                    />
                </div>
            </div>

            {/* Quick Actions / Filters */}
            <div className="flex gap-4 p-6 overflow-x-auto hide-scrollbar">
                {['Todos', 'Activos', 'Próximos', 'Finalizados'].map((filter) => (
                    <button 
                        key={filter}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                            filter === 'Todos' ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-white text-slate-400 border-slate-100"
                        )}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="p-6 space-y-8">
                {filteredCourses.length > 0 ? filteredCourses.map((course) => (
                    <div 
                        key={course.id}
                        className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm active:scale-[0.99] transition-all group relative flex flex-col"
                    >
                        {/* Course Image & Status */}
                        <div className="h-44 bg-slate-900 relative">
                            {(course.imageMedia || course.imageUrl) ? (
                                <img src={getImageUrl(course.imageMedia || course.imageUrl, 'medium')} alt={course.name} className="w-full h-full object-cover opacity-60" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/10">
                                    <GraduationCap size={64} />
                                </div>
                            )}
                            <div className="absolute top-4 left-4">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-white shadow-xl backdrop-blur-md",
                                    course.status === 'active' ? "bg-emerald-500/80" : "bg-slate-900/40"
                                )}>
                                    {course.status}
                                </span >
                            </div>
                            
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={() => onEdit(course)} className="size-10 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => onDelete(course.id)} className="size-10 rounded-xl bg-rose-500/20 backdrop-blur-md text-rose-500 flex items-center justify-center">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                                <div className="text-white space-y-1">
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">{course.name}</h3>
                                    <p className="text-[10px] font-bold text-white/60 italic">Prof. {course.coach}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Precio</span>
                                    <p className="text-2xl font-black text-white italic tracking-tighter leading-none mt-1">${course.price}</p>
                                </div>
                            </div>
                        </div>

                        {/* Stats & Info */}
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <Users size={16} style={{ color: primaryColor }} />
                                    <div>
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1 italic">Inscritos</p>
                                        <p className="text-sm font-black text-slate-900 leading-none">{course._count.enrollments} / {course.capacity}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <Calendar size={16} style={{ color: primaryColor }} />
                                    <div>
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1 italic">Fecha</p>
                                        <p className="text-sm font-black text-slate-900 leading-none">{course.start_date ? new Date(course.start_date).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-slate-300" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                                        Pago {String(course.payment_type).toUpperCase() === 'TOTAL' ? 'Único' : 'Mensual'}
                                    </span>
                                </div>
                                <Link 
                                    href={`/admin/cursos/${course.id}`}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest italic"
                                    style={{ color: primaryColor }}
                                >
                                    Ver detalles
                                    <ChevronRight size={14} />
                                </Link>
                            </div>
                        </div>

                        {course.pendingCount > 0 && (
                            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                <div className="bg-amber-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce">
                                    <Star size={12} className="fill-white" />
                                    {course.pendingCount} Solicitudes
                                </div>
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                            <GraduationCap size={32} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No se encontraron cursos</p>
                    </div>
                )}
            </div>
        </div>
    );
}
