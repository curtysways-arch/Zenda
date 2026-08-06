import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Verificando todos los Negocios y Usuarios restaurados...");
  
  const jsCode = `
const { createClient } = require('@libsql/client');

async function run() {
    const dstClient = createClient({ url: 'file:./dev.db' });
    const negocios = await dstClient.execute("SELECT id, nombre, slug FROM Negocio");
    console.log("=== NEGOCIOS EN dev.db (ACTUAL Y RESTAURADO) ===");
    console.table(negocios.rows);

    const usuarios = await dstClient.execute("SELECT id, nombre, email, rol, negocioId FROM Usuario");
    console.log("=== USUARIOS EN dev.db (ACTUAL Y RESTAURADO) ===");
    console.table(usuarios.rows);
}
run();
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/check_restored.js\n${jsCode}\nEOF\ncd /opt/Zenda && node check_restored.js`, (err, stream) => {
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
