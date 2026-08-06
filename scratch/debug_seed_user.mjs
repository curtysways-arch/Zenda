import { Client } from "ssh2";

const conn = new Client();
conn.on("ready", async () => {
  console.log("Conectado al VPS para debug...");

  function exec(cmd) {
    return new Promise((resolve, reject) => {
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let out = "";
        stream.on("data", (d) => { out += d; });
        stream.stderr.on("data", (d) => { out += d; });
        stream.on("close", (code) => resolve({ out, code }));
      });
    });
  }

  // 1. Ejecutar curl al seeder y ver la salida completa
  const res = await exec("curl -s http://localhost:3000/api/demo/seed-restaurant");
  console.log("Respuesta Seeder:", res.out);

  // 2. Ver ultimas lineas de logs de PM2 de error
  const logs = await exec("pm2 logs zenda-app --lines 40 --nostream");
  console.log("PM2 Logs:\n", logs.out);

  conn.end();
}).connect({
  host: "157.173.203.174",
  port: 22,
  username: "root",
  password: "Elmassuelto005624"
});
