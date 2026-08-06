import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";
const PG = `PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db`;
const DB_URL = `postgresql://zenda_user:CitioxProd2024!@127.0.0.1:5432/zenda_db?schema=public`;

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado. Ejecutando prisma db push + validación completa...\n");

  const cmd = `
    cd /opt/Zenda

    # ============================================================
    # PASO 1: Ejecutar prisma db push
    # ============================================================
    echo "============================================"
    echo "EJECUTANDO: prisma db push"
    echo "============================================"
    DATABASE_URL="${DB_URL}" npx prisma db push --accept-data-loss 2>&1
    PUSH_EXIT=$?
    echo ""
    echo "Código de salida: $PUSH_EXIT"
    if [ $PUSH_EXIT -eq 0 ]; then
      echo "✅ prisma db push completado exitosamente"
    else
      echo "❌ ERROR en prisma db push"
      exit 1
    fi

    # ============================================================
    # PASO 2: Verificar tablas ahora en PostgreSQL
    # ============================================================
    echo ""
    echo "============================================"
    echo "PASO 2: Tablas en zenda_db ahora"
    echo "============================================"
    ${PG} -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" 2>&1 | tail -n +3 | head -n -2 | wc -l
    echo "tablas totales en zenda_db después del push"

    # ============================================================
    # PASO 3: Verificar integridad de datos de negocios reales
    # ============================================================
    echo ""
    echo "============================================"
    echo "PASO 3: Verificar datos de negocios reales"
    echo "============================================"
    
    echo "--- NEGOCIOS ---"
    ${PG} -c 'SELECT nombre, slug, estado, "billingStatus" FROM "Negocio" ORDER BY nombre;' 2>&1

    echo ""
    echo "--- USUARIOS REALES ---"
    ${PG} -c 'SELECT nombre, email, role FROM "Usuario" ORDER BY email;' 2>&1

    echo ""
    echo "--- CLIENTES DE SYMECHAS PELUQUERÍA ---"
    ${PG} -c '
      SELECT c.nombre, c.telefono
      FROM "Cliente" c
      JOIN "Negocio" n ON n.id = c."negocioId"
      WHERE n.slug = '"'"'symechas-peluquera'"'"'
      ORDER BY c.nombre;
    ' 2>&1

    echo ""
    echo "--- CLIENTES DE PINCHOLISTO ---"
    ${PG} -c '
      SELECT c.nombre, c.telefono
      FROM "Cliente" c
      JOIN "Negocio" n ON n.id = c."negocioId"
      WHERE n.slug = '"'"'pinchos'"'"'
      ORDER BY c.nombre;
    ' 2>&1

    echo ""
    echo "--- CLIENTES DE BARBER MEN ---"
    ${PG} -c '
      SELECT c.nombre, c.telefono
      FROM "Cliente" c
      JOIN "Negocio" n ON n.id = c."negocioId"
      WHERE n.slug = '"'"'barber-men'"'"'
      ORDER BY c.nombre;
    ' 2>&1

    echo ""
    echo "--- RESERVAS POR NEGOCIO ---"
    ${PG} -c '
      SELECT n.nombre, COUNT(a.id) as reservas
      FROM "Appointment" a
      JOIN "Negocio" n ON n.id = a."negocioId"
      GROUP BY n.nombre
      ORDER BY reservas DESC;
    ' 2>&1 || ${PG} -c '
      SELECT n.nombre, COUNT(a.id) as reservas
      FROM "Cita" a
      JOIN "Negocio" n ON n.id = a."negocioId"
      GROUP BY n.nombre
      ORDER BY reservas DESC;
    ' 2>&1 || echo "Tabla de citas/reservas verificar nombre..."

    echo ""
    echo "--- PEDIDOS POR NEGOCIO ---"
    ${PG} -c '
      SELECT n.nombre, COUNT(p.id) as pedidos
      FROM "Pedido" p
      JOIN "Negocio" n ON n.id = p."negocioId"
      GROUP BY n.nombre
      ORDER BY pedidos DESC;
    ' 2>&1

    echo ""
    echo "--- CONTEOS GENERALES ---"
    ${PG} -c '
      SELECT
        (SELECT COUNT(*) FROM "Negocio") AS negocios,
        (SELECT COUNT(*) FROM "Usuario") AS usuarios,
        (SELECT COUNT(*) FROM "Cliente") AS clientes,
        (SELECT COUNT(*) FROM "Pedido") AS pedidos;
    ' 2>&1

    # ============================================================
    # PASO 4: Reiniciar app y verificar endpoints
    # ============================================================
    echo ""
    echo "============================================"
    echo "PASO 4: Reiniciar PM2 y verificar endpoints"
    echo "============================================"
    pm2 restart zenda-app --update-env
    sleep 12

    echo ""
    echo "--- Prueba de endpoints ---"
    curl -s -o /dev/null -w "symechas-peluquera: %{http_code}\\n" http://127.0.0.1:3000/symechas-peluquera
    curl -s -o /dev/null -w "pinchos: %{http_code}\\n" http://127.0.0.1:3000/pinchos
    curl -s -o /dev/null -w "barber-men: %{http_code}\\n" http://127.0.0.1:3000/barber-men
    curl -s -o /dev/null -w "demo-spa: %{http_code}\\n" http://127.0.0.1:3000/demo-spa
    curl -s -o /dev/null -w "login: %{http_code}\\n" http://127.0.0.1:3000/login

    echo ""
    echo "--- API pública de symechas ---"
    curl -s "http://127.0.0.1:3000/api/public/negocio/symechas-peluquera" | python3 -m json.tool 2>/dev/null || curl -s "http://127.0.0.1:3000/api/public/negocio/symechas-peluquera"

    echo ""
    echo "--- Últimos errores PM2 (10 líneas) ---"
    tail -n 10 /root/.pm2/logs/zenda-app-error.log

    echo ""
    echo "--- PM2 status final ---"
    pm2 list
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (d) => { out += d; process.stdout.write(d); });
    stream.stderr.on("data", (d) => { process.stderr.write(d); });
    stream.on("close", () => {
      console.log("\n=== FIN PROCESO COMPLETO ===");
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
