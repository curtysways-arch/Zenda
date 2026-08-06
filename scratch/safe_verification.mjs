import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";
const PG_CONN = "PGPASSWORD=\"CitioxProd2024!\" psql -U zenda_user -h 127.0.0.1 -d zenda_db";
const BACKUP_DIR = "/opt/backups/zenda_db";
const TS = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const BACKUP_FILE = `${BACKUP_DIR}/zenda_db_backup_${TS}.sql`;

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Iniciando verificación segura...\n");

  const cmd = `
    # ================================================================
    # PASO 1: Confirmar que la app usa PostgreSQL (no SQLite)
    # ================================================================
    echo "============================================"
    echo "PASO 1: Verificar DATABASE_URL activa"
    echo "============================================"
    echo "--- .env en producción ---"
    grep "DATABASE_URL" /opt/Zenda/.env

    echo ""
    echo "--- Verificar que la app puede conectar a zenda_db ---"
    ${PG_CONN} -c "SELECT 'Conexión OK - PostgreSQL activo' AS status, current_database() AS base, version() AS version LIMIT 1;" 2>&1

    echo ""
    echo "--- Confirmar negocios reales en zenda_db ---"
    ${PG_CONN} -c 'SELECT nombre, slug FROM "Negocio" ORDER BY nombre;' 2>&1

    # ================================================================
    # PASO 2: Backup completo de PostgreSQL
    # ================================================================
    echo ""
    echo "============================================"
    echo "PASO 2: Backup completo de zenda_db"
    echo "============================================"
    mkdir -p ${BACKUP_DIR}
    echo "Creando backup en: ${BACKUP_FILE}"
    PGPASSWORD="CitioxProd2024!" pg_dump -U zenda_user -h 127.0.0.1 -d zenda_db -F c -f "${BACKUP_FILE}.dump" 2>&1
    # También en formato SQL legible
    PGPASSWORD="CitioxProd2024!" pg_dump -U zenda_user -h 127.0.0.1 -d zenda_db --no-owner --no-acl -f "${BACKUP_FILE}" 2>&1
    echo "Verificando tamaño del backup..."
    ls -lh ${BACKUP_DIR}/ 2>&1
    echo "Backup completado."

    # ================================================================
    # PASO 3: Comparar schema de Prisma vs DB real
    # ================================================================
    echo ""
    echo "============================================"
    echo "PASO 3: Comparar schema Prisma vs DB real"
    echo "============================================"
    echo "--- Tablas en la DB de PostgreSQL ---"
    ${PG_CONN} -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" 2>&1 | tail -n +3 | head -n -2 | tr -s ' ' | sed 's/^ //' > /tmp/pg_tables.txt
    cat /tmp/pg_tables.txt | wc -l
    echo "tablas en PostgreSQL"

    echo ""
    echo "--- Modelos en schema.prisma ---"
    grep "^model " /opt/Zenda/prisma/schema.prisma | awk '{print $2}' | sort > /tmp/prisma_models.txt
    cat /tmp/prisma_models.txt | wc -l
    echo "modelos en schema.prisma"

    echo ""
    echo "--- TABLAS EN PRISMA PERO FALTANTES EN PG ---"
    comm -23 <(sort /tmp/prisma_models.txt) <(sort /tmp/pg_tables.txt)
    echo "(vacío = todas las tablas existen en PG)"

    echo ""
    echo "--- TABLAS EN PG PERO NO EN PRISMA (obsoletas) ---"
    comm -13 <(sort /tmp/prisma_models.txt) <(sort /tmp/pg_tables.txt)
    echo "(vacío = PG no tiene tablas extra)"

    # ================================================================
    # PASO 3b: Detectar columnas faltantes usando prisma migrate diff
    # ================================================================
    echo ""
    echo "============================================"
    echo "PASO 3b: prisma migrate diff (schema vs DB)"
    echo "============================================"
    cd /opt/Zenda && DATABASE_URL="postgresql://zenda_user:CitioxProd2024!@127.0.0.1:5432/zenda_db?schema=public" npx prisma migrate diff \
      --from-schema-datasource prisma/schema.prisma \
      --to-migrations prisma/migrations \
      --script 2>&1 | head -80 || echo "migrate diff no disponible, continuando..."

    echo ""
    echo "--- Alternativa: detectar columnas faltantes manualmente ---"
    DATABASE_URL="postgresql://zenda_user:CitioxProd2024!@127.0.0.1:5432/zenda_db?schema=public" cd /opt/Zenda && npx prisma migrate diff \
      --from-migrations prisma/migrations \
      --to-schema-datamodel prisma/schema.prisma \
      --script 2>&1 | head -100 || echo "No disponible"

    # ================================================================
    # PASO 4: Verificar migraciones pendientes
    # ================================================================
    echo ""
    echo "============================================"
    echo "PASO 4: Estado de migraciones"
    echo "============================================"
    echo "--- Migraciones en prisma/migrations (todas) ---"
    ls /opt/Zenda/prisma/migrations/ | sort 2>&1

    echo ""
    echo "--- Migraciones APLICADAS en zenda_db ---"
    ${PG_CONN} -c 'SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at DESC LIMIT 20;' 2>&1

    echo ""
    echo "--- MIGRACIONES PENDIENTES (en carpeta pero no en DB) ---"
    ls /opt/Zenda/prisma/migrations/ | sort > /tmp/all_migrations.txt
    ${PG_CONN} -t -c 'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;' 2>/dev/null | tr -s ' ' | sed 's/^ //' | sort > /tmp/applied_migrations.txt
    echo "Carpetas de migración existentes:"
    cat /tmp/all_migrations.txt
    echo ""
    echo "Migraciones aplicadas en DB:"
    cat /tmp/applied_migrations.txt
    echo ""
    echo "PENDIENTES:"
    comm -23 /tmp/all_migrations.txt /tmp/applied_migrations.txt || echo "(sin pendientes detectados)"
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (d) => { out += d; process.stdout.write(d); });
    stream.stderr.on("data", (d) => { process.stderr.write(d); });
    stream.on("close", () => {
      console.log("\n=== FIN DE VERIFICACIÓN SEGURA ===");
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
