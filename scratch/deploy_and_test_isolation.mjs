import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";
const DB_URL = "postgresql://zenda_user:CitioxProd2024!@127.0.0.1:5432/zenda_db?schema=public";

const conn = new Client();
conn.on("ready", async () => {
  console.log("Conectado al VPS. Ejecutando deploy y pruebas de aislamiento...\n");

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
    await exec(`cd /opt/Zenda && git pull origin main 2>&1`, "PASO 1: Pull del código");
    await exec(`cd /opt/Zenda && DATABASE_URL="${DB_URL}" npm run build 2>&1`, "PASO 2: Build Next.js");
    await exec(`cd /opt/Zenda && pm2 restart zenda-app --update-env && sleep 8`, "PASO 3: Reiniciar PM2");

    console.log("\n============================================");
    console.log("PRUEBAS DE AISLAMIENTO MULTI-NEGOCIO");
    console.log("============================================");

    await exec(`
      echo "--- 1. SYMECHAS PELUQUERÍA (/symechas-peluquera/pedidos) ---"
      echo "Respuesta al intentar acceder a /pedidos:"
      curl -s -i "http://127.0.0.1:3000/symechas-peluquera/pedidos" | head -n 12

      echo ""
      echo "--- 2. SYMECHAS API ORDERS (/api/public/symechas-peluquera/orders) ---"
      echo "Respuesta al consultar la API de pedidos con teléfono del usuario de PinchoListo:"
      curl -s "http://127.0.0.1:3000/api/public/symechas-peluquera/orders?phone=0959997521"

      echo ""
      echo ""
      echo "--- 3. PINCHOLISTO (/pinchos/pedidos) ---"
      echo "Respuesta al intentar acceder a /pedidos:"
      curl -s -o /dev/null -w "HTTP Status: %{http_code}\\n" "http://127.0.0.1:3000/pinchos/pedidos"

      echo ""
      echo "--- 4. PINCHOLISTO API ORDERS (/api/public/pinchos/orders) ---"
      echo "Respuesta al consultar pedidos en PinchoListo:"
      curl -s "http://127.0.0.1:3000/api/public/pinchos/orders?phone=0959997521" | head -c 300
      echo ""
    `, "PASO 4: Pruebas de verificación de aislamiento");

  } catch(e) {
    console.error("ERROR:", e.message);
  } finally {
    conn.end();
  }
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
