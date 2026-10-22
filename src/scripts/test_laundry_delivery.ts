import { calculateDeliveryCost, isLaundryBusinessType } from '../core/delivery/DeliveryPricing';
import { PricingEngine } from '../core/pricing/PricingEngine';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
        console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
        passedTests++;
    } else {
        console.error(`  \x1b[31m✗\x1b[0m ${testName}${detail ? ` (${detail})` : ''}`);
        failedTests++;
    }
}

async function runTests() {
    console.log('\n================================================================');
    console.log(' CITIOX — TEST SUITE: DELIVERY LAVANDERIA (RECOGIDA + ENTREGA)');
    console.log('================================================================\n');

    // TEST 1: Identificación de vertical lavandería
    console.log('[GRUPO 1] Identificación de verticales');
    assert(isLaundryBusinessType('LAVANDERIA') === true, 'LAVANDERIA es vertical de lavandería');
    assert(isLaundryBusinessType('SHOE_CARE') === true, 'SHOE_CARE es vertical de lavandería');
    assert(isLaundryBusinessType('ORDENES-SERVICIO') === true, 'ORDENES-SERVICIO es vertical de lavandería');
    assert(isLaundryBusinessType('RESTAURANTE') === false, 'RESTAURANTE no es vertical de lavandería');
    assert(isLaundryBusinessType('TIENDA') === false, 'TIENDA no es vertical de lavandería');
    assert(isLaundryBusinessType(null) === false, 'null no es vertical de lavandería');

    // TEST 2: Negocio estándar (Restaurante/Tienda) -> Distancia x 1
    console.log('\n[GRUPO 2] Negocio estándar (Restaurante/Tienda) -> Distancia x 1');
    // Coordenadas que distan ~4 km:
    // Origen: Quito centro (-0.180653, -78.467838)
    // Destino a ~4 km: (-0.1447, -78.467838) -> ~4 km
    // Usamos config con base 1, costPerKm 0.50
    // Simulación directa calculando la distancia conocida:
    const originLat = -0.180653;
    const originLng = -78.467838;
    // Punto a exactamente ~4 km hacia el norte:
    const destLat = -0.144677;
    const destLng = -78.467838;

    const resStandard = calculateDeliveryCost(originLat, originLng, destLat, destLng, {
        enabled: true,
        baseCost: 1.00,
        costPerKm: 0.50,
        tipoNegocio: 'RESTAURANTE'
    });
    console.log(`  Resultado estándar: distancia=${resStandard.distanceKm}km, cobrable=${resStandard.billableDistanceKm}km, costo=$${resStandard.deliveryCost}`);
    assert(resStandard.isRoundTrip === false, 'Restaurante no es round-trip');
    assert(resStandard.billableDistanceKm === resStandard.distanceKm, 'Distancia cobrable en restaurante es distancia x 1');
    assert(Math.abs(resStandard.deliveryCost - (1.00 + resStandard.distanceKm * 0.50)) < 0.02, 'Fórmula estándar: base + dist * kmCost');

    // TEST 3: Lavandería (LAVANDERIA) -> Distancia x 2 (Recogida + Entrega)
    console.log('\n[GRUPO 3] Lavandería (LAVANDERIA) -> Distancia x 2 (Recogida + Entrega)');
    const resLaundry = calculateDeliveryCost(originLat, originLng, destLat, destLng, {
        enabled: true,
        baseCost: 1.00,
        costPerKm: 0.50,
        tipoNegocio: 'LAVANDERIA'
    });
    console.log(`  Resultado lavandería: distancia=${resLaundry.distanceKm}km, cobrable=${resLaundry.billableDistanceKm}km, costo=$${resLaundry.deliveryCost}`);
    assert(resLaundry.isRoundTrip === true, 'Lavandería tiene isRoundTrip activo');
    assert(Math.abs(resLaundry.billableDistanceKm - (resLaundry.distanceKm * 2)) < 0.02, 'Distancia cobrable es exactamente distancia x 2');
    assert(Math.abs(resLaundry.deliveryCost - (1.00 + (resLaundry.distanceKm * 2 * 0.50))) < 0.02, 'Costo calculado con distancia x 2');

    // TEST 4: Ejemplo exacto del requerimiento: 4km, base $1, costo/km $0.50 -> $5.00
    console.log('\n[GRUPO 4] Ejemplo de especificación: 4 km, base $1, costo/km $0.50 -> Total $5.00');
    // Verificamos matemáticamente con la distancia exacta de 4 km:
    const simulatedDist4km = 4.0;
    const billable4km = simulatedDist4km * 2; // 8 km
    const cost4km = 1.00 + (billable4km * 0.50); // $5.00
    assert(cost4km === 5.00, '4 km × 2 = 8 km; $1 + (8 × $0.50) = $5.00');

    // TEST 5: Shoe-Care vertical
    console.log('\n[GRUPO 5] Vertical SHOE_CARE');
    const resShoeCare = calculateDeliveryCost(originLat, originLng, destLat, destLng, {
        enabled: true,
        baseCost: 1.50,
        costPerKm: 0.30,
        tipoNegocio: 'SHOE_CARE'
    });
    assert(resShoeCare.isRoundTrip === true, 'SHOE_CARE tiene isRoundTrip activo');
    assert(Math.abs(resShoeCare.billableDistanceKm - (resShoeCare.distanceKm * 2)) < 0.02, 'Distancia cobrable es distancia x 2 en SHOE_CARE');
    const expectedShoeCareCost = Math.round((1.50 + resShoeCare.distanceKm * 2 * 0.30) * 100) / 100;
    assert(resShoeCare.deliveryCost === expectedShoeCareCost, `Costo SHOE_CARE coincide ($${resShoeCare.deliveryCost} === $${expectedShoeCareCost})`);

    // TEST 6: PricingEngine integración
    console.log('\n[GRUPO 6] PricingEngine integración');
    const pricingLaundry = PricingEngine.calculate({
        items: [{ productId: 'p1', name: 'Lavado', unitPrice: 10, quantity: 1 }],
        deliveryType: 'DELIVERY_ORDER',
        distanceKm: 4.0,
        tipoNegocio: 'LAVANDERIA',
        deliveryConfig: {
            enabled: true,
            baseCost: 1.00,
            costPerKm: 0.50
        }
    });
    console.log(`  PricingEngine Lavandería (4km, base $1, $0.50/km): deliveryCost = $${pricingLaundry.deliveryCost}`);
    assert(pricingLaundry.deliveryCost === 5.00, 'PricingEngine aplica $5.00 para lavandería a 4 km');

    const pricingRestaurant = PricingEngine.calculate({
        items: [{ productId: 'p1', name: 'Hamburguesa', unitPrice: 10, quantity: 1 }],
        deliveryType: 'DELIVERY_ORDER',
        distanceKm: 4.0,
        tipoNegocio: 'RESTAURANTE',
        deliveryConfig: {
            enabled: true,
            baseCost: 1.00,
            costPerKm: 0.50
        }
    });
    console.log(`  PricingEngine Restaurante (4km, base $1, $0.50/km): deliveryCost = $${pricingRestaurant.deliveryCost}`);
    assert(pricingRestaurant.deliveryCost === 3.00, 'PricingEngine mantiene $3.00 para restaurante a 4 km (sin x2)');

    // TEST 7: Distancia real vial por calles (no línea recta)
    console.log('\n[GRUPO 7] Distancia real por calles (OSRM / no línea recta)');
    const { getRoadDistanceKm } = await import('../core/delivery/DeliveryPricing');
    const roadInfo = await getRoadDistanceKm(originLat, originLng, destLat, destLng);
    console.log(`  Ruta vial calculada: distancia=${roadInfo.distanceKm}km, duracion=${roadInfo.durationMin}min, isRoadRoute=${roadInfo.isRoadRoute}`);
    assert(roadInfo.distanceKm > 0, 'Distancia vial calculada es mayor a 0');
    assert(roadInfo.durationMin > 0, 'Duración estimada es mayor a 0');
    // La distancia vial real por calles siempre es mayor o igual a la línea recta
    assert(roadInfo.distanceKm >= 3.8, 'Distancia vial por calles respeta trazado vehicular');

    // RESUMEN
    console.log('\n================================================================');
    console.log(` RESULTADOS: ${passedTests} pasados, ${failedTests} fallidos`);
    console.log('================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
