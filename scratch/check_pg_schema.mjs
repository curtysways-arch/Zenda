import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    echo "=== COLUMNAS DE LA TABLA Negocio EN POSTGRES ==="
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c "\\d \\"Negocio\\"" 2>&1 | head -60
    
    echo ""
    echo "=== TABLAS EXISTENTES EN POSTGRES ==="
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c "\\dt" 2>&1 | head -60

    echo ""
    echo "=== VERSIÓN DE MIGRACIONES APLICADAS ==="
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c 'SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 10;' 2>&1

    echo ""
    echo "=== PROBAR QUERY SIMPLE A NEGOCIO ==="
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c 'SELECT id, nombre, slug FROM "Negocio" LIMIT 3;' 2>&1

    echo ""
    echo "=== API DIRECT RESPONSE ==="
    curl -s "http://127.0.0.1:3000/api/public/negocio/symechas-peluquera" 2>&1 | head -50
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (d) => { out += d; process.stdout.write(d); });
    stream.stderr.on("data", (d) => { out += d; });
    stream.on("close", () => conn.end());
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
