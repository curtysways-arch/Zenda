const { sendWhatsAppMessage } = require('../src/lib/whatsapp-client');

async function test() {
    const numero = "593959997521"; // El número de Carlos
    const mensaje = "Prueba de envío directo desde script de debug.";
    
    console.log("Intentando enviar mensaje a:", numero);
    try {
        const result = await sendWhatsAppMessage(numero, mensaje, 'test');
        console.log("Resultado:", result);
    } catch (e) {
        console.error("Error en el envío:", e);
    }
}

test();
