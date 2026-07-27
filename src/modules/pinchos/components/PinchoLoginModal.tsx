'use client';

import React, { useState } from 'react';
import { X, User, Phone, KeyRound, Loader2, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import PinchoSuperLoader from './PinchoSuperLoader';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeSlug: string;
    onLoginSuccess: (name: string, phone: string) => void;
    initialName?: string;
    initialPhone?: string;
}

export default function PinchoLoginModal({
    isOpen,
    onClose,
    storeSlug,
    onLoginSuccess,
    initialName = '',
    initialPhone = ''
}: LoginModalProps) {
    const [name, setName] = useState(initialName);
    const [phone, setPhone] = useState(initialPhone);
    const [step, setStep] = useState<'info' | 'verify'>('info');
    const [otpCode, setOtpCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) {
            setMessage('Por favor ingresa tu nombre y número de WhatsApp.');
            return;
        }

        try {
            setSubmitting(true);
            setMessage(null);

            // 1. Intentar con el endpoint estándar (/api/[slug]/otp/send)
            let sent = false;
            try {
                const res = await fetch(`/api/${storeSlug}/otp/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ telefono: phone.trim() })
                });
                const data = await res.json();
                if (data.success) {
                    sent = true;
                    setStep('verify');
                    setMessage(data.message || 'Código de 6 dígitos enviado a tu WhatsApp.');
                }
            } catch (err) {
                console.warn('Error en endpoint principal OTP:', err);
            }

            // 2. Fallback
            if (!sent) {
                const res = await fetch('/api/public/auth/otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'send_otp',
                        phone: phone.trim(),
                        nombre: name.trim(),
                        slug: storeSlug
                    })
                });
                const data = await res.json();
                if (data.success) {
                    setStep('verify');
                    setMessage(data.message || 'Código OTP de 6 dígitos enviado por WhatsApp.');
                } else {
                    setMessage(data.error || 'No se pudo enviar el código OTP.');
                }
            }
        } catch (err) {
            setMessage('Error de conexión al solicitar el código.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otpCode || otpCode.trim().length !== 6) {
            setMessage('Ingresa el código OTP de 6 dígitos.');
            return;
        }

        const cleanCode = otpCode.trim();

        try {
            setSubmitting(true);
            setMessage(null);

            let verified = false;

            try {
                const res = await fetch(`/api/${storeSlug}/otp/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        telefono: phone.trim(),
                        code: cleanCode
                    })
                });
                const data = await res.json();
                if (data.success) verified = true;
            } catch (err) {
                console.warn('Verificación estándar falló:', err);
            }

            if (!verified) {
                const res = await fetch('/api/public/auth/otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'verify_otp',
                        phone: phone.trim(),
                        code: cleanCode,
                        slug: storeSlug
                    })
                });
                const data = await res.json();
                if (data.success) verified = true;
                else setMessage(data.error || 'El código es incorrecto o ha expirado.');
            }

            if (verified) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('pinchos_client_phone', phone.trim());
                    localStorage.setItem('user_phone', phone.trim());
                    localStorage.setItem('pinchos_client_name', name.trim());
                    localStorage.setItem('user_name', name.trim());
                }
                onLoginSuccess(name.trim(), phone.trim());
                onClose();
            }
        } catch (err) {
            setMessage('Error al validar el código OTP.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[600] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans">
            {/* Backdrop Click */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Modal Box */}
            <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 z-10 space-y-4 text-left border border-slate-200 animate-scale-up my-auto">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 size-8 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full flex items-center justify-center transition-all cursor-pointer"
                >
                    <X className="size-4" />
                </button>

                {step === 'info' ? (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                            <span className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Phone className="size-4 text-orange-600" />
                                <span>Iniciar Sesión</span>
                            </span>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Ingresa tu número de WhatsApp para acceder a tu historial de pedidos.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                                    Número de WhatsApp *
                                </label>
                                <div className="relative">
                                    <Phone className="size-4 text-slate-400 absolute left-3 top-3.5" />
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        required
                                        autoFocus
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Ej: 0991234567"
                                        className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-orange-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {message && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Enviando código OTP...
                                </>
                            ) : (
                                <>
                                    <span>ENVIAR CÓDIGO POR WHATSAPP</span>
                                    <ArrowRight className="size-4" />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                            <span className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <KeyRound className="size-4 text-orange-600" />
                                <span>Verificación OTP</span>
                            </span>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Código de 6 dígitos enviado a <strong>{phone}</strong>.
                            </p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                                Código OTP de 6 dígitos *
                            </label>
                            <input
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                required
                                autoFocus
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="123456"
                                className="w-full text-center text-2xl font-mono font-black tracking-[0.4em] text-slate-900 bg-slate-50 border-2 border-orange-400 rounded-xl p-4 focus:outline-none focus:border-orange-600"
                            />
                        </div>

                        {message && (
                            <div className="p-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl text-xs font-bold">
                                {message}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setStep('info')}
                                className="w-1/3 py-3 bg-slate-100 text-slate-700 font-black rounded-xl text-xs uppercase cursor-pointer"
                            >
                                Reintentar
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-2/3 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer"
                            >
                                {submitting ? <Loader2 className="size-4 animate-spin" /> : 'INGRESAR'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <PinchoSuperLoader
                show={submitting}
                title={step === 'info' ? 'Enviando Código OTP...' : 'Verificando Código...'}
                subtitle="Iniciando sesión segura..."
            />
        </div>
    );
}
