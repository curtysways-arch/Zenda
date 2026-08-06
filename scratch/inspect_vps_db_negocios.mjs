import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Buscando bases de datos y negocios...");
  
  // Listar archivos .db en /opt/Zenda y subdirectorios, y buscar negocios existentes
  const cmd = `cd /opt/Zenda && find . -name "*.db*" -o -name "*.sqlite*" ; export DATABASE_URL="file:./dev.db" && npx ts-node --compiler-options '{"module":"CommonJS"}' -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    async function main() {
      const negocios = await prisma.negocio.findMany({ select: { id: true, nombre: true, slug: true, email: true } });
      console.log('--- NEGOCIOS EN BD ACTUAL ---');
      console.table(negocios);
    }
    main().catch(console.error).finally(() => prisma.\\$disconnect());
  "`;

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
      console.log("=== RESULTADOS VPS ===");
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
