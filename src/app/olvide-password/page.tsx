'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, Phone, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

type Step = 'EMAIL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS';

export default function OlvidePasswordPage() {
    const [step, setStep] = useState<Step>('EMAIL');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [phoneMasked, setPhoneMasked] = useState('');

    const router = useRouter();

    const requestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/recuperar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'No se encontró una cuenta con ese correo');
                return;
            }
            setPhoneMasked(data.maskedPhone || '******');
            setStep('OTP');
        } catch {
            setError('Error de conexión. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const verifyOtpAndReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
        if (newPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Código inválido o expirado'); return; }
            setStep('SUCCESS');
        } catch {
            setError('Error al restablecer la contraseña');
        } finally {
            setLoading(false);
        }
    };

    const stepMeta = {
        EMAIL:        { icon: <ShieldCheck size={32} className="animate-pulse" />, title: 'Recuperar', accent: 'Acceso' },
        OTP:          { icon: <Phone size={32} />,        title: 'Verifica', accent: 'tu identidad' },
        NEW_PASSWORD: { icon: <Lock size={32} />,         title: 'Nueva', accent: 'Contraseña' },
        SUCCESS:      { icon: <CheckCircle2 size={32} />, title: '¡Contraseña', accent: 'Actualizada!' },
    };

    const current = stepMeta[step];

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
            {/* Barra gradient top */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-sky-400 to-purple-600" />

            {/* Destellos fondo */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-50 rounded-full blur-3xl -mr-40 -mt-40 opacity-70" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -ml-32 -mb-32 opacity-70" />

            <div className="relative z-10 w-full max-w-sm space-y-6">

                {/* Logo + Nombre */}
                <div className="flex flex-col items-center gap-3 pt-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-[1.8rem] blur-xl opacity-30 scale-110" />
                        <div className="relative w-20 h-20 bg-white rounded-[1.8rem] shadow-xl shadow-cyan-100 border border-slate-100 flex items-center justify-center p-2.5 overflow-hidden">
                            <img src="/logo-citiox.png" alt="CitiOx Logo" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 bg-clip-text text-transparent italic leading-none">CitiOx</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-0.5">Recuperación de Acceso</p>
                    </div>
                </div>

                {/* Card del formulario */}
                <div className="bg-slate-50 rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">

                    {/* Icono del paso */}
                    <div className="flex flex-col items-center gap-2 text-center">
                        <div className="size-14 bg-gradient-to-br from-cyan-500 to-purple-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-cyan-500/25">
                            {current.icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">
                                {current.title} <span className="bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent">{current.accent}</span>
                            </h2>
                            <p className="text-xs text-slate-400 font-medium mt-1 max-w-xs mx-auto leading-relaxed">
                                {step === 'EMAIL' && 'Ingresa tu correo y te enviamos un código por WhatsApp'}
                                {step === 'OTP' && <>Código enviado al número terminado en <strong className="text-cyan-500">{phoneMasked}</strong></>}
                                {step === 'NEW_PASSWORD' && 'Crea una contraseña segura que puedas recordar.'}
                                {step === 'SUCCESS' && 'Ya puedes iniciar sesión con tu nueva contraseña.'}
                            </p>
                        </div>
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

                    {/* PASO EMAIL */}
                    {step === 'EMAIL' && (
                        <form className="space-y-4" onSubmit={requestOtp}>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Email registrado</label>
                                <div className="flex items-center w-full bg-white border-2 border-slate-200 overflow-hidden rounded-2xl focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-500/10 transition-all group shadow-sm">
                                    <div className="pl-4 pr-2 text-slate-300 group-focus-within:text-cyan-500 transition-colors"><Mail size={17} /></div>
                                    <input type="email" required className="w-full py-3.5 pr-4 bg-transparent text-slate-800 font-semibold text-sm placeholder-slate-300 focus:outline-none" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-cyan-500/25 active:scale-[0.98] disabled:opacity-70">
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <><span>Enviar código PIN</span><ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                            <div className="text-center">
                                <Link href="/login" className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-cyan-500 transition-colors">Cancelar y volver al Login</Link>
                            </div>
                        </form>
                    )}

                    {/* PASO OTP + NUEVA CONTRASEÑA */}
                    {(step === 'OTP' || step === 'NEW_PASSWORD') && (
                        <form className="space-y-4" onSubmit={verifyOtpAndReset}>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Código PIN (6 dígitos)</label>
                                <div className="flex items-center w-full bg-white border-2 border-slate-200 overflow-hidden rounded-2xl focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-500/10 transition-all group shadow-sm">
                                    <div className="pl-4 pr-2 text-slate-300 group-focus-within:text-cyan-500 transition-colors"><ShieldCheck size={17} /></div>
                                    <input type="text" required maxLength={6} className="w-full py-3.5 pr-4 bg-transparent text-slate-800 font-black tracking-[0.5em] text-lg placeholder-slate-300 focus:outline-none" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Nueva Contraseña</label>
                                <div className="flex items-center w-full bg-white border-2 border-slate-200 overflow-hidden rounded-2xl focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-500/10 transition-all group shadow-sm">
                                    <div className="pl-4 pr-2 text-slate-300 group-focus-within:text-cyan-500 transition-colors"><Lock size={17} /></div>
                                    <input type="password" required className="w-full py-3.5 pr-4 bg-transparent text-slate-800 font-semibold text-sm placeholder-slate-300 focus:outline-none" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Confirmar Contraseña</label>
                                <div className="flex items-center w-full bg-white border-2 border-slate-200 overflow-hidden rounded-2xl focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-500/10 transition-all group shadow-sm">
                                    <div className="pl-4 pr-2 text-slate-300 group-focus-within:text-cyan-500 transition-colors"><Lock size={17} /></div>
                                    <input type="password" required className="w-full py-3.5 pr-4 bg-transparent text-slate-800 font-semibold text-sm placeholder-slate-300 focus:outline-none" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                </div>
                            </div>
                            <button type="submit" disabled={loading || otp.length !== 6 || !newPassword || !confirmPassword} className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-cyan-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <><span>Guardar y Entrar</span><Lock size={18} /></>}
                            </button>
                        </form>
                    )}

                    {/* PASO SUCCESS */}
                    {step === 'SUCCESS' && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="size-20 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-200 rounded-full flex items-center justify-center text-cyan-500 animate-in zoom-in duration-500">
                                <CheckCircle2 size={40} />
                            </div>
                            <Link href="/login" className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-cyan-500/25 active:scale-[0.98]">
                                Iniciar Sesión Ahora
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    )}
                </div>

                <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    © 2026 CitiOx • Booking & App Solutions
                </p>
            </div>
        </div>
    );
}
