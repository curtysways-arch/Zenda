import { Client } from "ssh2";
import path from "path";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";
const REMOTE_BASE = "/opt/Zenda";

const files = [
  "src/app/admin/misiones-citiox/page.tsx",
  "src/app/api/admin/misiones-globales/route.ts",
  "src/lib/growth/globalMissionEngine.ts",
  "src/app/page.tsx"
];

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const localFull = path.resolve(localPath.replace(/\//g, path.sep));
    sftp.fastPut(localFull, remotePath, (err) => {
      if (err) { console.log(`  ERROR ${localPath}: ${err.message}`); reject(err); }
      else { console.log(`  OK    ${localPath}`); resolve(); }
    });
  });
}

function execCommand(conn, cmd, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n>> ${label || cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => { process.stdout.write(d); out += d; });
      stream.stderr.on("data", (d) => { process.stderr.write(d); });
      stream.on("close", (code) => {
        if (code !== 0) reject(new Error(`Comando falló con código ${code}`));
        else resolve(out);
      });
    });
  });
}

const conn = new Client();
conn.on("ready", async () => {
  console.log("\n Conectado al VPS. Subiendo archivos...\n");
  
  await new Promise((resolve, reject) => {
    conn.sftp(async (err, sftp) => {
      if (err) return reject(err);
      for (const file of files) {
        const remotePath = `${REMOTE_BASE}/${file}`;
        await uploadFile(sftp, file, remotePath).catch((e) => {
          console.error("Error subiendo", file, e);
        });
      }
      resolve();
    });
  });

  console.log("\n Limpiando cache y construyendo la aplicacion (npm run build)...");
  await execCommand(conn, `cd ${REMOTE_BASE} && rm -rf .next && npm run build`, "Clean build").catch(e => {
    console.error("Error en build:", e.message);
  });

  await execCommand(conn, "pm2 restart zenda-app", "pm2 restart zenda-app");
  console.log("\n Despliegue completado con exito!");
  conn.end();
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
