import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";
const REMOTE_BASE = "/opt/Zenda";

function execCommand(conn, cmd, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n========================================`);
    console.log(`>> ${label || cmd}`);
    console.log(`========================================`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => { process.stdout.write(d); out += d; });
      stream.stderr.on("data", (d) => { process.stderr.write(d); out += d; });
      stream.on("close", (code) => {
        if (code !== 0) reject(new Error(`Comando falló con código ${code}`));
        else resolve(out);
      });
    });
  });
}

const conn = new Client();
conn.on("ready", async () => {
  console.log("\n🚀 Conectado exitosamente al VPS (157.173.203.174)...");

  try {
    // 0. Corregir DATABASE_URL en .env si es necesario
    await execCommand(conn, `sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:./dev.db"|g' ${REMOTE_BASE}/.env`, "0. Asegurando DATABASE_URL=file:./dev.db en .env del VPS");

    // 1. Git reset y pull
    await execCommand(conn, `cd ${REMOTE_BASE} && git reset --hard HEAD && git clean -fd && git pull origin main`, "1. Sincronizando repositorio con GitHub (git reset & pull)");

    // 2. Prisma DB Push & Generate
    await execCommand(conn, `cd ${REMOTE_BASE} && export DATABASE_URL="file:./dev.db" && npx prisma db push && npx prisma generate`, "2. Actualizando esquema y regenerando cliente Prisma en VPS");

    // 3. Ejecutar semillas oficiales
    await execCommand(conn, `cd ${REMOTE_BASE} && export DATABASE_URL="file:./dev.db" && npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/seed_citiox_studio.ts`, "3. Seeding Citiox Studio Blueprints");
    await execCommand(conn, `cd ${REMOTE_BASE} && export DATABASE_URL="file:./dev.db" && npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' scratch/seed_demo_canchas.ts`, "4. Seeding Demo Canchas");
    await execCommand(conn, `cd ${REMOTE_BASE} && export DATABASE_URL="file:./dev.db" && npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/seed_canchas_page.ts`, "5. Seeding Canchas Reglamento Page");
    await execCommand(conn, `cd ${REMOTE_BASE} && export DATABASE_URL="file:./dev.db" && npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' scratch/seed_shoe_care_full.ts`, "6. Seeding Shoe Care / Lavado");

    // 4. Build de producción
    await execCommand(conn, `cd ${REMOTE_BASE} && rm -rf .next && npm run build`, "7. Compilando aplicación Next.js en producción (npm run build)");

    // 5. Reiniciar PM2
    await execCommand(conn, `pm2 restart zenda-app || pm2 restart all`, "8. Reiniciando servicio PM2");

    console.log("\n✨ ¡DESPLIEGUE EN EL VPS FINALIZADO CON ÉXITO!");
  } catch (e) {
    console.error("\n❌ Error durante despliegue VPS:", e.message);
  } finally {
    conn.end();
  }
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
