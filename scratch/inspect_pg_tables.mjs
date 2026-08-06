import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Consultando tablas en PostgreSQL zenda_db con comillas escapadas...");
  
  const cmd = `
    echo "=== NEGOCIOS EN PG zenda_db ==="
    su - postgres -c "psql -d zenda_db -c \\"SELECT id, nombre, slug FROM \\\\\\\"Negocio\\\\\\\";\\"" 2>&1

    echo "=== USUARIOS EN PG zenda_db ==="
    su - postgres -c "psql -d zenda_db -c \\"SELECT id, nombre, email, rol, \\\\\\\"negocioId\\\\\\\" FROM \\\\\\\"Usuario\\\\\\\";\\"" 2>&1

    echo "=== CLIENTES EN PG zenda_db ==="
    su - postgres -c "psql -d zenda_db -c \\"SELECT id, nombre, telefono, \\\\\\\"negocioId\\\\\\\" FROM \\\\\\\"Cliente\\\\\\\";\\"" 2>&1

    echo "=== PRODUCTOS EN PG zenda_db ==="
    su - postgres -c "psql -d zenda_db -c \\"SELECT id, nombre, precio, \\\\\\\"negocioId\\\\\\\" FROM \\\\\\\"Producto\\\\\\\";\\"" 2>&1

    echo "=== PEDIDOS EN PG zenda_db ==="
    su - postgres -c "psql -d zenda_db -c \\"SELECT id, clienteNombre, total, status FROM \\\\\\\"Pedido\\\\\\\";\\"" 2>&1
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
      console.log("=== RESULTADOS DATOS POSTGRESQL zenda_db ===");
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
