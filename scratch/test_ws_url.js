const { Client } = require('ssh2');

const conn = new Client();
const scriptContent = `
import makeWASocket, { useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testUrl(name, extraOpts) {
    console.log("Probando: " + name);
    const authPath = path.join(__dirname, "test_auth_" + name);
    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });

    return new Promise((resolve) => {
        useMultiFileAuthState(authPath).then(async ({ state, saveCreds }) => {
            const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));
            console.log("Baileys version:", version.join("."));

            const opts = {
                version,
                auth: state,
                browser: Browsers.ubuntu("Chrome"),
                connectTimeoutMs: 15000,
                defaultQueryTimeoutMs: 15000,
                keepAliveIntervalMs: 15000,
                markOnlineOnConnect: false,
                syncFullHistory: false,
                ...extraOpts
            };

            const sock = makeWASocket(opts);
            sock.ev.on("creds.update", saveCreds);

            const timer = setTimeout(() => {
                console.log("Timeout en " + name);
                try { sock.end(); } catch(e){}
                resolve(false);
            }, 15000);

            sock.ev.on("connection.update", (update) => {
                const { connection, lastDisconnect, qr } = update;
                if (qr) {
                    clearTimeout(timer);
                    console.log("SUCCESS WITH " + name + "! QR GENERATED (len: " + qr.length + ")");
                    try { sock.end(); } catch(e){}
                    resolve(true);
                }
                if (connection === "open") {
                    clearTimeout(timer);
                    console.log("Connected in " + name);
                    try { sock.end(); } catch(e){}
                    resolve(true);
                }
                if (connection === "close") {
                    clearTimeout(timer);
                    const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.data?.reason;
                    console.log("FAIL " + name + " closed. Code: " + code + ", msg: " + lastDisconnect?.error?.message);
                    resolve(false);
                }
            });
        });
    });
}

async function runAll() {
    let ok = await testUrl("waWebSocketUrl_chat", { waWebSocketUrl: "wss://web.whatsapp.com/ws/chat" });
    if (!ok) ok = await testUrl("waWebSocketUrl_chat_edge", { waWebSocketUrl: "wss://web.whatsapp.com/ws/chat?ED=2" });
    if (!ok) ok = await testUrl("no_sync_history", { syncFullHistory: false, getMessage: async () => undefined });
    console.log("Fin de pruebas.");
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
        sftp.writeFile('/opt/Zenda/bot/whatsapp-bot/test_url.js', scriptContent, (err) => {
            if (err) {
                console.error(err);
                conn.end();
                return;
            }
            console.log('📤 test_url.js escrito en VPS. Ejecutando...');
            conn.exec('cd /opt/Zenda/bot/whatsapp-bot && node test_url.js', (err, stream) => {
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
