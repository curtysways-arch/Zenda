import { Client } from "ssh2";

const conn = new Client();
conn.on("ready", () => {
  conn.exec("curl -s http://127.0.0.1:3001/status; echo ''; pm2 status zenda-bot", (err, stream) => {
    let out = "";
    stream.on("data", (d) => { out += d.toString(); });
    stream.on("close", () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: "157.173.203.174", port: 22, username: "root", password: "Elmassuelto005624" });
