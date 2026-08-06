import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    echo "=== REINICIANDO PM2 con --update-env ==="
    cd /opt/Zenda && pm2 restart zenda-app --update-env

    sleep 10

    echo ""
    echo "=== STATUS PM2 ==="
    pm2 list

    echo ""
    echo "=== PRUEBA DE ENDPOINTS ==="
    curl -s -o /dev/null -w "symechas: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/symechas-peluquera
    curl -s -o /dev/null -w "pinchos: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/pinchos
    curl -s -o /dev/null -w "barber-men: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/barber-men
    curl -s -o /dev/null -w "aura-spa: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/demo-spa

    echo ""
    echo "=== ÚLTIMOS ERRORES PM2 (últimas 10 líneas) ==="
    tail -n 20 /root/.pm2/logs/zenda-app-error.log

    echo ""
    echo "=== DATABASE_URL ACTIVA ==="
    grep "DATABASE_URL" /opt/Zenda/.env
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (d) => { out += d; process.stdout.write(d); });
    stream.stderr.on("data", (d) => { out += d; });
    stream.on("close", () => { conn.end(); });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
