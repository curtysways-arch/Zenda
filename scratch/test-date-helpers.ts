import { getBusinessTimeZone, getUtcFromLocalInTimeZone, getSubscriptionDates, getMonthRangeInTimeZone } from '../src/lib/dateUtils';

function runTests() {
    console.log("=== INICIANDO PRUEBAS DE HELPERS DE FECHAS ===");

    // Prueba 1: getBusinessTimeZone
    console.log("\n[Prueba 1] getBusinessTimeZone");
    const configString = '{"timeZone": "America/Guayaquil"}';
    const configObj = { timeZone: 'America/Lima' };
    const configEmpty = {};
    
    console.log("String JSON America/Guayaquil ->", getBusinessTimeZone(configString) === "America/Guayaquil" ? "✅ PASÓ" : "❌ FALLÓ");
    console.log("Objeto JSON America/Lima ->", getBusinessTimeZone(configObj) === "America/Lima" ? "✅ PASÓ" : "❌ FALLÓ");
    console.log("Objeto vacío (default) ->", getBusinessTimeZone(configEmpty) === "America/Bogota" ? "✅ PASÓ" : "❌ FALLÓ");

    // Prueba 2: getUtcFromLocalInTimeZone
    console.log("\n[Prueba 2] getUtcFromLocalInTimeZone (America/Bogota, UTC-5)");
    // 2026-06-25T00:00:00.000 local en Bogotá debería ser 2026-06-25T05:00:00.000Z en UTC
    const localDateTime = new Date(Date.UTC(2026, 5, 25, 0, 0, 0, 0)); // Junio es 5
    const utcDateTime = getUtcFromLocalInTimeZone(localDateTime, 'America/Bogota');
    console.log("Local simulado:", localDateTime.toISOString());
    console.log("UTC resultante:", utcDateTime.toISOString());
    console.log("Resultado ->", utcDateTime.toISOString() === "2026-06-25T05:00:00.000Z" ? "✅ PASÓ" : "❌ FALLÓ");

    // Prueba 3: getSubscriptionDates
    console.log("\n[Prueba 3] getSubscriptionDates (Trial 14 días)");
    // Si inicia el 25 de Junio, debería empezar a las 05:00:00 UTC (00:00:00 local Bogota)
    // Y terminar 14 días después, es decir, el 9 de Julio a las 04:59:59.999 UTC (23:59:59.999 local del 8 de Julio)
    const baseDate = new Date("2026-06-25T15:30:00Z"); // Representa las 10:30 AM local
    const { startDate, endDate } = getSubscriptionDates('America/Bogota', { durationDays: 14, baseDate });
    console.log("startDate:", startDate.toISOString());
    console.log("endDate:", endDate.toISOString());
    console.log("Inicio correcto ->", startDate.toISOString() === "2026-06-25T05:00:00.000Z" ? "✅ PASÓ" : "❌ FALLÓ");
    console.log("Fin correcto ->", endDate.toISOString() === "2026-07-09T04:59:59.999Z" ? "✅ PASÓ" : "❌ FALLÓ");

    // Prueba 4: getSubscriptionDates (Suscripción Mensual)
    console.log("\n[Prueba 4] getSubscriptionDates (Mensual)");
    // Inicia el 25 de Junio, termina el 26 de Julio a las 04:59:59.999 UTC (23:59:59.999 local del 25 de Julio)
    const resMonth = getSubscriptionDates('America/Bogota', { durationMonths: 1, baseDate });
    console.log("startDate:", resMonth.startDate.toISOString());
    console.log("endDate:", resMonth.endDate.toISOString());
    console.log("Inicio correcto ->", resMonth.startDate.toISOString() === "2026-06-25T05:00:00.000Z" ? "✅ PASÓ" : "❌ FALLÓ");
    console.log("Fin correcto ->", resMonth.endDate.toISOString() === "2026-07-25T04:59:59.999Z" ? "✅ PASÓ" : "❌ FALLÓ");

    // Prueba 5: getMonthRangeInTimeZone
    console.log("\n[Prueba 5] getMonthRangeInTimeZone");
    // Para el 25 de Junio de 2026, debería dar:
    // startOfMonth: 2026-06-01T05:00:00.000Z
    // endOfMonth: 2026-07-01T04:59:59.999Z
    const { startOfMonth, endOfMonth } = getMonthRangeInTimeZone('America/Bogota', baseDate);
    console.log("startOfMonth:", startOfMonth.toISOString());
    console.log("endOfMonth:", endOfMonth.toISOString());
    console.log("startOfMonth correcto ->", startOfMonth.toISOString() === "2026-06-01T05:00:00.000Z" ? "✅ PASÓ" : "❌ FALLÓ");
    console.log("endOfMonth correcto ->", endOfMonth.toISOString() === "2026-07-01T04:59:59.999Z" ? "✅ PASÓ" : "❌ FALLÓ");

    console.log("\n=== PRUEBAS FINALIZADAS ===");
}

runTests();
