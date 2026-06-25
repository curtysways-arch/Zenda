/**
 * Utilidades para el manejo de fechas y zonas horarias alineadas con los negocios de CitiOx.
 * Evita el uso del horario del servidor (UTC o horario europeo del VPS).
 */

export function getBusinessTimeZone(negocioConfiguracion: any): string {
    let timeZone = 'America/Bogota'; // fallback por defecto de la PWA (GMT-5)
    if (negocioConfiguracion) {
        try {
            const config = typeof negocioConfiguracion === 'string'
                ? JSON.parse(negocioConfiguracion)
                : negocioConfiguracion;
            if (config.timeZone) {
                timeZone = config.timeZone;
            }
        } catch (_) {}
    }
    return timeZone;
}

export function getUtcFromLocalInTimeZone(localDateTime: Date, timeZone: string): Date {
    const tempDate = new Date();
    const utcTime = new Date(tempDate.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzTime = new Date(tempDate.toLocaleString("en-US", { timeZone }));
    const offsetMs = tzTime.getTime() - utcTime.getTime();
    return new Date(localDateTime.getTime() - offsetMs);
}

export function getSubscriptionDates(
    timeZone: string = 'America/Bogota',
    options: { durationDays?: number; durationMonths?: number; baseDate?: Date } = {}
) {
    const { durationDays, durationMonths, baseDate = new Date() } = options;
    
    // Obtener la fecha local en el timezone para establecer la base del día (00:00:00)
    const tzDateString = baseDate.toLocaleString("en-US", { timeZone });
    const localBase = new Date(tzDateString);
    
    // Inicio local hoy a las 00:00:00.000
    const localStart = new Date(Date.UTC(localBase.getFullYear(), localBase.getMonth(), localBase.getDate(), 0, 0, 0, 0));
    
    // Fin local
    let localEnd = new Date(localStart);
    if (durationDays) {
        localEnd.setDate(localStart.getDate() + durationDays);
    } else if (durationMonths) {
        localEnd.setMonth(localStart.getMonth() + durationMonths);
    } else {
        // Por defecto 1 mes
        localEnd.setMonth(localStart.getMonth() + 1);
    }
    
    // Restamos 1 milisegundo para que termine a las 23:59:59.999 del día anterior
    localEnd = new Date(localEnd.getTime() - 1);
    
    return {
        startDate: getUtcFromLocalInTimeZone(localStart, timeZone),
        endDate: getUtcFromLocalInTimeZone(localEnd, timeZone)
    };
}

export function getMonthRangeInTimeZone(timeZone: string = 'America/Bogota', referenceDate: Date = new Date()) {
    const tzDateString = referenceDate.toLocaleString("en-US", { timeZone });
    const localRef = new Date(tzDateString);
    
    const localStart = new Date(Date.UTC(localRef.getFullYear(), localRef.getMonth(), 1, 0, 0, 0, 0));
    const localEnd = new Date(Date.UTC(localRef.getFullYear(), localRef.getMonth() + 1, 0, 23, 59, 59, 999));
    
    return {
        startOfMonth: getUtcFromLocalInTimeZone(localStart, timeZone),
        endOfMonth: getUtcFromLocalInTimeZone(localEnd, timeZone)
    };
}
