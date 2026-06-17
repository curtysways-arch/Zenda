
const BOT_URL = "http://127.0.0.1:3001";

async function test() {
    try {
        console.log("Checking Bot Status at " + BOT_URL + "/status ...");
        const statusRes = await fetch(`${BOT_URL}/status`);
        const status = await statusRes.json();
        console.log("Status:", status);

        if (status.connected) {
            const numero = "593959997521";
            const mensaje = "Test message from Antigravity " + new Date().toLocaleTimeString();
            console.log(`Sending test message to ${numero}...`);
            
            const res = await fetch(`${BOT_URL}/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numero, mensaje }),
            });
            
            const result = await res.json();
            console.log("Result:", result);
        } else {
            console.log("Bot is NOT connected.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

test();
