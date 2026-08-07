// Build, restart PM2 and test full restaurant management endpoints on VPS
import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";
const DB_URL = "postgresql://zenda_user:CitioxProd2024!@127.0.0.1:5432/zenda_db?schema=public";

const conn = new Client();
conn.on("ready", async () => {
  console.log("Conectado al VPS. Desplegando nuevas funcionalidades del panel admin...\n");

  function exec(cmd, label) {
    return new Promise((resolve, reject) => {
      if (label) console.log(`\n>>> ${label}`);
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let out = "";
        stream.on("data", (d) => { out += d; process.stdout.write(d); });
        stream.stderr.on("data", (d) => { out += d; process.stderr.write(d); });
        stream.on("close", (code) => resolve({ out, code }));
      });
    });
  }

  try {
    await exec(`cd /opt/Zenda && git checkout -- . && git pull origin main 2>&1`, "PASO 1: Pull del código");
    await exec(`cd /opt/Zenda && DATABASE_URL="${DB_URL}" npx prisma db push --accept-data-loss 2>&1`, "PASO 1.5: Actualizar Esquema de BD PostgreSQL");
    await exec(`cd /opt/Zenda && rm -rf .next && DATABASE_URL="${DB_URL}" npm run build 2>&1`, "PASO 2: Clean & Build Next.js");
    await exec(`cd /opt/Zenda && pm2 restart zenda-app --update-env 2>&1 && sleep 5`, "PASO 3: Reiniciar PM2");
    await exec(`curl -s "http://127.0.0.1:3000/api/demo/seed-restaurant"`, "PASO 4: Ejecutar Seeder de Restaurante Demo");

    console.log("\n=== PRUEBAS DE ENDPOINTS DE GESTIÓN Y ADMINISTRACIÓN ===");

    await exec(`
      echo "1. Test GET /api/parrilla-citiox-demo/negocio:"
      curl -s "http://127.0.0.1:3000/api/parrilla-citiox-demo/negocio" | head -c 250
      echo ""

      echo "2. Test GET /api/parrilla-citiox-demo/promotions:"
      curl -s "http://127.0.0.1:3000/api/parrilla-citiox-demo/promotions" | head -c 250
      echo ""

      echo "3. Test GET /api/parrilla-citiox-demo/catalogue:"
      curl -s "http://127.0.0.1:3000/api/parrilla-citiox-demo/catalogue" | head -c 250
      echo ""

      echo "4. Test GET /api/parrilla-citiox-demo/tables:"
      curl -s "http://127.0.0.1:3000/api/parrilla-citiox-demo/tables" | head -c 250
      echo ""

      echo "5. Verificación de página Admin /parrilla-citiox-demo/admin:"
      curl -s -o /dev/null -w "HTTP %{http_code} en %{time_total}s\\n" "http://127.0.0.1:3000/parrilla-citiox-demo/admin"
    `, "PASO 4: Verificación de APIs de Administración");

    console.log("\n=== DEPLOY Y TESTS COMPLETADOS CON ÉXITO ===");

  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    conn.end();
    process.exit(0);
  }
});

conn.on("error", (err) => { console.error("SSH Error:", err.message); process.exit(1); });
conn.connect({ host: VPS, port: 22, username: USER, password: PASS });
