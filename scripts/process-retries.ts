import { whatsappService } from "../src/lib/whatsapp";

// Script para procesar la cola de reintentos
async function runRetryWorker() {
    console.log("🔄 Iniciando worker de reintentos de WhatsApp...");
    await whatsappService.processRetries();
    console.log("✅ Worker de reintentos completado.");
    process.exit(0);
}

runRetryWorker();
