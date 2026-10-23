"use client";
/**
 * Ficha del negocio (superadmin): datos, suscripción, pagos y fidelidad.
 * Los planes que se ofrecen ya vienen filtrados por el tipo de negocio (familia de planes).
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
    AlertCircle, ArrowDownRight, ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, Clock, Copy,
    CreditCard, Crown, ExternalLink, Eye, History, KeyRound, Loader2, Mail, MapPin, Phone, Plus, RefreshCw,
    Save, ShieldCheck, Sparkles, Trash2, Users, X,
} from "lucide-react";

type Tab = "datos" | "suscripcion" | "pagos" | "fidelidad";
const TABS: { id: Tab; label: string }[] = [
    { id: "datos", label: "Datos y accesos" },
    { id: "suscripcion", label: "Suscripción" },
    { id: "pagos", label: "Pagos e historial" },
    { id: "fidelidad", label: "Fidelidad" },
];
/** Acepta también los nombres viejos de pestaña que usan otros enlaces (?tab=subscription). */
const TAB_ALIAS: Record<string, Tab> = { info: "datos", subscription: "suscripcion", payments: "pagos", loyalty: "fidelidad" };

const SUB_LABEL: Record<string, { label: string; cls: string }> = {
    trial: { label: "En prueba", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
    active: { label: "Al día", cls: "bg-green-50 text-green-800 ring-green-200" },
    activa: { label: "Al día", cls: "bg-green-50 text-green-800 ring-green-200" },
    expired: { label: "Vencida", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
    vencida: { label: "Vencida", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
    canceled: { label: "Cancelada", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
    cancelada: { label: "Cancelada", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
    downgraded: { label: "Bajó de plan", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
    pending: { label: "Pago pendiente", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
};
const NEG_LABEL: Record<string, { label: string; cls: string }> = {
    ACTIVO: { label: "Activo", cls: "bg-green-50 text-green-800 ring-green-200" },
    PRUEBA: { label: "En prueba", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
    SUSPENDIDO: { label: "Suspendido", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
    VENCIDO: { label: "Vencido", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};
const CAMBIO_LABEL: Record<string, string> = {
    upgrade: "Subió de plan", downgrade: "Bajó de plan", renovacion: "Renovó 1 mes", "renovacion anual": "Renovó 1 año",
    manual: "Ajuste manual", START_TRIAL: "Prueba gratis", cancelacion: "Cancelación", set_founder: "Marcado como fundador",
    remove_founder: "Dejó de ser fundador",
};
const METODOS = [["TRANSFERENCIA", "Transferencia"], ["EFECTIVO", "Efectivo"], ["TARJETA", "Tarjeta"], ["DEPOSITO", "Depósito"]] as const;

const money = (n: any) => `$${(Number(n) || 0).toLocaleString("es-EC", { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const fecha = (d: any) => (d ? new Date(d).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" }) : "—");
const hora = (d: any) => (d ? new Date(d).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }) : "");
const diasHasta = (d: any) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null);
const prettyTipo = (t?: string) => { if (!t) return "Sin tipo"; const s = t.replace(/_/g, " ").toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };

interface Props {
    negocio: any;
    planes: any[];
    familia?: { id: string; name: string } | null;
    tipo?: { id: string; name: string } | null;
    origenPlanes?: "tipo" | "vertical" | "plan-actual" | "todos";
    planSolicitado?: { id: string; name: string; price: number } | null;
}

export default function BusinessDetailClient({ negocio, planes, familia, tipo, origenPlanes = "tipo", planSolicitado }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab") || "";
    const [tab, setTab] = useState<Tab>((TAB_ALIAS[tabParam] || (TABS.some((t) => t.id === tabParam) ? tabParam : "datos")) as Tab);
    useEffect(() => {
        const t = TAB_ALIAS[tabParam] || (TABS.some((x) => x.id === tabParam) ? (tabParam as Tab) : null);
        if (t) setTab(t);
    }, [tabParam]);
    const irA = (t: Tab) => { setTab(t); router.replace(`${pathname}?tab=${t}`, { scroll: false }); };

    const [busy, setBusy] = useState<string | null>(null);
    const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
    useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 4500); return () => clearTimeout(id); }, [toast]);
    const ok = (text: string) => setToast({ ok: true, text });
    const fail = (text: string) => setToast({ ok: false, text });

    const sub = negocio.Suscripcion || null;
    const plan = sub?.Plan || null;
    const precio = sub?.lockedPrice ?? plan?.price ?? 0;
    const dias = diasHasta(sub?.fechaFin);
    const subInfo = SUB_LABEL[String(sub?.estado || "").toLowerCase()] || (sub ? { label: sub.estado, cls: "bg-slate-100 text-slate-600 ring-slate-200" } : null);
    const [estadoNeg, setEstadoNeg] = useState<string>(negocio.estado || "ACTIVO");
    const negInfo = NEG_LABEL[estadoNeg] || { label: estadoNeg, cls: "bg-slate-100 text-slate-600 ring-slate-200" };

    // ── Acciones comunes ──
    const entrarAlPanel = async () => {
        setBusy("entrar");
        try {
            const res = await fetch(`/api/superadmin/businesses/${negocio.id}/access`, { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "No se pudo entrar al panel del negocio");
            window.open(data.redirectUrl || "/admin", "_blank");
        } catch (e: any) { fail(e.message); } finally { setBusy(null); }
    };

    const cambiarEstado = async () => {
        const nuevo = estadoNeg === "SUSPENDIDO" ? "ACTIVO" : "SUSPENDIDO";
        setBusy("estado");
        try {
            const res = await fetch(`/api/superadmin/negocios/${negocio.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: nuevo }) });
            if (!res.ok) throw new Error("No se pudo cambiar el estado del negocio");
            setEstadoNeg(nuevo);
            ok(nuevo === "ACTIVO" ? "Negocio reactivado: su página vuelve a recibir reservas." : "Negocio suspendido: su página deja de recibir reservas.");
            router.refresh();
        } catch (e: any) { fail(e.message); } finally { setBusy(null); setConfirm(null); }
    };

    const accionSuscripcion = async (action: string, extra: any = {}, mensaje = "Suscripción actualizada.") => {
        setBusy(action);
        try {
            const res = await fetch(`/api/superadmin/suscripciones`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ negocioId: negocio.id, planId: extra.planId ?? plan?.id, action, ...extra }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "No se pudo actualizar la suscripción");
            ok(mensaje);
            router.refresh();
        } catch (e: any) { fail(e.message); } finally { setBusy(null); setConfirm(null); }
    };

    const resolverSolicitud = async (aprobar: boolean) => {
        setBusy(aprobar ? "aprobar" : "rechazar");
        try {
            const res = await fetch(`/api/superadmin/solicitudes/${sub.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: aprobar ? "APPROVE" : "REJECT" }) });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "No se pudo procesar la solicitud");
            ok(aprobar ? "Solicitud aprobada." : "Solicitud rechazada.");
            router.refresh();
        } catch (e: any) { fail(e.message); } finally { setBusy(null); setConfirm(null); }
    };

    // ── Confirmación genérica ──
    const [confirm, setConfirm] = useState<null | { titulo: string; texto: React.ReactNode; boton: string; peligro?: boolean; run: () => void }>(null);

    // ── Modales ──
    const [pagoOpen, setPagoOpen] = useState(false);
    const [resetUser, setResetUser] = useState<any>(null);
    const [borrarOpen, setBorrarOpen] = useState(false);

    return (
        <div className="space-y-5 pb-24">
            {/* Encabezado */}
            <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <Link href="/superadmin/negocios" className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900" aria-label="Volver a negocios">
                        <ArrowLeft size={18} />
                    </Link>
                    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-bold text-white" style={{ backgroundColor: negocio.colorPrimario || "#0f172a" }}>
                        {negocio.logoUrl ? <img src={negocio.logoUrl} alt="" className="size-full bg-white object-cover" /> : (negocio.nombre || "N").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{negocio.nombre}</h1>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${negInfo.cls}`}>{negInfo.label}</span>
                            {negocio.isDemo && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">Demo</span>}
                            {sub?.isFounder && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">Fundador</span>}
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                            <a href={`/${negocio.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#0066FF]">citiox.com/{negocio.slug}</a>
                            <span aria-hidden>·</span><span>{tipo?.name || prettyTipo(negocio.tipoNegocio)}</span>
                            {negocio.ciudad && <><span aria-hidden>·</span><span>{negocio.ciudad}</span></>}
                            <span aria-hidden>·</span><span>Creado el {fecha(negocio.createdAt)}</span>
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <a href={`/${negocio.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        <ExternalLink size={15} /> Ver página
                    </a>
                    <button type="button" onClick={entrarAlPanel} disabled={busy === "entrar"} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                        {busy === "entrar" ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Entrar a su panel
                    </button>
                </div>
            </header>

            {/* Resumen: suscripción + números */}
            <section className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
                <button type="button" onClick={() => irA("suscripcion")} className="group rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-500">Plan</span>
                        {subInfo && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${subInfo.cls}`}>{subInfo.label}</span>}
                    </div>
                    <p className="mt-1 truncate text-lg font-bold text-slate-900">{plan?.name || "Sin plan"}</p>
                    <p className={`mt-0.5 text-sm ${dias !== null && dias < 0 ? "text-rose-600" : dias !== null && dias <= 5 ? "text-amber-700" : "text-slate-500"}`}>
                        {sub ? <>{money(precio)}/mes · {dias === null ? "sin fecha" : dias < 0 ? `venció hace ${-dias} ${-dias === 1 ? "día" : "días"}` : `vence en ${dias} ${dias === 1 ? "día" : "días"} (${fecha(sub.fechaFin)})`}</> : "Este negocio no tiene suscripción"}
                    </p>
                    {sub?.pagoPendiente && <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800"><AlertCircle size={13} /> Tiene una solicitud de cambio por revisar</p>}
                </button>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
                    <Numero label="Servicios" value={negocio._count?.Service ?? 0} icon={<Sparkles size={14} />} />
                    <Numero label="Citas" value={negocio._count?.Appointment ?? 0} icon={<CalendarDays size={14} />} />
                    <Numero label="Usuarios" value={negocio._count?.Usuario ?? 0} icon={<Users size={14} />} />
                    <Numero label="Ubicaciones" value={negocio._count?.Ubicacion ?? 0} icon={<MapPin size={14} />} />
                </div>
            </section>

            {/* Pestañas */}
            <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 lg:mx-0 lg:px-0" style={{ scrollbarWidth: "none" }} aria-label="Secciones del negocio">
                {TABS.map((t) => (
                    <button key={t.id} type="button" onClick={() => irA(t.id)} aria-current={tab === t.id ? "page" : undefined}
                        className={`relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-semibold transition ${tab === t.id ? "text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>
                        {t.label}
                        {t.id === "suscripcion" && sub?.pagoPendiente && <span className="ml-1.5 inline-block size-2 rounded-full bg-amber-500 align-middle" aria-label="pendiente" />}
                        {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#0066FF]" />}
                    </button>
                ))}
            </nav>

            {tab === "datos" && (
                <DatosTab negocio={negocio} estadoNeg={estadoNeg} busy={busy}
                    onSaved={(m) => { ok(m); router.refresh(); }} onError={fail}
                    onReset={setResetUser}
                    onEstado={() => setConfirm({
                        titulo: estadoNeg === "SUSPENDIDO" ? "Reactivar negocio" : "Suspender negocio",
                        texto: estadoNeg === "SUSPENDIDO" ? "Su página vuelve a recibir reservas y pedidos, y el panel funciona normal." : "Su página deja de recibir reservas y pedidos. No se borra nada; puedes reactivarlo cuando quieras.",
                        boton: estadoNeg === "SUSPENDIDO" ? "Reactivar" : "Suspender", peligro: estadoNeg !== "SUSPENDIDO", run: cambiarEstado,
                    })}
                    onBorrar={() => setBorrarOpen(true)} />
            )}

            {tab === "suscripcion" && (
                <div className="space-y-5">
                    {sub?.pagoPendiente && (
                        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
                                <div>
                                    <p className="font-semibold text-amber-900">Pidió cambiar a {planSolicitado?.name || "otro plan"}</p>
                                    <p className="text-sm text-amber-800">
                                        {planSolicitado ? `${money(planSolicitado.price)}/mes · ` : ""}{String(sub.metodoPago || "").includes("ANNUAL") ? "Pago anual" : "Pago mensual"} · el {fecha(sub.updatedAt)}. Revisa que el pago haya llegado antes de aprobar.
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <button type="button" disabled={!!busy} onClick={() => setConfirm({ titulo: "Rechazar solicitud", texto: "El negocio se queda con su plan actual.", boton: "Rechazar", peligro: true, run: () => resolverSolicitud(false) })}
                                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">Rechazar</button>
                                <button type="button" disabled={!!busy} onClick={() => resolverSolicitud(true)}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                                    {busy === "aprobar" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Aprobar
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                        {/* Cambiar plan */}
                        <section className="rounded-xl border border-slate-200 bg-white">
                            <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 className="font-semibold text-slate-900">Planes para este negocio</h2>
                                    <p className="text-sm text-slate-500">
                                        {origenPlanes === "todos"
                                            ? "Su tipo de negocio no tiene una familia de planes asignada, así que se muestran todos."
                                            : <>Familia <b className="font-semibold text-slate-700">{familia?.name}</b>{origenPlanes === "tipo" && tipo ? <> · tipo {tipo.name}</> : origenPlanes === "vertical" ? " · según su vertical" : " · según su plan actual"}</>}
                                    </p>
                                </div>
                                <p className="text-xs text-slate-500">Cambiar de plan conserva la fecha de vencimiento.</p>
                            </div>
                            {origenPlanes === "todos" && (
                                <p className="mx-5 mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" /> Asigna una familia de planes a su tipo de negocio en «Tipos de negocio» para que aquí salgan solo los que corresponden.
                                </p>
                            )}
                            <ul className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
                                {planes.map((p) => {
                                    const actual = p.id === plan?.id;
                                    const sube = p.price > (plan?.price ?? 0);
                                    return (
                                        <li key={p.id} className={`flex flex-col rounded-xl border p-4 ${actual ? "border-[#0066FF] bg-blue-50/40 ring-1 ring-[#0066FF]" : "border-slate-200"}`}>
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="font-semibold text-slate-900">{p.name}</p>
                                                {actual ? <span className="rounded-full bg-[#0066FF] px-2 py-0.5 text-[11px] font-semibold text-white">Actual</span>
                                                    : p.isDefault ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Predeterminado</span> : null}
                                            </div>
                                            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(p.price)}<span className="text-sm font-medium text-slate-500">/mes</span></p>
                                            {p.fueraDeFamilia && <p className="mt-1 text-xs text-amber-700">No es de la familia de este tipo de negocio.</p>}
                                            <ul className="mt-3 space-y-1 text-sm text-slate-600">
                                                <li>{p.maxStaff >= 999 ? "Profesionales ilimitados" : `${p.maxStaff} ${p.maxStaff === 1 ? "profesional" : "profesionales"}`}</li>
                                                <li>{p.maxAppointmentsMonthly >= 99999 ? "Citas ilimitadas" : `${p.maxAppointmentsMonthly} citas al mes`}</li>
                                                <li>{p.max_locations} {p.max_locations === 1 ? "ubicación" : "ubicaciones"}</li>
                                            </ul>
                                            {!actual && (
                                                <button type="button" disabled={!!busy}
                                                    onClick={() => setConfirm({
                                                        titulo: `Cambiar a ${p.name}`,
                                                        texto: <>Pasa de <b>{plan?.name || "sin plan"}</b> ({money(plan?.price)}/mes) a <b>{p.name}</b> ({money(p.price)}/mes). {sub ? <>La fecha de vencimiento se mantiene: <b>{fecha(sub.fechaFin)}</b>.</> : "Se crea su suscripción con este plan."}</>,
                                                        boton: sube ? "Subir de plan" : "Bajar de plan",
                                                        run: () => accionSuscripcion("CHANGE_PLAN", { planId: p.id }, `Plan cambiado a ${p.name}.`),
                                                    })}
                                                    className="mt-4 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50">
                                                    {sube ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />} {sube ? "Subir a este plan" : "Bajar a este plan"}
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>

                        {/* Tiempo y prueba */}
                        <aside className="space-y-4">
                            <section className="rounded-xl border border-slate-200 bg-white p-4">
                                <h2 className="font-semibold text-slate-900">Ajustar el tiempo</h2>
                                <p className="text-sm text-slate-500">{sub ? <>Vence el <b className="font-semibold text-slate-700">{fecha(sub.fechaFin)}</b>. Si ya venció, se cuenta desde hoy.</> : "Se crea la suscripción con su plan."}</p>
                                <div className="mt-3 space-y-2">
                                    <AccionTiempo titulo="Renovar 1 mes" detalle="Pago mensual recibido" busy={busy === "RENEW"}
                                        onClick={() => setConfirm({ titulo: "Renovar 1 mes", texto: "Suma un mes a la fecha de vencimiento y deja la suscripción al día.", boton: "Renovar", run: () => accionSuscripcion("RENEW", {}, "Se sumó 1 mes.") })} />
                                    <AccionTiempo titulo="Renovar 1 año" detalle="Pago anual recibido" busy={busy === "RENEW_ANNUAL"}
                                        onClick={() => setConfirm({ titulo: "Renovar 1 año", texto: "Suma un año a la fecha de vencimiento y deja la suscripción al día.", boton: "Renovar", run: () => accionSuscripcion("RENEW_ANNUAL", {}, "Se sumó 1 año.") })} />
                                    <AccionTiempo titulo="Cortesía de 7 días" detalle="Sin cobro, no cambia el estado" busy={busy === "EXTEND"}
                                        onClick={() => setConfirm({ titulo: "Dar 7 días de cortesía", texto: "Suma 7 días a la fecha de vencimiento sin registrar un pago.", boton: "Dar cortesía", run: () => accionSuscripcion("EXTEND", { dias: 7 }, "Se sumaron 7 días de cortesía.") })} />
                                    <AccionTiempo titulo="Reiniciar prueba gratis" detalle="30 días desde hoy" busy={busy === "START_TRIAL"}
                                        onClick={() => setConfirm({ titulo: "Reiniciar prueba gratis", texto: "La suscripción vuelve a «en prueba» por 30 días contados desde hoy.", boton: "Reiniciar prueba", run: () => accionSuscripcion("START_TRIAL", {}, "Prueba gratis reiniciada por 30 días.") })} />
                                </div>
                            </section>
                            <button type="button" onClick={() => { irA("pagos"); setPagoOpen(true); }} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300">
                                <span><span className="block font-semibold text-slate-900">Registrar un pago</span><span className="text-sm text-slate-500">Transferencia, efectivo o tarjeta</span></span>
                                <Plus size={18} className="text-slate-400" />
                            </button>
                        </aside>
                    </div>
                </div>
            )}

            {tab === "pagos" && (
                <PagosTab negocio={negocio} plan={plan} precio={precio} onRegistrar={() => setPagoOpen(true)} />
            )}

            {tab === "fidelidad" && <FidelidadTab negocioId={negocio.id} onOk={ok} onError={fail} pedirConfirmacion={setConfirm} />}

            {/* ── Modales ── */}
            {confirm && (
                <Modal titulo={confirm.titulo} onClose={() => !busy && setConfirm(null)}>
                    <div className="text-sm leading-relaxed text-slate-600">{confirm.texto}</div>
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={() => setConfirm(null)} disabled={!!busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                        <button type="button" onClick={confirm.run} disabled={!!busy}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${confirm.peligro ? "bg-rose-600 hover:bg-rose-700" : "bg-[#0066FF] hover:bg-[#0052cc]"}`}>
                            {busy && <Loader2 size={15} className="animate-spin" />} {confirm.boton}
                        </button>
                    </div>
                </Modal>
            )}
            {pagoOpen && <PagoModal negocioId={negocio.id} planId={plan?.id} sugerido={precio} onClose={() => setPagoOpen(false)} onDone={() => { setPagoOpen(false); ok("Pago registrado."); router.refresh(); }} onError={fail} />}
            {resetUser && <ResetModal user={resetUser} onClose={() => setResetUser(null)} onError={fail} />}
            {borrarOpen && <BorrarModal negocio={negocio} onClose={() => setBorrarOpen(false)} onError={fail} onDone={() => router.push("/superadmin/negocios")} />}

            {toast && (
                <div role="status" className={`fixed bottom-20 right-4 z-[400] flex max-w-sm items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl lg:bottom-6 ${toast.ok ? "bg-slate-900" : "bg-rose-600"}`}>
                    {toast.ok ? <CheckCircle2 size={18} className="mt-px shrink-0 text-green-400" /> : <AlertCircle size={18} className="mt-px shrink-0" />}
                    <span className="flex-1">{toast.text}</span>
                    <button type="button" onClick={() => setToast(null)} className="-mr-1 text-white/60 hover:text-white" aria-label="Cerrar"><X size={16} /></button>
                </div>
            )}
        </div>
    );
}

/* ───────────────────────── Datos y accesos ───────────────────────── */

function DatosTab({ negocio, estadoNeg, busy, onSaved, onError, onReset, onEstado, onBorrar }: {
    negocio: any; estadoNeg: string; busy: string | null; onSaved: (m: string) => void; onError: (m: string) => void;
    onReset: (u: any) => void; onEstado: () => void; onBorrar: () => void;
}) {
    const inicial = useMemo(() => ({
        nombre: negocio.nombre || "", propietario: negocio.propietario || "", emailContacto: negocio.emailContacto || "",
        whatsapp: negocio.whatsapp || "", ciudad: negocio.ciudad || "", direccion: negocio.direccion || "",
    }), [negocio]);
    const [form, setForm] = useState(inicial);
    const [guardando, setGuardando] = useState(false);
    const cambios = (Object.keys(inicial) as (keyof typeof inicial)[]).some((k) => form[k] !== inicial[k]);
    const set = (k: keyof typeof inicial) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

    const guardar = async () => {
        if (form.nombre.trim().length < 2) return onError("Escribe el nombre del negocio.");
        setGuardando(true);
        try {
            const res = await fetch(`/api/superadmin/negocios/${negocio.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (!res.ok) throw new Error("No se pudieron guardar los datos");
            onSaved("Datos del negocio guardados.");
        } catch (e: any) { onError(e.message); } finally { setGuardando(false); }
    };
    const usuarios: any[] = negocio.Usuario || [];
    const suspendido = estadoNeg === "SUSPENDIDO";

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-5">
                <section className="rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-semibold text-slate-900">Datos del negocio</h2>
                        <p className="text-sm text-slate-500">Contacto y ubicación que usa Citiox para comunicarse con el negocio.</p>
                    </div>
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                        <Campo label="Nombre comercial"><input value={form.nombre} onChange={set("nombre")} className={INPUT} /></Campo>
                        <Campo label="Propietario o representante"><input value={form.propietario} onChange={set("propietario")} placeholder="Nombre y apellido" className={INPUT} /></Campo>
                        <Campo label="WhatsApp"><input value={form.whatsapp} onChange={set("whatsapp")} inputMode="tel" placeholder="0991234567" className={INPUT} /></Campo>
                        <Campo label="Correo de contacto"><input type="email" value={form.emailContacto} onChange={set("emailContacto")} placeholder="correo@negocio.com" className={INPUT} /></Campo>
                        <Campo label="Ciudad"><input value={form.ciudad} onChange={set("ciudad")} className={INPUT} /></Campo>
                        <Campo label="Dirección"><input value={form.direccion} onChange={set("direccion")} className={INPUT} /></Campo>
                    </div>
                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">
                        {cambios && <button type="button" onClick={() => setForm(inicial)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Descartar</button>}
                        <button type="button" onClick={guardar} disabled={!cambios || guardando}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
                            {guardando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {cambios ? "Guardar cambios" : "Sin cambios"}
                        </button>
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-semibold text-slate-900">Personas con acceso al panel</h2>
                        <p className="text-sm text-slate-500">Si alguien olvidó su contraseña, genera una temporal y envíasela.</p>
                    </div>
                    {usuarios.length ? (
                        <ul className="divide-y divide-slate-100">
                            {usuarios.map((u) => (
                                <li key={u.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="flex items-center gap-2 font-medium text-slate-900">
                                            <span className="truncate">{u.nombre || "Sin nombre"}</span>
                                            <span className="rounded bg-slate-100 px-1.5 py-px text-[11px] font-semibold text-slate-600">{rolLabel(u.role)}</span>
                                        </p>
                                        <p className="flex flex-wrap gap-x-3 text-sm text-slate-500">
                                            {u.email && <span className="inline-flex items-center gap-1"><Mail size={13} /> {u.email}</span>}
                                            {u.phone && <span className="inline-flex items-center gap-1"><Phone size={13} /> {u.phone}</span>}
                                        </p>
                                    </div>
                                    <button type="button" onClick={() => onReset(u)} className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:self-auto">
                                        <KeyRound size={14} /> Nueva contraseña
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="px-5 py-8 text-center text-sm text-slate-500">Este negocio no tiene usuarios registrados.</p>
                    )}
                </section>
            </div>

            <aside className="space-y-4">
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="font-semibold text-slate-900">Estado del negocio</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {suspendido ? "Está suspendido: su página no recibe reservas ni pedidos." : "Está activo: su página recibe reservas y pedidos."}
                    </p>
                    <button type="button" onClick={onEstado} disabled={busy === "estado"}
                        className={`mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${suspendido ? "bg-slate-900 text-white hover:bg-slate-800" : "border border-rose-200 text-rose-700 hover:bg-rose-50"}`}>
                        {busy === "estado" && <Loader2 size={15} className="animate-spin" />} {suspendido ? "Reactivar negocio" : "Suspender negocio"}
                    </button>
                </section>
                <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <h2 className="mb-2 font-semibold text-slate-900">Información</h2>
                    <dl className="space-y-1.5 text-slate-600">
                        <Dato k="Enlace" v={`/${negocio.slug}`} />
                        <Dato k="Tipo" v={prettyTipo(negocio.tipoNegocio)} />
                        <Dato k="Creado" v={fecha(negocio.createdAt)} />
                        <Dato k="ID" v={<span className="font-mono text-xs">{negocio.id}</span>} copiar={negocio.id} />
                    </dl>
                </section>
                <section className="rounded-xl border border-rose-200 bg-white p-4">
                    <h2 className="font-semibold text-rose-700">Eliminar negocio</h2>
                    <p className="mt-1 text-sm text-slate-500">Borra el negocio, sus usuarios, citas y configuración. No se puede deshacer.</p>
                    <button type="button" onClick={onBorrar} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                        <Trash2 size={15} /> Eliminar negocio
                    </button>
                </section>
            </aside>
        </div>
    );
}

const rolLabel = (r?: string) => ({ ADMIN: "Administrador", NEGOCIO_ADMIN: "Administrador", OWNER: "Dueño", STAFF: "Profesional", PROFESIONAL: "Profesional", CLIENTE: "Cliente" } as Record<string, string>)[String(r || "").toUpperCase()] || r || "Usuario";

/* ───────────────────────── Pagos e historial ───────────────────────── */

function PagosTab({ negocio, plan, precio, onRegistrar }: { negocio: any; plan: any; precio: number; onRegistrar: () => void }) {
    const pagos: any[] = negocio.Payment || [];
    const historial: any[] = negocio.SubscriptionHistory || [];
    const total = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3">
                <Numero label="Total cobrado" value={money(total)} icon={<CreditCard size={14} />} />
                <Numero label="Último pago" value={pagos[0] ? `${money(pagos[0].monto)} · ${fecha(pagos[0].fecha_pago)}` : "—"} icon={<Clock size={14} />} />
                <Numero label="Precio actual" value={plan ? `${money(precio)}/mes` : "—"} icon={<Crown size={14} />} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                        <h2 className="font-semibold text-slate-900">Pagos recibidos</h2>
                        <button type="button" onClick={onRegistrar} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#0052cc]"><Plus size={15} /> Registrar pago</button>
                    </div>
                    {pagos.length ? (
                        <ul className="divide-y divide-slate-100">
                            {pagos.map((p) => (
                                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold tabular-nums text-slate-900">{money(p.monto)}</p>
                                        <p className="truncate text-sm text-slate-500">{fecha(p.fecha_pago)} · {metodoLabel(p.metodo_pago)}{p.referencia ? ` · ${p.referencia}` : ""}</p>
                                    </div>
                                    {p.comprobante && /^https?:\/\//.test(p.comprobante) && (
                                        <a href={p.comprobante} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Eye size={13} /> Comprobante</a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-5 py-10 text-center">
                            <CreditCard className="mx-auto text-slate-300" size={26} />
                            <p className="mt-2 text-sm text-slate-500">Aún no hay pagos registrados.</p>
                        </div>
                    )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-semibold text-slate-900">Historial de la suscripción</h2>
                    </div>
                    {historial.length ? (
                        <ol className="divide-y divide-slate-100">
                            {historial.map((h) => {
                                const nuevo = h.Plan_SubscriptionHistory_plan_nuevo_idToPlan?.name;
                                const antes = h.Plan_SubscriptionHistory_plan_anterior_idToPlan?.name;
                                const cambioPlan = antes && nuevo && antes !== nuevo;
                                return (
                                    <li key={h.id} className="flex items-start gap-3 px-5 py-3">
                                        <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${h.tipo_cambio === "upgrade" ? "bg-green-50 text-green-700" : h.tipo_cambio === "downgrade" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                                            {h.tipo_cambio === "upgrade" ? <ArrowUpRight size={15} /> : h.tipo_cambio === "downgrade" ? <ArrowDownRight size={15} /> : <RefreshCw size={14} />}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-900">{CAMBIO_LABEL[h.tipo_cambio] || h.tipo_cambio}</p>
                                            <p className="text-sm text-slate-500">{cambioPlan ? <>{antes} <ChevronRight size={12} className="inline" /> {nuevo}</> : nuevo || "—"}{h.admin_id && h.admin_id !== "SISTEMA" ? " · por el equipo" : ""}</p>
                                        </div>
                                        <p className="shrink-0 text-right text-xs text-slate-500">{fecha(h.fecha_cambio)}<br />{hora(h.fecha_cambio)}</p>
                                    </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <div className="px-5 py-10 text-center">
                            <History className="mx-auto text-slate-300" size={26} />
                            <p className="mt-2 text-sm text-slate-500">Sin cambios registrados.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
const metodoLabel = (m?: string) => (METODOS.find(([k]) => k === String(m || "").toUpperCase())?.[1]) || m || "Sin método";

/* ───────────────────────── Fidelidad ───────────────────────── */

function FidelidadTab({ negocioId, onOk, onError, pedirConfirmacion }: {
    negocioId: string; onOk: (m: string) => void; onError: (m: string) => void;
    pedirConfirmacion: (c: { titulo: string; texto: React.ReactNode; boton: string; peligro?: boolean; run: () => void } | null) => void;
}) {
    const [cargando, setCargando] = useState(true);
    const [temporada, setTemporada] = useState<any>(null);
    const [historial, setHistorial] = useState<any[]>([]);
    const [meses, setMeses] = useState(3);
    const [descuento, setDescuento] = useState(100);
    const [enviando, setEnviando] = useState(false);

    const cargar = async () => {
        setCargando(true);
        try {
            const res = await fetch(`/api/admin/loyalty/seasons?negocioId=${negocioId}`);
            if (res.ok) {
                const d = await res.json();
                setTemporada(d.season || null); setHistorial(d.history || []);
                if (d.season) { setMeses(d.season.duracionMeses || 3); setDescuento(d.season.descuentoDiamantes ?? 100); }
            }
        } catch { /* sin datos */ } finally { setCargando(false); }
    };
    useEffect(() => { cargar(); }, [negocioId]);

    const reiniciar = async () => {
        setEnviando(true);
        try {
            const res = await fetch(`/api/superadmin/negocios/${negocioId}/reinicio-temporada`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duracionMeses: meses, descuentoDiamantes: descuento }) });
            const d = await res.json().catch(() => ({}));
            if (!res.ok || !d.success) throw new Error(d.error || "No se pudo reiniciar la temporada");
            onOk(d.message || "Temporada iniciada.");
            cargar();
        } catch (e: any) { onError(e.message); } finally { setEnviando(false); pedirConfirmacion(null); }
    };

    if (cargando) return <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Cargando temporadas…</div>;

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">Temporada del club de fidelidad</h2>
                    <p className="text-sm text-slate-500">Al cerrar una temporada se descuentan diamantes a los clientes y se recalcula su nivel.</p>
                </div>
                <div className="space-y-4 p-5">
                    {temporada ? (
                        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm">
                            <div><dt className="text-slate-500">Empezó</dt><dd className="font-semibold text-slate-900">{fecha(temporada.fechaInicio)}</dd></div>
                            <div><dt className="text-slate-500">Termina</dt><dd className="font-semibold text-slate-900">{fecha(temporada.fechaFin)}</dd></div>
                        </dl>
                    ) : (
                        <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Este negocio aún no tiene una temporada. Puedes iniciar la primera ahora.</p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Campo label="Duración (meses)"><input type="number" min={1} value={meses} onChange={(e) => setMeses(Math.max(1, Number(e.target.value) || 1))} className={INPUT} /></Campo>
                        <Campo label="Diamantes que se descuentan"><input type="number" min={0} value={descuento} onChange={(e) => setDescuento(Math.max(0, Number(e.target.value) || 0))} className={INPUT} /></Campo>
                    </div>
                    <button type="button" disabled={enviando}
                        onClick={() => pedirConfirmacion({
                            titulo: temporada ? "Cerrar temporada y empezar otra" : "Iniciar la primera temporada",
                            texto: temporada ? <>Se cierra la temporada actual, se descuentan <b>{descuento}</b> diamantes a cada cliente, se recalculan los niveles y empieza una nueva de <b>{meses}</b> {meses === 1 ? "mes" : "meses"}.</> : <>Empieza una temporada de <b>{meses}</b> {meses === 1 ? "mes" : "meses"}.</>,
                            boton: temporada ? "Cerrar y empezar" : "Iniciar", peligro: !!temporada, run: reiniciar,
                        })}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold ${temporada ? "border border-rose-200 text-rose-700 hover:bg-rose-50" : "bg-[#0066FF] text-white hover:bg-[#0052cc]"}`}>
                        {enviando && <Loader2 size={15} className="animate-spin" />} {temporada ? "Cerrar temporada y empezar otra" : "Iniciar primera temporada"}
                    </button>
                </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3"><h2 className="font-semibold text-slate-900">Temporadas anteriores</h2></div>
                {historial.length ? (
                    <ul className="divide-y divide-slate-100">
                        {historial.map((h) => (
                            <li key={h.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                                <span><span className="block font-medium text-slate-900">Desde {fecha(h.fechaInicio)}</span><span className="text-slate-500">{h.duracionMeses} meses · −{h.descuentoDiamantes} diamantes</span></span>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${h.activa ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-600"}`}>{h.activa ? "Activa" : "Cerrada"}</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="px-4 py-8 text-center text-sm text-slate-500">Sin temporadas anteriores.</p>}
            </section>
        </div>
    );
}

/* ───────────────────────── Modales ───────────────────────── */

function PagoModal({ negocioId, planId, sugerido, onClose, onDone, onError }: { negocioId: string; planId?: string; sugerido: number; onClose: () => void; onDone: () => void; onError: (m: string) => void }) {
    const [f, setF] = useState({ monto: sugerido ? String(sugerido) : "", metodoPago: "TRANSFERENCIA", referencia: "", comprobante: "" });
    const [enviando, setEnviando] = useState(false);
    const montoNum = Number(f.monto.replace(",", "."));
    const guardar = async () => {
        if (!(montoNum > 0)) return onError("Escribe un monto mayor que cero.");
        if (f.comprobante && !/^https?:\/\//.test(f.comprobante)) return onError("El comprobante debe ser un enlace que empiece con https://");
        setEnviando(true);
        try {
            const res = await fetch(`/api/superadmin/pagos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ negocioId, planId, ...f, monto: montoNum }) });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error || "No se pudo registrar el pago");
            onDone();
        } catch (e: any) { onError(e.message); } finally { setEnviando(false); }
    };
    return (
        <Modal titulo="Registrar un pago" onClose={() => !enviando && onClose()}>
            <p className="-mt-1 mb-4 text-sm text-slate-500">Registrar el pago no mueve la fecha de vencimiento: usa «Renovar» en Suscripción para eso.</p>
            <div className="space-y-3">
                <Campo label="Monto (USD)"><input inputMode="decimal" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} placeholder="0.00" className={`${INPUT} text-lg font-semibold`} autoFocus /></Campo>
                <Campo label="Método">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {METODOS.map(([k, l]) => (
                            <button key={k} type="button" onClick={() => setF({ ...f, metodoPago: k })} aria-pressed={f.metodoPago === k}
                                className={`rounded-lg border px-2 py-2 text-sm font-semibold ${f.metodoPago === k ? "border-[#0066FF] bg-blue-50 text-[#0052cc]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>{l}</button>
                        ))}
                    </div>
                </Campo>
                <Campo label="Referencia (opcional)"><input value={f.referencia} onChange={(e) => setF({ ...f, referencia: e.target.value })} placeholder="N.º de transferencia o nota" className={INPUT} /></Campo>
                <Campo label="Enlace del comprobante (opcional)"><input value={f.comprobante} onChange={(e) => setF({ ...f, comprobante: e.target.value })} placeholder="https://drive.google.com/…" className={INPUT} /></Campo>
            </div>
            <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={onClose} disabled={enviando} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={guardar} disabled={enviando} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0052cc] disabled:opacity-60">
                    {enviando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Registrar {montoNum > 0 ? money(montoNum) : "pago"}
                </button>
            </div>
        </Modal>
    );
}

function ResetModal({ user, onClose, onError }: { user: any; onClose: () => void; onError: (m: string) => void }) {
    const [clave] = useState(() => `Acceso${Math.floor(100000 + Math.random() * 900000)}`);
    const [hecho, setHecho] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [copiado, setCopiado] = useState(false);
    const confirmar = async () => {
        setEnviando(true);
        try {
            const res = await fetch(`/api/superadmin/usuarios/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: clave }) });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error || "No se pudo cambiar la contraseña");
            setHecho(true);
        } catch (e: any) { onError(e.message); } finally { setEnviando(false); }
    };
    const copiar = async () => { try { await navigator.clipboard.writeText(`Correo: ${user.email}\nContraseña temporal: ${clave}`); setCopiado(true); } catch { /* sin portapapeles */ } };
    return (
        <Modal titulo={hecho ? "Contraseña cambiada" : "Nueva contraseña temporal"} onClose={() => !enviando && onClose()}>
            {!hecho ? (
                <>
                    <p className="text-sm text-slate-600">Se reemplaza la contraseña de <b>{user.nombre || user.email}</b>. La actual no se puede ver porque está cifrada.</p>
                    <div className="mt-4 rounded-lg bg-slate-50 p-3 font-mono text-lg font-semibold tracking-wide text-slate-900">{clave}</div>
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                        <button type="button" onClick={confirmar} disabled={enviando} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0052cc] disabled:opacity-60">
                            {enviando ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} Cambiar contraseña
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <p className="text-sm text-slate-600">Ya puede entrar con estos datos. Envíaselos por un canal privado y pídele que la cambie.</p>
                    <dl className="mt-4 space-y-1.5 rounded-lg bg-slate-50 p-3 text-sm">
                        <div className="flex justify-between gap-3"><dt className="text-slate-500">Correo</dt><dd className="truncate font-semibold text-slate-900">{user.email}</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-slate-500">Contraseña</dt><dd className="font-mono font-semibold text-slate-900">{clave}</dd></div>
                    </dl>
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={copiar} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Copy size={15} /> {copiado ? "Copiado" : "Copiar datos"}</button>
                        <button type="button" onClick={onClose} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Listo</button>
                    </div>
                </>
            )}
        </Modal>
    );
}

function BorrarModal({ negocio, onClose, onDone, onError }: { negocio: any; onClose: () => void; onDone: () => void; onError: (m: string) => void }) {
    const [texto, setTexto] = useState("");
    const [enviando, setEnviando] = useState(false);
    const listo = texto.trim().toLowerCase() === String(negocio.slug || "").toLowerCase();
    const borrar = async () => {
        setEnviando(true);
        try {
            const res = await fetch(`/api/superadmin/negocios/${negocio.id}`, { method: "DELETE" });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error || "No se pudo eliminar el negocio");
            onDone();
        } catch (e: any) { onError(e.message); setEnviando(false); }
    };
    return (
        <Modal titulo={`Eliminar ${negocio.nombre}`} onClose={() => !enviando && onClose()}>
            <p className="text-sm text-slate-600">Se borran para siempre el negocio, sus usuarios, citas, catálogo y configuración. <b>No se puede deshacer.</b></p>
            <Campo label={<>Escribe <b className="font-mono">{negocio.slug}</b> para confirmar</>}>
                <input value={texto} onChange={(e) => setTexto(e.target.value)} className={`${INPUT} mt-1`} autoFocus />
            </Campo>
            <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={onClose} disabled={enviando} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={borrar} disabled={!listo || enviando} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40">
                    {enviando ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Eliminar para siempre
                </button>
            </div>
        </Modal>
    );
}

/* ───────────────────────── Piezas ───────────────────────── */

const INPUT = "w-full !rounded-lg !border !border-slate-200 !bg-white !px-3 !py-2 !text-sm !text-slate-900 outline-none focus:!border-slate-400 focus:ring-2 focus:ring-slate-100";

function Campo({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
    return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}
function Numero({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
    return (
        <div className="min-w-0 bg-white px-4 py-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">{icon}{label}</span>
            <span className="mt-1 block truncate text-xl font-bold tabular-nums text-slate-900">{value}</span>
        </div>
    );
}
function Dato({ k, v, copiar }: { k: string; v: React.ReactNode; copiar?: string }) {
    const [ok, setOk] = useState(false);
    return (
        <div className="flex items-center justify-between gap-2">
            <dt className="text-slate-500">{k}</dt>
            <dd className="flex min-w-0 items-center gap-1 truncate text-right text-slate-800">{v}
                {copiar && <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(copiar); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* */ } }} className="text-slate-400 hover:text-slate-700" aria-label={`Copiar ${k}`}>{ok ? <CheckCircle2 size={13} /> : <Copy size={13} />}</button>}
            </dd>
        </div>
    );
}
function AccionTiempo({ titulo, detalle, onClick, busy }: { titulo: string; detalle: string; onClick: () => void; busy?: boolean }) {
    return (
        <button type="button" onClick={onClick} disabled={busy} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-slate-300 hover:bg-slate-50">
            <span><span className="block text-sm font-semibold text-slate-900">{titulo}</span><span className="text-xs text-slate-500">{detalle}</span></span>
            {busy ? <Loader2 size={15} className="animate-spin text-slate-400" /> : <Plus size={16} className="text-slate-400" />}
        </button>
    );
}
function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
    useEffect(() => {
        const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", k);
        return () => window.removeEventListener("keydown", k);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-[300] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={titulo}>
            <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-slate-900/50" />
            <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-slate-900">{titulo}</h3>
                    <button type="button" onClick={onClose} className="-mr-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar"><X size={18} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}
