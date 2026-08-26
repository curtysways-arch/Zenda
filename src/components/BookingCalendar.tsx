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
    darkMode?: boolean;
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
    diasAtencion,
    darkMode = true
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

    const [hStart] = (horarioApertura || '08:00').split(':').map(Number);
    const [hEnd] = (horarioCierre || '23:00').split(':').map(Number);
    
    const legacyHours = Array.from({ length: Math.max(1, hEnd - hStart) }, (_, i) => {
        const hour = hStart + i;
        return `${hour.toString().padStart(2, '0')}:00`;
    });

    const fetchAvailability = async (date: Date, canchaId: string) => {
        setLoadingBusy(true);
        const fechaStr = format(date, 'yyyy-MM-dd');
        
        try {
            if (staffId) {
                const durationMinutes = Math.round(selectedDuracion * 60);
                const res = await fetch(`/api/staff/${staffId}/availability?date=${fechaStr}&duration=${durationMinutes}`);
                if (res.ok) {
                    const data = await res.json();
                    setDynamicSlots(data.slots || []);
                    setBusySlots([]);
                    return;
                }
            }

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
                setDynamicSlots([]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingBusy(false);
        }
    };

    useEffect(() => {
        if (selectedDate && (selectedCanchaId || staffId)) {
            fetchAvailability(selectedDate, selectedCanchaId);
        }
    }, [selectedDate, selectedCanchaId, staffId, selectedDuracion]);

    const getBusySlot = (hour: string) => {
        return busySlots.find(slot => {
            return hour >= slot.horaInicio && hour < slot.horaFin;
        });
    };

    const isRangeAvailable = (hour: string) => {
        if (staffId) {
            const slot = dynamicSlots.find(s => s.time === hour);
            let available = slot ? slot.available : false;

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

    const hoursToRender = staffId && dynamicSlots.length > 0 
        ? dynamicSlots.map(s => s.time) 
        : legacyHours;

    const resolveSlotPromotion = (
        slotHour: string,
        selectedDate: Date | string,
        service: any,
        automaticDiscount: any
    ) => {
        if (!service) return { hasPromotion: false, discountPercent: 0, labelText: '', source: null };

        const manualPromos = [
            ...(service.promociones || []),
            ...(service.promocion ? [service.promocion] : []),
            ...(service.PromotionToService || []).map((rel: any) => rel.Promotion),
            ...(service.Promotion ? [service.Promotion] : [])
        ].filter(Boolean);

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
                
                const estado = String(p.estado || '').toLowerCase();
                if (estado !== '' && estado !== 'activa' && estado !== 'publicada') return null;
                
                const startStr = parseToDateStr(p.fechaInicio);
                const endStr = parseToDateStr(p.fechaFin);
                if (startStr && selectedDateStr < startStr) return null;
                if (endStr && selectedDateStr > endStr) return null;

                const dayOfWeek = selectedDateObj.getDay();
                if (p.diasValidos && String(p.diasValidos).trim() !== '') {
                    const validDays = String(p.diasValidos).split(',').map(Number);
                    if (!validDays.includes(dayOfWeek)) return null;
                }

                if (p.horaInicioValida && p.horaFinValida && String(p.horaInicioValida).trim() !== '') {
                    const sVal = parseInt(String(p.horaInicioValida).replace(':', ''), 10);
                    const eVal = parseInt(String(p.horaFinValida).replace(':', ''), 10);
                    if (eVal >= sVal) {
                        if (hourNum < sVal || hourNum > eVal) return null;
                    } else {
                        if (hourNum < sVal && hourNum > eVal) return null;
                    }
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

                const priorityScore = (p.tipoPromo === '2x1' || p.tipoPromo === '3x1' ? 95 : discount);
                return { hasPromotion: hasPromo, discountPercent: discount, labelText: label, source: 'manual' as const, priorityScore };
            })
            .filter(Boolean)
            .sort((a, b) => b!.priorityScore - a!.priorityScore);

        if (evaluatedPromos.length > 0) {
            const winner = evaluatedPromos[0]!;
            return { hasPromotion: true, discountPercent: winner.discountPercent, labelText: winner.labelText, source: winner.source };
        }

        if (automaticDiscount && automaticDiscount.enabled) {
            const discount = Math.round(automaticDiscount.discountPercentage);
            if (discount > 0) {
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
        setSelectedHour(null);
    };

    const handleHourSelect = (hour: string) => {
        if (!isRangeAvailable(hour)) return;
        setSelectedHour(hour);
        
        if (selectedDate && (selectedCanchaId || staffId)) {
            const currentService = canchas.find(c => c.id === selectedCanchaId) || canchas[0];
            const promo = resolveSlotPromotion(hour, selectedDate, currentService, automaticDiscount);
            onSelectSlot(selectedDate, hour, selectedCanchaId, selectedDuracion, promo.discountPercent);
        }
    };

    const handleConfirm = () => {
        if (selectedDate && selectedHour && (selectedCanchaId || staffId)) {
            const currentService = canchas.find(c => c.id === selectedCanchaId) || canchas[0];
            const promo = resolveSlotPromotion(selectedHour, selectedDate, currentService, automaticDiscount);
            onSelectSlot(selectedDate, selectedHour, selectedCanchaId, selectedDuracion, promo.discountPercent);
        }
    };

    const selectedCancha = canchas.find(c => c.id === selectedCanchaId) || canchas[0];
    const precioUnitario = Number(selectedCancha?.precioHora || (selectedCancha as any)?.precio || 0);
    const totalPrecio = selectedCancha 
        ? (staffId ? precioUnitario : precioUnitario * selectedDuracion)
        : 0;

    const isPastWeek = startOfWeek(currentWeek, { weekStartsOn: 1 }) <= startOfWeek(clientToday || new Date(), { weekStartsOn: 1 });

    const currentServiceForPromo = canchas.find(c => c.id === selectedCanchaId) || canchas[0];
    const selectedSlotPromo = selectedHour ? resolveSlotPromotion(selectedHour, selectedDate || new Date(), currentServiceForPromo, automaticDiscount) : { discountPercent: 0 };

    if (darkMode) {
        return (
            <div className="animate-in fade-in duration-700 bg-[#11141d] rounded-[2.5rem] p-6 sm:p-8 w-full max-w-xl mx-auto shadow-2xl relative border border-white/5 space-y-8 text-white text-left">
                {/* Cancha Selector */}
                {canchas.length > 1 && !staffId && (
                    <div className="flex flex-col space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">SELECCIONAR CANCHA</label>
                        <div className="flex gap-2 p-1.5 bg-[#1a1d24] rounded-2xl overflow-x-auto hide-scrollbar">
                            {canchas.map((cancha) => (
                                <button
                                    type="button"
                                    key={cancha.id}
                                    onClick={() => handleCanchaSelect(cancha.id)}
                                    className={cn(
                                        "flex-shrink-0 px-6 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-300 cursor-pointer",
                                        selectedCanchaId === cancha.id
                                            ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20"
                                            : "text-slate-500 hover:text-white"
                                    )}
                                >
                                    {cancha.nombre}
                                </button>
                            ))}
                        </div>
                        <div className="h-px w-full bg-white/5 mt-4" />
                    </div>
                )}

                {/* Date Selection Grid */}
                <div className="flex flex-col space-y-6">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">FECHA DE JUEGO</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                disabled={isPastWeek}
                                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                                className="text-slate-500 hover:text-white transition-colors disabled:opacity-20 cursor-pointer"
                            >
                                <ChevronLeft size={16} strokeWidth={3} />
                            </button>

                            <button
                                type="button"
                                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                            >
                                <ChevronRight size={16} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {weekDays.map((day) => {
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isPast = clientToday ? day < startOfDay(clientToday) : false;

                            return (
                                <button
                                    type="button"
                                    key={day.toISOString()}
                                    onClick={() => !isPast && handleDateSelect(day)}
                                    disabled={isPast}
                                    className={cn(
                                        "w-full pt-4 pb-3 rounded-2xl flex flex-col items-center justify-center transition-all border-2 relative cursor-pointer",
                                        isSelected
                                            ? "bg-emerald-500/10 border-emerald-500"
                                            : isPast
                                                ? "bg-[#141720] border-transparent opacity-30 cursor-not-allowed"
                                                : "bg-[#1a1d24] border-transparent hover:border-emerald-500/50 hover:bg-[#1f222a]"
                                    )}
                                >
                                    <span className={cn("text-[9px] sm:text-[10px] font-black uppercase mb-1 tracking-widest", isSelected ? "text-emerald-500" : "text-slate-500")}>
                                         {format(day, 'eee', { locale: es }).substring(0, 3)}
                                    </span>
                                    <span className={cn("text-[20px] sm:text-[24px] font-black leading-none", isSelected ? "text-white" : "text-slate-400")}>
                                        {format(day, 'd')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="relative h-px w-full bg-white/5">
                        <div className="absolute top-0 left-0 h-px w-32 bg-slate-500/50" />
                    </div>
                </div>

                {/* Duración Selector */}
                {duracionFija === undefined && (
                    <div className="flex flex-col space-y-6">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">TIEMPO DE JUEGO</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                            {DURACIONES.map((d) => (
                                <button
                                    type="button"
                                    key={d}
                                    onClick={() => handleDuracionSelect(d)}
                                    className={cn(
                                        "flex-shrink-0 w-20 h-16 rounded-2xl text-[15px] font-black transition-all flex items-center justify-center cursor-pointer",
                                        selectedDuracion === d
                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                            : "bg-[#1a1d24] text-slate-500 hover:text-white"
                                    )}
                                >
                                    {d % 1 === 0 ? `${d}h` : `${d}h`}
                                </button>
                            ))}
                        </div>
                        
                        <div className="relative h-px w-full bg-white/5">
                            <div className="absolute top-0 left-0 h-px w-32 bg-slate-500/50" />
                        </div>
                    </div>
                )}

                {/* Time Selection Grid */}
                <div className="flex flex-col space-y-6">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">HORARIOS DISPONIBLES</label>
                        {loadingBusy && (
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-bold text-emerald-500 italic">Actualizando...</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {hoursToRender.map((hour) => {
                            const busySlot = getBusySlot(hour);
                            const available = isRangeAvailable(hour);
                            const isSelected = selectedHour === hour;
                            const inRange = isInSelectedRange(hour) && !isSelected;
                            const currentService = canchas.find(c => c.id === selectedCanchaId) || canchas[0];
                            const promo = resolveSlotPromotion(hour, selectedDate || new Date(), currentService, automaticDiscount);

                            const isPending = busySlot && (busySlot.estado?.toLowerCase() === 'pending' || busySlot.estado?.toLowerCase() === 'pendiente');
                            const isBlocked = busySlot && busySlot.estado === 'blocked';

                            return (
                                <button
                                    type="button"
                                    key={hour}
                                    disabled={!available}
                                    onClick={() => handleHourSelect(hour)}
                                    className={cn(
                                        "relative h-14 rounded-3xl text-[14px] font-black tracking-wider transition-all border flex flex-col items-center justify-center overflow-hidden cursor-pointer",
                                        isSelected
                                            ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                            : inRange
                                                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                                : isPending
                                                    ? "bg-amber-500/5 border-amber-500/30 text-amber-500/60"
                                                    : available
                                                        ? "bg-[#1a1d24] border-transparent text-slate-400 hover:border-emerald-500/50 hover:text-white"
                                                        : "bg-[#141720] border-transparent text-slate-600/50 cursor-not-allowed"
                                    )}
                                >
                                    {promo.hasPromotion && available && (
                                        <div className="absolute top-0 right-0 bg-gradient-to-bl from-amber-400 to-orange-500 text-white text-[10px] pl-2 pr-3 py-0.5 rounded-bl-[14px] z-20 font-black flex items-center gap-0.5 shadow-sm">
                                            <Zap size={10} fill="currentColor" className="text-white drop-shadow-sm" />
                                            <span className="drop-shadow-sm">{promo.labelText}</span>
                                        </div>
                                    )}
                                    
                                    <span className={cn(
                                        isPending ? "text-[12px] mb-0.5" : "",
                                        isSelected ? "text-white font-black text-sm z-10 opacity-100" : ""
                                    )}>
                                        {hour}
                                    </span>
                                    
                                    {isPending && (
                                        <div className="flex flex-col items-center">
                                            <span className="text-[7px] font-black uppercase tracking-widest animate-pulse text-amber-500">PENDIENTE</span>
                                        </div>
                                    )}

                                    {!available && !isPending && !isBlocked && hour < format(new Date(), 'HH:mm') && isSameDay(selectedDate!, new Date()) && (
                                        <span className="text-[6px] font-black text-slate-700 uppercase tracking-widest">PASADO</span>
                                    )}
                                    
                                    {isBlocked && (
                                        <span className="text-[6px] font-black text-rose-500/40 uppercase tracking-widest">BLOQUEADO</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {selectedDuracion > 1 && (
                        <p className="text-[9px] text-slate-500 font-bold ml-1 italic tracking-wide">
                            * Mostrando solo bloques de {selectedDuracion}h libres consecutivas
                        </p>
                    )}
                </div>

                {/* Resumen y Confirmar Card (Igual a Cancha) */}
                {selectedHour && selectedCancha && (
                    <div className="mt-8 bg-[#11141d] border border-white/5 rounded-[2rem] p-5 sm:p-6 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 shadow-2xl">
                        <div className="flex gap-4 items-center">
                            <div className="size-16 bg-emerald-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 shrink-0">
                                <Clock size={28} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-[13px] font-black text-white uppercase tracking-wider truncate">
                                        {selectedCancha.nombre.length > 10 ? selectedCancha.nombre.substring(0, 10) + '...' : selectedCancha.nombre}
                                    </h4>
                                    <span className="text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex-shrink-0">
                                        {selectedDuracion} HORA{selectedDuracion !== 1 ? 'S' : ''}
                                    </span>
                                </div>
                                <p className="text-slate-400 font-bold text-[11px] uppercase tracking-wider leading-snug">
                                    {format(selectedDate!, "EEEE d 'DE' MMMM", { locale: es })} • {selectedHour} HS
                                </p>
                            </div>
                        </div>

                        <div className="h-px w-full bg-white/5 my-5" />

                        <div className="flex items-end justify-between">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">COSTO<br/>TOTAL</span>
                                <div className="flex items-baseline gap-2">
                                    {selectedSlotPromo.discountPercent > 0 ? (
                                        <>
                                            <span className="text-sm text-white/20 line-through font-bold">${totalPrecio}</span>
                                            <span className="text-[38px] font-black text-white leading-none tracking-tighter">
                                                ${totalPrecio * (1 - selectedSlotPromo.discountPercent / 100)}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-[38px] font-black text-white leading-none tracking-tighter">${totalPrecio}</span>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="bg-emerald-500 active:bg-emerald-600 text-white h-[60px] px-6 sm:px-8 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-3 uppercase shrink-0 cursor-pointer"
                            >
                                <span className="text-left leading-tight">RESERVAR<br/>AHORA</span>
                                <Check size={16} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-700 bg-white rounded-3xl p-4 sm:p-6 w-full max-w-xl mx-auto shadow-sm relative border border-gray-100 space-y-6 text-left">
            {canchas.length > 1 && !staffId && (
                <div className="flex flex-col space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Sede / Ubicación</label>
                    <div className="flex gap-2 pb-2 overflow-x-auto hide-scrollbar">
                        {canchas.map((cancha) => (
                            <button
                                type="button"
                                key={cancha.id}
                                onClick={() => handleCanchaSelect(cancha.id)}
                                className={cn(
                                    "flex-shrink-0 px-5 py-2.5 rounded-2xl text-[11px] font-black whitespace-nowrap transition-all duration-300 cursor-pointer",
                                    selectedCanchaId === cancha.id
                                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                {cancha.nombre}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">FECHA DE CITA</label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={isPastWeek}
                            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                            className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                            <ChevronLeft size={16} strokeWidth={2.5} />
                        </button>

                        <button
                            type="button"
                            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                            className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
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
                                type="button"
                                key={day.toISOString()}
                                onClick={() => !isDisabled && handleDateSelect(day)}
                                disabled={isDisabled}
                                className={cn(
                                    "w-full pt-3 pb-2 rounded-[1.2rem] flex flex-col items-center justify-center transition-all border-2 relative cursor-pointer",
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

            {duracionFija === undefined && (
                <div className="flex flex-col space-y-4 pt-2 border-t border-gray-100">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">DURACIÓN TENTATIVA</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar px-1">
                        {DURACIONES.map((d) => (
                            <button
                                type="button"
                                key={d}
                                onClick={() => handleDuracionSelect(d)}
                                className={cn(
                                    "flex-shrink-0 w-16 h-12 rounded-[1rem] text-[13px] font-black transition-all flex items-center justify-center shadow-sm cursor-pointer",
                                    selectedDuracion === d
                                        ? "bg-emerald-600 text-white shadow-emerald-600/20"
                                        : "bg-white border border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                                )}
                            >
                                {d % 1 === 0 ? `${d}h` : `${d}h`}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col space-y-4 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">HORARIOS DISPONIBLES</label>
                    {loadingBusy && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-emerald-600 italic">Buscando...</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {hoursToRender.map((hour) => {
                        const busySlot = getBusySlot(hour);
                        const available = isRangeAvailable(hour);
                        const isSelected = selectedHour === hour;
                        const inRange = isInSelectedRange(hour) && !isSelected;
                        const currentService = canchas.find(c => c.id === selectedCanchaId) || canchas[0];
                        const promo = resolveSlotPromotion(hour, selectedDate || new Date(), currentService, automaticDiscount);

                        const isPending = busySlot && (busySlot.estado?.toLowerCase() === 'pending' || busySlot.estado?.toLowerCase() === 'pendiente');

                        return (
                            <button
                                type="button"
                                key={hour}
                                disabled={!available}
                                onClick={() => handleHourSelect(hour)}
                                className={cn(
                                    "relative h-12 rounded-[1rem] text-[13px] font-black tracking-wider transition-all border flex flex-col items-center justify-center overflow-hidden cursor-pointer",
                                    isSelected
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/30"
                                        : inRange
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                            : isPending
                                                ? "bg-amber-50 border-amber-200 text-amber-500"
                                                : available
                                                    ? "bg-white border-emerald-500/10 text-slate-700 hover:border-emerald-500/40 hover:bg-emerald-50/30 shadow-sm"
                                                    : "bg-slate-100/70 border-transparent text-slate-350 line-through opacity-65 cursor-not-allowed"
                                )}
                            >
                                {promo.hasPromotion && available && (
                                    <div className="absolute top-0 right-0 bg-pink-500 text-white text-[7px] px-1.5 py-0.5 rounded-bl-[8px] z-20 font-black tracking-tighter uppercase">
                                        {promo.labelText}
                                    </div>
                                )}
                                
                                <span className={cn(
                                    isPending ? "text-[11px]" : "", 
                                    !available ? "line-through opacity-70" : ""
                                )}>
                                    {hour}
                                </span>

                                {!available && (
                                    <span className="text-[7px] font-bold text-slate-400/80 uppercase tracking-widest leading-none mt-0.5 scale-90">
                                        Ocupado
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
