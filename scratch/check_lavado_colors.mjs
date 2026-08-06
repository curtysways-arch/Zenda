import { Client } from "ssh2";

const conn = new Client();
conn.on("ready", () => {
  const query = 'SELECT id, nombre, slug, "colorPrimario", "colorSecundario" FROM "Negocio" WHERE slug = \'lavado\';';
  conn.exec(`PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c '${query}'`, (err, stream) => {
    stream.on("data", (d) => process.stdout.write(d.toString()));
    stream.on("close", () => conn.end());
  });
}).connect({ host: "157.173.203.174", port: 22, username: "root", password: "Elmassuelto005624" });
