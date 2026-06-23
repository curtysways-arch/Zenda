'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, ArrowRight, Sparkles, Zap, BarChart3, Smartphone } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError('Credenciales inválidas. Verifica tu email y contraseña.');
            } else {
                router.push('/admin');
            }
        } catch {
            setError('Ocurrió un error inesperado. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex overflow-hidden bg-slate-950">

            {/* ── PANEL IZQUIERDO: Branding (solo desktop) ── */}
            <div className="hidden lg:flex flex-col justify-between w-[55%] relative p-14 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-cyan-950/60 to-purple-950/80" />
                <div className="absolute top-0 left-0 w-full h-full">
                    <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
                />

                <div className="relative z-10 flex items-center gap-4">
                    <img src="/logo-citiox.png" alt="CitiOx" className="h-12 w-auto object-contain" />
                    <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 bg-clip-text text-transparent italic">CitiOx</span>
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                        <Sparkles size={14} className="text-cyan-400" fill="currentColor" />
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">Panel Administrativo</span>
                    </div>
                    <h1 className="text-5xl xl:text-6xl font-black text-white tracking-tighter leading-[0.9] italic">
                        Gestiona tu<br />negocio <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent not-italic">sin límites.</span>
                    </h1>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-md">
                        Controla citas, staff, ingresos y clientes desde un solo lugar. Automatizado y siempre disponible.
                    </p>
                    <div className="flex flex-col gap-4 pt-4">
                        {[
                            { icon: <Zap size={16} className="text-cyan-400" />, text: 'Reservas automáticas por WhatsApp' },
                            { icon: <BarChart3 size={16} className="text-purple-400" />, text: 'Reportes y métricas en tiempo real' },
                            { icon: <Smartphone size={16} className="text-sky-400" />, text: 'App instalable en tu móvil (PWA)' },
                        ].map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="size-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0">{f.icon}</div>
                                <span className="text-sm font-bold text-slate-300">{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">© 2026 CitiOx • Booking & App Solutions</p>
                </div>
            </div>

            {/* ── PANEL DERECHO: Formulario ── */}
            <div className="flex-1 flex items-center justify-center bg-white relative overflow-y-auto">

                {/* Acento gradient superior */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-sky-400 to-purple-600" />

                {/* Destellos de fondo muy sutiles */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-50 rounded-full blur-3xl -mr-40 -mt-40 opacity-70" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -ml-32 -mb-32 opacity-70" />

                <div className="relative z-10 w-full max-w-sm px-6 pt-4 pb-8 space-y-5">

                    {/* ── LOGO GRANDE Y NOMBRE ── */}
                    <div className="flex flex-col items-center gap-3">
                        {/* Logo en círculo con glow */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-[2rem] blur-xl opacity-30 scale-110" />
                            <div className="relative w-28 h-28 bg-white rounded-[2rem] shadow-2xl shadow-cyan-100 border border-slate-100 flex items-center justify-center p-3 overflow-hidden">
                                <img
                                    src="/logo-citiox.png"
                                    alt="CitiOx Logo"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </div>

                        {/* Nombre grande */}
                        <div className="text-center space-y-1">
                            <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 bg-clip-text text-transparent italic leading-none">
                                CitiOx
                            </h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.35em]">
                                Panel Administrativo
                            </p>
                        </div>
                    </div>

                    {/* ── FORMULARIO ── */}
                    <div className="bg-slate-50 rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">

                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Bienvenido de vuelta</h2>
                            <p className="text-xs text-slate-400 font-medium">Ingresa tus credenciales para continuar</p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 p-3.5 rounded-2xl">
                                <div className="size-5 shrink-0 mt-0.5 bg-rose-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-[10px] font-black">!</span>
                                </div>
                                <p className="text-rose-700 text-xs font-semibold leading-tight">{error}</p>
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                    Correo electrónico
                                </label>
                                <div className="flex items-center w-full bg-white border-2 border-slate-200 overflow-hidden rounded-2xl focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-500/10 transition-all group shadow-sm">
                                    <div className="pl-4 pr-2 flex items-center text-slate-300 group-focus-within:text-cyan-500 transition-colors shrink-0">
                                        <Mail size={17} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        autoComplete="email"
                                        className="w-full py-3.5 pr-4 bg-transparent text-slate-800 font-semibold text-sm placeholder-slate-300 focus:outline-none"
                                        placeholder="tu@correo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Contraseña */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                    Contraseña
                                </label>
                                <div className="flex items-center w-full bg-white border-2 border-slate-200 overflow-hidden rounded-2xl focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-500/10 transition-all group shadow-sm">
                                    <div className="pl-4 pr-2 flex items-center text-slate-300 group-focus-within:text-cyan-500 transition-colors shrink-0">
                                        <Lock size={17} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        autoComplete="current-password"
                                        className="w-full py-3.5 pr-4 bg-transparent text-slate-800 font-semibold text-sm placeholder-slate-300 focus:outline-none"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Recordarme y olvidé contraseña */}
                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 group cursor-pointer">
                                    <div className="relative flex items-center justify-center shrink-0">
                                        <input
                                            id="remember_me"
                                            type="checkbox"
                                            className="peer h-4 w-4 appearance-none rounded-md border-2 border-slate-300 bg-white checked:bg-cyan-500 checked:border-cyan-500 transition-all cursor-pointer"
                                        />
                                        <svg className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recordarme</span>
                                </label>
                                <Link href="/olvide-password" className="text-[10px] font-black uppercase tracking-wider text-cyan-500 hover:text-purple-600 transition-colors">
                                    ¿Olvidaste la clave?
                                </Link>
                            </div>

                            {/* Botón */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-cyan-500/30 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-1"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        Iniciar Sesión
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Links inferiores */}
                    <div className="space-y-4 text-center">
                        <p className="text-sm text-slate-500 font-medium">
                            ¿No tienes cuenta?{' '}
                            <Link href="/register" className="font-black text-slate-900 hover:text-cyan-500 transition-colors underline underline-offset-2 decoration-slate-200 hover:decoration-cyan-300">
                                Registra tu negocio gratis
                            </Link>
                        </p>
                        <Link href="/" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-500 transition-colors">
                            ← Volver a citiox.com
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
