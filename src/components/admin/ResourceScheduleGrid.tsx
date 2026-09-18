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
  Lock,
  Wrench,
  AlertCircle,
  Phone,
  DollarSign
} from 'lucide-react';

export interface GridAppointmentItem {
  id: string;
  resourceId: string;
  canchaNombre?: string;
  clientName: string;
  clientPhone?: string;
  serviceName: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'in_progress' | 'client_checked_in' | 'no_show' | 'blocked';
  pagoEstado?: string;
  price?: number;
  totalPagado?: number;
  saldoPendiente?: number;
  hasNightLighting?: boolean;
  isBlock?: boolean;
  motivo?: string;
  comentarios?: string;
  checkedInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  duracion?: number;
  fecha?: string;
}

export interface ResourceScheduleGridProps {
  resources: OperableResource[];
  appointments: GridAppointmentItem[];
  selectedDate: string; // YYYY-MM-DD
  onDateChange?: (newDate: string) => void;
  onSlotClick?: (resourceId: string, time: string) => void;
  onAppointmentClick?: (appointment: GridAppointmentItem) => void;
  onBlockClick?: (resourceId: string, time: string) => void;
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
  onBlockClick,
  granularityMinutes = 60,
  startHour = 7,
  endHour = 23,
  enableNightLightingFee = false,
  nightLightingStartHour = 18,
  labels = { resourceNameSingular: 'Cancha', resourceNamePlural: 'Canchas' },
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

  // Helper para buscar cita o bloqueo en una celda concreta
  const getAppointmentForSlot = (resourceId: string, time: string) => {
    return appointments.find((app) => {
      if (app.resourceId !== resourceId) return false;
      // Coincidencia exacta o dentro del rango
      if (app.startTime === time) return true;
      const [slotH, slotM] = time.split(':').map(Number);
      const [startH, startM] = app.startTime.split(':').map(Number);
      const [endH, endM] = app.endTime.split(':').map(Number);
      const slotMin = slotH * 60 + slotM;
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      return slotMin >= startMin && slotMin < endMin;
    });
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden flex flex-col">
      {/* Contenedor de la Grilla con Scroll Horizontal */}
      <div className="overflow-x-auto overflow-y-auto max-h-[750px] custom-scrollbar">
        <table className="w-full border-collapse min-w-[700px]">
          {/* Cabecera: Columnas por Cancha */}
          <thead>
            <tr className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 text-white">
              <th className="p-3.5 w-24 sticky left-0 z-30 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-800 text-slate-400">
                Hora
              </th>
              {resources.length === 0 ? (
                <th className="p-4 text-center text-slate-400 text-xs">No hay canchas registradas</th>
              ) : (
                resources.map((res) => (
                  <th
                    key={res.id}
                    className="p-3.5 text-center border-r border-slate-800/80 min-w-[200px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-black text-white uppercase tracking-tight">
                        {res.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {res.category && (
                          <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            {res.category}
                          </span>
                        )}
                        {res.metadata?.precioHora > 0 && (
                          <span className="text-[9px] font-semibold text-slate-400">
                            ${res.metadata.precioHora}/h
                          </span>
                        )}
                      </div>
                    </div>
                  </th>
                ))
              )}
            </tr>
          </thead>

          {/* Cuerpo de la Grilla */}
          <tbody className="divide-y divide-slate-100">
            {timeSlots.map((time) => {
              const night = isNightSlot(time);
              return (
                <tr
                  key={time}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  {/* Columna de Hora (Sticky Izquierda) */}
                  <td className="p-2.5 sticky left-0 z-10 bg-slate-50 text-[11px] font-mono font-bold text-slate-700 text-center border-r border-slate-200 shadow-xs">
                    <div className="flex items-center justify-center gap-1">
                      <span>{time}</span>
                      {night && (
                        <span title="Luz Nocturna Activa">
                          <Zap className="size-3 text-amber-500 fill-amber-500" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Celdas por Cancha */}
                  {resources.map((res) => {
                    const appointment = getAppointmentForSlot(res.id, time);
                    const slotKey = `${res.id}-${time}`;
                    const isHovered = hoveredSlot === slotKey;

                    // Si la celda cae en una reserva o bloqueo
                    if (appointment) {
                      const isBlock = appointment.isBlock || appointment.status === 'blocked';
                      const isInProgress = appointment.status === 'in_progress';
                      const isCheckedIn = appointment.status === 'client_checked_in';
                      const isConfirmed = appointment.status === 'confirmed';
                      const isPending = appointment.status === 'pending';
                      const isCompleted = appointment.status === 'completed';
                      const isNoShow = appointment.status === 'no_show';
                      const isPaid = appointment.pagoEstado === 'PAGADO' || appointment.pagoEstado === 'COMPLETO';

                      let cardStyle = 'bg-slate-50 border-slate-200 text-slate-900';
                      let statusBadge = '🟡 Pendiente';

                      if (isBlock) {
                        cardStyle = 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700';
                        statusBadge = '🔧 Inhabilitada';
                      } else if (isInProgress) {
                        cardStyle = 'bg-emerald-600 border-emerald-500 text-white shadow-md hover:bg-emerald-700';
                        statusBadge = '🟢 En juego';
                      } else if (isCheckedIn) {
                        cardStyle = 'bg-teal-50 border-teal-300 text-teal-950 hover:bg-teal-100';
                        statusBadge = '🙋 Llegó';
                      } else if (isConfirmed) {
                        cardStyle = 'bg-emerald-50 border-emerald-200/80 text-emerald-950 hover:bg-emerald-100/70';
                        statusBadge = '✓ Confirmada';
                      } else if (isPending) {
                        cardStyle = 'bg-amber-50 border-amber-200/80 text-amber-950 hover:bg-amber-100/70';
                        statusBadge = '🟡 Pendiente';
                      } else if (isCompleted) {
                        cardStyle = 'bg-blue-50 border-blue-200/80 text-blue-950 hover:bg-blue-100/70';
                        statusBadge = '✓ Finalizada';
                      } else if (isNoShow) {
                        cardStyle = 'bg-slate-100 border-slate-300 text-slate-500 opacity-60 line-through';
                        statusBadge = '✕ No Show';
                      }

                      return (
                        <td
                          key={res.id}
                          className="p-1.5 border-r border-slate-100 relative h-20 transition-all align-top"
                        >
                          <div
                            onClick={() => onAppointmentClick && onAppointmentClick(appointment)}
                            className={`h-full w-full rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-150 shadow-xs border ${cardStyle}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-[11px] font-black truncate leading-tight ${isInProgress ? 'text-white' : ''}`}>
                                {isBlock ? `🔧 ${appointment.motivo || 'Bloqueada'}` : appointment.clientName}
                              </span>
                              {appointment.hasNightLighting && !isBlock && (
                                <Zap className={`size-3 shrink-0 ${isInProgress ? 'text-amber-300 fill-amber-300' : 'text-amber-500 fill-amber-500'}`} />
                              )}
                            </div>

                            <div className={`flex items-center justify-between text-[9px] font-semibold opacity-90 mt-1 ${isInProgress ? 'text-white/90' : ''}`}>
                              <span className="truncate">
                                {appointment.startTime}–{appointment.endTime}
                              </span>
                              {!isBlock && (
                                <span className={`px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider text-[8px] ${
                                  isPaid 
                                    ? (isInProgress ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-800')
                                    : (isInProgress ? 'bg-amber-400 text-slate-950' : 'bg-amber-200/80 text-amber-800')
                                }`}>
                                  {isPaid ? '✓ Pagado' : '$ Pendiente'}
                                </span>
                              )}
                            </div>

                            <div className={`flex items-center justify-between text-[9px] opacity-75 mt-0.5 ${isInProgress ? 'text-white/80' : ''}`}>
                              <span className="truncate">{appointment.serviceName}</span>
                              <span className="font-bold">
                                {statusBadge}
                              </span>
                            </div>
                          </div>
                        </td>
                      );
                    }

                    // Celda Libre / Disponible
                    return (
                      <td
                        key={res.id}
                        onMouseEnter={() => setHoveredSlot(slotKey)}
                        onMouseLeave={() => setHoveredSlot(null)}
                        className="p-1.5 border-r border-slate-100 relative h-20 transition-all"
                      >
                        <div className="h-full w-full rounded-2xl border border-dashed border-slate-200/80 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 p-2 flex flex-col justify-between transition-all group">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium">
                            <span>Disponible</span>
                            <span>{time}</span>
                          </div>

                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onSlotClick && onSlotClick(res.id, time)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs"
                              title="Crear Reserva"
                            >
                              <Plus size={10} /> Reservar
                            </button>
                            {onBlockClick && (
                              <button
                                onClick={() => onBlockClick(res.id, time)}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[9px]"
                                title="Bloquear Cancha"
                              >
                                <Lock size={10} />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[8px] text-slate-400">
                            {night ? (
                              <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                                <Moon size={9} /> Tarifa noche
                              </span>
                            ) : (
                              <span className="opacity-0 group-hover:opacity-100 text-slate-400">Libre</span>
                            )}
                          </div>
                        </div>
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
