import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Ejecutando auditoría LECTURA EXCLUSIVA...");
  
  const cmd = `
    echo "=== 1. VERIFICACIÓN POSTGRESQL EN EL SERVIDOR ==="
    systemctl status postgresql 2>&1 | head -n 10
    su - postgres -c "psql -l" 2>&1 || psql -U postgres -l 2>&1 || echo "PostgreSQL no disponible directamente por psql"

    echo "=== 2. ARCHIVO .ENV DE LA APLICACIÓN ==="
    cat /opt/Zenda/.env 2>&1 | grep -E "DATABASE_URL|NODE_ENV"

    echo "=== 3. ARCHIVOS DE BASE DE DATOS Y BACKUPS EN EL SERVIDOR ==="
    ls -la /opt/Zenda/*.db* /opt/Zenda/prisma/*.db* /root/*.db* /var/www/*.db* 2>/dev/null

    echo "=== 4. INFORMACIÓN DE TABLAS EN dev.db ==="
    node -e "
      const { createClient } = require('@libsql/client');
      async function run() {
        const client = createClient({ url: 'file:/opt/Zenda/dev.db' });
        const negs = await client.execute('SELECT id, nombre, slug, businessTypeId FROM Negocio');
        console.log('Negocios en dev.db actual:');
        console.table(negs.rows);
        const users = await client.execute('SELECT id, nombre, email, negocioId FROM Usuario');
        console.log('Usuarios en dev.db actual:');
        console.table(users.rows);
      }
      run().catch(e => console.error(e.message));
    "

    echo "=== 5. INFORMACIÓN DE TABLAS EN dev.db.bak ==="
    node -e "
      const { createClient } = require('@libsql/client');
      async function run() {
        const client = createClient({ url: 'file:/opt/Zenda/dev.db.bak' });
        const negs = await client.execute('SELECT * FROM Negocio');
        console.log('Negocios en dev.db.bak:');
        console.table(negs.rows.map(r => ({ id: r.id, nombre: r.nombre, slug: r.slug })));
        const users = await client.execute('SELECT * FROM Usuario');
        console.log('Usuarios en dev.db.bak:');
        console.table(users.rows.map(r => ({ id: r.id, nombre: r.nombre, email: r.email, negocioId: r.negocioId })));
        const servs = await client.execute('SELECT count(*) as count FROM Servicio').catch(() => ({ rows: [] }));
        console.log('Servicios en dev.db.bak:', servs.rows);
        const citas = await client.execute('SELECT count(*) as count FROM Reserva').catch(() => ({ rows: [] }));
        console.log('Reservas en dev.db.bak:', citas.rows);
        const clientes = await client.execute('SELECT count(*) as count FROM Cliente').catch(() => ({ rows: [] }));
        console.log('Clientes en dev.db.bak:', clientes.rows);
      }
      run().catch(e => console.error(e.message));
    "
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
      console.log("=== INFORME COMPLETO AUDITORÍA LECTURA VPS ===");
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
