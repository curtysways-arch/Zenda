import prisma from '../src/lib/prisma';
import { resolveLandingContent } from '../src/lib/landingContentResolver';

async function runTests() {
  console.log('🧪 Iniciando batería completa de tests para el Constructor Universal de Hero y Destacados...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail: string = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // ID de negocio demo para pruebas
  const testBusinessId = 'test-hero-business-' + Date.now();

  try {
    // Crear negocio de prueba
    await (prisma as any).negocio.create({
      data: {
        id: testBusinessId,
        nombre: 'Negocio de Pruebas Hero',
        slug: 'test-hero-slug-' + Date.now(),
        tipoNegocio: 'RESTAURANTE',
        precioHora: 0,
        horarioApertura: '08:00',
        horarioCierre: '20:00',
        updatedAt: new Date()
      }
    });

    const businessBId = 'test-hero-business-B-' + Date.now();
    await (prisma as any).negocio.create({
      data: {
        id: businessBId,
        nombre: 'Negocio B de Pruebas',
        slug: 'test-hero-b-' + Date.now(),
        tipoNegocio: 'SPA',
        precioHora: 0,
        horarioApertura: '08:00',
        horarioCierre: '20:00',
        updatedAt: new Date()
      }
    });

    // ── TEST 1: Migración real de negocios existentes ──────────────────────────
    const canchasResolved = await resolveLandingContent('demo-canchas-id-100');
    assert(canchasResolved.hero.length === 3, 'Test 1: Negocio CANCHA LOS CAMPEONES conserva sus 3 imágenes migradas', `Obtenidas ${canchasResolved.hero.length} imágenes`);

    const sneakerResolved = await resolveLandingContent('sneaker-wash-id');
    assert(sneakerResolved.hero.length === 3, 'Test 2: Negocio Sneaker Wash Premium conserva sus 3 imágenes migradas', `Obtenidas ${sneakerResolved.hero.length} imágenes`);

    // ── TEST 2: Preservación de orden de posiciones ───────────────────────────
    const firstImg = canchasResolved.hero[0]?.image;
    const secondImg = canchasResolved.hero[1]?.image;
    assert(firstImg.includes('photo-1554068865') && secondImg.includes('photo-1526232761'), 'Test 3: Preservación exacta de orden de posiciones');

    // ── TEST 3: Imagen sin título ni descripción ni botón ──────────────────────
    const singleHero = await (prisma as any).heroItem.create({
      data: {
        businessId: testBusinessId,
        type: 'IMAGE',
        sourceType: 'CUSTOM',
        image: 'https://example.com/banner1.jpg',
        title: null,
        description: null,
        buttonEnabled: false,
        isActive: true,
        position: 0
      }
    });
    const res1 = await resolveLandingContent(testBusinessId);
    assert(res1.hero.length === 1 && res1.hero[0].image === 'https://example.com/banner1.jpg', 'Test 4: Hero de imagen sin título/descripción/botón funciona correctamente');
    assert(res1.hero[0].button.enabled === false, 'Test 5: Botón desactivado correctamente cuando buttonEnabled = false');

    // ── TEST 4: Hero con botón habilitado ─────────────────────────────────────
    await (prisma as any).heroItem.create({
      data: {
        businessId: testBusinessId,
        type: 'IMAGE',
        sourceType: 'CUSTOM',
        image: 'https://example.com/banner2.jpg',
        title: 'Título Hero 2',
        description: 'Descripción Hero 2',
        buttonEnabled: true,
        buttonText: 'Ver Ahora',
        actionType: 'INTERNAL_URL',
        actionValue: '/menu',
        isActive: true,
        position: 1
      }
    });

    const res2 = await resolveLandingContent(testBusinessId);
    assert(res2.hero.length === 2 && res2.hero[1].button.enabled === true && res2.hero[1].button.text === 'Ver Ahora', 'Test 6: Hero con botón configurado retorna datos del botón');

    // ── TEST 5: Hero inactivo ────────────────────────────────────────────────
    await (prisma as any).heroItem.create({
      data: {
        businessId: testBusinessId,
        type: 'IMAGE',
        sourceType: 'CUSTOM',
        image: 'https://example.com/inactive.jpg',
        isActive: false,
        position: 2
      }
    });
    const res3 = await resolveLandingContent(testBusinessId);
    assert(res3.hero.length === 2, 'Test 7: Hero inactivo es excluido del resolver');

    // ── TEST 6: Programación con fecha futura y vencida ──────────────────────
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await (prisma as any).heroItem.create({
      data: {
        businessId: testBusinessId,
        type: 'IMAGE',
        image: 'https://example.com/future.jpg',
        isActive: true,
        startAt: tomorrow,
        position: 3
      }
    });

    await (prisma as any).heroItem.create({
      data: {
        businessId: testBusinessId,
        type: 'IMAGE',
        image: 'https://example.com/expired.jpg',
        isActive: true,
        endAt: yesterday,
        position: 4
      }
    });

    const res4 = await resolveLandingContent(testBusinessId);
    assert(res4.hero.length === 2, 'Test 8: Fechas futuras y vencidas son excluidas correctamente por el resolver');

    // ── TEST 7: Hero Automático con Promoción ─────────────────────────────────
    const promoId = 'test-promo-' + Date.now();
    await (prisma as any).promotion.create({
      data: {
        id: promoId,
        businessId: testBusinessId,
        titulo: 'Promo Test 50% Off',
        descripcion: 'Detalle de la promo',
        precioPromo: 15,
        precioAnterior: 30,
        imagenUrl: 'https://example.com/promo.jpg',
        fechaInicio: yesterday,
        fechaFin: tomorrow,
        estado: 'activo',
        updatedAt: new Date()
      }
    });

    const autoHero = await (prisma as any).heroItem.create({
      data: {
        businessId: testBusinessId,
        type: 'AUTOMATIC',
        isActive: true,
        position: 0 // Prioritario
      }
    });

    const res5 = await resolveLandingContent(testBusinessId);
    const autoResolved = res5.hero.find(h => h.id === autoHero.id);
    assert(autoResolved !== undefined && autoResolved.title === 'Promo Test 50% Off', 'Test 9: Hero Automático resuelve promoción activa destacada');

    // ── TEST 8: Hero Automático con Producto cuando no hay promo ───────────────
    // Desactivar promo
    await (prisma as any).promotion.update({
      where: { id: promoId },
      data: { estado: 'inactivo' }
    });

    const prodId = 'test-prod-' + Date.now();
    await (prisma as any).producto.create({
      data: {
        id: prodId,
        negocioId: testBusinessId,
        nombre: 'Hamburguesa Triple Test',
        descripcion: 'Con queso cheddar y tocineta',
        precio: 12.5,
        imagenUrl: 'https://example.com/burger.jpg',
        activo: true
      }
    });

    const res6 = await resolveLandingContent(testBusinessId);
    const autoResolvedProd = res6.hero.find(h => h.id === autoHero.id);
    assert(autoResolvedProd !== undefined && autoResolvedProd.title === 'Hamburguesa Triple Test', 'Test 10: Hero Automático resuelve producto activo cuando no hay promoción');

    // ── TEST 9: Entidad eliminada o inactiva descarta el Hero ─────────────────
    const linkedHero = await (prisma as any).heroItem.create({
      data: {
        businessId: testBusinessId,
        type: 'PRODUCT',
        sourceType: 'PRODUCT',
        sourceId: prodId,
        isActive: true,
        position: 10
      }
    });

    // Inactivar producto
    await (prisma as any).producto.update({
      where: { id: prodId },
      data: { activo: false }
    });

    const res7 = await resolveLandingContent(testBusinessId);
    const linkedResolved = res7.hero.find(h => h.id === linkedHero.id);
    assert(linkedResolved === undefined, 'Test 11: Hero que apunta a producto inactivo es descartado sin romper la página');

    // ── TEST 10: Destacados (Highlights) ──────────────────────────────────────
    const highlight = await (prisma as any).highlightItem.create({
      data: {
        businessId: testBusinessId,
        type: 'IMAGE',
        sourceType: 'CUSTOM',
        image: 'https://example.com/highlight1.jpg',
        title: 'Tarjeta Destacada 1',
        description: 'Descripción destacado',
        isActive: true,
        position: 0
      }
    });

    const res8 = await resolveLandingContent(testBusinessId);
    assert(res8.highlights.length === 1 && res8.highlights[0].title === 'Tarjeta Destacada 1', 'Test 12: Creación y resolución de elementos Destacados');

    // ── TEST 11: Aislamiento Multi-Tenant ─────────────────────────────────────
    const resB = await resolveLandingContent(businessBId);
    assert(resB.hero.length === 0 && resB.highlights.length === 0, 'Test 13: Aislamiento Multi-Tenant - Negocio B no ve items del Negocio A');

    // Limpieza de datos de prueba
    await (prisma as any).heroItem.deleteMany({ where: { businessId: { in: [testBusinessId, businessBId] } } });
    await (prisma as any).highlightItem.deleteMany({ where: { businessId: { in: [testBusinessId, businessBId] } } });
    await (prisma as any).producto.deleteMany({ where: { negocioId: testBusinessId } });
    await (prisma as any).promotion.deleteMany({ where: { businessId: testBusinessId } });
    await (prisma as any).negocio.deleteMany({ where: { id: { in: [testBusinessId, businessBId] } } });

  } catch (err: any) {
    console.error('❌ Error durante la ejecución de los tests:', err);
    failed++;
  }

  console.log(`\n📊 RESULTADO DE BATERÍA DE TESTS: ${passed} PASADOS, ${failed} FALLADOS.`);
  if (failed > 0) process.exit(1);
}

runTests()
  .finally(async () => {
    await prisma.$disconnect?.();
  });
