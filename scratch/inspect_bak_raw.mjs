import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Leyendo tablas en dev.db.bak...");
  
  const jsCode = `
const { createClient } = require('@libsql/client');

async function run() {
    const client = createClient({ url: 'file:./dev.db.bak' });
    try {
        const resNeg = await client.execute("SELECT id, nombre, slug, email, telefono FROM Negocio");
        console.log("=== NEGOCIOS EN dev.db.bak ===");
        console.table(resNeg.rows);

        const resUser = await client.execute("SELECT id, nombre, email, rol, negocioId FROM Usuario");
        console.log("=== USUARIOS EN dev.db.bak ===");
        console.table(resUser.rows);

        const resServ = await client.execute("SELECT id, nombre, precio, negocioId FROM Servicio");
        console.log("=== SERVICIOS EN dev.db.bak ===");
        console.table(resServ.rows);

        const resCitas = await client.execute("SELECT id, fecha, estado, clienteNombre, negocioId FROM Cita");
        console.log("=== CITAS EN dev.db.bak ===");
        console.table(resCitas.rows);
    } catch(e) {
        console.error("Error:", e);
    }
}
run();
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/inspect_bak_raw.js\n${jsCode}\nEOF\ncd /opt/Zenda && node inspect_bak_raw.js`, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let out = "";
    stream.on("data", (data) => { out += data; });
    stream.stderr.on("data", (data) => { out += data; });
    stream.on("close", () => {
      console.log("=== RESULTADOS RAW DEV.DB.BAK ===");
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
