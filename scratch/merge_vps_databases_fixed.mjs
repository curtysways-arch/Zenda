import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Completando la restauración total...");
  
  const jsCode = `
const { createClient } = require('@libsql/client');

async function run() {
    const srcClient = createClient({ url: 'file:./dev.db.bak' });
    const dstClient = createClient({ url: 'file:./dev.db' });

    console.log("=== INICIANDO FUSION COMPLETA DESDE dev.db.bak A dev.db ===");

    await dstClient.execute("PRAGMA foreign_keys = OFF;");

    // 1. Restaurar Negocios
    const srcNegocios = await srcClient.execute("SELECT * FROM Negocio");
    for (const row of srcNegocios.rows) {
        try {
            const check = await dstClient.execute({
                sql: "SELECT id FROM Negocio WHERE id = ?",
                args: [row.id]
            });
            if (check.rows.length === 0) {
                console.log("RESTAURANDO NEGOCIO:", row.nombre, "(", row.slug, ")");
                const cols = Object.keys(row).filter(k => k !== 'businessTypeId');
                const placeholders = cols.map(() => '?').join(', ');
                const vals = cols.map(c => row[c]);
                vals.push('salon-spa-id');
                
                await dstClient.execute({
                    sql: 'INSERT INTO Negocio (' + cols.join(', ') + ', businessTypeId) VALUES (' + placeholders + ', ?)',
                    args: vals
                });
            }
        } catch(e) {
            console.log("Negocio ya existia o skipeado:", row.nombre, e.message);
        }
    }

    // 2. Restaurar Usuarios
    const srcUsuarios = await srcClient.execute("SELECT * FROM Usuario");
    for (const row of srcUsuarios.rows) {
        try {
            const check = await dstClient.execute({
                sql: "SELECT id FROM Usuario WHERE id = ?",
                args: [row.id]
            });
            if (check.rows.length === 0) {
                console.log("RESTAURANDO USUARIO:", row.email || row.nombre);
                const cols = Object.keys(row);
                const placeholders = cols.map(() => '?').join(', ');
                const vals = cols.map(c => row[c]);
                await dstClient.execute({
                    sql: 'INSERT INTO Usuario (' + cols.join(', ') + ') VALUES (' + placeholders + ')',
                    args: vals
                });
            }
        } catch(e) {
            console.log("Usuario skipeado por duplicado:", row.email || row.nombre);
        }
    }

    // 3. Restaurar Servicios
    try {
        const srcServicios = await srcClient.execute("SELECT * FROM Servicio");
        for (const row of srcServicios.rows) {
            try {
                const check = await dstClient.execute({
                    sql: "SELECT id FROM Servicio WHERE id = ?",
                    args: [row.id]
                });
                if (check.rows.length === 0) {
                    console.log("RESTAURANDO SERVICIO:", row.nombre);
                    const cols = Object.keys(row);
                    const placeholders = cols.map(() => '?').join(', ');
                    const vals = cols.map(c => row[c]);
                    await dstClient.execute({
                        sql: 'INSERT INTO Servicio (' + cols.join(', ') + ') VALUES (' + placeholders + ')',
                        args: vals
                    });
                }
            } catch(e) { /* ignore */ }
        }
    } catch(e) { console.log("Servicios:", e.message); }

    // 4. Restaurar Citas
    try {
        const srcCitas = await srcClient.execute("SELECT * FROM Cita");
        for (const row of srcCitas.rows) {
            try {
                const check = await dstClient.execute({
                    sql: "SELECT id FROM Cita WHERE id = ?",
                    args: [row.id]
                });
                if (check.rows.length === 0) {
                    console.log("RESTAURANDO CITA:", row.id);
                    const cols = Object.keys(row);
                    const placeholders = cols.map(() => '?').join(', ');
                    const vals = cols.map(c => row[c]);
                    await dstClient.execute({
                        sql: 'INSERT INTO Cita (' + cols.join(', ') + ') VALUES (' + placeholders + ')',
                        args: vals
                    });
                }
            } catch(e) { /* ignore */ }
        }
    } catch(e) { console.log("Citas:", e.message); }

    // 5. Restaurar Clientes
    try {
        const srcClientes = await srcClient.execute("SELECT * FROM Cliente");
        for (const row of srcClientes.rows) {
            try {
                const check = await dstClient.execute({
                    sql: "SELECT id FROM Cliente WHERE id = ?",
                    args: [row.id]
                });
                if (check.rows.length === 0) {
                    console.log("RESTAURANDO CLIENTE:", row.nombre);
                    const cols = Object.keys(row);
                    const placeholders = cols.map(() => '?').join(', ');
                    const vals = cols.map(c => row[c]);
                    await dstClient.execute({
                        sql: 'INSERT INTO Cliente (' + cols.join(', ') + ') VALUES (' + placeholders + ')',
                        args: vals
                    });
                }
            } catch(e) { /* ignore */ }
        }
    } catch(e) { console.log("Clientes:", e.message); }

    await dstClient.execute("PRAGMA foreign_keys = ON;");

    const resFinal = await dstClient.execute("SELECT id, nombre, slug, email FROM Negocio");
    console.log("=== NEGOCIOS TOTALES EN BASE DE DATOS RESTAURADA ===");
    console.table(resFinal.rows);
}
run().catch(console.error);
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/merge_db_full.js\n${jsCode}\nEOF\ncd /opt/Zenda && node merge_db_full.js`, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let out = "";
    stream.on("data", (data) => { out += data; });
    stream.stderr.on("data", (data) => { out += data; });
    stream.on("close", () => {
      console.log("=== RESULTADOS RESTAURACIÓN TOTAL ===");
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
