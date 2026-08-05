'use client';

import React, { useState, useEffect } from 'react';
import ResourceScheduleGrid, { GridAppointmentItem } from '@/components/admin/ResourceScheduleGrid';
import { OperableResource } from '@/core/resources/types';
import { Trophy, RefreshCw, Plus, Zap, Filter, Calendar } from 'lucide-react';

export default function CourtGridPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [resources, setResources] = useState<OperableResource[]>([]);
  const [appointments, setAppointments] = useState<GridAppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<number>(90); // 90 min por defecto para Pádel

  const fetchGridData = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/canchas/grilla?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error('Error al cargar grilla de canchas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGridData(selectedDate);
  }, [selectedDate]);

  const handleSlotClick = (resourceId: string, time: string) => {
    const court = resources.find((r) => r.id === resourceId);
    alert(`💡 Reservar turno en ${court?.name || 'Cancha'} a las ${time} hs (${selectedDate})`);
  };

  const handleAppointmentClick = (app: GridAppointmentItem) => {
    alert(`🎾 Detalle del Turno: ${app.clientName} - ${app.serviceName} (${app.startTime} a ${app.endTime})`);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header de la Página */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Trophy className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white italic tracking-tight">
              Grilla de Canchas Deportivas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Gestión visual de turnos en canchas de pádel, fútbol y tenis en tiempo real.
            </p>
          </div>
        </div>

        {/* Acciones y Filtros */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="px-2">Franja:</span>
            <button
              onClick={() => setGranularity(60)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                granularity === 60 ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : ''
              }`}
            >
              60m
            </button>
            <button
              onClick={() => setGranularity(90)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                granularity === 90 ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : ''
              }`}
            >
              90m (Pádel)
            </button>
          </div>

          <button
            onClick={() => fetchGridData(selectedDate)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all"
            title="Recargar Grilla"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tarjeta Informativa de Iluminación Nocturna */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs font-semibold text-amber-900 dark:text-amber-300">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-amber-500 fill-amber-500" />
          <span>
            <strong>Tarifa Nocturna Activa:</strong> Las franjas a partir de las 18:00 hs adicionan automáticamente el suplemento de iluminación artificial (💡).
          </span>
        </div>
      </div>

      {/* Grilla Universal ResourceScheduleGrid */}
      <ResourceScheduleGrid
        resources={resources}
        appointments={appointments}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onSlotClick={handleSlotClick}
        onAppointmentClick={handleAppointmentClick}
        granularityMinutes={granularity}
        startHour={7}
        endHour={23}
        enableNightLightingFee={true}
        nightLightingStartHour={18}
        labels={{
          resourceNameSingular: 'Cancha',
          resourceNamePlural: 'Canchas',
        }}
      />
    </div>
  );
}
