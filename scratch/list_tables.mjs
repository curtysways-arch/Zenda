import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Listando todas las tablas en dev.db.bak y dev.db...");
  
  const jsCode = `
const { createClient } = require('@libsql/client');

async function run() {
    const srcClient = createClient({ url: 'file:./dev.db.bak' });
    const dstClient = createClient({ url: 'file:./dev.db' });

    const srcTables = await srcClient.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("=== TABLAS EN dev.db.bak ===");
    console.log(srcTables.rows.map(r => r.name));

    const dstTables = await dstClient.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("=== TABLAS EN dev.db ===");
    console.log(dstTables.rows.map(r => r.name));
}
run();
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/list_tables.js\n${jsCode}\nEOF\ncd /opt/Zenda && node list_tables.js`, (err, stream) => {
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
