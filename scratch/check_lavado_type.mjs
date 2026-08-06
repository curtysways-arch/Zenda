import { Client } from "ssh2";

const conn = new Client();
conn.on("ready", () => {
  const query = `
    SELECT id, nombre, slug, "tipoNegocio"
    FROM "Negocio"
    WHERE slug LIKE '%lavado%';
  `;
  conn.exec(`docker exec zenda-db-1 psql -U postgres -d zenda_db -c "${query.replace(/\n/g, ' ')}"`, (err, stream) => {
    let out = "";
    stream.on("data", (d) => { out += d.toString(); });
    stream.on("close", () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: "157.173.203.174", port: 22, username: "root", password: "Elmassuelto005624" });
