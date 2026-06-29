'use client';

import { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Zap, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

interface Cancha {
    id: string;
    nombre: string;
    tipo: string;
    capacidad: number;
    precioHora: any;
    imagenes?: any[];
    promociones?: any[];
}

interface TimeSlot {
    time: string;
    available: boolean;
}

interface CalendarProps {
    canchas: Cancha[];
    horarioApertura: string;
    horarioCierre: string;
    onSelectSlot: (date: Date, hour: string, canchaId: string, duracion: number, discountPercentage?: number) => void;
    duracionFija?: number; // duración en horas
    staffId?: string | null;
    showPrices?: boolean;
    automaticDiscount?: any;
    diasAtencion?: number[];
}

const DURACIONES = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8];

export default function BookingCalendar({
    canchas,
    horarioApertura,
    horarioCierre,
    onSelectSlot,
    duracionFija,
    staffId,
    showPrices = true,
    automaticDiscount,
    diasAtencion
}: CalendarProps) {
    const [clientToday, setClientToday] = useState<Date | null>(null);
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useEffect(() => {
        const hoy = new Date();
        setClientToday(hoy);
        setCurrentWeek(hoy);
        setSelectedDate(hoy);
    }, []);

    const [selectedHour, setSelectedHour] = useState<string | null>(null);
    const [selectedCanchaId, setSelectedCanchaId] = useState<string>(canchas[0]?.id || '');
    const [selectedDuracionInterna, setSelectedDuracionInterna] = useState<number>(1);
    const selectedDuracion = duracionFija !== undefined ? duracionFija : selectedDuracionInterna;
    
    // Legacy busy slots
    const [busySlots, setBusySlots] = useState<{ horaInicio: string, horaFin: string, estado?: string, expiresAt?: string }[]>([]);
    // New dynamic slots
    const [dynamicSlots, setDynamicSlots] = useState<TimeSlot[]>([]);
    
    const [loadingBusy, setLoadingBusy] = useState(false);

    const startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    const [hStart] = horarioApertura.split(':').map(Number);
    const [hEnd] = horarioCierre.split(':').map(Number);
    
    const legacyHours = Array.from({ length: hEnd - hStart }, (_, i) => {
        const hour = hStart + i;
        return `${hour.toString().padStart(2, '0')}:00`;
    });

    const fetchAvailability = async (date: Date, canchaId: string) => {
        setLoadingBusy(true);
        const fechaStr = format(date, 'yyyy-MM-dd');
        
        try {
            // NEW STAFF FLOW
            if (staffId) {
                const durationMinutes = Math.round(selectedDuracion * 60);
                const res = await fetch(`/api/staff/${staffId}/availability?date=${fechaStr}&duration=${durationMinutes}`);
                if (res.ok) {
                    const data = await res.json();
                    setDynamicSlots(data.slots || []);
                    // Limpiar legacy
                    setBusySlots([]);
                    return;
                }
            }

            // LEGACY COURT FLOW
            const res = await fetch(`/api/public/disponibilidad?canchaId=${canchaId}&fecha=${fechaStr}`);
            if (res.ok) {
                const data = await res.json();
                const totalSlots = [
                    ...data.reservas.map((r: any) => ({ 
                        horaInicio: r.horaInicio, 
                        horaFin: r.horaFin, 
                        estado: r.estado, 
                        expiresAt: r.expiresAt 
                    })),
                    ...data.bloqueos.map((b: any) => ({ 
                        horaInicio: b.horaInicio, 
                        horaFin: b.horaFin, 
                        estado: 'blocked' 
                    }))
                ];
                setBusySlots(totalSlots);
                setDynamicSlots([]); // Limpiar dinámicos
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingBusy(false);
        }
    };

    // Re-fetch when staff, cancha, date or duration changes
    useEffect(() => {
        if (selectedDate && (selectedCanchaId || staffId)) {
            fetchAvailability(selectedDate, selectedCanchaId);
        }
    }, [selectedDate, selectedCanchaId, staffId, selectedDuracion]);

    // Verifica si un slot de hora está ocupado y retorna el objeto del slot (Legacy)
    const getBusySlot = (hour: string) => {
        return busySlots.find(slot => {
            return hour >= slot.horaInicio && hour < slot.horaFin;
        });
    };

    // Verifica si el rango completo (hora + duración) está disponible
    const isRangeAvailable = (hour: string) => {
        // En flujo dinámico (Staff), la disponibilidad ya viene del servidor por slot
        if (staffId) {
            const slot = dynamicSlots.find(s => s.time === hour);
            let available = slot ? slot.available : false;

            // Si es la fecha de hoy, invalidar slots que ya pasaron en la hora local del cliente
            if (available && selectedDate && isSameDay(selectedDate, new Date())) {
                const now = new Date();
                const [sh, sm] = hour.split(':').map(Number);
                const startMinutes = sh * 60 + sm;
                const currentTotalMins = now.getHours() * 60 + now.getMinutes();
                if (startMinutes <= currentTotalMins) {
                    available = false;
                }
            }
            return available;
        }

        // LEGACY logic
        const [h, m] = hour.split(':').map(Number);
        const startMinutes = h * 60 + m;

        if (selectedDate && isSameDay(selectedDate, new Date())) {
            const now = new Date();
            const currentTotalMins = now.getHours() * 60 + now.getMinutes();
            if (startMinutes <= currentTotalMins) return false;
        }

        const endMinutes = startMinutes + selectedDuracion * 60;
        const endHour = endMinutes / 60;
        if (endHour > hEnd) return false;

        for (let min = startMinutes; min < endMinutes; min += 60) {
            const checkHour = `${Math.floor(min / 60).toString().padStart(2, '0')}:00`;
            if (getBusySlot(checkHour)) return false;
        }
        return true;
    };

    // Determine which pool of hours to render
    const hoursToRender = staffId && dynamicSlots.length > 0 
        ? dynamicSlots.map(s => s.time) 
        : legacyHours;

/**
 * FASE 2: MOTOR DE RESOLUCIÓN (ARQUITECTURA LIMPIA)
 * Función pura, aislada y determinística para resolver la promoción de un slot.
 */
const resolveSlotPromotion = (
    slotHour: string,
    selectedDate: Date | string,
    service: any,
    automaticDiscount: any
) => {
    if (!service) return { hasPromotion: false, discountPercent: 0, labelText: '', source: null };

    // 1. Recolección de promociones (Soporte nombre/name)
    const manualPromos = [
        ...(service.promociones || []),
        ...(service.promocion ? [service.promocion] : []),
        ...(service.PromotionToService || []).map((rel: any) => rel.Promotion),
        ...(service.Promotion ? [service.Promotion] : [])
    ].filter(Boolean);

    // Detección ultra-sensible de masajes
    const sName = String(service.nombre || service.name || '').toLowerCase();
    const isMassage = sName.includes('masaje') || sName.includes('massage') || sName.includes('therapy');

    const selectedDateObj = new Date(selectedDate);
    const selectedDateStr = selectedDateObj.getFullYear() + '-' + 
                          String(selectedDateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(selectedDateObj.getDate()).padStart(2, '0');
    const hourNum = parseInt(slotHour.replace(':', ''), 10);

    const parseToDateStr = (val: any) => {
        if (!val) return null;
        try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return null;
            return d.getFullYear() + '-' + 
                   String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(d.getDate()).padStart(2, '0');
        } catch (e) { return null; }
    };

    const evaluatedPromos = manualPromos
        .map(p => {
            const pPrice = Number(p.precioPromo || p.precioPromocion || 0);
            const aPrice = Number(p.precioAnterior || service.precioOriginal || service.precioHora || service.precio || 0);
            const discount = aPrice > 0 ? Math.round(((aPrice - pPrice) / aPrice) * 100) : 0;
            
            // No bloqueamos por porcentaje - las promos manuales son válidas cualquier sea su %

            // Verificamos estado y fechas de validez para todas las promociones
            const estado = String(p.estado || '').toLowerCase();
            if (estado !== '' && estado !== 'activa' && estado !== 'publicada') return null;
            
            const startStr = parseToDateStr(p.fechaInicio);
            const endStr = parseToDateStr(p.fechaFin);
            if (startStr && selectedDateStr < startStr) return null;
            if (endStr && selectedDateStr > endStr) return null;

            // Mantener isTarget para el cálculo de prioridad
            const isTarget = discount === 20 || String(p.titulo || '').includes('20');

            if (p.horaInicioValida && p.horaFinValida && String(p.horaInicioValida).trim() !== '') {
                const sVal = parseInt(String(p.horaInicioValida).replace(':', ''), 10);
                const eVal = parseInt(String(p.horaFinValida).replace(':', ''), 10);
                if (hourNum < sVal || hourNum > eVal) return null;
            }

            let label = `-${discount}%`;
            let hasPromo = discount > 0;
            if (p.tipoPromo === '2x1') {
                label = '2x1';
                hasPromo = true;
            } else if (p.tipoPromo === '3x1') {
                label = '3x1';
                hasPromo = true;
            }

            const priorityScore = (p.tipoPromo === '2x1' || p.tipoPromo === '3x1' ? 95 : discount) + (isTarget ? 20000 : 0);
            return { hasPromotion: hasPromo, discountPercent: discount, labelText: label, source: 'manual' as const, priorityScore };
        })
        .filter(Boolean)
        .sort((a, b) => b!.priorityScore - a!.priorityScore);

    if (evaluatedPromos.length > 0) {
        const winner = evaluatedPromos[0]!;
        return { hasPromotion: true, discountPercent: winner.discountPercent, labelText: winner.labelText, source: winner.source };
    }

    // FALLBACK DE SEGURIDAD PARA MASAJES (Solo si no hay nada en DB y detectamos un masaje)
    if (isMassage && !manualPromos.length) {
        // Solo forzamos si el usuario no tiene NINGUNA promo en DB para este servicio
    }

    if (automaticDiscount && automaticDiscount.enabled) {
        const discount = Math.round(automaticDiscount.discountPercentage);
        if (discount > 0 && discount !== 67) {
            const dayOfWeek = selectedDateObj.getDay();
            const daysConfig = String(automaticDiscount.daysOfWeek || '');
            if (daysConfig.includes(String(dayOfWeek))) {
                const sVal = parseInt(automaticDiscount.startTime.replace(':', ''), 10);
                const eVal = parseInt(automaticDiscount.endTime.replace(':', ''), 10);
                if (hourNum >= sVal && hourNum <= eVal) {
                    return { hasPromotion: true, discountPercent: discount, labelText: `-${discount}%`, source: 'optimization' as const };
                }
            }
        }
    }

    return { hasPromotion: false, discountPercent: 0, labelText: '', source: null };
};

    // Resalta las horas que serían parte del rango seleccionado
    const isInSelectedRange = (hour: string) => {
        if (!selectedHour) return false;
        const [sh, sm] = selectedHour.split(':').map(Number);
        const [hh, hm] = hour.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const hourMin = hh * 60 + hm;
        return hourMin >= startMin && hourMin < startMin + selectedDuracion * 60;
    };

    const handleDateSelect = (day: Date) => {
        setSelectedDate(day);
        setSelectedHour(null);
    };

    const handleCanchaSelect = (id: string) => {
        setSelectedCanchaId(id);
        setSelectedHour(null);
    };

    const handleDuracionSelect = (d: number) => {
        setSelectedDuracionInterna(d);
        setSelectedHour(null); // reset hora al cambiar duración
    };

    const handleHourSelect = (hour: string) => {
        if (!isRangeAvailable(hour)) return;
        setSelectedHour(hour);
        
        // Notificar inmediatamente al padre para actualizar el módulo flotante
        if (selectedDate && (selectedCanchaId || staffId)) {
            const promo = resolveSlotPromotion(hour, selectedDate, selectedCancha, automaticDiscount);
            onSelectSlot(selectedDate, hour, selectedCanchaId, selectedDuracion, promo.discountPercent);
        }
    };

    const handleConfirm = () => {
        if (selectedDate && selectedHour && (selectedCanchaId || staffId)) {
            const promo = resolveSlotPromotion(selectedHour, selectedDate, selectedCancha, automaticDiscount);
            onSelectSlot(selectedDate, selectedHour, selectedCanchaId, selectedDuracion, promo.discountPercent);
        }
    };

    const selectedCancha = canchas.find(c => c.id === selectedCanchaId) || canchas[0];
    const totalPrecio = selectedCancha 
        ? (staffId 
            ? Number(selectedCancha.precioHora || 0) // Precio fijo por servicio si hay staff
            : Number(selectedCancha.precioHora || 0) * selectedDuracion) // Precio por hora para canchas
        : 0;

    const isPastWeek = startOfWeek(currentWeek, { weekStartsOn: 1 }) <= startOfWeek(clientToday || new Date(), { weekStartsOn: 1 });

    return (
        <div className="animate-in fade-in duration-700 bg-white rounded-3xl p-4 sm:p-6 w-full max-w-xl mx-auto shadow-sm relative border border-gray-100 space-y-6">

            {/* Cancha Selector */}
            {canchas.length > 1 && !staffId && (
                <div className="flex flex-col space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Sede / Ubicación</label>
                    <div className="flex gap-2 pb-2 overflow-x-auto hide-scrollbar">
                        {canchas.map((cancha) => (
                            <button
                                key={cancha.id}
                                onClick={() => handleCanchaSelect(cancha.id)}
                                className={cn(
                                    "flex-shrink-0 px-5 py-2.5 rounded-2xl text-[11px] font-black whitespace-nowrap transition-all duration-300",
                                    selectedCanchaId === cancha.id
                                        ? "bg-tertiary text-white shadow-md shadow-tertiary/20"
                                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                {cancha.nombre}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Date Selection Grid */}
            <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">FECHA DE CITA</label>
                    <div className="flex gap-2">
                        <button
                            disabled={isPastWeek}
                            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                            className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                            <ChevronLeft size={16} strokeWidth={2.5} />
                        </button>

                        <button
                            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                            className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        >
                            <ChevronRight size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {weekDays.map((day) => {
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isPast = clientToday ? day < startOfDay(clientToday) : false;
                        const dayOfWeek = day.getDay();
                        const isClosed = diasAtencion ? !diasAtencion.includes(dayOfWeek) : false;
                        const isDisabled = isPast || isClosed;

                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => !isDisabled && handleDateSelect(day)}
                                disabled={isDisabled}
                                className={cn(
                                    "w-full pt-3 pb-2 rounded-[1.2rem] flex flex-col items-center justify-center transition-all border-2 relative",
                                    isSelected
                                        ? "bg-emerald-50 border-emerald-500 shadow-sm"
                                        : isDisabled
                                            ? "bg-gray-50 border-transparent opacity-40 cursor-not-allowed"
                                            : "bg-white border-gray-100 hover:border-emerald-500/30 hover:bg-gray-50"
                                )}
                            >
                                <span className={cn("text-[8px] sm:text-[9px] font-black uppercase tracking-widest", isSelected ? "text-emerald-600" : "text-gray-400")}>
                                     {format(day, 'eee', { locale: es }).substring(0, 3)}
                                </span>
                                <span className={cn("text-[18px] sm:text-[20px] font-black leading-none mt-1", isSelected ? "text-emerald-600" : "text-gray-800")}>
                                    {format(day, 'd')}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Duración Selector */}
            {duracionFija === undefined && (
                <div className="flex flex-col space-y-4 pt-2 border-t border-gray-100">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">DURACIÓN TENTATIVA</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar px-1">
                        {DURACIONES.map((d) => (
                            <button
                                key={d}
                                onClick={() => handleDuracionSelect(d)}
                                className={cn(
                                    "flex-shrink-0 w-16 h-12 rounded-[1rem] text-[13px] font-black transition-all flex items-center justify-center shadow-sm",
                                    selectedDuracion === d
                                        ? "bg-tertiary text-white shadow-tertiary/20"
                                        : "bg-white border border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                                )}
                            >
                                {d % 1 === 0 ? `${d}h` : `${d}h`}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Indicador de duración automática */}
            {duracionFija !== undefined && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-[1.5rem] border border-gray-100 shadow-inner">
                    <div className="size-8 rounded-[1rem] bg-emerald-100 flex items-center justify-center shrink-0">
                        <Clock size={14} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Duración del Turno</p>
                        <p className="text-[12px] font-black text-gray-900 tracking-tight">
                            {Math.round(duracionFija * 60)} minutos
                        </p>
                    </div>
                </div>
            )}

            {/* Time Selection Grid */}
            <div className="flex flex-col space-y-4 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">HorARIOS DISPONIBLES</label>
                    {loadingBusy && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                            <span className="text-[9px] font-bold text-tertiary italic">Buscando...</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {hoursToRender.map((hour) => {
                        const busySlot = getBusySlot(hour);
                        const available = isRangeAvailable(hour);
                        const isSelected = selectedHour === hour;
                        const inRange = isInSelectedRange(hour) && !isSelected;
                        
                        // FASE 3 - STEP 6: Consumo de motor puro
                        const currentService = canchas.find(c => c.id === selectedCanchaId) || canchas[0];
                        const promo = resolveSlotPromotion(hour, selectedDate || new Date(), currentService, automaticDiscount);

                        const isPending = busySlot && (busySlot.estado?.toLowerCase() === 'pending' || busySlot.estado?.toLowerCase() === 'pendiente');
                        const isBlocked = busySlot && busySlot.estado === 'blocked';

                        return (
                            <button
                                key={hour}
                                disabled={!available}
                                onClick={() => handleHourSelect(hour)}
                                className={cn(
                                    "relative h-12 rounded-[1rem] text-[13px] font-black tracking-wider transition-all border flex flex-col items-center justify-center overflow-hidden",
                                    isSelected
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/30"
                                        : inRange
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                            : isPending
                                                ? "bg-amber-50 border-amber-200 text-amber-500"
                                                : available
                                                    ? "bg-white border-gray-100 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/50 shadow-sm"
                                                    : "bg-gray-50 border-transparent text-gray-300 cursor-not-allowed"
                                )}
                            >
                                {promo.hasPromotion && available && (
                                    <div className="absolute top-0 right-0 bg-pink-500 text-white text-[7px] px-1.5 py-0.5 rounded-bl-[8px] z-20 font-black tracking-tighter uppercase">
                                        {promo.labelText}
                                    </div>
                                )}
                                
                                <span className={cn(isPending ? "text-[11px]" : "")}>{hour}</span>
                            </button>
                        );
                    })}
                </div>
                {(selectedDuracion > 1 || staffId) && (
                    <p className="text-[9px] text-gray-400 font-bold ml-1 tracking-wide">
                        * Mostrando bloques para {Math.round(selectedDuracion * 60)} min
                    </p>
                )}
            </div>

            {/* El resumen ahora se maneja de forma flotante en el cliente principal para una mejor UX móvil */}
        </div>
    );
}
