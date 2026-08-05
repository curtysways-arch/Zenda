import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";
const REMOTE_BASE = "/opt/Zenda";

const conn = new Client();
conn.on("ready", () => {
  console.log("\n Conectado al VPS. Actualizando NUMERO_WHATSAPP_ADMIN a 593968118444...\n");
  
  const sftp = conn.sftp((err, sftp) => {
    if (err) throw err;
    const remoteFile = `${REMOTE_BASE}/set_wa.js`;
    const localContent = `
require("dotenv").config();
const prisma = require("./src/lib/prisma").default;

async function main() {
  const updated = await prisma.globalConfig.upsert({
    where: { clave: 'NUMERO_WHATSAPP_ADMIN' },
    update: { valor: '593968118444' },
    create: {
      id: require('crypto').randomUUID(),
      clave: 'NUMERO_WHATSAPP_ADMIN',
      valor: '593968118444'
    }
  });
  console.log("GlobalConfig actualizado:", updated);
}

main()
  .catch(e => console.error("Error:", e))
  .finally(() => process.exit(0));
`;
    const stream = sftp.createWriteStream(remoteFile);
    stream.on("close", () => {
      conn.exec(`cd ${REMOTE_BASE} && npx tsx set_wa.js`, (err, execStream) => {
        if (err) throw err;
        execStream.on("data", (d) => process.stdout.write(d));
        execStream.stderr.on("data", (d) => process.stderr.write(d));
        execStream.on("close", (code) => {
          console.log(`\nFinalizado con codigo ${code}`);
          conn.end();
        });
      });
    });
    stream.write(localContent);
    stream.end();
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
