import { Client } from "ssh2";
import path from "path";
import fs from "fs";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";
const REMOTE_BASE = "/opt/Zenda";

// Carpetas que deben sincronizarse recursivamente (directorios y archivos)
const syncFolderRoots = [
  // Módulo Gimnasio Completo
  "src/modules/gym",
  "src/components/admin/gym",
  "src/app/admin/config",
  "src/app/admin/perfil",
  "src/app/admin/clases",
  "src/app/admin/accesos",
  "src/app/admin/asistencias",
  "src/app/admin/membresias",
  "src/app/admin/socios",
  "src/app/[slug]/mi-gym",
  "src/app/api/admin/gym",
  "src/app/api/[slug]/gym",
  "src/app/api/[slug]/otp",
  "src/app/admin/notificaciones",
  "src/app/api/admin/notificaciones",

  // Módulo Dental Completo
  "src/modules/dental",
  "src/app/admin/pacientes",
  "src/app/admin/historia-clinica",
  "src/app/admin/tratamientos",
  "src/app/admin/documentos",
  "src/app/api/admin/dental",

  // Módulo Productos y Tienda
  "src/app/[slug]/producto",
  "src/app/api/public/[slug]/products"
];

// Archivos individuales adicionales
const manualFiles = [
  "public/logo-citiox.png",
  "src/app/page.tsx",
  "src/app/admin/page.tsx",
  "src/app/[slug]/page.tsx",
  "src/app/[slug]/HomeMembershipPlansClient.tsx",
  "prisma/schema.prisma",
  "src/scripts/seed_plan_families.ts",
  "src/components/admin/AdminSidebar.tsx",
  "src/components/public/PublicMobileNav.tsx",
  "src/core/capabilities/types.ts",
  "src/core/modules/types.ts",
  "src/core/modules/registry.ts",
  "src/core/modules/resolveModuleDependencies.ts",
  "src/core/blueprints/BlueprintManifests.ts",
  "src/core/branch/BranchService.ts",
  "src/core/entitlements/EntitlementsService.ts",
  "src/core/provisioning/ProvisioningEngine.ts",
  "src/core/runtime/LegacyRuntimeAdapter.ts",
  "src/core/subscription/SubscriptionEngine.ts",
  "src/core/templates/templatesRegistry.ts",
  "src/lib/landingContentResolver.ts",
  "src/lib/delegatedAuth.ts",
  "src/lib/growth/eventBus.ts",
  "src/lib/services/addonService.ts",
  "src/lib/services/subscriptionService.ts",
  "src/app/admin/misiones-citiox/page.tsx",
  "src/app/api/admin/misiones-globales/route.ts",
  "src/lib/growth/globalMissionEngine.ts",
  "src/components/superadmin/MisionesUnificadasClient.tsx",
  "src/app/api/public/[slug]/misiones/route.ts",
  "src/app/api/admin/misiones/route.ts",
  "src/app/api/admin/misiones/participants/route.ts",
  "src/app/api/negocio/route.ts",
  "src/app/admin/misiones/page.tsx",
  "src/lib/growth/rewardDispatcher.ts",
  "src/app/api/superadmin/rewards/route.ts",
  "src/app/api/superadmin/rewards/[id]/route.ts",
  "src/scripts/seed_gym_benefits.ts",
  "src/scripts/seed_gym_canonical.ts",
  "src/scripts/seed_gym_examples.ts",
  "src/app/admin/usuarios/nuevo/page.tsx",
  "src/app/admin/staff/page.tsx",
  "src/components/admin/StaffModal.tsx",
  "src/components/public/ProductVariantModal.tsx",
  "src/components/public/PublicProductsBoutiqueSection.tsx",
  "src/modules/store/components/StoreLanding.tsx",
  "src/components/public/UniversalHeroCarousel.tsx",
  "src/app/admin/hero-destacados/page.tsx",
  "src/app/[slug]/promo/[promotionId]/PromoShareClient.tsx",
  "src/components/public/HeroMobileDemoViewer.tsx",
  "src/components/BookingCalendar.tsx",
  "src/app/[slug]/BookingClient.tsx",
  "src/app/[slug]/servicio/[id]/page.tsx",
  "public/citiox-icon.png",
  "public/citiox-logo-horizontal.png",
  "public/citiox-logo-trimmed.png",
  "src/app/login/page.tsx",
  "src/app/register/page.tsx",
  "src/app/olvide-password/page.tsx",
  "src/app/restaurantes/page.tsx",
  "src/app/tiendas/page.tsx",
  "src/app/canchas/page.tsx",
  "src/app/lavanderias/page.tsx",
  "src/app/servicios/page.tsx",
  "src/lib/constants/defaultConfigs.ts",
  "src/components/admin/mobile/MobileBusiness.tsx",
  "src/app/api/config/route.ts",
  "src/app/admin/config/accesos/page.tsx",
  "src/app/admin/config/page.tsx",
  "src/app/admin/promociones/page.tsx",
  "src/components/admin/gym/GymKnowTheGymAdmin.tsx",
  "src/components/admin/gym/GymPromotionForm.tsx",
  "src/app/admin/marketing/conoce-el-gym/page.tsx",
  "src/components/public/PromotionsSection.tsx",
  "src/components/ui/PhoneInput.tsx"
];

function collectAllFilesAndDirs(roots, extraFiles) {
  const allFiles = new Set();
  const allDirs = new Set();

  function scan(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relative = fullPath.replace(/\\/g, '/');
      if (entry.isDirectory()) {
        allDirs.add(relative);
        scan(fullPath);
      } else if (entry.isFile()) {
        allFiles.add(relative);
        allDirs.add(path.dirname(relative).replace(/\\/g, '/'));
      }
    }
  }

  for (const root of roots) {
    allDirs.add(root);
    scan(root);
  }

  for (const file of extraFiles) {
    if (fs.existsSync(file)) {
      allFiles.add(file.replace(/\\/g, '/'));
      allDirs.add(path.dirname(file).replace(/\\/g, '/'));
    }
  }

  return {
    files: Array.from(allFiles),
    dirs: Array.from(allDirs)
  };
}

const { files, dirs: directories } = collectAllFilesAndDirs(syncFolderRoots, manualFiles);

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const localFull = path.resolve(localPath.replace(/\//g, path.sep));
    if (!fs.existsSync(localFull)) {
      console.warn(`  ⚠️ SKIP  ${localPath} (no existe localmente)`);
      return resolve();
    }
    // Borrar archivo remoto previo para evitar residuos si el nuevo archivo es más corto
    sftp.unlink(remotePath, () => {
      sftp.fastPut(localFull, remotePath, (err) => {
        if (err) { 
          console.error(`  ❌ ERROR ${localPath}: ${err.message}`); 
          reject(err); 
        } else { 
          console.log(`  ✅ OK    ${localPath}`); 
          resolve(); 
        }
      });
    });
  });
}

function execCommand(conn, cmd, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n>> 🚀 ${label || cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => { process.stdout.write(d); out += d; });
      stream.stderr.on("data", (d) => { process.stderr.write(d); });
      stream.on("close", (code) => {
        if (code !== 0) reject(new Error(`Comando falló con código ${code}`));
        else resolve(out);
      });
    });
  });
}

const conn = new Client();
conn.on("ready", async () => {
  console.log("\n⚡ Conectado al VPS (157.173.203.174)...");

  // 1. Crear directorios remotos
  console.log(`\n📁 Asegurando ${directories.length} directorios destino en el VPS...`);
  const mkdirCmd = directories.map(d => `mkdir -p "${REMOTE_BASE}/${d}"`).join(" && ");
  await execCommand(conn, mkdirCmd, "Crear carpetas en el VPS");

  // 2. Subir archivos
  console.log(`\n📤 Subiendo ${files.length} archivos al VPS...\n`);
  await new Promise((resolve, reject) => {
    conn.sftp(async (err, sftp) => {
      if (err) return reject(err);
      try {
        for (const file of files) {
          const remotePath = `${REMOTE_BASE}/${file}`;
          await uploadFile(sftp, file, remotePath);
        }
        resolve();
      } catch (uploadErr) {
        reject(uploadErr);
      }
    });
  });

  // 3. Sincronizar Base de Datos con Prisma
  console.log("\n🗄️ Sincronizando esquema de base de datos en VPS (npx prisma db push)...");
  await execCommand(conn, `cd ${REMOTE_BASE} && npx prisma db push --accept-data-loss`, "Prisma DB Push");

  // 3.5. Generar tipos del cliente Prisma
  console.log("\n📦 Generando cliente de Prisma en VPS (npx prisma generate)...");
  await execCommand(conn, `cd ${REMOTE_BASE} && npx prisma generate`, "Prisma Generate");

  // 4. Ejecutar el seed canónico de familias y planes en VPS (opcional/tolerante a fallos)
  console.log("\n🌱 Ejecutando seed canónico de planes...");
  await execCommand(conn, `cd ${REMOTE_BASE} && (npx tsx src/scripts/seed_plan_families.ts || true)`, "Seed Canónico de Planes");
  await execCommand(conn, `cd ${REMOTE_BASE} && (npx tsx src/scripts/seed_gym_benefits.ts || true)`, "Seed Beneficios Gimnasio");
  await execCommand(conn, `cd ${REMOTE_BASE} && (npx tsx src/scripts/seed_gym_canonical.ts || true)`, "Seed Gimnasio Canónico");
  await execCommand(conn, `cd ${REMOTE_BASE} && (npx tsx src/scripts/seed_gym_examples.ts || true)`, "Seed Ejemplos Conoce Gimnasio");

  // 5. Build de producción Next.js
  console.log("\n🏗️ Compilando aplicación Next.js en VPS (npm run build)...");
  await execCommand(conn, `cd ${REMOTE_BASE} && pm2 stop zenda-app || true`, "PM2 Stop");
  await execCommand(conn, `cd ${REMOTE_BASE} && npm run build`, "Next.js Build");

  // 6. Reiniciar PM2
  console.log("\n🔄 Reiniciando proceso PM2 zenda-app...");
  await execCommand(conn, `cd ${REMOTE_BASE} && pm2 start zenda-app || pm2 restart zenda-app`, "PM2 Start");

  console.log("\n🎉 ¡Despliegue y configuración completados con éxito!");
  conn.end();
});

conn.on("error", (err) => {
  console.error("❌ SSH Client Error:", err.message);
});

conn.connect({
  host: VPS,
  port: 22,
  username: USER,
  password: PASS,
  keepaliveInterval: 10000,
  keepaliveCountMax: 3,
  readyTimeout: 30000
});
