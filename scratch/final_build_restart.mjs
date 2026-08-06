import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado. Ejecutando build y restart final...");
  
  const cmd = `
    cd /opt/Zenda
    
    echo "=== VERIFICAR ESTADO .next ==="
    ls .next/ 2>/dev/null | head -5 || echo ".next no existe o está vacío"
    
    echo ""
    echo "=== EJECUTAR npm run build ==="
    npm run build 2>&1
    
    echo ""
    echo "=== RESTART PM2 ==="
    pm2 restart zenda-app --update-env
    sleep 12

    echo ""
    echo "=== PRUEBA ENDPOINTS ==="
    curl -s -o /dev/null -w "symechas: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/symechas-peluquera
    curl -s -o /dev/null -w "pinchos: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/pinchos
    curl -s -o /dev/null -w "barber-men: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/barber-men
    curl -s -o /dev/null -w "aura-spa: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/demo-spa
    
    echo ""
    echo "=== ÚLTIMOS ERRORES (10 líneas) ==="
    tail -n 10 /root/.pm2/logs/zenda-app-error.log
    
    echo ""
    echo "=== PM2 FINAL ==="
    pm2 list
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on("data", (d) => process.stdout.write(d));
    stream.stderr.on("data", (d) => process.stderr.write(d));
    stream.on("close", () => { console.log("\nFIN."); conn.end(); });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
