'use client';

import React, { useState } from 'react';
import { Truck, UserCheck, RefreshCw, MapPin, DollarSign, CheckCircle, Clock, ShieldCheck } from 'lucide-react';
import { getCanonicalLogistics } from '@/core/logistics/CanonicalLogisticsService';

interface DeliveryCardProps {
  order?: any;
  deliveryAssignment?: {
    id: string;
    tipo: string;
    estado: string;
    resource?: {
      id: string;
      name: string;
      profile?: {
        telefono?: string;
        vehiculo?: string;
      };
    };
  } | null;
  approvedDrivers: Array<{
    id: string;
    name: string;
    profile?: {
      tipoVehiculo?: string;
      vehiculo?: string;
    };
  }>;
  selectedDriverId?: string;
  onChangeDriver: (driverId: string) => void;
  onPayCompensation?: (missionType: 'RECOGIDA' | 'ENTREGA') => Promise<void>;
}

export function DeliveryCard({
  order,
  deliveryAssignment,
  approvedDrivers,
  selectedDriverId,
  onChangeDriver,
  onPayCompensation,
}: DeliveryCardProps) {
  const [loadingPay, setLoadingPay] = useState<string | null>(null);

  const isAssignmentCompleted = deliveryAssignment?.estado === 'COMPLETADO';
  const activeDriver = !isAssignmentCompleted && deliveryAssignment?.estado === 'ASIGNADO' ? deliveryAssignment?.resource : null;
  const previousDriver = isAssignmentCompleted ? deliveryAssignment?.resource : null;

  const canonical = order ? getCanonicalLogistics(order) : null;
  const pickupFee = canonical?.pickupFee ?? 2.00;
  const deliveryFee = canonical?.deliveryFee ?? 2.00;

  const pickupDriver = canonical?.pickupDriver;
  const deliveryDriver = canonical?.deliveryDriver;

  const isPickupPaid = pickupDriver?.estadoCompensacion === 'PAID' || order?.extraInfo?.pickupCompensacionEstado === 'PAID';
  const pickupDriverName = pickupDriver?.driverName || previousDriver?.name || activeDriver?.name;

  const isDeliveryPaid = deliveryDriver?.estadoCompensacion === 'PAID' || order?.extraInfo?.deliveryCompensacionEstado === 'PAID';
  const deliveryDriverName = deliveryDriver?.driverName || (deliveryAssignment?.tipo === 'ENTREGA' ? deliveryAssignment?.resource?.name : null);
  const hasDeliveryDriver = Boolean(deliveryDriverName && deliveryDriverName !== 'Pendiente de asignación');

  const handlePay = async (type: 'RECOGIDA' | 'ENTREGA') => {
    if (!onPayCompensation) return;
    setLoadingPay(type);
    try {
      await onPayCompensation(type);
    } finally {
      setLoadingPay(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-600" /> Logística &amp; Choferes
        </h3>
        <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-full">
          Desacoplado Canónico
        </span>
      </div>

      {/* BANNER INFORMATIVO DE RECAUDACIÓN: $0 AL CLIENTE */}
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-emerald-950 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Recaudación del Cliente en Puerta:</span>
        </div>
        <span className="font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
          $0.00 (Pagado al negocio)
        </span>
      </div>

      {/* DESGLOSE DE CHOFERES (RECOGIDA Y ENTREGA) */}
      <div className="space-y-3">
        {/* DRIVER A: RECOGIDA / RETIRO */}
        <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-950 flex items-center gap-1.5 uppercase text-xs tracking-wider">
              🧺 Chofer Retiro (Driver A)
            </span>
            <span className="font-mono font-bold text-purple-700">
              Compensación: +${pickupFee.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-purple-100">
            <div>
              <p className="font-bold text-slate-900">
                {pickupDriverName || 'Asignado en fase de retiro'}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Estado Pago: {isPickupPaid ? (
                  <span className="text-emerald-600 font-bold">✅ Pagado (${pickupFee.toFixed(2)})</span>
                ) : (
                  <span className="text-amber-600 font-bold">⏳ Pendiente de pago</span>
                )}
              </p>
            </div>
            {!isPickupPaid && onPayCompensation ? (
              <button
                type="button"
                onClick={() => handlePay('RECOGIDA')}
                disabled={loadingPay === 'RECOGIDA'}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {loadingPay === 'RECOGIDA' ? 'Procesando...' : `Pagar +$${pickupFee.toFixed(2)}`}
              </button>
            ) : isPickupPaid ? (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg uppercase">
                Liquidado
              </span>
            ) : null}
          </div>
        </div>

        {/* DRIVER B: ENTREGA FINAL */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-950 flex items-center gap-1.5 uppercase text-xs tracking-wider">
              ✨ Chofer Entrega (Driver B)
            </span>
            <span className="font-mono font-bold text-blue-700">
              Compensación: +${deliveryFee.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-blue-100">
            <div>
              <p className="font-bold text-slate-900">
                {deliveryDriverName || 'Pendiente de asignación'}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Estado Pago: {isDeliveryPaid ? (
                  <span className="text-emerald-600 font-bold">✅ Pagado (${deliveryFee.toFixed(2)})</span>
                ) : hasDeliveryDriver ? (
                  <span className="text-amber-600 font-bold">⏳ Pendiente de pago</span>
                ) : (
                  <span className="text-slate-400 ">Esperando asignación</span>
                )}
              </p>
            </div>
            {hasDeliveryDriver ? (
              !isDeliveryPaid && onPayCompensation ? (
                <button
                  type="button"
                  onClick={() => handlePay('ENTREGA')}
                  disabled={loadingPay === 'ENTREGA'}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md shadow-blue-600/20 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loadingPay === 'ENTREGA' ? 'Procesando...' : `Pagar +$${deliveryFee.toFixed(2)}`}
                </button>
              ) : (
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg uppercase">
                  Liquidado
                </span>
              )
            ) : (
              <span className="px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold rounded-lg cursor-not-allowed" title="Asigna un chofer de entrega antes de liquidar">
                Sin chofer
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ASIGNAR / REASIGNAR REPARTIDOR ACTIVO */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
        <label className="block text-slate-700 font-bold">Asignar o Cambiar Repartidor</label>
        <select
          value={selectedDriverId || activeDriver?.id || ''}
          onChange={e => onChangeDriver(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none"
        >
          <option value="">-- Seleccionar repartidor --</option>
          {approvedDrivers.map(d => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.profile?.vehiculo || d.profile?.tipoVehiculo || 'Repartidor'})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
