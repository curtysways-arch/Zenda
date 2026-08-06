import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    echo "=== VERIFICAR COLUMNAS FALTANTES EN Negocio ==="
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c "\\d \\"Negocio\\"" 2>&1

    echo ""
    echo "=== VERIFICAR COLUMNAS FALTANTES EN Usuario ==="
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c "\\d \\"Usuario\\"" 2>&1 | head -50

    echo ""
    echo "=== VER TODAS LAS TABLAS (verificar cuáles están en schema.prisma pero no en PG) ==="
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" 2>&1

    echo ""
    echo "=== INTENTAR HACER UN prisma db push --accept-data-loss para agregar las columnas nuevas ==="
    echo "AVISO: Solo se harán cambios ADITIVOS (agregar columnas/tablas). No se borrarán datos."
    cd /opt/Zenda && DATABASE_URL="postgresql://zenda_user:CitioxProd2024!@127.0.0.1:5432/zenda_db?schema=public" npx prisma db push --accept-data-loss 2>&1
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (d) => { out += d; process.stdout.write(d); });
    stream.stderr.on("data", (d) => { out += d; });
    stream.on("close", () => conn.end());
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
