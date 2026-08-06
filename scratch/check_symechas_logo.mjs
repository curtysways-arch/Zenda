import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c '
      SELECT id, nombre, slug, "logoUrl", "bannerUrl", "heroSubtitulo" 
      FROM "Negocio" 
      WHERE slug = '"'"'symechas-peluquera'"'"';
    '
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (d) => { out += d; process.stdout.write(d); });
    stream.stderr.on("data", (d) => { out += d; });
    stream.on("close", () => conn.end());
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
