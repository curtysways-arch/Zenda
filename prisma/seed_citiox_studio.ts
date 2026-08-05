// prisma/seed_citiox_studio.ts
import prisma from '../src/lib/prisma';

async function main() {
  console.log('🌱 Iniciando Seeding para Citiox Studio & Runtime Platform...');

  // 1. Catálogos globales de Módulos
  const modules = [
    { code: 'BOOKING', name: 'Gestión de Reservas y Citas', icon: 'Calendar' },
    { code: 'SERVICE', name: 'Gestión de Órdenes de Servicio', icon: 'Wrench' },
    { code: 'ORDERS', name: 'Gestión de Pedidos y Ventas', icon: 'ShoppingBag' },
    { code: 'DELIVERY', name: 'Logística de Entregas y Cobertura', icon: 'Truck' },
    { code: 'INVENTORY', name: 'Control de Inventarios y Productos', icon: 'Package' },
    { code: 'ACADEMY', name: 'Cursos y Capacitación', icon: 'BookOpen' },
    { code: 'MEMBERSHIPS', name: 'Membresías y Suscripciones', icon: 'Award' },
    { code: 'GIFTCARDS', name: 'Tarjetas de Regalo', icon: 'Gift' }
  ];

  for (const m of modules) {
    await prisma.businessModuleCatalog.upsert({
      where: { code: m.code },
      update: { name: m.name, icon: m.icon },
      create: { code: m.code, name: m.name, icon: m.icon }
    });
  }

  // 2. AI Skills
  const aiSkills = [
    { code: 'AUTO_REMINDER', name: 'Recordatorio WhatsApp', category: 'AUTORESPONDER' },
    { code: 'RECOMMENDATION', name: 'Recomendación Inteligente de Productos', category: 'RECOMMENDATION' },
    { code: 'DEMAND_FORECAST', name: 'Predicción de Horarios de Mayor Demanda', category: 'FORECAST' }
  ];

  for (const s of aiSkills) {
    await prisma.businessAiSkill.upsert({
      where: { code: s.code },
      update: { name: s.name, category: s.category },
      create: { code: s.code, name: s.name, category: s.category }
    });
  }

  // 3. Global Experience Profiles
  const expProfiles = [
    { code: 'MINIMAL_EXPERIENCE', name: 'Experiencia Minimalista', landingPackId: 'DefaultLanding', adminPackId: 'AdminSidebarLayout' },
    { code: 'LUXURY_EXPERIENCE', name: 'Experiencia Luxury Purple', landingPackId: 'ShoeCareLanding', adminPackId: 'AdminSidebarLayout' },
    { code: 'SPORTS_EXPERIENCE', name: 'Experiencia Sports Club', landingPackId: 'CanchaPublicLanding', adminPackId: 'AdminSidebarLayout' }
  ];

  for (const ep of expProfiles) {
    await prisma.experienceProfile.upsert({
      where: { code: ep.code },
      update: { name: ep.name, landingPackId: ep.landingPackId, adminPackId: ep.adminPackId },
      create: { code: ep.code, name: ep.name, landingPackId: ep.landingPackId, adminPackId: ep.adminPackId }
    });
  }

  console.log('✅ Seeding de Citiox Studio completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
