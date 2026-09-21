'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PhoneInput from '@/components/ui/PhoneInput';
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
    Banknote, 
    Tag, 
    Flame,
    KeyRound,
    RotateCw,
    ArrowLeft,
    CheckCircle2,
    Phone
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
    promotions?: any[];
    slug: string;
    primaryColor: string;
    textColor: string;
    whatsapp?: string | null;
    businessName?: string;
}

type PaymentMethodType = 'TARJETA_ONLINE' | 'TRANSFERENCIA' | 'RECEPCION_EFECTIVO';

export default function HomeMembershipPlansClient({
    plans,
    promotions = [],
    slug,
    primaryColor,
    textColor,
    whatsapp,
    businessName
}: HomeMembershipPlansClientProps) {
    const [selectedPlan, setSelectedPlan] = useState<MembershipPlanItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('TARJETA_ONLINE');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [copiedAccount, setCopiedAccount] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<any | null>(null);

    // Estados de OTP para confirmación de membresía
    const [otpCode, setOtpCode] = useState('');
    const [otpCountdown, setOtpCountdown] = useState(0);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

    // Datos del formulario
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '+593',
        email: '',
        // Datos de Tarjeta simulada / pasarela
        cardNumber: '',
        cardExpiry: '',
        cardCvc: '',
        cardHolder: '',
        // Datos de Transferencia
        transferRef: ''
    });

    // Temporizador regresivo para reenvío de OTP
    useEffect(() => {
        let timer: any;
        if (otpCountdown > 0) {
            timer = setInterval(() => setOtpCountdown(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [otpCountdown]);

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

    // Cargar datos bancarios del gimnasio para transferencias
    useEffect(() => {
        fetch(`/api/${slug}/gym/checkout`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.bankTransfer) {
                    setBankData(data.bankTransfer);
                }
            })
            .catch(() => {});
    }, [slug]);

    // Bloquear scroll del fondo cuando el modal esté abierto
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isModalOpen]);

    // Detectar promoción y plan desde la URL (ej: ?promo=xyz#planes)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const promoId = params.get('promo') || params.get('promoId');
        const planId = params.get('plan') || params.get('planId');

        if (promoId && promotions && promotions.length > 0) {
            const found = promotions.find((p: any) => p.id === promoId);
            if (found) {
                setAppliedPromo(found);

                // Determinar el plan correspondiente para auto-seleccionar
                const rawDesc = found.descripcion || '';
                let meta: any = null;
                if (rawDesc.includes('<!-- CITIOX_META:')) {
                    try {
                        meta = JSON.parse(rawDesc.split('<!-- CITIOX_META:')[1].split('-->')[0]);
                    } catch (_) {}
                }

                let targetPlan = plans.find(p => p.id === planId);
                if (!targetPlan && meta?.membershipPlanId) {
                    targetPlan = plans.find(p => p.id === meta.membershipPlanId);
                }
                if (!targetPlan) {
                    const tName = (found.titulo || '').toLowerCase();
                    if (tName.includes('anual')) targetPlan = plans.find(p => p.durationDays >= 360);
                    else if (tName.includes('trimestral')) targetPlan = plans.find(p => (p.durationDays >= 80 && p.durationDays <= 100) || p.name.toLowerCase().includes('trimestral'));
                    else if (tName.includes('primer mes') || tName.includes('mensual')) targetPlan = plans.find(p => p.durationDays <= 31 || p.name.toLowerCase().includes('mensual'));
                }
                if (!targetPlan && plans.length > 0) {
                    targetPlan = plans[0];
                }

                if (targetPlan) {
                    setSelectedPlan(targetPlan);
                    // Abrir modal con pequeño retardo para permitir smooth scroll a #planes
                    const timer = setTimeout(() => {
                        setIsModalOpen(true);
                    }, 400);
                    return () => clearTimeout(timer);
                }
            }
        }
    }, [slug, promotions, plans]);

    // Función para calcular precios y descuentos considerando promociones
    const getPlanPricing = (plan: MembershipPlanItem | null) => {
        if (!plan) {
            return { originalPrice: 0, finalPrice: 0, discount: 0, hasDiscount: false, isFreeRegistration: false, promoTitle: null };
        }
        const basePrice = plan.price || 0;
        if (!appliedPromo) {
            return { originalPrice: basePrice, finalPrice: basePrice, discount: 0, hasDiscount: false, isFreeRegistration: false, promoTitle: null };
        }

        const rawDesc = appliedPromo.descripcion || '';
        let meta: any = null;
        if (rawDesc.includes('<!-- CITIOX_META:')) {
            try {
                meta = JSON.parse(rawDesc.split('<!-- CITIOX_META:')[1].split('-->')[0]);
            } catch (_) {}
        }

        let applies = false;
        if (meta?.membershipPlanId) {
            applies = meta.membershipPlanId === plan.id;
        } else if (appliedPromo.tipoPromo === 'INSCRIPCION_GRATIS' || meta?.benefitType === 'INSCRIPCION_GRATIS') {
            applies = true;
        } else {
            const pName = (plan.name || '').toLowerCase();
            const tName = (appliedPromo.titulo || '').toLowerCase();
            if (tName.includes('anual') && (plan.durationDays >= 360 || pName.includes('anual'))) applies = true;
            else if (tName.includes('trimestral') && ((plan.durationDays >= 80 && plan.durationDays <= 100) || pName.includes('trimestral'))) applies = true;
            else if ((tName.includes('primer mes') || tName.includes('mensual')) && (plan.durationDays <= 31 || pName.includes('mensual'))) applies = true;
        }

        if (!applies) {
            return { originalPrice: basePrice, finalPrice: basePrice, discount: 0, hasDiscount: false, isFreeRegistration: false, promoTitle: null };
        }

        if (meta?.benefitType === 'INSCRIPCION_GRATIS' || appliedPromo.tipoPromo === 'INSCRIPCION_GRATIS') {
            return {
                originalPrice: basePrice,
                finalPrice: basePrice,
                discount: 0,
                hasDiscount: false,
                isFreeRegistration: true,
                promoTitle: appliedPromo.titulo || 'Inscripción y Carnet de Regalo'
            };
        }

        let finalPrice = basePrice;
        let discount = 0;

        if (meta?.finalPrice !== undefined && meta.finalPrice !== null) {
            finalPrice = Number(meta.finalPrice);
            discount = Math.max(0, basePrice - finalPrice);
        } else if (appliedPromo.precioPromo !== undefined && appliedPromo.precioPromo !== null) {
            finalPrice = Number(appliedPromo.precioPromo);
            discount = Math.max(0, basePrice - finalPrice);
        } else if (meta?.benefitType === 'DESCUENTO_PORCENTAJE' && meta?.discountValue) {
            discount = Number((basePrice * (meta.discountValue / 100)).toFixed(2));
            finalPrice = Math.max(0, Number((basePrice - discount).toFixed(2)));
        } else if (meta?.benefitType === 'DESCUENTO_FIJO' && meta?.discountValue) {
            discount = Number(meta.discountValue);
            finalPrice = Math.max(0, basePrice - discount);
        }

        return {
            originalPrice: basePrice,
            finalPrice: Number(finalPrice.toFixed(2)),
            discount: Number(discount.toFixed(2)),
            hasDiscount: discount > 0,
            isFreeRegistration: false,
            promoTitle: appliedPromo.titulo
        };
    };

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
        setOtpCode('');
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

    // 1. Validar datos del socio y enviar OTP por WhatsApp
    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlan) return;

        if (!formData.nombre.trim()) {
            setErrorMessage('Por favor ingresa tu nombre completo.');
            return;
        }

        const cleanPhoneDigits = formData.telefono.replace(/\D/g, '');
        if (!formData.telefono.trim() || cleanPhoneDigits.length < 8) {
            setErrorMessage('Por favor ingresa un número de WhatsApp válido.');
            return;
        }

        if (paymentMethod === 'TRANSFERENCIA' && !formData.transferRef.trim()) {
            setErrorMessage('Por favor indica el número de comprobante de la transferencia.');
            return;
        }

        setIsSendingOtp(true);
        setErrorMessage('');

        try {
            const res = await fetch(`/api/${slug}/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telefono: formData.telefono.trim(),
                    purpose: 'MEMBERSHIP_CHECKOUT',
                    isRegistration: true
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'No se pudo enviar el código de verificación.');
            }

            setStep('otp');
            setOtpCountdown(60);
        } catch (err: any) {
            setErrorMessage(err.message || 'Error al enviar código de verificación.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    // 2. Reenviar código OTP si expira el tiempo
    const handleResendOtp = async () => {
        if (otpCountdown > 0 || isSendingOtp) return;
        setIsSendingOtp(true);
        setErrorMessage('');
        try {
            const res = await fetch(`/api/${slug}/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telefono: formData.telefono.trim(),
                    purpose: 'MEMBERSHIP_CHECKOUT',
                    isRegistration: true
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'No se pudo reenviar el código.');
            }
            setOtpCountdown(60);
        } catch (err: any) {
            setErrorMessage(err.message || 'Error al reenviar código.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    // 3. Verificar OTP e inmediatamente confirmar y registrar la adquisición de la membresía
    const handleVerifyOtpAndCheckout = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedPlan || !formData.telefono) return;

        const cleanOtp = otpCode.replace(/\D/g, '');
        if (cleanOtp.length < 4) {
            setErrorMessage('Por favor ingresa el código de verificación recibido en WhatsApp.');
            return;
        }

        setIsVerifyingOtp(true);
        setErrorMessage('');

        try {
            // A. Verificar código OTP con la API
            const otpRes = await fetch(`/api/${slug}/otp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telefono: formData.telefono.trim(),
                    code: cleanOtp
                })
            });

            const otpData = await otpRes.json();
            if (!otpRes.ok) {
                throw new Error(otpData.error || 'Código incorrecto o expirado.');
            }

            // B. Con OTP verificado con éxito, crear y activar la membresía
            const cardLast4 = paymentMethod === 'TARJETA_ONLINE' 
                ? (formData.cardNumber.replace(/\s+/g, '').slice(-4) || '4242') 
                : undefined;

            const res = await fetch(`/api/${slug}/gym/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: selectedPlan.id,
                    promotionId: appliedPromo?.id,
                    nombre: formData.nombre.trim(),
                    telefono: formData.telefono.trim(),
                    email: formData.email.trim() || undefined,
                    paymentMethod,
                    paymentReference: paymentMethod === 'TRANSFERENCIA' ? formData.transferRef : undefined,
                    cardLast4
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'No se pudo activar la membresía.');
            }

            setPurchasedMembership(data.membership);

            // Recordar teléfono en localStorage para auto-inicio de sesión de socio
            if (typeof window !== 'undefined') {
                localStorage.setItem(`${slug}_client_phone`, formData.telefono.trim());
                localStorage.setItem('user_phone', formData.telefono.trim());
            }

            setStep('success');
        } catch (err: any) {
            setErrorMessage(err.message || 'Error al validar código o registrar membresía.');
        } finally {
            setIsVerifyingOtp(false);
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

        const pricing = getPlanPricing(selectedPlan);

        const methodLabel = paymentMethod === 'TARJETA_ONLINE' 
            ? 'Tarjeta en Línea' 
            : paymentMethod === 'TRANSFERENCIA' 
                ? `Transferencia (Ref: ${formData.transferRef})` 
                : 'Abono en Recepción';

        const promoLine = pricing.promoTitle ? `🎁 *Promoción aplicada:* ${pricing.promoTitle}\n` : '';
        const priceDetail = pricing.hasDiscount 
            ? `$${pricing.finalPrice} ${selectedPlan?.currency || 'USD'} (Ahorro de $${pricing.discount})`
            : `$${pricing.finalPrice} ${selectedPlan?.currency || 'USD'}`;

        const msg = encodeURIComponent(
            `¡Hola ${businessName || 'Gimnasio'}! Acabo de registrar mi membresía desde la app:\n\n` +
            `👤 *Socio:* ${formData.nombre}\n` +
            `📱 *Teléfono:* ${formData.telefono}\n` +
            `🏋️ *Plan:* ${selectedPlan?.name} (${priceDetail})\n` +
            promoLine +
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

            {/* Banner de Promoción Activa (si viene de una promo seleccionada) */}
            {appliedPromo && (
                <div className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-300 flex items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="size-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                            <Flame size={22} className="fill-current animate-pulse" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                                    Promoción Activa
                                </span>
                                <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                    {appliedPromo.titulo}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                                {appliedPromo.descripcion?.replace(/<!-- CITIOX_META:[\s\S]*?-->/, '').trim() || 'Descuento especial aplicado directamente a tu membresía.'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAppliedPromo(null)}
                        className="text-xs font-bold text-slate-400 hover:text-slate-700 px-3 py-1.5 rounded-xl hover:bg-white/80 transition-colors shrink-0"
                    >
                        Quitar promo
                    </button>
                </div>
            )}

            {/* Grid de Planes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {plans.map((plan) => {
                    const benefitsList = parseBenefits(plan.benefits);
                    const isFeatured = !!plan.featured;
                    const pricing = getPlanPricing(plan);

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
                            {/* Badges superiores */}
                            <div className="absolute -top-3.5 left-6 right-6 flex items-center justify-between pointer-events-none">
                                {isFeatured ? (
                                    <div 
                                        className="px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-md flex items-center gap-1.5"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <Sparkles size={11} className="fill-current" />
                                        Más Popular
                                    </div>
                                ) : <div />}

                                {pricing.hasDiscount ? (
                                    <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-md flex items-center gap-1">
                                        <Tag size={10} />
                                        ¡Ahorras ${pricing.discount}!
                                    </div>
                                ) : pricing.isFreeRegistration ? (
                                    <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-md flex items-center gap-1">
                                        <Sparkles size={10} />
                                        Inscripción Gratis
                                    </div>
                                ) : null}
                            </div>

                            <div>
                                {/* Header del Plan */}
                                <div className="flex items-start justify-between gap-2 mb-3 mt-1">
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
                                    <div className="flex items-baseline gap-2">
                                        {pricing.hasDiscount && (
                                            <span className="text-lg font-bold text-slate-400 line-through">
                                                ${pricing.originalPrice}
                                            </span>
                                        )}
                                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                                            ${pricing.finalPrice}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 uppercase">
                                            {plan.currency || 'USD'}
                                        </span>
                                        <span className="text-[11px] font-medium text-slate-400 ml-1">
                                            / {plan.durationDays === 1 ? 'día' : plan.durationDays <= 31 ? 'mes' : `${plan.durationDays} días`}
                                        </span>
                                    </div>

                                    {pricing.hasDiscount && (
                                        <p className="text-[11px] font-bold text-rose-600 mt-1.5 flex items-center gap-1">
                                            <Tag size={12} />
                                            Precio promocional aplicado
                                        </p>
                                    )}
                                    {pricing.isFreeRegistration && (
                                        <p className="text-[11px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1">
                                            <Sparkles size={12} />
                                            ¡Ahorraste matrícula y carnet!
                                        </p>
                                    )}
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
                                    {pricing.finalPrice === 0 ? 'Adquirir Gratis' : `Adquirir por $${pricing.finalPrice}`}
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
            {isModalOpen && selectedPlan && (() => {
                const modalPricing = getPlanPricing(selectedPlan);
                return (
                    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
                        <div className="relative w-full max-w-lg bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
                            
                            {/* Header del Modal */}
                            <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div>
                                    <span 
                                        className="text-[10px] font-black uppercase tracking-widest block"
                                        style={{ color: primaryColor }}
                                    >
                                        {step === 'form' 
                                            ? 'Checkout de Membresía' 
                                            : step === 'otp' 
                                                ? 'Verificación de Seguridad' 
                                                : 'Confirmación Oficial'}
                                    </span>
                                    <h3 className="text-xl font-black text-slate-900 leading-tight">
                                        {step === 'form' 
                                            ? selectedPlan.name 
                                            : step === 'otp' 
                                                ? 'Código por WhatsApp' 
                                                : '¡Membresía Activada!'}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {modalPricing.hasDiscount ? (
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <span className="line-through text-slate-400 font-semibold">
                                                    ${modalPricing.originalPrice}
                                                </span>
                                                <span className="font-black text-rose-600">
                                                    ${modalPricing.finalPrice} {selectedPlan.currency || 'USD'}
                                                </span>
                                                <span className="text-slate-400 font-medium">
                                                    · {formatDuration(selectedPlan.durationDays)}
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500 font-medium">
                                                ${modalPricing.finalPrice} {selectedPlan.currency || 'USD'} · {formatDuration(selectedPlan.durationDays)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="size-9 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shadow-sm"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Cuerpo del Modal con Scroll */}
                            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                                
                                {/* Alerta de Error Común */}
                                {errorMessage && (
                                    <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 animate-in fade-in">
                                        <AlertCircle size={16} className="shrink-0 text-red-500" />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}

                                {step === 'form' && (
                                    <div className="space-y-5">
                                        {/* SECCIÓN 1: DATOS DEL SOCIO */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                                                <User size={14} style={{ color: primaryColor }} />
                                                <span>1. Datos del Socio</span>
                                            </div>

                                            <div className="space-y-3">
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
                                                        className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                                                    />
                                                </div>

                                                <div>
                                                    <PhoneInput 
                                                        value={formData.telefono} 
                                                        onChange={(val) => setFormData({ ...formData, telefono: val })} 
                                                        darkMode={false} 
                                                        label="WhatsApp / Móvil *" 
                                                        placeholder="099 123 4567" 
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-1 ml-1">
                                                        Te enviaremos un código OTP a este número para confirmar tu pase de acceso.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RESUMEN DE LA MEMBRESÍA Y PRECIO TRANSPARENTE */}
                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                                            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-700">
                                                <span>Resumen de tu Membresía</span>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {formatDuration(selectedPlan.durationDays)}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between items-center text-slate-600">
                                                    <span>Plan: {selectedPlan.name}</span>
                                                    <span className="font-semibold text-slate-800">
                                                        ${modalPricing.originalPrice.toFixed(2)}
                                                    </span>
                                                </div>

                                                {modalPricing.hasDiscount && (
                                                    <div className="flex justify-between items-center text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-lg">
                                                        <span className="flex items-center gap-1">
                                                            <Tag size={12} />
                                                            Descuento ({modalPricing.promoTitle || 'Promoción'})
                                                        </span>
                                                        <span>-${modalPricing.discount.toFixed(2)}</span>
                                                    </div>
                                                )}

                                                {modalPricing.isFreeRegistration && (
                                                    <div className="flex justify-between items-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                                                        <span className="flex items-center gap-1">
                                                            <Sparkles size={12} />
                                                            Inscripción / Matrícula
                                                        </span>
                                                        <span>¡GRATIS ($0.00)!</span>
                                                    </div>
                                                )}

                                                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                                                    <span className="font-black text-slate-900 text-sm">Total a Pagar:</span>
                                                    <div className="text-right">
                                                        <span className="text-2xl font-black text-slate-900">
                                                            ${modalPricing.finalPrice.toFixed(2)}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                                                            {selectedPlan.currency || 'USD'}
                                                        </span>
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
                                                    </div>
                                                </div>
                                            )}

                                            {paymentMethod === 'RECEPCION_EFECTIVO' && (
                                                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-2 animate-in fade-in">
                                                    <div className="flex items-center gap-2 font-black text-xs uppercase">
                                                        <Banknote size={16} className="text-amber-600" />
                                                        <span>Pago al Primer Ingreso</span>
                                                    </div>
                                                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                                                        Tu membresía se pre-activará y tu código QR se creará de inmediato al confirmar el OTP. Podrás pagar en recepción al ingresar.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ══════════════════════════════════════════════════════ */}
                                {/* PASO 2: VERIFICACIÓN OTP POR WHATSAPP                  */}
                                {/* ══════════════════════════════════════════════════════ */}
                                {step === 'otp' && (
                                    <div className="space-y-6 py-2 text-center animate-in fade-in slide-in-from-right-3">
                                        <div 
                                            className="size-16 rounded-3xl mx-auto flex items-center justify-center shadow-lg"
                                            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                                        >
                                            <KeyRound size={32} />
                                        </div>

                                        <div className="space-y-1.5">
                                            <h4 className="text-xl font-black text-slate-900 tracking-tight">
                                                Introduce el Código
                                            </h4>
                                            <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                                Enviamos un código de seguridad de 6 dígitos a tu WhatsApp:
                                            </p>
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-mono font-bold mt-1">
                                                <span>{formData.telefono}</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setStep('form')}
                                                    className="text-blue-600 hover:underline text-[10px] font-sans font-bold"
                                                >
                                                    Cambiar
                                                </button>
                                            </div>
                                        </div>

                                        {/* Boxes individuales de OTP */}
                                        <div className="relative max-w-xs mx-auto">
                                            <div className="flex justify-between items-center gap-2">
                                                {[0, 1, 2, 3, 4, 5].map((idx) => {
                                                    const char = otpCode.replace(/\D/g, '')[idx] || '';
                                                    const isActive = otpCode.replace(/\D/g, '').length === idx;
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`flex-1 h-14 bg-white border-2 rounded-2xl flex items-center justify-center text-2xl font-black transition-all ${
                                                                char 
                                                                    ? 'text-slate-900 border-slate-400 shadow-sm' 
                                                                    : 'bg-slate-50 border-slate-200 text-slate-300'
                                                            }`}
                                                            style={{ borderColor: (isActive || char) ? primaryColor : undefined }}
                                                        >
                                                            {char}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <input 
                                                type="text" 
                                                inputMode="numeric" 
                                                pattern="[0-9]*" 
                                                autoFocus 
                                                maxLength={6} 
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                                                value={otpCode} 
                                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                                            />
                                        </div>

                                        {/* Resumen Compacto de la Compra */}
                                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                                            <span className="font-medium">Plan: <strong>{selectedPlan.name}</strong></span>
                                            <span className="font-black text-slate-900">Total: ${modalPricing.finalPrice.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* ══════════════════════════════════════════════════════ */}
                                {/* PANTALLA DE ÉXITO                                      */}
                                {/* ══════════════════════════════════════════════════════ */}
                                {step === 'success' && (
                                    <div className="text-center py-2 space-y-5 animate-in zoom-in-95">
                                        <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                                            <Check size={36} strokeWidth={3} />
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                                ¡Adquisición Confirmada con Éxito!
                                            </span>
                                            <h4 className="text-2xl font-black text-slate-900 mt-1">
                                                ¡Bienvenido a {businessName || 'nuestro Club'}!
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                                                Tu membresía <strong className="text-slate-900">{selectedPlan.name}</strong> ha sido verificada y activada.
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
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Total:</span>
                                                <span className="font-black text-slate-900">
                                                    ${modalPricing.finalPrice.toFixed(2)} {selectedPlan.currency || 'USD'}
                                                    {modalPricing.hasDiscount && (
                                                        <span className="text-[10px] font-bold text-rose-600 ml-1.5">
                                                            (Ahorro de ${modalPricing.discount})
                                                        </span>
                                                    )}
                                                </span>
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

                            {/* ══════════════════════════════════════════════════════ */}
                            {/* FOOTER FLOTANTE / STICKY EN EL PIE DEL MODAL           */}
                            {/* ══════════════════════════════════════════════════════ */}
                            {step === 'form' && (
                                <div className="p-4 sm:p-5 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] shrink-0 space-y-2">
                                    <button
                                        type="button"
                                        onClick={handleRequestOtp}
                                        disabled={isSendingOtp}
                                        className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {isSendingOtp ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                        ) : (
                                            <>
                                                <span>
                                                    {modalPricing.finalPrice === 0
                                                        ? '¡Pagar $0 y Activar Gratis!'
                                                        : paymentMethod === 'TARJETA_ONLINE' 
                                                            ? `Pagar $${modalPricing.finalPrice.toFixed(2)} y Activar` 
                                                            : paymentMethod === 'TRANSFERENCIA'
                                                                ? `Confirmar Transferencia ($${modalPricing.finalPrice.toFixed(2)})`
                                                                : `Pagar $${modalPricing.finalPrice.toFixed(2)} en Recepción`}
                                                </span>
                                                <ArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                    <p className="text-center text-[10px] text-slate-400">
                                        Al pulsar recibirás un código de confirmación por WhatsApp para activar tu pase.
                                    </p>
                                </div>
                            )}

                            {step === 'otp' && (
                                <div className="p-4 sm:p-5 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] shrink-0 space-y-2">
                                    <button
                                        type="button"
                                        onClick={handleVerifyOtpAndCheckout}
                                        disabled={isVerifyingOtp || otpCode.replace(/\D/g, '').length < 4}
                                        className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {isVerifyingOtp ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                        ) : (
                                            <>
                                                <span>Confirmar Adquisición</span>
                                                <ArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                    <div className="flex items-center justify-between px-1">
                                        <button
                                            type="button"
                                            onClick={() => setStep('form')}
                                            className="text-[11px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
                                        >
                                            <ArrowLeft size={13} />
                                            <span>Modificar datos</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={otpCountdown > 0 || isSendingOtp}
                                            onClick={handleResendOtp}
                                            className="text-[11px] font-bold disabled:text-slate-300 text-blue-600 hover:text-blue-700 transition-colors"
                                        >
                                            {otpCountdown > 0 ? `Reenviar en ${otpCountdown}s` : 'Reenviar código'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </section>
    );
}
