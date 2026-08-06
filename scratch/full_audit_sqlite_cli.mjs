import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  // Usar sqlite3 CLI directamente para evitar dependencias de node
  const cmd = `
    echo "=== ESTADO ARCHIVOS SQLITE ==="
    ls -la /opt/Zenda/dev.db /opt/Zenda/dev.db.bak /opt/Zenda/prisma/dev.db 2>/dev/null

    echo ""
    echo "=== NEGOCIOS en dev.db (ACTUAL) ==="
    sqlite3 /opt/Zenda/dev.db "SELECT id, nombre, slug FROM Negocio ORDER BY nombre;" 2>&1

    echo ""
    echo "=== USUARIOS en dev.db (ACTUAL) ==="
    sqlite3 /opt/Zenda/dev.db "SELECT id, nombre, email, negocioId FROM Usuario ORDER BY email;" 2>&1

    echo ""
    echo "=== CONTEO CLIENTES/RESERVAS/SERVICIOS en dev.db (ACTUAL) ==="
    sqlite3 /opt/Zenda/dev.db "SELECT 'Clientes:', COUNT(*) FROM Cliente;" 2>&1
    sqlite3 /opt/Zenda/dev.db "SELECT 'Reservas:', COUNT(*) FROM Reserva;" 2>&1
    sqlite3 /opt/Zenda/dev.db "SELECT 'Servicios:', COUNT(*) FROM Servicio;" 2>&1
    sqlite3 /opt/Zenda/dev.db "SELECT 'Pedidos:', COUNT(*) FROM Pedido;" 2>&1

    echo ""
    echo "=== NEGOCIOS en dev.db.bak (BACKUP Jul 21) ==="
    sqlite3 /opt/Zenda/dev.db.bak "SELECT id, nombre, slug FROM Negocio ORDER BY nombre;" 2>&1

    echo ""
    echo "=== USUARIOS en dev.db.bak (BACKUP Jul 21) ==="
    sqlite3 /opt/Zenda/dev.db.bak "SELECT id, nombre, email, negocioId FROM Usuario ORDER BY email;" 2>&1

    echo ""
    echo "=== CONTEO CLIENTES/RESERVAS/SERVICIOS en dev.db.bak (BACKUP Jul 21) ==="
    sqlite3 /opt/Zenda/dev.db.bak "SELECT 'Clientes:', COUNT(*) FROM Cliente;" 2>&1
    sqlite3 /opt/Zenda/dev.db.bak "SELECT 'Reservas:', COUNT(*) FROM Reserva;" 2>&1
    sqlite3 /opt/Zenda/dev.db.bak "SELECT 'Servicios:', COUNT(*) FROM Servicio;" 2>&1
    sqlite3 /opt/Zenda/dev.db.bak "SELECT 'Pedidos:', COUNT(*) FROM Pedido;" 2>&1

    echo ""
    echo "=== CLIENTES en dev.db.bak ==="
    sqlite3 /opt/Zenda/dev.db.bak "SELECT id, nombre, telefono, negocioId FROM Cliente;" 2>&1

    echo ""
    echo "=== SERVICIOS en dev.db.bak ==="
    sqlite3 /opt/Zenda/dev.db.bak "SELECT id, nombre, precio, negocioId FROM Servicio;" 2>&1

    echo ""
    echo "=== HISTORIAL GIT ÚLTIMOS DESPLIEGUES ==="
    cd /opt/Zenda && git log --oneline -20 2>&1

    echo ""
    echo "=== HISTORIAL COMANDOS SHELL DEL ROOT (ultimos 100) ==="
    cat /root/.bash_history 2>/dev/null | tail -100

    echo ""
    echo "=== VERIFICAR SI EXISTE dev.db.bak2 o BACKUPS ADICIONALES ==="
    find / -name "*.db" -o -name "*.db.bak" -o -name "*.sqlite" 2>/dev/null | grep -v proc | grep -v sys
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
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
