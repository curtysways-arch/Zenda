import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";
const PG_URL = "postgresql://zenda_user:CitioxProd2024!@127.0.0.1:5432/zenda_db?schema=public";

const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    echo "=== RESPONSE DETALLADA de symechas-peluquera ==="
    curl -s "http://127.0.0.1:3000/api/public/negocio/symechas-peluquera" | head -100

    echo ""
    echo "=== RESPONSE DETALLADA de API diag slug ==="
    curl -s "http://127.0.0.1:3000/api/diag/slug?slug=symechas-peluquera" 2>/dev/null | head -50

    echo ""
    echo "=== LOG DE PM2 output (últimas 30 líneas) ==="
    tail -n 30 /root/.pm2/logs/zenda-app-out.log

    echo ""
    echo "=== LOG DE PM2 error (últimas 30 líneas) ==="
    tail -n 30 /root/.pm2/logs/zenda-app-error.log

    echo ""
    echo "=== VERIFICAR SLUGS EN POSTGRES ==="
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c 'SELECT slug FROM "Negocio" ORDER BY slug;'

    echo ""
    echo "=== VERIFICAR QUE DATABASE_URL ESTÁ EN EL PROCESO PM2 ==="
    cat /proc/\$(pm2 pid zenda-app)/environ 2>/dev/null | tr '\\0' '\\n' | grep DATABASE_URL || echo "No se pudo leer environ del proceso"
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (d) => { out += d; process.stdout.write(d); });
    stream.stderr.on("data", (d) => { out += d; });
    stream.on("close", () => conn.end());
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
