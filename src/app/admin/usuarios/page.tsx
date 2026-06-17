
"use client";

import { useState, useEffect } from "react";
import { 
    Users, 
    Search, 
    Plus, 
    Shield, 
    Phone, 
    Mail, 
    Edit2, 
    Trash2, 
    Loader2,
    CheckCircle2
} from "lucide-react";
import UserModal from "@/components/admin/UserModal";

interface Usuario {
    id: string;
    nombre: string;
    phone: string;
    email: string;
    roles: string[];
}

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function UsuariosContent() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isByParam, setIsByParam] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Usuario | undefined>();

    const searchParams = useSearchParams();
    const phoneParam = searchParams.get("phone");

    const fetchUsuarios = async (q = "") => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/usuarios?q=${q}`);
            if (res.ok) {
                const data = await res.json();
                setUsuarios(data);
                
                // Si venimos por parámetro y encontramos al usuario exacto, lo abrimos
                if (phoneParam && !isByParam) {
                    const exactUser = data.find((u: Usuario) => u.phone === phoneParam);
                    if (exactUser) {
                        setSelectedUser(exactUser);
                        setIsModalOpen(true);
                    } else if (data.length === 0 || !exactUser) {
                        // Si no existe, abrir modal para crear uno nuevo con ese teléfono
                        setSelectedUser({
                            id: "",
                            nombre: searchParams.get("name") || "",
                            phone: phoneParam,
                            email: "",
                            roles: ["USER"]
                        });
                        setIsModalOpen(true);
                    }
                    setIsByParam(true);
                }
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (phoneParam && !isByParam) {
            setSearchQuery(phoneParam);
        }
    }, [phoneParam]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsuarios(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleEdit = (user: Usuario) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres eliminar este usuario?")) return;
        try {
            const res = await fetch(`/api/admin/usuarios/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchUsuarios(searchQuery);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreate = () => {
        setSelectedUser(undefined);
        setIsModalOpen(true);
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                        <Users style={{ color: 'var(--primary-color)' }} size={36} />
                        Gestión de Personal
                    </h1>
                    <p className="text-slate-600 font-medium">Administra al personal administrativo y usuarios con acceso al panel.</p>
                </div>
 
                <button 
                    onClick={handleCreate}
                    className="flex items-center gap-2 text-white font-black px-6 py-4 rounded-[2rem] shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs"
                    style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--primary-color), transparent 80%)' }}
                    onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                >
                    <Plus size={18} /> Nuevo Personal
                </button>
            </div>

            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[var(--primary-color)] transition-colors" size={20} />
                <input 
                    type="text"
                    placeholder="Buscar por nombre o teléfono..."
                    className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[2.5rem] font-bold text-slate-900 outline-none transition-all shadow-sm"
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-color)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, var(--primary-color), transparent 95%)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgb(241, 245, 249)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary-color)' }} />
                    <p className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Cargando Personal...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {usuarios.map((user) => (
                        <div key={user.id} className="bg-white rounded-[3rem] border border-slate-100 p-8 space-y-6 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(user)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl transition-all"
                                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary-color)'; e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--primary-color), transparent 90%)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(148, 163, 184)'; e.currentTarget.style.backgroundColor = 'rgb(248, 250, 252)'; }}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(user.id)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-rose-600 hover:bg-rose-50 transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="size-16 rounded-[2rem] bg-slate-50 text-slate-400 flex items-center justify-center font-black text-2xl transition-colors group-hover:text-white"
                                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-color)'}
                                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(248, 250, 252)'}>
                                    {user.nombre.charAt(0).toUpperCase()}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-xl">{user.nombre}</h3>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <Phone size={12} style={{ color: 'var(--primary-color)' }} /> {user.phone}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Shield size={12} style={{ color: 'var(--primary-color)' }} /> Roles Asignados
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {user.roles.map(role => (
                                        <span key={role} className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight flex items-center gap-1.5"
                                              style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}>
                                            <CheckCircle2 size={10} /> {role}
                                        </span>
                                    ))}
                                    {user.roles.length === 0 && (
                                        <span className="text-slate-300 text-[10px] font-bold italic">Sin roles específicos</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {usuarios.length === 0 && (
                        <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <Users size={48} className="opacity-20" />
                            <p className="font-black uppercase tracking-widest">No se encontró personal administrativo</p>
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <UserModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    user={selectedUser}
                    onSuccess={() => fetchUsuarios(searchQuery)}
                />
            )}
        </div>
    );
}

export default function UsuariosPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary-color)' }} />
                <p className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Cargando...</p>
            </div>
        }>
            <UsuariosContent />
        </Suspense>
    );
}
