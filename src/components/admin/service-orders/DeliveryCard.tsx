import React from 'react';
import { Truck, UserCheck, RefreshCw, MapPin } from 'lucide-react';

interface DeliveryCardProps {
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
}

export function DeliveryCard({
  deliveryAssignment,
  approvedDrivers,
  selectedDriverId,
  onChangeDriver,
}: DeliveryCardProps) {
  const currentDriver = deliveryAssignment?.resource;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-600" /> Logística & Repartidor Asignado
        </h3>
        <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-full">
          Capability: delivery
        </span>
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
        {currentDriver ? (
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                {currentDriver.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-slate-900">{currentDriver.name}</p>
                <p className="text-slate-500">{currentDriver.profile?.vehiculo || 'Repartidor Oficial'}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md uppercase">
              {deliveryAssignment?.estado || 'ASIGNADO'}
            </span>
          </div>
        ) : (
          <p className="text-slate-500 font-semibold text-center py-2">Sin repartidor asignado actualmente</p>
        )}

        <div>
          <label className="block text-slate-600 font-semibold mb-1">Cambiar / Asignar Repartidor Aprobado</label>
          <select
            value={selectedDriverId || currentDriver?.id || ''}
            onChange={e => onChangeDriver(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none"
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
    </div>
  );
}
