'use client';

import React, { useState } from 'react';
import { OperableResource } from '@/core/resources/types';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  Sparkles, 
  SunMedium, 
  Moon, 
  Zap, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  CheckCircle2,
  Lock
} from 'lucide-react';

export interface GridAppointmentItem {
  id: string;
  resourceId: string;
  clientName: string;
  serviceName: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'in_progress';
  price?: number;
  hasNightLighting?: boolean;
}

export interface ResourceScheduleGridProps {
  resources: OperableResource[];
  appointments: GridAppointmentItem[];
  selectedDate: string; // YYYY-MM-DD
  onDateChange?: (newDate: string) => void;
  onSlotClick?: (resourceId: string, time: string) => void;
  onAppointmentClick?: (appointment: GridAppointmentItem) => void;
  granularityMinutes?: number; // 30, 60, 90 min
  startHour?: number;          // Default: 7 (07:00)
  endHour?: number;            // Default: 23 (23:00)
  enableNightLightingFee?: boolean;
  nightLightingStartHour?: number; // Default: 18 (18:00 hs)
  labels?: {
    resourceNameSingular?: string;
    resourceNamePlural?: string;
  };
}

export default function ResourceScheduleGrid({
  resources,
  appointments,
  selectedDate,
  onDateChange,
  onSlotClick,
  onAppointmentClick,
  granularityMinutes = 60,
  startHour = 7,
  endHour = 23,
  enableNightLightingFee = false,
  nightLightingStartHour = 18,
  labels = { resourceNameSingular: 'Recurso', resourceNamePlural: 'Recursos' },
}: ResourceScheduleGridProps) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  // Generar franjas horarias
  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += granularityMinutes) {
        const hh = hour.toString().padStart(2, '0');
        const mm = min.toString().padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Helper para verificar si la hora tiene tarifa nocturna / luz encendida
  const isNightSlot = (timeStr: string) => {
    const hour = parseInt(timeStr.split(':')[0], 10);
    return enableNightLightingFee && hour >= nightLightingStartHour;
  };

  // Helper para buscar cita en una celda concreta (resourceId + time)
  const getAppointmentForSlot = (resourceId: string, time: string) => {
    return appointments.find(
      (app) => app.resourceId === resourceId && app.startTime === time
    );
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* Encabezado Superior de la Grilla */}
      <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CalendarIcon className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Grilla Operativa de {labels.resourceNamePlural}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualización unificada por {labels.resourceNameSingular?.toLowerCase()} y tiempo
            </p>
          </div>
        </div>

        {/* Selector de Fecha */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange && onDateChange(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Contenedor de la Grilla con Scroll Horizontal */}
      <div className="overflow-x-auto overflow-y-auto max-h-[750px] custom-scrollbar">
        <table className="w-full border-collapse min-w-[700px]">
          {/* Cabecera: Columnas por Recurso */}
          <thead>
            <tr className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <th className="p-3 w-24 sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center border-r border-slate-200 dark:border-slate-700">
                Hora
              </th>
              {resources.map((res) => (
                <th
                  key={res.id}
                  className="p-4 text-center border-r border-slate-200 dark:border-slate-700 min-w-[180px]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                      {res.name}
                    </span>
                    {res.category && (
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-200/60 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                        {res.category}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Cuerpo de la Grilla */}
          <tbody>
            {timeSlots.map((time) => {
              const night = isNightSlot(time);
              return (
                <tr
                  key={time}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* Columna de Hora (Sticky Izquierda) */}
                  <td className="p-3 sticky left-0 z-10 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 text-center border-r border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-center gap-1">
                      <span>{time}</span>
                      {night && (
                        <span title="Luz Nocturna Encendida">
                          <Zap className="size-3 text-amber-500 fill-amber-500" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Celdas por Recurso */}
                  {resources.map((res) => {
                    const appointment = getAppointmentForSlot(res.id, time);
                    const slotKey = `${res.id}-${time}`;
                    const isHovered = hoveredSlot === slotKey;

                    return (
                      <td
                        key={res.id}
                        onMouseEnter={() => setHoveredSlot(slotKey)}
                        onMouseLeave={() => setHoveredSlot(null)}
                        className="p-1.5 border-r border-slate-100 dark:border-slate-800/60 relative h-16 transition-all"
                      >
                        {appointment ? (
                          <div
                            onClick={() => onAppointmentClick && onAppointmentClick(appointment)}
                            className={`h-full w-full rounded-xl p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-200 shadow-md ${
                              appointment.status === 'confirmed'
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/20'
                                : appointment.status === 'in_progress'
                                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20'
                                : 'bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200 hover:bg-blue-500/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-black truncate">
                                {appointment.clientName}
                              </span>
                              {appointment.hasNightLighting && (
                                <Zap className="size-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[10px] opacity-80 mt-1">
                              <span className="truncate">{appointment.serviceName}</span>
                              <span className="font-mono font-bold">{appointment.startTime}</span>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => onSlotClick && onSlotClick(res.id, time)}
                            className={`w-full h-full rounded-xl border border-dashed flex items-center justify-center gap-1 text-xs transition-all duration-200 ${
                              night
                                ? 'border-amber-200 dark:border-amber-900/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {isHovered ? (
                              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                <Plus className="size-3.5" />
                                Reservar
                              </span>
                            ) : night ? (
                              <span className="text-[10px] font-medium opacity-60 flex items-center gap-1">
                                <Moon className="size-3 text-amber-500" /> +Luz
                              </span>
                            ) : null}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
