async function test() {
    const BOT_URL = process.env.BOT_HTTP_URL || "http://127.0.0.1:3001";
    const numero = "593959997521";
    const mensaje = "Prueba de envío directo desde script de debug (fetch).";
    
    console.log("Connecting to Bot at:", BOT_URL);
    try {
        const res = await fetch(`${BOT_URL}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numero, mensaje }),
        });

        const data = await res.json();
        console.log("Resultado:", data);
    } catch (e) {
        console.error("Error crítico:", e.message);
    }
}

test();
