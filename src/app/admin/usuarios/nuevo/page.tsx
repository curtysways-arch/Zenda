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
    Sparkles,
    Store,
    MapPin,
    Utensils,
    Layout,
    Bike,
    ShoppingBag,
    Wallet,
    Package,
    Calendar,
    Users as UsersIcon,
    BarChart3,
    Settings,
    ClipboardList,
    CheckSquare,
    Square,
    Layers,
    Flame
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BranchOption {
    id: string;
    name: string;
    address?: string | null;
    isDefault?: boolean;
    isMain?: boolean;
}

interface SystemModuleDef {
    id: string;
    label: string;
    description: string;
    icon: any;
    color: string;
    industries: ('restaurant' | 'spa' | 'canchas' | 'retail')[];
}

const ALL_SYSTEM_MODULES: SystemModuleDef[] = [
    // Restaurante / Gastronomía
    {
        id: "cocina",
        label: "Cocina / Comandas (KDS)",
        description: "Pantalla táctil de comandas en vivo y pedidos de cocina en tiempo real.",
        icon: Utensils,
        color: "text-amber-600 bg-amber-50 border-amber-200",
        industries: ['restaurant']
    },
    {
        id: "mesas",
        label: "Mesas & Salón",
        description: "Control de mesas, salón, comandas por mesa y estado de atención.",
        icon: Layout,
        color: "text-emerald-600 bg-emerald-50 border-emerald-200",
        industries: ['restaurant']
    },
    {
        id: "despacho",
        label: "Órdenes & Despacho",
        description: "Seguimiento y flujo de entrega de pedidos preparados.",
        icon: ClipboardList,
        color: "text-violet-600 bg-violet-50 border-violet-200",
        industries: ['restaurant']
    },
    // Spa / Belleza / Salud / Servicios
    {
        id: "citas",
        label: "Agenda / Citas / Reservas",
        description: "Calendario de reservas, citas y turnos de atención al cliente.",
        icon: Calendar,
        color: "text-sky-600 bg-sky-50 border-sky-200",
        industries: ['spa', 'canchas']
    },
    {
        id: "servicios",
        label: "Servicios & Tratamientos",
        description: "Catálogo de servicios, tiempos de sesión, precios y protocolos.",
        icon: Scissors,
        color: "text-pink-600 bg-pink-50 border-pink-200",
        industries: ['spa']
    },
    {
        id: "staff",
        label: "Especialistas & Profesionales",
        description: "Horarios, asignación de cabinas/sillones y ficha de staff.",
        icon: UsersIcon,
        color: "text-indigo-600 bg-indigo-50 border-indigo-200",
        industries: ['spa']
    },
    // Canchas deportivas
    {
        id: "canchas",
        label: "Mis Canchas & Turnos",
        description: "Disponibilidad horaria, estado de canchas y grilla de alquiler.",
        icon: Layers,
        color: "text-emerald-600 bg-emerald-50 border-emerald-200",
        industries: ['canchas']
    },
    {
        id: "bloqueos",
        label: "Bloqueos & Mantenimiento",
        description: "Bloqueo preventivo de canchas o áreas fuera de servicio.",
        icon: Settings,
        color: "text-rose-600 bg-rose-50 border-rose-200",
        industries: ['canchas']
    },
    // Universales
    {
        id: "ventas",
        label: "Punto de Venta / Recepción (POS)",
        description: "Cobro rápido de servicios, productos y emisión de comprobantes.",
        icon: ShoppingBag,
        color: "text-indigo-600 bg-indigo-50 border-indigo-200",
        industries: ['restaurant', 'spa', 'canchas', 'retail']
    },
    {
        id: "caja",
        label: "Caja & Finanzas",
        description: "Apertura y cierre de caja, registro de turnos y arqueo de dinero.",
        icon: Wallet,
        color: "text-teal-600 bg-teal-50 border-teal-200",
        industries: ['restaurant', 'spa', 'canchas', 'retail']
    },
    {
        id: "pedidos",
        label: "Pedidos Online & Envíos",
        description: "Recepción de pedidos desde la web/app y control de envíos.",
        icon: Bike,
        color: "text-blue-600 bg-blue-50 border-blue-200",
        industries: ['restaurant', 'retail', 'spa']
    },
    {
        id: "productos",
        label: "Productos & Venta Retail",
        description: "Cremas, cosméticos, bebidas o productos físicos en venta.",
        icon: Package,
        color: "text-rose-600 bg-rose-50 border-rose-200",
        industries: ['restaurant', 'spa', 'retail', 'canchas']
    },
    {
        id: "inventario",
        label: "Inventario & Insumos",
        description: "Control de existencias e insumos utilizados.",
        icon: Layers,
        color: "text-cyan-600 bg-cyan-50 border-cyan-200",
        industries: ['restaurant', 'spa', 'retail']
    },
    {
        id: "clientes",
        label: "Clientes & Ficha / Historial",
        description: "Historial de citas, consumos y fidelización de clientes.",
        icon: UsersIcon,
        color: "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200",
        industries: ['restaurant', 'spa', 'canchas', 'retail']
    },
    {
        id: "reportes",
        label: "Reportes & Métricas",
        description: "Análisis de ingresos, métricas operativas y estadísticas.",
        icon: BarChart3,
        color: "text-slate-600 bg-slate-50 border-slate-200",
        industries: ['restaurant', 'spa', 'canchas', 'retail']
    },
    {
        id: "config",
        label: "Configuración del Negocio",
        description: "Ajustes de sucursales, métodos de pago y datos de la empresa.",
        icon: Settings,
        color: "text-slate-700 bg-slate-100 border-slate-300",
        industries: ['restaurant', 'spa', 'canchas', 'retail']
    }
];

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
    const [availableBranches, setAvailableBranches] = useState<BranchOption[]>([]);
    const [industry, setIndustry] = useState<'restaurant' | 'spa' | 'canchas' | 'retail'>('spa');

    const [formData, setFormData] = useState({
        nombre: nameParam || "",
        phone: phoneParam || "",
        email: "",
        roles: ["STAFF"],
        branches: [] as string[],
        allowedModules: [] as string[]
    });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [resRoles, resBranches, resNeg] = await Promise.all([
                    fetch("/api/admin/roles"),
                    fetch("/api/admin/sucursales"),
                    fetch("/api/negocio")
                ]);

                if (resRoles.ok) {
                    const dataRoles = await resRoles.json();
                    if (Array.isArray(dataRoles) && dataRoles.length > 0) {
                        setAvailableRoles(dataRoles);
                    }
                }

                if (resBranches.ok) {
                    const dataBranches = await resBranches.json();
                    const list: BranchOption[] = dataBranches.branches || [];
                    setAvailableBranches(list);

                    // Si no es edición y hay sucursales, preseleccionar la sucursal matriz o todas
                    if (!isEdit && list.length > 0) {
                        const def = list.find(b => b.isDefault || b.isMain) || list[0];
                        setFormData(prev => ({
                            ...prev,
                            branches: prev.branches.length === 0 ? [def.id] : prev.branches
                        }));
                    }
                }

                if (resNeg.ok) {
                    const negData = await resNeg.json();
                    const tipoUpper = (negData.tipoNegocio || '').toUpperCase();
                    const slugUpper = (negData.slug || '').toUpperCase();
                    const nameUpper = (negData.nombre || '').toUpperCase();

                    const isRestaurant = tipoUpper === 'RESTAURANTE' || tipoUpper === 'GASTRONOMIA' || tipoUpper === 'RESTAURANT' ||
                        nameUpper.includes('PARRILLA') || nameUpper.includes('RESTAURANTE') || nameUpper.includes('GASTRONOMIA') || nameUpper.includes('BURGER') || nameUpper.includes('PIZZA') || nameUpper.includes('TACO');
                    const isPinchos = tipoUpper === 'PINCHOS' || slugUpper === 'PINCHOS';
                    const isCanchas = tipoUpper === 'SPORTS_COURTS' || tipoUpper === 'CANCHAS' || slugUpper.includes('CANCHA') || nameUpper.includes('CANCHA') || nameUpper.includes('COMPLEJO') || nameUpper.includes('PADEL');

                    if (isRestaurant || isPinchos) {
                        setIndustry('restaurant');
                    } else if (isCanchas) {
                        setIndustry('canchas');
                    } else if (tipoUpper === 'STORE' || tipoUpper === 'TIENDA' || tipoUpper === 'ECOMMERCE') {
                        setIndustry('retail');
                    } else {
                        setIndustry('spa');
                    }
                }
            } catch (e) {
                console.error("Error cargando roles o sucursales:", e);
            }
        };

        loadInitialData();
    }, [isEdit]);

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
                            roles: Array.isArray(data.roles) && data.roles.length > 0 ? data.roles : ["STAFF"],
                            branches: Array.isArray(data.branches) ? data.branches : [],
                            allowedModules: Array.isArray(data.allowedModules) ? data.allowedModules : []
                        });
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setFetching(false));
        }
    }, [userId]);

    const defaultRolesList = [
        { id: "ADMIN", name: "ADMIN", label: "Administrador", desc: "Acceso total a la configuración y gestión del negocio." },
        { id: "STAFF", name: "STAFF", label: "Personal / Especialista", desc: "Atención operativa según los módulos asignados." },
        { id: "RECEPCIONISTA", name: "RECEPCIONISTA", label: "Recepcionista", desc: "Registro de reservas, mesas y cobros en recepción." }
    ];

    const rolesToRender = availableRoles.length > 0 ? availableRoles : defaultRolesList;
    const visibleModules = ALL_SYSTEM_MODULES.filter(m => m.industries.includes(industry));

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

    const toggleBranch = (branchId: string) => {
        setFormData(prev => {
            const exists = prev.branches.includes(branchId);
            const updated = exists
                ? prev.branches.filter(id => id !== branchId)
                : [...prev.branches, branchId];
            return { ...prev, branches: updated };
        });
    };

    const toggleAllBranches = () => {
        setFormData(prev => {
            if (prev.branches.length === availableBranches.length) {
                return { ...prev, branches: [] };
            }
            return { ...prev, branches: availableBranches.map(b => b.id) };
        });
    };

    const toggleModule = (moduleId: string) => {
        setFormData(prev => {
            const exists = prev.allowedModules.includes(moduleId);
            const updated = exists
                ? prev.allowedModules.filter(id => id !== moduleId)
                : [...prev.allowedModules, moduleId];
            return { ...prev, allowedModules: updated };
        });
    };

    // Preajustes rápidos de módulos adaptados por industria
    const applyPreset = (presetKey: string) => {
        if (presetKey === 'todos') {
            setFormData(prev => ({ ...prev, allowedModules: visibleModules.map(m => m.id) }));
        } else if (presetKey === 'ninguno') {
            setFormData(prev => ({ ...prev, allowedModules: [] }));
        } else if (industry === 'spa') {
            if (presetKey === 'recepcion') {
                setFormData(prev => ({ ...prev, roles: ['RECEPCIONISTA'], allowedModules: ['citas', 'clientes', 'caja', 'ventas'] }));
            } else if (presetKey === 'especialista') {
                setFormData(prev => ({ ...prev, roles: ['STAFF'], allowedModules: ['citas', 'servicios'] }));
            } else if (presetKey === 'caja') {
                setFormData(prev => ({ ...prev, roles: ['STAFF'], allowedModules: ['caja', 'ventas'] }));
            }
        } else if (industry === 'restaurant') {
            if (presetKey === 'cocina') {
                setFormData(prev => ({ ...prev, roles: ['STAFF'], allowedModules: ['cocina'] }));
            } else if (presetKey === 'mesero') {
                setFormData(prev => ({ ...prev, roles: ['STAFF'], allowedModules: ['mesas', 'pedidos'] }));
            } else if (presetKey === 'caja') {
                setFormData(prev => ({ ...prev, roles: ['STAFF'], allowedModules: ['caja', 'ventas', 'pedidos'] }));
            }
        } else if (industry === 'canchas') {
            if (presetKey === 'canchero') {
                setFormData(prev => ({ ...prev, roles: ['STAFF'], allowedModules: ['canchas', 'bloqueos', 'citas'] }));
            } else if (presetKey === 'recepcion') {
                setFormData(prev => ({ ...prev, roles: ['RECEPCIONISTA'], allowedModules: ['citas', 'clientes', 'caja', 'ventas'] }));
            } else if (presetKey === 'caja') {
                setFormData(prev => ({ ...prev, roles: ['STAFF'], allowedModules: ['caja', 'ventas'] }));
            }
        }
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
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight !text-white text-white drop-shadow-sm">
                        {isEdit ? "Editar Permisos de Colaborador" : "Nuevo Colaborador / Promover"}
                    </h1>
                    <p className="!text-slate-200 text-slate-200 text-xs md:text-sm font-medium">
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

                {/* Sección 2: Sucursales Asignadas */}
                <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <Store size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 uppercase tracking-tight text-base">Sucursales Asignadas</h3>
                                <p className="text-xs text-slate-400 font-medium">Define en qué sedes físicas puede operar este colaborador</p>
                            </div>
                        </div>

                        {availableBranches.length > 1 && (
                            <button
                                type="button"
                                onClick={toggleAllBranches}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                            >
                                {formData.branches.length === availableBranches.length ? "Desmarcar Todas" : "Seleccionar Todas"}
                            </button>
                        )}
                    </div>

                    {availableBranches.length === 0 ? (
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
                            <p className="text-sm font-bold text-slate-700">Sucursal Matriz por Defecto</p>
                            <p className="text-xs text-slate-400">El usuario tendrá acceso a la sede principal de tu empresa.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableBranches.map((branch) => {
                                const isSelected = formData.branches.includes(branch.id);
                                return (
                                    <button
                                        key={branch.id}
                                        type="button"
                                        onClick={() => toggleBranch(branch.id)}
                                        className={cn(
                                            "flex items-start justify-between p-5 rounded-2xl border-2 transition-all text-left active:scale-98",
                                            isSelected
                                                ? "bg-emerald-50/50 border-emerald-600 text-emerald-950 shadow-sm"
                                                : "bg-slate-50/40 border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "size-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                                                isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                                            )}>
                                                <MapPin size={18} />
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-xs uppercase tracking-tight text-slate-900">
                                                        {branch.name}
                                                    </span>
                                                    {(branch.isDefault || branch.isMain) && (
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest">
                                                            Matriz
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-400 line-clamp-1">
                                                    {branch.address || "Dirección no especificada"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={cn(
                                            "size-6 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all mt-0.5",
                                            isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                                        )}>
                                            {isSelected && <Check size={14} className="stroke-[3]" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sección 3: Módulos y Permisos Habilitados */}
                <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                <Layers size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-base">Módulos Habilitados en este Perfil</h3>
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider">
                                        {formData.allowedModules.length} Activo(s)
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">Marca con check los módulos exactos a los que podrá acceder este usuario o dispositivo</p>
                            </div>
                        </div>

                        {/* Presets Rápidos según la vertical del negocio */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">Preajustes:</span>
                            
                            {industry === 'spa' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('recepcion')}
                                        className="px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Calendar size={14} /> Recepcionista
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('especialista')}
                                        className="px-3 py-1.5 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-800 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Scissors size={14} /> Especialista
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('caja')}
                                        className="px-3 py-1.5 rounded-xl bg-teal-100 hover:bg-teal-200 text-teal-800 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Wallet size={14} /> Caja / Cobros
                                    </button>
                                </>
                            )}

                            {industry === 'restaurant' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('cocina')}
                                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                    >
                                        <Utensils size={14} /> Solo Cocina (KDS)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('mesero')}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Layout size={14} /> Mesero
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('caja')}
                                        className="px-3 py-1.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Wallet size={14} /> Caja / POS
                                    </button>
                                </>
                            )}

                            {industry === 'canchas' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('canchero')}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Layers size={14} /> Canchero / Turnos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('recepcion')}
                                        className="px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Calendar size={14} /> Recepción
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('caja')}
                                        className="px-3 py-1.5 rounded-xl bg-teal-100 hover:bg-teal-200 text-teal-800 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Wallet size={14} /> Caja
                                    </button>
                                </>
                            )}

                            <button
                                type="button"
                                onClick={() => applyPreset('todos')}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95"
                            >
                                Todos
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset('ninguno')}
                                className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold transition-all active:scale-95"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>

                    {/* Grid de Módulos con Check */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {visibleModules.map((mod) => {
                            const isChecked = formData.allowedModules.includes(mod.id);
                            const IconComponent = mod.icon;
                            return (
                                <button
                                    key={mod.id}
                                    type="button"
                                    onClick={() => toggleModule(mod.id)}
                                    className={cn(
                                        "flex items-start justify-between p-5 rounded-2xl border-2 transition-all text-left active:scale-98 relative",
                                        isChecked
                                            ? "bg-indigo-50/40 border-indigo-600 shadow-sm"
                                            : "bg-slate-50/30 border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    <div className="flex items-start gap-3.5">
                                        <div className={cn(
                                            "size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all mt-0.5",
                                            isChecked ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : mod.color
                                        )}>
                                            <IconComponent size={18} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-black text-xs uppercase tracking-tight text-slate-900">
                                                    {mod.label}
                                                </h4>
                                                {mod.id === 'cocina' && (
                                                    <span className="px-2 py-0.2 rounded-full bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider">
                                                        Tablet
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 font-medium leading-snug">
                                                {mod.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "size-6 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all mt-0.5 ml-2",
                                        isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                                    )}>
                                        {isChecked && <Check size={14} className="stroke-[3]" />}
                                    </div>
                                </button>
                            );
                        })}
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
