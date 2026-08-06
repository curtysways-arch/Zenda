import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Consultando todos los detalles de Negocios en dev.db...");
  
  const jsCode = `
const { createClient } = require('@libsql/client');

async function run() {
    const dstClient = createClient({ url: 'file:./dev.db' });
    const negocios = await dstClient.execute("SELECT * FROM Negocio");
    console.log("=== TODOS LOS NEGOCIOS DETALLADOS ===");
    console.table(negocios.rows.map(r => ({ id: r.id, nombre: r.nombre, slug: r.slug, businessTypeId: r.businessTypeId })));
}
run();
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/check_negocios_details.js\n${jsCode}\nEOF\ncd /opt/Zenda && node check_negocios_details.js`, (err, stream) => {
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
