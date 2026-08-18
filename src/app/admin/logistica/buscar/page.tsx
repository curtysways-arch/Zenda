'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Filter, ShieldCheck, Star, Package, Send, ArrowLeft, RefreshCw,
  Bike, Car, Footprints, CheckCircle2, AlertCircle, Sparkles, Building2, Truck
} from 'lucide-react';

interface DirectoryDriver {
  id: string;
  resourceId: string;
  nombre: string;
  phone: string;
  tipoVehiculo: string;
  vehiculo: string;
  placa?: string;
  calificacion: number;
  entregasCompletadas: number;
  documentacionVigente: boolean;
  disponibleNuevosNegocios: boolean;
}

export default function LogisticsDirectoryPage() {
  const [drivers, setDrivers] = useState<DirectoryDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedMap, setInvitedMap] = useState<Record<string, boolean>>({});

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logistics/directory?tipoVehiculo=${vehicleFilter}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
      }
    } catch (e) {
      console.error('Error cargando directorio:', e);
    } finally {
      setLoading(false);
    }
  }, [search, vehicleFilter]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  const handleInviteToWork = async (driver: DirectoryDriver) => {
    setInvitingId(driver.id);
    try {
      const res = await fetch('/api/logistics/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverPhone: driver.phone,
          driverName: driver.nombre
        })
      });
      if (res.ok) {
        const data = await res.json();
        setInvitedMap(prev => ({ ...prev, [driver.id]: true }));
        alert(`¡Invitación enviada a ${driver.nombre}! El repartidor recibirá la solicitud en su App.`);
      } else {
        alert('No se pudo enviar la invitación');
      }
    } catch (e) {
      console.error('Error enviando invitación:', e);
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 space-y-6">
      {/* Header Nivel Superior */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/logistica"
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors cursor-pointer"
            title="Volver a Logística"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Directorio de Repartidores Citiox</h1>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-200">
                Red Verificada
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Encuentra y contrata repartidores verificados de la plataforma con documentación vigente
            </p>
          </div>
        </div>

        <button
          onClick={loadDirectory}
          className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors cursor-pointer"
          title="Actualizar directorio"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar repartidor por nombre..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 outline-none focus:border-purple-600 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Transporte:</span>
          {[
            { key: 'ALL', label: 'Todos' },
            { key: 'MOTO', label: '🛵 Moto' },
            { key: 'AUTO', label: '🚗 Auto' },
            { key: 'BICICLETA', label: '🚲 Bici' },
            { key: 'A_PIE', label: '🚶 A pie' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setVehicleFilter(t.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer whitespace-nowrap ${
                vehicleFilter === t.key
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid del Directorio Públicamente Descubrible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 font-semibold text-sm">
            Buscando repartidores disponibles en la Red Citiox...
          </div>
        ) : drivers.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-500">
            <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-sm">No se encontraron repartidores con disponibilidad activa</p>
            <p className="text-xs text-slate-400 mt-1">Los repartidores habilitan su visibilidad en el directorio desde su App /driver.</p>
          </div>
        ) : (
          drivers.map(driver => {
            const isInvited = invitedMap[driver.id];
            return (
              <div
                key={driver.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Encabezado Tarjeta */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                        {driver.nombre.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base leading-tight">{driver.nombre}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-semibold">
                          <VehicleIcon tipo={driver.tipoVehiculo} />
                          <span>{driver.vehiculo}</span>
                          {driver.placa && <span className="uppercase text-[10px] text-slate-400">({driver.placa})</span>}
                        </div>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Vigente
                    </span>
                  </div>

                  {/* Estadísticas de Calificación y Entregas */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl text-xs">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <div>
                        <span className="font-black text-slate-900">{driver.calificacion}</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">Calificación</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      <div>
                        <span className="font-black text-slate-900">{driver.entregasCompletadas}</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">Entregas</span>
                      </div>
                    </div>
                  </div>

                  {/* Distintivo de Disponibilidad */}
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Disponible para nuevos negocios</span>
                  </div>
                </div>

                {/* Botón Invitar */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleInviteToWork(driver)}
                    disabled={invitingId === driver.id || isInvited}
                    className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
                      isInvited
                        ? 'bg-slate-100 text-slate-500 border border-slate-200'
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20'
                    }`}
                  >
                    {isInvited ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Invitación Enviada</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{invitingId === driver.id ? 'Enviando...' : 'Invitar a Trabajar'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function VehicleIcon({ tipo }: { tipo?: string }) {
  if (tipo === 'AUTO') return <Car className="w-4 h-4 text-blue-500" />;
  if (tipo === 'BICICLETA') return <Bike className="w-4 h-4 text-emerald-500" />;
  if (tipo === 'A_PIE') return <Footprints className="w-4 h-4 text-amber-500" />;
  return <Bike className="w-4 h-4 text-purple-500" />;
}
