import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    echo "=== CONTEOS PG zenda_db ==="
    su - postgres -c "psql -d zenda_db -c 'SELECT COUNT(*) as total_negocios FROM \\"Negocio\\";'"
    su - postgres -c "psql -d zenda_db -c 'SELECT COUNT(*) as total_usuarios FROM \\"Usuario\\";'"
    su - postgres -c "psql -d zenda_db -c 'SELECT COUNT(*) as total_clientes FROM \\"Cliente\\";'"
    su - postgres -c "psql -d zenda_db -c 'SELECT COUNT(*) as total_reservas FROM \\"Reserva\\";'"
    su - postgres -c "psql -d zenda_db -c 'SELECT COUNT(*) as total_servicios FROM \\"Servicio\\";'"
    su - postgres -c "psql -d zenda_db -c 'SELECT COUNT(*) as total_pedidos FROM \\"Pedido\\";'"
    su - postgres -c "psql -d zenda_db -c 'SELECT COUNT(*) as total_productos FROM \\"Producto\\";'"
    
    echo ""
    echo "=== USUARIOS EN PG (col correcta: role) ==="
    su - postgres -c "psql -d zenda_db -c 'SELECT id, nombre, email, role, \\"negocioId\\" FROM \\"Usuario\\" ORDER BY email;'"

    echo ""
    echo "=== SERVICIOS EN PG ==="
    su - postgres -c "psql -d zenda_db -c 'SELECT id, nombre, precio, \\"negocioId\\" FROM \\"Servicio\\" ORDER BY \\"negocioId\\";'"

    echo ""
    echo "=== RESERVAS/CITAS EN PG ==="
    su - postgres -c "psql -d zenda_db -c 'SELECT id, fecha, \\"clienteNombre\\", status, \\"negocioId\\" FROM \\"Reserva\\" ORDER BY fecha DESC LIMIT 20;'"

    echo ""
    echo "=== TAMAÑO ACTUAL dev.db vs dev.db.bak ==="
    du -h /opt/Zenda/dev.db /opt/Zenda/dev.db.bak
    
    echo ""
    echo "=== FECHA MODIFICACION ARCHIVOS ==="
    stat /opt/Zenda/dev.db | grep Modify
    stat /opt/Zenda/dev.db.bak | grep Modify
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (data) => { out += data; });
    stream.stderr.on("data", (data) => { out += data; });
    stream.on("close", () => { console.log(out); conn.end(); });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
