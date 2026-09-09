'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, 
    UploadCloud, 
    Landmark, 
    CheckCircle2, 
    Loader2, 
    Calendar, 
    Copy, 
    Check, 
    Plus, 
    Minus, 
    ShieldCheck, 
    Sparkles 
} from 'lucide-react';

interface DbAccount {
    id: string;
    banco: string;
    numeroCuenta: string;
    nombreCuenta: string;
    logo: string | null;
}

interface AddonCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    addon: any;
    subscriptionDates?: {
        startDate?: string | Date | null;
        endDate?: string | Date | null;
    };
    onSuccess: () => void;
}

export default function AddonCheckoutModal({
    isOpen,
    onClose,
    addon,
    subscriptionDates,
    onSuccess
}: AddonCheckoutModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [metodo, setMetodo] = useState<'TRANSFERENCIA' | 'DEUNA'>('TRANSFERENCIA');
    const [referencia, setReferencia] = useState('');
    const [comprobanteBase64, setComprobanteBase64] = useState('');
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

    // Cuentas de banco
    const [dbAccounts, setDbAccounts] = useState<DbAccount[]>([]);
    const [selectedAccountIndex, setSelectedAccountIndex] = useState<number>(0);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setReferencia('');
            setComprobanteBase64('');
            setFileName('');
            setSuccess(false);

            const fetchAccounts = async () => {
                setLoadingAccounts(true);
                try {
                    const res = await fetch('/api/public/cuentas-pago');
                    if (res.ok) {
                        const data = await res.json();
                        setDbAccounts(data);
                        if (data.length > 0) setSelectedAccountIndex(0);
                    }
                } catch (err) {
                    console.error('Error cargando cuentas bancarias:', err);
                } finally {
                    setLoadingAccounts(false);
                }
            };
            fetchAccounts();
        }
    }, [isOpen]);

    // Cálculo de prorrateo
    const proration = useMemo(() => {
        if (!addon) return { proratedAmount: 0, daysRemaining: 30, totalDaysInCycle: 30, isProrated: false };
        const priceMonthly = Number(addon.priceMonthly || 0);
        const totalPrice = priceMonthly * quantity;

        const now = new Date();
        const startDate = subscriptionDates?.startDate ? new Date(subscriptionDates.startDate) : null;
        const endDate = subscriptionDates?.endDate ? new Date(subscriptionDates.endDate) : null;

        if (!startDate || !endDate || endDate <= now) {
            return {
                proratedAmount: totalPrice,
                daysRemaining: 30,
                totalDaysInCycle: 30,
                isProrated: false
            };
        }

        const totalMs = Math.max(1000 * 60 * 60 * 24, endDate.getTime() - startDate.getTime());
        const remainingMs = Math.max(0, endDate.getTime() - now.getTime());

        const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
        const remainingDays = Math.max(1, Math.min(totalDays, Math.ceil(remainingMs / (1000 * 60 * 60 * 24))));

        const prorated = (totalPrice * remainingDays) / totalDays;
        const roundedProrated = Math.max(1.00, Number(prorated.toFixed(2)));

        return {
            proratedAmount: roundedProrated,
            daysRemaining: remainingDays,
            totalDaysInCycle: totalDays,
            isProrated: remainingDays < totalDays
        };
    }, [addon, quantity, subscriptionDates]);

    if (!isOpen || !addon) return null;

    const maxQty = addon.stackable ? (addon.maxQuantity || 10) : 1;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setComprobanteBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedAccount(id);
        setTimeout(() => setCopiedAccount(null), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comprobanteBase64 && !referencia) {
            alert('Por favor adjunta el comprobante de pago o ingresa el número de referencia.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/admin/addons/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    addonCodeOrId: addon.code || addon.id,
                    quantity,
                    metodoPago: metodo,
                    referencia: referencia.trim() || undefined,
                    comprobanteUrl: comprobanteBase64 || undefined
                })
            });

            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2200);
            } else {
                alert(data.error || 'Error al procesar la solicitud');
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión al enviar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    const selectedAccount = dbAccounts[selectedAccountIndex];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 max-w-2xl w-full max-h-[90vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300">
                                    {addon.type === 'LIMIT' ? 'Extensión de Límite' : 'Capacidad de Módulo'}
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                                Contratar {addon.name}
                            </h3>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Contenido scrolleable */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
                    {success ? (
                        <div className="py-12 text-center space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                                <CheckCircle2 size={36} />
                            </div>
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                ¡Solicitud Registrada!
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                                Hemos recibido tu comprobante de pago. Tu Add-on se activará de forma automática en cuanto nuestro equipo confirme la acreditación.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Selector de cantidad (si es stackable) */}
                            {addon.stackable && (
                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block">
                                            Cantidad a Contratar
                                        </span>
                                        <span className="text-[11px] text-slate-500">
                                            Límite máximo permitido: {maxQty} unidades
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            disabled={quantity <= 1}
                                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="font-mono font-black text-lg text-slate-900 dark:text-white min-w-[24px] text-center">
                                            {quantity}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={quantity >= maxQty}
                                            onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                                            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Tarjeta de Resumen y Prorrateo */}
                            <div className="p-5 rounded-3xl bg-linear-to-br from-purple-500/10 via-slate-50 to-emerald-500/10 dark:from-purple-950/30 dark:via-slate-900 dark:to-emerald-950/30 border border-purple-200/50 dark:border-purple-500/20 space-y-3">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={14} className="text-purple-500" />
                                        Días restantes del ciclo actual:
                                    </span>
                                    <span className="font-black text-slate-900 dark:text-white">
                                        {proration.daysRemaining} de {proration.totalDaysInCycle} días
                                    </span>
                                </div>

                                <div className="flex items-baseline justify-between pt-2 border-t border-slate-200/60 dark:border-white/10">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                            Monto a Pagar Ahora (Prorrateado)
                                        </span>
                                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                            ${proration.proratedAmount.toFixed(2)} USD
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                            Próxima Renovación
                                        </span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            ${(Number(addon.priceMonthly || 0) * quantity).toFixed(2)}/mes
                                        </span>
                                    </div>
                                </div>

                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight italic">
                                    * Solo pagas los días restantes hasta tu próximo corte. Tu precio base de plan no sufrirá modificaciones.
                                </p>
                            </div>

                            {/* Método de Pago */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Método de Pago
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setMetodo('TRANSFERENCIA')}
                                        className={`p-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                            metodo === 'TRANSFERENCIA'
                                                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Landmark size={16} />
                                        Transferencia
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMetodo('DEUNA')}
                                        className={`p-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                            metodo === 'DEUNA'
                                                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Sparkles size={16} />
                                        DeUna (QR)
                                    </button>
                                </div>
                            </div>

                            {/* Cuentas de banco */}
                            {loadingAccounts ? (
                                <div className="p-4 text-center text-slate-400 text-xs">
                                    <Loader2 size={16} className="animate-spin inline mr-2" />
                                    Cargando cuentas bancarias...
                                </div>
                            ) : dbAccounts.length > 0 && selectedAccount && (
                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Cuenta Oficial de Recepción Citiox
                                        </span>
                                        {dbAccounts.length > 1 && (
                                            <select
                                                value={selectedAccountIndex}
                                                onChange={e => setSelectedAccountIndex(Number(e.target.value))}
                                                className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1"
                                            >
                                                {dbAccounts.map((acc, i) => (
                                                    <option key={acc.id} value={i}>
                                                        {acc.banco}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-bold text-sm text-slate-900 dark:text-white block">
                                                {selectedAccount.banco}
                                            </span>
                                            <span className="text-xs text-slate-500 block">
                                                Titular: {selectedAccount.nombreCuenta}
                                            </span>
                                            <span className="font-mono font-black text-sm text-purple-600 dark:text-purple-400">
                                                {selectedAccount.numeroCuenta}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(selectedAccount.numeroCuenta, selectedAccount.id)}
                                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
                                        >
                                            {copiedAccount === selectedAccount.id ? (
                                                <>
                                                    <Check size={14} className="text-emerald-500" />
                                                    Copiado
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={14} />
                                                    Copiar Cuenta
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Referencia */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Nº de Referencia / Comprobante
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: 12345678"
                                    value={referencia}
                                    onChange={e => setReferencia(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            {/* Comprobante de pago */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Adjuntar Comprobante (Imagen o PDF)
                                </label>
                                <div className="relative border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-4 text-center transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center justify-center space-y-1">
                                        <UploadCloud size={24} className="text-purple-500" />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {fileName ? fileName : 'Seleccionar archivo o arrastrar aquí'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            Formatos JPG, PNG, WEBP o PDF
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Botón de envío */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Enviando Solicitud...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck size={16} />
                                            Confirmar y Enviar Solicitud (${proration.proratedAmount.toFixed(2)})
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
