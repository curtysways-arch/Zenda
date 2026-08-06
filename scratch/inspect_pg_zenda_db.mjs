import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Inspeccionando base de datos PostgreSQL zenda_db...");
  
  const cmd = `
    echo "=== 1. TABLAS EN POSTGRESQL zenda_db ==="
    su - postgres -c "psql -d zenda_db -c '\\dt'" 2>&1

    echo "=== 2. NEGOCIOS EN POSTGRESQL zenda_db ==="
    su - postgres -c "psql -d zenda_db -c 'SELECT id, nombre, slug FROM \"Negocio\";'" 2>&1

    echo "=== 3. USUARIOS EN POSTGRESQL zenda_db ==="
    su - postgres -c "psql -d zenda_db -c 'SELECT id, nombre, email, rol, \"negocioId\" FROM \"Usuario\";'" 2>&1

    echo "=== 4. CONTEO DE REGISTROS EN POSTGRESQL zenda_db ==="
    su - postgres -c "psql -d zenda_db -c 'SELECT COUNT(*) FROM \"Cita\"; SELECT COUNT(*) FROM \"Cliente\"; SELECT COUNT(*) FROM \"Servicio\";'" 2>&1
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let out = "";
    stream.on("data", (data) => { out += data; });
    stream.stderr.on("data", (data) => { out += data; });
    stream.on("close", () => {
      console.log("=== RESULTADOS POSTGRESQL zenda_db ===");
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
