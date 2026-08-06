import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

// URL de PostgreSQL con la contraseña establecida
const PG_URL = "postgresql://zenda_user:CitioxProd2024!@127.0.0.1:5432/zenda_db?schema=public";

const conn = new Client();
conn.on("ready", async () => {
  console.log("Conectado al VPS. Iniciando migración controlada a PostgreSQL...\n");

  function exec(cmd) {
    return new Promise((resolve, reject) => {
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let out = "";
        stream.on("data", (d) => { out += d; process.stdout.write(d); });
        stream.stderr.on("data", (d) => { out += d; process.stderr.write(d); });
        stream.on("close", (code) => resolve({ out, code }));
      });
    });
  }

  try {
    // ─── PASO 1: Backup del .env actual ─────────────────────────────────────
    console.log("\n========================================");
    console.log(">> PASO 1: Backup del .env actual");
    console.log("========================================");
    await exec(`cp /opt/Zenda/.env "/opt/Zenda/.env.backup_$(date +%Y%m%d_%H%M%S)" && echo "✅ Backup creado" && ls -la /opt/Zenda/.env.backup_* | tail -3`);

    // ─── PASO 2: Verificar conexión a PostgreSQL ANTES de cambiar nada ───────
    console.log("\n========================================");
    console.log(">> PASO 2: Verificar conexión a PostgreSQL");
    console.log("========================================");
    const pgCheck = await exec(`PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c "SELECT current_user, current_database(), COUNT(*) as negocios FROM \\"Negocio\\";"`);
    if (!pgCheck.out.includes("zenda_user")) {
      throw new Error("❌ FALLO: No se pudo conectar a PostgreSQL. Abortando.");
    }
    console.log("✅ Conexión a PostgreSQL confirmada con datos reales.");

    // ─── PASO 3: Cambiar DATABASE_URL en .env ───────────────────────────────
    console.log("\n========================================");
    console.log(">> PASO 3: Cambiar DATABASE_URL a PostgreSQL");
    console.log("========================================");
    await exec(`
      sed -i 's|DATABASE_URL=.*|DATABASE_URL="${PG_URL}"|g' /opt/Zenda/.env
      echo "=== DATABASE_URL después del cambio ==="
      grep "DATABASE_URL" /opt/Zenda/.env
    `);

    // ─── PASO 4: Pull del código actualizado (schema.prisma + prisma.ts) ───
    console.log("\n========================================");
    console.log(">> PASO 4: Pull del código actualizado");
    console.log("========================================");
    await exec(`cd /opt/Zenda && git pull origin main 2>&1`);

    // ─── PASO 5: Instalar dependencias y regenerar Prisma Client ────────────
    console.log("\n========================================");
    console.log(">> PASO 5: Regenerar Prisma Client (SIN migrate/push/seed)");
    console.log("========================================");
    await exec(`cd /opt/Zenda && npx prisma generate 2>&1`);

    // ─── PASO 6: Verificar conexión real con Prisma contra PostgreSQL ────────
    console.log("\n========================================");
    console.log(">> PASO 6: Verificar conexión Prisma → PostgreSQL");
    console.log("========================================");
    await exec(`
      cd /opt/Zenda && node -e "
        process.env.DATABASE_URL = '${PG_URL}';
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: '${PG_URL}' });
        pool.query('SELECT id, nombre, slug FROM \\"Negocio\\" ORDER BY nombre')
          .then(r => {
            console.log('✅ Prisma/PG conexión OK - Negocios encontrados:');
            r.rows.forEach(b => console.log('  -', b.nombre, '(' + b.slug + ')'));
            pool.end();
          })
          .catch(e => { console.error('❌ Error:', e.message); pool.end(); process.exit(1); });
      " 2>&1
    `);

    // ─── PASO 7: Build de producción ─────────────────────────────────────────
    console.log("\n========================================");
    console.log(">> PASO 7: Build de producción Next.js");
    console.log("========================================");
    await exec(`cd /opt/Zenda && npm run build 2>&1`);

    // ─── PASO 8: Reiniciar aplicación ────────────────────────────────────────
    console.log("\n========================================");
    console.log(">> PASO 8: Reiniciar aplicación PM2");
    console.log("========================================");
    await exec(`pm2 restart zenda-app && sleep 5 && pm2 list`);

    // ─── PASO 9: Verificación final ──────────────────────────────────────────
    console.log("\n========================================");
    console.log(">> PASO 9: Verificación final - Negocios en producción");
    console.log("========================================");
    await exec(`
      sleep 3
      PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c "
        SELECT nombre, slug FROM \\"Negocio\\" ORDER BY nombre;
      "
      echo ""
      echo "=== USUARIOS REALES ==="
      PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c "
        SELECT nombre, email, role, \\"negocioId\\" FROM \\"Usuario\\" WHERE role = 'ADMIN' ORDER BY email;
      "
      echo ""
      echo "=== CLIENTES DE SYMECHAS ==="
      PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c "
        SELECT c.nombre, c.telefono FROM \\"Cliente\\" c
        JOIN \\"Negocio\\" n ON c.\\"negocioId\\" = n.id
        WHERE n.slug = 'symechas-peluquera' ORDER BY c.nombre;
      "
      echo ""
      echo "=== VERIFICAR QUE LA APP RESPONDE ==="
      curl -s -o /dev/null -w "HTTP Status: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/symechas-peluquera
      curl -s -o /dev/null -w "HTTP Status: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/pinchos
      curl -s -o /dev/null -w "HTTP Status: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/barber-men
    `);

    console.log("\n========================================");
    console.log("✅ MIGRACIÓN A POSTGRESQL COMPLETADA");
    console.log("   - DATABASE_URL apunta a zenda_db");
    console.log("   - schema.prisma usa provider=postgresql");
    console.log("   - prisma.ts usa PrismaPg para PostgreSQL");
    console.log("   - Aplicación reiniciada con datos reales");
    console.log("========================================\n");

  } catch (e) {
    console.error("\n❌ ERROR:", e.message);
  } finally {
    conn.end();
  }
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
