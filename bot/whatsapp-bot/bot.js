import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import QRCode from "qrcode";
import path from "path";
import http from "http";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Estado global del bot ───────────────────────────────────────────────────
let sock = null;
let currentQR = null;
let qrImageDataUrl = null;
let connectionState = 'closed';
let connectionPromise = null;
let connectedNumber = null;

// ─── Servidor HTTP interno (para recibir peticiones de envío desde Next.js) ──
const BOT_HTTP_PORT = process.env.BOT_HTTP_PORT || 3001;
const NEXTJS_WEBHOOK = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`
  : "http://127.0.0.1:3000/api/webhooks/whatsapp";

let lastError = null;

const httpServer = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  // Endpoint para reporte de errores
  if (req.method === "GET" && req.url === "/debug") {
    res.writeHead(200);
    res.end(JSON.stringify({ lastError, connectionState, hasSock: !!sock }));
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
      if (sock) {
        await sock.logout();
        sock.end();
        sock = null;
      }
      
      const authPath = path.join(__dirname, "auth_v2");
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
      }
      
      connectionState = "closed";
      connectedNumber = null;
      currentQR = null;
      
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // Endpoint para forzar reconexión / arranque
  if (req.method === "POST" && req.url === "/connect") {
    try {
      startBot(false); // No borrar credenciales al conectar, usar sesión previa
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
      res.end(`<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#111;color:#0f0"><h1>✅ WhatsApp ya está conectado</h1></body></html>`);
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
          raw_jid: `${(from || "593000000000")}@s.whatsapp.net`,
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
  if (req.method === "GET" && req.url === "/health" || req.url === "/status") {
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

// ─── Inicialización de Baileys ────────────────────────────────────────────────
let isReconnecting = false; // Mutex para evitar reconexiones simultáneas

async function startBot(force = false) {
  if (sock && connectionState === 'open' && !force) return sock;
  
  // Si ya hay una reconexión en curso, no crear otra
  if (isReconnecting && !force) {
    console.log("[WA BOT] Ya hay una reconexión en curso, ignorando...");
    return connectionPromise;
  }

  // Si ya hay una promesa en curso y no estamos forzando, esperar esa.
  if (connectionPromise && !force) return connectionPromise;

  // Marcar que estamos reconectando
  isReconnecting = true;

  // Cerrar el socket anterior COMPLETAMENTE si existe
  if (sock) {
    try {
      sock.ev.removeAllListeners();
      sock.ws?.close();
      sock.end();
    } catch (e) {}
    sock = null;
  }

  connectionPromise = new Promise(async (resolve, reject) => {
    console.log(`[WA BOT] [${force ? 'FORZADO' : 'NORMAL'}] Inicializando conexión...`);
    connectionState = 'connecting';

    try {
      const authPath = path.join(__dirname, "auth_v2");
      
      // Si forzamos, intentamos una limpieza profunda del folder de auth
      if (force) {
          try {
              if (fs.existsSync(authPath)) {
                  console.log("[WA BOT] Limpiando sesión previa para reintento fresco...");
                  fs.rmSync(authPath, { recursive: true, force: true });
              }
          } catch (e) {
              console.error("[WA BOT] Error al limpiar auth:", e.message);
          }
      }

      console.log("[WA BOT] Cargando credenciales en:", authPath);
      let state, saveCreds;
      try {
        const result = await useMultiFileAuthState(authPath);
        state = result.state;
        saveCreds = result.saveCreds;
      } catch (authErr) {
        lastError = `Error cargando credenciales: ${authErr.message}`;
        throw authErr;
      }
      
      // Intentar obtener la versión más reciente de WhatsApp de forma dinámica, con fallback moderno
      let version = [6, 45, 0];
      try {
        const { version: latestVersion } = await fetchLatestBaileysVersion();
        version = latestVersion;
        console.log(`[WA BOT] Versión dinámica de WhatsApp cargada: ${version.join(".")}`);
      } catch (err) {
        console.warn(`[WA BOT] No se pudo obtener la última versión de Baileys, usando fallback: ${version.join(".")}`);
      } 
      
      const socketFunc = typeof makeWASocket === "function" ? makeWASocket : makeWASocket.default;

      const newSock = socketFunc({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ["Cancha Bot", "Chrome", "1.0.0"],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 15000,
        keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 5000,
        maxRetries: 5,
        syncFullHistory: false, // NO sincronizar historial completo
      });

      sock = newSock;
      newSock.ev.on("creds.update", saveCreds);

      // ─── Mensajes entrantes → llama al webhook de Next.js ─────────────────
      const botStartTime = Math.floor(Date.now() / 1000); // timestamp en segundos

      newSock.ev.on("messages.upsert", async (m) => {
        // ⚠️ SOLO procesar 'notify' (mensajes nuevos en tiempo real)
        if (m.type !== "notify") {
          return; // Silencioso para no llenar logs
        }

        for (const msg of m.messages) {
          if (!msg.message) continue;

          try {
            const isFromMe = msg.key.fromMe;
            if (isFromMe) continue; // Ignorar mensajes propios

            const id = msg.key.id;
            const rawJid = msg.key.remoteJid;

            if (!rawJid || rawJid === 'status@broadcast' || rawJid.endsWith('@g.us') || rawJid.endsWith('@broadcast')) continue;

            // Filtro de tiempo: ignorar mensajes anteriores al arranque del bot
            const msgTimestamp = typeof msg.messageTimestamp === 'number' 
              ? msg.messageTimestamp 
              : Number(msg.messageTimestamp?.low || msg.messageTimestamp || 0);
            if (msgTimestamp > 0 && msgTimestamp < botStartTime - 60) continue;

            const body =
              (msg.message.conversation ||
              msg.message.extendedTextMessage?.text ||
              msg.message.buttonsResponseMessage?.selectedButtonId ||
              msg.message.imageMessage?.caption ||
              msg.message.videoMessage?.caption ||
              "").trim();

            if (!body) continue;

            // Resolver LID → número real si es posible
            let resolvedPhone = rawJid;
            if (rawJid.endsWith("@lid")) {
              const contacts = newSock.contacts || {};
              const entry = Object.entries(contacts).find(
                ([jid, c]) => jid === rawJid || (c && c.lid === rawJid)
              );
              resolvedPhone = entry
                ? entry[0].replace("@s.whatsapp.net", "")
                : rawJid;
            } else {
              resolvedPhone = rawJid.split('@')[0].split(':')[0];
            }

            console.log(`[WA BOT] 📩 Mensaje de ${rawJid} → ${resolvedPhone}: "${body}"`);

            try {
              const res = await fetch(NEXTJS_WEBHOOK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    from: resolvedPhone,
                    text: body,
                    message_id: id,
                    raw_jid: rawJid,
                    bot_number: connectedNumber,
                    is_from_me: false,
                  }),
              });
              const data = await res.json();
              console.log(`[WA BOT] Webhook response (${res.status}):`, data);

              if (data.response && newSock) {
                await newSock.sendMessage(rawJid, { text: data.response });
              }
            } catch (fetchErr) {
              console.error("[WA BOT] Error llamando al webhook:", fetchErr.message);
            }
          } catch (err) {
            console.error("[WA BOT] Error procesando mensaje:", err.message);
          }
        }
      });

      // ─── Estado de conexión ────────────────────────────────────────────────
      newSock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          currentQR = qr;
          try {
            qrImageDataUrl = await QRCode.toDataURL(qr, { width: 400, margin: 2 });
            console.log("[WA BOT] ✅ QR generado → Abre http://localhost:" + BOT_HTTP_PORT + "/qr en tu navegador para escanearlo");
          } catch (qrErr) {
            console.error("[WA BOT] Error generando imagen QR:", qrErr.message);
            qrcode.generate(qr, { small: true });
          }
        }

        if (connection === "open") {
          console.log("✅ WHATSAPP CONECTADO");
          connectionState = "open";
          connectionPromise = null;
          isReconnecting = false; // Liberar mutex
          currentQR = null;
          qrImageDataUrl = null;
          connectedNumber = newSock.user.id.split(":")[0];
          resolve(newSock);
        }

        if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const errorMsg = lastDisconnect?.error?.message || "";
          console.log(`❌ Conexión cerrada (${statusCode}): ${errorMsg}`);

          // Notificar desconexión crítica a los superadmins vía Next.js
          const isCritical = statusCode === 401 || statusCode === 440 || statusCode === DisconnectReason.loggedOut;
          if (isCritical) {
            console.log("[WA BOT] Reportando desconexión crítica a Next.js...");
            fetch(NEXTJS_WEBHOOK, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: 'connection-status',
                status: 'disconnected',
                reason: statusCode === 440 
                  ? 'Sesión cerrada por conflicto: WhatsApp fue abierto en otro dispositivo.'
                  : 'Sesión desvinculada (loggedOut). Se requiere escanear el código QR nuevamente.'
              })
            }).catch(e => console.error("[WA BOT] Error al notificar desconexión a Next.js:", e.message));
          }

          // Limpiar estado
          sock = null;
          connectionState = "closed";
          connectionPromise = null;
          currentQR = null;
          connectedNumber = null;
          isReconnecting = false; // Liberar mutex

          // ⚠️ Error 440 = conflict/replaced → otro dispositivo/instancia reemplazó la sesión
          // NO reconectar automáticamente, esperar mucho más tiempo
          if (statusCode === 440) {
            console.log("[WA BOT] ⚠️ Sesión reemplazada (conflict). Esperando 30s antes de reintentar...");
            setTimeout(() => startBot(), 30000);
          } else if (statusCode !== DisconnectReason.loggedOut) {
            // Para otros errores, reconectar con delay de 10s
            console.log("[WA BOT] Reconectando en 10s...");
            setTimeout(() => startBot(), 10000);
          } else {
            console.log("[WA BOT] Sesión cerrada (loggedOut). No se reconectará automáticamente.");
          }
        }
      });
    } catch (err) {
      connectionPromise = null;
      console.error("[WA BOT] Error fatal:", err.message);
      reject(err);
    }
  });

  return connectionPromise;
}

// ─── Función de envío ─────────────────────────────────────────────────────────
async function sendMessage(numero, mensaje) {
  try {
    const currentSock = await startBot();
    if (!currentSock) throw new Error("Socket no disponible");

    let clean = numero.replace(/\D/g, "");
    
    // Si viene un LID, intentar resolverlo
    if (numero.includes("@lid")) {
      console.log(`[WA BOT] Respondiendo directo al LID: ${numero}`);
      await currentSock.sendMessage(numero, { text: mensaje });
      return { success: true };
    }

    // Normalización para Ecuador (593)
    // 1. Si empieza con 59309..., quitar el 0 -> 5939...
    if (clean.startsWith("5930")) {
      clean = "593" + clean.substring(4);
    } 
    // 2. Si empieza con 09..., cambiar 0 por 593 -> 5939...
    else if (clean.startsWith("0")) {
      clean = "593" + clean.substring(1);
    }
    // 3. Si no tiene el 593, añadirlo
    else if (!clean.startsWith("593")) {
      clean = "593" + clean;
    }

    const jid = `${clean}@s.whatsapp.net`;
    console.log(`[WA BOT] [SEND] Destinatario: ${clean}, JID: ${jid}`);
    await currentSock.sendMessage(jid, { text: mensaje });
    console.log(`📩 [WA BOT] [SUCCESS] Enviado a ${jid}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ [WA BOT] Error:`, error.message);
    return { success: false, error: error.message };
  }
}

// ─── Tareas Periódicas (Corazón del Sistema) ───────────────────────────────
// Llama al webhook de Next.js cada minuto para procesar expiraciones y otras tareas
setInterval(async () => {
  try {
    const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp` : 'http://127.0.0.1:3000/api/webhooks/whatsapp';
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check-expirations', text: 'system' })
    });
    // console.log("[WA BOT] [HEARTBEAT] Solicitud de mantenimiento enviada");
  } catch (err) {
    // console.warn("[WA BOT] [HEARTBEAT] Error contactando Next.js:", err.message);
  }
}, 60000); // Cada 60 segundos

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