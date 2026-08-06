import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    echo "=== ÚLTIMOS ERRORES DEL LOG PM2 ==="
    tail -n 80 /root/.pm2/logs/zenda-app-error.log

    echo ""
    echo "=== VERIFICAR DATABASE_URL en .env ==="
    grep "DATABASE_URL" /opt/Zenda/.env
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (data) => { out += data; });
    stream.stderr.on("data", (data) => { out += data; });
    stream.on("close", () => { console.log(out); conn.end(); });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
