
"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, User, Phone, Mail, Shield, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user?: any;
    onSuccess: () => void;
}

export default function UserModal({ isOpen, onClose, user, onSuccess }: UserModalProps) {
    const [loading, setLoading] = useState(false);
    const [availableRoles, setAvailableRoles] = useState<any[]>([]);
    const isEdit = !!(user && user.id);
    const [formData, setFormData] = useState({
        nombre: user?.nombre || "",
        phone: user?.phone || "",
        email: user?.email || "",
        roles: user?.roles || ["USER"]
    });

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await fetch("/api/admin/roles");
                if (res.ok) {
                    const data = await res.json();
                    setAvailableRoles(data);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchRoles();
    }, []);

    const toggleRole = (roleName: string) => {
        setFormData(prev => ({
            ...prev,
            roles: prev.roles.includes(roleName)
                ? prev.roles.filter((r: string) => r !== roleName)
                : [...prev.roles, roleName]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = isEdit ? `/api/admin/usuarios/${user.id}` : "/api/admin/usuarios";
            const method = isEdit ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                alert(data.error || "Error al guardar");
            }
        } catch (error) {
            console.error("Error al guardar usuario:", error);
            alert("Error de conexión: No se pudo contactar con el servidor. Verifica tu internet o si el servidor está corriendo.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#f8faf9] w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in duration-300">
                
                {/* Lateral Decorativo */}
                <div className="hidden md:flex w-1/3 bg-slate-900 p-12 flex-col justify-between items-start text-white relative overflow-hidden">
                    <div className="relative z-10 space-y-4">
                        <div className="size-16 rounded-3xl bg-emerald-500 flex items-center justify-center">
                            <User size={32} />
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">
                            {isEdit ? "Editar Usuario" : "Nuevo Usuario"}
                        </h2>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                            {isEdit ? "Actualiza los permisos de acceso." : "Crea una cuenta para un nuevo colaborador."}
                        </p>
                    </div>
                    {/* Círculos decorativos */}
                    <div className="absolute -bottom-20 -left-20 size-64 bg-emerald-500/10 rounded-full blur-3xl" />
                </div>

                {/* Formulario */}
                <div className="flex-1 p-8 md:p-12 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-end md:hidden">
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Nombre Completo</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">
                                        <User size={20} />
                                    </span>
                                    <input 
                                        required
                                        type="text"
                                        className="w-full pl-14 pr-6 py-5 bg-white border-none rounded-3xl font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none shadow-sm"
                                        placeholder="Ej: Juan Pérez"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Teléfono</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">
                                            <Phone size={18} />
                                        </span>
                                        <input 
                                            required
                                            type="tel"
                                            className="w-full pl-14 pr-6 py-5 bg-white border-none rounded-3xl font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none shadow-sm"
                                            placeholder="+593..."
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Email (Opcional)</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">
                                            <Mail size={18} />
                                        </span>
                                        <input 
                                            type="email"
                                            className="w-full pl-14 pr-6 py-5 bg-white border-none rounded-3xl font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none shadow-sm"
                                            placeholder="correo@ejemplo.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4 flex items-center gap-2">
                                    <Shield size={14} className="text-emerald-500" /> Roles y Permisos
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {availableRoles.map(role => (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => toggleRole(role.name)}
                                            className={cn(
                                                "flex items-center justify-between p-5 rounded-3xl border-2 transition-all group",
                                                formData.roles.includes(role.name)
                                                    ? "bg-white border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-500/5"
                                                    : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "size-10 rounded-2xl flex items-center justify-center transition-colors",
                                                    formData.roles.includes(role.name) ? "bg-emerald-50" : "bg-slate-50 group-hover:bg-slate-100"
                                                )}>
                                                    <Shield size={20} />
                                                </div>
                                                <span className="font-black uppercase tracking-tight text-sm">{role.name}</span>
                                            </div>
                                            {formData.roles.includes(role.name) && (
                                                <div className="bg-emerald-500 text-white p-1 rounded-lg">
                                                    <Check size={14} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="flex-1 py-5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                disabled={loading}
                                className="flex-[2] bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-slate-900/10 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> {isEdit ? "Actualizar" : "Crear Usuario"}</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
