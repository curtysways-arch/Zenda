import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Preparando script de FUSIÓN Y RESTAURACIÓN de base de datos...");
  
  const jsCode = `
const { createClient } = require('@libsql/client');

async function run() {
    const srcClient = createClient({ url: 'file:./dev.db.bak' });
    const dstClient = createClient({ url: 'file:./dev.db' });

    console.log("=== INICIANDO FUSIÓN DE DATOS DESDE dev.db.bak A dev.db ===");

    // 1. Restaurar Negocios
    const srcNegocios = await srcClient.execute("SELECT * FROM Negocio");
    for (const row of srcNegocios.rows) {
        const check = await dstClient.execute({
            sql: "SELECT id FROM Negocio WHERE id = ?",
            args: [row.id]
        });
        if (check.rows.length === 0) {
            console.log("Restaurando Negocio:", row.nombre, "(", row.slug, ")");
            const cols = Object.keys(row).filter(k => k !== 'businessTypeId');
            const placeholders = cols.map(() => '?').join(', ');
            const vals = cols.map(c => row[c]);
            
            // Insertar con businessTypeId por defecto si la columna existe en el destino
            await dstClient.execute({
                sql: \`INSERT INTO Negocio (\${cols.join(', ')}, businessTypeId) VALUES (\${placeholders}, 'general-services-id')\`,
                args: vals
            });
        }
    }

    // 2. Restaurar Usuarios
    const srcUsuarios = await srcClient.execute("SELECT * FROM Usuario");
    for (const row of srcUsuarios.rows) {
        const check = await dstClient.execute({
            sql: "SELECT id FROM Usuario WHERE id = ?",
            args: [row.id]
        });
        if (check.rows.length === 0) {
            console.log("Restaurando Usuario:", row.email || row.nombre);
            const cols = Object.keys(row);
            const placeholders = cols.map(() => '?').join(', ');
            const vals = cols.map(c => row[c]);
            await dstClient.execute({
                sql: \`INSERT INTO Usuario (\${cols.join(', ')}) VALUES (\${placeholders})\`,
                args: vals
            });
        }
    }

    // 3. Restaurar Servicios
    try {
        const srcServicios = await srcClient.execute("SELECT * FROM Servicio");
        for (const row of srcServicios.rows) {
            const check = await dstClient.execute({
                sql: "SELECT id FROM Servicio WHERE id = ?",
                args: [row.id]
            });
            if (check.rows.length === 0) {
                console.log("Restaurando Servicio:", row.nombre);
                const cols = Object.keys(row);
                const placeholders = cols.map(() => '?').join(', ');
                const vals = cols.map(c => row[c]);
                await dstClient.execute({
                    sql: \`INSERT INTO Servicio (\${cols.join(', ')}) VALUES (\${placeholders})\`,
                    args: vals
                });
            }
        }
    } catch(e) { console.log("Servicios:", e.message); }

    // 4. Restaurar Citas
    try {
        const srcCitas = await srcClient.execute("SELECT * FROM Cita");
        for (const row of srcCitas.rows) {
            const check = await dstClient.execute({
                sql: "SELECT id FROM Cita WHERE id = ?",
                args: [row.id]
            });
            if (check.rows.length === 0) {
                console.log("Restaurando Cita ID:", row.id);
                const cols = Object.keys(row);
                const placeholders = cols.map(() => '?').join(', ');
                const vals = cols.map(c => row[c]);
                await dstClient.execute({
                    sql: \`INSERT INTO Cita (\${cols.join(', ')}) VALUES (\${placeholders})\`,
                    args: vals
                });
            }
        }
    } catch(e) { console.log("Citas:", e.message); }

    // 5. Restaurar Clientes
    try {
        const srcClientes = await srcClient.execute("SELECT * FROM Cliente");
        for (const row of srcClientes.rows) {
            const check = await dstClient.execute({
                sql: "SELECT id FROM Cliente WHERE id = ?",
                args: [row.id]
            });
            if (check.rows.length === 0) {
                console.log("Restaurando Cliente:", row.nombre);
                const cols = Object.keys(row);
                const placeholders = cols.map(() => '?').join(', ');
                const vals = cols.map(c => row[c]);
                await dstClient.execute({
                    sql: \`INSERT INTO Cliente (\${cols.join(', ')}) VALUES (\${placeholders})\`,
                    args: vals
                });
            }
        }
    } catch(e) { console.log("Clientes:", e.message); }

    console.log("=== FUSIÓN Y RESTAURACIÓN COMPLETADA CON ÉXITO ===");
}
run().catch(console.error);
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/merge_db.js\n${jsCode}\nEOF\ncd /opt/Zenda && node merge_db.js`, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let out = "";
    stream.on("data", (data) => { out += data; });
    stream.stderr.on("data", (data) => { out += data; });
    stream.on("close", () => {
      console.log("=== RESULTADOS FUSIÓN ===");
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
