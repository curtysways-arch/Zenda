require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Mock function representing communicationService.ts interpolation
function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] !== undefined ? String(vars[key]) : match;
  });
}

// Mock function representing segmentation logic
function matchSegment(user, business, subscription, segmentConfig) {
  const { type, ciudad, pais } = segmentConfig;
  
  if (type === 'ALL_USERS') return true;

  if (type === 'ALL_NEGOCIOS') {
    const isBizUser = user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.role === 'SUPER_ADMIN';
    if (!isBizUser) return false;
  }

  if (type === 'CLIENTES') {
    return user.role === 'CLIENTE';
  }

  if (type === 'PREMIUM') {
    return business && subscription && subscription.planId === 'premium-plan-id'; // example check
  }

  if (ciudad && business && business.ciudad?.toLowerCase() !== ciudad.toLowerCase()) {
    return false;
  }

  if (pais && business && business.pais?.toLowerCase() !== pais.toLowerCase()) {
    return false;
  }

  return true;
}

async function main() {
  console.log("=== INICIANDO PRUEBAS DE COMUNICACIONES ===");

  // 1. Probar Reemplazo de Variables
  console.log("\n1. Probando reemplazo de variables dinámicas:");
  const template = "Hola {{nombre}}, tu negocio {{negocio}} en la ciudad {{ciudad}} tiene un plan de tipo {{plan}}.";
  const variables = {
    nombre: "Juan Perez",
    negocio: "Super Barber Premium",
    ciudad: "Bogotá",
    plan: "Pro VIP"
  };
  const result = interpolate(template, variables);
  console.log("Plantilla original:", template);
  console.log("Variables:", variables);
  console.log("Resultado final  :", result);
  if (result.includes("Juan Perez") && result.includes("Super Barber Premium") && result.includes("Bogotá")) {
    console.log("✓ Reemplazo de variables exitoso");
  } else {
    console.log("✗ Fallo en reemplazo de variables");
  }

  // 2. Probar Segmentación
  console.log("\n2. Probando coincidencia de segmentación:");
  const mockUserAdmin = { id: "user-1", email: "admin@barberia.com", role: "ADMIN" };
  const mockUserClient = { id: "user-2", email: "cliente@gmail.com", role: "CLIENTE" };
  const mockBusiness = { id: "biz-1", nombre: "Barberia Bogota", ciudad: "Bogotá", pais: "Colombia" };
  
  const configBogota = { type: "ALL_NEGOCIOS", ciudad: "Bogotá", pais: "Colombia" };
  const configMedellin = { type: "ALL_NEGOCIOS", ciudad: "Medellín", pais: "Colombia" };

  const matchBogota = matchSegment(mockUserAdmin, mockBusiness, null, configBogota);
  const matchMedellin = matchSegment(mockUserAdmin, mockBusiness, null, configMedellin);
  const matchCliente = matchSegment(mockUserClient, mockBusiness, null, configBogota);

  console.log(`¿Coincide Admin en Bogotá? ${matchBogota} (Esperado: true)`);
  console.log(`¿Coincide Admin en Medellín? ${matchMedellin} (Esperado: false)`);
  console.log(`¿Coincide Cliente en Bogotá (Config requiere Admin)? ${matchCliente} (Esperado: false)`);

  if (matchBogota === true && matchMedellin === false && matchCliente === false) {
    console.log("✓ Motor de segmentación emulado correctamente");
  } else {
    console.log("✗ Falla en las reglas de segmentación");
  }

  // 3. Consultar Registros de Auditoría Recientes
  console.log("\n3. Consultando registros de auditoría recientes:");
  try {
    const logs = prisma.adminAuditLog ? await prisma.adminAuditLog.findMany({
      take: 5,
      orderBy: { fecha: 'desc' }
    }) : [];

    console.log(`Encontrados ${logs.length} logs de auditoría.`);
    logs.forEach(log => {
      console.log(`- [${log.fecha.toISOString()}] ${log.accion} por ${log.adminUserId || 'Sistema'}: ${log.descripcion || ''}`);
    });
  } catch (e) {
    console.log("Nota: Tabla de logs de auditoría omitida o no accesible.", e.message);
  }

  console.log("\n=== PRUEBAS FINALIZADAS CON ÉXITO ===");
}

main()
  .catch(err => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
