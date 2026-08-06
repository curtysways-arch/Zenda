import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Inspeccionando de forma profunda todos los negocios en dev.db.bak...");
  
  const jsCode = `
const { createClient } = require('@libsql/client');

async function run() {
    const srcClient = createClient({ url: 'file:./dev.db.bak' });

    console.log("=== TODOS LOS NEGOCIOS EN dev.db.bak ===");
    const negs = await srcClient.execute("SELECT * FROM Negocio");
    console.table(negs.rows.map(r => ({ id: r.id, nombre: r.nombre, slug: r.slug })));

    console.log("=== TODAS LAS PAGINAS EN dev.db.bak ===");
    try {
        const pages = await srcClient.execute("SELECT id, negocioId, slug, titulo FROM Page");
        console.table(pages.rows);
    } catch(e) { console.log("Page err:", e.message); }

    console.log("=== TODOS LOS SERVICIOS EN dev.db.bak ===");
    try {
        const servs = await srcClient.execute("SELECT id, negocioId, nombre, precio FROM Servicio");
        console.table(servs.rows);
    } catch(e) { console.log("Servicio err:", e.message); }

    console.log("=== TODOS LOS CLIENTES EN dev.db.bak ===");
    try {
        const clientes = await srcClient.execute("SELECT id, negocioId, nombre, telefono FROM Cliente");
        console.table(clientes.rows);
    } catch(e) { console.log("Cliente err:", e.message); }

    console.log("=== TODAS LAS RESERVAS / CITAS EN dev.db.bak ===");
    try {
        const reservas = await srcClient.execute("SELECT id, negocioId, clienteNombre, estado FROM Reserva");
        console.table(reservas.rows);
    } catch(e) { console.log("Reserva err:", e.message); }
}
run();
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/deep_inspect.js\n${jsCode}\nEOF\ncd /opt/Zenda && node deep_inspect.js`, (err, stream) => {
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
