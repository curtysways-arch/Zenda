"use client";

import { useState, useEffect } from "react";
import {
    X,
    Check,
    Zap,
    Calendar,
    Trophy,
    MapPin,
    Loader2,
    ArrowRight
} from "lucide-react";

interface Plan {
    id: string;
    name: string;
    description: string | null;
    price: number;
    trial_days: number;
    max_fields: number;
    max_reservations_per_month: number;
    tournaments_enabled: boolean;
    max_locations: number;
}

interface PlanUpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    availablePlans: Plan[];
    currentPlanId?: string | null;
    initialSelectedPlanId?: string | null;
    businessName: string;
    businessId: string;
    adminWhatsApp: string;
    planStatus: string;
    billingPeriod: 'monthly' | 'annual';
}

export default function PlanUpgradeModal({
    isOpen,
    onClose,
    availablePlans,
    currentPlanId,
    initialSelectedPlanId,
    businessName,
    businessId,
    adminWhatsApp,
    planStatus,
    billingPeriod
}: PlanUpgradeModalProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'tarjeta' | 'transferencia' | null>(null);
    const [successMessage, setSuccessMessage] = useState(false);

    useEffect(() => {
        if (isOpen && initialSelectedPlanId) {
            const plan = availablePlans.find(p => p.id === initialSelectedPlanId);
            if (plan) setSelectedPlan(plan);
        } else if (!isOpen) {
            setSelectedPlan(null);
            setPaymentMethod(null);
        }
    }, [isOpen, initialSelectedPlanId, availablePlans]);

    if (!isOpen) return null;

    const handleConfirmUpgrade = async () => {
        if (!selectedPlan || !paymentMethod) return;

        setLoading(true);
        try {
            const res = await fetch('/api/admin/plan/solicitar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: selectedPlan.id,
                    metodoPago: paymentMethod,
                    periodo: billingPeriod
                })
            });

            if (res.ok) {
                setSuccessMessage(true);
                
                // Abrir WhatsApp con la notificación
                const cleanPhone = adminWhatsApp.replace(/\D/g, '');
                const textMessage = `👋 Hola, solicito una mejora de mi plan en *${businessName}*.\n\n` +
                                `📋 *Plan Solicitado:* ${selectedPlan.name} (${billingPeriod.toUpperCase()})\n` +
                                `💳 *Método de Pago:* ${paymentMethod === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}\n` +
                                `Por favor indícame los pasos para completar el pago.`;
                const wpUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`;
                window.open(wpUrl, '_blank');

                setTimeout(() => {
                    setSuccessMessage(false);
                    setSelectedPlan(null);
                    onClose();
                    window.location.reload();
                }, 4000);
            } else {
                alert('No se pudo procesar la solicitud.');
            }
        } catch (error) {
            console.error(error);
            alert('Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    if (successMessage) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-12 flex flex-col items-center text-center">
                    <div className="size-20 rounded-full flex items-center justify-center mb-6 ring-8"
                         style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)', ringColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)' } as any}>
                        <Check size={40} strokeWidth={3} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">¡Solicitud Enviada!</h3>
                    <p className="text-slate-500 font-medium">Hemos notificado al equipo de administración para activar tu plan <b>{selectedPlan?.name}</b>.</p>
                </div>
            </div>
        );
    }

    if (selectedPlan) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Confirmar Activación</h3>
                            <p className="text-slate-500 text-sm font-medium mt-1">Plan: <b style={{ color: 'var(--primary-color)' }}>{selectedPlan.name}</b> <span className="text-[10px] px-2 py-0.5 rounded-full ml-1 uppercase" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}>{billingPeriod === 'annual' ? 'Anual' : 'Mensual'}</span></p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group"
                            disabled={loading}
                        >
                            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    <div className="p-8 bg-slate-50 space-y-6">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-800 font-medium leading-relaxed italic">
                            El equipo administrador validará tu pago y activará tu plan al instante.
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Método de Pago</label>
                            <div className="grid grid-cols-2 gap-4">
                                 <button
                                    onClick={() => setPaymentMethod('transferencia')}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'transferencia' ? '' : 'border-white bg-white hover:border-slate-200'}`}
                                    style={paymentMethod === 'transferencia' ? { borderColor: 'var(--primary-color)', backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)' } : {}}
                                >
                                    <div className={`p-3 rounded-full transition-all`}
                                         style={paymentMethod === 'transferencia' ? { backgroundColor: 'var(--primary-color)', color: 'white' } : { backgroundColor: 'rgb(241, 245, 249)', color: 'rgb(148, 163, 184)' }}>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                                    </div>
                                    <span className="font-black text-[10px] uppercase">Transferencia</span>
                                </button>
                                 <button
                                    onClick={() => setPaymentMethod('tarjeta')}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'tarjeta' ? '' : 'border-white bg-white hover:border-slate-200'}`}
                                    style={paymentMethod === 'tarjeta' ? { borderColor: 'var(--primary-color)', backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)' } : {}}
                                >
                                    <div className={`p-3 rounded-full transition-all`}
                                         style={paymentMethod === 'tarjeta' ? { backgroundColor: 'var(--primary-color)', color: 'white' } : { backgroundColor: 'rgb(241, 245, 249)', color: 'rgb(148, 163, 184)' }}>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                    </div>
                                    <span className="font-black text-[10px] uppercase">Tarjeta</span>
                                </button>
                            </div>
                        </div>

                         <button
                            onClick={handleConfirmUpgrade}
                            disabled={!paymentMethod || loading}
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${!paymentMethod || loading ? 'bg-slate-200 text-slate-400' : 'text-white shadow-xl active:scale-95'}`}
                            style={!paymentMethod || loading ? {} : { backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--primary-color), transparent 80%)' }}
                            onMouseEnter={(e) => { if (paymentMethod && !loading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                            onMouseLeave={(e) => { if (paymentMethod && !loading) e.currentTarget.style.filter = 'none'; }}
                        >
                            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Confirmar y Notificar Pago'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // El modal normal solo se mostraría si por alguna razón no hay plan selecccionado (fallback)
    return null;
}
