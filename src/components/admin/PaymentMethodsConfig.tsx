'use client';

import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    Building2,
    QrCode,
    Save,
    CheckCircle,
    AlertCircle,
    Loader2,
    ToggleLeft,
    ToggleRight,
    HelpCircle
} from 'lucide-react';

interface PaymentMethodData {
    id?: string;
    enabled: boolean;
    customName: string;
    banco: string;
    titular: string;
    numeroCuenta: string;
    tipoCuenta: string;
    identificacion: string;
    qrImageUrl: string;
    instructions: string;
}

export default function PaymentMethodsConfig() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [formData, setFormData] = useState<PaymentMethodData>({
        enabled: true,
        customName: 'Transferencia Bancaria Directa',
        banco: 'Banco Pichincha',
        titular: '',
        numeroCuenta: '',
        tipoCuenta: 'Ahorros',
        identificacion: '',
        qrImageUrl: '',
        instructions: 'Por favor realiza la transferencia bancaria por el monto exacto de tu pedido y sube el comprobante.'
    });

    useEffect(() => {
        fetchPaymentMethod();
    }, []);

    const fetchPaymentMethod = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/payment-methods');
            const data = await res.json();
            if (data.success && data.method) {
                setFormData({
                    enabled: data.method.enabled ?? true,
                    customName: data.method.customName || 'Transferencia Bancaria Directa',
                    banco: data.method.banco || '',
                    titular: data.method.titular || '',
                    numeroCuenta: data.method.numeroCuenta || '',
                    tipoCuenta: data.method.tipoCuenta || 'Ahorros',
                    identificacion: data.method.identificacion || '',
                    qrImageUrl: data.method.qrImageUrl || '',
                    instructions: data.method.instructions || ''
                });
            }
        } catch (error) {
            console.error('Error al cargar configuración de pago:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/payment-methods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: '¡Configuración de pagos guardada con éxito!' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Error al guardar.' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error de red al guardar los cambios.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                <span className="ml-3 text-slate-400">Cargando métodos de pago...</span>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 bg-slate-900/90 rounded-2xl border border-slate-800 text-slate-100 shadow-xl">
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500 border border-orange-500/20">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Métodos de Pago & Cuentas Bancarias</h2>
                        <p className="text-sm text-slate-400">Configura la información bancaria para transferencias en el módulo Pinchos</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                        formData.enabled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                    }`}
                >
                    {formData.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    {formData.enabled ? 'Método Activo' : 'Método Inactivo'}
                </button>
            </div>

            {message && (
                <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 border ${
                    message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Banco */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Nombre del Banco *
                        </label>
                        <div className="relative">
                            <Building2 className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                required
                                value={formData.banco}
                                onChange={e => setFormData({ ...formData, banco: e.target.value })}
                                placeholder="Ej: Banco Pichincha, Guayaquil, Produbanco"
                                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Titular */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Nombre del Titular *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.titular}
                            onChange={e => setFormData({ ...formData, titular: e.target.value })}
                            placeholder="Nombre completo o Empresa"
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                        />
                    </div>

                    {/* Número de Cuenta */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Número de Cuenta *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.numeroCuenta}
                            onChange={e => setFormData({ ...formData, numeroCuenta: e.target.value })}
                            placeholder="Ej: 2100987654"
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors font-mono"
                        />
                    </div>

                    {/* Tipo de Cuenta */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Tipo de Cuenta *
                        </label>
                        <select
                            value={formData.tipoCuenta}
                            onChange={e => setFormData({ ...formData, tipoCuenta: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                        >
                            <option value="Ahorros">Cuenta de Ahorros</option>
                            <option value="Corriente">Cuenta Corriente</option>
                        </select>
                    </div>

                    {/* Identificación RUC / Cédula */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Identificación / RUC / CI
                        </label>
                        <input
                            type="text"
                            value={formData.identificacion}
                            onChange={e => setFormData({ ...formData, identificacion: e.target.value })}
                            placeholder="Ej: 1792345678001"
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors font-mono"
                        />
                    </div>

                    {/* URL del código QR */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <QrCode className="w-4 h-4 text-orange-400" /> URL de Código QR de Pago (Opcional)
                        </label>
                        <input
                            type="text"
                            value={formData.qrImageUrl}
                            onChange={e => setFormData({ ...formData, qrImageUrl: e.target.value })}
                            placeholder="https://midominio.com/qr-pago.png"
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Instrucciones para el cliente */}
                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <HelpCircle className="w-4 h-4 text-slate-400" /> Instrucciones Adicionales para el Cliente
                    </label>
                    <textarea
                        rows={3}
                        value={formData.instructions}
                        onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                        placeholder="Escribe aquí las instrucciones de pago que verá el cliente al finalizar su pedido..."
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors text-sm"
                    />
                </div>

                {/* Botón Guardar */}
                <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? 'Guardando...' : 'Guardar Datos Bancarios'}
                    </button>
                </div>
            </form>
        </div>
    );
}
