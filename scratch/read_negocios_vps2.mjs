import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Creando script de lectura de bases de datos...");
  
  const jsCode = `
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const path = require('path');

async function checkDb(dbFile) {
    const absPath = path.resolve(dbFile);
    const adapter = new PrismaLibSql({ url: 'file://' + absPath });
    const client = new PrismaClient({ adapter });
    try {
        const negocios = await client.negocio.findMany({ select: { id: true, nombre: true, slug: true } });
        console.log('=== NEGOCIOS EN ' + dbFile + ' ===');
        console.table(negocios);
    } catch(e) {
        console.error('Error leyendo ' + dbFile + ':', e.message);
    } finally {
        await client.$disconnect();
    }
}

async function run() {
    await checkDb('./dev.db');
    await checkDb('./dev.db.bak');
}
run();
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/read_negocios.js\n${jsCode}\nEOF\ncd /opt/Zenda && node read_negocios.js`, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let out = "";
    stream.on("data", (data) => { out += data; });
    stream.stderr.on("data", (data) => { out += data; });
    stream.on("close", () => {
      console.log("=== RESULTADOS VPS ===");
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
