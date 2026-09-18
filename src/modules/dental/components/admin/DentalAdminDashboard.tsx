'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Calendar, Activity, Clock, Smile, Stethoscope, 
  PlusCircle, FileText, ChevronRight, CheckCircle2, ArrowUpRight, 
  ShieldAlert, AlertCircle, Sparkles, Folder
} from 'lucide-react';

interface DentalAdminDashboardProps {
  initialStats?: {
    citasHoy: number;
    pacientesTotal: number;
    consultasPendientes: number;
    tratamientosEnProceso: number;
  };
  proximasCitas?: any[];
  negocioNombre?: string;
  primaryColor?: string;
}

export default function DentalAdminDashboard({
  initialStats,
  proximasCitas: initialCitas = [],
  negocioNombre = 'Clínica Dental',
  primaryColor = '#0284c7'
}: DentalAdminDashboardProps) {
  const [stats, setStats] = useState(initialStats || {
    citasHoy: 0,
    pacientesTotal: 0,
    consultasPendientes: 0,
    tratamientosEnProceso: 0
  });
  const [citas, setCitas] = useState<any[]>(initialCitas);
  const [loading, setLoading] = useState(!initialStats);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const res = await fetch('/api/admin/dental/dashboard-stats');
        if (res.ok) {
          const data = await res.json();
          if (data.stats) setStats(data.stats);
          if (data.proximasCitas) setCitas(data.proximasCitas);
        }
      } catch (e) {
        console.error('Error fetching dental dashboard data:', e);
      } finally {
        setLoading(false);
      }
    }

    if (!initialStats) {
      loadDashboardData();
    }
  }, [initialStats]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6">
      
      {/* ─── BANNER DE BIENVENIDA CLÍNICA ───────────────────────────── */}
      <div 
        className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, #0369a1 100%)`
        }}
      >
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
            <Stethoscope className="w-3.5 h-3.5" />
            Panel Odontológico Especializado
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Buenos días, {negocioNombre}
          </h1>
          <p className="text-white/80 text-sm leading-relaxed">
            Resumen operativo y clínico de tu consultorio. Monitorea pacientes, historias clínicas y tratamientos en curso.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/pacientes"
            className="px-5 py-3 rounded-2xl bg-white text-slate-900 font-extrabold text-xs sm:text-sm shadow-md hover:bg-slate-100 transition-all flex items-center gap-2 active:scale-95"
          >
            <Users className="w-4 h-4 text-sky-600" />
            <span>Ver Pacientes</span>
          </Link>
          <Link
            href="/admin/citas"
            className="px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-extrabold text-xs sm:text-sm border border-white/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Calendar className="w-4 h-4" />
            <span>Agenda del Día</span>
          </Link>
        </div>
      </div>

      {/* ─── KPI CARDS CLÍNICOS ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Citas de Hoy</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">
            {stats.citasHoy}
          </div>
          <span className="text-xs text-slate-400 font-medium">Turnos programados</span>
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pacientes</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">
            {stats.pacientesTotal}
          </div>
          <span className="text-xs text-slate-400 font-medium">Fichas activas en sistema</span>
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tratamientos</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">
            {stats.tratamientosEnProceso}
          </div>
          <span className="text-xs text-slate-400 font-medium">En proceso de atención</span>
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consultas Pendientes</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">
            {stats.consultasPendientes}
          </div>
          <span className="text-xs text-slate-400 font-medium">Por registrar evolución</span>
        </div>

      </div>

      {/* ─── ACCESOS DIRECTOS & PRÓXIMAS CITAS ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Próximas Citas del Día */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Próximas Citas Odontológicas</h3>
              <p className="text-xs text-slate-500">Pacientes agendados para valoración y tratamientos hoy.</p>
            </div>
            <Link
              href="/admin/citas"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>Ver agenda completa</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {citas.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">No hay más citas programadas para hoy</p>
              <p className="text-xs text-slate-400 mt-1">Los nuevos turnos agendados en el landing aparecerán aquí.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {citas.map((cita: any) => (
                <div key={cita.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 font-black text-xs shrink-0">
                      {cita.horaInicio || '09:00'}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {cita.cliente?.nombre || 'Paciente'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {cita.service?.nombre || 'Consulta Odontológica'} • {cita.staff?.name || 'Doctor de turno'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {cita.clienteId && (
                      <Link
                        href={`/admin/pacientes/${cita.clienteId}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                      >
                        Ficha Clínica
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acciones Rápidas Clínicas */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900">Acciones Clínicas</h3>

            <div className="space-y-2">
              <Link
                href="/admin/pacientes"
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-sky-50 border border-slate-100 hover:border-sky-200 text-slate-700 hover:text-sky-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-extrabold text-slate-900 group-hover:text-sky-700">Gestionar Pacientes</p>
                    <p className="text-[11px] text-slate-400">Listado, datos y fichas</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600" />
              </Link>

              <Link
                href="/admin/historia-clinica"
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50 border border-slate-100 hover:border-purple-200 text-slate-700 hover:text-purple-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-extrabold text-slate-900 group-hover:text-purple-700">Historias Clínicas</p>
                    <p className="text-[11px] text-slate-400">Antecedentes y evoluciones</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600" />
              </Link>

              <Link
                href="/admin/tratamientos"
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 text-slate-700 hover:text-emerald-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-700">Planes de Tratamiento</p>
                    <p className="text-[11px] text-slate-400">Control por pieza dental</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </Link>

              <Link
                href="/admin/documentos"
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-100 hover:border-amber-200 text-slate-700 hover:text-amber-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-extrabold text-slate-900 group-hover:text-amber-700">Radiografías & Archivos</p>
                    <p className="text-[11px] text-slate-400">Documentos por paciente</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
              </Link>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
