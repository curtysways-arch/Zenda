const { Client } = require('ssh2');

const conn = new Client();
const scriptContent = `
import makeWASocket, { useMultiFileAuthState, Browsers } from "@whiskeysockets/baileys";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testVersion(ver) {
    console.log("Probando version: " + JSON.stringify(ver));
    const authPath = path.join(__dirname, "test_auth_ver_" + ver.join("_"));
    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });

    return new Promise((resolve) => {
        useMultiFileAuthState(authPath).then(({ state, saveCreds }) => {
            const opts = {
                version: ver,
                auth: state,
                browser: Browsers.macOS("Desktop"),
                connectTimeoutMs: 15000,
                defaultQueryTimeoutMs: 15000,
                keepAliveIntervalMs: 15000,
                markOnlineOnConnect: false,
                syncFullHistory: false,
            };

            const sock = makeWASocket(opts);
            sock.ev.on("creds.update", saveCreds);

            const timer = setTimeout(() => {
                console.log("Timeout en version " + ver.join("_"));
                try { sock.end(); } catch(e){}
                resolve(false);
            }, 12000);

            sock.ev.on("connection.update", (update) => {
                const { connection, lastDisconnect, qr } = update;
                if (qr) {
                    clearTimeout(timer);
                    console.log("🎉 SUCCESS! QR GENERADO CON VERSION " + ver.join("_") + " (len: " + qr.length + ")");
                    try { sock.end(); } catch(e){}
                    resolve(true);
                }
                if (connection === "open") {
                    clearTimeout(timer);
                    console.log("Connected con version " + ver.join("_"));
                    try { sock.end(); } catch(e){}
                    resolve(true);
                }
                if (connection === "close") {
                    clearTimeout(timer);
                    const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.data?.reason;
                    console.log("FAIL version " + ver.join("_") + " closed. Code: " + code);
                    resolve(false);
                }
            });
        });
    });
}

async function runAll() {
    let versions = [
        [2, 3000, 1017531287],
        [2, 3000, 1015901307],
        [2, 2413, 51],
        [2, 2412, 1],
        [2, 3000, 1019000000]
    ];
    for (let v of versions) {
        let ok = await testVersion(v);
        if (ok) break;
    }
    console.log("Fin de pruebas de version.");
}
runAll();
`;

conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if (err) {
            console.error(err);
            conn.end();
            return;
        }
        sftp.writeFile('/opt/Zenda/bot/whatsapp-bot/test_ver.js', scriptContent, (err) => {
            if (err) {
                console.error(err);
                conn.end();
                return;
            }
            console.log('📤 test_ver.js escrito en VPS. Ejecutando...');
            conn.exec('cd /opt/Zenda/bot/whatsapp-bot && node test_ver.js', (err, stream) => {
                if (err) {
                    console.error(err);
                    conn.end();
                    return;
                }
                stream.on('data', d => process.stdout.write(d.toString()));
                stream.stderr.on('data', d => process.stderr.write(d.toString()));
                stream.on('close', () => {
                    conn.end();
                });
            });
        });
    });
}).connect({ 
    host: '157.173.203.174', 
    port: 22, 
    username: 'root', 
    password: 'Elmassuelto005624'
});
