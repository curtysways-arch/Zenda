import { CourtBookingService } from '../src/modules/sports-courts/services/courtBookingService';

console.log("=== VERIFICACIÓN DEL MÓDULO SPORTS_COURTS ===");

const rule = {
  slotGranularityMinutes: 90,
  enableNightLightingFee: true,
  nightLightingStartHour: 18,
  nightLightingFeeAmount: 5000,
};

const dayPrice = CourtBookingService.calculateCourtPrice(25000, "14:00", rule);
const nightPrice = CourtBookingService.calculateCourtPrice(25000, "19:00", rule);

console.log("Precio Turno Día (14:00):", dayPrice, "COP (Tarifa base)");
console.log("Precio Turno Noche (19:00 con Luz):", nightPrice, "COP (Incluye suplemento iluminación)");

if (nightPrice === 30000 && dayPrice === 25000) {
  console.log("\n✅ CÁLCULO DE TARIFAS DE CANCHA OPERATIVO AL 100%");
} else {
  console.error("❌ Error en cálculo de tarifas");
}
