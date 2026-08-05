"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, User, Phone, Mail, Shield, Check, Scissors, CalendarCheck } from "lucide-react";
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
        nombre: "",
        phone: "",
        email: "",
        roles: ["STAFF"]
    });

    useEffect(() => {
        if (user) {
            setFormData({
                nombre: user.nombre || "",
                phone: user.phone || "",
                email: user.email || "",
                roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : ["STAFF"]
            });
        } else {
            setFormData({
                nombre: "",
                phone: "",
                email: "",
                roles: ["STAFF"]
            });
        }
    }, [user, isOpen]);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await fetch("/api/admin/roles");
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setAvailableRoles(data);
                    } else {
                        setAvailableRoles([
                            { id: "ADMIN", name: "ADMIN", description: "Acceso total a configuración" },
                            { id: "STAFF", name: "STAFF", description: "Atención y agenda propia" },
                            { id: "RECEPCIONISTA", name: "RECEPCIONISTA", description: "Caja y reservas" }
                        ]);
                    }
                }
            } catch (e) {
                console.error(e);
                setAvailableRoles([
                    { id: "ADMIN", name: "ADMIN", description: "Acceso total a configuración" },
                    { id: "STAFF", name: "STAFF", description: "Atención y agenda propia" },
                    { id: "RECEPCIONISTA", name: "RECEPCIONISTA", description: "Caja y reservas" }
                ]);
            }
        };
        fetchRoles();
    }, []);

    const defaultRolesList = [
        { id: "ADMIN", name: "ADMIN", label: "Administrador", desc: "Acceso total a configuración y gestión" },
        { id: "STAFF", name: "STAFF", label: "Personal / Especialista", desc: "Atención a clientes y agenda propia" },
        { id: "RECEPCIONISTA", name: "RECEPCIONISTA", label: "Recepcionista", desc: "Registro de reservas y cobros" }
    ];

    const rolesToRender = availableRoles.length > 0 ? availableRoles : defaultRolesList;

    const toggleRole = (roleName: string) => {
        setFormData(prev => {
            const hasRole = prev.roles.includes(roleName);
            const newRoles = hasRole
                ? prev.roles.filter((r: string) => r !== roleName)
                : [...prev.roles, roleName];
            return {
                ...prev,
                roles: newRoles.length > 0 ? newRoles : [roleName]
            };
        });
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
                alert(data.error || "Error al guardar el usuario");
            }
        } catch (error) {
            console.error("Error al guardar usuario:", error);
            alert("Error de conexión al guardar usuario.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row my-auto max-h-[92vh] border border-slate-100 z-10 animate-in zoom-in-95 duration-200">
                
                {/* Panel Lateral Decorativo */}
                <div className="hidden md:flex w-1/3 bg-slate-900 p-6 flex-col justify-between items-start text-white relative overflow-hidden shrink-0">
                    <div className="relative z-10 space-y-3">
                        <div className="size-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                            <User size={24} />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight leading-tight">
                            {isEdit ? "Editar Permisos" : "Nuevo Colaborador"}
                        </h2>
                        <p className="text-slate-400 font-medium text-[11px] leading-relaxed">
                            {isEdit ? "Actualiza los roles y accesos asignados." : "Asigna roles de acceso para tu equipo de trabajo."}
                        </p>
                    </div>
                    <div className="absolute -bottom-20 -left-20 size-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                </div>

                {/* Formulario Compacto con Header y Footer Fijo */}
                <div className="flex-1 flex flex-col min-h-0 bg-white">
                    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
                        {/* Header Fijo */}
                        <div className="shrink-0 px-5 py-3.5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                {isEdit ? "Editar Permisos" : "Nuevo Colaborador"}
                            </h3>
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-200/50"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Cuerpo Scrolleable */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 custom-scrollbar">
                            {/* Nombre Completo */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">
                                    Nombre Completo
                                </label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-3.5 text-slate-400 pointer-events-none z-10">
                                        <User size={16} />
                                    </div>
                                    <input 
                                        required
                                        type="text"
                                        style={{ paddingLeft: '2.8rem' }}
                                        className="w-full pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none text-xs"
                                        placeholder="Ej: Carlos Camacho"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Teléfono & Email */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">
                                        Teléfono
                                    </label>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-3.5 text-slate-400 pointer-events-none z-10">
                                            <Phone size={15} />
                                        </div>
                                        <input 
                                            required
                                            type="tel"
                                            style={{ paddingLeft: '2.8rem' }}
                                            className="w-full pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none text-xs"
                                            placeholder="+593..."
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">
                                        Email (Opcional)
                                    </label>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-3.5 text-slate-400 pointer-events-none z-10">
                                            <Mail size={15} />
                                        </div>
                                        <input 
                                            type="email"
                                            style={{ paddingLeft: '2.8rem' }}
                                            className="w-full pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none text-xs"
                                            placeholder="correo@ejemplo.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Selector de Roles y Permisos */}
                            <div className="space-y-1.5 pt-0.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1 flex items-center gap-1.5">
                                    <Shield size={13} className="text-indigo-600" /> Selección de Rol y Permisos
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {rolesToRender.map((role: any) => {
                                        const roleName = role.name || role.id;
                                        const isSelected = formData.roles.includes(roleName);
                                        return (
                                            <button
                                                key={role.id || roleName}
                                                type="button"
                                                onClick={() => toggleRole(roleName)}
                                                className={cn(
                                                    "flex items-center justify-between p-2.5 px-3 rounded-xl border transition-all text-left group active:scale-98",
                                                    isSelected
                                                        ? "bg-indigo-50/70 border-indigo-500 text-indigo-950 shadow-xs"
                                                        : "bg-slate-50/60 border-slate-100 text-slate-600 hover:border-slate-200"
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className={cn(
                                                        "size-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                                                        isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                                                    )}>
                                                        {roleName === 'ADMIN' ? <Shield size={15} /> : roleName === 'STAFF' ? <Scissors size={15} /> : <CalendarCheck size={15} />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black uppercase tracking-tight text-[11px] leading-none">{role.label || roleName}</h4>
                                                        <p className="text-[9.5px] font-medium text-slate-500 leading-tight mt-0.5">{role.desc || role.description || `Permiso de tipo ${roleName}`}</p>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "size-5 rounded-md flex items-center justify-center shrink-0 border transition-all ml-2",
                                                    isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 bg-white"
                                                )}>
                                                    {isSelected && <Check size={11} className="stroke-[3]" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer Fijo */}
                        <div className="shrink-0 p-3 px-5 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" size={15} /> : <><Save size={15} /> {isEdit ? "Guardar Permisos" : "Crear / Promover Usuario"}</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
