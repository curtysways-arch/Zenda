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
        } catch (err) {
            setError('Error de conexión. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const verifyOtpAndReset = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Código inválido o expirado');
                return;
            }

            setStep('SUCCESS');
        } catch (err) {
            setError('Error al restablecer la contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Elementos decorativos de fondo */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse" />

            <div className="max-w-md w-full space-y-8 bg-white/70 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl shadow-pink-200/40 border border-white/50 relative z-10">
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-pink-200 mb-6 group hover:rotate-6 transition-transform duration-500">
                        {step === 'EMAIL' && <ShieldCheck size={40} className="animate-pulse" />}
                        {step === 'OTP' && <Phone size={36} />}
                        {(step === 'NEW_PASSWORD' || step === 'SUCCESS') && <Lock size={36} />}
                    </div>
                    
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase italic">
                        {step === 'EMAIL' && <>Recuperar <span className="text-pink-600">Acceso</span></>}
                        {step === 'OTP' && <>Verifica <span className="text-pink-600">tu identidad</span></>}
                        {step === 'NEW_PASSWORD' && <>Nueva <span className="text-pink-600">Contraseña</span></>}
                        {step === 'SUCCESS' && <>¡Contraseña <span className="text-pink-600">Actualizada!</span></>}
                    </h2>
                    
                    <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                        {step === 'EMAIL' && 'Ingresa tu correo electrónico y te enviaremos un código por WhatsApp'}
                        {step === 'OTP' && (
                            <span>
                                Hemos enviado un código PIN por WhatsApp a tu celular registrado terminado en <strong className="text-pink-600">{phoneMasked}</strong>
                            </span>
                        )}
                        {step === 'NEW_PASSWORD' && 'Crea una contraseña segura que puedas recordar fácilmente.'}
                        {step === 'SUCCESS' && 'Ya puedes iniciar sesión con tu nueva credencial.'}
                    </p>
                </div>

                {error && (
                    <div className="bg-rose-50 border-l-4 border-rose-500 p-4 text-rose-700 text-xs font-bold uppercase tracking-tight animate-shake rounded-r-xl">
                        {error}
                    </div>
                )}

                {step === 'EMAIL' && (
                    <form className="mt-8 space-y-6" onSubmit={requestOtp}>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Email registrado</label>
                            <div className="flex items-center w-full border border-gray-100 overflow-hidden rounded-2xl focus-within:ring-2 focus-within:ring-pink-500 focus-within:border-transparent transition-all bg-white/50 group">
                                <div className="pl-5 pr-3 flex items-center justify-center text-gray-400 group-focus-within:text-pink-600 transition-colors">
                                    <Mail size={20} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="w-full py-4 pr-5 bg-transparent !text-gray-900 font-bold text-sm placeholder-gray-300 focus:outline-none"
                                    placeholder="TU@EMAIL.COM"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-5 px-4 border border-transparent text-xs font-black uppercase tracking-[0.2em] rounded-2xl text-white bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-700 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all shadow-xl shadow-pink-200 active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <span className="flex items-center gap-3">
                                    Enviar código PIN
                                    <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                                </span>
                            )}
                        </button>

                        <div className="text-center mt-6">
                            <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-pink-600 transition-colors">
                                Cancelar y volver al Login
                            </Link>
                        </div>
                    </form>
                )}

                {(step === 'OTP' || step === 'NEW_PASSWORD') && (
                    <form className="mt-8 space-y-6" onSubmit={verifyOtpAndReset}>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Código PIN (6 dígitos)</label>
                            <div className="flex items-center w-full border border-gray-100 overflow-hidden rounded-2xl focus-within:ring-2 focus-within:ring-pink-500 focus-within:border-transparent transition-all bg-white/50 group">
                                <div className="pl-5 pr-3 flex items-center justify-center text-gray-400 group-focus-within:text-pink-600 transition-colors">
                                    <ShieldCheck size={20} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    className="w-full py-4 pr-5 bg-transparent !text-gray-900 font-black tracking-[0.5em] text-lg placeholder-gray-300 focus:outline-none"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Nueva Contraseña</label>
                            <div className="flex items-center w-full border border-gray-100 overflow-hidden rounded-2xl focus-within:ring-2 focus-within:ring-pink-500 focus-within:border-transparent transition-all bg-white/50 group">
                                <div className="pl-5 pr-3 flex items-center justify-center text-gray-400 group-focus-within:text-pink-600 transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="w-full py-4 pr-5 bg-transparent !text-gray-900 font-bold text-sm placeholder-gray-300 focus:outline-none"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Confirmar Contraseña</label>
                            <div className="flex items-center w-full border border-gray-100 overflow-hidden rounded-2xl focus-within:ring-2 focus-within:ring-pink-500 focus-within:border-transparent transition-all bg-white/50 group">
                                <div className="pl-5 pr-3 flex items-center justify-center text-gray-400 group-focus-within:text-pink-600 transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="w-full py-4 pr-5 bg-transparent !text-gray-900 font-bold text-sm placeholder-gray-300 focus:outline-none"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.length !== 6 || !newPassword || !confirmPassword}
                            className="group relative w-full flex justify-center py-5 px-4 border border-transparent text-xs font-black uppercase tracking-[0.2em] rounded-2xl text-white bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-700 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all shadow-xl shadow-pink-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <span className="flex items-center gap-3">
                                    Guardar y Entrar
                                    <Lock size={18} className="group-hover:scale-110 transition-transform" />
                                </span>
                            )}
                        </button>
                    </form>
                )}

                {step === 'SUCCESS' && (
                    <div className="mt-8 space-y-6 flex flex-col items-center">
                        <div className="size-24 bg-pink-50 rounded-full flex items-center justify-center text-pink-600 mb-4 animate-in zoom-in duration-500 shadow-inner">
                            <CheckCircle2 size={48} />
                        </div>
                        
                        <Link
                            href="/login"
                            className="group relative w-full flex justify-center py-5 px-4 border border-transparent text-xs font-black uppercase tracking-[0.2em] rounded-2xl text-white bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-700 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all shadow-xl shadow-pink-200 active:scale-[0.98]"
                        >
                            <span className="flex items-center gap-3">
                                Iniciar Sesión Ahora
                                <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                            </span>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
