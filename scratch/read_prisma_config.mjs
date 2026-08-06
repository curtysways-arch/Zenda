import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    echo "=== prisma.config.ts actual en VPS ==="
    cat /opt/Zenda/prisma.config.ts 2>/dev/null || echo "NO EXISTE prisma.config.ts"

    echo ""
    echo "=== Archivos .ts en raíz del proyecto ==="
    ls /opt/Zenda/*.ts 2>/dev/null
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (d) => { out += d; });
    stream.stderr.on("data", (d) => { out += d; });
    stream.on("close", () => { console.log(out); conn.end(); });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
