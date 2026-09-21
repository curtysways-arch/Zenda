import { Client } from "ssh2";

const conn = new Client();
conn.on("ready", () => {
  conn.exec("pm2 status zenda-app && tail -n 25 /root/.pm2/logs/zenda-app-out.log || true", (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let out = "";
    stream.on("data", d => out += d);
    stream.on("close", () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({
  host: "157.173.203.174",
  port: 22,
  username: "root",
  password: "Elmassuelto005624"
});
