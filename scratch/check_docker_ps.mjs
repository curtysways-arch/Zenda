import { Client } from "ssh2";

const conn = new Client();
conn.on("ready", () => {
  conn.exec(`docker ps`, (err, stream) => {
    let out = "";
    stream.on("data", (d) => { out += d.toString(); });
    stream.on("close", () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: "157.173.203.174", port: 22, username: "root", password: "Elmassuelto005624" });
