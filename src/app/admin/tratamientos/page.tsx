'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Activity, Search, Filter, ChevronRight, Loader2, 
  CheckCircle2, Clock, XCircle, AlertCircle
} from 'lucide-react';

export default function TratamientosGlobalPage() {
  const [treatments, setTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadTreatments = async () => {
    setLoading(true);
    try {
      const url = estadoFilter !== 'ALL' 
        ? `/api/admin/dental/treatments?estado=${estadoFilter}` 
        : '/api/admin/dental/treatments';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTreatments(data.treatments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTreatments();
  }, [estadoFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/dental/treatments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: newStatus })
      });
      if (res.ok) {
        await loadTreatments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = treatments.filter(t => {
    const term = searchTerm.toLowerCase();
    const paciente = (t.ClinicalRecord?.Cliente?.nombre || '').toLowerCase();
    const desc = (t.descripcion || '').toLowerCase();
    const diente = (t.diente || '').toLowerCase();
    return paciente.includes(term) || desc.includes(term) || diente.includes(term);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Activity className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900">Planes de Tratamiento Dental</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Seguimiento de procedimientos odontológicos presupuestados y realizados por paciente.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por paciente, procedimiento o diente..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="PLANIFICADO">Planificados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="EN_PROCESO">En Proceso</option>
            <option value="REALIZADO">Realizados</option>
            <option value="CANCELADO">Cancelados</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cargando tratamientos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No hay tratamientos registrados</h3>
          <p className="text-xs text-slate-400 mt-1">
            Los procedimientos agregados desde las fichas de los pacientes aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs divide-y divide-slate-100">
          {filtered.map((tr) => {
            const isDone = tr.estado === 'REALIZADO';
            return (
              <div key={tr.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {tr.diente && (
                      <span className="px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-800 text-xs font-black">
                        Pieza #{tr.diente} {tr.superficies ? `(${tr.superficies})` : ''}
                      </span>
                    )}
                    <h4 className={`text-base font-extrabold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {tr.descripcion}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-bold text-slate-700">
                      Paciente: {tr.ClinicalRecord?.Cliente?.nombre || 'Paciente'}
                    </span>
                    {tr.costoEstimado != null && (
                      <span>• Presupuesto: ${Number(tr.costoEstimado).toFixed(2)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={tr.estado}
                    onChange={(e) => handleStatusChange(tr.id, e.target.value)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="PLANIFICADO">Planificado</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_PROCESO">En Proceso</option>
                    <option value="REALIZADO">Realizado</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>

                  {tr.ClinicalRecord?.clienteId && (
                    <Link
                      href={`/admin/pacientes/${tr.ClinicalRecord.clienteId}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                    >
                      Ficha
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
