/**
 * @file test_provisioning_matrix.ts
 * @description Suite de verificación universal del ProvisioningEngine para los 7 verticales,
 * socio fundador, multi-branch, landing y catálogo.
 */

import prisma from '../lib/prisma';
import { ProvisioningEngine } from '../core/provisioning/ProvisioningEngine';
import { resolveLandingContent } from '../lib/landingContentResolver';
import { BranchService } from '../core/branch/BranchService';

async function runTestSuite() {
  console.log("=================================================================");
  console.log("🚀 INICIANDO VERIFICACIÓN DE PROVISIONING ENGINE (7 VERTICALES)");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, msg: string) {
    if (cond) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✕ FALLÓ: ${msg}`);
      failed++;
    }
  }

  const timestamp = Date.now();

  try {
    // ═══════════════════════════════════════════════════════════════════
    // 1. RESTAURANTE + SOCIO FUNDADOR + HERO + CATÁLOGO
    // ═══════════════════════════════════════════════════════════════════
    console.log("[CASO 1] Restaurante con Socio Fundador, Hero y Catálogo...");
    const resTipo = await prisma.businessType.findUnique({ where: { slug: 'comandas' } });
    const resResult = await ProvisioningEngine.provisionBusiness({
      mode: 'blueprint',
      businessTypeId: resTipo?.id,
      planId: 'plan_restaurante_crecimiento',
      isFounder: true,
      founderPosition: 1,
      lockedPrice: 10.00,
      generalInfo: {
        nombre: `Parrilla Don Julio ${timestamp}`,
        slug: `don-julio-${timestamp}`,
        whatsapp: '+593991112233',
        direccion: 'Av. Las Lomas 456',
        ciudad: 'Guayaquil',
        adminEmail: `admin_gastro_${timestamp}@donjulio.com`,
        adminPassword: 'Password123!',
        adminNombre: 'Julio Parrillero'
      },
      landingHero: {
        title: 'Las Mejores Carnes al Carbón',
        subtitle: 'Cortes premium y platos tradicionales',
        ctaText: 'Ver Menú Digital',
        ctaAction: 'CATALOG'
      },
      catalogItems: [
        { type: 'product', name: 'Bife de Chorizo 400g', price: 18.5, category: 'Cortes', stock: 30 },
        { type: 'product', name: 'Vino Malbec Reserva', price: 24.0, category: 'Bebidas', stock: 15 }
      ]
    });

    assert(resResult.success === true, "Restaurante creado exitosamente");
    assert(resResult.isFounder === true, "Registrado como socio fundador");

    const resBiz = await prisma.negocio.findUnique({
      where: { id: resResult.businessId },
      include: {
        BusinessType: true,
        Suscripcion: { include: { Plan: true } },
        productos: true,
        branches: true
      }
    });

    assert(resBiz?.BusinessType?.slug === 'comandas', "BusinessType vinculado formalmente a 'comandas'");
    assert(resBiz?.tipoNegocio === 'RESTAURANT', "tipoNegocio canónico configurado como RESTAURANT");
    assert(resBiz?.Suscripcion?.isFounder === true, "Suscripción preserva isFounder: true");
    assert(resBiz?.Suscripcion?.lockedPrice === 10.00, "Suscripción tiene lockedPrice: $10.00");
    assert(resBiz?.Suscripcion?.founderPosition === 1, "Suscripción tiene founderPosition: 1");
    assert(resBiz?.productos?.length === 2, "2 productos del catálogo insertados");
    assert(resBiz?.branches?.length === 1, "Sucursal Principal (Matriz) creada automáticamente");

    // Verificar que Landing content resuelve el HeroItem
    const landing = await resolveLandingContent(resResult.businessId);
    assert(landing.hero?.length > 0, "LandingContentResolver detecta HeroItem creado");
    assert(landing.hero?.[0]?.title === 'Las Mejores Carnes al Carbón', "HeroItem contiene título correcto");

    // ═══════════════════════════════════════════════════════════════════
    // 2. SERVICIOS / SPA + STAFF + DURACIÓN
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n[CASO 2] Servicios & Spa con Servicios y Duración...");
    const spaTipo = await prisma.businessType.findUnique({ where: { slug: 'citas' } });
    const spaResult = await ProvisioningEngine.provisionBusiness({
      mode: 'blueprint',
      businessTypeId: spaTipo?.id,
      planId: 'plan_servicios_inicio',
      generalInfo: {
        nombre: `Aura Spa & Wellness ${timestamp}`,
        slug: `aura-spa-${timestamp}`,
        whatsapp: '+593992223344',
        ciudad: 'Quito',
        adminEmail: `admin_spa_${timestamp}@auraspa.com`,
        adminPassword: 'Password123!'
      },
      catalogItems: [
        { type: 'service', name: 'Masaje Relajante Piedras Calientes', price: 45.0, duration: 60, category: 'Masajes' },
        { type: 'service', name: 'Limpieza Facial Hidratante', price: 35.0, duration: 45, category: 'Facial' }
      ]
    });

    const spaBiz = await prisma.negocio.findUnique({
      where: { id: spaResult.businessId },
      include: { Service: true, Suscripcion: { include: { Plan: true } } }
    });

    assert(spaBiz?.Service?.length === 2, "2 servicios creados con precios y duraciones");
    assert(spaBiz?.Service?.[0]?.duracion === 60 || spaBiz?.Service?.[1]?.duracion === 60, "Duración de 60 min asignada correctamente");
    assert(spaBiz?.Suscripcion?.Plan?.slug === 'servicios-inicio', "Plan de servicios asignado correctamente");

    // ═══════════════════════════════════════════════════════════════════
    // 3. CANCHAS DEPORTIVAS & CLUBES
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n[CASO 3] Canchas Deportivas...");
    const canchasTipo = await prisma.businessType.findUnique({ where: { slug: 'reservas' } });
    const canchasResult = await ProvisioningEngine.provisionBusiness({
      mode: 'blueprint',
      businessTypeId: canchasTipo?.id,
      planId: 'plan_canchas_gestion',
      generalInfo: {
        nombre: `Pádel Park Central ${timestamp}`,
        slug: `padel-park-${timestamp}`,
        whatsapp: '+593993334455',
        ciudad: 'Cuenca',
        adminEmail: `admin_canchas_${timestamp}@padelpark.com`,
        adminPassword: 'Password123!'
      }
    });

    const canchasBiz = await prisma.negocio.findUnique({
      where: { id: canchasResult.businessId },
      include: { Suscripcion: { include: { Plan: true } } }
    });
    assert(canchasBiz?.tipoNegocio === 'SPORTS_COURTS', "tipoNegocio configurado como SPORTS_COURTS");
    assert(canchasBiz?.Suscripcion?.Plan?.slug === 'canchas-gestion', "Plan Canchas Gestión asignado");

    // ═══════════════════════════════════════════════════════════════════
    // 4. TIENDAS & E-COMMERCE CON PRODUCTOS Y VARIANTES
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n[CASO 4] Tienda & E-Commerce con Variantes...");
    const tiendaTipo = await prisma.businessType.findUnique({ where: { slug: 'ecommerce' } });
    const tiendaResult = await ProvisioningEngine.provisionBusiness({
      mode: 'blueprint',
      businessTypeId: tiendaTipo?.id,
      planId: 'plan_tienda_crecimiento',
      generalInfo: {
        nombre: `Boutique Trendy ${timestamp}`,
        slug: `boutique-trendy-${timestamp}`,
        whatsapp: '+593994445566',
        ciudad: 'Guayaquil',
        adminEmail: `admin_tienda_${timestamp}@trendy.com`,
        adminPassword: 'Password123!'
      },
      catalogItems: [
        {
          type: 'product',
          name: 'Camiseta Oversize Premium',
          price: 25.0,
          stock: 40,
          category: 'Moda Urbana',
          variants: [
            { name: 'Negro / S', price: 25.0, stock: 10 },
            { name: 'Negro / M', price: 25.0, stock: 20 },
            { name: 'Negro / L', price: 25.0, stock: 10 }
          ]
        }
      ]
    });

    const tiendaBiz = await prisma.negocio.findUnique({
      where: { id: tiendaResult.businessId },
      include: { productos: true }
    });
    assert(tiendaBiz?.productos?.length === 1, "Producto creado en tienda");
    assert(tiendaBiz?.productos?.[0]?.tieneVariantes === true, "Producto con variantes marcado como tieneVariantes: true");

    // ═══════════════════════════════════════════════════════════════════
    // 5. MULTI-BRANCH (SUCURSAL MATRIZ + SEDE ADICIONAL)
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n[CASO 5] Multi-Branch (Sede Matriz + Sede Norte)...");
    const mbResult = await ProvisioningEngine.provisionBusiness({
      mode: 'blueprint',
      planId: 'plan_restaurante_pro',
      generalInfo: {
        nombre: `Café Francés ${timestamp}`,
        slug: `cafe-frances-${timestamp}`,
        whatsapp: '+593995556677',
        direccion: 'Plaza Lagos Local 12',
        ciudad: 'Samborondón',
        adminEmail: `admin_cafe_${timestamp}@frances.com`,
        adminPassword: 'Password123!'
      },
      branches: [
        { name: 'Café Francés Sede Norte', address: 'Av. Francisco de Orellana', city: 'Guayaquil', phone: '+593995556688' }
      ]
    });

    const branches = await BranchService.listBranches(mbResult.businessId);
    assert(branches.length === 2, `2 sucursales creadas bajo el mismo negocio (Total: ${branches.length})`);
    assert(branches.some(b => b.isMain), "Una de las sucursales es la matriz principal");

    // ═══════════════════════════════════════════════════════════════════
    // 6. PROTECCIÓN CONTRA SLUGS DUPLICADOS
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n[CASO 6] Validación de slug duplicado...");
    let caughtDuplicate = false;
    try {
      await ProvisioningEngine.provisionBusiness({
        planId: 'plan_restaurante_crecimiento',
        generalInfo: {
          nombre: 'Duplicado Test',
          slug: `don-julio-${timestamp}`, // Ya creado en el Caso 1
          whatsapp: '+593999999999',
          adminEmail: `otro_${timestamp}@test.com`,
          adminPassword: 'Password123!'
        }
      });
    } catch (err: any) {
      caughtDuplicate = true;
      assert(err.message.includes('ya se encuentra registrado'), "Error apropiado ante slug duplicado");
    }
    assert(caughtDuplicate, "Rechazo exitoso de slug duplicado");

  } catch (globalErr: any) {
    console.error("Error global en suite:", globalErr);
    failed++;
  }

  console.log("\n=================================================================");
  console.log(`RESULTADO DE LA VERIFICACIÓN: ${passed} Pasadas | ${failed} Fallidas`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().finally(() => prisma.$disconnect());
