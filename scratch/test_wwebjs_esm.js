const { Client: SSHClient } = require('ssh2');

const conn = new SSHClient();
const scriptContent = `
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("🧪 Iniciando test ES Module con whatsapp-web.js...");

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: {
        executablePath: '/usr/bin/chromium-browser',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', async (qr) => {
    console.log("🎉 🎉 🎉 ¡¡¡CÓDIGO QR GENERADO POR WHATSAPP-WEB.JS CON ÉXITO!!!");
    console.log("QR Raw:", qr);
    try {
        const url = await qrcode.toDataURL(qr);
        console.log("DataURL QR Length:", url.length);
    } catch(e) {}
    process.exit(0);
});

client.on('ready', () => {
    console.log("✅ Cliente listo y conectado!");
    process.exit(0);
});

client.on('auth_failure', msg => {
    console.error('❌ Error de autenticación:', msg);
    process.exit(1);
});

client.initialize().catch(err => {
    console.error("❌ Error al inicializar client:", err);
    process.exit(1);
});
`;

conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if (err) {
            console.error(err);
            conn.end();
            return;
        }
        sftp.writeFile('/opt/Zenda/bot/whatsapp-bot/test_wweb.js', scriptContent, (err) => {
            if (err) {
                console.error(err);
                conn.end();
                return;
            }
            console.log('📤 test_wweb.js escrito en VPS. Ejecutando...');
            conn.exec('cd /opt/Zenda/bot/whatsapp-bot && node test_wweb.js', (err, stream) => {
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
