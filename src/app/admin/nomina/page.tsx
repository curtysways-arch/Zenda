'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, Loader2, DollarSign, Calendar, FileText, CheckCircle2 } from 'lucide-react';

export default function AdminNominaPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SLIPS' | 'EMPLOYEES'>('SLIPS');

  // Modal Empleado
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [taxId, setTaxId] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [baseSalary, setBaseSalary] = useState('460.00');

  // Modal Liquidación Rol
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [period, setPeriod] = useState('2026-10');
  const [extraHours, setExtraHours] = useState('0');
  const [bonuses, setBonuses] = useState('0');
  const [advances, setAdvances] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/nomina');
      if (res.ok) {
        const d = await res.json();
        setEmployees(d.employees || []);
        setSlips(d.slips || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxId || !fullName || !position) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/nomina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_EMPLOYEE',
          taxId,
          fullName,
          position,
          baseSalary: parseFloat(baseSalary) || 460
        })
      });

      if (res.ok) {
        setShowEmpModal(false);
        setTaxId('');
        setFullName('');
        setPosition('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar empleado');
      }
    } catch (e) {
      alert('Error de red');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !period) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/nomina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GENERATE_SLIP',
          employeeId: selectedEmpId,
          period,
          extraHours: parseFloat(extraHours) || 0,
          bonuses: parseFloat(bonuses) || 0,
          advances: parseFloat(advances) || 0
        })
      });

      if (res.ok) {
        setShowSlipModal(false);
        setExtraHours('0');
        setBonuses('0');
        setAdvances('0');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al liquidar rol');
      }
    } catch (e) {
      alert('Error de red');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-400" /> Personal & Liquidación de Nómina
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestión de colaboradores, cálculo de sueldos con aporte IESS 9.45% (Ecuador) y emisión de roles de pago.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowEmpModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" /> Nuevo Empleado
          </button>
          <button
            onClick={() => setShowSlipModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            <DollarSign className="h-4 w-4" /> Liquidar Rol de Pago
          </button>
        </div>
      </div>

      <div className="flex gap-2 my-4 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('SLIPS')}
          className={`rounded-xl px-4 py-2 text-xs font-bold ${activeTab === 'SLIPS' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
        >
          Roles de Pago Emitidos ({slips.length})
        </button>
        <button
          onClick={() => setActiveTab('EMPLOYEES')}
          className={`rounded-xl px-4 py-2 text-xs font-bold ${activeTab === 'EMPLOYEES' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
        >
          Nómina de Empleados ({employees.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : activeTab === 'SLIPS' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3 text-right">Sueldo Base</th>
                  <th className="px-4 py-3 text-right">Ingresos Brutos</th>
                  <th className="px-4 py-3 text-right">IESS (9.45%)</th>
                  <th className="px-4 py-3 text-right">Neto a Recibir</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {slips.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      {s.period}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {s.employee?.fullName}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {s.employee?.position}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      ${s.baseSalary?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      ${s.grossSalary?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-rose-400">
                      -${s.iessDeduction?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                      ${s.netSalary?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {slips.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      No hay roles de pago emitidos aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(emp => (
            <div key={emp.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="text-base font-bold text-white">{emp.fullName}</h3>
              <p className="text-xs text-emerald-400 font-semibold">{emp.position}</p>
              <p className="text-xs font-mono text-slate-400 mt-1">Cédula: {emp.taxId}</p>

              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs">
                <span className="text-slate-400">Sueldo Base:</span>
                <span className="font-bold text-white">${emp.baseSalary?.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NUEVO EMPLEADO */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Nuevo Empleado</h3>
            <form onSubmit={handleCreateEmployee} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Cédula *</label>
                <input
                  type="text"
                  required
                  placeholder="1722334455"
                  value={taxId}
                  onChange={e => setTaxId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nombres y Apellidos *</label>
                <input
                  type="text"
                  required
                  placeholder="Juan Carlos Pérez"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Cargo / Puesto *</label>
                <input
                  type="text"
                  required
                  placeholder="Cajero / Panadero / Mesero"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Sueldo Base Mensual ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={baseSalary}
                  onChange={e => setBaseSalary(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  {submitting ? 'Guardando...' : 'Crear Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIQUIDAR ROL */}
      {showSlipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Liquidar Rol de Pago Mensual</h3>
            <form onSubmit={handleGenerateSlip} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Empleado *</label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                >
                  <option value="">Selecciona empleado...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.fullName} (${e.baseSalary?.toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Período *</label>
                <input
                  type="text"
                  required
                  placeholder="2026-10"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Horas Extra ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={extraHours}
                    onChange={e => setExtraHours(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Bonos ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bonuses}
                    onChange={e => setBonuses(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Anticipos ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={advances}
                    onChange={e => setAdvances(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-xs text-slate-300">
                Se deducirá automáticamente el <strong>9.45% de aporte personal al IESS</strong> sobre el sueldo bruto conforme a la normativa laboral de Ecuador.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSlipModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  {submitting ? 'Calculando...' : 'Generar Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
