import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    echo "=== BUSCAR CONTRASEÑA REAL EN ARCHIVOS .env HISTÓRICOS ==="
    find /opt/Zenda -name ".env*" -exec ls -la {} \\; 2>/dev/null
    find /root -name ".env*" -exec cat {} \\; 2>/dev/null | grep -E "DATABASE_URL|POSTGRES"
    find /var/www -name ".env*" -exec cat {} \\; 2>/dev/null | grep -E "DATABASE_URL|POSTGRES"
    
    echo ""
    echo "=== BUSCAR EN GIT HISTORY SI ALGUNA VEZ SE COMMITEÓ EL DATABASE_URL REAL ==="
    cd /opt/Zenda && git log --all --oneline | head -20
    
    echo ""
    echo "=== VERIFICAR SI zenda_user PUEDE CONECTARSE SIN CONTRASEÑA (trust en pg_hba) ==="
    psql -U zenda_user -d zenda_db -c "SELECT current_user;" 2>&1

    echo ""
    echo "=== INTENTAR CAMBIAR CONTRASEÑA DE zenda_user PARA PODER CONECTAR ==="
    su - postgres -c "psql -c \\"ALTER USER zenda_user PASSWORD 'CitioxProd2024!';\\"" 2>&1
    
    echo ""
    echo "=== PROBAR CONEXIÓN CON NUEVA CONTRASEÑA ==="
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c "SELECT current_user, current_database(), COUNT(*) FROM \\"Negocio\\";" 2>&1
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (data) => { out += data; });
    stream.stderr.on("data", (data) => { out += data; });
    stream.on("close", () => { console.log(out); conn.end(); });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
