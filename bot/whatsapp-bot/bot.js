import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import QRCode from "qrcode";
import path from "path";
import http from "http";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Estado global del bot ───────────────────────────────────────────────────
let client = null;
let currentQR = null;
let qrImageDataUrl = null;
let connectionState = 'closed'; // 'closed', 'connecting', 'open'
let connectedNumber = null;
let connectionPromise = null;
let isReconnecting = false;
let lastError = null;

// ─── Servidor HTTP interno (para recibir peticiones de envío desde Next.js) ──
const BOT_HTTP_PORT = process.env.BOT_HTTP_PORT || 3001;
const NEXTJS_WEBHOOK = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`
  : "http://127.0.0.1:3000/api/webhooks/whatsapp";

const httpServer = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  // Endpoint para reporte de errores
  if (req.method === "GET" && req.url === "/debug") {
    res.writeHead(200);
    res.end(JSON.stringify({ lastError, connectionState, hasClient: !!client }));
    return;
  }

  // Endpoint para enviar mensaje
  if (req.method === "POST" && req.url === "/send") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        const { numero, mensaje } = JSON.parse(body);
        const result = await sendMessage(numero, mensaje);
        res.writeHead(result.success ? 200 : 500);
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Endpoint para cerrar sesión (Logout)
  if (req.method === "POST" && req.url === "/logout") {
    try {
      if (client) {
        await client.logout().catch(() => {});
        await client.destroy().catch(() => {});
        client = null;
      }
      
      const authPath = path.join(__dirname, ".wwebjs_auth");
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
      }
      
      connectionState = "closed";
      connectedNumber = null;
      currentQR = null;
      qrImageDataUrl = null;
      
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // Endpoint para forzar reconexión / arranque (SIN borrar sesión guardada)
  if (req.method === "POST" && req.url === "/connect") {
    try {
      startBot(false);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: "Intentando conectar..." }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // Endpoint para el código QR actual en formato JSON (esperado por Next.js)
  if (req.method === "GET" && req.url === "/qr") {
    res.writeHead(200);
    res.end(JSON.stringify({ qr: currentQR }));
    return;
  }

  // Endpoint para el código QR actual en formato HTML (para visualizar en el navegador)
  if (req.method === "GET" && req.url === "/qr-web") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (connectionState === "open") {
      res.writeHead(200);
      res.end(`<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#111;color:#0f0"><h1>✅ WhatsApp ya está conectado (${connectedNumber || 'OK'})</h1></body></html>`);
    } else if (qrImageDataUrl) {
      res.writeHead(200);
      res.end(`<html><head><meta http-equiv="refresh" content="30"><title>Escanea QR</title></head><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#111;color:#fff"><h2>📱 Escanea este QR con WhatsApp</h2><img src="${qrImageDataUrl}" style="width:400px;height:400px;border-radius:12px" /><p style="color:#aaa">Esta página se refresca automáticamente cada 30s</p></body></html>`);
    } else {
      res.writeHead(200);
      res.end(`<html><head><meta http-equiv="refresh" content="5"><title>Esperando QR...</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#111;color:#ff0"><h2>⏳ Esperando código QR... (reintentando en 5s)</h2></body></html>`);
    }
    return;
  }

  // Endpoint JSON del QR (para API)
  if (req.method === "GET" && req.url === "/qr-json") {
    res.writeHead(200);
    res.end(JSON.stringify({ qr: currentQR, image: qrImageDataUrl, state: connectionState }));
    return;
  }

  // Endpoint de test: simular recepción de mensaje
  if (req.method === "POST" && req.url === "/test-receive") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        const { from, text } = JSON.parse(body);
        const testMsg = {
          from: from || "593000000000",
          text: text || "AYUDA",
          message_id: `manual_test_${Date.now()}`,
          raw_jid: `${(from || "593000000000")}@c.us`,
          bot_number: connectedNumber,
          is_from_me: false
        };
        const fetchRes = await fetch(NEXTJS_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testMsg)
        });
        const data = await fetchRes.json();
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, webhookStatus: fetchRes.status, webhookResponse: data }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Endpoint de salud y estado detallado
  if (req.method === "GET" && (req.url === "/health" || req.url === "/status")) {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      status: connectionState, 
      connected: connectionState === 'open',
      connectedTo: connectedNumber,
      hasQR: !!currentQR
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

httpServer.listen(BOT_HTTP_PORT, () => {
  console.log(`[WA BOT] Servidor HTTP escuchando en puerto ${BOT_HTTP_PORT}`);
});

// ─── Inicialización de WhatsApp Web Client ───────────────────────────────────
async function startBot(force = false) {
  if (client && connectionState === 'open' && !force) return client;
  if (isReconnecting && !force) return connectionPromise;
  if (connectionPromise && !force) return connectionPromise;

  isReconnecting = true;

  if (client) {
    try {
      await client.destroy();
    } catch (e) {}
    client = null;
  }

  connectionPromise = new Promise(async (resolve, reject) => {
    console.log(`[WA BOT] [${force ? 'FORZADO' : 'NORMAL'}] Inicializando WhatsApp Web Client...`);
    connectionState = 'connecting';

    try {
      const authPath = path.join(__dirname, ".wwebjs_auth");
      if (force && fs.existsSync(authPath)) {
        try {
          console.log("[WA BOT] Limpiando sesión previa...");
          fs.rmSync(authPath, { recursive: true, force: true });
        } catch(e) {}
      }

      const executablePath = process.platform === 'linux'
        ? '/usr/bin/chromium-browser'
        : undefined;

      const newClient = new Client({
        authStrategy: new LocalAuth({ dataPath: authPath }),
        puppeteer: {
          executablePath,
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

      client = newClient;

      // ─── Evento QR ────────────────────────────────────────────────────────
      newClient.on("qr", async (qr) => {
        currentQR = qr;
        connectionState = "connecting";
        try {
          qrImageDataUrl = await QRCode.toDataURL(qr, { width: 400, margin: 2 });
          console.log("[WA BOT] 🎉 ¡Código QR generado de forma exitosa!");
        } catch (err) {
          console.error("[WA BOT] Error al renderizar DataURL del QR:", err.message);
        }
      });

      // ─── Evento Ready ──────────────────────────────────────────────────────
      newClient.on("ready", () => {
        console.log("✅ WHATSAPP CONECTADO EXITOSAMENTE");
        connectionState = "open";
        connectionPromise = null;
        isReconnecting = false;
        currentQR = null;
        qrImageDataUrl = null;
        connectedNumber = newClient.info?.wid?.user || "conectado";
        resolve(newClient);
      });

      // ─── Evento Desconexión / Fallo de Autenticación ────────────────────────
      newClient.on("auth_failure", (msg) => {
        console.error("[WA BOT] ❌ Fallo de autenticación:", msg);
        connectionState = "closed";
        connectionPromise = null;
        isReconnecting = false;
        currentQR = null;
        qrImageDataUrl = null;
        connectedNumber = null;
        reject(new Error(`Fallo de autenticación: ${msg}`));
      });

      newClient.on("disconnected", (reason) => {
        console.log(`[WA BOT] ❌ Conexión cerrada. Razón: ${reason}`);
        connectionState = "closed";
        connectionPromise = null;
        isReconnecting = false;
        currentQR = null;
        qrImageDataUrl = null;
        connectedNumber = null;

        fetch(NEXTJS_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: 'connection-status',
            status: 'disconnected',
            reason: `Sesión desvinculada/cerrada. (${reason})`
          })
        }).catch(e => console.error("[WA BOT] Error notificando desconexión:", e.message));

        setTimeout(() => startBot(), 10000);
      });

      // ─── Evento Mensajes Entrantes ──────────────────────────────────────────
      const botStartTime = Math.floor(Date.now() / 1000);

      newClient.on("message", async (msg) => {
        try {
          if (msg.fromMe) return;
          const rawJid = msg.from;
          if (!rawJid || rawJid.endsWith('@g.us') || rawJid === 'status@broadcast') return;

          if (msg.timestamp && msg.timestamp < botStartTime - 60) return;

          const body = (msg.body || "").trim();
          if (!body) return;

          const resolvedPhone = rawJid.split('@')[0];

          console.log(`[WA BOT] 📩 Mensaje de ${resolvedPhone}: "${body}"`);

          const res = await fetch(NEXTJS_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              from: resolvedPhone,
              text: body,
              message_id: msg.id.id || msg.id._serialized,
              raw_jid: rawJid,
              bot_number: connectedNumber,
              is_from_me: false,
            }),
          });

          const data = await res.json();
          console.log(`[WA BOT] Webhook response (${res.status}):`, data);

          if (data.response && client) {
            await client.sendMessage(rawJid, data.response);
          }
        } catch (err) {
          console.error("[WA BOT] Error procesando mensaje entrante:", err.message);
        }
      });

      newClient.initialize().catch((initErr) => {
        lastError = initErr.message;
        connectionPromise = null;
        isReconnecting = false;
        console.error("[WA BOT] Error al inicializar cliente:", initErr.message);
        reject(initErr);
      });

    } catch (err) {
      connectionPromise = null;
      isReconnecting = false;
      console.error("[WA BOT] Error fatal:", err.message);
      reject(err);
    }
  });

  return connectionPromise;
}

// ─── Función de envío ─────────────────────────────────────────────────────────
async function sendMessage(numero, mensaje) {
  try {
    const currentClient = await startBot();
    if (!currentClient || connectionState !== 'open') throw new Error("Cliente WhatsApp no conectado");

    let clean = numero.replace(/\D/g, "");

    // Normalización para Ecuador (593)
    if (clean.startsWith("5930")) {
      clean = "593" + clean.substring(4);
    } else if (clean.startsWith("0")) {
      clean = "593" + clean.substring(1);
    } else if (!clean.startsWith("593")) {
      clean = "593" + clean;
    }

    const jid = `${clean}@c.us`;
    console.log(`[WA BOT] [SEND] Destinatario: ${clean}, JID: ${jid}`);
    await currentClient.sendMessage(jid, mensaje);
    console.log(`📩 [WA BOT] [SUCCESS] Enviado a ${jid}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ [WA BOT] Error enviando mensaje:`, error.message);
    return { success: false, error: error.message };
  }
}

// ─── Tareas Periódicas (Heartbeat) ──────────────────────────────────────────
setInterval(async () => {
  try {
    const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp` : 'http://127.0.0.1:3000/api/webhooks/whatsapp';
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check-expirations', text: 'system' })
    });
  } catch (err) {}
}, 60000);

// ─── Manejo de errores globales ──────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('[WA BOT] Rejection no manejada:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[WA BOT] Excepción no capturada:', err);
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
startBot().catch(err => {
  console.error("[WA BOT] Error crítico en el arranque:", err.message);
});