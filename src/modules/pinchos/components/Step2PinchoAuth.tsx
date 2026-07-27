import React, { useState, useEffect } from 'react';
import { User, Phone, KeyRound, Loader2, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

interface Step2Props {
    clientName: string;
    setClientName: (val: string) => void;
    clientPhone: string;
    setClientPhone: (val: string) => void;
    onAuthenticated: (name: string, phone: string) => void;
    storeSlug: string;
}

export default function Step2PinchoAuth({
    clientName,
    setClientName,
    clientPhone,
    setClientPhone,
    onAuthenticated,
    storeSlug
}: Step2Props) {
    const [submitting, setSubmitting] = useState(false);
    const [otpStep, setOtpStep] = useState<'info' | 'verify'>('info');
    const [otpCode, setOtpCode] = useState('');
    const [otpMessage, setOtpMessage] = useState<string | null>(null);

    // Auto-skip if authenticated
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedPhone = localStorage.getItem('pinchos_client_phone') || localStorage.getItem('user_phone');
            const savedName = localStorage.getItem('pinchos_client_name') || localStorage.getItem('user_name');
            if (savedPhone && savedName) {
                setClientPhone(savedPhone);
                setClientName(savedName);
                onAuthenticated(savedName, savedPhone);
            }
        }
    }, [onAuthenticated, setClientName, setClientPhone]);

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName.trim() || !clientPhone.trim()) {
            alert('Por favor ingresa tu nombre y número de teléfono.');
            return;
        }

        try {
            setSubmitting(true);
            setOtpMessage(null);
            const res = await fetch('/api/public/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send_otp',
                    phone: clientPhone.trim(),
                    nombre: clientName.trim(),
                    slug: storeSlug
                })
            });

            const data = await res.json();
            if (data.success) {
                setOtpStep('verify');
                setOtpMessage(data.message || 'Código de 4 dígitos enviado por WhatsApp.');
            } else {
                setOtpMessage(data.error || 'No se pudo enviar el código OTP.');
            }
        } catch (err) {
            setOtpMessage('Error de conexión al solicitar OTP.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otpCode || otpCode.length < 4) {
            setOtpMessage('Ingresa el código OTP de 4 dígitos.');
            return;
        }

        try {
            setSubmitting(true);
            setOtpMessage(null);

            const res = await fetch('/api/public/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify_otp',
                    phone: clientPhone.trim(),
                    code: otpCode.trim(),
                    slug: storeSlug
                })
            });

            const data = await res.json();
            if (data.success) {
                // Auto-create & persist session
                if (typeof window !== 'undefined') {
                    localStorage.setItem('pinchos_client_phone', clientPhone.trim());
                    localStorage.setItem('user_phone', clientPhone.trim());
                    localStorage.setItem('pinchos_client_name', clientName.trim());
                    localStorage.setItem('user_name', clientName.trim());
                }
                onAuthenticated(clientName.trim(), clientPhone.trim());
            } else {
                setOtpMessage(data.error || 'Código OTP incorrecto.');
            }
        } catch (err) {
            setOtpMessage('Error al validar el código OTP.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-5">
            {otpStep === 'info' ? (
                <form onSubmit={handleSendOTP} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 text-left">
                    <div className="border-b border-slate-100 pb-3">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <User className="size-4 text-orange-600" />
                            <span>Identificación del Cliente</span>
                        </span>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Ingresa tu nombre y teléfono para confirmar tu pedido y recibir actualizaciones.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                                Nombre y Apellido *
                            </label>
                            <div className="relative">
                                <User className="size-4 text-slate-400 absolute left-3 top-3.5" />
                                <input
                                    type="text"
                                    required
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Ej: Poleth Caicedo"
                                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-orange-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                                Número de WhatsApp *
                            </label>
                            <div className="relative">
                                <Phone className="size-4 text-slate-400 absolute left-3 top-3.5" />
                                <input
                                    type="tel"
                                    required
                                    value={clientPhone}
                                    onChange={(e) => setClientPhone(e.target.value)}
                                    placeholder="Ej: 0991234567"
                                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-orange-500"
                                />
                            </div>
                        </div>
                    </div>

                    {otpMessage && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                            {otpMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Enviando código OTP...
                            </>
                        ) : (
                            <>
                                <span>VERIFICAR Y CONTINUAR</span>
                                <ArrowRight className="size-4" />
                            </>
                        )}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyOTP} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 text-left">
                    <div className="border-b border-slate-100 pb-3">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <KeyRound className="size-4 text-orange-600" />
                            <span>Código de Verificación OTP</span>
                        </span>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Enviamos un código de 4 dígitos a tu WhatsApp <strong>{clientPhone}</strong>.
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                            Código OTP de 4 dígitos *
                        </label>
                        <input
                            type="text"
                            maxLength={6}
                            required
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder="Ej: 1234"
                            className="w-full text-center text-lg font-mono font-black tracking-widest text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-orange-500"
                        />
                    </div>

                    {otpMessage && (
                        <div className="p-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl text-xs font-bold">
                            {otpMessage}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setOtpStep('info')}
                            className="w-1/3 py-3 bg-slate-100 text-slate-700 font-black rounded-xl text-xs uppercase"
                        >
                            Cambiar Datos
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-2/3 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
                        >
                            {submitting ? <Loader2 className="size-4 animate-spin" /> : 'VALIDAR SESIÓN'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
