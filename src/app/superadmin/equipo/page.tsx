"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Users, Shield, Key, Plus, Search, Edit2, Trash2,
    Crown, ChevronDown, ChevronRight, Check, X, AlertTriangle,
    ToggleLeft, ToggleRight, Loader2, UserPlus, Settings, Eye,
    EyeOff, RefreshCw, Building2, LayoutDashboard, Layers,
    Receipt, CreditCard, MessageSquare, BarChart3, UserCog,
    ClipboardList, Settings2, TrendingUp, Headphones, Megaphone,
    DollarSign
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Permiso = {
    id: string;
    codigo: string;
    nombre: string;
    modulo: string;
    accion: string;
    critico: boolean;
};

type Rol = {
    id: string;
    nombre: string;
    descripcion: string | null;
    color: string;
    icono: string | null;
    jerarquia: number;
    activo: boolean;
    totalUsuarios: number;
    permisos: Permiso[];
};

type Usuario = {
    id: string;
    nombre: string;
    apellido: string | null;
    email: string;
    avatar: string | null;
    activo: boolean;
    estado: string;
    scope: string | null;
    cargo: string | null;
    telefono: string | null;
    ultimaAccion: string | null;
    createdAt: string;
    rol: { id: string; nombre: string; color: string; icono: string | null; jerarquia: number } | null;
    equipo: { id: string; nombre: string; color: string } | null;
    totalLogins: number;
};

// ─── Íconos de módulos ────────────────────────────────────────────────────────

const MODULE_ICONS: Record<string, any> = {
    Dashboard: LayoutDashboard,
    Negocios: Building2,
    Planes: Layers,
    Facturación: Receipt,
    Suscripciones: CreditCard,
    Comunicaciones: MessageSquare,
    Analytics: BarChart3,
    Referidos: Users,
    Solicitudes: ClipboardList,
    Sistema: Settings2,
    Equipo: UserCog,
};

const ROL_ICONS: Record<string, any> = {
    Crown, Shield, TrendingUp, Headphones, Megaphone, DollarSign,
    User: Users, UserCog, Key
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nombre: string, apellido?: string | null) {
    return `${nombre.charAt(0)}${apellido ? apellido.charAt(0) : ''}`.toUpperCase();
}

function getEstadoBadge(estado: string) {
    const map: Record<string, { label: string; class: string }> = {
        ACTIVO: { label: 'Activo', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
        VACACIONES: { label: 'Vacaciones', class: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
        LICENCIA: { label: 'Licencia', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        BLOQUEADO: { label: 'Bloqueado', class: 'bg-red-500/20 text-red-400 border-red-500/30' },
        SUSPENDIDO: { label: 'Suspendido', class: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
        INVITADO: { label: 'Invitado', class: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    };
    return map[estado] || { label: estado, class: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function EquipoPage() {
    const [tab, setTab] = useState<'usuarios' | 'roles' | 'permisos'>('usuarios');
    const [loading, setLoading] = useState(true);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [roles, setRoles] = useState<Rol[]>([]);
    const [permisosPorModulo, setPermisosPorModulo] = useState<Record<string, Permiso[]>>({});
    const [searchUsuarios, setSearchUsuarios] = useState('');
    const [showModal, setShowModal] = useState<'crear-usuario' | 'crear-rol' | 'editar-usuario' | 'editar-rol' | null>(null);
    const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
    const [selectedRol, setSelectedRol] = useState<Rol | null>(null);

    const [apiError, setApiError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setApiError(null);
        try {
            const [usersRes, rolesRes, permisosRes] = await Promise.all([
                fetch('/api/superadmin/equipo/usuarios'),
                fetch('/api/superadmin/equipo/roles'),
                fetch('/api/superadmin/equipo/permisos'),
            ]);

            if (usersRes.ok) {
                setUsuarios(await usersRes.json());
            } else {
                const errData = await usersRes.json().catch(() => ({}));
                console.error('Error API usuarios:', usersRes.status, errData);
                setApiError(`Error ${usersRes.status}: ${errData.error || 'No autorizado'}`);
            }

            if (rolesRes.ok) setRoles(await rolesRes.json());
            else console.error('Error API roles:', rolesRes.status, await rolesRes.json().catch(() => ({})));

            if (permisosRes.ok) {
                const data = await permisosRes.json();
                setPermisosPorModulo(data.porModulo || {});
            } else {
                console.error('Error API permisos:', permisosRes.status, await permisosRes.json().catch(() => ({})));
            }
        } catch (e) {
            console.error("Error cargando datos del equipo:", e);
            setApiError('Error de conexión al cargar datos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);


    const filteredUsuarios = usuarios.filter(u =>
        `${u.nombre} ${u.apellido} ${u.email} ${u.cargo}`.toLowerCase().includes(searchUsuarios.toLowerCase())
    );

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
            {/* Header */}
            <div className="border-b border-white/10 px-6 py-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Centro de Equipo</h1>
                            <p className="text-slate-400 text-sm">Gestión de usuarios, roles y permisos del SaaS</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={fetchAll}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        {tab === 'usuarios' && (
                            <button onClick={() => setShowModal('crear-usuario')}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                                style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                                <UserPlus className="w-4 h-4" />
                                Nuevo miembro
                            </button>
                        )}
                        {tab === 'roles' && (
                            <button onClick={() => setShowModal('crear-rol')}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                                <Plus className="w-4 h-4" />
                                Nuevo rol
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats rápidas */}
                <div className="flex items-center gap-6 mt-5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-400 text-sm">
                            <span className="text-white font-semibold">{usuarios.filter(u => u.activo).length}</span> activos
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-violet-400" />
                        <span className="text-slate-400 text-sm">
                            <span className="text-white font-semibold">{roles.length}</span> roles
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-pink-400" />
                        <span className="text-slate-400 text-sm">
                            <span className="text-white font-semibold">
                                {Object.values(permisosPorModulo).flat().length}
                            </span> permisos
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 mt-5 p-1 rounded-xl bg-white/5 w-fit border border-white/10">
                    {[
                        { key: 'usuarios', label: 'Usuarios', icon: Users },
                        { key: 'roles', label: 'Roles', icon: Shield },
                        { key: 'permisos', label: 'Matriz de Permisos', icon: Key },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                tab === key
                                    ? 'bg-white/15 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
                            <span className="text-slate-400 text-sm">Cargando datos del equipo...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {tab === 'usuarios' && (
                            <UsuariosTab
                                usuarios={filteredUsuarios}
                                roles={roles}
                                search={searchUsuarios}
                                onSearchChange={setSearchUsuarios}
                                onEdit={(u) => { setSelectedUsuario(u); setShowModal('editar-usuario'); }}
                                onRefresh={fetchAll}
                            />
                        )}
                        {tab === 'roles' && (
                            <RolesTab
                                roles={roles}
                                onEdit={(r) => { setSelectedRol(r); setShowModal('editar-rol'); }}
                                onRefresh={fetchAll}
                            />
                        )}
                        {tab === 'permisos' && (
                            <MatrizPermisos
                                roles={roles}
                                permisosPorModulo={permisosPorModulo}
                                onRefresh={fetchAll}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Modales */}
            {showModal === 'crear-usuario' && (
                <ModalCrearUsuario
                    roles={roles}
                    onClose={() => setShowModal(null)}
                    onSuccess={() => { setShowModal(null); fetchAll(); }}
                />
            )}
            {showModal === 'editar-usuario' && selectedUsuario && (
                <ModalEditarUsuario
                    usuario={selectedUsuario}
                    roles={roles}
                    onClose={() => { setShowModal(null); setSelectedUsuario(null); }}
                    onSuccess={() => { setShowModal(null); setSelectedUsuario(null); fetchAll(); }}
                />
            )}
            {showModal === 'crear-rol' && (
                <ModalCrearRol
                    permisosPorModulo={permisosPorModulo}
                    onClose={() => setShowModal(null)}
                    onSuccess={() => { setShowModal(null); fetchAll(); }}
                />
            )}
        </div>
    );
}

// ─── Tab: Usuarios ────────────────────────────────────────────────────────────

function UsuariosTab({
    usuarios, roles, search, onSearchChange, onEdit, onRefresh
}: {
    usuarios: Usuario[];
    roles: Rol[];
    search: string;
    onSearchChange: (v: string) => void;
    onEdit: (u: Usuario) => void;
    onRefresh: () => void;
}) {
    const handleDeactivate = async (id: string) => {
        if (!confirm("¿Desactivar este usuario?")) return;
        await fetch(`/api/superadmin/equipo/usuarios/${id}`, { method: 'DELETE' });
        onRefresh();
    };

    return (
        <div>
            {/* Barra de búsqueda */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, email o cargo..."
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all text-sm"
                />
            </div>

            {/* Tabla de usuarios */}
            <div className="rounded-2xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Miembro</th>
                            <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
                            <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                            <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Scope</th>
                            <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Última Acción</th>
                            <th className="text-right px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {usuarios.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-16 text-slate-500">
                                    No hay miembros en el equipo
                                </td>
                            </tr>
                        ) : usuarios.map(u => {
                            const estadoBadge = getEstadoBadge(u.estado);
                            const RolIcon = u.rol?.icono ? (ROL_ICONS[u.rol.icono] || Shield) : Shield;
                            return (
                                <tr key={u.id} className="hover:bg-white/3 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                                                style={{ background: u.rol?.color || '#6366f1' }}>
                                                {getInitials(u.nombre, u.apellido)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-white text-sm">
                                                    {u.nombre} {u.apellido}
                                                    {!u.activo && <span className="ml-2 text-xs text-slate-500">(inactivo)</span>}
                                                </div>
                                                <div className="text-xs text-slate-500">{u.email}</div>
                                                {u.cargo && <div className="text-xs text-slate-600 mt-0.5">{u.cargo}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        {u.rol ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                                                    style={{ background: `${u.rol.color}25`, border: `1px solid ${u.rol.color}50` }}>
                                                    <RolIcon className="w-3.5 h-3.5" style={{ color: u.rol.color }} />
                                                </div>
                                                <span className="text-sm font-medium" style={{ color: u.rol.color }}>
                                                    {u.rol.nombre}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-600 text-sm">Sin rol</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${estadoBadge.class}`}>
                                            {estadoBadge.label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                                            {u.scope || 'GLOBAL'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-slate-500">
                                        {u.ultimaAccion
                                            ? new Date(u.ultimaAccion).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : 'Nunca'}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => onEdit(u)}
                                                className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            {u.activo && (
                                                <button onClick={() => handleDeactivate(u.id)}
                                                    className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Tab: Roles ───────────────────────────────────────────────────────────────

function RolesTab({ roles, onEdit, onRefresh }: { roles: Rol[]; onEdit: (r: Rol) => void; onRefresh: () => void }) {
    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este rol?")) return;
        const res = await fetch(`/api/superadmin/equipo/roles/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) { alert(data.error); return; }
        onRefresh();
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {roles.map(rol => {
                const RolIcon = rol.icono ? (ROL_ICONS[rol.icono] || Shield) : Shield;
                return (
                    <div key={rol.id}
                        className="rounded-2xl border border-white/10 p-5 flex flex-col gap-4 group hover:border-white/20 transition-all"
                        style={{ background: `linear-gradient(135deg, ${rol.color}08, rgba(255,255,255,0.02))` }}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                    style={{ background: `${rol.color}25`, border: `1px solid ${rol.color}40` }}>
                                    <RolIcon className="w-6 h-6" style={{ color: rol.color }} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white">{rol.nombre}</span>
                                        {rol.jerarquia === 1 && (
                                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500">Jerarquía #{rol.jerarquia}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(rol)}
                                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                    <Settings className="w-3.5 h-3.5" />
                                </button>
                                {rol.jerarquia !== 1 && (
                                    <button onClick={() => handleDelete(rol.id)}
                                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {rol.descripcion && (
                            <p className="text-xs text-slate-500 leading-relaxed">{rol.descripcion}</p>
                        )}

                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                                <span className="text-white font-semibold">{rol.totalUsuarios}</span> usuario{rol.totalUsuarios !== 1 ? 's' : ''}
                            </span>
                            <span className="text-slate-500">
                                <span className="text-white font-semibold">{rol.permisos.length}</span> permisos
                            </span>
                        </div>

                        {/* Mini chips de módulos cubiertos */}
                        <div className="flex flex-wrap gap-1.5">
                            {[...new Set(rol.permisos.map(p => p.modulo))].slice(0, 5).map(mod => (
                                <span key={mod}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-medium border"
                                    style={{ background: `${rol.color}15`, color: rol.color, borderColor: `${rol.color}30` }}>
                                    {mod}
                                </span>
                            ))}
                            {[...new Set(rol.permisos.map(p => p.modulo))].length > 5 && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] text-slate-500 bg-white/5 border border-white/10">
                                    +{[...new Set(rol.permisos.map(p => p.modulo))].length - 5} más
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Tab: Matriz de Permisos ──────────────────────────────────────────────────

function MatrizPermisos({
    roles, permisosPorModulo, onRefresh
}: {
    roles: Rol[];
    permisosPorModulo: Record<string, Permiso[]>;
    onRefresh: () => void;
}) {
    const [saving, setSaving] = useState<string | null>(null);
    const [localRoles, setLocalRoles] = useState<Rol[]>(roles);
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

    useEffect(() => { setLocalRoles(roles); }, [roles]);

    const togglePermiso = (rolId: string, permisoCodigo: string) => {
        setLocalRoles(prev => prev.map(rol => {
            if (rol.id !== rolId) return rol;
            const hasPermiso = rol.permisos.some(p => p.codigo === permisoCodigo);
            const allPermisos = Object.values(permisosPorModulo).flat();
            const permiso = allPermisos.find(p => p.codigo === permisoCodigo);
            if (!permiso) return rol;

            return {
                ...rol,
                permisos: hasPermiso
                    ? rol.permisos.filter(p => p.codigo !== permisoCodigo)
                    : [...rol.permisos, permiso],
            };
        }));
    };

    const saveRolPermisos = async (rolId: string) => {
        setSaving(rolId);
        try {
            const rol = localRoles.find(r => r.id === rolId);
            if (!rol) return;
            await fetch(`/api/superadmin/equipo/roles/${rolId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permisoCodigos: rol.permisos.map(p => p.codigo) }),
            });
        } finally {
            setSaving(null);
        }
    };

    const toggleModule = (mod: string) => {
        setExpandedModules(prev => ({ ...prev, [mod]: !prev[mod] }));
    };

    const allModules = Object.keys(permisosPorModulo).sort();

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <p className="text-slate-400 text-sm">
                    Activa o desactiva permisos por módulo. Los cambios se guardan por rol.
                </p>
                <button
                    onClick={() => {
                        const allExpanded = allModules.every(m => expandedModules[m]);
                        const next: Record<string, boolean> = {};
                        allModules.forEach(m => { next[m] = !allExpanded; });
                        setExpandedModules(next);
                    }}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                    {allModules.every(m => expandedModules[m]) ? 'Colapsar todo' : 'Expandir todo'}
                </button>
            </div>

            {/* Cabecera de roles */}
            <div className="overflow-x-auto">
                <div className="min-w-max">
                    {/* Header de roles */}
                    <div className="flex items-center gap-3 mb-4 pl-52">
                        {localRoles.map(rol => (
                            <div key={rol.id} className="w-28 flex flex-col items-center gap-1.5">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                    style={{ background: `${rol.color}25`, border: `1px solid ${rol.color}40` }}>
                                    {rol.jerarquia === 1
                                        ? <Crown className="w-4 h-4" style={{ color: rol.color }} />
                                        : <Shield className="w-4 h-4" style={{ color: rol.color }} />
                                    }
                                </div>
                                <span className="text-xs font-semibold text-center leading-tight" style={{ color: rol.color }}>
                                    {rol.nombre}
                                </span>
                                <button
                                    onClick={() => saveRolPermisos(rol.id)}
                                    disabled={!!saving || rol.jerarquia === 1}
                                    className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${
                                        rol.jerarquia === 1
                                            ? 'text-slate-600 border-slate-700 cursor-not-allowed'
                                            : 'text-violet-400 border-violet-500/30 hover:bg-violet-500/10 hover:border-violet-500/50 cursor-pointer'
                                    }`}
                                >
                                    {saving === rol.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : 'Guardar'}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Módulos y permisos */}
                    {allModules.map(modulo => {
                        const permisos = permisosPorModulo[modulo] || [];
                        const ModIcon = MODULE_ICONS[modulo] || Key;
                        const isExpanded = expandedModules[modulo] ?? false;

                        return (
                            <div key={modulo} className="mb-3 rounded-2xl border border-white/8 overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.02)' }}>
                                {/* Header del módulo */}
                                <button
                                    onClick={() => toggleModule(modulo)}
                                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/3 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                                        <ModIcon className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <span className="font-semibold text-white text-sm w-36">{modulo}</span>
                                    <span className="text-xs text-slate-600">{permisos.length} permisos</span>
                                    {/* Checkmarks globales por módulo/rol */}
                                    <div className="flex items-center gap-3 ml-4">
                                        {localRoles.map(rol => {
                                            const tieneAlguno = permisos.some(p => rol.permisos.some(rp => rp.codigo === p.codigo));
                                            const tieneTodos = permisos.every(p => rol.permisos.some(rp => rp.codigo === p.codigo));
                                            return (
                                                <div key={rol.id} className="w-28 flex justify-center">
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                                                        tieneTodos
                                                            ? 'bg-emerald-500/20 border border-emerald-500/40'
                                                            : tieneAlguno
                                                                ? 'bg-amber-500/20 border border-amber-500/40'
                                                                : 'bg-white/5 border border-white/10'
                                                    }`}>
                                                        {tieneTodos && <Check className="w-3 h-3 text-emerald-400" />}
                                                        {tieneAlguno && !tieneTodos && <div className="w-2 h-0.5 bg-amber-400 rounded" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="ml-auto">
                                        {isExpanded
                                            ? <ChevronDown className="w-4 h-4 text-slate-500" />
                                            : <ChevronRight className="w-4 h-4 text-slate-500" />
                                        }
                                    </div>
                                </button>

                                {/* Permisos individuales */}
                                {isExpanded && (
                                    <div className="border-t border-white/5">
                                        {permisos.map((perm, i) => (
                                            <div key={perm.id}
                                                className={`flex items-center gap-3 px-5 py-3 ${i % 2 === 0 ? 'bg-white/1' : ''}`}>
                                                <div className="w-8 h-8 shrink-0" /> {/* spacer del icono */}
                                                <div className="w-36 shrink-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs text-slate-300">{perm.accion}</span>
                                                        {perm.critico && (
                                                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-600 mt-0.5">{perm.codigo}</div>
                                                </div>
                                                <div className="flex items-center gap-3 ml-4">
                                                    {localRoles.map(rol => {
                                                        const tiene = rol.permisos.some(p => p.codigo === perm.codigo);
                                                        const isPropietario = rol.jerarquia === 1;
                                                        return (
                                                            <div key={rol.id} className="w-28 flex justify-center">
                                                                <button
                                                                    onClick={() => !isPropietario && togglePermiso(rol.id, perm.codigo)}
                                                                    disabled={isPropietario}
                                                                    className={`w-8 h-5 rounded-full transition-all relative ${
                                                                        tiene
                                                                            ? 'bg-emerald-500'
                                                                            : 'bg-white/10 border border-white/15'
                                                                    } ${isPropietario ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                                                                >
                                                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                                                                        tiene ? 'left-3' : 'left-0.5'
                                                                    }`} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Modal: Crear Usuario ─────────────────────────────────────────────────────

function ModalCrearUsuario({ roles, onClose, onSuccess }: { roles: Rol[]; onClose: () => void; onSuccess: () => void }) {
    const [form, setForm] = useState({
        nombre: '', apellido: '', email: '', password: '', rolId: '', cargo: '', telefono: '', scope: 'GLOBAL'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/superadmin/equipo/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Error al crear usuario'); return; }
            onSuccess();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-lg rounded-3xl border border-white/15 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                            <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white">Nuevo miembro del equipo</h2>
                            <p className="text-xs text-slate-500">Asigna un rol y permisos desde el inicio</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Nombre *" value={form.nombre} onChange={v => setForm(f => ({ ...f, nombre: v }))} />
                        <InputField label="Apellido" value={form.apellido} onChange={v => setForm(f => ({ ...f, apellido: v }))} />
                    </div>
                    <InputField label="Email *" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
                    <div className="relative">
                        <InputField
                            label="Contraseña *"
                            type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={v => setForm(f => ({ ...f, password: v }))}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-8 text-slate-500 hover:text-slate-300">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>

                    {/* Selector de Rol */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Rol *</label>
                        <select
                            value={form.rolId}
                            onChange={e => setForm(f => ({ ...f, rolId: e.target.value }))}
                            required
                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                        >
                            <option value="">Selecciona un rol</option>
                            {roles.filter(r => r.jerarquia !== 1).map(r => (
                                <option key={r.id} value={r.id}>{r.nombre} (Jerarquía #{r.jerarquia})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Cargo" value={form.cargo} onChange={v => setForm(f => ({ ...f, cargo: v }))} placeholder="ej. Ejecutivo de Ventas" />
                        <InputField label="Teléfono" value={form.telefono} onChange={v => setForm(f => ({ ...f, telefono: v }))} placeholder="+1 555 0000" />
                    </div>

                    {/* Scope */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Alcance (Scope)</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['GLOBAL', 'REGIONAL', 'NEGOCIOS_ASIGNADOS', 'PERSONAL'].map(s => (
                                <button type="button" key={s}
                                    onClick={() => setForm(f => ({ ...f, scope: s }))}
                                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                                        form.scope === s
                                            ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                                            : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
                                    }`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-white/15 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            {saving ? 'Creando...' : 'Crear miembro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Modal: Editar Usuario ────────────────────────────────────────────────────

function ModalEditarUsuario({ usuario, roles, onClose, onSuccess }: {
    usuario: Usuario; roles: Rol[]; onClose: () => void; onSuccess: () => void;
}) {
    const [form, setForm] = useState({
        nombre: usuario.nombre,
        apellido: usuario.apellido || '',
        cargo: usuario.cargo || '',
        telefono: usuario.telefono || '',
        rolId: usuario.rol?.id || '',
        estado: usuario.estado,
        scope: usuario.scope || 'GLOBAL',
        activo: usuario.activo,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`/api/superadmin/equipo/usuarios/${usuario.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Error'); return; }
            onSuccess();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-lg rounded-3xl border border-white/15 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ background: usuario.rol?.color || '#6366f1' }}>
                            {getInitials(usuario.nombre, usuario.apellido)}
                        </div>
                        <div>
                            <h2 className="font-bold text-white">{usuario.nombre} {usuario.apellido}</h2>
                            <p className="text-xs text-slate-500">{usuario.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Nombre" value={form.nombre} onChange={v => setForm(f => ({ ...f, nombre: v }))} />
                        <InputField label="Apellido" value={form.apellido} onChange={v => setForm(f => ({ ...f, apellido: v }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Cargo" value={form.cargo} onChange={v => setForm(f => ({ ...f, cargo: v }))} />
                        <InputField label="Teléfono" value={form.telefono} onChange={v => setForm(f => ({ ...f, telefono: v }))} />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Rol</label>
                        <select value={form.rolId} onChange={e => setForm(f => ({ ...f, rolId: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-violet-500/50">
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Estado</label>
                            <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-violet-500/50">
                                {['ACTIVO', 'VACACIONES', 'LICENCIA', 'BLOQUEADO', 'SUSPENDIDO'].map(e => (
                                    <option key={e} value={e}>{e}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Scope</label>
                            <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-violet-500/50">
                                {['GLOBAL', 'REGIONAL', 'NEGOCIOS_ASIGNADOS', 'PERSONAL'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-white/15 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {saving ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Modal: Crear Rol ─────────────────────────────────────────────────────────

function ModalCrearRol({ permisosPorModulo, onClose, onSuccess }: {
    permisosPorModulo: Record<string, Permiso[]>; onClose: () => void; onSuccess: () => void;
}) {
    const [form, setForm] = useState({
        nombre: '', descripcion: '', color: '#6366f1', icono: 'Shield', jerarquia: 100,
    });
    const [selectedPermisos, setSelectedPermisos] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const togglePerm = (codigo: string) => {
        setSelectedPermisos(prev =>
            prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]
        );
    };

    const toggleModulo = (modulo: string) => {
        const perms = permisosPorModulo[modulo]?.map(p => p.codigo) || [];
        const allSelected = perms.every(c => selectedPermisos.includes(c));
        setSelectedPermisos(prev =>
            allSelected ? prev.filter(c => !perms.includes(c)) : [...new Set([...prev, ...perms])]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/superadmin/equipo/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, permisoCodigos: selectedPermisos }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Error'); return; }
            onSuccess();
        } finally {
            setSaving(false);
        }
    };

    const COLORES = ['#ec4899', '#8b5cf6', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-2xl max-h-[90vh] rounded-3xl border border-white/15 overflow-hidden flex flex-col"
                style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
                    <h2 className="font-bold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-violet-400" />
                        Nuevo Rol
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Nombre del rol *" value={form.nombre} onChange={v => setForm(f => ({ ...f, nombre: v }))} placeholder="ej. Supervisor" />
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Jerarquía *</label>
                            <input type="number" min={2} max={998} value={form.jerarquia}
                                onChange={e => setForm(f => ({ ...f, jerarquia: Number(e.target.value) }))}
                                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-violet-500/50"
                            />
                        </div>
                    </div>
                    <InputField label="Descripción" value={form.descripcion} onChange={v => setForm(f => ({ ...f, descripcion: v }))} placeholder="Descripción del rol..." />

                    {/* Color */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Color del rol</label>
                        <div className="flex items-center gap-2">
                            {COLORES.map(c => (
                                <button type="button" key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                                    className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'}`}
                                    style={{ background: c }} />

                            ))}
                        </div>
                    </div>

                    {/* Permisos */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-medium text-slate-400">Permisos del rol</label>
                            <span className="text-xs text-violet-400">{selectedPermisos.length} seleccionados</span>
                        </div>
                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                            {Object.entries(permisosPorModulo).map(([modulo, perms]) => {
                                const allSel = perms.every(p => selectedPermisos.includes(p.codigo));
                                const ModIcon = MODULE_ICONS[modulo] || Key;
                                return (
                                    <div key={modulo} className="rounded-xl border border-white/8 overflow-hidden">
                                        <button type="button" onClick={() => toggleModulo(modulo)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                                            <ModIcon className="w-4 h-4 text-slate-500" />
                                            <span className="text-sm text-slate-300 flex-1 text-left">{modulo}</span>
                                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                                                allSel ? 'bg-violet-500 border-violet-500' : 'bg-white/5 border-white/20'
                                            }`}>
                                                {allSel && <Check className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                        </button>
                                        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                                            {perms.map(p => (
                                                <button type="button" key={p.id} onClick={() => togglePerm(p.codigo)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                                                        selectedPermisos.includes(p.codigo)
                                                            ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                                                            : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
                                                    }`}>
                                                    {p.critico && '⚡ '}{p.accion}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-white/15 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {saving ? 'Creando...' : 'Crear rol'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── InputField Helper ────────────────────────────────────────────────────────

function InputField({ label, value, onChange, type = 'text', placeholder = '' }: {
    label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all"
            />
        </div>
    );
}
