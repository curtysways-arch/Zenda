import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Consultando sqlite3...");
  
  const cmd = `
    echo "=== NEGOCIOS EN dev.db ==="
    sqlite3 /opt/Zenda/dev.db "SELECT id, nombre, slug FROM Negocio;"
    
    echo "=== NEGOCIOS EN dev.db.bak ==="
    sqlite3 /opt/Zenda/dev.db.bak "SELECT id, nombre, slug FROM Negocio;"
  `;

  conn.exec(cmd, (err, stream) => {
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
