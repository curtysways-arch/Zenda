'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Check, 
    Sparkles, 
    ShieldCheck, 
    MessageCircle, 
    CreditCard, 
    X, 
    ArrowRight, 
    Building2, 
    Copy, 
    Lock, 
    QrCode, 
    AlertCircle, 
    User, 
    Banknote
} from 'lucide-react';

interface MembershipPlanItem {
    id: string;
    businessId: string;
    name: string;
    description?: string | null;
    price: number;
    currency: string;
    durationDays: number;
    featured?: boolean;
    benefits?: any;
}

interface HomeMembershipPlansClientProps {
    plans: MembershipPlanItem[];
    slug: string;
    primaryColor: string;
    textColor: string;
    whatsapp?: string | null;
    businessName?: string;
}

type PaymentMethodType = 'TARJETA_ONLINE' | 'TRANSFERENCIA' | 'RECEPCION_EFECTIVO';

export default function HomeMembershipPlansClient({
    plans,
    slug,
    primaryColor,
    textColor,
    whatsapp,
    businessName
}: HomeMembershipPlansClientProps) {
    const [selectedPlan, setSelectedPlan] = useState<MembershipPlanItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('TARJETA_ONLINE');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [copiedAccount, setCopiedAccount] = useState(false);

    // Datos del formulario
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        email: '',
        // Datos de Tarjeta simulada / pasarela
        cardNumber: '',
        cardExpiry: '',
        cardCvc: '',
        cardHolder: '',
        // Datos de Transferencia
        transferRef: ''
    });

    // Datos bancarios del negocio obtenidos vía API
    const [bankData, setBankData] = useState<{
        banco: string;
        titular: string;
        numeroCuenta: string;
        tipoCuenta: string;
        identificacion: string;
        instructions: string;
    } | null>(null);

    // Membresía comprada
    const [purchasedMembership, setPurchasedMembership] = useState<any>(null);

    useEffect(() => {
        // Cargar datos bancarios del gimnasio para transferencias
        fetch(`/api/${slug}/gym/checkout`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.bankTransfer) {
                    setBankData(data.bankTransfer);
                }
            })
            .catch(() => {});
    }, [slug]);

    if (!plans || plans.length === 0) {
        return null;
    }

    const formatDuration = (days: number) => {
        if (days === 1) return 'Pase Diario';
        if (days === 7) return '1 Semana';
        if (days === 15) return 'Quincenal';
        if (days === 30) return 'Mensual (30 días)';
        if (days === 60) return 'Bimestral (60 días)';
        if (days === 90) return 'Trimestral (90 días)';
        if (days === 180) return 'Semestral (6 meses)';
        if (days === 365) return 'Anual (12 meses)';
        return `${days} días`;
    };

    const parseBenefits = (benefits: any): string[] => {
        if (!benefits) return [];
        if (Array.isArray(benefits)) return benefits.map(b => String(b));
        if (typeof benefits === 'string') {
            try {
                const parsed = JSON.parse(benefits);
                if (Array.isArray(parsed)) return parsed.map(b => String(b));
            } catch (_) {
                return benefits.split('\n').map(b => b.trim()).filter(Boolean);
            }
        }
        return [];
    };

    const handleOpenCheckout = (plan: MembershipPlanItem) => {
        setSelectedPlan(plan);
        setStep('form');
        setErrorMessage('');
        setPaymentMethod('TARJETA_ONLINE');
        setIsModalOpen(true);
    };

    const handleCopyAccount = (text: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopiedAccount(true);
            setTimeout(() => setCopiedAccount(false), 2000);
        }
    };

    const handleSubmitCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlan) return;

        if (!formData.nombre.trim()) {
            setErrorMessage('Por favor ingresa tu nombre completo.');
            return;
        }

        if (!formData.telefono.trim()) {
            setErrorMessage('Por favor ingresa tu teléfono móvil o WhatsApp.');
            return;
        }

        if (paymentMethod === 'TARJETA_ONLINE') {
            const cleanCard = formData.cardNumber.replace(/\s+/g, '');
            if (cleanCard.length < 15) {
                setErrorMessage('Ingresa un número de tarjeta válido (16 dígitos).');
                return;
            }
            if (!formData.cardExpiry.trim()) {
                setErrorMessage('Ingresa la fecha de vencimiento (MM/AA).');
                return;
            }
            if (formData.cardCvc.length < 3) {
                setErrorMessage('Ingresa el código de seguridad CVC (3 o 4 dígitos).');
                return;
            }
        }

        if (paymentMethod === 'TRANSFERENCIA' && !formData.transferRef.trim()) {
            setErrorMessage('Por favor indica el número de comprobante o referencia de la transferencia.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            const cardLast4 = paymentMethod === 'TARJETA_ONLINE' 
                ? formData.cardNumber.replace(/\s+/g, '').slice(-4) 
                : undefined;

            const res = await fetch(`/api/${slug}/gym/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: selectedPlan.id,
                    nombre: formData.nombre,
                    telefono: formData.telefono,
                    email: formData.email,
                    paymentMethod,
                    paymentReference: paymentMethod === 'TRANSFERENCIA' ? formData.transferRef : undefined,
                    cardLast4
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'No se pudo procesar la membresía.');
            }

            setPurchasedMembership(data.membership);

            // Recordar teléfono en localStorage para auto-inicio de sesión de socio
            if (typeof window !== 'undefined') {
                localStorage.setItem(`${slug}_client_phone`, formData.telefono.trim());
                localStorage.setItem('user_phone', formData.telefono.trim());
            }

            setStep('success');
        } catch (err: any) {
            setErrorMessage(err.message || 'Ocurrió un error al procesar la membresía.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getSuccessWhatsappUrl = () => {
        const raw = whatsapp || '0991234567';
        const clean = raw.replace(/\D/g, '');
        const formatted = clean.startsWith('593')
            ? clean
            : clean.startsWith('0')
                ? `593${clean.slice(1)}`
                : `593${clean}`;

        const methodLabel = paymentMethod === 'TARJETA_ONLINE' 
            ? 'Tarjeta en Línea' 
            : paymentMethod === 'TRANSFERENCIA' 
                ? `Transferencia (Ref: ${formData.transferRef})` 
                : 'Abono en Recepción';

        const msg = encodeURIComponent(
            `¡Hola ${businessName || 'Gimnasio'}! Acabo de registrar mi membresía desde la app:\n\n` +
            `👤 *Socio:* ${formData.nombre}\n` +
            `📱 *Teléfono:* ${formData.telefono}\n` +
            `🏋️ *Plan:* ${selectedPlan?.name} ($${selectedPlan?.price} ${selectedPlan?.currency})\n` +
            `💳 *Método de pago:* ${methodLabel}\n\n` +
            `Ya tengo mi carnet QR listo para ingresar. ¡Muchas gracias!`
        );
        return `https://wa.me/${formatted}?text=${msg}`;
    };

    return (
        <section id="planes" className="px-6 mb-10 scroll-mt-24">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <span 
                        className="text-[10px] font-black uppercase tracking-widest mb-1.5 block"
                        style={{ color: primaryColor }}
                    >
                        MEMBRESÍAS & PASES
                    </span>
                    <h3 className="text-2xl font-black leading-none text-slate-900">
                        Planes de Entrenamiento
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1.5">
                        Acceso con carnet digital QR, sin contratos forzosos.
                    </p>
                </div>
            </div>

            {/* Grid de Planes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {plans.map((plan) => {
                    const benefitsList = parseBenefits(plan.benefits);
                    const isFeatured = !!plan.featured;

                    return (
                        <div
                            key={plan.id}
                            className={`relative bg-white rounded-[2.5rem] border shadow-sm p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-md ${
                                isFeatured 
                                    ? 'ring-2 ring-offset-2' 
                                    : 'border-slate-100 hover:border-slate-200'
                            }`}
                            style={{
                                borderColor: isFeatured ? primaryColor : undefined,
                                outlineColor: isFeatured ? primaryColor : undefined
                            }}
                        >
                            {/* Featured Badge */}
                            {isFeatured && (
                                <div 
                                    className="absolute -top-3.5 left-8 px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-md flex items-center gap-1.5"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Sparkles size={11} className="fill-current" />
                                    Más Popular
                                </div>
                            )}

                            <div>
                                {/* Header del Plan */}
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div>
                                        <h4 className="font-black text-xl text-slate-900 leading-tight">
                                            {plan.name}
                                        </h4>
                                        <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                            {formatDuration(plan.durationDays)}
                                        </span>
                                    </div>
                                </div>

                                {plan.description && (
                                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                                        {plan.description}
                                    </p>
                                )}

                                {/* Precio */}
                                <div className="my-5 pb-5 border-b border-slate-100">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                                            ${plan.price}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 uppercase">
                                            {plan.currency || 'USD'}
                                        </span>
                                        <span className="text-[11px] font-medium text-slate-400 ml-1">
                                            / {plan.durationDays === 1 ? 'día' : plan.durationDays <= 31 ? 'mes' : `${plan.durationDays} días`}
                                        </span>
                                    </div>
                                </div>

                                {/* Checklist de Beneficios */}
                                {benefitsList.length > 0 && (
                                    <div className="space-y-2.5 mb-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Lo que incluye:
                                        </p>
                                        <ul className="space-y-2">
                                            {benefitsList.map((benefit, bIdx) => (
                                                <li key={bIdx} className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                                                    <div 
                                                        className="size-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                                        style={{ 
                                                            backgroundColor: `${primaryColor}18`,
                                                            color: primaryColor 
                                                        }}
                                                    >
                                                        <Check size={10} strokeWidth={3} />
                                                    </div>
                                                    <span>{benefit}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Botones de Acción */}
                            <div className="pt-2 space-y-2">
                                <button
                                    type="button"
                                    onClick={() => handleOpenCheckout(plan)}
                                    className="w-full py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-md flex items-center justify-center gap-2 active:scale-[0.98] hover:opacity-95 transition-all"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <CreditCard size={15} />
                                    Adquirir Membresía
                                </button>
                                <Link
                                    href={`/${slug}/mi-qr`}
                                    className="w-full py-2.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <ShieldCheck size={13} className="text-slate-400" />
                                    Acceso con Carnet QR
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* MODAL DE CHECKOUT & PASARELA DE PAGO                             */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {isModalOpen && selectedPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                    <div className="relative w-full max-w-lg bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
                        
                        {/* Header del Modal */}
                        <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <span 
                                    className="text-[10px] font-black uppercase tracking-widest block"
                                    style={{ color: primaryColor }}
                                >
                                    {step === 'form' ? 'Checkout de Membresía' : 'Confirmación Oficial'}
                                </span>
                                <h3 className="text-xl font-black text-slate-900 leading-tight">
                                    {step === 'form' ? selectedPlan.name : '¡Membresía Activada!'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    ${selectedPlan.price} {selectedPlan.currency || 'USD'} · {formatDuration(selectedPlan.durationDays)}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="size-9 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shadow-sm"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Cuerpo del Modal con Scroll */}
                        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                            {step === 'form' ? (
                                <form onSubmit={handleSubmitCheckout} className="space-y-5">
                                    
                                    {/* Alerta de Error */}
                                    {errorMessage && (
                                        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
                                            <AlertCircle size={16} className="shrink-0 text-red-500" />
                                            <span>{errorMessage}</span>
                                        </div>
                                    )}

                                    {/* SECCIÓN 1: DATOS DEL SOCIO */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                                            <User size={14} style={{ color: primaryColor }} />
                                            <span>1. Datos del Socio</span>
                                        </div>

                                        <div className="space-y-2.5">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                    Nombre Completo *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Ej. Carlos Rodríguez"
                                                    value={formData.nombre}
                                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                        WhatsApp / Móvil *
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        required
                                                        placeholder="Ej. 0991234567"
                                                        value={formData.telefono}
                                                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                        Correo (Opcional)
                                                    </label>
                                                    <input
                                                        type="email"
                                                        placeholder="socio@email.com"
                                                        value={formData.email}
                                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECCIÓN 2: PASARELA Y MÉTODO DE PAGO */}
                                    <div className="space-y-3 pt-2 border-t border-slate-100">
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                                            <CreditCard size={14} style={{ color: primaryColor }} />
                                            <span>2. Pasarela & Método de Pago</span>
                                        </div>

                                        {/* Pestañas de Métodos */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('TARJETA_ONLINE')}
                                                className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                                                    paymentMethod === 'TARJETA_ONLINE'
                                                        ? 'bg-blue-50/70 border-blue-500 shadow-sm'
                                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <CreditCard 
                                                    size={18} 
                                                    className={paymentMethod === 'TARJETA_ONLINE' ? 'text-blue-600' : 'text-slate-400'} 
                                                />
                                                <span className={`text-[10px] font-extrabold uppercase tracking-tight ${paymentMethod === 'TARJETA_ONLINE' ? 'text-blue-900' : 'text-slate-600'}`}>
                                                    Tarjeta Online
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('TRANSFERENCIA')}
                                                className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                                                    paymentMethod === 'TRANSFERENCIA'
                                                        ? 'bg-blue-50/70 border-blue-500 shadow-sm'
                                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <Building2 
                                                    size={18} 
                                                    className={paymentMethod === 'TRANSFERENCIA' ? 'text-blue-600' : 'text-slate-400'} 
                                                />
                                                <span className={`text-[10px] font-extrabold uppercase tracking-tight ${paymentMethod === 'TRANSFERENCIA' ? 'text-blue-900' : 'text-slate-600'}`}>
                                                    Transferencia
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('RECEPCION_EFECTIVO')}
                                                className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                                                    paymentMethod === 'RECEPCION_EFECTIVO'
                                                        ? 'bg-blue-50/70 border-blue-500 shadow-sm'
                                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <Banknote 
                                                    size={18} 
                                                    className={paymentMethod === 'RECEPCION_EFECTIVO' ? 'text-blue-600' : 'text-slate-400'} 
                                                />
                                                <span className={`text-[10px] font-extrabold uppercase tracking-tight ${paymentMethod === 'RECEPCION_EFECTIVO' ? 'text-blue-900' : 'text-slate-600'}`}>
                                                    En Recepción
                                                </span>
                                            </button>
                                        </div>

                                        {/* CONTENIDO SEGÚN MÉTODO ELEGIDO */}
                                        
                                        {/* 1. TARJETA ONLINE */}
                                        {paymentMethod === 'TARJETA_ONLINE' && (
                                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                        Pago Seguro con Encriptación SSL
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <Lock size={12} className="text-emerald-500" />
                                                        <span className="text-[9px] font-bold text-emerald-600">256-bit</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                                        Número de Tarjeta
                                                    </label>
                                                    <input
                                                        type="text"
                                                        maxLength={19}
                                                        placeholder="4111 2222 3333 4444"
                                                        value={formData.cardNumber}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                                                            setFormData({ ...formData, cardNumber: val });
                                                        }}
                                                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-mono font-medium focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-2.5">
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                                            Vencimiento (MM/AA)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            maxLength={5}
                                                            placeholder="12/28"
                                                            value={formData.cardExpiry}
                                                            onChange={(e) => {
                                                                let val = e.target.value.replace(/\D/g, '');
                                                                if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                                                                setFormData({ ...formData, cardExpiry: val });
                                                            }}
                                                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-mono font-medium focus:border-blue-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                                            CVC / CVV
                                                        </label>
                                                        <input
                                                            type="password"
                                                            maxLength={4}
                                                            placeholder="•••"
                                                            value={formData.cardCvc}
                                                            onChange={(e) => setFormData({ ...formData, cardCvc: e.target.value.replace(/\D/g, '') })}
                                                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-mono font-medium focus:border-blue-500 focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 2. TRANSFERENCIA BANCARIA */}
                                        {paymentMethod === 'TRANSFERENCIA' && (
                                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                                                        Datos de Cuenta del Gimnasio
                                                    </span>
                                                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                        Sin Comisión
                                                    </span>
                                                </div>

                                                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                                                    <div className="flex justify-between items-center text-slate-500">
                                                        <span>Banco:</span>
                                                        <span className="font-bold text-slate-900">{bankData?.banco || 'Banco Pichincha'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-slate-500">
                                                        <span>Titular:</span>
                                                        <span className="font-bold text-slate-900">{bankData?.titular || businessName || 'Gimnasio'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-slate-500">
                                                        <span>Tipo:</span>
                                                        <span className="font-bold text-slate-900">{bankData?.tipoCuenta || 'Ahorros'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-100">
                                                        <span>Número de Cuenta:</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono font-bold text-slate-900">
                                                                {bankData?.numeroCuenta || 'Consultar por WhatsApp'}
                                                            </span>
                                                            {bankData?.numeroCuenta && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopyAccount(bankData.numeroCuenta)}
                                                                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                                                                    title="Copiar número"
                                                                >
                                                                    <Copy size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {copiedAccount && (
                                                        <p className="text-[10px] text-emerald-600 font-bold text-right">
                                                            ✓ Copiado al portapapeles
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                                                        Número de Comprobante / Referencia *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Ej. 9845210"
                                                        value={formData.transferRef}
                                                        onChange={(e) => setFormData({ ...formData, transferRef: e.target.value })}
                                                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-mono font-medium focus:border-blue-500 focus:outline-none"
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        Ingresa el número de transacción que aparece en tu comprobante de depósito o transferencia.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* 3. PAGO EN RECEPCIÓN */}
                                        {paymentMethod === 'RECEPCION_EFECTIVO' && (
                                            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-2 animate-in fade-in">
                                                <div className="flex items-center gap-2 font-black text-xs uppercase">
                                                    <Banknote size={16} className="text-amber-600" />
                                                    <span>Pago al Primer Ingreso</span>
                                                </div>
                                                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                                                    Tu membresía se registrará y tu código QR se creará de inmediato. Podrás realizar el pago en efectivo o con tarjeta física directamente en la recepción del gimnasio al ingresar.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Botón de Enviar Checkout */}
                                    <div className="pt-3">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {isSubmitting ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                            ) : (
                                                <>
                                                    <span>
                                                        {paymentMethod === 'TARJETA_ONLINE' 
                                                            ? `Pagar $${selectedPlan.price} y Activar` 
                                                            : paymentMethod === 'TRANSFERENCIA'
                                                                ? `Confirmar Transferencia ($${selectedPlan.price})`
                                                                : `Reservar y Activar Membresía`}
                                                    </span>
                                                    <ArrowRight size={16} />
                                                </>
                                            )}
                                        </button>
                                        <p className="text-center text-[10px] text-slate-400 mt-2">
                                            Al continuar aceptas los términos y condiciones del gimnasio.
                                        </p>
                                    </div>
                                </form>
                            ) : (
                                /* ══════════════════════════════════════════════════════ */
                                /* PANTALLA DE ÉXITO                                      */
                                /* ══════════════════════════════════════════════════════ */
                                <div className="text-center py-2 space-y-5 animate-in zoom-in-95">
                                    <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                                        <Check size={36} strokeWidth={3} />
                                    </div>

                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                            ¡Registro Completado!
                                        </span>
                                        <h4 className="text-2xl font-black text-slate-900 mt-1">
                                            ¡Bienvenido a {businessName || 'nuestro Club'}!
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                                            Tu membresía <strong className="text-slate-900">{selectedPlan.name}</strong> ha sido procesada con éxito.
                                        </p>
                                    </div>

                                    {/* Tarjeta de Resumen */}
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Socio:</span>
                                            <span className="font-bold text-slate-800">{formData.nombre}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Móvil:</span>
                                            <span className="font-bold text-slate-800">{formData.telefono}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Duración:</span>
                                            <span className="font-bold text-slate-800">{formatDuration(selectedPlan.durationDays)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1.5 border-t border-slate-200/60">
                                            <span className="text-slate-400">Método:</span>
                                            <span className="font-bold text-emerald-700">
                                                {paymentMethod === 'TARJETA_ONLINE' 
                                                    ? 'Tarjeta Aprobada' 
                                                    : paymentMethod === 'TRANSFERENCIA' 
                                                        ? 'Transferencia Notificada' 
                                                        : 'Pago en Recepción'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Botones de Acción Post-Compra */}
                                    <div className="space-y-2.5 pt-2">
                                        <Link
                                            href={`/${slug}/mi-qr`}
                                            className="w-full py-4 px-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl flex items-center justify-center gap-2 transition-all hover:opacity-95"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <QrCode size={18} />
                                            <span>Ver Mi Carnet QR de Acceso</span>
                                        </Link>

                                        <a
                                            href={getSuccessWhatsappUrl()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-widest text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <MessageCircle size={16} />
                                            <span>Enviar Constancia a WhatsApp</span>
                                        </a>

                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                                        >
                                            Cerrar ventana
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </section>
    );
}
