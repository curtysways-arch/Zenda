const { Client } = require('ssh2');

const conn = new Client();
const scriptContent = `
import makeWASocket, { useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testBrowser(name, browserConfig, versionConfig) {
    console.log("Probando configuracion: " + name);
    const authPath = path.join(__dirname, "test_auth_" + name);
    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });

    return new Promise((resolve) => {
        useMultiFileAuthState(authPath).then(({ state, saveCreds }) => {
            const opts = {
                auth: state,
                browser: browserConfig,
                connectTimeoutMs: 15000,
                defaultQueryTimeoutMs: 15000,
                keepAliveIntervalMs: 15000,
                markOnlineOnConnect: false,
                syncFullHistory: false
            };
            if (versionConfig) opts.version = versionConfig;

            const sock = makeWASocket(opts);
            sock.ev.on("creds.update", saveCreds);

            const timer = setTimeout(() => {
                console.log("Timeout en " + name);
                try { sock.end(); } catch(e){}
                resolve(false);
            }, 12000);

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
    let ok = await testBrowser("macOS_Desktop", Browsers.macOS("Desktop"));
    if (!ok) ok = await testBrowser("macOS_Safari", Browsers.macOS("Safari"));
    if (!ok) ok = await testBrowser("windows_Desktop", Browsers.windows("Desktop"));
    if (!ok) ok = await testBrowser("baileys_custom", ["Mac OS", "Chrome", "124.0.0.0"]);
    if (!ok) ok = await testBrowser("macOS_version_fixed", Browsers.macOS("Desktop"), [2, 3000, 1015901307]);
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
        sftp.writeFile('/opt/Zenda/bot/whatsapp-bot/test_browsers.js', scriptContent, (err) => {
            if (err) {
                console.error(err);
                conn.end();
                return;
            }
            console.log('📤 test_browsers.js escrito en VPS. Ejecutando pruebas de navegador...');
            conn.exec('cd /opt/Zenda/bot/whatsapp-bot && node test_browsers.js', (err, stream) => {
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
