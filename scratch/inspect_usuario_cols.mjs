import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Obteniendo columnas de Usuario...");
  
  const jsCode = `
const { createClient } = require('@libsql/client');

async function run() {
    const client = createClient({ url: 'file:./dev.db' });
    const cols = await client.execute("PRAGMA table_info(Usuario)");
    console.log("Columnas en Usuario:");
    console.table(cols.rows.map(r => ({ name: r.name, type: r.type, notnull: r.notnull })));
}
run().catch(console.error);
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/get_user_cols.js\n${jsCode}\nEOF\ncd /opt/Zenda && node get_user_cols.js`, (err, stream) => {
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
