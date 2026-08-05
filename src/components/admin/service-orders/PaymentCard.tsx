import React, { useState } from 'react';
import { CreditCard, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';

interface PaymentCardProps {
  total: number;
  payment?: {
    paymentMethod?: string;
    amount?: number;
    status?: string;
  } | null;
  onRegisterPayment: (metodo: string, estadoPago: string) => void;
}

export function PaymentCard({ total, payment, onRegisterPayment }: PaymentCardProps) {
  const [metodo, setMetodo] = useState(payment?.paymentMethod || 'EFECTIVO');
  const [estadoPago, setEstadoPago] = useState(payment?.status || 'PENDIENTE');

  const isPaid = payment?.status === 'PAGO_CONFIRMADO' || estadoPago === 'PAGO_CONFIRMADO';

  const handleSave = () => {
    onRegisterPayment(metodo, estadoPago);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600" /> Estado de Pago & Caja
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          isPaid ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
        }`}>
          {isPaid ? '✓ PAGADO' : '⏳ PENDIENTE'}
        </span>
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 font-semibold">Total Cobrar:</span>
          <span className="text-xl font-black text-slate-900 font-mono">${total.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Método de Pago</label>
            <select
              value={metodo}
              onChange={e => setMetodo(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none"
            >
              <option value="EFECTIVO">💵 Efectivo</option>
              <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
              <option value="TARJETA">💳 Tarjeta Crédito/Débito</option>
              <option value="MIXTO">🔀 Pago Mixto</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Estado de Pago</label>
            <select
              value={estadoPago}
              onChange={e => setEstadoPago(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none"
            >
              <option value="PENDIENTE">⏳ Pendiente</option>
              <option value="PARCIAL">🌗 Pago Parcial</option>
              <option value="PAGO_CONFIRMADO">✅ Pagado & Confirmado</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
        >
          Guardar Registro de Pago
        </button>
      </div>
    </div>
  );
}
