import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Inspeccionando /root/dev.db...");
  
  const jsCode = `
const { createClient } = require('@libsql/client');

async function run() {
    const client = createClient({ url: 'file:/root/dev.db' });
    try {
        const negocios = await client.execute("SELECT * FROM Negocio");
        console.log("=== NEGOCIOS EN /root/dev.db ===");
        console.table(negocios.rows.map(r => ({ id: r.id, nombre: r.nombre, slug: r.slug, email: r.email, telefono: r.telefono })));

        const usuarios = await client.execute("SELECT * FROM Usuario");
        console.log("=== USUARIOS EN /root/dev.db ===");
        console.table(usuarios.rows.map(r => ({ id: r.id, nombre: r.nombre, email: r.email, rol: r.rol, negocioId: r.negocioId })));
    } catch(e) {
        console.error("Error:", e.message);
    }
}
run();
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/inspect_root_db.js\n${jsCode}\nEOF\ncd /opt/Zenda && node inspect_root_db.js`, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let out = "";
    stream.on("data", (data) => { out += data; });
    stream.stderr.on("data", (data) => { out += data; });
    stream.on("close", () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
