import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";
const PG = `PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db`;
const DB_URL = `postgresql://zenda_user:CitioxProd2024!@127.0.0.1:5432/zenda_db?schema=public`;

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Iniciando proceso controlado de prisma db push...\n");

  const cmd = `
    cd /opt/Zenda

    # ============================================================
    # PRE-CHECK: Confirmar backup existe
    # ============================================================
    echo "============================================"
    echo "PRE-CHECK: Backup de recuperación"
    echo "============================================"
    ls -lh /opt/backups/zenda_db/ 2>&1
    echo ""

    # ============================================================
    # PASO 1: Inspección previa (dry-run / preview)
    # Prisma 7 usa --accept-data-loss para mostrar qué hará
    # Usamos migrate diff para ver el SQL que se ejecutaría
    # ============================================================
    echo "============================================"
    echo "PASO 1: INSPECCIÓN PREVIA (SQL que se ejecutará)"
    echo "============================================"
    DATABASE_URL="${DB_URL}" npx prisma migrate diff \
      --from-config-datasource \
      --to-schema prisma/schema.prisma \
      --script 2>&1 | head -200

    echo ""
    echo "--- FIN INSPECCIÓN PREVIA ---"
    echo ""

    # ============================================================
    # PASO 2: Verificar que NO hay DROP en el SQL previo
    # ============================================================
    echo "============================================"
    echo "PASO 2: Verificar ausencia de comandos destructivos"
    echo "============================================"
    DIFF_OUTPUT=$(DATABASE_URL="${DB_URL}" npx prisma migrate diff \
      --from-config-datasource \
      --to-schema prisma/schema.prisma \
      --script 2>&1)

    echo "Buscando DROP TABLE..."
    echo "$DIFF_OUTPUT" | grep -i "DROP TABLE" || echo "✅ Sin DROP TABLE"

    echo "Buscando DROP COLUMN..."
    echo "$DIFF_OUTPUT" | grep -i "DROP COLUMN" || echo "✅ Sin DROP COLUMN"

    echo "Buscando ALTER COLUMN destructivo..."
    echo "$DIFF_OUTPUT" | grep -i "ALTER COLUMN" | grep -iv "ADD COLUMN" || echo "✅ Sin ALTER destructivo"

    echo "Buscando TRUNCATE..."
    echo "$DIFF_OUTPUT" | grep -i "TRUNCATE" || echo "✅ Sin TRUNCATE"

    echo "Solo CREATE TABLE y ADD COLUMN en el diff:"
    echo "$DIFF_OUTPUT" | grep -i "CREATE TABLE\\|ADD COLUMN\\|CREATE UNIQUE\\|CREATE INDEX" | wc -l
    echo "líneas de cambios aditivos detectados"

    echo ""
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on("data", (d) => process.stdout.write(d));
    stream.stderr.on("data", (d) => process.stderr.write(d));
    stream.on("close", () => {
      console.log("\n=== FIN INSPECCIÓN PREVIA ===\n");
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
