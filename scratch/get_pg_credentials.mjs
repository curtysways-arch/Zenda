import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    echo "=== CREDENCIALES POSTGRESQL en .env ==="
    grep -E "DATABASE_URL|POSTGRES|PG_" /opt/Zenda/.env 2>/dev/null

    echo ""
    echo "=== .env COMPLETO (actual) ==="
    cat /opt/Zenda/.env 2>/dev/null

    echo ""
    echo "=== CREDENCIALES POSTGRESQL en archivos del proyecto ==="
    grep -rE "zenda_user|zenda_db|postgres" /opt/Zenda/.env /opt/Zenda/.env.local /opt/Zenda/.env.production 2>/dev/null

    echo ""
    echo "=== BUSCAR CONTRASEÑA DE zenda_user EN CONFIGURACIONES ==="
    find /opt/Zenda -name ".env*" -exec cat {} \\; 2>/dev/null | grep -E "DATABASE_URL|POSTGRES|PG_"

    echo ""
    echo "=== VERIFICAR CONTRASEÑA DESDE pg_hba.conf ==="
    cat /etc/postgresql/*/main/pg_hba.conf 2>/dev/null | tail -20
    
    echo ""
    echo "=== VERIFICAR USUARIO zenda_user EXISTE EN POSTGRES ==="
    su - postgres -c "psql -c '\\\\du'" 2>&1

    echo ""
    echo "=== VERIFICAR CONEXIÓN CON CREDENCIALES VACÍAS ==="
    su - postgres -c "psql -d zenda_db -c 'SELECT current_user, current_database();'" 2>&1

    echo ""
    echo "=== SCHEMA PRISMA ACTUAL EN VPS ==="
    cat /opt/Zenda/prisma/schema.prisma | head -30

    echo ""
    echo "=== PROVIDER PRISMA ACTUAL ==="
    grep -A5 'datasource db' /opt/Zenda/prisma/schema.prisma
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (data) => { out += data; });
    stream.stderr.on("data", (data) => { out += data; });
    stream.on("close", () => { console.log(out); conn.end(); });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
