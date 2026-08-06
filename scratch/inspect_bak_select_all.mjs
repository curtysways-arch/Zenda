import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Leyendo SELECT * FROM Negocio en dev.db.bak...");
  
  const jsCode = `
const { createClient } = require('@libsql/client');

async function run() {
    const client = createClient({ url: 'file:./dev.db.bak' });
    try {
        const resNeg = await client.execute("SELECT * FROM Negocio");
        console.log("=== NEGOCIOS EN dev.db.bak ===");
        console.table(resNeg.rows);

        const resUser = await client.execute("SELECT * FROM Usuario");
        console.log("=== USUARIOS EN dev.db.bak ===");
        console.table(resUser.rows);
    } catch(e) {
        console.error("Error:", e);
    }
}
run();
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/inspect_bak_select_all.js\n${jsCode}\nEOF\ncd /opt/Zenda && node inspect_bak_select_all.js`, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let out = "";
    stream.on("data", (data) => { out += data; });
    stream.stderr.on("data", (data) => { out += data; });
    stream.on("close", () => {
      console.log("=== RESULTADOS DEV.DB.BAK ===");
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
