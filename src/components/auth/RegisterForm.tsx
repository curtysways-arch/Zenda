"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Loader2, ArrowRight, ArrowLeft, Check, Eye, EyeOff, Flower2, Scissors, Smile,
    CalendarCheck, Dumbbell, Trophy, UtensilsCrossed, ShoppingBag, Shirt, Link2,
} from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import PhoneInput from "../ui/PhoneInput";

interface BusinessTypeOption {
    id: string;
    title: string;
    desc: string;
    icon: React.ElementType;
    color: string;
    placeholder: string;
}

const BUSINESS_TYPES: BusinessTypeOption[] = [
    { id: "SPA", title: "Spa y estética", desc: "Masajes, faciales, uñas", icon: Flower2, color: "#db2777", placeholder: "Ej: Aura Spa" },
    { id: "BARBERIA", title: "Barbería y salón", desc: "Cortes, color, peinados", icon: Scissors, color: "#0284c7", placeholder: "Ej: Barbería Don Tito" },
    { id: "ODONTOLOGIA", title: "Clínica dental", desc: "Pacientes y tratamientos", icon: Smile, color: "#0d9488", placeholder: "Ej: Clínica Dental Sonrisas" },
    { id: "SERVICIOS", title: "Citas y servicios", desc: "Consultorios, talleres, asesorías", icon: CalendarCheck, color: "#2563eb", placeholder: "Ej: Estudio Contable Ruiz" },
    { id: "GIMNASIO", title: "Gimnasio", desc: "Membresías, clases, accesos", icon: Dumbbell, color: "#ea580c", placeholder: "Ej: Titan Gym" },
    { id: "CANCHAS", title: "Canchas deportivas", desc: "Fútbol, pádel, alquiler por hora", icon: Trophy, color: "#059669", placeholder: "Ej: Pádel Point" },
    { id: "RESTAURANTE", title: "Restaurante o café", desc: "Menú QR, pedidos y delivery", icon: UtensilsCrossed, color: "#c2410c", placeholder: "Ej: Burger House" },
    { id: "TIENDA", title: "Tienda", desc: "Catálogo, carrito y pagos", icon: ShoppingBag, color: "#4f46e5", placeholder: "Ej: Moda Urbana" },
    { id: "LAVANDERIA", title: "Lavandería y calzado", desc: "Órdenes y estado en tiempo real", icon: Shirt, color: "#7c3aed", placeholder: "Ej: Clean Express" },
];

function normalizeInitialTipo(raw: string | null): string | null {
    if (!raw) return null;
    const t = raw.toUpperCase().trim();
    if (["SPA", "CENTRO_ESTETICA", "ESTETICA", "BELLEZA"].includes(t)) return "SPA";
    if (["BARBERIA", "PELUQUERIA", "SALON"].includes(t)) return "BARBERIA";
    if (["LAVANDERIA", "LAVADO", "SHOE_CARE", "LAUNDRY"].includes(t)) return "LAVANDERIA";
    if (["ODONTOLOGIA", "DENTISTA", "DENTAL", "CLINICA"].includes(t)) return "ODONTOLOGIA";
    if (["RESTAURANTE", "GASTRONOMIA", "BAR", "COMIDA", "CAFETERIA"].includes(t)) return "RESTAURANTE";
    if (["TIENDA", "ECOMMERCE", "PRODUCTOS", "RETAIL"].includes(t)) return "TIENDA";
    if (["CANCHAS", "SPORTS_COURTS", "PADEL", "FUTBOL"].includes(t)) return "CANCHAS";
    if (["GIMNASIO", "GYM", "FITNESS"].includes(t)) return "GIMNASIO";
    if (["SERVICIOS", "RESERVA", "GENERAL"].includes(t)) return "SERVICIOS";
    return null;
}

function slugify(s: string) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()
        .replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");
}

const inputCls = "w-full !px-3 !py-2.5 !text-sm !rounded-lg !border !border-slate-200 !bg-white text-slate-900 placeholder:text-slate-400 focus:!border-slate-900 outline-none";

export default function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedPlanId = searchParams.get("plan");
    const initialTipo = useMemo(() => normalizeInitialTipo(searchParams.get("tipo") || searchParams.get("businessType")), [searchParams]);

    const [step, setStep] = useState<1 | 2>(1);
    const [tipo, setTipo] = useState<string | null>(initialTipo);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({ nombre: "", email: "", password: "", negocioNombre: "", ciudad: "", telefono: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const tipoObj = BUSINESS_TYPES.find((b) => b.id === tipo) || null;
    const slug = slugify(form.negocioNombre);
    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

    const goStep2 = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!tipo) return setError("Elige qué tipo de negocio tienes.");
        if (form.negocioNombre.trim().length < 2) return setError("Escribe el nombre de tu negocio.");
        if (!form.ciudad.trim()) return setError("Escribe tu ciudad.");
        setStep(2);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (form.nombre.trim().length < 2) return setError("Escribe tu nombre.");
        if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Revisa tu correo electrónico.");
        if (form.password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");

        setLoading(true);
        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, email: form.email.trim().toLowerCase(), planId: selectedPlanId, tipoNegocio: tipo }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "No pudimos crear tu negocio");

            setSuccess(true);
            const login = await signIn("credentials", { email: form.email.trim().toLowerCase(), password: form.password, redirect: false });
            if (login?.error) router.push("/login?registered=true");
            else { router.push("/admin/onboarding"); router.refresh(); }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="py-16 text-center">
                <div className="size-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check size={28} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-4">¡Listo, {form.nombre.split(" ")[0]}!</h2>
                <p className="text-sm text-slate-500 mt-1">Creamos <strong className="text-slate-800">{form.negocioNombre}</strong>. Ahora armemos tu página en unos minutos…</p>
                <Loader2 className="animate-spin mx-auto mt-5 text-slate-400" size={20} />
            </div>
        );
    }

    return (
        <div>
            {/* Progreso */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-4">
                <StepDot n={1} active={step === 1} done={step === 2} label="Tu negocio" />
                <span className="h-px w-6 bg-slate-200" />
                <StepDot n={2} active={step === 2} done={false} label="Tu cuenta" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {step === 1 ? "Crea tu negocio en Citiox" : "Crea tu acceso"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
                {step === 1 ? "Elige tu tipo de negocio y preparamos todo para tu rubro." : `Con esto entrarás al panel de ${form.negocioNombre || "tu negocio"} desde cualquier dispositivo.`}
            </p>

            {error && (
                <div role="alert" className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">{error}</div>
            )}

            {step === 1 ? (
                <form onSubmit={goStep2} className="mt-5 space-y-5" noValidate>
                    <fieldset>
                        <legend className="text-sm font-semibold text-slate-900 mb-2">¿Qué tipo de negocio tienes?</legend>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {BUSINESS_TYPES.map((bt) => {
                                const active = tipo === bt.id;
                                const Icon = bt.icon;
                                return (
                                    <button
                                        key={bt.id}
                                        type="button"
                                        onClick={() => { setTipo(bt.id); setError(null); }}
                                        aria-pressed={active}
                                        className={`relative text-left p-2.5 rounded-lg border transition ${active ? "border-slate-900 ring-1 ring-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span className="size-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${bt.color}14`, color: bt.color }}>
                                                <Icon size={15} />
                                            </span>
                                            <span className="text-sm font-semibold text-slate-900 leading-tight">{bt.title}</span>
                                        </span>
                                        <span className="block text-xs text-slate-500 mt-1 leading-snug">{bt.desc}</span>
                                        {active && <span className="absolute top-2 right-2 size-4 rounded-full bg-slate-900 text-white flex items-center justify-center"><Check size={10} /></span>}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>

                    <div className="grid sm:grid-cols-2 gap-3">
                        <label className="block">
                            <span className="text-sm font-medium text-slate-700">Nombre del negocio</span>
                            <input name="negocioNombre" value={form.negocioNombre} onChange={set("negocioNombre")} placeholder={tipoObj?.placeholder || "Ej: Aura Spa"} className={`mt-1 ${inputCls}`} autoComplete="organization" />
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium text-slate-700">Ciudad</span>
                            <input name="ciudad" value={form.ciudad} onChange={set("ciudad")} placeholder="Ej: Quito" className={`mt-1 ${inputCls}`} autoComplete="address-level2" />
                        </label>
                    </div>

                    {slug && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-500 -mt-2">
                            <Link2 size={13} /> Tu página será <span className="font-medium text-slate-800">citiox.com/{slug}</span>
                        </p>
                    )}

                    <button type="submit" className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold">
                        Continuar <ArrowRight size={16} />
                    </button>
                </form>
            ) : (
                <form onSubmit={submit} className="mt-5 space-y-3.5" noValidate>
                    <label className="block">
                        <span className="text-sm font-medium text-slate-700">Tu nombre</span>
                        <input name="nombre" value={form.nombre} onChange={set("nombre")} placeholder="Ej: Ana Valenzuela" className={`mt-1 ${inputCls}`} autoComplete="name" autoFocus />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium text-slate-700">Correo electrónico</span>
                        <input name="email" type="email" value={form.email} onChange={set("email")} placeholder="tu@correo.com" className={`mt-1 ${inputCls}`} autoComplete="email" />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium text-slate-700">Contraseña</span>
                        <span className="relative block mt-1">
                            <input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="Mínimo 6 caracteres" className={`${inputCls} !pr-10`} autoComplete="new-password" />
                            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </span>
                        {form.password.length > 0 && form.password.length < 6 && <span className="text-xs text-amber-700 mt-1 block">Te faltan {6 - form.password.length} caracteres.</span>}
                    </label>
                    <div>
                        <span className="text-sm font-medium text-slate-700">WhatsApp del negocio <span className="text-slate-400 font-normal">(recomendado)</span></span>
                        <div className="mt-1">
                            <PhoneInput value={form.telefono} onChange={(val) => setForm((p) => ({ ...p, telefono: val }))} placeholder="Número de WhatsApp" />
                        </div>
                        <span className="text-xs text-slate-500 mt-1 block">Aquí te avisamos cada nueva reserva.</span>
                    </div>

                    <p className="text-xs text-slate-500">
                        Al crear tu cuenta aceptas los <Link href="/terminos" className="underline hover:text-slate-800">Términos</Link> y la <Link href="/privacidad" className="underline hover:text-slate-800">Política de privacidad</Link>.
                    </p>

                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => { setStep(1); setError(null); }} className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            <ArrowLeft size={15} /> Atrás
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-60">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                            {loading ? "Creando tu negocio…" : "Crear mi negocio"}
                        </button>
                    </div>
                </form>
            )}

            <p className="text-sm text-slate-500 text-center mt-6">
                ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-slate-900 hover:underline">Inicia sesión</Link>
            </p>
        </div>
    );
}

function StepDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
    return (
        <span className={`inline-flex items-center gap-1.5 ${active ? "text-slate-900" : ""}`}>
            <span className={`size-5 rounded-full flex items-center justify-center text-[11px] font-semibold ${done ? "bg-emerald-500 text-white" : active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
                {done ? <Check size={11} /> : n}
            </span>
            {label}
        </span>
    );
}
