'use client';

import { useState } from 'react';
import { 
    Plus, 
    Users, 
    Search, 
    ChevronRight, 
    Clock, 
    Scissors,
    Shield,
    MoreVertical,
    Star,
    Zap,
    Edit2,
    Trash2
} from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';

interface MobileStaffProps {
    staff: any[];
    primaryColor: string;
    onNew: () => void;
    onEdit: (member: any) => void;
    onSchedule: (member: any) => void;
    onDelete: (id: string) => void;
}

export default function MobileStaff({ staff, primaryColor, onNew, onEdit, onSchedule, onDelete }: MobileStaffProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredStaff = staff.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 animate-in fade-in duration-500 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-100 p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Equipo</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Gestiona tus profesionales</p>
                    </div>
                    <button 
                        onClick={onNew}
                        className="size-12 rounded-2xl text-white shadow-xl flex items-center justify-center active:scale-90 transition-all"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                        type="text"
                        placeholder="BUSCAR PROFESIONAL..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 transition-all shadow-inner"
                        style={{ '--tw-ring-color': primaryColor } as any}
                    />
                </div>
            </div>

            {/* List */}
            <div className="p-6 space-y-6">
                {filteredStaff.length > 0 ? filteredStaff.map((member) => (
                    <div 
                        key={member.id}
                        className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm active:scale-[0.98] transition-all group overflow-hidden relative"
                    >
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] -mr-16 -mt-16" style={{ backgroundColor: primaryColor, opacity: 0.03 }} />
                        
                        <div className="flex gap-5">
                            {/* Avatar */}
                            <div className="size-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                {(member.imageMedia || member.avatar) ? (
                                    <img src={getImageUrl(member.imageMedia || member.avatar, 'thumb')} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-black text-slate-200">{member.name.charAt(0)}</span>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase tracking-widest italic" style={{ color: primaryColor }}>{member.role || 'Profesional'}</span>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg">
                                        <div className={cn("size-1.5 rounded-full", member.active ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{member.active ? 'Activo' : 'Offline'}</span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase italic leading-tight truncate mt-1">
                                    {member.name}
                                </h3>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {member.services.slice(0, 2).map((s: any) => (
                                        <span key={s.id} className="text-[8px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg uppercase tracking-tighter italic">{s.nombre}</span>
                                    ))}
                                    {member.services.length > 2 && (
                                        <span className="text-[8px] font-black text-slate-300 px-2 py-1 uppercase tracking-tighter italic">+{member.services.length - 2}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions Footer */}
                        <div className="mt-6 pt-6 border-t border-slate-50 flex gap-3">
                            <button 
                                onClick={() => onSchedule(member)}
                                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-slate-100"
                            >
                                <Clock size={14} />
                                Horarios
                            </button>
                            <button 
                                onClick={() => onEdit(member)}
                                className="flex-1 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                <Edit2 size={14} />
                                Editar
                            </button>
                            <button 
                                onClick={() => onDelete(member.id)}
                                className="size-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center active:scale-95 transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                            <Users size={32} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No se encontraron profesionales</p>
                    </div>
                )}
            </div>
        </div>
    );
}
