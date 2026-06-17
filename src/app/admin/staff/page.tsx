"use client";

import { useState, useEffect, Suspense } from "react";
import { 
    Users, 
    Search, 
    Plus, 
    Shield, 
    Edit2, 
    Trash2, 
    Loader2,
    CheckCircle2,
    Briefcase,
    Clock,
    Scissors,
    Star
} from "lucide-react";
import StaffModal from "@/components/admin/StaffModal";
import StaffScheduleModal from "@/components/admin/StaffScheduleModal";
import { useSession } from "next-auth/react";
import MobileStaff from "@/components/admin/mobile/MobileStaff";
import FeatureGate from '@/components/ui/FeatureGate';
import { getImageUrl } from "@/lib/utils";

interface StaffMember {
    id: string;
    name: string;
    role: string | null;
    avatar: string | null;
    imageMedia?: { id: string; url: string; mimeType?: string; fileKey?: string; provider?: string } | null;
    active: boolean;
    ratingPromedio: number;
    totalReviews: number;
    services: any[];
    workingHours: any;
}

function StaffContent() {
    const { data: session } = useSession();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | undefined>();
    const [scheduleOpenFor, setScheduleOpenFor] = useState<StaffMember | undefined>();
    const [primaryColor, setPrimaryColor] = useState('#059669');

    const fetchStaff = async () => {
        if (!session?.user) return;
        setLoading(true);
        try {
            const negocioId = (session.user as any).negocioId;
            if (!negocioId) {
                console.error("No se encontró negocioId en la sesión");
                setLoading(false);
                return;
            }
            const res = await fetch(`/api/staff?businessId=${negocioId}`);
            if (res.ok) {
                const data = await res.json();
                setStaff(Array.isArray(data) ? data : []);
            } else {
                setStaff([]);
            }
        } catch (error) {
            console.error("Error fetching staff:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchStaff();
        }
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (color) setPrimaryColor(color);
    }, [session]);

    const handleEdit = (member: StaffMember) => {
        setSelectedStaff(member);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres eliminar a este profesional?")) return;
        try {
            const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchStaff();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreate = () => {
        setSelectedStaff(undefined);
        setIsModalOpen(true);
    };

    const filteredStaff = staff.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (s.role && s.role.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="animate-spin" size={48} style={{ color: primaryColor }} />
                <p className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Cargando Staff...</p>
            </div>
        );
    }

    return (
        <>
            {/* VISTA MÓVIL */}
            <div className="md:hidden -mx-5 -mt-5">
                <MobileStaff 
                    staff={staff}
                    primaryColor={primaryColor}
                    onNew={handleCreate}
                    onEdit={handleEdit}
                    onSchedule={(m) => setScheduleOpenFor(m)}
                    onDelete={handleDelete}
                />
            </div>

            {/* VISTA ESCRITORIO */}
            <div className="hidden md:block p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                            <Users size={36} style={{ color: primaryColor }} />
                            Gestión de Staff
                        </h1>
                        <p className="text-slate-600 font-medium">Administra a los profesionales y sus horarios de atención.</p>
                    </div>

                    <FeatureGate feature="multi_staff" fallbackMessage="Tu plan no permite agregar más profesionales.">
                        <button 
                            onClick={handleCreate}
                            className="flex items-center gap-2 text-white font-black px-6 py-4 rounded-[2rem] shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Plus size={18} /> Nuevo Profesional
                        </button>
                    </FeatureGate>
                </div>

                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 transition-colors" size={20} 
                            style={ { color: primaryColor } as any } />
                    <input 
                        type="text"
                        placeholder="Buscar por nombre o cargo..."
                        className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[2.5rem] font-bold text-slate-900 outline-none transition-all shadow-sm"
                        style={ { '--tw-border-opacity': '1' } as any }
                        onFocus={(e) => e.target.style.borderColor = primaryColor}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(241, 245, 249)'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStaff.map((member) => (
                        <div key={member.id} className="bg-white rounded-[3rem] border border-slate-100 p-8 space-y-6 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <div className="flex gap-2">
                                    <button onClick={() => setScheduleOpenFor(member)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-indigo-600 hover:bg-indigo-50 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2" title="Gestionar Agenda">
                                        <Clock size={16} /> Agenda
                                    </button>
                                    <button onClick={() => handleEdit(member)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl transition-all" 
                                            onMouseEnter={(e) => { e.currentTarget.style.color = primaryColor; e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--primary-color), transparent 90%)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(148, 163, 184)'; e.currentTarget.style.backgroundColor = 'rgb(248, 250, 252)'; }}
                                            title="Editar Personal">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(member.id)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-rose-600 hover:bg-rose-50 transition-all" title="Eliminar Personal">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="size-20 rounded-[2rem] bg-slate-50 overflow-hidden group-hover:ring-4 ring-emerald-100 transition-all">
                                    {member.imageMedia || member.avatar ? (
                                        <img src={getImageUrl(member.imageMedia || member.avatar, 'thumb')} alt={member.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 font-black text-2xl">
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-xl">{member.name}</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit"
                                            style={{ color: primaryColor, backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)' }}>
                                            {member.role || 'Profesional'}
                                        </div>
                                        {member.totalReviews > 0 && (
                                            <div className="flex items-center gap-1 text-amber-500 font-black text-xs">
                                                <Star size={12} fill="currentColor" />
                                                <span>{member.ratingPromedio.toFixed(1)}</span>
                                                <span className="text-slate-300 font-medium text-[9px] lowercase">({member.totalReviews})</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Scissors size={12} className="text-slate-400" /> Servicios Asignados
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {member.services.map(service => (
                                        <span key={service.id} className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight">
                                            {service.nombre}
                                        </span>
                                    ))}
                                    {member.services.length === 0 && (
                                        <span className="text-slate-300 text-[10px] font-bold italic">Sin servicios</span>
                                    )}
                                </div>
                            </div>

                            {!member.active && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                                    <span className="bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Inactivo</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Modales responsivos */}
            <div className="md:hidden">
                {isModalOpen && (
                    <div className="fixed inset-0 z-[120] bg-white animate-in slide-in-from-bottom duration-500 overflow-y-auto">
                        <StaffModal 
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            staff={selectedStaff}
                            onSuccess={fetchStaff}
                        />
                    </div>
                )}
                {scheduleOpenFor && (
                    <div className="fixed inset-0 z-[120] bg-white animate-in slide-in-from-bottom duration-500 overflow-y-auto">
                        <StaffScheduleModal
                            isOpen={!!scheduleOpenFor}
                            onClose={() => setScheduleOpenFor(undefined)}
                            staffId={scheduleOpenFor.id}
                            staffName={scheduleOpenFor.name}
                        />
                    </div>
                )}
            </div>

            <div className="hidden md:block">
                {isModalOpen && (
                    <StaffModal 
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        staff={selectedStaff}
                        onSuccess={fetchStaff}
                    />
                )}
                {scheduleOpenFor && (
                    <StaffScheduleModal
                        isOpen={!!scheduleOpenFor}
                        onClose={() => setScheduleOpenFor(undefined)}
                        staffId={scheduleOpenFor.id}
                        staffName={scheduleOpenFor.name}
                    />
                )}
            </div>
        </>
    );
}

export default function StaffPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center uppercase font-black animate-pulse">Cargando...</div>}>
            <StaffContent />
        </Suspense>
    );
}
