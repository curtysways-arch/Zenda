import { Client } from "ssh2";

const conn = new Client();
conn.on("ready", () => {
  conn.exec("PGPASSWORD=CitioxProd2024! psql -U zenda_user -h 127.0.0.1 -d zenda_db -c \"SELECT id, nombre, slug, \\\"tipoNegocio\\\" FROM \\\"Negocio\\\";\"", (err, stream) => {
    let out = "";
    stream.on("data", (d) => { out += d.toString(); });
    stream.on("close", () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: "157.173.203.174", port: 22, username: "root", password: "Elmassuelto005624" });
