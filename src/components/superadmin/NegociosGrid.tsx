"use client";

import { useMemo, useState } from "react";
import { Search, Plus, X, ArrowUpDown, Building2, ChevronDown } from "lucide-react";
import Link from "next/link";
import NegocioActions from "./NegocioActions";
import NegocioModal from "./NegocioModal";

type StatusFilter = "TODOS" | "ACTIVO" | "PRUEBA" | "SUSPENDIDO" | "VENCIDO" | "DEMO";
type SortKey = "recientes" | "nombre" | "citas";

const STATUS_STYLE: Record<string, string> = {
    ACTIVO: "bg-emerald-50 text-emerald-700",
    PRUEBA: "bg-amber-50 text-amber-700",
    SUSPENDIDO: "bg-rose-50 text-rose-700",
    VENCIDO: "bg-slate-100 text-slate-600",
};
const STATUS_LABEL: Record<string, string> = { ACTIVO: "Activo", PRUEBA: "Prueba", SUSPENDIDO: "Suspendido", VENCIDO: "Vencido" };

const SUB_LABEL: Record<string, string> = {
    trial: "Prueba", active: "Al día", activa: "Al día", expired: "Vencida", vencida: "Vencida",
    downgraded: "Bajó de plan", cancelled: "Cancelada", pending: "Pago pendiente",
};

function prettyTipo(t?: string) {
    if (!t) return "—";
    const s = t.replace(/_/g, " ").toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function daysLeft(fecha?: string) {
    if (!fecha) return null;
    return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
}

export default function NegociosGrid({ initialNegocios }: { initialNegocios: any[] }) {
    const negocios = initialNegocios || [];
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<StatusFilter>("TODOS");
    const [tipo, setTipo] = useState("TODOS");
    const [sort, setSort] = useState<SortKey>("recientes");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNegocio, setSelectedNegocio] = useState<any>(null);

    const tipos = useMemo(() => Array.from(new Set(negocios.map((n) => n?.tipoNegocio).filter(Boolean))).sort(), [negocios]);

    const counts = useMemo(() => {
        const c: Record<StatusFilter, number> = { TODOS: negocios.length, ACTIVO: 0, PRUEBA: 0, SUSPENDIDO: 0, VENCIDO: 0, DEMO: 0 };
        for (const n of negocios) {
            if (n?.estado && n.estado in c) c[n.estado as StatusFilter]++;
            if (n?.isDemo) c.DEMO++;
        }
        return c;
    }, [negocios]);

    const list = useMemo(() => {
        const q = search.trim().toLowerCase();
        const filtered = negocios.filter((n) => {
            if (status === "DEMO" ? !n?.isDemo : status !== "TODOS" && n?.estado !== status) return false;
            if (tipo !== "TODOS" && n?.tipoNegocio !== tipo) return false;
            if (!q) return true;
            return [n?.nombre, n?.slug, n?.ciudad, n?.email, n?.whatsapp].some((v) => String(v || "").toLowerCase().includes(q));
        });
        return [...filtered].sort((a, b) => {
            if (sort === "nombre") return String(a?.nombre || "").localeCompare(String(b?.nombre || ""));
            if (sort === "citas") return (b?._count?.Appointment || 0) - (a?._count?.Appointment || 0);
            return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
        });
    }, [negocios, search, status, tipo, sort]);

    const openEdit = (n: any) => { setSelectedNegocio(n); setIsModalOpen(true); };
    const openCreate = () => { setSelectedNegocio(null); setIsModalOpen(true); };

    const FILTERS: { id: StatusFilter; label: string }[] = [
        { id: "TODOS", label: "Todos" },
        { id: "ACTIVO", label: "Activos" },
        { id: "PRUEBA", label: "En prueba" },
        { id: "SUSPENDIDO", label: "Suspendidos" },
        { id: "VENCIDO", label: "Vencidos" },
        { id: "DEMO", label: "Demos" },
    ];

    return (
        <div className="space-y-4 pb-16 lg:pb-0">
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900">Negocios</h1>
                    <p className="text-sm text-slate-500">{negocios.length} negocios en Citiox · {counts.ACTIVO} activos · {counts.PRUEBA} en prueba</p>
                </div>
                <button
                    onClick={openCreate}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg text-sm font-semibold w-fit"
                >
                    <Plus size={16} /> Nuevo negocio
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
                <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
                    {FILTERS.map((f) => {
                        const active = status === f.id;
                        return (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setStatus(f.id)}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                            >
                                {f.label}
                                <span className={`text-xs ${active ? "text-white/70" : "text-slate-400"}`}>{counts[f.id]}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                    <label className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, enlace, ciudad, correo o teléfono"
                            className="w-full !pl-9 !pr-8 !py-2 !text-sm !rounded-lg !border !border-slate-200 !bg-white outline-none focus:!border-slate-400"
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700" aria-label="Borrar búsqueda">
                                <X size={14} />
                            </button>
                        )}
                    </label>
                    <div className="grid grid-cols-2 gap-2 md:w-[26rem]">
                        <SelectBox value={tipo} onChange={setTipo} label="Tipo de negocio">
                            <option value="TODOS">Todos los tipos</option>
                            {tipos.map((t) => <option key={t} value={t}>{prettyTipo(t)}</option>)}
                        </SelectBox>
                        <SelectBox value={sort} onChange={(v) => setSort(v as SortKey)} label="Ordenar" icon={<ArrowUpDown size={13} />}>
                            <option value="recientes">Más recientes</option>
                            <option value="nombre">Nombre (A-Z)</option>
                            <option value="citas">Más citas</option>
                        </SelectBox>
                    </div>
                </div>
            </div>

            {list.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl px-6 py-12 text-center">
                    <Building2 className="mx-auto text-slate-300" size={28} />
                    <p className="text-sm font-semibold text-slate-900 mt-2">No hay negocios con estos filtros</p>
                    <button type="button" onClick={() => { setSearch(""); setStatus("TODOS"); setTipo("TODOS"); }} className="text-sm text-[#0066FF] font-semibold mt-1 hover:underline">Quitar filtros</button>
                </div>
            ) : (
                <>
                    {/* Escritorio: tabla */}
                    <div className="hidden lg:block bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                                <tr>
                                    <th className="px-4 py-2.5 font-semibold">Negocio</th>
                                    <th className="px-3 py-2.5 font-semibold">Tipo</th>
                                    <th className="px-3 py-2.5 font-semibold">Plan</th>
                                    <th className="px-3 py-2.5 font-semibold">Ciudad</th>
                                    <th className="px-3 py-2.5 font-semibold text-right">Servicios</th>
                                    <th className="px-3 py-2.5 font-semibold text-right">Citas</th>
                                    <th className="px-3 py-2.5 font-semibold">Estado</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {list.map((n) => (
                                    <tr key={n.id} className="hover:bg-slate-50/70">
                                        <td className="px-4 py-2.5">
                                            <BusinessCell n={n} />
                                        </td>
                                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{prettyTipo(n.tipoNegocio)}</td>
                                        <td className="px-3 py-2.5"><PlanCell n={n} /></td>
                                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{n.ciudad || <span className="text-slate-400">—</span>}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{n._count?.Service ?? 0}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{n._count?.Appointment ?? 0}</td>
                                        <td className="px-3 py-2.5"><StatusBadge estado={n.estado} /></td>
                                        <td className="px-4 py-2.5"><NegocioActions negocio={n} onEdit={() => openEdit(n)} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Celular: tarjetas */}
                    <ul className="lg:hidden space-y-2">
                        {list.map((n) => (
                            <li key={n.id} className="bg-white border border-slate-200 rounded-xl p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <BusinessCell n={n} />
                                    <StatusBadge estado={n.estado} />
                                </div>
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                    <span>{prettyTipo(n.tipoNegocio)}</span>
                                    {n.ciudad && <span>{n.ciudad}</span>}
                                    <span>{n._count?.Service ?? 0} servicios</span>
                                    <span>{n._count?.Appointment ?? 0} citas</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                    <PlanCell n={n} />
                                    <NegocioActions negocio={n} onEdit={() => openEdit(n)} />
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <NegocioModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} negocio={selectedNegocio} />
        </div>
    );
}

function BusinessCell({ n }: { n: any }) {
    const color = n?.colorPrimario || "#0f172a";
    return (
        <Link href={`/superadmin/negocios/${n.id}`} className="flex items-center gap-2.5 min-w-0 group">
            <span className="size-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: color }}>
                {n?.logoUrl ? <img src={n.logoUrl} alt="" className="w-full h-full object-cover bg-white" /> : (n?.nombre || "N").charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900 truncate group-hover:text-[#0066FF]">{n?.nombre || "Sin nombre"}</span>
                    {n?.isDemo && <span className="text-[10px] font-semibold px-1.5 py-px rounded bg-violet-50 text-violet-700 shrink-0">Demo</span>}
                </span>
                <span className="block text-xs text-slate-400 truncate">/{n?.slug}</span>
            </span>
        </Link>
    );
}

function PlanCell({ n }: { n: any }) {
    const sub = n?.Suscripcion;
    if (!sub) return <span className="text-xs text-slate-400">Sin plan</span>;
    const d = daysLeft(sub.fechaFin);
    const subEstado = SUB_LABEL[String(sub.estado || "").toLowerCase()] || sub.estado;
    return (
        <span className="block min-w-0">
            <span className="block text-sm text-slate-800 truncate">{sub.Plan?.name || "Plan"}</span>
            <span className={`block text-xs ${d !== null && d < 0 ? "text-rose-600" : d !== null && d <= 5 ? "text-amber-600" : "text-slate-400"}`}>
                {subEstado}{d !== null ? ` · ${d < 0 ? `venció hace ${Math.abs(d)} d` : `${d} d restantes`}` : ""}
            </span>
        </span>
    );
}

function StatusBadge({ estado }: { estado: string }) {
    return (
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLE[estado] || "bg-slate-100 text-slate-600"}`}>
            {STATUS_LABEL[estado] || estado || "—"}
        </span>
    );
}

function SelectBox({ value, onChange, label, icon, children }: { value: string; onChange: (v: string) => void; label: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <label className="relative block">
            <span className="sr-only">{label}</span>
            {icon && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</span>}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full appearance-none ${icon ? "!pl-8" : "!pl-3"} !pr-8 !py-2 !text-sm !rounded-lg !border !border-slate-200 !bg-white text-slate-700`}
            >
                {children}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </label>
    );
}
