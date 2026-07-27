'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Sparkles, Phone, ArrowRight, AlertCircle, Key, User, LogOut, PackageCheck, ShoppingBag, ShieldCheck, MapPin } from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';
import PinchoSuperLoader from './PinchoSuperLoader';

interface PinchoProfileViewProps {
    storeSlug: string;
    storeName: string;
    primaryColor?: string;
    onBackToStore: () => void;
    onViewOrders: () => void;
}

export default function PinchoProfileView({
    storeSlug,
    storeName,
    primaryColor = '#ea580c',
    onBackToStore,
    onViewOrders
}: PinchoProfileViewProps) {
    const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Read stored session on load
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedPhone = localStorage.getItem('pinchos_client_phone') || localStorage.getItem('user_phone') || '';
            const savedName = localStorage.getItem('pinchos_client_name') || localStorage.getItem('user_name') || '';
            if (savedPhone) {
                setPhone(savedPhone);
                setName(savedName || 'Cliente');
                setStep('profile');
            } else {
                setStep('phone');
            }
        }
    }, []);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 7) {
            setError('Por favor ingresa un número de teléfono válido.');
            return;
        }

        try {
            setLoading(true);

            // 1. Intentar endpoint principal de la tienda
            let sent = false;
            try {
                const res = await fetch(`/api/${storeSlug}/otp/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ telefono: cleanPhone })
                });
                const data = await res.json();
                if (data.success || res.ok) {
                    sent = true;
                }
            } catch (e) {
                console.warn('Error endpoint principal:', e);
            }

            // 2. Fallback
            if (!sent) {
                const res = await fetch('/api/public/auth/otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'send_otp',
                        phone: cleanPhone,
                        nombre: name || 'Cliente',
                        slug: storeSlug
                    })
                });
                const data = await res.json();
                if (data.success) sent = true;
                else setError(data.error || 'No se pudo enviar el código OTP.');
            }

            if (sent) {
                setStep('otp');
            }
        } catch (err) {
            setError('Error de conexión al enviar el código.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const cleanCode = otpCode.trim();
        if (cleanCode.length !== 6) {
            setError('Ingresa el código OTP de 6 dígitos.');
            return;
        }

        try {
            setLoading(true);
            const cleanPhone = phone.replace(/\D/g, '');
            let verified = false;

            try {
                const res = await fetch(`/api/${storeSlug}/otp/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ telefono: cleanPhone, code: cleanCode })
                });
                const data = await res.json();
                if (data.success || res.ok) verified = true;
            } catch (e) {
                console.warn('Verificación estándar falló:', e);
            }

            if (!verified) {
                const res = await fetch('/api/public/auth/otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'verify_otp',
                        phone: cleanPhone,
                        code: cleanCode,
                        slug: storeSlug
                    })
                });
                const data = await res.json();
                if (data.success) verified = true;
                else setError(data.error || 'Código OTP incorrecto o ha expirado.');
            }

            if (verified) {
                const finalName = name.trim() || 'Cliente';
                if (typeof window !== 'undefined') {
                    localStorage.setItem('pinchos_client_phone', cleanPhone);
                    localStorage.setItem('user_phone', cleanPhone);
                    localStorage.setItem('pinchos_client_name', finalName);
                    localStorage.setItem('user_name', finalName);
                }
                setName(finalName);
                setStep('profile');
            }
        } catch (err) {
            setError('Error al verificar el código OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        if (!confirm('¿Seguro que deseas cerrar sesión?')) return;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('pinchos_client_phone');
            localStorage.removeItem('user_phone');
            localStorage.removeItem('pinchos_client_name');
            localStorage.removeItem('user_name');
        }
        setPhone('');
        setName('');
        setOtpCode('');
        setStep('phone');
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-36 font-sans text-left">
            {/* Header Navbar */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBackToStore}
                        className="size-9 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                    >
                        <ChevronLeft className="size-5 text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-base font-black text-slate-900 leading-tight">Mi Perfil</h1>
                        <p className="text-[10px] text-slate-400 font-medium">Gestiona tu cuenta y preferencias</p>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto w-full px-4 pt-6">
                {/* ── UNAUTHENTICATED: PHONE ENTRY SCREEN (Exact screenshot layout) ── */}
                {step === 'phone' && (
                    <section className="flex flex-col items-center text-center space-y-6 pt-4">
                        <div className="space-y-1">
                            <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none text-slate-900">
                                HOLA,
                            </h2>
                            <p className="font-black italic tracking-widest text-[11px] uppercase text-slate-500">
                                IDENTIFÍCATE PARA VER TU PERFIL
                            </p>
                        </div>

                        <div className="w-full bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-slate-100 text-left">
                            <div className="flex items-center gap-3 mb-6 justify-center">
                                <div className="size-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-xs">
                                    <Sparkles className="size-5" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] italic text-orange-600">
                                    VERIFICACIÓN SEGURA
                                </span>
                            </div>

                            <form onSubmit={handleSendOtp} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1.5 ml-2">
                                        Tu Nombre (Opcional)
                                    </label>
                                    <div className="relative">
                                        <User className="size-4 text-slate-400 absolute left-3 top-3.5" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Ej: Poleth Caicedo"
                                            className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">
                                        NÚMERO MÓVIL (WHATSAPP)
                                    </label>
                                    <PhoneInput
                                        value={phone}
                                        onChange={setPhone}
                                        className="w-full"
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2.5 border border-rose-200/80">
                                        <AlertCircle className="size-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || phone.replace(/\D/g, '').length < 7}
                                    className="w-full h-15 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 hover:from-orange-700 hover:to-orange-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-orange-600/25 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                                >
                                    <span>CONTINUAR</span>
                                    <ArrowRight className="size-5" />
                                </button>
                            </form>
                        </div>
                    </section>
                )}

                {/* ── UNAUTHENTICATED: OTP ENTRY SCREEN ── */}
                {step === 'otp' && (
                    <section className="flex flex-col items-center text-center space-y-6 pt-4 animate-in fade-in duration-500">
                        <div className="w-full max-w-sm space-y-6 text-center">
                            <div className="space-y-3">
                                <div className="mx-auto size-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xl text-orange-600">
                                    <Key className="size-8 stroke-[2.5]" />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                                        CÓDIGO OTP
                                    </h2>
                                    <p className="text-slate-500 text-xs font-medium">
                                        Revisa tu WhatsApp <strong>{phone}</strong>
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleVerifyOtp} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                        Ingresa el Código de 6 dígitos
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        required
                                        autoFocus
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Ej: 123456"
                                        className="w-full text-center text-2xl font-mono font-black tracking-widest text-slate-900 bg-white border-2 border-orange-500 rounded-2xl p-4 shadow-md focus:outline-none"
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 border border-rose-200/80">
                                        <AlertCircle className="size-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <button
                                        type="submit"
                                        disabled={loading || otpCode.length !== 6}
                                        className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-orange-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        <span>VERIFICAR CÓDIGO</span>
                                        <ArrowRight className="size-5" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStep('phone')}
                                        className="w-full text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider py-2 cursor-pointer"
                                    >
                                        ← Cambiar Número
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>
                )}

                {/* ── AUTHENTICATED: PROFILE DASHBOARD SCREEN ── */}
                {step === 'profile' && (
                    <div className="space-y-5 animate-in fade-in duration-500">
                        {/* Profile Header Card */}
                        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex items-center gap-4">
                            <div className="size-16 rounded-2xl bg-orange-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-orange-600/30 shrink-0">
                                {name ? name.substring(0, 2).toUpperCase() : 'CL'}
                            </div>
                            <div className="space-y-1 overflow-hidden">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-md">
                                    <ShieldCheck className="size-3 text-emerald-600" />
                                    <span>Cliente Verificado</span>
                                </span>
                                <h2 className="text-xl font-black text-slate-900 truncate">{name || 'Cliente'}</h2>
                                <p className="text-xs text-slate-500 font-mono font-bold">{phone}</p>
                            </div>
                        </div>

                        {/* Quick Actions Card */}
                        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm space-y-3">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Acciones Rápidas</h3>
                            
                            <button
                                type="button"
                                onClick={onViewOrders}
                                className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/60 flex items-center justify-between text-left transition-all active:scale-[0.98] cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black">
                                        <PackageCheck className="size-5" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-black text-slate-900 block">Mis Pedidos e Historial</span>
                                        <span className="text-[11px] text-slate-500 font-medium">Revisa tus compras anteriores y rastrea tu pedido</span>
                                    </div>
                                </div>
                                <ArrowRight className="size-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <button
                                type="button"
                                onClick={onBackToStore}
                                className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/60 flex items-center justify-between text-left transition-all active:scale-[0.98] cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                                        <ShoppingBag className="size-5" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-black text-slate-900 block">Ir a la Tienda</span>
                                        <span className="text-[11px] text-slate-500 font-medium">Explora los pinchos frescos y combos</span>
                                    </div>
                                </div>
                                <ArrowRight className="size-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Logout Button */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full py-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
                            >
                                <LogOut className="size-4" />
                                <span>CERRAR SESIÓN</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <PinchoSuperLoader
                show={loading}
                title={step === 'phone' ? 'Enviando OTP...' : 'Verificando Código...'}
                subtitle="Un momento por favor..."
            />
        </div>
    );
}
