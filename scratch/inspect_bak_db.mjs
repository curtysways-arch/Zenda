import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Leyendo negocios en dev.db y dev.db.bak...");
  
  const cmd = `cd /opt/Zenda && export DATABASE_URL="file:./dev.db.bak" && npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' -e "
    const { prisma } = require('./src/lib/prisma');
    async function main() {
      const negociosBak = await prisma.negocio.findMany({ select: { id: true, nombre: true, slug: true, createdAt: true } });
      console.log('=== NEGOCIOS EN dev.db.bak ===');
      console.table(negociosBak);
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
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
