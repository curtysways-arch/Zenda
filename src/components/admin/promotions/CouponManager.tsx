'use client';

import React, { useState } from 'react';
import { Ticket, Plus, Copy, Check, Calendar, Users, DollarSign, Percent } from 'lucide-react';

interface CouponManagerProps {
  promotions: any[];
  onCreateCoupon: (couponData: any) => void;
}

export default function CouponManager({
  promotions,
  onCreateCoupon,
}: CouponManagerProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filtrar promociones de tipo CUPON o que tengan un código de cupón
  const coupons = promotions.filter(p => p.tipoPromo === 'CUPON' || (p.cuponCodigo && p.cuponCodigo.trim() !== ''));

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Centro de Cupones */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Ticket className="size-5 text-blue-600" />
            <h2 className="text-xl font-black text-slate-900 uppercase italic">Centro de Cupones Promocionales</h2>
          </div>
          <p className="text-slate-500 text-xs font-medium max-w-lg">
            Crea códigos de descuento personalizados (ej. <strong className="font-extrabold text-slate-800">BIENVENIDO10</strong>) para campañas digitales, influencers o comensales preferenciales.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onCreateCoupon({ tipoPromo: 'CUPON', cuponCodigo: 'PROMO10', titulo: '🎟️ Cupón de Descuento Especial' })}
          className="py-3 px-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-2xl shadow-lg shadow-blue-600/20 cursor-pointer transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus className="size-4" />
          <span>Crear Nuevo Cupón</span>
        </button>
      </div>

      {/* Lista de Cupones Activos */}
      {coupons.length === 0 ? (
        <div className="bg-slate-50 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 space-y-3">
          <div className="size-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <Ticket className="size-8" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">No tienes cupones creados aún</h3>
          <p className="text-slate-500 text-xs font-medium max-w-xs mx-auto">
            Crea tu primer código promocional como <strong className="font-extrabold text-slate-700">DESCUENTO10</strong> o <strong className="font-extrabold text-slate-700">BIENVENIDO</strong>.
          </p>
          <button
            type="button"
            onClick={() => onCreateCoupon({ tipoPromo: 'CUPON', cuponCodigo: 'DESCUENTO10', titulo: '🎟️ Cupón $3.00 OFF' })}
            className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase rounded-xl cursor-pointer transition-all inline-flex items-center gap-2"
          >
            <Plus className="size-4" /> Crear Primer Cupón
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(coupon => {
            const code = coupon.cuponCodigo || coupon.titulo;
            const isCopied = copiedCode === code;

            return (
              <div key={coupon.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase border border-blue-200">
                      Código Activo
                    </span>
                    <span className="text-xs font-black text-emerald-600">
                      ${(Number(coupon.salesGenerated) || 0).toFixed(2)} Generados
                    </span>
                  </div>

                  {/* Código Box */}
                  <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-inner">
                    <span className="font-mono font-black tracking-widest text-base text-amber-400 uppercase">
                      {code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(code)}
                      className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      {isCopied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                      <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>

                  <p className="text-slate-800 font-extrabold text-xs">{coupon.titulo}</p>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600 font-semibold">
                    <div className="flex items-center justify-between">
                      <span>Descuento:</span>
                      <span className="font-black text-slate-900">${(Number(coupon.precioPromo) || 3).toFixed(2)}</span>
                    </div>
                    {coupon.montoMinimo > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Compra Mínima:</span>
                        <span className="font-black text-slate-900">${Number(coupon.montoMinimo).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Usos Registrados:</span>
                      <span className="font-black text-blue-600">{coupon.ordersGenerated || 0} pedidos</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
