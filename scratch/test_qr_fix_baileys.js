const { Client } = require('ssh2');

const conn = new Client();
const scriptContent = `
import makeWASocket, { useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authPath = path.join(__dirname, "test_auth_final");
if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });

async function test() {
    console.log("🧪 Probando solución Baileys con waWebSocketUrl y Browsers.ubuntu('Desktop')...");
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();
    console.log("Baileys version:", version.join("."));

    const sock = makeWASocket({
        version,
        auth: state,
        browser: Browsers.ubuntu('Desktop'),
        waWebSocketUrl: 'wss://web.whatsapp.com/ws/chat',
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        syncFullHistory: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("🎉 🎉 🎉 ¡¡¡CÓDIGO QR GENERADO CON ÉXITO Y CONECTADO A WHATSAPP WEB!!!");
            console.log("QR Length:", qr.length);
            console.log("QR String:", qr);
            process.exit(0);
        }
        if (connection === "open") {
            console.log("✅ Conectado!");
            process.exit(0);
        }
        if (connection === "close") {
            console.error("❌ Conexión cerrada:", lastDisconnect?.error);
            process.exit(1);
        }
    });
}
test();
`;

conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if (err) {
            console.error(err);
            conn.end();
            return;
        }
        sftp.writeFile('/opt/Zenda/bot/whatsapp-bot/test_fix.js', scriptContent, (err) => {
            if (err) {
                console.error(err);
                conn.end();
                return;
            }
            console.log('📤 test_fix.js escrito en VPS. Ejecutando...');
            conn.exec('cd /opt/Zenda/bot/whatsapp-bot && node test_fix.js', (err, stream) => {
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
