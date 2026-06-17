"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dribbble,
    Mail,
    Lock,
    User,
    Building2,
    MapPin,
    Phone,
    Loader2,
    ArrowRight,
    CheckCircle2,
    Sparkles
} from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import PhoneInput from "../ui/PhoneInput";

const ZendaLogo = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <rect x="3" y="5" width="18" height="15" rx="3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 9.5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 3V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 3V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 13.5L11.5 15.5L15 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 17.5H12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M7 16.5V18.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M9 16.5V18.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M11 16.5V18.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <circle cx="16.5" cy="17" r="1.5" stroke="currentColor" strokeWidth="1" />
        <path d="M16.5 16.2V17H17.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
);

export default function RegisterForm() {
    const [formData, setFormData] = useState({
        nombre: "",
        email: "",
        password: "",
        negocioNombre: "",
        ciudad: "",
        telefono: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al registrar el negocio");
            }

            setSuccess(true);

            // Iniciar sesión automáticamente
            const loginRes = await signIn("credentials", {
                email: formData.email,
                password: formData.password,
                redirect: false
            });

            if (loginRes?.error) {
                router.push("/login?registered=true");
            } else {
                router.push("/admin");
                router.refresh();
            }

        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 size={48} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">¡Registro Exitoso!</h2>
                <p className="text-gray-500 max-w-xs mx-auto">
                    Tu cuenta ha sido creada. Estamos preparándolo todo para que empieces a gestionar tu negocio.
                </p>
                <div className="flex items-center gap-3 text-violet-600 font-bold">
                    <Loader2 className="animate-spin" size={20} />
                    Redirigiendo al panel...
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-xl mx-auto">
            <div className="bg-white p-10 md:p-12 rounded-[2.5rem] shadow-2xl shadow-violet-900/5 border border-gray-100">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-200 mb-6">
                        <ZendaLogo size={36} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight text-center">
                        Crea tu cuenta gratis
                    </h2>
                    <p className="mt-2 text-sm text-gray-400 font-medium">
                        Comienza tu prueba de 15 días hoy mismo
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-rose-700 text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Información Personal */}
                        <div className="space-y-4 md:col-span-2">
                            <h3 className="text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] mb-2 px-1">Información Personal</h3>
                            <div className="group space-y-4">
                                <label className="group flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-2xl px-5 focus-within:bg-white focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all cursor-text">
                                    <User className="text-gray-400 group-focus-within:text-violet-600 transition-colors shrink-0" size={20} />
                                    <input
                                        type="text"
                                        name="nombre"
                                        required
                                        placeholder="Tu nombre completo"
                                        className="block w-full h-full py-4 !bg-transparent !border-none !shadow-none focus:outline-none focus:ring-0 !text-gray-900 placeholder-gray-400 font-bold"
                                        value={formData.nombre}
                                        onChange={handleChange}
                                    />
                                </label>
                                <label className="group flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-2xl px-5 focus-within:bg-white focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all cursor-text">
                                    <Mail className="text-gray-400 group-focus-within:text-violet-600 transition-colors shrink-0" size={20} />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        placeholder="correo@ejemplo.com"
                                        className="block w-full h-full py-4 !bg-transparent !border-none !shadow-none focus:outline-none focus:ring-0 !text-gray-900 placeholder-gray-400 font-bold"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </label>
                                <label className="group flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-2xl px-5 focus-within:bg-white focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all cursor-text">
                                    <Lock className="text-gray-400 group-focus-within:text-violet-600 transition-colors shrink-0" size={20} />
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        placeholder="Contraseña (mín. 6 caracteres)"
                                        className="block w-full h-full py-4 !bg-transparent !border-none !shadow-none focus:outline-none focus:ring-0 !text-gray-900 placeholder-gray-400 font-bold"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Información del Negocio */}
                        <div className="space-y-4 md:col-span-2 pt-4">
                            <h3 className="text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] mb-2 px-1">Detalles de tu Negocio</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative md:col-span-2">
                                    <label className="group flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-2xl px-5 focus-within:bg-white focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all cursor-text">
                                        <Building2 className="text-gray-400 group-focus-within:text-violet-600 transition-colors shrink-0" size={20} />
                                        <input
                                            type="text"
                                            name="negocioNombre"
                                            required
                                            placeholder="Nombre de tu Spa o Estética"
                                            className="block w-full h-full py-4 !bg-transparent !border-none !shadow-none focus:outline-none focus:ring-0 !text-gray-900 placeholder-gray-400 font-bold"
                                            value={formData.negocioNombre}
                                            onChange={handleChange}
                                        />
                                    </label>
                                </div>
                                <div className="relative md:col-span-2">
                                    <label className="group flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-2xl px-5 focus-within:bg-white focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all cursor-text">
                                        <MapPin className="text-gray-400 group-focus-within:text-violet-600 transition-colors shrink-0" size={20} />
                                        <input
                                            type="text"
                                            name="ciudad"
                                            required
                                            placeholder="Ciudad"
                                            className="block w-full h-full py-4 !bg-transparent !border-none !shadow-none focus:outline-none focus:ring-0 !text-gray-900 placeholder-gray-400 font-bold"
                                            value={formData.ciudad}
                                            onChange={handleChange}
                                        />
                                    </label>
                                </div>
                                <div className="md:col-span-2">
                                    <PhoneInput
                                        value={formData.telefono}
                                        onChange={(val) => setFormData({ ...formData, telefono: val })}
                                        placeholder="WhatsApp"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-gray-400 text-center font-medium px-4 leading-relaxed">
                        Al registrarte, aceptas nuestros <Link href="/terminos" className="text-violet-600 underline hover:text-violet-500">Términos de Servicio</Link> y <Link href="/privacidad" className="text-violet-600 underline hover:text-violet-500">Política de Privacidad</Link>.
                    </p>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-5 px-4 border border-transparent text-sm font-black rounded-2xl text-white bg-violet-600 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all shadow-xl shadow-violet-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <span className="flex items-center gap-2 uppercase tracking-widest text-xs">
                                Registrar mi negocio
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        )}
                    </button>

                    <div className="text-center pt-4">
                        <p className="text-sm text-gray-500 font-bold">
                            ¿Ya tienes cuenta?{' '}
                            <Link href="/login" className="text-violet-600 hover:text-violet-500 hover:underline">
                                Iniciar Sesión
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
