import prisma from '@/lib/prisma';
import { addMinutes, format, isBefore, isSameDay, parse, parseISO } from 'date-fns';

export interface TimeSlot {
    time: string;
    available: boolean;
}

export const staffSchedulingService = {
    /**
     * Calcula los horarios disponibles para un staff en una fecha específica,
     * considerando su horario habitual, excepciones, descansos y citas ya agendadas.
     */
    async getAvailableSlots(staffId: string, dateStr: string, serviceDurationMinutes: number = 60): Promise<TimeSlot[]> {
        const date = parseISO(dateStr);
        const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado

        // 1. Buscar Excepciones (Normalizar a UTC medianoche para coincidir con la DB)
        const d = new Date(dateStr);
        const startOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
        const endOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));

        const exception = await prisma.StaffException.findFirst({
            where: {
                staffId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        if (exception?.type === 'off') {
            return []; // Día libre
        }

        // 2. Determinar Horario Base (Combinando con el del negocio)
        let startTimeStr = "09:00";
        let endTimeStr = "18:00";
        let breaks: { start: string, end: string }[] = [];

        // Obtener datos del negocio para fallback
        const staff = await prisma.Staff.findUnique({
            where: { id: staffId },
            include: { Negocio: true }
        });

        const negocio = staff?.Negocio;
        if (!staff || !negocio) return [];

        if (exception?.type === 'custom' && exception.customStart && exception.customEnd) {
            startTimeStr = exception.customStart;
            endTimeStr = exception.customEnd;
        } else {
            const schedule = await prisma.StaffSchedule.findFirst({
                where: {
                    staffId,
                    dayOfWeek,
                    active: true
                }
            });

            if (!schedule) {
                // Fallback: Si no tiene horario específico, usamos el del negocio
                startTimeStr = negocio.horarioApertura;
                endTimeStr = negocio.horarioCierre;
            } else {
                startTimeStr = schedule.startTime;
                endTimeStr = schedule.endTime;
                if (schedule.breaks) {
                    try {
                        breaks = JSON.parse(schedule.breaks);
                    } catch (e) {
                        console.error("Error parsing breaks JSON", e);
                    }
                }
            }
        }

        // 3. Buscar Citas Existentes para ese día
        const appointments = await prisma.Appointment.findMany({
            where: {
                staffId,
                fecha: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                estado: {
                    notIn: ['CANCELADA', 'RECHAZADA', 'cancelled', 'rejected', 'expired', 'EXPIRADA']
                },
                // Solo contar las pendientes si NO han expirado todavía
                OR: [
                    { estado: { not: 'pending' } },
                    { 
                        AND: [
                            { estado: 'pending' },
                            { expiresAt: { gt: new Date() } }
                        ]
                    }
                ]
            }
        });

        // 4. Buscar Bloqueos
        const bloqueos = await prisma.Bloqueo.findMany({
            where: {
                staffId,
                fecha: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        // 5. Generar Slots y Validar Disponibilidad
        return this.generateTimeSlots(date, startTimeStr, endTimeStr, serviceDurationMinutes, breaks, appointments, bloqueos);
    },

    generateTimeSlots(date: Date, startTimeStr: string, endTimeStr: string, intervalMinutes: number, breaks: { start: string, end: string }[], appointments: any[], bloqueos: any[] = []): TimeSlot[] {
        const slots: TimeSlot[] = [];
        const baseDateStr = format(date, 'yyyy-MM-dd');
        
        let currentSlot = parse(`${baseDateStr} ${startTimeStr}`, 'yyyy-MM-dd HH:mm', new Date());
        const endTime = parse(`${baseDateStr} ${endTimeStr}`, 'yyyy-MM-dd HH:mm', new Date());

        const now = new Date();
        const isToday = isSameDay(date, now);

        while (isBefore(currentSlot, endTime)) {
            const slotEndTime = addMinutes(currentSlot, intervalMinutes);
            if (slotEndTime > endTime) {
                break; // El servicio no cabe antes de la hora de salida
            }

            const slotTimeStr = format(currentSlot, 'HH:mm');
            const slotEndTimeStr = format(slotEndTime, 'HH:mm');
            let isAvailable = true;

            // Validar si es tiempo pasado (solo para hoy)
            if (isToday && isBefore(currentSlot, now)) {
                isAvailable = false;
            }

            // Validar Descansos
            for (const b of breaks) {
                if (
                    (slotTimeStr >= b.start && slotTimeStr < b.end) || // Empieza en el descanso
                    (slotEndTimeStr > b.start && slotEndTimeStr <= b.end) || // Termina en el descanso
                    (slotTimeStr <= b.start && slotEndTimeStr >= b.end) // Envuelve el descanso completament
                ) {
                    isAvailable = false;
                    break;
                }
            }

            // Validar Bloqueos
            if (isAvailable) {
                for (const bloq of bloqueos) {
                    const bloqStart = bloq.horaInicio;
                    const bloqEnd = bloq.horaFin;
                    
                    if (
                        (slotTimeStr >= bloqStart && slotTimeStr < bloqEnd) ||
                        (slotEndTimeStr > bloqStart && slotEndTimeStr <= bloqEnd) ||
                        (slotTimeStr <= bloqStart && slotEndTimeStr >= bloqEnd)
                    ) {
                        isAvailable = false;
                        break;
                    }
                }
            }

            // Validar Citas
            if (isAvailable) {
                for (const app of appointments) {
                    const appStart = app.horaInicio;
                    const appEnd = app.horaFin;
                    
                    if (
                        (slotTimeStr >= appStart && slotTimeStr < appEnd) ||
                        (slotEndTimeStr > appStart && slotEndTimeStr <= appEnd) ||
                        (slotTimeStr <= appStart && slotEndTimeStr >= appEnd)
                    ) {
                        isAvailable = false;
                        break;
                    }
                }
            }

            slots.push({
                time: slotTimeStr,
                available: isAvailable
            });

            // Incremento para el próximo slot: 30 minutos es un buen estándar para Spas
            currentSlot = addMinutes(currentSlot, 30);
        }

        return slots;
    }
};
