import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";
const PG_URL = "postgresql://zenda_user:CitioxProd2024!@127.0.0.1:5432/zenda_db?schema=public";

const conn = new Client();
conn.on("ready", async () => {
  console.log("Conectado. Ejecutando deploy completo con PG...\n");

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
    await exec(`cd /opt/Zenda && git pull origin main 2>&1`, "PASO 1: Pull código");
    
    // Verificar schema.prisma 
    await exec(`grep -A4 'datasource db' /opt/Zenda/prisma/schema.prisma`, "VERIFICAR schema.prisma");

    // Limpiar COMPLETAMENTE @prisma/client y .prisma para regenerar desde cero
    await exec(`
      cd /opt/Zenda
      rm -rf node_modules/@prisma/client node_modules/.prisma
      echo "Cache de Prisma limpiado"
    `, "PASO 2: Limpiar cache Prisma");

    // Reinstalar solo @prisma/client (para que npm recree el binario)
    await exec(`
      cd /opt/Zenda
      npm install @prisma/client 2>&1 | tail -5
    `, "PASO 3: Reinstalar @prisma/client");

    // Regenerar con la URL de PostgreSQL correcta
    await exec(`
      cd /opt/Zenda
      DATABASE_URL="${PG_URL}" npx prisma generate 2>&1
    `, "PASO 4: Regenerar Prisma Client (PostgreSQL)");

    // Verificar que se generó correctamente
    await exec(`
      cd /opt/Zenda
      ls node_modules/.prisma/client/ 2>/dev/null | head -5
      echo "Provider en schema generado:"
      grep provider node_modules/.prisma/client/schema.prisma 2>/dev/null || echo "No encontrado en schema.prisma"
    `, "PASO 5: Verificar cliente generado");

    // Eliminar el build anterior para forzar rebuild limpio
    await exec(`
      cd /opt/Zenda
      rm -rf .next
      echo ".next eliminado para rebuild limpio"
    `, "PASO 6: Limpiar build anterior");

    // Build con la URL de PG correcta
    await exec(`
      cd /opt/Zenda
      DATABASE_URL="${PG_URL}" npm run build 2>&1
    `, "PASO 7: Build completo Next.js");

    // Reiniciar con env actualizado
    await exec(`
      cd /opt/Zenda
      pm2 restart zenda-app --update-env
      sleep 8
      pm2 list
    `, "PASO 8: Reiniciar PM2");

    // Verificar endpoints
    await exec(`
      sleep 3
      echo "=== PRUEBA DE ENDPOINTS ==="
      curl -s -o /dev/null -w "symechas HTTP: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/symechas-peluquera
      curl -s -o /dev/null -w "pinchos HTTP: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/pinchos  
      curl -s -o /dev/null -w "barber-men HTTP: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/barber-men
      curl -s -o /dev/null -w "aura-spa HTTP: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/demo-spa
      
      echo ""
      echo "=== ÚLTIMOS ERRORES PM2 ==="
      tail -n 15 /root/.pm2/logs/zenda-app-error.log
    `, "PASO 9: Verificación final");

  } catch(e) {
    console.error("ERROR:", e.message);
  } finally {
    conn.end();
  }
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
