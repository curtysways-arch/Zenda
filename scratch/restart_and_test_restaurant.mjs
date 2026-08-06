// Restart PM2 and seed restaurant demo
import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", async () => {
  console.log("Conectado al VPS...\n");

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
    // Step 1: PM2 restart
    const r1 = await exec(`cd /opt/Zenda && pm2 restart zenda-app --update-env 2>&1 && echo "PM2_OK" && sleep 5`, "PASO 3: Reiniciar PM2");
    console.log(`\nPM2 exit code: ${r1.code}`);

    // Step 2: Wait and test health
    await new Promise(r => setTimeout(r, 3000));
    
    // Step 3: Test seed endpoint
    const r2 = await exec(`curl -s -o /tmp/seed_result.json -w "\\nHTTP_STATUS:%{http_code}" "http://127.0.0.1:3000/api/demo/seed-restaurant" 2>&1 && cat /tmp/seed_result.json | head -c 300`, "PASO 4: Ejecutar Seeder Restaurante");
    console.log(`\nSeed exit code: ${r2.code}`);

    // Step 4: Test routes
    const r3 = await exec(`
      echo "=== TEST RUTAS RESTAURANTE ==="
      echo ""
      echo "1. Landing /parrilla-citiox-demo:"
      curl -s -o /dev/null -w "HTTP %{http_code} en %{time_total}s\\n" "http://127.0.0.1:3000/parrilla-citiox-demo"
      
      echo ""
      echo "2. KDS /parrilla-citiox-demo/cocina:"
      curl -s -o /dev/null -w "HTTP %{http_code} en %{time_total}s\\n" "http://127.0.0.1:3000/parrilla-citiox-demo/cocina"
      
      echo ""
      echo "3. Admin /parrilla-citiox-demo/admin:"
      curl -s -o /dev/null -w "HTTP %{http_code} en %{time_total}s\\n" "http://127.0.0.1:3000/parrilla-citiox-demo/admin"
      
      echo ""
      echo "4. Mesa QR /parrilla-citiox-demo/mesa/03:"
      curl -s -o /dev/null -w "HTTP %{http_code} en %{time_total}s\\n" "http://127.0.0.1:3000/parrilla-citiox-demo/mesa/03"
      
      echo ""
      echo "5. API Tables /api/parrilla-citiox-demo/tables:"
      curl -s "http://127.0.0.1:3000/api/parrilla-citiox-demo/tables" | head -c 200
      
      echo ""
      echo ""
      echo "6. API Kitchen /api/parrilla-citiox-demo/kitchen:"
      curl -s "http://127.0.0.1:3000/api/parrilla-citiox-demo/kitchen" | head -c 200
      
      echo ""
      echo ""
      echo "7. API Channels /api/parrilla-citiox-demo/channels:"
      curl -s "http://127.0.0.1:3000/api/parrilla-citiox-demo/channels"
      
      echo ""
      echo "=== AISLAMIENTO: /symechas-peluquera/tables ==="
      curl -s "http://127.0.0.1:3000/api/symechas-peluquera/tables" | head -c 150
    `, "PASO 5: Test endpoints y aislamiento multi-negocio");

    console.log(`\nTests exit code: ${r3.code}`);
    console.log("\n=== DEPLOY Y TESTS COMPLETADOS ===");

  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    conn.end();
    process.exit(0);
  }
});

conn.on("error", (err) => { console.error("SSH Error:", err.message); process.exit(1); });
conn.connect({ host: VPS, port: 22, username: USER, password: PASS });
