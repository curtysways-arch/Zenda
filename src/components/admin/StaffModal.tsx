"use client";

import { useState, useEffect } from "react";
import { X, User, Briefcase, Scissors, Clock, Loader2, Image as ImageIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import ImageUploader from "@/components/ui/ImageUploader";

interface StaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    staff?: any;
    onSuccess: () => void;
}

export default function StaffModal({ isOpen, onClose, staff, onSuccess }: StaffModalProps) {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [allServices, setAllServices] = useState<any[]>([]);
    
    const [name, setName] = useState(staff?.name || "");
    const [role, setRole] = useState(staff?.role || "");
    const [imageMediaId, setImageMediaId] = useState<string | null>(staff?.imageMediaId || null);
    const [avatar, setAvatar] = useState(staff?.imageMedia?.url || staff?.avatar || "");
    const [selectedServices, setSelectedServices] = useState<string[]>(
        staff?.services?.map((s: any) => s.id) || []
    );
    const [active, setActive] = useState(staff?.active ?? true);

    // Nuevos campos para creación de usuario
    const [createLogin, setCreateLogin] = useState(false);
    const [email, setEmail] = useState(staff?.usuario?.email || "");
    const [password, setPassword] = useState("");

    useEffect(() => {
        const fetchServices = async () => {
            if (!session?.user) return;
            const negocioId = (session.user as any).negocioId;
            const res = await fetch(`/api/services?negocioId=${negocioId}`);
            if (res.ok) {
                 const data = await res.json();
                 setAllServices(data);
            }
        };
        fetchServices();
    }, [session]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const negocioId = (session?.user as any).negocioId;
            const url = staff ? `/api/staff/${staff.id}` : "/api/staff";
            const method = staff ? "PATCH" : "POST";
            
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    role,
                    avatar,
                    imageMediaId,
                    active,
                    services: selectedServices,
                    businessId: negocioId,
                    workingHours: staff?.workingHours || {}, // Basic for now
                    email: createLogin ? email : undefined,
                    password: createLogin ? password : undefined,
                })
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const errorData = await res.json();
                alert(errorData.error || "Error al guardar los cambios");
            }
        } catch (error: any) {
            console.error(error);
            alert("Error de conexión: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleService = (id: string) => {
        if (selectedServices.includes(id)) {
            setSelectedServices(selectedServices.filter(sid => sid !== id));
        } else {
            setSelectedServices([...selectedServices, id]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic">{staff ? 'Editar Profesional' : 'Nuevo Profesional'}</h2>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Gestión de Personal</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto p-10 space-y-10 custom-scrollbar">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <User size={12} /> Nombre Completo
                            </label>
                            <input 
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none transition-all"
                                style={ { '--tw-border-opacity': '1' } as any }
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                onBlur={(e) => e.target.style.borderColor = 'rgb(241, 245, 249)'}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Briefcase size={12} /> Cargo / Especialidad
                            </label>
                            <input 
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none transition-all"
                                style={ { '--tw-border-opacity': '1' } as any }
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                onBlur={(e) => e.target.style.borderColor = 'rgb(241, 245, 249)'}
                                placeholder="Ej: Barbero Senior"
                                value={role}
                                onChange={e => setRole(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <ImageIcon size={12} /> Avatar del Profesional
                        </label>
                        <ImageUploader
                            category="staff"
                            currentUrl={avatar}
                            onUploadSuccess={(media) => {
                                setAvatar(media.url);
                                setImageMediaId(media.id);
                            }}
                            onRemove={() => {
                                setAvatar("");
                                setImageMediaId(null);
                            }}
                            label="Subir foto del profesional"
                            aspect="square"
                        />
                    </div>

                    {/* Creación de Usuario / Login (Solo para nuevo staff o si aún no tiene usuario) */}
                    {(!staff || !staff.usuario) && (
                        <div className="p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 uppercase italic">Acceso al Sistema</h4>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Crear credenciales para este profesional</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCreateLogin(!createLogin)}
                                    className={`w-14 h-8 rounded-full transition-all duration-500 relative ${createLogin ? '' : 'bg-slate-300'}`}
                                    style={createLogin ? { backgroundColor: 'var(--primary-color)' } : {}}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-500 ${createLogin ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {createLogin && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 animate-in fade-in duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Email (Usuario)
                                        </label>
                                        <input 
                                            type="email"
                                            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none transition-all"
                                            style={ { '--tw-border-opacity': '1' } as any }
                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                            onBlur={(e) => e.target.style.borderColor = 'rgb(226, 232, 240)'}
                                            placeholder="profesional@spa.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required={createLogin}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Contraseña
                                        </label>
                                        <input 
                                            type="text"
                                            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none transition-all"
                                            style={ { '--tw-border-opacity': '1' } as any }
                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                            onBlur={(e) => e.target.style.borderColor = 'rgb(226, 232, 240)'}
                                            placeholder="Contraseña segura"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required={createLogin}
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <p className="text-[10px] font-bold p-2 rounded-lg italic"
                                           style={{ color: 'var(--primary-color)', backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)' }}>
                                            * Con estas credenciales el profesional podrá acceder a "Modo Staff" para ver su agenda.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Services multi-select */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Scissors size={12} /> Servicios que puede realizar
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {allServices.map(service => (
                                <button
                                    key={service.id}
                                    type="button"
                                    onClick={() => toggleService(service.id)}
                                    className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all border-2 text-left ${
                                        selectedServices.includes(service.id)
                                            ? "shadow-md"
                                            : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                                    }`}
                                    style={selectedServices.includes(service.id) ? { backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' } : {}}
                                >
                                    {service.nombre}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem]">
                        <div>
                            <p className="text-xs font-black text-slate-900">Estado Activo</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Habilita o deshabilita a este profesional</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActive(!active)}
                            className={`w-14 h-8 rounded-full transition-all duration-500 relative ${active ? '' : 'bg-slate-300'}`}
                            style={active ? { backgroundColor: 'var(--primary-color)' } : {}}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-500 ${active ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="pt-6 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-8 py-5 border-2 border-slate-100 text-slate-400 font-black rounded-3xl hover:bg-slate-50 transition uppercase text-xs tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-8 py-5 text-white font-black rounded-3xl transition shadow-xl shadow-slate-200 flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50"
                            style={{ backgroundColor: 'var(--primary-color)' }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (staff ? 'Guardar Cambios' : 'Registrar Profesional')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
