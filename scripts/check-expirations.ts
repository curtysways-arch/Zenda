import { whatsappService } from "../src/lib/whatsapp";

// Script simple para ejecutar la limpieza de expirados
async function runExpirationCheck() {
    console.log("🕒 Iniciando chequeo de expiración de reservas...");
    await whatsappService.checkExpirations();
    console.log("✅ Chequeo completado.");
    process.exit(0);
}

runExpirationCheck();
