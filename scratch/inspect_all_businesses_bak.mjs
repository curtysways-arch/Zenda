import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Analizando todo dev.db.bak...");
  
  const jsCode = `
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const path = require('path');

async function run() {
    const absPath = path.resolve('./dev.db.bak');
    const adapter = new PrismaLibSql({ url: 'file://' + absPath });
    const client = new PrismaClient({ adapter });
    try {
        const negocios = await client.negocio.findMany();
        console.log('=== TODOS LOS NEGOCIOS EN dev.db.bak ===');
        console.table(negocios.map(n => ({ id: n.id, nombre: n.nombre, slug: n.slug, email: n.email, telefono: n.telefono })));

        const usuarios = await client.usuario.findMany({ select: { id: true, nombre: true, email: true, rol: true, negocioId: true } });
        console.log('=== USUARIOS EN dev.db.bak ===');
        console.table(usuarios);
    } catch(e) {
        console.error('Error:', e);
    } finally {
        await client.$disconnect();
    }
}
run();
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/inspect_all.js\n${jsCode}\nEOF\ncd /opt/Zenda && node inspect_all.js`, (err, stream) => {
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
