const { Client } = require('ssh2');

const conn = new Client();
const scriptContent = `
import makeWASocket, { useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authPath = path.join(__dirname, "test_auth_pairing");
if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });

async function test() {
    console.log("🧪 Probando generación de Código de Vinculación (Pairing Code)...");
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1017531287] }));

    const sock = makeWASocket({
        version,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
    });

    sock.ev.on("creds.update", saveCreds);

    setTimeout(async () => {
        try {
            console.log("Sollicitando Código de Vinculación para 593968118444...");
            const code = await sock.requestPairingCode("593968118444");
            console.log("🎉 🎉 🎉 ¡CÓDIGO DE VINCULACIÓN GENERADO EXITOSAMENTE! ->", code);
            process.exit(0);
        } catch (e) {
            console.error("❌ Error al pedir pairing code:", e);
            process.exit(1);
        }
    }, 3000);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            console.error("❌ Conexión cerrada:", lastDisconnect?.error);
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
        sftp.writeFile('/opt/Zenda/bot/whatsapp-bot/test_pairing.js', scriptContent, (err) => {
            if (err) {
                console.error(err);
                conn.end();
                return;
            }
            console.log('📤 test_pairing.js escrito en VPS. Ejecutando...');
            conn.exec('cd /opt/Zenda/bot/whatsapp-bot && node test_pairing.js', (err, stream) => {
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
