"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
    ArrowLeft, 
    User, 
    Phone, 
    Mail, 
    Shield, 
    Check, 
    Scissors, 
    CalendarCheck, 
    Save, 
    Loader2,
    CheckCircle2,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

function UsuarioFormContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const userId = searchParams.get("id");
    const phoneParam = searchParams.get("phone");
    const nameParam = searchParams.get("name");

    const isEdit = !!userId;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [availableRoles, setAvailableRoles] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        nombre: nameParam || "",
        phone: phoneParam || "",
        email: "",
        roles: ["STAFF"]
    });

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
                            { id: "ADMIN", name: "ADMIN", label: "Administrador", desc: "Acceso total a la configuración y gestión del negocio." },
                            { id: "STAFF", name: "STAFF", label: "Personal / Especialista", desc: "Atención directa a clientes y gestión de agenda propia." },
                            { id: "RECEPCIONISTA", name: "RECEPCIONISTA", label: "Recepcionista", desc: "Registro de reservas y cobros en recepción." }
                        ]);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchRoles();
    }, []);

    useEffect(() => {
        if (userId) {
            setFetching(true);
            fetch(`/api/admin/usuarios/${userId}`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) {
                        setFormData({
                            nombre: data.nombre || "",
                            phone: data.phone || "",
                            email: data.email || "",
                            roles: Array.isArray(data.roles) && data.roles.length > 0 ? data.roles : ["STAFF"]
                        });
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setFetching(false));
        }
    }, [userId]);

    const defaultRolesList = [
        { id: "ADMIN", name: "ADMIN", label: "Administrador", desc: "Acceso total a la configuración y gestión del negocio." },
        { id: "STAFF", name: "STAFF", label: "Personal / Especialista", desc: "Atención directa a clientes y gestión de agenda propia." },
        { id: "RECEPCIONISTA", name: "RECEPCIONISTA", label: "Recepcionista", desc: "Registro de reservas y cobros en recepción." }
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
            const url = isEdit ? `/api/admin/usuarios/${userId}` : "/api/admin/usuarios";
            const method = isEdit ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                router.push("/admin/usuarios");
            } else {
                const data = await res.json();
                alert(data.error || "Error al guardar los cambios");
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión al guardar el colaborador.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
                <p className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Cargando datos del colaborador...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 p-4 md:p-8 animate-in fade-in duration-300">
            {/* Botón de Regreso */}
            <div className="flex items-center justify-between">
                <Link
                    href="/admin/usuarios"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                >
                    <ArrowLeft size={16} /> Volver a Personal
                </Link>
            </div>

            {/* Cabecera Principal */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative z-10 space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest">
                        <Sparkles size={12} /> Gestión de Accesos
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                        {isEdit ? "Editar Permisos de Colaborador" : "Nuevo Colaborador / Promover"}
                    </h1>
                    <p className="text-slate-400 text-xs md:text-sm font-medium">
                        {isEdit 
                            ? "Modifica la información básica y los roles asignados para este integrante del equipo."
                            : "Registra a un nuevo colaborador o promueve a un cliente existente asignándole permisos de acceso al panel."
                        }
                    </p>
                </div>
                <div className="relative z-10 size-20 rounded-3xl bg-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-xl shadow-indigo-600/40 uppercase shrink-0">
                    {formData.nombre ? formData.nombre.charAt(0) : <User size={36} />}
                </div>
                <div className="absolute -bottom-24 -right-24 size-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Formulario a Pantalla Completa */}
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Columna Izquierda: Datos del Usuario */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                <div className="size-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-base">Datos Personales</h3>
                                    <p className="text-xs text-slate-400 font-medium">Información básica del integrante</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                {/* Nombre Completo */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">
                                        Nombre Completo *
                                    </label>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-4 text-slate-400 pointer-events-none z-10">
                                            <User size={18} />
                                        </div>
                                        <input 
                                            required
                                            type="text"
                                            style={{ paddingLeft: "3.2rem" }}
                                            className="w-full pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none text-sm"
                                            placeholder="Ej: Carlos Camacho"
                                            value={formData.nombre}
                                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Teléfono */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">
                                        Teléfono (WhatsApp) *
                                    </label>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-4 text-slate-400 pointer-events-none z-10">
                                            <Phone size={18} />
                                        </div>
                                        <input 
                                            required
                                            type="tel"
                                            style={{ paddingLeft: "3.2rem" }}
                                            className="w-full pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none text-sm"
                                            placeholder="+593..."
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">
                                        Correo Electrónico (Opcional)
                                    </label>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-4 text-slate-400 pointer-events-none z-10">
                                            <Mail size={18} />
                                        </div>
                                        <input 
                                            type="email"
                                            style={{ paddingLeft: "3.2rem" }}
                                            className="w-full pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none text-sm"
                                            placeholder="correo@ejemplo.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Selección de Roles y Permisos */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                <div className="size-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-base">Roles y Niveles de Acceso</h3>
                                    <p className="text-xs text-slate-400 font-medium">Selecciona al menos un rol para este colaborador</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {rolesToRender.map((role: any) => {
                                    const roleName = role.name || role.id;
                                    const isSelected = formData.roles.includes(roleName);
                                    return (
                                        <button
                                            key={role.id || roleName}
                                            type="button"
                                            onClick={() => toggleRole(roleName)}
                                            className={cn(
                                                "flex items-start justify-between p-6 rounded-3xl border-2 transition-all text-left group active:scale-98 relative overflow-hidden",
                                                isSelected
                                                    ? "bg-indigo-50/50 border-indigo-600 text-indigo-950 shadow-md shadow-indigo-600/5"
                                                    : "bg-slate-50/40 border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                                            )}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={cn(
                                                    "size-12 rounded-2xl flex items-center justify-center transition-all shrink-0 mt-0.5 shadow-sm",
                                                    isSelected ? "bg-indigo-600 text-white shadow-indigo-600/30" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                                                )}>
                                                    {roleName === 'ADMIN' ? <Shield size={22} /> : roleName === 'STAFF' ? <Scissors size={22} /> : <CalendarCheck size={22} />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-black uppercase tracking-tight text-sm text-slate-900">
                                                            {role.label || roleName}
                                                        </h4>
                                                        {isSelected && (
                                                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest">
                                                                Asignado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                        {role.desc || role.description || `Permiso de acceso tipo ${roleName}`}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={cn(
                                                "size-7 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all mt-1 ml-4",
                                                isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                                            )}>
                                                {isSelected && <Check size={16} className="stroke-[3]" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Barra Inferior de Acción */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between gap-4">
                    <Link
                        href="/admin/usuarios"
                        className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-3 uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> {isEdit ? "Guardar Cambios" : "Crear / Promover Colaborador"}</>}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function NuevoUsuarioPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
                <p className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Cargando formulario...</p>
            </div>
        }>
            <UsuarioFormContent />
        </Suspense>
    );
}
