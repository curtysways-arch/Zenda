'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Search, 
  Filter, 
  Download, 
  UserPlus, 
  Clock, 
  Calendar, 
  User, 
  CheckCircle2, 
  RefreshCw, 
  ArrowUpDown,
  Building2,
  TrendingUp,
  Award
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  checkedInAt: string;
  method?: string;
  notes?: string;
  cliente: {
    id: string;
    nombre: string;
    telefono?: string;
    email?: string;
    avatarUrl?: string;
  };
  membership?: {
    id: string;
    status: string;
    membershipPlan?: {
      name: string;
      tier?: string;
    };
  };
  branch?: {
    id: string;
    name: string;
  };
}

export default function GymAttendancePage() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualIdentifier, setManualIdentifier] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualMessage, setManualMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/gym/attendances?period=${period}&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (Array.isArray(data.attendances)) {
        setAttendances(data.attendances);
      } else {
        setAttendances([]);
      }
    } catch (err) {
      console.error('Error fetching attendances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendances();
  }, [period]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAttendances();
  };

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIdentifier.trim()) return;
    setManualLoading(true);
    setManualMessage(null);

    try {
      const res = await fetch('/api/admin/gym/access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: manualIdentifier.trim(), method: 'MANUAL_RECEPTION' })
      });
      const data = await res.json();

      if (data.access === 'GRANTED') {
        setManualMessage({ 
          type: 'success', 
          text: `¡Asistencia registrada para ${data.member?.nombre || 'socio'}!` 
        });
        setManualIdentifier('');
        fetchAttendances();
        setTimeout(() => {
          setManualModalOpen(false);
          setManualMessage(null);
        }, 2000);
      } else {
        setManualMessage({ 
          type: 'error', 
          text: data.reason || 'No se pudo autorizar el acceso' 
        });
      }
    } catch (err: any) {
      setManualMessage({ type: 'error', text: 'Error al procesar asistencia manual' });
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-8 h-8 text-emerald-500" />
            Registro de Asistencias
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Control cronológico de entrenamientos de socios y aforo por día.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setManualModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Check-in Manual</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Selector de Período */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto">
          {(['today', 'week', 'month', 'all'] as const).map((p) => {
            const labels = { today: 'Hoy', week: 'Semana', month: 'Este Mes', all: 'Histórico' };
            const isActive = period === p;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Buscador */}
        <form onSubmit={handleSearch} className="w-full md:w-80 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por socio, teléfono..."
            className="w-full text-xs font-medium px-3.5 py-2.5 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
        </form>
      </div>

      {/* Métricas rápidas del período */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Check-ins</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {attendances.length}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">En el período seleccionado</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Socios Únicos</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {new Set(attendances.map(a => a.cliente?.id)).size}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Personas diferentes entrenando</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado Sistema</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-black text-emerald-500 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> En Línea
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Sincronizado con eventos de gamificación</span>
        </div>
      </div>

      {/* Tabla de Asistencias */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Socio</th>
                <th className="py-3.5 px-4">Membresía</th>
                <th className="py-3.5 px-4">Fecha & Hora</th>
                <th className="py-3.5 px-4">Método</th>
                <th className="py-3.5 px-4">Sucursal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Cargando asistencias...
                  </td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    No hay asistencias registradas en este período.
                  </td>
                </tr>
              ) : (
                attendances.map((att) => {
                  const checkDate = new Date(att.checkedInAt);
                  const dateStr = checkDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                  const timeStr = checkDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0">
                            {att.cliente?.nombre ? att.cliente.nombre.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {att.cliente?.nombre || 'Socio sin nombre'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {att.cliente?.telefono || att.cliente?.email || 'ID: ' + att.cliente?.id?.substring(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {att.membership?.membershipPlan?.name || 'Membresía General'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{timeStr}</div>
                        <div className="text-[10px] text-slate-400">{dateStr}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                          {att.method || 'QR_CODE'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-slate-500">
                          {att.branch?.name || 'Sede Principal'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Check-in Manual */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" />
              Check-in Manual de Recepción
            </h3>
            <p className="text-xs text-slate-500">
              Ingrese el número de teléfono, correo o cédula del socio para registrar su ingreso.
            </p>

            <form onSubmit={handleManualCheckIn} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Identificador del Socio
                </label>
                <input
                  type="text"
                  value={manualIdentifier}
                  onChange={(e) => setManualIdentifier(e.target.value)}
                  placeholder="Ej: +584121234567 o correo@email.com"
                  autoFocus
                  required
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {manualMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  manualMessage.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}>
                  {manualMessage.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setManualModalOpen(false);
                    setManualMessage(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={manualLoading || !manualIdentifier.trim()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  {manualLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Registrar Ingreso</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
