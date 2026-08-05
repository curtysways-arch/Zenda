const { Client } = require('ssh2');

const conn = new Client();
const scriptContent = `
import makeWASocket, { useMultiFileAuthState, Browsers } from "@whiskeysockets/baileys";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authPath = path.join(__dirname, "test_auth_no_fetch");
if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });

async function test() {
    console.log("🧪 Probando conexión con Baileys SIN fetchLatestBaileysVersion...");
    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    const sock = makeWASocket({
        auth: state,
        browser: Browsers.macOS("Desktop"),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("🎉 ¡¡¡ÉXITO TOTAL!!! CÓDIGO QR GENERADO CORRECTAMENTE:");
            console.log("QR Length:", qr.length);
            console.log("QR Data:", qr);
            process.exit(0);
        }
        if (connection === "open") {
            console.log("✅ Conectado exitosamente!");
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
        sftp.writeFile('/opt/Zenda/bot/whatsapp-bot/test_no_fetch.js', scriptContent, (err) => {
            if (err) {
                console.error(err);
                conn.end();
                return;
            }
            console.log('📤 test_no_fetch.js escrito en VPS. Ejecutando...');
            conn.exec('cd /opt/Zenda/bot/whatsapp-bot && node test_no_fetch.js', (err, stream) => {
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
